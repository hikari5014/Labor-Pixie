// 試算器清單：首頁「算金額」列出的順序。view 是畫面模組，在 views/ 底下。
export const CALCULATORS = [
  { id: 'package-pay', title: '統包薪資反推與多退少補', summary: '「月薪含加班費」拆成底薪與固定加班費，算出每月要不要補發' },
  { id: 'annual-leave', title: '特休天數與未休折算', summary: '依到職日算出今年有幾天特休、下次什麼時候增加' },
  { id: 'minimum-wage', title: '最低工資檢查', summary: '月薪或時薪有沒有低於最低工資，含下一次調整' },
  { id: 'average-wage', title: '平均工資', summary: '資遣、退休、職災補償的計算基礎' },
  { id: 'severance', title: '資遣費（新舊制）', summary: '2005/7/1 前後年資自動分段，新制最高 6 個月' },
  { id: 'notice-period', title: '預告期間與謀職假', summary: '要提早幾天通知、沒通知要付多少預告工資' },
  { id: 'overtime', title: '加班費試算', summary: '平日、休息日、國定假日、例假，含每月 46 小時檢查' },
];
