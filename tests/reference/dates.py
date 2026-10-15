"""日期與金額的 Python 參考實作（跟 site/format.js 分開寫，互相驗算）。"""
import calendar
import datetime as dt
import math

D = dt.date.fromisoformat


def add_months(d, n):
    """加月數，沒有那一天取月底。"""
    t = d.year * 12 + d.month - 1 + n
    y, m = divmod(t, 12)
    m += 1
    return dt.date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def anniversary(d, n):
    """滿 n 個月後的下一天（民法第 121、123 條）：沒有對應日時是次月 1 日。"""
    c = add_months(d, n)
    return c if c.day == d.day else c + dt.timedelta(1)


def tenure(start, end):
    """年資（start 到 end 兩天都算）→ (滿幾個月, 剩幾天)"""
    s, after = D(start), D(end) + dt.timedelta(1)
    n = 0
    while anniversary(s, n + 1) <= after:
        n += 1
    return n, (after - anniversary(s, n)).days


def ceil_money(x):
    return math.ceil(round(x * 1e6) / 1e6)
