"""用 Python 另外實作一次試算（不看網站程式），產生 data/testcases/ 的驗證範例。

用法：python3 tests/reference/generate.py   （改了範例或規則後重新產生）
tests/test_reference.py 會檢查 data/testcases/ 跟這裡算出來的一樣。
"""
import datetime as dt
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from datalib import DATA, write_json  # noqa: E402
from tests.reference.dates import D, add_months, anniversary, ceil_money, tenure  # noqa: E402

NEW_START = "2005-07-01"
RATES = {"weekday12": 1.34, "weekday34": 1.67, "rest12": 1.34, "rest38": 1.67, "rest912": 2.67}


def case(name, inp, exp, note=None):
    c = {"name": name, "input": inp, "expected": exp}
    if note:
        c["note"] = note
    return c


# ---- 統包薪資 ----
def package_pay(total, hours, buffer=0, actual=None, min_wage=29500):
    weighted = sum(RATES[k] * hours.get(k, 0) for k in RATES) + buffer
    hourly = total / (240 + weighted)
    base = math.floor(hourly * 240 + 1e-9)
    fixed = total - base
    planned = sum(hours.values())
    e = {"base": base, "fixedOvertime": fixed, "plannedHours": planned, "hoursOk": planned <= 46, "minWageOk": base >= min_wage}
    if actual is not None:
        legal = ceil_money(hourly * sum(RATES[k] * actual.get(k, 0) for k in RATES))
        e.update(legalOvertime=legal, topUp=max(0, legal - fixed), actualHours=sum(actual.values()))
    return e


def package_cases():
    out = []

    def add(name, total, hours, date="2026-10-15", buffer=0, actual=None, min_wage=29500, note=None):
        inp = {"total": total, "date": date, "hours": hours}
        if buffer:
            inp["buffer"] = buffer
        if actual is not None:
            inp["actual"] = actual
        out.append(case(name, inp, package_pay(total, hours, buffer, actual, min_wage), note))

    add("上課示範：月薪 6 萬、平日前 2 小時 22 小時＋第 3–4 小時 22 小時", 60000, {"weekday12": 22, "weekday34": 22},
        note="時薪約 195.94 元。課堂把加權時數取整為 70 小時、時薪取 196 元，金額略有差異")
    add("保守估算：加權時數多抓 3.78 小時（湊成 70）", 60000, {"weekday12": 22, "weekday34": 22}, buffer=3.78)
    add("月薪 4 萬、平日前 2 小時 20 小時", 40000, {"weekday12": 20})
    add("拆完底薪低於最低工資", 32000, {"weekday12": 20, "weekday34": 20}, note="底薪約 25,583 元，低於 29,500")
    add("預估加班 48 小時，超過每月 46 小時", 60000, {"weekday12": 22, "weekday34": 22, "rest12": 4})
    add("休息日加班：前 2 小時 8 小時、第 3–8 小時 24 小時", 45000, {"rest12": 8, "rest38": 24})
    add("沒有加班：全部都是底薪", 30000, {})
    add("114 年：底薪對照當年最低工資 28,590", 33000, {"weekday12": 20}, date="2025-06-01", min_wage=28590)
    add("當月實際加班較少：固定加班費照付，不補", 40000, {"weekday12": 20}, actual={"weekday12": 10})
    add("當月實際加班較多：要補差額", 40000, {"weekday12": 20}, actual={"weekday12": 20, "weekday34": 10})
    add("實際有休息日第 9 小時以後的加班", 50000, {"weekday12": 20}, actual={"weekday12": 10, "rest12": 2, "rest38": 6, "rest912": 2})
    add("實際時數剛好等於預估：不用補", 40000, {"weekday12": 20}, actual={"weekday12": 20})
    return {"id": "package-pay", "title": "統包薪資反推與多退少補", "rules": ["overtime-rates", "minimum-wage"],
            "source": "勞動基準法第 24 條；最低工資法第 5 條", "cases": out}


# ---- 資遣費 ----
def old_base(m, d):
    return m // 12 + ((m % 12) + (1 if d > 0 else 0)) / 12


