import json
import shutil
import tempfile
import unittest
from pathlib import Path

from tests.helpers import ROOT
from validate_data import validate


class ValidateTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.data = self.tmp / "data"
        shutil.copytree(ROOT / "data", self.data)

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def edit_rule(self, name, change):
        path = self.data / "rules" / name
        obj = json.loads(path.read_text(encoding="utf-8"))
        change(obj)
        path.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")

    def test_real_data_passes(self):
        self.assertEqual(validate(ROOT / "data"), [])

    def test_non_json_file_rejected(self):
        (self.data / "rules" / "notes.txt").write_text("hi", encoding="utf-8")
        self.assertTrue(any("notes.txt" in e for e in validate(self.data)))

    def test_broken_json_rejected(self):
        (self.data / "rules" / "broken.json").write_text("{", encoding="utf-8")
        self.assertTrue(any("不是合法的 JSON" in e for e in validate(self.data)))

    def test_entry_needs_status_and_source(self):
        def drop(obj):
            del obj["entries"][0]["status"]
            del obj["entries"][0]["source_url"]
        self.edit_rule("minimum-wage.json", drop)
        errors = validate(self.data)
        self.assertTrue(any("缺 status" in e for e in errors))
        self.assertTrue(any("缺 source_url" in e for e in errors))

    def test_unknown_status_rejected(self):
        self.edit_rule("minimum-wage.json", lambda o: o["entries"][0].update(status="maybe"))
        self.assertTrue(any("status 只能是" in e for e in validate(self.data)))

    def test_entries_must_be_in_date_order(self):
        self.edit_rule("minimum-wage.json", lambda o: o["entries"].reverse())
        self.assertTrue(any("由舊到新" in e for e in validate(self.data)))

    def test_id_must_match_filename(self):
        self.edit_rule("minimum-wage.json", lambda o: o.update(id="other"))
        self.assertTrue(any("id 要跟檔名相同" in e for e in validate(self.data)))

    def test_bad_date_rejected(self):
        self.edit_rule("minimum-wage.json", lambda o: o["entries"][0].update(effective_from="2025/1/1"))
        self.assertTrue(any("YYYY-MM-DD" in e for e in validate(self.data)))

    def test_missing_meta_rejected(self):
        (self.data / "meta.json").unlink()
        self.assertTrue(any("meta.json" in e for e in validate(self.data)))


if __name__ == "__main__":
    unittest.main()


class FormValidateTest(ValidateTest):
    def test_unknown_placeholder_rejected(self):
        path = self.data / "forms" / "leave-deferral.json"
        obj = json.loads(path.read_text(encoding="utf-8"))
        obj["sections"][0]["paragraphs"].append("{{nope}}")
        path.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
        self.assertTrue(any("nope" in e for e in validate(self.data)))
