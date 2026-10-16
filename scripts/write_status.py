"""每天自動更新跑完後，把法條與行事曆的抓取結果寫進 data/status.json（App 會讀它顯示警告）。

用法：python scripts/write_status.py --laws success|failure --calendar success|failure [--laws-log 檔案] [--calendar-log 檔案]
- 結果是 GitHub Actions 步驟的 outcome；log 是該步驟的輸出，用來記錄失敗原因。
- 任一項失敗就以代碼 1 結束（排程亮紅燈並寄信），但狀態檔照樣寫入，讓 App 看得到。
"""
import argparse
import sys
from pathlib import Path

import statuslib


def last_line(path):
    try:
        lines = [l.strip() for l in Path(path).read_text(encoding="utf-8", errors="replace").splitlines() if l.strip()]
    except OSError:
        return ""
    for l in reversed(lines):
        if "失敗" in l:
            return l[:200]
    return lines[-1][:200] if lines else ""


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--laws", required=True)
    ap.add_argument("--calendar", required=True)
    ap.add_argument("--laws-log", default="")
    ap.add_argument("--calendar-log", default="")
    ap.add_argument("--data-dir", default=str(statuslib.DATA))
    args = ap.parse_args(argv)
    checks = {}
    for name, outcome, log in (("laws", args.laws, args.laws_log), ("calendar", args.calendar, args.calendar_log)):
        ok = outcome == "success"
        checks[name] = (ok, last_line(log) or ("完成" if ok else "執行失敗，原因請看 GitHub 自動執行紀錄"))
    status = statuslib.write_status(args.data_dir, checks=checks)
    failed = [n for n, c in status["checks"].items() if not c["ok"]]
    print("狀態已寫入：", "全部成功" if not failed else "失敗：" + "、".join(failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
