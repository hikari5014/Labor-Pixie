"""人工改完 data/ 後執行：更新 meta.json 的檔案清單，並把資料版本改成今天。

用法：python scripts/refresh_meta.py          （更新清單並改資料版本）
      python scripts/refresh_meta.py --keep   （只更新清單，不改資料版本）
"""
import sys

from datalib import refresh_meta

if __name__ == "__main__":
    meta = refresh_meta(bump="--keep" not in sys.argv)
    print("資料版本", meta["data_version"], "，共", len(meta["files"]), "個檔案")
