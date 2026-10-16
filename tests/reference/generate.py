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


def eligible(hire, end, birth=None):
    years = tenure(hire, end)[0] / 12
    if years >= 25:
        return True
    if not birth:
        return False
    age = tenure(birth, end)[0] / 12
    return (years >= 15 and age >= 55) or (years >= 10 and age >= 60)


def severance(hire, end, wage, keep_old=False, birth=None):
    old = new = 0.0
    if keep_old:
        old = old_base(*tenure(hire, end))
    else:
        if hire < NEW_START:
            old = old_base(*tenure(hire, min(end, "2005-06-30")))
        if end >= NEW_START:
            new = min(6, new_years(*tenure(max(hire, NEW_START), end)) * 0.5)
    base = old + new
    return {"base": round(base, 10), "amount": ceil_money(wage * base), "retirementEligible": bool(old) and eligible(hire, end, birth)}


def severance_cases():
    out = []

    def add(name, hire, end, wage, keep_old=False, extra=None, note=None, birth=None):
        inp = {"hireDate": hire, "endDate": end, "avgWage": wage}
        if keep_old:
            inp["keepOld"] = True
        if birth:
            inp["birthDate"] = birth
        out.append(case(name, inp, severance(hire, end, wage, keep_old, birth) | (extra or {}), note))

    add("勞動部範例：年資 3 年 6 個月 15 天、平均工資 30,000（新制）", "2020-01-01", "2023-07-15", 30000,
        extra={"newPart": {"months": 42, "days": 15}}, note="勞動部〈資遣費給付標準〉公式 30,000×1/2×(3+6.5/12)≈53,124.9")
    add("新制滿 1 年", "2025-01-01", "2025-12-31", 36000)
    add("新制未滿 1 年：5 個月 10 天", "2026-01-01", "2026-06-10", 30000)
    add("試用 2 個月就資遣也要給（按比例）", "2026-08-01", "2026-09-30", 32000)
    add("新制上限 6 個月：年資 15 年", "2010-01-01", "2024-12-31", 50000, extra={"newPart": {"capped": True}})
    add("新制剛好 12 年＝6 個月", "2014-01-01", "2025-12-31", 40000)
    add("跨新舊制：2000/3/1 到職，2026/10/15 資遣（年資 26 年，已符合退休條件）", "2000-03-01", "2026-10-15", 45000,
        extra={"oldPart": {"to": "2005-06-30", "months": 64, "days": 0}},
        note="勞動部資遣費試算表：年資超過 25 年應改給舊制退休金，新制資遣費 270,000 元與本工具相同")
    add("跨新舊制、年資 20 年、滿 56 歲：符合工作 15 年以上滿 55 歲", "2004-01-01", "2024-03-31", 40000, birth="1968-01-01")
    add("跨新舊制、年資 13 年、50 歲：還不符合退休條件", "2004-01-01", "2016-12-31", 40000, birth="1966-06-01")
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


# ---- 加班費（月薪制） ----
def day_factor(t, h):
    if t == "weekday":
        return 1.34 * min(h, 2) + 1.67 * max(h - 2, 0), h
    if t == "rest":
        return 1.34 * min(h, 2) + 1.67 * min(max(h - 2, 0), 6) + 2.67 * max(h - 8, 0), h
    if h <= 0:
        return 0, 0
    b = max(h - 8, 0)
    f = 8 + 1.34 * min(b, 2) + 1.67 * max(b - 2, 0)
    return f, (b if t == "holiday" else 0)


def overtime(wage, days):
    hourly = wage / 240
    pays = [day_factor(d["type"], d["hours"]) for d in days]
    count = sum(c for _, c in pays)
    return {"total": ceil_money(sum(hourly * f for f, _ in pays)), "countHours": count, "over46": count > 46}


