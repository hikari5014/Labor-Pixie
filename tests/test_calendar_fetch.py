import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import fetch_calendar as fc  # noqa: E402

FIXTURE = (Path(__file__).parent / "fixtures" / "calendar-2027.csv").read_text(encoding="utf-8-sig")


def source(title="116年中華民國政府行政機關辦公日曆表", url="https://www.dgpa.gov.tw/FileConversion?filename=dgpa/files/202607/x.csv"):
    return {"resourceDescription": title, "resourceFormat": "CSV", "resourceDownloadUrl": url}


class PickSourcesTest(unittest.TestCase):
    def test_latest_revision_wins_and_google_is_skipped(self):
        picked = fc.pick_sources([
            source("115年中華民國政府行政機關辦公日曆表", "https://www.dgpa.gov.tw/FileConversion?filename=dgpa/files/202506/a.csv"),
            source("115年中華民國政府行政機關辦公日曆表(1151020更新)", "https://www.dgpa.gov.tw/FileConversion?filename=dgpa/files/202610/b.csv"),
            source("115年中華民國政府行政機關辦公日曆表_Google行事曆專用", "https://www.dgpa.gov.tw/FileConversion?filename=dgpa/files/202612/c.csv"),
            source("113年中華民國政府行政機關辦公日曆表"),
        ])
        self.assertEqual([p["year"] for p in picked], [2026])
        self.assertIn("202610/b.csv", picked[0]["url"])


class ParseTest(unittest.TestCase):
    def test_real_2027_calendar(self):
        data = fc.parse_calendar(FIXTURE, 2027)
        self.assertEqual(len(data["days"]), 17)
        self.assertEqual(len(data["weekend_holidays"]), 7)
        names = {d["date"]: d["name"] for d in data["days"]}
        self.assertEqual(names["2027-03-01"], "和平紀念日補假")
        self.assertEqual(names["2027-04-30"], "勞動節補假")
        self.assertEqual(names["2027-12-31"], "117 年開國紀念日補假")
        self.assertTrue(all(d["date"][:4] == "2027" for d in data["days"]))

    def broken(self, edit):
        lines = FIXTURE.splitlines()
        return "\n".join(edit(lines))

    def test_rejects_missing_days(self):
        with self.assertRaisesRegex(fc.CalendarError, "365"):
            fc.parse_calendar(self.broken(lambda l: l[:-1]), 2027)

    def test_rejects_wrong_weekday(self):
        bad = self.broken(lambda l: [l[0], l[1].replace(",五,", ",六,")] + l[2:])
        with self.assertRaisesRegex(fc.CalendarError, "星期"):
            fc.parse_calendar(bad, 2027)

    def test_rejects_unknown_holiday_name(self):
        bad = self.broken(lambda l: [x.replace("端午節", "新節日") for x in l])
        with self.assertRaisesRegex(fc.CalendarError, "不認得"):
            fc.parse_calendar(bad, 2027)

    def test_rejects_missing_required_holiday(self):
        bad = self.broken(lambda l: [x.replace(",2,國慶日", ",0,") for x in l])
        with self.assertRaisesRegex(fc.CalendarError, "國慶日"):
            fc.parse_calendar(bad, 2027)

    def test_rejects_changed_header(self):
        with self.assertRaisesRegex(fc.CalendarError, "第一列"):
            fc.parse_calendar(self.broken(lambda l: ["date,weekday,off,note"] + l[1:]), 2027)


class MergeTest(unittest.TestCase):
    def setUp(self):
        self.data = fc.parse_calendar(FIXTURE, 2027)
        self.item = [{"year": 2027, "source": {"title": "116年中華民國政府行政機關辦公日曆表", "url": "https://x/y.csv"}, "data": self.data}]
        self.rule = {"id": "holiday-calendar", "title": "t", "entries": []}

    def test_new_year_is_added(self):
        rule, changes = fc.merge(self.rule, self.item, "2026-10-16")
        self.assertEqual(changes, [(2027, "新增")])
        self.assertEqual(rule["entries"][0]["checked_on"], "2026-10-16")

    def test_same_dates_keep_existing_names(self):
        rule, _ = fc.merge(self.rule, self.item, "2026-10-16")
        rule["entries"][0]["days"][0]["name"] = "人工整理的名稱"
        again, changes = fc.merge(rule, self.item, "2026-12-01")
        self.assertEqual(changes, [])
        self.assertEqual(again["entries"][0]["days"][0]["name"], "人工整理的名稱")

    def test_revised_dates_replace_entry(self):
        rule, _ = fc.merge(self.rule, self.item, "2026-10-16")
        revised = dict(self.data, days=self.data["days"][:-1])
        new, changes = fc.merge(rule, [dict(self.item[0], data=revised)], "2026-12-01")
        self.assertEqual(changes, [(2027, "修正")])
        self.assertEqual(len(new["entries"][0]["days"]), 16)


if __name__ == "__main__":
    unittest.main()
