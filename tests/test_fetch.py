import unittest

from tests.helpers import ROOT
from fetch_laws import convert, find_by_pcode

RAW = {
    "LawName": "勞動基準法",
    "LawURL": "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=N0030001",
    "LawLevel": "法律",
    "LawModifiedDate": "20240731",
    "LawAbandonNote": "",
    "LawArticles": [
        {"ArticleType": "C", "ArticleNo": "", "ArticleContent": "   第 一 章 總則"},
        {"ArticleType": "A", "ArticleNo": "第 1 條", "ArticleContent": "第一項\r\n第二項"},
        {"ArticleType": "A", "ArticleNo": "第 2 條", "ArticleContent": "   "},
    ],
}


class FetchTest(unittest.TestCase):
    def test_convert(self):
        law = convert(RAW, "labor-standards-act", "N0030001")
        self.assertEqual(law["modified_on"], "2024-07-31")
        self.assertEqual(law["articles"][0], {"type": "chapter", "text": "第 一 章 總則"})
        self.assertEqual(law["articles"][1], {"type": "article", "no": "第 1 條", "text": "第一項\n第二項"})
        self.assertEqual(len(law["articles"]), 2)  # 空白條文略過

    def test_find_by_pcode(self):
        self.assertIs(find_by_pcode([RAW], "N0030001"), RAW)
        with self.assertRaises(LookupError):
            find_by_pcode([RAW], "N0030002")


if __name__ == "__main__":
    unittest.main()


class LawListSyncTest(unittest.TestCase):
    def test_site_law_ids_match_fetch_list(self):
        import re
        from fetch_laws import LAWS
        text = (ROOT / "site" / "lib" / "laws.js").read_text(encoding="utf-8")
        site = dict(re.findall(r"^\s+(\w+): '([a-z0-9-]+)',$", text, re.M))
        self.assertEqual(site, {x["pcode"]: x["id"] for x in LAWS})
        for x in LAWS:
            self.assertTrue((ROOT / "data" / "laws" / f"{x['id']}.json").is_file(), x["id"])
