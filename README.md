# 勞資小精靈（Labor-Pixie）

勞動法規，白話查、馬上算、兩邊都看得懂。

勞資小精靈是雇主與勞工都能用的勞動法規小幫手。選一個爭議（例如加班費、試用期、資遣），就能看到白話說明、相關法條、法院大概怎麼判，並當場算出金額。它不替你下結論，而是幫你看清楚「理由夠不夠、步驟對不對」。

## 能做什麼（陸續推出）

- **查爭議**：主題卡把法條、函釋、判決變成白話，結果用範圍表示，不說「必勝」。
- **算金額**：加班費、資遣費、特休、最低工資等試算器，每個數字都能點開看怎麼算。
- **檢查公司**：契約、工作規則、工時與薪資的合規檢查。
- **雙視角**：同一份資料，雇主看到「怎麼做才合規」，勞工看到「該留哪些證據」。

網站：https://labor-pixie.vercel.app 。每一版的更新內容在 APP 的「本版紀錄」頁（資料來源 `site/changelog.json`），發展順序見 [docs/roadmap.md](docs/roadmap.md)。

## 法規資料

- 法規全文來自[全國法規資料庫開放資料](https://law.moj.gov.tw/api/swagger/ui/index)，每天自動更新。
- 最低工資、加班倍率等規則表人工維護，每筆都有生效日、出處與查證日。
- 所有資料可匯出成「法規資料包」，格式見 [docs/data-format.md](docs/data-format.md)。

本工具提供資訊，不取代律師或勞動主管機關的意見。

## 開發

只需要 Python 3.12 與 Node 22，不用安裝任何套件。

```bash
python3 scripts/validate_data.py              # 檢查 data/ 格式
python3 -m unittest discover -s tests -t .    # Python 測試
npm test                                      # 網頁測試
python3 scripts/fetch_laws.py                 # 抓最新法規
python3 scripts/refresh_meta.py               # 人工改完 data/ 後更新清單與資料版本
python3 scripts/export_bundle.py              # 匯出法規資料包到 dist/
sh -c "rm -rf site/data && cp -R data site/data && python3 -m http.server 8790 -d site"   # 本機預覽
```

## 授權

程式碼以 [MIT 授權](LICENSE) 釋出。法規條文屬政府公開資料。