def overtime_cases():
    out = []

    def add(name, wage, days, note=None):
        out.append(case(name, {"date": "2026-10-15", "monthlyWage": wage, "days": days}, overtime(wage, days), note))

    add("上課例子：月薪 36,000，平日加班 3 小時", 36000, [{"type": "weekday", "hours": 3}], "150×1.34×2＋150×1.67×1＝652.5")
    add("上課例子：休息日上班 8 小時", 36000, [{"type": "rest", "hours": 8}], "150×1.34×2＋150×1.67×6＝1,905")
    add("上課例子：休息日上班 10 小時", 36000, [{"type": "rest", "hours": 10}], "1,905＋150×2.67×2＝2,706")
    add("上課例子：國定假日上班 8 小時，加給 1 日", 36000, [{"type": "holiday", "hours": 8}])
    add("上課例子：國定假日只上 1 小時，仍以日計", 36000, [{"type": "holiday", "hours": 1}])
    add("國定假日上 10 小時：超過 8 小時比照平日，2 小時計入 46 小時", 36000, [{"type": "holiday", "hours": 10}])
    add("休息日只上 1 小時：照實際時數 1.34 倍", 36000, [{"type": "rest", "hours": 1}])
    add("例假因天災出勤 8 小時：加倍並補休，不計入 46 小時", 36000, [{"type": "dayoff", "hours": 8}])
    add("一個月平日 22 天各 2 小時：44 小時", 40000, [{"type": "weekday", "hours": 2}] * 22)
    add("平日 20 天各 2 小時＋休息日 1 天 8 小時：48 小時超過上限", 40000, [{"type": "weekday", "hours": 2}] * 20 + [{"type": "rest", "hours": 8}])
    add("月薪含固定津貼 31,000：平日 2.5 小時", 31000, [{"type": "weekday", "hours": 2.5}])
    add("勞動部算例：月薪 30,000，平日 3 小時、休息日 6 小時、國定假日 8 小時", 30000,
        [{"type": "weekday", "hours": 3}, {"type": "rest", "hours": 6}, {"type": "holiday", "hours": 8}],
        "勞動部加班費試算系統以 4/3、5/3 計得 2,708.33 元；本工具以 1.34、1.67 計，略高、不會短付")
    return {"id": "overtime", "title": "加班費（月薪制）", "rule": "overtime-rates",
            "source": "勞動基準法第 24 條、第 32 條、第 39 條、第 40 條", "cases": out}


# ---- 定期契約檢查 ----
KINDS = {"temporary": (6, None, True), "short": (6, None, True), "seasonal": (9, None, False), "specific": (None, 12, False)}


def fixed_term(kind, a, b=None, continued=False):
    max_m, report_m, applies = KINDS[kind]
    after = D(a[1]) + dt.timedelta(1)
    days_a = (D(a[1]) - D(a[0])).days + 1
    r = {"daysA": days_a, "overLimit": bool(max_m) and after > anniversary(D(a[0]), max_m),
         "needsReport": bool(report_m) and after > anniversary(D(a[0]), report_m)}
    converted = bool(continued and applies)
    if b:
        days_b = (D(b[1]) - D(b[0])).days + 1
        gap = (D(b[0]) - D(a[1])).days - 1
        r.update(totalDays=days_a + days_b, gapDays=gap, seniorityMerged=D(b[0]) < anniversary(after, 3))
        if applies and days_a + days_b > 90 and gap <= 30:
            converted = True
    r["converted"] = converted
    return r


def fixed_term_cases():
    out = []

    def add(name, kind, a, b=None, continued=False, note=None):
        inp = {"kind": kind, "a": {"start": a[0], "end": a[1]}}
        if b:
            inp["b"] = {"start": b[0], "end": b[1]}
        if continued:
            inp["continued"] = True
        out.append(case(name, inp, fixed_term(kind, a, b, continued), note))

    add("課堂狀況一：間隔 29 天、合計超過 90 天 → 不定期契約", "short", ("2026-01-01", "2026-03-31"), ("2026-04-30", "2026-10-31"))
    add("課堂狀況二：間隔 2 個月 → 仍是定期，但年資合併", "short", ("2026-01-01", "2026-03-31"), ("2026-06-01", "2026-10-31"))
    add("課堂狀況三：間隔 3 個月以上 → 不合併年資", "short", ("2026-01-01", "2026-03-31"), ("2026-07-01", "2026-10-31"))
    add("間斷剛好 30 日仍算未超過 30 日", "temporary", ("2026-01-01", "2026-03-31"), ("2026-05-01", "2026-06-30"))
    add("間斷 31 日不會變成不定期", "temporary", ("2026-01-01", "2026-03-31"), ("2026-05-02", "2026-06-30"))
    add("前後合計剛好 90 日不會變成不定期", "short", ("2026-01-01", "2026-01-30"), ("2026-02-01", "2026-04-01"))
    add("季節性工作不適用「視為不定期」", "seasonal", ("2026-01-01", "2026-03-31"), ("2026-04-10", "2026-08-31"))
    add("期滿後繼續工作、雇主沒反對 → 不定期", "temporary", ("2026-01-01", "2026-03-31"), continued=True)
    add("臨時性超過 6 個月", "temporary", ("2026-01-01", "2026-07-01"))
    add("短期性剛好 6 個月不超過", "short", ("2026-01-01", "2026-06-30"))
    add("特定性超過 1 年要報主管機關核備", "specific", ("2026-01-01", "2027-03-31"))
    add("季節性 9 個月內", "seasonal", ("2026-02-01", "2026-10-31"))
    return {"id": "fixed-term", "title": "定期契約檢查", "rule": "fixed-term-contracts",
            "source": "勞動基準法第 9、10 條；施行細則第 6 條", "cases": out}


