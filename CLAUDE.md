# CLAUDE.md — 勞資小精靈（Labor-Pixie）

使用者是不懂程式的 PM，一律繁體中文、白話解釋。先想清楚再動手、極簡、只改該改的；新版本的計劃書用 HTML 寫在 `docs/plans/`，使用者同意才動手。

## 紅線（違反就是事故）
- **這個 GitHub 專案是公開的。**不放任何公司或個人的內部資料：員工、薪資、客戶、配方、內部文件、帳號密碼。
- 這個資料夾在本機是另一個私人專案的子資料夾。**上層資料夾的任何檔案都不能搬進來、不能在這裡引用它的路徑或內容。**
- `docs/plans/` 已排除在 git 之外（計劃書可能提到內部背景），公開的方向寫在 `docs/roadmap.md`。
- 上課筆記、講義、付費文章不直接放進來：只當「要做哪些題目」的清單，畫面內容用法條、主管機關函釋與問答、判決自己重寫。
- commit 作者用 `hikari5014 <245785613+hikari5014@users.noreply.github.com>`（已設在本資料夾的 git 設定），不要用電腦名稱或私人信箱。

## 技術（不要加大型框架）
- PWA：`site/` 是純 HTML＋CSS＋原生 JavaScript（ES module），不用任何 npm 套件或 CDN。
- 資料工具：`scripts/` 是 Python，只用內建功能（`make_icons.py` 例外，用 Pillow，只在開發電腦跑）。
- 部署：Vercel 專案 `labor-pixie`（Hikari YK's projects），建置只做「把 `data/` 複製到 `site/data/`」（`vercel.json`）。推到 `main` 就自動部署到正式網址（2026-10-15 使用者在 GitHub 開放 Vercel 權限並重新連接後已恢復）。推送後確認 Vercel 有新部署；若沒有，先檢查 GitHub 的 Vercel 權限是否包含本專案。
- 網站結構：`site/routes.js` 網址對應畫面；`site/views/` 畫面；`site/calc/` 純計算（可測試）；`site/lib/` 共用元件與資料讀取。
- 排程：`.github/workflows/data.yml` 每天台灣 03:00 抓法規、資料變動時發行資料包；`ci.yml` 每次推送跑測試。

## 資料（格式細節見 `docs/data-format.md`）
- 法規資料只放 `data/`，只能是 `.json`，檔名小寫連字號。
- `data/rules/` 每一筆都要有 `effective_from`、`status`（active／pending／repealed）、`source`、`source_url`（法條或主管機關）、`checked_on`。數字改了＝新增一筆，不覆蓋舊的。
- 人工改 `data/` 後執行 `python3 scripts/refresh_meta.py`（更新檔案清單、資料版本改成當天；只想更新清單加 `--keep`）。
- 法院或主管機關見解不一的題目，兩派並列附出處，不寫成確定答案。
- 加班倍率一律 1.34／1.67／2.67（法定是「以上」，往上取；不用 1.33）。
- 資料包格式改版：`format_version` 加 1，同步改 `scripts/verify_bundle.py` 與說明文件。

## 畫面（`site/style.css` 開頭有設計規則）
- 一律直角，只有輸入欄位與小標籤圓角；**有陰影＝可以按**，卡片一律平的。
- 只用 `:root` 的顏色變數，不在元件寫色碼；狀態一定附文字；一個畫面最多一個主要按鈕。
- 手機用大尺寸（按鈕 52px、字 17px），電腦 34px、14px。
- 畫面日期用民國年 `115.10.15`，資料裡存西元。金額千分位。
- 每頁都要有免責聲明：本工具提供資訊，不取代律師或主管機關意見。

## 版本與測試
- 版本號 SemVer（v0.x＝開發中，v1.0.0＝正式上線）。改版要同時改三處：`package.json`、`site/app.js` 的 `APP_VERSION`、`site/sw.js` 的 `VERSION`（測試會檢查一致）。
- **本版紀錄**：每一版都要在 `site/changelog.json` 最上面加一筆（version、date、title、changes＝使用者看得懂的變化、technical＝技術變更）。APP 的「本版紀錄」頁直接讀它，測試會檢查第一筆等於目前版本。
- 新增網站檔案要加進 `site/sw.js` 的 `SHELL`；新畫面加進 `site/routes.js`（測試都會檢查）。
- 新試算器：計算放 `site/calc/<id>.js`（純函式），畫面放 `site/views/calc-<id>.js`，登記到 `site/calc/registry.js` 與 `tests/calc-functions.js`，驗證範例 `data/testcases/<id>.json` 至少 10 組。
- 付給勞工的金額一律用 `ceilMoney` 無條件進位到元，避免短付。
- 改完任何東西都要全部通過：
  - `python3 scripts/validate_data.py`
  - `python3 -m unittest discover -s tests -t .`
  - `npm test`
- 本機預覽：`sh -c "rm -rf site/data && cp -R data site/data && python3 -m http.server 8790 -d site"`，或預覽面板的 `labor-pixie`。
- 驗證範例由 `tests/reference/generate.py`（Python 另外實作一次）產生，改了範例或規則後執行它；測試會比對 JS 與 Python 結果。能取得官方算例的（例：勞動部資遣費範例）要收進範例。
- 主題卡、案例、體檢清單、表單範本的內容用法條與主管機關資料自己改寫；判決要到司法院裁判書系統核對原文並附連結（`verified: true`），未核對的標 `verified: false`。查不到法源的實務看法放 `practice` 欄位，畫面標「實務見解，非法定結論」。
- 查核結果記錄在 `docs/verification.md`；有對應勞動部線上試算（calcr2.mol.gov.tw）的試算器，改了算法要重新比對。
