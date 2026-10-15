"""每一個法條連結都要指到真的存在的條文（收錄的法規）。"""
import json
import re
import unittest

from tests.helpers import ROOT


def articles():
    found = {}
    for f in (ROOT / "data" / "laws").glob("*.json"):
        law = json.loads(f.read_text(encoding="utf-8"))
        found[law["pcode"]] = {re.sub(r"[第條\s]", "", a["no"]) for a in law["articles"] if a["type"] == "article"}
    return found


def refs():
    out = []
    for f in (ROOT / "site").rglob("*.js"):
        for pcode, no in re.findall(r"lawLink\('(\w+)', '([\d-]+)'", f.read_text(encoding="utf-8")):
            out.append((f.name, pcode, no))
    for f in list((ROOT / "data" / "rules").glob("*.json")) + list((ROOT / "data" / "checklists").glob("*.json")) + list((ROOT / "data" / "topics").glob("*.json")) + list((ROOT / "data" / "cases").glob("*.json")):
        text = f.read_text(encoding="utf-8")
        for pcode, no in re.findall(r'\[\s*"([A-Z]\d{7})",\s*"([\d-]+)"', text):
            out.append((f.name, pcode, no))
    return out


class LawRefTest(unittest.TestCase):
    def test_every_reference_exists(self):
        known = articles()
        checked = 0
        for where, pcode, no in refs():
            if pcode in known:
                checked += 1
                self.assertIn(no, known[pcode], f"{where} 引用 {pcode} 第 {no} 條，但收錄的條文裡沒有")
        self.assertGreater(checked, 20)


if __name__ == "__main__":
    unittest.main()


class CrossRefTest(unittest.TestCase):
    def test_cases_link_to_existing_topics_and_calculators(self):
        calc_ids = set(re.findall(r"id: '([a-z0-9-]+)'", (ROOT / "site" / "calc" / "registry.js").read_text(encoding="utf-8")))
        topic_ids = {f.stem for f in (ROOT / "data" / "topics").glob("*.json")}
        for f in (ROOT / "data" / "cases").glob("*.json"):
            for case in json.loads(f.read_text(encoding="utf-8"))["cases"]:
                for t in case["topics"]:
                    self.assertIn(t, topic_ids, f"{case['id']} 連到不存在的主題卡 {t}")
                for k in case["calcs"]:
                    self.assertIn(k, calc_ids, f"{case['id']} 連到不存在的試算器 {k}")
        for f in (ROOT / "data" / "topics").glob("*.json"):
            for k in json.loads(f.read_text(encoding="utf-8"))["calcs"]:
                self.assertIn(k, calc_ids, f"主題卡 {f.stem} 連到不存在的試算器 {k}")