def new_years(m, d):
    return m // 12 + ((m % 12) + d / 30) / 12


def severance(hire, end, wage, keep_old=False):
    old = new = 0.0
    if keep_old:
        old = old_base(*tenure(hire, end))
    else:
        if hire < NEW_START:
            old = old_base(*tenure(hire, min(end, "2005-06-30")))
        if end >= NEW_START:
            new = min(6, new_years(*tenure(max(hire, NEW_START), end)) * 0.5)
    base = old + new
    return {"base": round(base, 10), "amount": ceil_money(wage * base)}


def severance_cases():
    out = []

    def add(name, hire, end, wage, keep_old=False, extra=None, note=None):
        inp = {"hireDate": hire, "endDate": end, "avgWage": wage}
        if keep_old:
            inp["keepOld"] = True
        out.append(case(name, inp, severance(hire, end, wage, keep_old) | (extra or {}), note))

    add("勞動部範例：年資 3 年 6 個月 15 天、平均工資 30,000（新制）", "2020-01-01", "2023-07-15", 30000,
        extra={"newPart": {"months": 42, "days": 15}}, note="勞動部〈資遣費給付標準〉公式 30,000×1/2×(3+6.5/12)≈53,124.9")
    add("新制滿 1 年", "2025-01-01", "2025-12-31", 36000)
    add("新制未滿 1 年：5 個月 10 天", "2026-01-01", "2026-06-10", 30000)
    add("試用 2 個月就資遣也要給（按比例）", "2026-08-01", "2026-09-30", 32000)
    add("新制上限 6 個月：年資 15 年", "2010-01-01", "2024-12-31", 50000, extra={"newPart": {"capped": True}})
    add("新制剛好 12 年＝6 個月", "2014-01-01", "2025-12-31", 40000)
    add("跨新舊制：2000/3/1 到職，2026/10/15 資遣", "2000-03-01", "2026-10-15", 45000,
        extra={"oldPart": {"to": "2005-06-30", "months": 64, "days": 0}})
    add("舊制剩餘天數未滿 1 個月以 1 個月計", "2003-06-20", "2006-06-30", 30000, extra={"oldPart": {"months": 24, "days": 11}})
    add("選擇繼續適用舊制：全部年資照第 17 條（無上限）", "1995-01-01", "2026-10-15", 40000, keep_old=True, extra={"newPart": None})
    add("2005/7/1 當天到職，全部是新制", "2005-07-01", "2008-06-30", 30000, extra={"oldPart": None})
    add("2005 年以前就離職，全部是舊制", "2001-01-01", "2004-12-31", 28000, extra={"newPart": None})
    add("月底到職：1/31 到職做到 2/27，未滿 1 個月", "2026-01-31", "2026-02-27", 30000, extra={"newPart": {"months": 0, "days": 28}})
    add("月底到職：1/31 到職做到 2/28，剛好 1 個月", "2026-01-31", "2026-02-28", 30000, extra={"newPart": {"months": 1, "days": 0}})
    return {"id": "severance", "title": "資遣費（新舊制）",
            "source": "勞動基準法第 17 條；勞工退休金條例第 12 條；勞動部〈資遣費給付標準〉", "cases": out}


# ---- 平均工資 ----
def average_wage(event, hire, wages, excluded=0, by_day=False, work_days=0):
    six = add_months(D(event), -6)
    start = max(D(hire), six)
    days = (D(event) - start).days - excluded
    daily = wages / days
    floor_applied = False
    if by_day and work_days > 0 and wages / work_days * 0.6 > daily:
        daily = wages / work_days * 0.6
        floor_applied = True
    return {"periodStart": start.isoformat(), "days": days, "daily": round(daily, 10), "monthly": round(daily * 30, 10), "floorApplied": floor_applied}