# ---- 試用期時程 ----
def probation(hire, days):
    h = D(hire)
    end = h + dt.timedelta(days - 1)
    three = anniversary(h, 3) - dt.timedelta(1)
    c1, c2 = end - dt.timedelta(20), end - dt.timedelta(10)
    after = end >= three
    return {"end": end.isoformat(), "completesThreeMonths": three.isoformat(), "lastNoNotice": (three - dt.timedelta(1)).isoformat(),
            "check1": c1.isoformat() if c1 > h else None, "check2": c2.isoformat() if c2 > h else None,
            "endsAfterThreeMonths": after, "noticeBy": (end - dt.timedelta(10)).isoformat() if after else None}


def probation_cases():
    out = []
    for name, hire, days in [
        ("80 天試用：第 60、70 天內部確認，仍在 3 個月內", "2026-01-05", 80),
        ("90 天試用：1/1 到職做到 3/31 已滿 3 個月，要預告", "2026-01-01", 90),
        ("89 天試用：做到 3/30 還沒滿 3 個月", "2026-01-01", 89),
        ("45 天試用", "2026-03-01", 45),
        ("6 個月試用（181 天）", "2026-01-01", 181),
        ("月底到職 1/31：做到 4/29 以前終止不用預告", "2026-01-31", 60),
        ("月底到職 11/30 跨年", "2025-11-30", 90),
        ("閏年 2 月到職", "2024-02-29", 80),
        ("試用很短（15 天），沒有內部確認點", "2026-04-01", 15),
        ("試用 100 天", "2026-07-01", 100),
    ]:
        out.append(case(name, {"hireDate": hire, "probationDays": days}, probation(hire, days)))
    return {"id": "probation", "title": "試用期時程", "source": "勞動基準法第 16 條；勞動部〈試用期間終止契約〉", "cases": out}


# ---- 病假、事假與全勤獎金 ----
def floor_money(x):
    return math.floor(round(x * 1e6) / 1e6)


def leave(kind, days, wage, bonus=0, used=0):
    daily = wage / 30
    r = {"halfPayDays": 0, "unpaidDays": 0, "bonusDeduction": 0}
    if kind in ("sick", "miscarriage"):
        half = min(days, max(0, 30 - used))
        r.update(halfPayDays=half, unpaidDays=days - half, wageDeduction=floor_money(daily * 0.5 * half + daily * (days - half)),
                 yearTotal=used + days, protected=used + days <= 10)
        if kind == "sick":
            r.update(bonusRule="proportional", bonusDeduction=min(bonus, floor_money(bonus / 30 * days)))
        else:
            r["bonusRule"] = "none"
    else:
        r.update(unpaidDays=days, wageDeduction=floor_money(daily * days), bonusRule="none" if kind == "family-care" else "company")
    return r


