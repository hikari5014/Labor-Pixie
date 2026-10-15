"""檢查 data/ 的格式。用法：python scripts/validate_data.py  （有錯就列出並以代碼 1 結束）"""
import json
import re
import sys
from datetime import date
from pathlib import Path

from datalib import DATA, DATA_FORMAT, FORMAT_VERSION, data_files, listed_files

NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*\.json$")
STATUSES = {"active", "pending", "repealed"}
ENTRY_REQUIRED = ("effective_from", "status", "source", "source_url", "checked_on")


def is_iso_date(value):
    if not isinstance(value, str):
        return False
    try:
        return date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def check_meta(obj, data_dir):
    errors = []
    if obj.get("files") != listed_files(data_dir):
        errors.append("files 清單跟實際檔案不符，請執行 python scripts/refresh_meta.py")
    if obj.get("format") != DATA_FORMAT:
        errors.append(f"format 應為 {DATA_FORMAT}")
    if obj.get("format_version") != FORMAT_VERSION:
        errors.append(f"format_version 應為 {FORMAT_VERSION}")
    if not is_iso_date(obj.get("data_version")):
        errors.append("data_version 應為 YYYY-MM-DD")
    return errors


def check_rule(obj, stem):
    errors = []
    if obj.get("id") != stem:
        errors.append("id 要跟檔名相同")
    if not obj.get("title"):
        errors.append("缺 title")
    entries = obj.get("entries")
    if not isinstance(entries, list) or not entries:
        return errors + ["entries 不能是空的"]
    previous = ""
    for i, entry in enumerate(entries):
        where = f"entries[{i}]"
        for key in ENTRY_REQUIRED:
            if not entry.get(key):
                errors.append(f"{where} 缺 {key}")
        if entry.get("status") and entry["status"] not in STATUSES:
            errors.append(f"{where} status 只能是 {sorted(STATUSES)}")
        for key in ("effective_from", "checked_on"):
            if entry.get(key) and not is_iso_date(entry[key]):
                errors.append(f"{where} {key} 應為 YYYY-MM-DD")
        if not str(entry.get("source_url", "")).startswith("https://"):
            errors.append(f"{where} source_url 要是 https 網址")
        current = entry.get("effective_from", "")
        if current and current < previous:
            errors.append(f"{where} 要依 effective_from 由舊到新排列")
        previous = current or previous
    return errors


def check_law(obj, stem):
    errors = []
    if obj.get("id") != stem:
        errors.append("id 要跟檔名相同")
    for key in ("name", "pcode", "url", "modified_on", "source"):
        if not obj.get(key):
            errors.append(f"缺 {key}")
    if obj.get("modified_on") and not is_iso_date(obj["modified_on"]):
        errors.append("modified_on 應為 YYYY-MM-DD")
    articles = obj.get("articles")
    if not isinstance(articles, list) or not articles:
        return errors + ["articles 不能是空的"]
    for i, art in enumerate(articles):
        if art.get("type") not in ("chapter", "article"):
            errors.append(f"articles[{i}] type 只能是 chapter 或 article")
        if not art.get("text"):
            errors.append(f"articles[{i}] 缺 text")
        if art.get("type") == "article" and not art.get("no"):
            errors.append(f"articles[{i}] 條文缺 no")
    return errors


def check_testcases(obj, stem):
    errors = []
    if obj.get("id") != stem:
        errors.append("id 要跟檔名相同")
    cases = obj.get("cases")
    if not isinstance(cases, list) or not cases:
        return errors + ["cases 不能是空的"]
    for i, case in enumerate(cases):
        for key in ("name", "input", "expected"):
            if key not in case:
                errors.append(f"cases[{i}] 缺 {key}")
    return errors


def validate(data_dir=DATA):
    """回傳錯誤清單（空清單＝全部通過）。"""
    data_dir = Path(data_dir)
    errors = []
    if not (data_dir / "meta.json").is_file():
        errors.append("meta.json：找不到")
    for path in data_files(data_dir):
        rel = path.relative_to(data_dir).as_posix()
        if not NAME_RE.match(path.name):
            errors.append(f"{rel}：data/ 只能放小寫英文、數字、連字號命名的 .json 檔")
            continue
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as e:
            errors.append(f"{rel}：不是合法的 JSON（{e}）")
            continue
        if rel == "meta.json":
            found = check_meta(obj, data_dir)
        elif rel.startswith("rules/"):
            found = check_rule(obj, path.stem)
        elif rel.startswith("laws/"):
            found = check_law(obj, path.stem)
        elif rel.startswith("testcases/"):
            found = check_testcases(obj, path.stem)
        else:
            found = [] if rel.split("/")[0] in ("interpretations", "faq", "topics", "checklists") else ["不認得的資料夾"]
        errors.extend(f"{rel}：{msg}" for msg in found)
    return errors


if __name__ == "__main__":
    problems = validate()
    for p in problems:
        print("✗", p)
    print("data/ 檢查通過" if not problems else f"共 {len(problems)} 個問題")
    sys.exit(1 if problems else 0)
