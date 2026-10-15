"""驗證法規資料包。收資料包的一方（例：公司內網系統）可以照這支的規則實作。

用法：python scripts/verify_bundle.py labor-bundle_2026-10-15.zip
（同資料夾要有 .zip.sha256 檔）全部通過以代碼 0 結束，否則列出原因並以代碼 1 結束。

拒收條件：整包檢查碼不符、格式名稱不對、格式版本看不懂、
裡面有 .json 以外的檔案或可疑路徑、清單以外的檔案、任何一個檔的檢查碼不符。
"""
import hashlib
import json
import sys
import zipfile
from pathlib import Path, PurePosixPath

BUNDLE_FORMAT = "labor-pixie-bundle"
SUPPORTED_VERSIONS = {1}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def verify(zip_path):
    """回傳拒收原因清單（空清單＝可以收）。"""
    zip_path = Path(zip_path)
    sum_path = Path(str(zip_path) + ".sha256")
    if not sum_path.is_file():
        return ["找不到整包檢查碼檔（.zip.sha256）"]
    expected = sum_path.read_text(encoding="utf-8").split()[0].lower()
    if sha256(zip_path.read_bytes()) != expected:
        return ["整包檢查碼不符：檔案損壞或被改過"]

    try:
        zf = zipfile.ZipFile(zip_path)
    except zipfile.BadZipFile:
        return ["不是合法的 zip 檔"]
    with zf:
        names = zf.namelist()
        for name in names:
            p = PurePosixPath(name)
            if p.is_absolute() or ".." in p.parts or "\\" in name:
                return [f"可疑的檔案路徑：{name}"]
            if not name.endswith(".json"):
                return [f"含有 .json 以外的檔案：{name}"]
        if "manifest.json" not in names:
            return ["缺少 manifest.json"]
        try:
            manifest = json.loads(zf.read("manifest.json").decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return ["manifest.json 不是合法的 JSON"]
        if manifest.get("format") != BUNDLE_FORMAT:
            return ["格式名稱不對，不是勞資小精靈的資料包"]
        if manifest.get("format_version") not in SUPPORTED_VERSIONS:
            return [f"看不懂的格式版本 {manifest.get('format_version')}，請先更新收件程式"]

        errors = []
        listed = {f["path"]: f for f in manifest.get("files", [])}
        extra = set(names) - set(listed) - {"manifest.json"}
        errors += [f"清單以外的檔案：{n}" for n in sorted(extra)]
        for path, info in listed.items():
            if path not in names:
                errors.append(f"清單上有、包裡沒有：{path}")
                continue
            content = zf.read(path)
            if sha256(content) != info.get("sha256") or len(content) != info.get("bytes"):
                errors.append(f"檢查碼不符：{path}")
        return errors


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    problems = verify(sys.argv[1])
    for p in problems:
        print("✗ 拒收：", p)
    print("✓ 資料包驗證通過，可以匯入" if not problems else "")
    sys.exit(1 if problems else 0)
