// ふらっとタウン - 問屋専用アイテム
const tonyaItems = [
    // 書籍（学習系レート：総獲得×150円/pt）
    { type: 'separator', name: '書籍' },
    { name: "エロ本", price: 1000, consumable: true, stats: { エロさ: 3 }, calorie: 0, useCount: 2, cooldown: "15分", bodyConsume: 10, brainConsume: 0 },

    // 楽器（専門品レート：総獲得×130~150円/pt）
    { type: 'separator', name: '楽器' },
];
