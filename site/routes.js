// 網址（#/…）對應的畫面。新增畫面就加一行，並把檔案加進 sw.js 的 SHELL。
export const ROUTES = [
  { path: '/', load: () => import('./views/home.js') },
  { path: '/changelog', title: '本版紀錄', load: () => import('./views/changelog.js') },
  { path: '/calc', title: '算金額', load: () => import('./views/calc-list.js') },
  { path: '/calc/annual-leave', title: '特休天數與未休折算', load: () => import('./views/calc-annual-leave.js') },
  { path: '/calc/package-pay', title: '統包薪資反推與多退少補', load: () => import('./views/calc-package-pay.js') },
  { path: '/calc/minimum-wage', title: '最低工資檢查', load: () => import('./views/calc-minimum-wage.js') },
];
