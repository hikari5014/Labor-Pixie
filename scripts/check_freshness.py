"""檢查人工維護的規則表有沒有過期，有問題就列出來並回傳失敗（GitHub 會寄信通知）。

用法：python3 scripts/check_freshness.py [YYYY-MM-DD]   （不給日期＝今天，台灣時間）
檢查項目：
1. 每個規則表最新一筆的查證日（checked_on）超過一年 → 要重新查證（國定假日行事曆除外）。
2. 狀態還是 pending（尚未核定），但已經到了生效日 → 要確認是否已正式公告。
3. 國定假日行事曆：要有今年；10 月起還要有明年（人事行政總處通常年中公布）。
"""
import sys
from pathlib import Path
from datetime import date, datetime, timedelta, timezone

from datalib import DATA, read_json

STALE_DAYS = 365
NEXT_YEAR_FROM_MONTH = 10


def problems(rules, today):
    out = []
    for rid, rule in sorted(rules.items()):
        entries = rule["entries"]
        latest = max(e["checked_on"] for e in entries)
        # 行事曆是逐年的資料，改用第 3 項檢查年份
        if rid != "holiday-calendar" and (today - date.fromisoformat(latest)).days > STALE_DAYS:
            out.append(f"{rid}：最後查證日 {latest}，已超過一年，請重新查證。")
        for e in entries:
            if e["status"] == "pending" and date.fromisoformat(e["effective_from"]) <= today:
                out.append(f"{rid}：{e['effective_from']} 生效的那一筆還是「尚未核定」，請確認是否已正式公告。")
    years = {int(e["year"]) for e in rules.get("holiday-calendar", {"entries": []})["entries"]}
    if today.year not in years:
        out.append(f"holiday-calendar：缺少 {today.year} 年的國定假日與補假。")
    if today.month >= NEXT_YEAR_FROM_MONTH and today.year + 1 not in years:
        out.append(f"holiday-calendar：缺少 {today.year + 1} 年的國定假日與補假（人事行政總處辦公日曆表）。")
    return out


def load_rules(data_dir=DATA):
    return {p.stem: read_json(p) for p in sorted((Path(data_dir) / "rules").glob("*.json"))}


def main(argv):
    today = date.fromisoformat(argv[1]) if len(argv) > 1 else datetime.now(timezone(timedelta(hours=8))).date()
    found = problems(load_rules(), today)
    for line in found:
        print("需要處理：", line)
    if not found:
        print("規則表都在有效期內（", today.isoformat(), "）")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