def leave_cases():
    out = []

    def add(name, kind, days, wage, bonus=0, used=0, note=None):
        inp = {"leaveType": kind, "days": days, "monthlyWage": wage, "attendanceBonus": bonus, "usedThisYear": used}
        out.append(case(name, inp, leave(kind, days, wage, bonus, used), note))

    add("上課例子：全勤 3,000，請 1 日病假最多扣 100", "sick", 1, 30000, 3000)
    add("病假 2 日：工資折半、全勤按比例扣", "sick", 2, 36000, 2000)
    add("病假半天", "sick", 0.5, 30000, 3000)
    add("今年已請 28 日，再請 3 日：2 日半薪、1 日要改用其他假", "sick", 3, 30000, 1000, used=28)
    add("今年已請 30 日：這次都沒有半薪", "sick", 2, 30000, 1000, used=30)
    add("今年累計 10 日內：受不利處分保護", "sick", 3, 32000, 0, used=7)
    add("今年累計超過 10 日：仍不能只看天數考核", "sick", 3, 32000, 0, used=8)
    add("全勤獎金很少：扣款不超過獎金本身", "sick", 31, 30000, 500, used=0, note="最多扣到全勤獎金 500 元")
    add("妊娠未滿 3 個月流產請病假：不扣全勤", "miscarriage", 5, 30000, 2000)
    add("照顧家人的事假：不給薪，但不扣全勤", "family-care", 1, 30000, 3000)
    add("一般事假：不給薪，全勤依公司規定", "personal", 1, 30000, 3000)
    return {"id": "sick-leave", "title": "病假、事假與全勤獎金", "source": "勞工請假規則第 4、7、9、9-1 條", "cases": out}


# ---- 補休換算與到期折發 ----
def seg(type_, a, b):
    tiers = [(0, 2, 1.34), (2, 8, 1.67), (8, 12, 2.67)] if type_ == "rest" else [(0, 2, 1.34), (2, 4, 1.67)]
    return sum(r * max(0, min(max(b, lo), hi) - min(max(a, lo), hi)) for lo, hi, r in tiers)


def comp_leave(wage, days):
    hourly = wage / 240
    total = 0
    unused = 0
    for d in days:
        used = min(max(d.get("used", 0), 0), d["hours"])
        unused += d["hours"] - used
        total += hourly * seg(d["type"], used, d["hours"])
    return {"compHours": sum(d["hours"] for d in days), "unusedHours": unused, "payout": ceil_money(total)}


def comp_cases():
    out = []

    def add(name, wage, days, note=None):
        out.append(case(name, {"date": "2026-10-15", "monthlyWage": wage, "days": days}, comp_leave(wage, days), note))

    add("平日加班 3 小時都沒補休：照加班費折發", 36000, [{"type": "weekday", "hours": 3, "used": 0}])
    add("平日加班 3 小時已補休 3 小時：不用折發", 36000, [{"type": "weekday", "hours": 3, "used": 3}])
    add("平日加班 3 小時補休 1 小時：未休 2 小時以較晚時數計", 36000, [{"type": "weekday", "hours": 3, "used": 1}],
        "未休的視為第 2～3 小時：150×1.34＋150×1.67")
    add("休息日 8 小時全未休", 36000, [{"type": "rest", "hours": 8, "used": 0}])
    add("休息日 10 小時補休 8 小時：未休的是第 9～10 小時", 36000, [{"type": "rest", "hours": 10, "used": 8}])
    add("多天合計", 40000, [{"type": "weekday", "hours": 2, "used": 2}, {"type": "weekday", "hours": 4, "used": 1}, {"type": "rest", "hours": 4, "used": 0}])
    add("休息日 1 小時未休", 30000, [{"type": "rest", "hours": 1, "used": 0}])
    add("補休時數多填時以加班時數為上限", 36000, [{"type": "weekday", "hours": 2, "used": 5}])
    add("月薪 31,000 平日 2.5 小時未休", 31000, [{"type": "weekday", "hours": 2.5, "used": 0}])
    add("休息日 12 小時補休 4 小時", 45000, [{"type": "rest", "hours": 12, "used": 4}])
    return {"id": "comp-leave", "title": "加班補休換算與到期折發", "rule": "overtime-rates",
            "source": "勞動基準法第 32-1 條、第 24 條", "cases": out}


# ---- 時薪人員國定假日 ----
def hourly_holiday(wage, daily, scheduled, worked):
    day = wage * daily
    if scheduled:
        if not worked:
            return {"pay": ceil_money(day), "basis": "paid-off"}
        return {"pay": ceil_money(day * 2 + wage * max(0, worked - daily)), "basis": "double"}
    if not worked:
        return {"pay": 0, "basis": "none"}
    return {"pay": ceil_money(wage * worked * 2), "basis": "double-unscheduled"}


