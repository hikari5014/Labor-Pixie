import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import statuslib  # noqa: E402
import write_status  # noqa: E402
from datalib import DATA  # noqa: E402


class StatusTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.data = self.tmp / "data"
        shutil.copytree(DATA, self.data)
        for name in ("status.json", "update-log.json"):
            (self.data / name).unlink(missing_ok=True)

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def read(self, name):
        return json.loads((self.data / name).read_text(encoding="utf-8"))

    def test_first_run_records_start_only(self):
        self.assertEqual(statuslib.track_rule_changes(self.data, today="2026-10-16"), 1)
        log = self.read("update-log.json")
        self.assertEqual(log["entries"][0]["item"], "開始記錄")
        self.assertIn("rules/minimum-wage.json", log["tracked"])

    def test_manual_rule_edit_is_logged_once(self):
        statuslib.track_rule_changes(self.data)
        path = self.data / "rules" / "minimum-wage.json"
        rule = json.loads(path.read_text(encoding="utf-8"))
        rule["note"] = "改過"
        path.write_text(json.dumps(rule, ensure_ascii=False), encoding="utf-8")
        self.assertEqual(statuslib.track_rule_changes(self.data), 1)
        self.assertEqual(statuslib.track_rule_changes(self.data), 0)
        entry = self.read("update-log.json")["entries"][0]
        self.assertEqual((entry["category"], entry["item"]), ("rules", rule["title"]))

    def test_logged_calendar_change_is_not_counted_twice(self):
        statuslib.track_rule_changes(self.data)
        path = self.data / "rules" / "holiday-calendar.json"
        rule = json.loads(path.read_text(encoding="utf-8"))
        rule["note"] += "。"
        path.write_text(json.dumps(rule, ensure_ascii=False), encoding="utf-8")
        statuslib.log_update("calendar", "117 年辦公日曆表", "新增", data_dir=self.data, path="rules/holiday-calendar.json")
        self.assertEqual(statuslib.track_rule_changes(self.data), 0)
        self.assertEqual(self.read("update-log.json")["entries"][0]["category"], "calendar")

    def test_failure_keeps_last_success(self):
        statuslib.write_status(self.data, checks={"laws": (True, "法規沒有變動"), "calendar": (True, "ok")})
        first = self.read("status.json")["checks"]["laws"]["last_success"]
        statuslib.write_status(self.data, checks={"laws": (False, "抓取失敗：timeout"), "calendar": (True, "ok")})
        laws = self.read("status.json")["checks"]["laws"]
        self.assertFalse(laws["ok"])
        self.assertEqual(laws["last_success"], first)
        self.assertEqual(laws["message"], "抓取失敗：timeout")

    def test_summary_and_problems(self):
        status = statuslib.write_status(self.data, today="2027-01-02")
        self.assertEqual(len(status["summary"]["laws"]), len(list((DATA / "laws").glob("*.json"))))
        self.assertIn(2026, status["summary"]["calendar"]["years"])
        self.assertTrue(any("minimum-wage" in p for p in status["problems"]))  # 2027 最低工資仍是 pending

    def test_write_status_cli_reads_failure_reason(self):
        log = self.tmp / "laws.log"
        log.write_text("下載中斷，10 秒後重試…\n抓取失敗： HTTP 503\n", encoding="utf-8")
        code = write_status.main(["--laws", "failure", "--calendar", "success", "--laws-log", str(log), "--data-dir", str(self.data)])
        self.assertEqual(code, 1)
        self.assertEqual(self.read("status.json")["checks"]["laws"]["message"], "抓取失敗： HTTP 503")


if __name__ == "__main__":
    unittest.main()
