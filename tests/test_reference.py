import unittest

from tests.helpers import ROOT
from tests.reference.generate import GENERATORS
from datalib import read_json


class ReferenceTest(unittest.TestCase):
    def test_testcases_match_python_reference(self):
        for name, gen in GENERATORS.items():
            with self.subTest(name):
                self.assertEqual(read_json(ROOT / "data" / "testcases" / f"{name}.json"), gen(),
                                 "請執行 python3 tests/reference/generate.py 重新產生")


if __name__ == "__main__":
    unittest.main()
