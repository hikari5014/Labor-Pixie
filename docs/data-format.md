# 資料格式說明（格式版本 1）

勞資小精靈的法規資料只放在 `data/`。網站讀它，法規資料包也是從它匯出。
其他系統（例如公司內網的勞動合規模組）要匯入資料包，照這份說明實作即可。

## data/ 資料夾

| 路徑 | 內容 |
| --- | --- |
| `data/meta.json` | 格式名稱、格式版本、資料版本 |
| `data/laws/<id>.json` | 法規全文，一部法一個檔，由 `scripts/fetch_laws.py` 自動抓 |
| `data/rules/<id>.json` | 規則表：最低工資、加班倍率、國定假日、特休、預告期、婚假…，人工維護 |
| `data/testcases/`、`interpretations/`、`faq/`、`topics/` | 試算驗證範例、函釋、主管機關問答、爭議主題卡（之後才加） |

規則：
- 只能放 `.json`，檔名只用小寫英文、數字、連字號（例 `minimum-wage.json`）。
- 日期一律西元 `YYYY-MM-DD`（畫面上才轉民國年）。
- `python scripts/validate_data.py` 會檢查以上規則；沒通過不能匯出、不能上線。

### meta.json

```json
{ "format": "labor-pixie-data", "format_version": 1, "data_version": "2026-10-15",
  "files": ["laws/labor-standards-act.json", "rules/minimum-wage.json", "…"] }
```

- `data_version`：資料最後變動的日期。自動抓法規時會自己更新；人工改完資料執行 `python3 scripts/refresh_meta.py`。
- `files`：meta.json 以外所有資料檔的清單（網站離線快取靠它預先下載），由同一支程式維護，檢查程式會比對。

### 驗證範例（testcases/）

```json
{ "id": "annual-leave", "title": "…", "rule": "annual-leave", "source": "勞動基準法第 38 條",
  "cases": [ { "name": "滿 1 年，7 日", "input": { "hireDate": "2025-01-15", "date": "2026-01-15" },
               "expected": { "months": 12, "days": 7 } } ] }
```

每個試算器至少 10 組。`expected` 只列要檢查的欄位。收件方若自己實作同一個試算，可以用同一組範例確認兩邊算得一樣。

### 規則表（rules/）

```json
{
  "id": "minimum-wage",
  "title": "最低工資（月薪、時薪）",
  "note": "給人看的補充說明",
  "entries": [
    { "effective_from": "2026-01-01", "status": "active",
      "monthly": 29500, "hourly": 196,
      "source": "勞動部〈歷年最低工資／基本工資調整〉",
      "source_url": "https://www.mol.gov.tw/…",
      "checked_on": "2026-10-15" }
  ]
}
```

每一筆（entry）必填：

| 欄位 | 意思 |
| --- | --- |
| `effective_from` | 生效日。entries 由舊到新排列 |
| `status` | `active` 已生效／`pending` 已公布但尚未正式核定／`repealed` 已廢止 |
| `source`、`source_url` | 來源，必須是法條或主管機關（https 網址）；課堂、新聞轉述不能當唯一來源 |
| `checked_on` | 最後查證日 |

其他欄位依規則表而定（例：`monthly`、`hourly`、`tiers`）。
**用法**：要查某一天適用的數字，取 `status` 為 `active` 且 `effective_from` 不晚於那天的最後一筆。`pending` 只拿來預告，不拿來計算。

### 法規（laws/）

```json
{
  "id": "labor-standards-act", "name": "勞動基準法", "pcode": "N0030001",
  "level": "法律", "url": "https://law.moj.gov.tw/…", "modified_on": "2024-07-31",
  "abandon_note": "", "source": "全國法規資料庫開放資料",
  "articles": [
    { "type": "chapter", "text": "第 一 章 總則" },
    { "type": "article", "no": "第 1 條", "text": "條文內容…" }
  ]
}
```

## 法規資料包

由 `python scripts/export_bundle.py` 產生，GitHub Actions 每次資料版本變動時自動發行到 Releases 頁（標籤 `data-<資料版本>`）。

```
labor-bundle_2026-10-15.zip
labor-bundle_2026-10-15.zip.sha256    ← 整包的 SHA-256 檢查碼
```

zip 裡面：

```
manifest.json
data/meta.json
data/laws/….json
data/rules/….json
```

### manifest.json

```json
{
  "format": "labor-pixie-bundle",
  "format_version": 1,
  "data_version": "2026-10-15",
  "generated_at": "2026-10-15T19:00:00Z",
  "source_commit": "a1b2c3d",
  "kind": "full",
  "files": [
    { "path": "data/rules/minimum-wage.json", "bytes": 812, "sha256": "…" }
  ]
}
```

`kind` 目前只有 `full`（完整快照）。

### 收件方一定要擋下的情況

`scripts/verify_bundle.py` 是參考做法，只用 Python 內建功能，可以直接照抄：

1. `.zip.sha256` 不存在，或整包檢查碼不符 → 拒收
2. 不是合法 zip、缺 `manifest.json` → 拒收
3. 有任何檔名不是 `.json`、絕對路徑、含 `..` 或反斜線 → 拒收（防止夾帶程式）
4. `format` 不是 `labor-pixie-bundle` → 拒收
5. `format_version` 不認得 → 拒收（請先更新收件程式）
6. 清單以外的檔案、清單有但包裡沒有、任何一個檔的 `sha256` 或 `bytes` 不符 → 拒收

格式要改版時，`format_version` 加 1，並同時更新這份說明。
