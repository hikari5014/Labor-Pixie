"""把 data/ 匯出成「法規資料包」：只含 .json 資料、附兩層 SHA-256 檢查碼。

用法：python scripts/export_bundle.py [輸出資料夾，預設 dist/]
產出：labor-bundle_<資料版本>.zip 與 labor-bundle_<資料版本>.zip.sha256
格式說明見 docs/data-format.md。
"""
import hashlib
import os
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from datalib import BUNDLE_FORMAT, DATA, FORMAT_VERSION, ROOT, data_files, dumps, read_json
from validate_data import validate

FIXED_TIME = (2000, 1, 1, 0, 0, 0)  # zip 內固定時間，同樣資料產生同樣的檔案內容


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def source_commit():
    if os.environ.get("GITHUB_SHA"):
        return os.environ["GITHUB_SHA"][:7]
    try:
        return subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT,
                              capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


def build(out_dir, data_dir=DATA, generated_at=None):
    """產生資料包，回傳 zip 路徑。資料沒通過檢查就不產生。"""
    errors = validate(data_dir)
    if errors:
        raise ValueError("data/ 沒通過檢查：\n" + "\n".join(errors))
    data_dir = Path(data_dir)
    meta = read_json(data_dir / "meta.json")
    files = []
    for path in data_files(data_dir):
        content = path.read_bytes()
        files.append(("data/" + path.relative_to(data_dir).as_posix(), content))
    manifest = {
        "format": BUNDLE_FORMAT,
        "format_version": FORMAT_VERSION,
        "data_version": meta["data_version"],
        "generated_at": generated_at or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_commit": source_commit(),
        "kind": "full",
        "files": [{"path": p, "bytes": len(c), "sha256": sha256(c)} for p, c in files],
    }
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    zip_path = out_dir / f"labor-bundle_{meta['data_version']}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, content in [("manifest.json", dumps(manifest).encode("utf-8"))] + files:
            zf.writestr(zipfile.ZipInfo(name, FIXED_TIME), content, zipfile.ZIP_DEFLATED)
    digest = sha256(zip_path.read_bytes())
    Path(str(zip_path) + ".sha256").write_text(f"{digest}  {zip_path.name}\n", encoding="utf-8")
    return zip_path


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else ROOT / "dist"
    try:
        path = build(target)
    except ValueError as e:
        print(e, file=sys.stderr)
        sys.exit(1)
    print("已產生", path)