def average_cases():
    out = []

    def add(name, inp):
        out.append(case(name, inp, average_wage(inp["eventDate"], inp["hireDate"], inp["wages"], inp.get("excludedDays", 0),
                                                inp.get("byDay", False), inp.get("workDays", 0))))

    add("月薪 36,000，做滿半年以上", {"eventDate": "2026-10-15", "hireDate": "2020-01-01", "wages": 216000})
    add("事由發生當日不算：期間到前一天", {"eventDate": "2026-07-01", "hireDate": "2020-01-01", "wages": 180000})
    add("到職未滿 6 個月：以實際工作期間計", {"eventDate": "2026-05-01", "hireDate": "2026-02-01", "wages": 90000})
    add("期間內請普通傷病假 10 日不計入", {"eventDate": "2026-10-15", "hireDate": "2020-01-01", "wages": 210000, "excludedDays": 10})
    add("留職停薪 30 日不計入", {"eventDate": "2026-10-15", "hireDate": "2020-01-01", "wages": 180000, "excludedDays": 30})
    add("按日計酬，未觸及六成下限", {"eventDate": "2026-10-15", "hireDate": "2020-01-01", "wages": 150000, "byDay": True, "workDays": 130})
    add("按日計酬，實際工作日少，適用六成下限", {"eventDate": "2026-10-15", "hireDate": "2020-01-01", "wages": 60000, "byDay": True, "workDays": 40})
    add("月薪有加班費變動", {"eventDate": "2026-03-01", "hireDate": "2018-05-01", "wages": 228640})
    add("跨閏年 2 月", {"eventDate": "2024-08-01", "hireDate": "2010-01-01", "wages": 200000})
    add("月底事由：8/31 往前 6 個月", {"eventDate": "2026-08-31", "hireDate": "2010-01-01", "wages": 210000})
    return {"id": "average-wage", "title": "平均工資", "source": "勞動基準法第 2 條第 4 款；施行細則第 2 條", "cases": out}


# ---- 預告期間 ----
NOTICE = [(3, 10), (12, 20), (36, 30)]


def notice(hire, end, wage=None):
    m, _ = tenure(hire, end)
    days = 0
    for from_months, d in NOTICE:
        if m >= from_months:
            days = d
    r = {"months": m, "days": days, "latestNoticeDate": (D(end) - dt.timedelta(days)).isoformat() if days else None}
    if wage:
        r["noticePay"] = ceil_money(wage / 30 * days)
    return r


def notice_cases():
    out = []

    def add(name, hire, end, wage=None):
        inp = {"hireDate": hire, "endDate": end}
        if wage:
            inp["monthlyWage"] = wage
        out.append(case(name, inp, notice(hire, end, wage)))

    add("未滿 3 個月：不用預告", "2026-08-01", "2026-10-15", 30000)
    add("剛好滿 3 個月：預告 10 日", "2026-07-16", "2026-10-15", 30000)
    add("差一天滿 3 個月", "2026-07-17", "2026-10-15")
    add("滿 3 個月未滿 1 年：10 日", "2026-01-01", "2026-10-15", 36000)
    add("剛好滿 1 年：20 日", "2025-10-16", "2026-10-15", 36000)
    add("1 年以上未滿 3 年：20 日", "2024-03-01", "2026-10-15", 40000)
    add("剛好滿 3 年：30 日", "2023-10-16", "2026-10-15", 45000)
    add("3 年以上：30 日", "2010-01-01", "2026-10-15", 50000)
    add("試用期滿 3 個月後才通知：月薪 30,000 要付約 10,000", "2026-06-01", "2026-09-30", 30000)
    add("預告工資無條件進位", "2024-03-01", "2026-10-15", 31000)
    return {"id": "notice-period", "title": "預告期間與預告工資", "rule": "notice-period", "source": "勞動基準法第 16 條", "cases": out}


GENERATORS = {"package-pay": package_cases, "severance": severance_cases, "average-wage": average_cases, "notice-period": notice_cases}

if __name__ == "__main__":
    for name, gen in GENERATORS.items():
        changed = write_json(DATA / "testcases" / f"{name}.json", gen())
        print(name, "已更新" if changed else "沒有變動")