def hourly_cases():
    out = []
    for name, wage, daily, sch, worked in [
        ("原約定上班日遇國定假日，放假：工資照給 8 小時", 196, 8, True, 0),
        ("原約定上班日，出勤 8 小時：加倍", 196, 8, True, 8),
        ("原約定上班日，只上 4 小時：仍以整日加倍", 196, 8, True, 4),
        ("每天約定 4 小時的部分工時，放假照給 4 小時", 200, 4, True, 0),
        ("每天約定 4 小時，出勤 4 小時：4 小時 × 2", 200, 4, True, 4),
        ("每天約定 3 小時，國定假日上 3 小時", 196, 3, True, 3),
        ("不是約定上班日，沒上班：不用給", 196, 8, False, 0),
        ("不是約定上班日，被要求上 5 小時：兩倍", 196, 8, False, 5),
        ("約定 8 小時，出勤 10 小時：超過部分另計", 196, 8, True, 10),
        ("時薪 250，約定 6 小時，放假照給", 250, 6, True, 0),
    ]:
        out.append(case(name, {"hourlyWage": wage, "dailyHours": daily, "scheduled": sch, "workedHours": worked},
                        hourly_holiday(wage, daily, sch, worked)))
    return {"id": "hourly-holiday", "title": "時薪人員國定假日", "source": "勞動基準法第 37、39 條；勞動部〈國定假日應依法給假給薪〉", "cases": out}


# ---- 舊制退休金 ----
def pension(frm, to, wage, disabled=False):
    m, d = tenure(frm, to)
    full, rest = m // 12, m % 12
    years = full if (rest == 0 and d == 0) else full + (1 if rest >= 6 else 0.5)
    raw = 2 * min(years, 15) + max(years - 15, 0)
    bases = min(45, raw) * (1.2 if disabled else 1)
    return {"years": years, "bases": round(bases, 10), "capped": raw > 45, "amount": ceil_money(wage * bases)}


def pension_cases():
    out = []
    for name, frm, to, wage, dis in [
        ("舊制年資剛好 10 年：20 個基數", "1995-07-01", "2005-06-30", 40000, False),
        ("舊制年資 10 年 3 個月：未滿半年以半年計", "1995-04-01", "2005-06-30", 40000, False),
        ("舊制年資 10 年 7 個月：滿半年以一年計", "1994-12-01", "2005-06-30", 40000, False),
        ("剛好 15 年：30 個基數", "1990-07-01", "2005-06-30", 45000, False),
        ("16 年：前 15 年 30 個、之後 1 個", "1989-07-01", "2005-06-30", 45000, False),
        ("30 年：45 個基數", "1975-07-01", "2005-06-30", 50000, False),
        ("35 年：最高 45 個基數", "1971-07-01", "2006-06-30", 50000, False),
        ("選擇繼續適用舊制，做到 2026 年", "1990-03-01", "2026-02-28", 60000, False),
        ("因執行職務致身心障礙被強制退休：加給 20%", "1995-07-01", "2005-06-30", 40000, True),
        ("15 年 2 個月：超過的部分以半年計", "1990-05-01", "2005-06-30", 45000, False),
    ]:
        inp = {"from": frm, "to": to, "avgWage": wage}
        if dis:
            inp["disabilityOnDuty"] = True
        out.append(case(name, inp, pension(frm, to, wage, dis)))
    return {"id": "old-pension", "title": "舊制退休金基數", "source": "勞動基準法第 55 條", "cases": out}


# ---- 職場霸凌：向主管機關申訴期限 ----
def authority(ended, left=None):
    three = anniversary(D(ended), 36) - dt.timedelta(1)
    after = (anniversary(D(left), 12) - dt.timedelta(1)) if left else None
    return {"threeYears": three.isoformat(), "afterLeaving": after.isoformat() if after else None,
            "deadline": (after if after and after > three else three).isoformat()}


