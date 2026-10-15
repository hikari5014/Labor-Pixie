import { h, pageHead } from '../lib/ui.js';
import { meta } from '../lib/data.js';
import { rocDate } from '../format.js';

function section(title, ...children) {
  return h('section', { class: 'panel' }, h('h2', { class: 'section-title' }, title), ...children);
}

export async function render(root, params, ctx) {
  const m = await meta().catch(() => null);
  root.append(
    pageHead('關於勞資小精靈', '勞動法規，白話查、馬上算、兩邊都看得懂。'),
    section('這是什麼',
      h('p', {}, '雇主與勞工都能用的勞動法規小幫手：查爭議、算金額、檢查公司制度、看法條。它不替你下結論，而是幫你看清楚「理由夠不夠、步驟對不對」。')),
    section('使用前請先知道',
      h('ul', { class: 'notes' },
        h('li', {}, '本工具提供勞動法規資訊與試算，不是法律意見，也不代表勞動主管機關的立場。'),
        h('li', {}, '試算結果依你輸入的資料計算；實際權利義務要看契約、工作規則、出勤與薪資紀錄，以及主管機關或法院的認定。'),
        h('li', {}, '法院或主管機關看法不一致的題目，會並列不同看法，不替你判斷誰會贏。'),
        h('li', {}, '重大個案請洽地方勞工局、申請勞資爭議調解，或諮詢律師。'))),
    section('資料從哪裡來',
      h('ul', { class: 'notes' },
        h('li', {}, '法規條文：全國法規資料庫開放資料，每天自動比對，有修法才更新。'),
        h('li', {}, '最低工資、加班倍率、特休天數等規則：依法條與勞動部公告整理，每一筆都記錄生效日、出處與查證日。'),
        h('li', {}, '尚未正式核定的數字（例：下一年度最低工資）會標「尚未正式核定」，試算時不使用。')),
      m ? h('p', { class: 'small muted' }, `目前法規資料版本：${rocDate(m.data_version)}，共 ${m.files.length} 個資料檔。`) : null),
    section('你的資料',
      h('ul', { class: 'notes' },
        h('li', {}, '本網站不需要登入，不收集任何個人資料，也沒有放追蹤程式。'),
        h('li', {}, '你選的身分（雇主／勞工）和公司體檢清單的自評，只存在你這台裝置的瀏覽器裡，不會上傳。'),
        h('li', {}, '試算時輸入的薪資、日期不會存檔，關掉頁面就消失。'))),
    section('版本與授權',
      h('p', {}, `APP 版本 v${ctx.version}。每一版的更新內容請看 `, h('a', { href: '#/changelog' }, '本版紀錄'), '。'),
      h('p', {}, '程式碼以 MIT 授權公開在 ', h('a', { href: 'https://github.com/hikari5014/Labor-Pixie', target: '_blank', rel: 'noopener' }, 'GitHub'), '；發現錯誤歡迎在 GitHub 回報。法規條文屬政府公開資料。')),
  );
}
