"""從政府資料開放平台抓人事行政總處的「中華民國政府行政機關辦公日曆表」，更新 data/rules/holiday-calendar.json。

用法：python scripts/fetch_calendar.py
- 每一年取最新的一份 CSV（有修正版就用修正版；Google 行事曆專用版不用）。
- 內容先檢查（天數、星期、假日名稱、必要的國定假日都在），不合理就不更新、以代碼 1 結束（排程亮紅燈）。
- 日期沒變就不動檔案（保留原本人工整理的假日名稱）；有新年度或修正就存檔，並把資料版本改成今天。
"""
import calendar as cal
import json
import re
import sys
import time
import urllib.request
from datetime import date, datetime

import statuslib
from datalib import DATA, TAIPEI, read_json, refresh_meta, write_json

DATASET_API = "https://data.gov.tw/api/v2/rest/dataset/14718"
FIRST_YEAR = 2026  # 115 年起（114 年以前公務機關沒有勞動節，和勞工的假日不同）
WEEKDAYS = "一二三四五六日"  # date.weekday() 0＝星期一
REQUIRED = ("開國紀念日", "春節", "和平紀念日", "兒童節", "清明節", "勞動節", "端午節", "中秋節", "國慶日")
KNOWN = set(REQUIRED) | {"小年夜", "農曆除夕", "補假", "孔子誕辰紀念日/教師節", "臺灣光復暨金門古寧頭大捷紀念日",
                         "行憲紀念日", "調整放假", "補行上班", "民族掃墓節"}
TITLE_RE = re.compile(r"^(\d{3})年中華民國政府行政機關辦公日曆表")


class CalendarError(ValueError):
    """CSV 內容不合理（格式改了或資料有誤）"""


def fetch(url, attempts=3):
    for i in range(attempts):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "labor-pixie"}), timeout=60) as r:
                return r.read()
        except OSError:
            if i == attempts - 1:
                raise
            time.sleep(10 * (i + 1))


def pick_sources(distributions):
    """每個西元年取一份 CSV：排除 Google 行事曆專用版；同一年有多份時取檔案路徑年月最新的（修正版）。"""
    best = {}
    for d in distributions:
        title = d.get("resourceDescription") or ""
        url = d.get("resourceDownloadUrl") or ""
        m = TITLE_RE.match(title)
        if not m or "Google" in title or (d.get("resourceFormat") or "").upper() != "CSV":
            continue
        year = int(m.group(1)) + 1911
        if year < FIRST_YEAR:
            continue
        stamp = re.search(r"files/(\d{6})/", url)
        key = (stamp.group(1) if stamp else "000000", title)
        if year not in best or key > best[year][0]:
            best[year] = (key, {"year": year, "title": title, "url": url.replace("http://", "https://", 1)})
    return [v[1] for _, v in sorted(best.items())]


