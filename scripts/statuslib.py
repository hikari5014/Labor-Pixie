"""資料的健康狀態與更新紀錄。只用 Python 內建功能。

- data/status.json：最近一次自動檢查的結果（法條、行事曆各自成功或失敗）、資料摘要、需要處理的問題。
- data/update-log.json：所有更新紀錄（最新的在最前面），以及規則表的檢查碼（用來發現人工修改）。
App 的「資料更新紀錄」頁與首頁警告讀這兩個檔案。
"""
import hashlib
from datetime import datetime
from pathlib import Path

from datalib import DATA, TAIPEI, read_json, write_json

CALENDAR_RULE = "rules/holiday-calendar.json"
MAX_LOG = 500


def now():
    return datetime.now(TAIPEI)


def _sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _read(path, default):
    return read_json(path) if Path(path).is_file() else default


# ---- 更新紀錄 ----
def load_log(data_dir=DATA):
    return _read(Path(data_dir) / "update-log.json", {"entries": [], "tracked": {}})


def log_update(category, item, summary, data_dir=DATA, path=None, today=None):
    """新增一筆紀錄。category：laws（法條）、rules（計算規則）、calendar（行事曆）、system（系統）。
    path：規則表的相對路徑（例 rules/holiday-calendar.json），一併記下它現在的檢查碼，避免之後重複記一次。"""
    data_dir = Path(data_dir)
    log = load_log(data_dir)
    log["entries"].insert(0, {"date": today or now().date().isoformat(), "category": category, "item": item, "summary": summary})
    del log["entries"][MAX_LOG:]
    if path:
        log["tracked"][path] = _sha(data_dir / path)
    write_json(data_dir / "update-log.json", log)


def track_rule_changes(data_dir=DATA, today=None):
    """比對規則表的檢查碼：人工改過、新增或刪除的規則表各記一筆。第一次執行只記「開始記錄」。回傳新增的筆數。"""
    data_dir = Path(data_dir)
    first = not (data_dir / "update-log.json").is_file()
    log = load_log(data_dir)
    current = {p.relative_to(data_dir).as_posix(): _sha(p) for p in sorted((data_dir / "rules").glob("*.json"))}
    day = today or now().date().isoformat()
    added = []
    if first:
        laws = len(list((data_dir / "laws").glob("*.json")))
        added.append({"date": day, "category": "system", "item": "開始記錄",
                      "summary": f"從這天起記錄資料更新。起始狀態：{laws} 部法規、{len(current) - (1 if CALENDAR_RULE in current else 0)} 張計算規則表、政府行事曆。"})
    else:
        for path, digest in current.items():
            old = log["tracked"].get(path)
            if old == digest:
                continue
            rule = read_json(data_dir / path)
            category = "calendar" if path == CALENDAR_RULE else "rules"
            added.append({"date": day, "category": category, "item": rule.get("title", path), "summary": "新增規則表" if old is None else "規則表內容更新"})
        for path in sorted(set(log["tracked"]) - set(current)):
            added.append({"date": day, "category": "rules", "item": path, "summary": "規則表已移除"})
    log["entries"][:0] = added
    del log["entries"][MAX_LOG:]
    log["tracked"] = current
    write_json(data_dir / "update-log.json", log)
    return len(added)


# ---- 健康狀態 ----
def summary(data_dir=DATA):
    """App 看板用的摘要：每部法規的最新修正日、每張規則表的查證日與待生效數字、行事曆年度。"""
    data_dir = Path(data_dir)
    laws = []
    for p in sorted((data_dir / "laws").glob("*.json")):
        law = read_json(p)
        laws.append({"id": law["id"], "name": law["name"], "modified_on": law["modified_on"]})
    rules, calendar = [], {"years": [], "checked_on": ""}
    for p in sorted((data_dir / "rules").glob("*.json")):
        rule = read_json(p)
        entries = rule["entries"]
        if p.stem == "holiday-calendar":
            calendar = {"years": sorted(int(e["year"]) for e in entries), "checked_on": max(e["checked_on"] for e in entries)}
            continue
        rules.append({"id": rule["id"], "title": rule["title"], "checked_on": max(e["checked_on"] for e in entries),
                      "effective_from": max(e["effective_from"] for e in entries if e["status"] == "active") if any(e["status"] == "active" for e in entries) else "",
                      "pending": [e["effective_from"] for e in entries if e["status"] == "pending"]})
    return {"laws": laws, "rules": rules, "calendar": calendar}


def write_status(data_dir=DATA, checks=None, today=None):
    """更新 data/status.json。checks：{'laws': (成功與否, 訊息), 'calendar': (…)}；None＝只更新摘要與問題（人工改資料時）。"""
    from check_freshness import load_rules, problems  # 延後載入，避免互相引用

    data_dir = Path(data_dir)
    path = data_dir / "status.json"
    status = _read(path, {"checked_at": "", "checks": {}})
    stamp = now().isoformat(timespec="seconds")
    if checks:
        status["checked_at"] = stamp
        for name, (ok, message) in checks.items():
            previous = status["checks"].get(name, {})
            status["checks"][name] = {"ok": bool(ok), "checked_at": stamp, "last_success": stamp if ok else previous.get("last_success", ""), "message": message}
    day = datetime.fromisoformat(today).date() if today else now().date()
    status["problems"] = problems(load_rules(data_dir), day)
    status["summary"] = summary(data_dir)
    write_json(path, status)
    return status