def bullying_cases():
    out = []
    for name, ended, left in [
        ("行為終了 115/3/1，仍在職：3 年內", "2026-03-01", None),
        ("行為終了後很快離職：3 年較長", "2026-03-01", "2026-05-01"),
        ("離職很久以後：離職後 1 年較長", "2024-01-10", "2026-06-30"),
        ("閏年 2/29 終了", "2024-02-29", None),
        ("行為終了當天離職", "2026-07-15", "2026-07-15"),
        ("115/7/1 新制施行當天", "2026-07-01", None),
        ("離職後 1 年剛好等於 3 年的情況", "2025-01-01", "2027-01-01"),
        ("月底離職", "2026-01-31", "2026-01-31"),
        ("年底終了", "2026-12-31", None),
        ("多年後離職", "2026-08-15", "2030-03-31"),
    ]:
        inp = {"endedOn": ended}
        if left:
            inp["leftOn"] = left
        out.append(case(name, inp, authority(ended, left)))
    return {"id": "bullying-deadline", "title": "職場霸凌向主管機關申訴期限", "source": "職業安全衛生法第 22-3 條", "cases": out}


# ---- 用人總成本（勞保局與健保署公式；各項四捨五入） ----
def _r(x):
    import decimal
    return int(decimal.Decimal(str(round(x, 6))).quantize(decimal.Decimal("1"), rounding=decimal.ROUND_HALF_UP))


def employment_cost(salary, occ=None, deps=0, vol=0, prate=0):
    rule = __import__("json").loads((Path(__file__).resolve().parents[2] / "data" / "rules" / "social-insurance.json").read_text())["entries"][0]
    g = lambda grades: next((x for x in grades if x >= salary), grades[-1])
    li, oi, hi, lp = g(rule["labor_insurance"]["grades"]), g(rule["occupational_insurance"]["grades"]), g(rule["health_insurance"]["grades"]), g(rule["labor_pension"]["grades"])
    occ = occ or 0.0021
    emp = {"labor": _r(li * 0.115 * 0.7), "employment": _r(li * 0.01 * 0.7), "occupational": _r(oi * occ),
           "health": _r(hi * 0.0517 * 0.6 * 1.56), "pension": _r(lp * max(0.06, prate)), "arrears": _r(li * 0.00025)}
    ee = {"labor": _r(li * 0.115 * 0.2), "employment": _r(li * 0.01 * 0.2), "health": _r(hi * 0.0517 * 0.3) * (1 + min(3, deps)),
          "pension": _r(lp * min(0.06, vol))}
    return {"grades": {"labor": li, "occupational": oi, "health": hi, "pension": lp}, "employer": emp,
            "employerTotal": sum(emp.values()), "totalCost": salary + sum(emp.values()), "employee": ee,
            "employeeTotal": sum(ee.values()), "takeHome": salary - sum(ee.values())}


def cost_cases():
    out = []

    def add(name, inp, note=None):
        out.append(case(name, inp, employment_cost(inp["salary"], inp.get("occupationalRate"), inp.get("dependents", 0),
                                                   inp.get("voluntaryRate", 0), inp.get("pensionRate", 0)), note))

    add("勞保局官方試算：月薪 29,500、職災費率 0.21%", {"salary": 29500, "occupationalRate": 0.0021},
        "勞保局試算結果：單位負擔勞保 2,375、職災 62、就保 207；個人負擔勞保 679、就保 59")
    add("月薪 40,000：級距 40,100", {"salary": 40000})
    add("月薪 36,000，員工有 2 名健保眷屬", {"salary": 36000, "dependents": 2})
    add("月薪 50,000：勞保到最高級 45,800，職災 50,600", {"salary": 50000})
    add("月薪 80,000：職災最高 72,800", {"salary": 80000})
    add("月薪 160,000：勞退最高 150,000、健保 162,800", {"salary": 160000})
    add("月薪 350,000：健保最高 313,000", {"salary": 350000})
    add("員工自願提繳勞退 6%", {"salary": 45000, "voluntaryRate": 0.06})
    add("雇主多提繳勞退 8%", {"salary": 45000, "pensionRate": 0.08})
    add("職災費率較高的行業 0.57%", {"salary": 42000, "occupationalRate": 0.0057})
    add("健保眷屬 5 人以 3 人計", {"salary": 33000, "dependents": 5})
    return {"id": "employment-cost", "title": "用人總成本", "source": "勞保局、健保署 115 年分級表與保費公式", "cases": out}