def decode(raw):
    for enc in ("utf-8-sig", "cp950"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    raise CalendarError("看不懂檔案的文字編碼")


def make_up_name(day, weekend_holidays, used):
    """「補假」補的是哪一天：找前後 7 天內最近、還沒被配對的週末國定假日。"""
    target = date.fromisoformat(day)
    best = None
    for h in weekend_holidays:
        gap = abs((date.fromisoformat(h["date"]) - target).days)
        if gap <= 7 and h["date"] not in used and (best is None or gap < best[0]):
            best = (gap, h)
    if not best:
        # 年底的補假通常是補隔年 1 月 1 日（落在週末）的開國紀念日
        return f"{target.year + 1 - 1911} 年開國紀念日補假" if target.month == 12 and target.day >= 25 else "補假"
    used.add(best[1]["date"])
    return f"{best[1]['name']}補假"


def parse_calendar(text, year):
    """CSV 文字 → 該年的 { days（週一到週五的放假日）, weekend_holidays, workdays }。內容不合理就丟 CalendarError。"""
    lines = [l for l in text.splitlines() if l.strip()]
    if not lines or not lines[0].startswith("西元日期"):
        raise CalendarError("第一列不是「西元日期,星期,是否放假,備註」，格式可能改了")
    rows = [l.split(",") for l in lines[1:]]
    expected = 366 if cal.isleap(year) else 365
    if len(rows) != expected:
        raise CalendarError(f"{year} 年應有 {expected} 天，檔案有 {len(rows)} 天")
    seen, days, weekend, workdays, names = set(), [], [], [], set()
    for r in rows:
        if len(r) < 4:
            raise CalendarError(f"這一列欄位不足：{','.join(r)}")
        raw, wd, off, note = r[0].strip(), r[1].strip(), r[2].strip(), ",".join(r[3:]).strip()
        try:
            d = date(int(raw[:4]), int(raw[4:6]), int(raw[6:8]))
        except ValueError:
            raise CalendarError(f"日期看不懂：{raw}")
        if d.year != year or d in seen:
            raise CalendarError(f"日期不屬於 {year} 年或重複：{raw}")
        seen.add(d)
        if wd != WEEKDAYS[d.weekday()]:
            raise CalendarError(f"{raw} 的星期應為「{WEEKDAYS[d.weekday()]}」，檔案寫「{wd}」")
        if off not in ("0", "2"):
            raise CalendarError(f"{raw} 的「是否放假」只能是 0 或 2，檔案寫「{off}」")
        if note:
            if note not in KNOWN:
                raise CalendarError(f"不認得的假日名稱「{note}」（{raw}），請人工確認")
            names.add(note)
        weekend_day = d.weekday() >= 5
        iso = d.isoformat()
        if off == "2" and not weekend_day:
            if not note:
                raise CalendarError(f"{raw} 是平日放假但沒有寫原因")
            days.append({"date": iso, "name": note})
        elif off == "2" and weekend_day and note:
            weekend.append({"date": iso, "name": note})
        elif off == "0" and weekend_day:
            workdays.append({"date": iso, "name": note or "補行上班"})
    missing = [n for n in REQUIRED if n not in names]
    if missing:
        raise CalendarError(f"{year} 年缺少國定假日：{'、'.join(missing)}")
    used = set()
    for item in days:
        if item["name"] == "補假":
            item["name"] = make_up_name(item["date"], weekend, used)
    return {"days": days, "weekend_holidays": weekend, "workdays": workdays}


def date_key(entry):
    """比較用：放假與補行上班的日期組合（名稱可以不同）"""
    return (tuple(d["date"] for d in entry.get("days", [])),
            tuple(d["date"] for d in entry.get("weekend_holidays", [])),
            tuple(d["date"] for d in entry.get("workdays", [])))


def merge(rule, parsed, today):
    """把抓到的年度併進規則表。回傳 (新規則表, 變動清單 [(年, '新增'|'修正'|'補充')])。"""
    rule = json.loads(json.dumps(rule))
    by_year = {int(e["year"]): e for e in rule["entries"]}
    changes = []
    for item in parsed:
        year, data, src = item["year"], item["data"], item["source"]
        new_entry = {"effective_from": f"{year}-01-01", "status": "active", "year": year, **data,
                     "source": f"人事行政總處〈{src['title']}〉（政府資料開放平台）", "source_url": src["url"], "checked_on": today}
        old = by_year.get(year)
        if old is None:
            by_year[year] = new_entry
            changes.append((year, "新增"))
        elif date_key(old) == date_key(new_entry):
            continue
        elif tuple(d["date"] for d in old.get("days", [])) == tuple(d["date"] for d in data["days"]):
            # 平日放假日期相同，只是少了週末假日或補行上班的資料：補上，保留原本的名稱與出處
            old["weekend_holidays"], old["workdays"] = data["weekend_holidays"], data["workdays"]
            changes.append((year, "補充"))
        else:
            by_year[year] = new_entry
            changes.append((year, "修正"))
    rule["entries"] = [by_year[y] for y in sorted(by_year)]
    return rule, changes


def main():
    meta = json.loads(fetch(DATASET_API).decode("utf-8"))
    sources = pick_sources((meta.get("result") or meta).get("distribution", []))
    if not sources:
        raise CalendarError("資料集裡找不到 115 年以後的辦公日曆表，網址或格式可能改了")
    parsed = []
    for src in sources:
        parsed.append({"year": src["year"], "source": src, "data": parse_calendar(decode(fetch(src["url"])), src["year"])})
    path = DATA / "rules" / "holiday-calendar.json"
    today = datetime.now(TAIPEI).date().isoformat()
    rule, changes = merge(read_json(path), parsed, today)
    if changes and write_json(path, rule):
        kinds = {"新增": "新增（政府公布新年度）", "修正": "政府修正，已改用新版", "補充": "補上週末國定假日與補行上班資料"}
        for y, kind in changes:
            statuslib.log_update("calendar", f"{y - 1911} 年辦公日曆表", kinds[kind], path="rules/holiday-calendar.json")
        meta = refresh_meta(bump=True)
        print("行事曆有更新：", "、".join(f"{y} 年{kind}" for y, kind in changes), "→ 資料版本", meta["data_version"])
    else:
        print("行事曆沒有變動（已有", "、".join(str(s["year"]) for s in sources), "年）")
    return changes


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # 失敗就讓排程顯示紅燈並寄信，檔案不動
        print("行事曆抓取失敗：", e, file=sys.stderr)
        sys.exit(1)
