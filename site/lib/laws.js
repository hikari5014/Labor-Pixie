// 收錄的法規：法規代碼（pcode）→ data/laws/ 的檔名。要跟 scripts/fetch_laws.py 的 LAWS 一致（測試會檢查）。
export const LAW_IDS = {
  N0030001: 'labor-standards-act',
  N0030002: 'labor-standards-act-enforcement-rules',
  N0030006: 'leave-rules',
  N0030020: 'labor-pension-act',
  N0030028: 'minimum-wage-act',
  N0030014: 'gender-equality-in-employment-act',
  N0060001: 'occupational-safety-and-health-act',
  B0010064: 'labor-incident-act',
  N0050021: 'employment-insurance-act',
  N0090001: 'employment-service-act',
  N0090055: 'middle-aged-and-elderly-employment-act',
  D0020095: 'commemoration-days-and-holidays-act',
};

/** 「第 9-1 條」→「9-1」 */
export function articleKey(no) {
  return String(no).replace(/[第條\s]/g, '');
}

/**
 * 在多部法規裡找含有關鍵字的條文。空白分開的多個字要同時出現。
 * laws：法規資料陣列；回傳 [{ law, article }]，最多 limit 筆。
 */
export function searchArticles(laws, query, limit = 50) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits = [];
  for (const law of laws) {
    for (const article of law.articles) {
      if (article.type !== 'article') continue;
      const text = `${article.no} ${article.text}`;
      if (words.every((w) => text.includes(w) || law.name.includes(w))) {
        hits.push({ law, article });
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}
