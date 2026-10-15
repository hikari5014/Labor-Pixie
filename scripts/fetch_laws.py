"""從全國法規資料庫開放資料抓指定的法規，存成 data/laws/<id>.json。

用法：python scripts/fetch_laws.py
- 法條有變動才改檔案，並把 data/meta.json 的 data_version 改成今天（台灣日期）。
- 抓不到或格式不對就以代碼 1 結束，不動任何檔案（網站繼續用舊資料）。
"""
import io
import json
import sys
import urllib.request
import zipfile
from datetime import datetime, timedelta, timezone

from datalib import DATA, read_json, write_json

SOURCES = {
    "law": "https://law.moj.gov.tw/api/ch/law/json",      # 法律（例：勞動基準法）
    "order": "https://law.moj.gov.tw/api/ch/order/json",  # 命令（例：施行細則、規則）
}

# 要抓的法規：id（檔名）、法規代碼 pcode、在哪個整包裡。新增法規就加一行。
LAWS = [
    {"id": "labor-standards-act", "pcode": "N0030001", "source": "law"},
    {"id": "labor-standards-act-enforcement-rules", "pcode": "N0030002", "source": "order"},
]

TAIPEI = timezone(timedelta(hours=8))


def download_laws(url):
    """下載整包 zip，回傳裡面 JSON 的 Laws 清單。"""
    req = urllib.request.Request(url, headers={"User-Agent": "labor-pixie-data-bot"})
    with urllib.request.urlopen(req, timeout=300) as resp:
        raw = resp.read()
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        name = next(n for n in zf.namelist() if n.lower().endswith(".json"))
        return json.loads(zf.read(name).decode("utf-8-sig"))["Laws"]


def find_by_pcode(laws, pcode):
    for law in laws:
        if law.get("LawURL", "").endswith(f"pcode={pcode}"):
            return law
    raise LookupError(f"整包裡找不到 pcode={pcode}")


def to_iso(yyyymmdd):
    return f"{yyyymmdd[:4]}-{yyyymmdd[4:6]}-{yyyymmdd[6:8]}"


def convert(raw, law_id, pcode):
    """把官方格式轉成小精靈的格式。"""
    articles = []
    for art in raw["LawArticles"]:
        text = art["ArticleContent"].replace("\r\n", "\n").strip()
        if not text:
            continue
        if art["ArticleType"] == "C":
            articles.append({"type": "chapter", "text": text})
        else:
            articles.append({"type": "article", "no": art["ArticleNo"].strip(), "text": text})
    return {
        "id": law_id,
        "name": raw["LawName"],
        "pcode": pcode,
        "level": raw.get("LawLevel", ""),
        "url": raw["LawURL"],
        "modified_on": to_iso(raw["LawModifiedDate"]),
        "abandon_note": raw.get("LawAbandonNote", ""),
        "source": "全國法規資料庫開放資料",
        "articles": articles,
    }


def main():
    cache = {}
    results = []
    for item in LAWS:
        if item["source"] not in cache:
            cache[item["source"]] = download_laws(SOURCES[item["source"]])
        raw = find_by_pcode(cache[item["source"]], item["pcode"])
        law = convert(raw, item["id"], item["pcode"])
        if not law["articles"]:
            raise ValueError(f"{item['id']} 沒有任何條文，可能是官方格式改了")
        results.append(law)

    changed = [law["id"] for law in results if write_json(DATA / "laws" / f"{law['id']}.json", law)]
    if changed:
        meta = read_json(DATA / "meta.json")
        meta["data_version"] = datetime.now(TAIPEI).date().isoformat()
        write_json(DATA / "meta.json", meta)
        print("有更新：", "、".join(changed), "→ 資料版本", meta["data_version"])
    else:
        print("法規沒有變動")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # 失敗就讓排程顯示紅燈並寄信，檔案不動
        print("抓取失敗：", e, file=sys.stderr)
        sys.exit(1)