# ---- 連續請病假一段期間 ----
def sick_period(start, end, rest=(0, 6), used=0, wage=None):
    cal = __import__("json").loads((Path(__file__).resolve().parents[2] / "data" / "rules" / "holiday-calendar.json").read_text())
    hol = {x["date"] for e in cal["entries"] for x in e["days"]}
    sick = off = 0
    d = D(start)
    while d <= D(end):
        wd = (d.weekday() + 1) % 7  # Python 星期一＝0 → 改成星期日＝0
        if (wd in rest or d.isoformat() in hol) and sick < 30:
            off += 1
        else:
            sick += 1
        d += dt.timedelta(1)
    half = min(sick, max(0, 30 - used))
    r = {"calendarDays": off + sick, "sickDays": sick, "offDays": off, "halfPayDays": half, "unpaidDays": sick - half, "longLeave": sick > 30}
    if wage:
        daily = wage / 30
        r["wageDeduction"] = math.floor(round((daily * 0.5 * half + daily * (sick - half)) * 1e6) / 1e6)
    return r


def sick_period_cases():
    out = []

    def add(name, start, end, rest=None, used=0, wage=None, note=None):
        inp = {"start": start, "end": end}
        if rest is not None:
            inp["restWeekdays"] = list(rest)
        if used:
            inp["usedThisYear"] = used
        if wage:
            inp["monthlyWage"] = wage
        out.append(case(name, inp, sick_period(start, end, tuple(rest) if rest is not None else (0, 6), used, wage), note))

    add("上課例子：115 年 10 月整月請病假", "2026-10-01", "2026-10-31", wage=36000,
        note="週六日 9 天＋國慶日補假 10/9、光復節補假 10/26，非工作日 11 天，病假 20 天")
    add("春節前後連續請病假", "2026-02-09", "2026-02-27")
    add("一週病假（週一到週五）", "2026-03-02", "2026-03-06", wage=30000)
    add("跨週末：週四到下週二", "2026-03-05", "2026-03-10")
    add("連續超過 30 日：之後的例假也算病假", "2026-03-02", "2026-05-15", wage=40000)
    add("今年已請 25 日，再連請 10 個工作日", "2026-06-01", "2026-06-12", used=25, wage=32000)
    add("排班是週日、週一休", "2026-03-01", "2026-03-14", rest=(0, 1))
    add("116 年春節期間", "2027-02-01", "2027-02-12")
    add("跨年：115/12/28 到 116/1/8", "2026-12-28", "2027-01-08")
    add("只請週末不上班的日子：都不算病假", "2026-03-07", "2026-03-08")
    return {"id": "sick-period", "title": "連續請病假的天數", "source": "勞工請假規則第 4 條；內政部台內勞字第 315405 號函；人事行政總處辦公日曆表", "cases": out}


# ---- 勞退新制個人專戶推估 ----
def pension_new(salary, years, balance=0, er=0.06, vol=0, ret=0, growth=0):
    rule = __import__("json").loads((Path(__file__).resolve().parents[2] / "data" / "rules" / "social-insurance.json").read_text())["entries"][0]["labor_pension"]
    grade = lambda s: next((x for x in rule["grades"] if x >= s), rule["grades"][-1])
    er = max(0.06, er)
    vol = min(0.06, max(0, vol))
    bal = balance
    sal = salary
    contributed = 0
    for m in range(round(years * 12)):
        if m > 0 and m % 12 == 0:
            sal *= 1 + growth
        c = _r(grade(sal) * (er + vol))
        bal = bal * (1 + ret / 12) + c
        contributed += c
    return {"firstGrade": grade(salary), "contributed": contributed, "earnings": _r(bal - contributed - balance), "balance": _r(bal)}


