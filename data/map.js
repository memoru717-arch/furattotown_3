// ============================================
// ふらっとタウン - マップデータ
// ============================================
// 街のマップデータ（8x8）
const townMap = [
    ['tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'road', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree'],
    ['tree', 'sale', 'sale', 'tree', 'yakuba', 'tree', 'sale', 'sale', 'road', 'sale', 'sale', 'sale', 'tree', 'onsen', 'temple', 'tree'],
    ['tree', 'sale', 'sale', 'company', 'road', 'bank', 'sale', 'sale', 'road', 'sale', 'chintai', 'sale', 'tree', 'road', 'tree', 'tree'],
    ['road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road'],
    ['tree', 'sale', 'sale', 'chintai', 'road', 'sale', 'sale', 'tree', 'road', 'hudosan', 'gym', 'work', 'tree', 'road', 'sale', 'tree'],
    ['tree', 'sale', 'sale', 'sale', 'road', 'sale', 'sale', 'shop2', 'road', 'sale', 'sale', 'sale', 'sale', 'road', 'sale', 'tree'],
    ['tree', 'sale', 'sale', 'tree', 'road', 'tree', 'sale', 'sale', 'road', 'sale', 'sale', 'sale', 'sale', 'road', 'sale', 'tree'],
    ['tree', 'sale', 'tree', 'board', 'road', 'school', 'tree', 'sale', 'road', 'sale', 'tree', 'arcade', 'sale', 'road', 'sale', 'tree'],
    ['road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road'],
    ['tree', 'sale', 'sale', 'sale', 'road', 'sale', 'sale', 'sale', 'road', 'tree', 'shokudo', 'sale', 'sale', 'road', 'sale', 'tree'],
    ['tree', 'sale', 'sale', 'tree', 'hospital', 'tree', 'sale', 'sale', 'road', 'chintai', 'sale', 'sale', 'tree', 'road', 'tree', 'tree'],
    ['tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'road', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree']
];

// マップタイル（視覚表示用）
const mapTiles = [
    ['K', 'K', 'K', 'K', 'K', 'K', 'K', 'K', 'H', 'K', 'K', 'K', 'K', 'K', 'K', 'K'],
    ['K', 'S', 'S', 'L', 'public/yakuba', 'L', 'S', 'S', 'T', 'S', 'S', 'S', 'K', 'public/onsen', 'public/jinja', 'K'],
    ['K', 'S', 'S', 'public/bill', 'T', 'public/ginkou', 'S', 'S', 'T', 'S', 'public/kouji', 'S', 'K', 'T', 'K', 'K'],
    ['H', 'Y', 'Y', 'Y', '+', 'Y', 'Y', 'Y', '+', 'Y', 'Y', 'Y', 'Y', '+', 'Y', 'H'],
    ['K', 'S', 'S', 'public/kouji', 'T', 'S', 'S', 'L', 'T', 'public/hudosan', 'public/gym', 'public/work', 'L', 'T', 'S', 'K'],
    ['K', 'S', 'S', 'S', 'T', 'S', 'S', 'public/store', 'T', 'S', 'S', 'S', 'S', 'T', 'S', 'K'],
    ['K', 'S', 'S', 'L', 'T', 'L', 'S', 'S', 'T', 'S', 'S', 'S', 'S', 'T', 'S', 'K'],
    ['K', 'S', 'L', 'public/keiziban', 'T', 'public/school', 'L', 'S', 'T', 'S', 'L', 'public/game', 'public/card', 'T', 'S', 'K'],
    ['H', 'Y', 'Y', 'Y', '+', 'Y', 'Y', 'Y', '+', 'Y', 'Y', 'Y', 'Y', '+', 'Y', 'H'],
    ['K', 'S', 'S', 'S', 'T', 'S', 'S', 'S', 'T', 'L', 'public/syokudo', 'S', 'S', 'T', 'S', 'K'],
    ['K', 'S', 'S', 'L', 'public/hospital', 'L', 'S', 'S', 'T', 'public/kouji', 'S', 'S', 'L', 'public/tonya', 'L', 'K'],
    ['K', 'K', 'K', 'K', 'K', 'K', 'K', 'K', 'H', 'K', 'K', 'K', 'K', 'K', 'K', 'K']
];

