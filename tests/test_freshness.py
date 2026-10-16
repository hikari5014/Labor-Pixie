import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from check_freshness import load_rules, problems  # noqa: E402


def rule(*entries):
    return {"entries": list(entries)}


def entry(effective_from, status="active", checked_on="2026-10-16", **kw):
    return {"effective_from": effective_from, "status": status, "checked_on": checked_on, **kw}


CAL = rule(entry("2026-01-01", year=2026), entry("2027-01-01", year=2027))


class FreshnessTest(unittest.TestCase):
    def test_current_data_ok(self):
        self.assertEqual(problems(load_rules(), date(2026, 10, 16)), [])

    def test_stale_checked_on(self):
        found = problems({"a": rule(entry("2020-01-01", checked_on="2025-01-01")), "holiday-calendar": CAL}, date(2026, 10, 16))
        self.assertEqual(len(found), 1)
        self.assertIn("超過一年", found[0])

    def test_pending_past_effective_date(self):
        found = problems({"minimum-wage": rule(entry("2027-01-01", status="pending")), "holiday-calendar": CAL}, date(2027, 1, 2))
        self.assertTrue(any("尚未核定" in f for f in found))
        self.assertEqual(problems({"minimum-wage": rule(entry("2027-01-01", status="pending")), "holiday-calendar": CAL}, date(2026, 12, 31)), [])

    def test_holiday_calendar_years(self):
        self.assertEqual(problems({"holiday-calendar": CAL}, date(2027, 9, 30)), [])
        found = problems({"holiday-calendar": CAL}, date(2027, 10, 1))
        self.assertEqual(len(found), 1)
        self.assertIn("2028", found[0])
        self.assertIn("2028", problems({"holiday-calendar": CAL}, date(2028, 1, 1))[0])


if __name__ == "__main__":
    unittest.main()