def pension_new_cases():
    out = []

    def add(name, inp):
        out.append(case(name, inp, pension_new(inp["salary"], inp["years"], inp.get("balance", 0), inp.get("employerRate", 0.06),
                                              inp.get("voluntaryRate", 0), inp.get("annualReturn", 0), inp.get("salaryGrowth", 0))))

    add("月薪 40,000 提繳 1 年、不計收益：40,100 × 6% × 12", {"salary": 40000, "years": 1})
    add("月薪 40,000 提繳 30 年、年收益 3%", {"salary": 40000, "years": 30, "annualReturn": 0.03})
    add("加上員工自願提繳 6%", {"salary": 40000, "years": 30, "voluntaryRate": 0.06, "annualReturn": 0.03})
    add("已有專戶餘額 50 萬", {"salary": 50000, "years": 20, "balance": 500000, "annualReturn": 0.03})
    add("薪資每年成長 2%", {"salary": 35000, "years": 25, "annualReturn": 0.03, "salaryGrowth": 0.02})
    add("高薪：提繳工資最高 150,000", {"salary": 200000, "years": 10, "annualReturn": 0.02})
    add("自願提繳填超過 6% 以 6% 計", {"salary": 40000, "years": 5, "voluntaryRate": 0.1})
    add("雇主多提繳 8%", {"salary": 45000, "years": 15, "employerRate": 0.08, "annualReturn": 0.025})
    add("最低工資 29,500、收益 0", {"salary": 29500, "years": 40})
    add("半年", {"salary": 30000, "years": 0.5, "annualReturn": 0.04})
    return {"id": "pension-new", "title": "勞退新制個人專戶推估", "source": "勞工退休金條例第 14 條；勞工退休金月提繳分級表", "cases": out}


# ---- 職災醫療期間工資補償（勞基法第 59 條；職災保險法第 42 條） ----
def injury_comp(wage, insured, days):
    employer = ceil_money(wage / 30 * days)
    bdays = min(730, max(0, days - 3))
    full = min(bdays, 60)
    reduced = bdays - full
    ins = _r(insured / 30 * full + insured / 30 * 0.7 * reduced)
    return {"employerTotal": employer, "benefitDays": bdays, "fullDays": full, "reducedDays": reduced, "insurance": ins, "topUp": max(0, employer - ins), "overMax": days > 730}


def injury_cases():
    out = []

    def add(name, inp):
        out.append(case(name, inp, injury_comp(inp["originalWage"], inp["insuredSalary"], inp["days"])))

    add("只休 3 日：保險不給付，雇主全額", {"originalWage": 36000, "insuredSalary": 36300, "days": 3})
    add("休 4 日：保險給付第 4 日", {"originalWage": 36000, "insuredSalary": 36300, "days": 4})
    add("休 30 日", {"originalWage": 36000, "insuredSalary": 36300, "days": 30})
    add("休 63 日：剛好領滿 60 日全額", {"originalWage": 45000, "insuredSalary": 45800, "days": 63})
    add("休 90 日：之後改 70%", {"originalWage": 45000, "insuredSalary": 45800, "days": 90})
    add("投保薪資低報：雇主差額變大", {"originalWage": 60000, "insuredSalary": 29500, "days": 60})
    add("投保薪資高於原領工資：不用補", {"originalWage": 30000, "insuredSalary": 33300, "days": 45})
    add("休 1 年", {"originalWage": 50000, "insuredSalary": 50000, "days": 365})
    add("滿 2 年後：保險最多 730 日", {"originalWage": 40000, "insuredSalary": 40100, "days": 800})
    add("沒有投保：全部由雇主負擔", {"originalWage": 32000, "insuredSalary": 0, "days": 20})
    return {"id": "injury-comp", "title": "職災醫療期間工資補償", "source": "勞動基準法第 59 條；勞工職業災害保險及保護法第 42 條", "cases": out}


GENERATORS = {"package-pay": package_cases, "severance": severance_cases, "average-wage": average_cases, "notice-period": notice_cases, "overtime": overtime_cases, "fixed-term": fixed_term_cases, "probation": probation_cases, "sick-leave": leave_cases, "comp-leave": comp_cases, "hourly-holiday": hourly_cases,
              "old-pension": pension_cases, "bullying-deadline": bullying_cases, "employment-cost": cost_cases, "sick-period": sick_period_cases, "pension-new": pension_new_cases,
              "injury-comp": injury_cases}

if __name__ == "__main__":
    for name, gen in GENERATORS.items():
        changed = write_json(DATA / "testcases" / f"{name}.json", gen())
        print(name, "已更新" if changed else "沒有變動")
