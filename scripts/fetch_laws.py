"""從全國法規資料庫開放資料抓指定的法規，存成 data/laws/<id>.json。

用法：python scripts/fetch_laws.py
- 法條有變動才改檔案，並把 data/meta.json 的 data_version 改成今天（台灣日期）。
- 抓不到或格式不對就以代碼 1 結束，不動任何檔案（網站繼續用舊資料）。
"""
import http.client
import io
import json
import re
import sys
import time
import urllib.request
import zipfile

from datalib import DATA, refresh_meta, write_json

SOURCES = {
    "law": "https://law.moj.gov.tw/api/ch/law/json",      # 法律（例：勞動基準法）
    "order": "https://law.moj.gov.tw/api/ch/order/json",  # 命令（例：施行細則、規則）
}

# 要抓的法規：id（檔名）、法規代碼 pcode、在哪個整包裡。新增法規就加一行。
LAWS = [
    {"id": "labor-standards-act", "pcode": "N0030001", "source": "law"},
    {"id": "labor-standards-act-enforcement-rules", "pcode": "N0030002", "source": "order"},
    {"id": "leave-rules", "pcode": "N0030006", "source": "order"},
    {"id": "labor-pension-act", "pcode": "N0030020", "source": "law"},
    {"id": "minimum-wage-act", "pcode": "N0030028", "source": "law"},
    {"id": "gender-equality-in-employment-act", "pcode": "N0030014", "source": "law"},
    {"id": "occupational-safety-and-health-act", "pcode": "N0060001", "source": "law"},
    {"id": "labor-incident-act", "pcode": "B0010064", "source": "law"},
    {"id": "employment-insurance-act", "pcode": "N0050021", "source": "law"},
    {"id": "employment-service-act", "pcode": "N0090001", "source": "law"},
    {"id": "middle-aged-and-elderly-employment-act", "pcode": "N0090055", "source": "law"},
    {"id": "commemoration-days-and-holidays-act", "pcode": "D0020095", "source": "law"},
    {"id": "occupational-accident-insurance-act", "pcode": "N0050031", "source": "law"},
]


def download_laws(url, attempts=3):
    """下載整包 zip，回傳裡面 JSON 的 Laws 清單。網路中斷時最多重試 attempts 次。"""
    req = urllib.request.Request(url, headers={"User-Agent": "labor-pixie-data-bot"})
    for i in range(attempts):
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                raw = resp.read()
            break
        except (OSError, http.client.HTTPException) as e:
            if i == attempts - 1:
                raise
            print(f"下載中斷（{e}），{10 * (i + 1)} 秒後重試…", file=sys.stderr)
            time.sleep(10 * (i + 1))
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
        "name": re.sub(r"（[\d.]+制定）$", "", raw["LawName"]),
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
        meta = refresh_meta(bump=True)
        print("有更新：", "、".join(changed), "→ 資料版本", meta["data_version"])
    else:
        print("法規沒有變動")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # 失敗就讓排程顯示紅燈並寄信，檔案不動
        print("抓取失敗：", e, file=sys.stderr)
        sys.exit(1)
