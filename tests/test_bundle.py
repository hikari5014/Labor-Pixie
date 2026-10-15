import hashlib
import json
import shutil
import tempfile
import unittest
import zipfile
from pathlib import Path

from tests.helpers import ROOT
from export_bundle import build
from verify_bundle import verify


def rewrite_zip(src, dst, change):
    """複製一個 zip，過程中用 change(name, data) 改內容（回傳 None 表示刪掉），再補上新檔。"""
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w") as zout:
        for info in zin.infolist():
            data = change(info.filename, zin.read(info.filename))
            if data is not None:
                zout.writestr(info.filename, data)
    digest = hashlib.sha256(Path(dst).read_bytes()).hexdigest()
    Path(str(dst) + ".sha256").write_text(f"{digest}  {Path(dst).name}\n", encoding="utf-8")


class BundleTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.zip = build(self.tmp / "out", generated_at="2026-10-15T00:00:00Z")

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_good_bundle_passes(self):
        self.assertEqual(verify(self.zip), [])

    def test_only_json_and_manifest_lists_every_data_file(self):
        with zipfile.ZipFile(self.zip) as zf:
            names = zf.namelist()
            manifest = json.loads(zf.read("manifest.json"))
        self.assertTrue(all(n.endswith(".json") for n in names))
        self.assertEqual(sorted(f["path"] for f in manifest["files"]), sorted(n for n in names if n != "manifest.json"))
        self.assertEqual(manifest["format"], "labor-pixie-bundle")
        self.assertEqual(manifest["format_version"], 1)
        self.assertIn("data/meta.json", names)

    def test_same_data_gives_same_zip(self):
        again = build(self.tmp / "again", generated_at="2026-10-15T00:00:00Z")
        self.assertEqual(self.zip.read_bytes(), again.read_bytes())

    def test_tampered_zip_rejected(self):
        raw = bytearray(self.zip.read_bytes())
        raw[-10] ^= 0xFF
        self.zip.write_bytes(bytes(raw))
        self.assertIn("整包檢查碼不符", verify(self.zip)[0])

    def test_missing_checksum_file_rejected(self):
        Path(str(self.zip) + ".sha256").unlink()
        self.assertIn(".sha256", verify(self.zip)[0])

    def test_changed_file_inside_rejected(self):
        bad = self.tmp / "bad.zip"
        rewrite_zip(self.zip, bad, lambda n, d: d.replace(b"29500", b"19500") if n.endswith("minimum-wage.json") else d)
        self.assertTrue(any("檢查碼不符" in e for e in verify(bad)))

    def test_program_file_rejected(self):
        bad = self.tmp / "bad.zip"
        rewrite_zip(self.zip, bad, lambda n, d: d)
        with zipfile.ZipFile(bad, "a") as zf:
            zf.writestr("data/run.exe", b"MZ")
        digest = hashlib.sha256(bad.read_bytes()).hexdigest()
        Path(str(bad) + ".sha256").write_text(f"{digest}  bad.zip\n", encoding="utf-8")
        self.assertIn(".json 以外", verify(bad)[0])

    def test_unknown_format_version_rejected(self):
        bad = self.tmp / "bad.zip"

        def bump(name, data):
            if name != "manifest.json":
                return data
            m = json.loads(data)
            m["format_version"] = 99
            return json.dumps(m).encode()
        rewrite_zip(self.zip, bad, bump)
        self.assertIn("看不懂的格式版本", verify(bad)[0])

    def test_invalid_data_not_exported(self):
        data = self.tmp / "data"
        shutil.copytree(ROOT / "data", data)
        (data / "rules" / "x.txt").write_text("x", encoding="utf-8")
        with self.assertRaises(ValueError):
            build(self.tmp / "nope", data_dir=data)


if __name__ == "__main__":
    unittest.main()