// 施設データ
const places = {
    yakuba: {
        name: '役場',
        emoji: '🏛️',
        mapDescription: '役場です。転入届やプロフィール登録ができます。',
        description: 'ようこそ ふらっとタウン役場へ！<br>ご希望の手続きをお選びください。',
        hideTitle: true,
        hideDescBackground: true,
        actions: [
            { name: 'プロフィール登録', description: '転入届・個人情報の登録', effect: () => openProfileRegistration() },
            { name: 'インフォメーション', description: '遊び方・よくある質問', effect: () => openInformation() },
            { name: 'ご意見・ご感想', description: 'ゲームへのフィードバック', effect: () => openFeedback() },
            { name: '最近のニュース', description: '住民情報・ランキング', effect: () => openNews() },
            { name: '緊急支援金', description: '生活に困ったときの支援', effect: () => applyEmergencySupport() }
        ]
    },
    company: {
        name: '会社',
        emoji: '🏢',
        description: '働いてお金を稼げます。',
        actions: []
    },
    shop: {
        name: '商店',
        emoji: '🏪',
        description: 'よろず屋さん。いろんなものが買えます。',
        actions: [
            { name: '買い物する', description: 'アイテムを購入', effect: () => openShop() },
            { name: '売却する', description: 'アイテムを売る', effect: () => openSellShop() }
        ]
    },
    shop2: {
        name: 'デパート',
        emoji: '🏬',
        mapDescription: 'デパートです。様々なアイテムが揃っています。',
        description: 'デパートへようこそ！',
        actions: []
    },
    gym: {
        name: 'ジム',
        emoji: '🏋️',
        mapDescription: 'トレーニングジム。身体系の能力値を上げることができます。',
        description: '今日も張り切って体を鍛えましょう！<br>トレーニングできる間隔は30分です。',
        actions: []
    },
    hospital: {
        name: '病院',
        emoji: '🏥',
        description: 'どんな病気も瞬く間に治しましょう。',
        actions: []
    },
    bank: {
        name: '銀行',
        emoji: '🏦',
        mapDescription: '銀行です。お金を預けたり引き出したりできます。',
        description: 'いらっしゃいませ。<br>ご希望のお取引をお選びください。',
        hideTitle: true,
        hideDescBackground: true,
        actions: [
            { name: 'お預入れ', description: '', effect: () => deposit() },
            { name: 'お引き出し', description: '', effect: () => withdraw() },
            { name: '入出金明細', description: '', effect: () => showBankHistory() },
            { name: 'お振り込み', description: '', effect: () => showTransfer() }
        ]
    },
    onsen: {
        name: '温泉施設',
        emoji: '♨️',
        description: '温泉です。入浴中は通常の10倍の早さでパワーが回復します。疲れた体を癒やしちゃいましょう。',
        actions: [
            { name: '通常風呂', description: '入浴料1500円', effect: () => normalBath() },
            { name: '広告風呂', description: '広告1分視聴で全回復！', effect: () => adBath() },
            { name: 'コンビニ', description: 'パワーの上限値を上げる商品', effect: () => openOnsenShop() }
        ]
    },
    temple: {
        name: '神社',
        emoji: '⛩️',
        description: '静かな神社。お参りすると良いことがあるかも？',
        actions: [
            { name: 'お参りする', description: '運気UP？ 100円', effect: () => pray() },
            { name: 'おみくじを引く', description: '運勢を占う、200円', effect: () => drawFortune() }
        ]
    },
    school: {
        name: '習い事スクール',
        emoji: '🏫',
        mapDescription: '習い事スクール。頭脳系の能力値を上げることができます。',
        description: '今日も頑張って勉強しましょう！<br>トレーニングできる間隔は30分です。',
        actions: []
    },
    arcade: {
        name: 'ゲーセン',
        emoji: '🕹️',
        description: 'ゲームセンター。遊んでストレス発散！',
        actions: []
    },
    board: {
        name: '掲示板',
        emoji: '📋',
        description: 'ようこそ街の掲示板へ！<br>見たい掲示板を選んでね。',
        hideTitle: true,
        hideDescBackground: true,
        actions: [
            { name: '自己紹介BBS', description: '', effect: () => openBoard('intro') },
            { name: 'ハッピ〜掲示板', description: '', effect: () => openBoard('happy') },
            { name: 'おすすめ情報BBS', description: '', effect: () => openBoard('recommend') },
            { name: 'ギモン解決！BBS', description: '', effect: () => openBoard('question') }
        ]
    },
    work: {
        name: '職業安定所',
        emoji: '💼',
        mapDescription: '職業安定所です。就職・転職する方はこちらへ！',
        description: 'お仕事を探せます。',
        isModal: true,
        actions: [
            { name: '求人を見る', description: '職業一覧を見る', effect: () => openHelloworkModal() }
        ]
    },
    shokudo: {
        name: '食堂',
        emoji: '🍽️',
        mapDescription: '食堂です。食事をして空腹を満たしましょう！',
        description: 'おなかが空いたらここへどうぞ！',
        actions: [
            { name: '食事する', description: 'メニューを見る', effect: () => openShokudo() }
        ]
    },
    road: {
        name: '道',
        emoji: '🛤️',
        description: '街の道です。',
        actions: []
    },
    sale: {
        name: '空き地',
        emoji: '🏗️',
        mapDescription: '家を建てることができる空き地です。不動産屋で購入できます。',
        description: '家を建てることができる空き地です。不動産屋で購入できます。',
        actions: []
    },
    myhouse: {
        name: 'マイホーム',
        emoji: '🏠',
        mapDescription: 'あなたのお家です！',
        description: 'あなたのお家です！',
        actions: []
    },
    kouji: {
        name: '工事中',
        emoji: '🚧',
        mapDescription: '現在準備中です',
        description: '現在準備中です',
        actions: []
    },
    chintai: {
        name: '賃貸アパート',
        emoji: '🏢',
        mapDescription: '賃貸アパートです。最大４人まで同居することができます。【現在準備中です】',
        description: '賃貸アパートです。最大４人まで同居することができます。【現在準備中です】',
        actions: []
    },
    hudosan: {
        name: '不動産屋',
        emoji: '🏠',
        mapDescription: '土地や賃貸物件の売買・賃貸を取り扱う不動産屋です。',
        description: '土地や賃貸物件の売買・賃貸を取り扱う不動産屋です。',
        actions: []
    },
    tonya: {
        name: '問屋',
        emoji: '🏭',
        mapDescription: '商品を仕入れられる問屋です。自分のお店で販売できます。',
        description: '商品を仕入れられる問屋です。自分のお店で販売できます。',
        actions: []
    },
    tree: {
        name: '木',
        emoji: '🌳',
        description: '',
        actions: []
    },
    border: {
        name: 'タウン出口',
        emoji: '🚦',
        mapDescription: '他のタウンへ移動できます。（現在準備中）',
        description: '他のタウンへ移動できます。（現在準備中）',
        actions: []
    }
};

