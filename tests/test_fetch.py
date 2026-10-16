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


class DownloadRetryTest(unittest.TestCase):
    def test_retries_then_succeeds(self):
        import io
        import json
        import zipfile
        from unittest import mock
        import fetch_laws
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("ChLaw.json", json.dumps({"Laws": [RAW]}, ensure_ascii=False))

        class Resp(io.BytesIO):
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        calls = {"n": 0}

        def fake_urlopen(req, timeout=None):
            calls["n"] += 1
            if calls["n"] == 1:
                raise OSError("連線中斷")
            return Resp(buf.getvalue())

        with mock.patch("urllib.request.urlopen", fake_urlopen), mock.patch("time.sleep"):
            laws = fetch_laws.download_laws("https://example.invalid")
        self.assertEqual(calls["n"], 2)
        self.assertEqual(laws[0]["LawName"], "勞動基準法")

    def test_gives_up_after_attempts(self):
        from unittest import mock
        import fetch_laws
        with mock.patch("urllib.request.urlopen", side_effect=OSError("斷線")), mock.patch("time.sleep"):
            with self.assertRaises(OSError):
                fetch_laws.download_laws("https://example.invalid", attempts=2)
