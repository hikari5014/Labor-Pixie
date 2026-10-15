// 試算器清單：首頁「算金額」列出的順序。view 是畫面模組，在 views/ 底下。
export const CALCULATORS = [
  { id: 'package-pay', title: '統包薪資反推與多退少補', summary: '「月薪含加班費」拆成底薪與固定加班費，算出每月要不要補發' },
  { id: 'annual-leave', title: '特休天數與未休折算', summary: '依到職日算出今年有幾天特休、下次什麼時候增加' },
  { id: 'minimum-wage', title: '最低工資檢查', summary: '月薪或時薪有沒有低於最低工資，含下一次調整' },
  { id: 'average-wage', title: '平均工資', summary: '資遣、退休、職災補償的計算基礎' },
  { id: 'severance', title: '資遣費（新舊制）', summary: '2005/7/1 前後年資自動分段，新制最高 6 個月' },
  { id: 'notice-period', title: '預告期間與謀職假', summary: '要提早幾天通知、沒通知要付多少預告工資' },
  { id: 'overtime', title: '加班費試算', summary: '平日、休息日、國定假日、例假，含每月 46 小時檢查' },
  { id: 'separation', title: '離職時的四件事', summary: '非自願離職證明、預告、資遣費、資遣通報，依離職情況分開判斷' },
  { id: 'fixed-term', title: '定期契約檢查', summary: '切段簽約會不會變成不定期契約、年資要不要合併' },
  { id: 'probation', title: '試用期時程', summary: '試用期最後一天、內部確認日、什麼時候起要預告' },
  { id: 'sick-leave', title: '病假、事假與全勤獎金', summary: '病假工資折半、全勤獎金最多能扣多少（115 年新制）' },
];
