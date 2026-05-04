// ============================================
// ふらっとタウン - 職業データ
// ============================================

// 職業レベルシステム（salaryRate: 昇給率）
const jobLevels = [
    { level: 1,  expRequired: 0,    salaryRate: 1.00 },
    { level: 2,  expRequired: 50,   salaryRate: 1.03 },
    { level: 3,  expRequired: 120,  salaryRate: 1.06 },
    { level: 4,  expRequired: 210,  salaryRate: 1.09 },
    { level: 5,  expRequired: 330,  salaryRate: 1.12 },
    { level: 6,  expRequired: 480,  salaryRate: 1.17 },
    { level: 7,  expRequired: 660,  salaryRate: 1.22 },
    { level: 8,  expRequired: 880,  salaryRate: 1.27 },
    { level: 9,  expRequired: 1140, salaryRate: 1.32 },
    { level: 10, expRequired: 1450, salaryRate: 1.37 },
    { level: 11, expRequired: 1810, salaryRate: 1.45 },
    { level: 12, expRequired: 2230, salaryRate: 1.53 },
    { level: 13, expRequired: 2720, salaryRate: 1.61 },
    { level: 14, expRequired: 3290, salaryRate: 1.69 },
    { level: 15, expRequired: 3950, salaryRate: 1.80 }
];

// クラスアップ必要レベル（中級: Lv.10、上級: Lv.15）
const classUpLevels = { 2: 10, 3: 15 };

// クラス別ボーナス倍率（レベルアップ時のボーナス = 給料 × 倍率）
const classBonusRates = { 1: 10, 2: 25, 3: 40 };

// 指定クラスの職業データを取得するヘルパー関数
// tier: 1=初級, 2=中級(×3/×2/×1.3), 3=上級(×6/×3/×1.6)
function getJobTierData(job, tier) {
    const abilitiesMult = [1, 3, 6][tier - 1];
    const salaryMult    = [1, 2, 3][tier - 1];
    const consumeMult   = [1, 1.3, 1.6][tier - 1];
    const abilities = {};
    for (const [k, v] of Object.entries(job.abilities)) {
        abilities[k] = Math.min(Math.round(v * abilitiesMult), 9999);
    }
    return {
        name:         job.names[tier - 1],
        abilities,
        salary:       Math.round(job.salary * salaryMult),
        bodyConsume:  Math.round(job.bodyConsume * consumeMult),
        brainConsume: Math.round(job.brainConsume * consumeMult),
    };
}

// 現在のクラスを返す（1=初級, 2=中級, 3=上級）
// jobLevel: 現在の内部レベル
function getJobClass(jobLevel) {
    if (jobLevel >= classUpLevels[3]) return 3;
    if (jobLevel >= classUpLevels[2]) return 2;
    return 1;
}

// ============================================
// 病気データ（8種類）
// severity: 1=軽め, 2=中くらい, 3=重め
// ============================================
const diseasesData = [
    // 軽め（28,000円）
    { id: 'kaze', name: '風邪', severity: 1, cost: 28000,
      doctorMsg: 'ふむふむ。単なる風邪ですね。<br>注射を打てばすぐに治りますよ。<br>治療費に28,000円かかります。よろしいですね？' },
    { id: 'mushiba', name: '虫歯', severity: 1, cost: 28000,
      doctorMsg: 'ほう、虫歯ですか。<br>さてはあなた、食べすぎましたね？<br>治療費に28,000円かかります。よろしいですね？' },
    // 中くらい（40,000円）
    { id: 'kossetsu', name: '骨折', severity: 2, cost: 40000,
      doctorMsg: '骨折ですね。<br>専用のギプスがあればすぐに治りますよ。<br>治療費に40,000円かかります。よろしいですね？' },
    { id: 'ichouen', name: '胃腸炎', severity: 2, cost: 40000,
      doctorMsg: 'あちゃー、胃腸が荒れ放題！<br>まぁ胃腸薬を飲めば大した事ないですよ。<br>治療費に40,000円かかります。よろしいですね？' },
    { id: 'gikkurigoshi', name: 'ぎっくり腰', severity: 2, cost: 40000,
      doctorMsg: 'ぎっくり腰だなんて。<br>さてはあなた、働きすぎましたね？<br>治療費に40,000円かかります。よろしいですね？' },
    // 重め（80,000円）
    { id: 'haien', name: '肺炎', severity: 3, cost: 80000,
      doctorMsg: 'ふむ。肺炎ですね。<br>では点滴を打っておきましょう。<br>治療費に80,000円かかります。よろしいですね？<br>あ、マスクはしっかりしといてね。' },
    { id: 'kansenshou', name: '感染症', severity: 3, cost: 80000,
      doctorMsg: '感染症ですか。<br>仕方がないので抗生物質を出しておきましょう。<br>治療費に80,000円かかります。よろしいですね？' },
    { id: 'utsubyou', name: 'うつ病', severity: 3, cost: 80000,
      doctorMsg: 'ここは精神病院ではないですが…<br>この魔法のような薬を飲めばたちまち良くなるでしょう。<br>治療費に80,000円かかります。よろしいですね？' }
];

// ============================================
// 職業データ（50カテゴリ × 3クラス制）
// ============================================
// ⚠️ id はセーブデータ互換性のため旧職業名のまま変更不可。
//    現在の職業名は names[0] を参照すること（id と names は対応していない）。
// names: [初級名, 中級名, 上級名]
// abilities: 初級の必要能力値（中級は×3、上級は×6 を getJobTierData() で自動計算）
// conditions: 初級での就職時に判定する条件（全クラス共通）
// salary: 初級の基本給（中級は×2、上級は×3）
// bodyConsume/brainConsume: 初級の消費パワー（中級は×1.3、上級は×1.6）
// ※ bonus フィールドは廃止。classBonusRates で一元管理。
const jobsData = [

    // ===== グループ1（旧Lv.1）=====
    {
        id: 'hibarai',
        names: ['アルバイト', 'バイトリーダー', 'ほぼ店長'],
        abilities: { 国語: 0, 数学: 0, 理科: 0, 社会: 0, 英語: 0, 音楽: 0, 美術: 0, 体力: 0, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [15, 99], gender: null },
        salary: 1500,
        bodyConsume: 15,
        brainConsume: 15
    },
    {
        id: 'conveni',
        names: ['猫カフェ店員', '猫カフェ店長', '伝説の猫マスター'],
        abilities: { 国語: 0, 数学: 0, 理科: 0, 社会: 30, 英語: 0, 音楽: 0, 美術: 0, 体力: 0, 気力: 0, ルックス: 30, 素早さ: 0, 面白さ: 0, 優しさ: 30, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 2400,
        bodyConsume: 20,
        brainConsume: 15
    },
    {
        id: 'seisou',
        names: ['地下アイドル', '売れっ子アイドル', 'トップアイドル'],
        abilities: { 国語: 0, 数学: 0, 理科: 0, 社会: 0, 英語: 0, 音楽: 40, 美術: 0, 体力: 30, 気力: 0, ルックス: 40, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 28], gender: '女性' },
        salary: 3300,
        bodyConsume: 30,
        brainConsume: 15
    },
    {
        id: 'babysitter',
        names: ['VTuber', '人気VTuber', 'トップVTuber'],
        abilities: { 国語: 0, 数学: 0, 理科: 0, 社会: 0, 英語: 40, 音楽: 0, 美術: 50, 体力: 0, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 45, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 4200,
        bodyConsume: 15,
        brainConsume: 30
    },
    {
        id: 'kaseifu',
        names: ['お笑い芸人', '実力派芸人', '大御所芸人'],
        abilities: { 国語: 50, 数学: 0, 理科: 0, 社会: 0, 英語: 0, 音楽: 0, 美術: 0, 体力: 50, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 55, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 5100,
        bodyConsume: 30,
        brainConsume: 20
    },
    {
        id: 'trimmer',
        names: ['ゲーム実況者', '人気実況者', 'カリスマ実況者'],
        abilities: { 国語: 0, 数学: 65, 理科: 0, 社会: 0, 英語: 55, 音楽: 0, 美術: 0, 体力: 0, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 70, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 6000,
        bodyConsume: 15,
        brainConsume: 30
    },
    {
        id: 'hoikushi',
        names: ['小説家', '新人賞作家', '巨匠'],
        abilities: { 国語: 100, 数学: 0, 理科: 0, 社会: 65, 英語: 0, 音楽: 0, 美術: 75, 体力: 0, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 7200,
        bodyConsume: 15,
        brainConsume: 35
    },
    {
        id: 'kaigoshi',
        names: ['占い師', '人気占い師', '伝説の預言者'],
        abilities: { 国語: 60, 数学: 0, 理科: 65, 社会: 75, 英語: 0, 音楽: 0, 美術: 0, 体力: 0, 気力: 70, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 8400,
        bodyConsume: 15,
        brainConsume: 35
    },
    {
        id: 'souryo',
        names: ['声優', '売れっ子声優', '大御所声優'],
        abilities: { 国語: 90, 数学: 0, 理科: 0, 社会: 0, 英語: 65, 音楽: 80, 美術: 0, 体力: 0, 気力: 75, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 9900,
        bodyConsume: 20,
        brainConsume: 35
    },
    {
        id: 'uranaishi',
        names: ['探偵', '凄腕探偵', '名探偵'],
        abilities: { 国語: 0, 数学: 70, 理科: 75, 社会: 80, 英語: 0, 音楽: 0, 美術: 0, 体力: 0, 気力: 50, ルックス: 0, 素早さ: 65, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 35], gender: null },
        salary: 11400,
        bodyConsume: 30,
        brainConsume: 30
    },

    // ===== グループ2（旧Lv.2）=====
    {
        id: 'biyoushi',
        names: ['ミュージシャン', '人気ミュージシャン', 'ロックスター'],
        abilities: { 国語: 60, 数学: 0, 理科: 0, 社会: 0, 英語: 65, 音楽: 95, 美術: 0, 体力: 0, 気力: 80, ルックス: 75, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 13500,
        bodyConsume: 30,
        brainConsume: 30
    },
    {
        id: 'nailist',
        names: ['清掃作業員', 'ベテラン清掃員', 'クリーン・マスター'],
        abilities: { 国語: 0, 数学: 0, 理科: 0, 社会: 95, 英語: 0, 音楽: 0, 美術: 0, 体力: 115, 気力: 0, ルックス: 0, 素早さ: 105, 面白さ: 0, 優しさ: 95, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 15000,
        bodyConsume: 45,
        brainConsume: 15
    },
    {
        id: 'esthe',
        names: ['イラストレーター', '売れっ子絵師', '神絵師'],
        abilities: { 国語: 110, 数学: 100, 理科: 0, 社会: 0, 英語: 100, 音楽: 0, 美術: 135, 体力: 0, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 16500,
        bodyConsume: 15,
        brainConsume: 45
    },
    {
        id: 'hisho',
        names: ['農家', 'こだわり農家', '豊作の神'],
        abilities: { 国語: 0, 数学: 0, 理科: 120, 社会: 0, 英語: 0, 音楽: 0, 美術: 0, 体力: 130, 気力: 120, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 110, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 18000,
        bodyConsume: 50,
        brainConsume: 15
    },
    {
        id: 'seitaishi',
        names: ['漁師', '熟練漁師', '海の覇者'],
        abilities: { 国語: 0, 数学: 0, 理科: 125, 社会: 0, 英語: 0, 音楽: 0, 美術: 0, 体力: 140, 気力: 130, ルックス: 0, 素早さ: 120, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 35], gender: null },
        salary: 19500,
        bodyConsume: 50,
        brainConsume: 20
    },
    {
        id: 'takuhaibin',
        names: ['モデル俳優', '主演俳優', 'ハリウッドスター'],
        abilities: { 国語: 115, 数学: 0, 理科: 0, 社会: 0, 英語: 0, 音楽: 0, 美術: 110, 体力: 100, 気力: 0, ルックス: 130, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 95 },
        conditions: { bmi: [17, 25], gender: null },
        salary: 21000,
        bodyConsume: 40,
        brainConsume: 25
    },
    {
        id: 'gaichukujo',
        names: ['介護士', 'ベテラン介護士', 'ケア・マイスター'],
        abilities: { 国語: 0, 数学: 0, 理科: 0, 社会: 145, 英語: 0, 音楽: 0, 美術: 0, 体力: 150, 気力: 135, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 155, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 22500,
        bodyConsume: 45,
        brainConsume: 25
    },
    {
        id: 'animator',
        names: ['動画編集者', '人気クリエイター', 'バズらせ動画師'],
        abilities: { 国語: 0, 数学: 140, 理科: 0, 社会: 0, 英語: 100, 音楽: 120, 美術: 150, 体力: 0, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 110, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 23400,
        bodyConsume: 15,
        brainConsume: 45
    },
    {
        id: 'busguide',
        names: ['ネイリスト', '予約待ちネイリスト', '指先の芸術家'],
        abilities: { 国語: 0, 数学: 0, 理科: 0, 社会: 155, 英語: 0, 音楽: 0, 美術: 175, 体力: 0, 気力: 0, ルックス: 170, 素早さ: 0, 面白さ: 0, 優しさ: 160, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 24900,
        bodyConsume: 20,
        brainConsume: 35
    },
    {
        id: 'tozankenka',
        names: ['ヨガ講師', '認定ヨガ講師', 'ヨガマスター'],
        abilities: { 国語: 0, 数学: 0, 理科: 0, 社会: 0, 英語: 0, 音楽: 0, 美術: 0, 体力: 160, 気力: 150, ルックス: 140, 素早さ: 0, 面白さ: 0, 優しさ: 125, エロさ: 115 },
        conditions: { bmi: [17, 27], gender: null },
        salary: 26400,
        bodyConsume: 45,
        brainConsume: 20
    },

    // ===== グループ3（旧Lv.3）=====
    {
        id: 'keisatsukan',
        names: ['ウェディングプランナー', '有名プランナー', '愛の導き手'],
        abilities: { 国語: 150, 数学: 0, 理科: 0, 社会: 160, 英語: 0, 音楽: 120, 美術: 155, 体力: 0, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 140, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 25500,
        bodyConsume: 25,
        brainConsume: 45
    },
    {
        id: 'jieitai',
        names: ['トリマー', '中堅トリマー', 'もふもふ職人'],
        abilities: { 国語: 0, 数学: 0, 理科: 185, 社会: 0, 英語: 0, 音楽: 0, 美術: 200, 体力: 180, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 195, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 27000,
        bodyConsume: 35,
        brainConsume: 35
    },
    {
        id: 'daiku',
        names: ['宅配便ドライバー', 'エースドライバー', '物流マスター'],
        abilities: { 国語: 0, 数学: 0, 理科: 0, 社会: 195, 英語: 0, 音楽: 0, 美術: 0, 体力: 215, 気力: 0, ルックス: 0, 素早さ: 200, 面白さ: 0, 優しさ: 185, エロさ: 0 },
        conditions: { bmi: [17, 35], gender: null },
        salary: 28500,
        bodyConsume: 55,
        brainConsume: 20
    },
    {
        id: 'seibishi',
        names: ['ハンター', '凄腕ハンター', '百獣の王'],
        abilities: { 国語: 0, 数学: 0, 理科: 205, 社会: 0, 英語: 0, 音楽: 0, 美術: 0, 体力: 220, 気力: 210, ルックス: 0, 素早さ: 195, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 35], gender: null },
        salary: 30000,
        bodyConsume: 55,
        brainConsume: 25
    },
    {
        id: 'patissier',
        names: ['引越し業者', 'ベテラン引越し業者', '運び屋の達人'],
        abilities: { 国語: 0, 数学: 0, 理科: 0, 社会: 175, 英語: 0, 音楽: 0, 美術: 0, 体力: 210, 気力: 0, ルックス: 0, 素早さ: 195, 面白さ: 155, 優しさ: 130, エロさ: 0 },
        conditions: { bmi: [18, 35], gender: null },
        salary: 32400,
        bodyConsume: 60,
        brainConsume: 15
    },
    {
        id: 'ryoushi',
        names: ['パティシエ', '注目のパティシエ', 'グランパティシエ'],
        abilities: { 国語: 180, 数学: 165, 理科: 195, 社会: 0, 英語: 0, 音楽: 0, 美術: 210, 体力: 0, 気力: 150, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 34500,
        bodyConsume: 35,
        brainConsume: 45
    },
    {
        id: 'keiri',
        names: ['保育士', 'ベテラン保育士', '園長'],
        abilities: { 国語: 0, 数学: 0, 理科: 0, 社会: 200, 英語: 0, 音楽: 175, 美術: 0, 体力: 190, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 155, 優しさ: 215, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 36000,
        bodyConsume: 40,
        brainConsume: 40
    },
    {
        id: 'eigyoman',
        names: ['大工', '腕利き大工', '棟梁'],
        abilities: { 国語: 0, 数学: 210, 理科: 165, 社会: 0, 英語: 0, 音楽: 0, 美術: 195, 体力: 220, 気力: 180, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [18, 35], gender: null },
        salary: 38400,
        bodyConsume: 60,
        brainConsume: 20
    },
    {
        id: 'rinsho',
        names: ['整体師', '人気整体師', 'ゴッドハンド'],
        abilities: { 国語: 0, 数学: 0, 理科: 225, 社会: 190, 英語: 0, 音楽: 0, 美術: 0, 体力: 200, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 215, エロさ: 170 },
        conditions: { bmi: [17, 30], gender: null },
        salary: 40500,
        bodyConsume: 40,
        brainConsume: 40
    },
    {
        id: 'mangaka',
        names: ['美容師', 'カリスマ美容師', 'トップスタイリスト'],
        abilities: { 国語: 195, 数学: 0, 理科: 0, 社会: 210, 英語: 0, 音楽: 0, 美術: 240, 体力: 0, 気力: 0, ルックス: 225, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 165 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 43500,
        bodyConsume: 35,
        brainConsume: 40
    },

    // ===== グループ4（旧Lv.4）=====
    {
        id: 'kangoshi',
        names: ['エステティシャン', '認定エステティシャン', '肌の魔法使い'],
        abilities: { 国語: 0, 数学: 0, 理科: 205, 社会: 0, 英語: 0, 音楽: 0, 美術: 235, 体力: 0, 気力: 0, ルックス: 225, 素早さ: 0, 面白さ: 0, 優しさ: 215, エロさ: 190 },
        conditions: { bmi: [17, 28], gender: null },
        salary: 44400,
        bodyConsume: 35,
        brainConsume: 50
    },
    {
        id: 'programmer',
        names: ['ドローン操縦士', '二等ドローン操縦士', '空の支配人'],
        abilities: { 国語: 0, 数学: 250, 理科: 230, 社会: 0, 英語: 165, 音楽: 0, 美術: 185, 体力: 0, 気力: 0, ルックス: 0, 素早さ: 200, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 46500,
        bodyConsume: 20,
        brainConsume: 55
    },
    {
        id: 'illustrator',
        names: ['管理栄養士', 'ベテラン栄養士', 'フードスペシャリスト'],
        abilities: { 国語: 220, 数学: 190, 理科: 250, 社会: 235, 英語: 0, 音楽: 0, 美術: 0, 体力: 0, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 205, エロさ: 0 },
        conditions: { bmi: [17, 30], gender: null },
        salary: 49500,
        bodyConsume: 20,
        brainConsume: 60
    },
    {
        id: 'eizou',
        names: ['心理カウンセラー', '臨床心理士', '精神の救世主'],
        abilities: { 国語: 260, 数学: 0, 理科: 205, 社会: 245, 英語: 0, 音楽: 0, 美術: 0, 体力: 0, 気力: 230, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 220, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 53400,
        bodyConsume: 15,
        brainConsume: 65
    },
    {
        id: 'seiyu',
        names: ['僧侶', '高僧', '生き仏'],
        abilities: { 国語: 260, 数学: 0, 理科: 0, 社会: 240, 英語: 0, 音楽: 210, 美術: 0, 体力: 0, 気力: 280, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 220, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: '男性' },
        salary: 55500,
        bodyConsume: 40,
        brainConsume: 45
    },
    {
        id: 'shogakkou',
        names: ['シェフ', '料理長', '三ツ星シェフ'],
        abilities: { 国語: 225, 数学: 0, 理科: 255, 社会: 0, 英語: 0, 音楽: 0, 美術: 270, 体力: 240, 気力: 210, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 58500,
        bodyConsume: 50,
        brainConsume: 40
    },
    {
        id: 'yakuzaishi',
        names: ['eスポーツ選手', 'プロeスポーツ選手', 'ネトゲ廃人'],
        abilities: { 国語: 0, 数学: 280, 理科: 0, 社会: 0, 英語: 235, 音楽: 0, 美術: 0, 体力: 0, 気力: 255, ルックス: 0, 素早さ: 270, 面白さ: 210, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 62400,
        bodyConsume: 25,
        brainConsume: 60
    },
    {
        id: 'sommelier',
        names: ['自衛隊', '精鋭隊員', '特殊作戦隊員'],
        abilities: { 国語: 0, 数学: 0, 理科: 230, 社会: 240, 英語: 0, 音楽: 0, 美術: 0, 体力: 285, 気力: 270, ルックス: 0, 素早さ: 255, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [18, 30], gender: null },
        salary: 65400,
        bodyConsume: 65,
        brainConsume: 25
    },
    {
        id: 'aidev',
        names: ['地方公務員', '主任公務員', '部長'],
        abilities: { 国語: 275, 数学: 260, 理科: 0, 社会: 290, 英語: 250, 音楽: 0, 美術: 0, 体力: 0, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 235, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 69000,
        bodyConsume: 20,
        brainConsume: 60
    },
    {
        id: 'esports',
        names: ['アナウンサー', '実力派アナウンサー', '名物キャスター'],
        abilities: { 国語: 310, 数学: 0, 理科: 0, 社会: 280, 英語: 265, 音楽: 250, 美術: 0, 体力: 0, 気力: 0, ルックス: 295, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 27], gender: null },
        salary: 73500,
        bodyConsume: 25,
        brainConsume: 60
    },

    // ===== グループ5（旧Lv.5）=====
    {
        id: 'isha',
        names: ['看護師', '看護師長', 'お局様'],
        abilities: { 国語: 0, 数学: 0, 理科: 300, 社会: 260, 英語: 0, 音楽: 0, 美術: 0, 体力: 275, 気力: 255, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 285, エロさ: 0 },
        conditions: { bmi: [17, 30], gender: null },
        salary: 67500,
        bodyConsume: 50,
        brainConsume: 55
    },
    {
        id: 'bengoshi',
        names: ['消防士', '消防隊長', 'ハイパーレスキュー'],
        abilities: { 国語: 0, 数学: 0, 理科: 265, 社会: 260, 英語: 0, 音楽: 0, 美術: 0, 体力: 310, 気力: 295, ルックス: 0, 素早さ: 280, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [18, 30], gender: null },
        salary: 72000,
        bodyConsume: 70,
        brainConsume: 35
    },
    {
        id: 'pilot',
        names: ['警察官', '敏腕刑事', '警視総監'],
        abilities: { 国語: 275, 数学: 0, 理科: 0, 社会: 310, 英語: 0, 音楽: 0, 美術: 0, 体力: 300, 気力: 285, ルックス: 0, 素早さ: 275, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [18, 28], gender: null },
        salary: 76500,
        bodyConsume: 55,
        brainConsume: 50
    },
    {
        id: 'idol',
        names: ['大学教授', '名誉教授', 'ノーベル賞の常連'],
        abilities: { 国語: 330, 数学: 285, 理科: 300, 社会: 270, 英語: 315, 音楽: 0, 美術: 0, 体力: 0, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 82500,
        bodyConsume: 20,
        brainConsume: 70
    },
    {
        id: 'vtuber',
        names: ['プロンプトエンジニア', '凄腕エンジニア', '電脳世界の王'],
        abilities: { 国語: 320, 数学: 305, 理科: 295, 社会: 0, 英語: 330, 音楽: 0, 美術: 0, 体力: 0, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 285, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 88500,
        bodyConsume: 15,
        brainConsume: 70
    },
    {
        id: 'owarai',
        names: ['宇宙飛行士', 'ミッションスペシャリスト', '船長'],
        abilities: { 国語: 0, 数学: 295, 理科: 340, 社会: 0, 英語: 280, 音楽: 0, 美術: 0, 体力: 325, 気力: 310, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [18, 27], gender: null },
        salary: 93000,
        bodyConsume: 65,
        brainConsume: 55
    },
    {
        id: 'eigakantoku',
        names: ['弁護士', '敏腕弁護士', '無敗の論破王'],
        abilities: { 国語: 345, 数学: 295, 理科: 0, 社会: 335, 英語: 300, 音楽: 0, 美術: 0, 体力: 0, 気力: 315, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 99000,
        bodyConsume: 25,
        brainConsume: 70
    },
    {
        id: 'daigakukyoju',
        names: ['医者', '名医', 'ブラック・ジャック'],
        abilities: { 国語: 330, 数学: 295, 理科: 350, 社会: 0, 英語: 300, 音楽: 0, 美術: 0, 体力: 0, 気力: 0, ルックス: 0, 素早さ: 0, 面白さ: 0, 優しさ: 315, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 105000,
        bodyConsume: 45,
        brainConsume: 70
    },
    {
        id: 'hitotsuboshichef',
        names: ['政治家', '外局長官', '内閣総理大臣'],
        abilities: { 国語: 345, 数学: 0, 理科: 0, 社会: 365, 英語: 305, 音楽: 0, 美術: 0, 体力: 0, 気力: 325, ルックス: 310, 素早さ: 0, 面白さ: 0, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [17, 99], gender: null },
        salary: 112500,
        bodyConsume: 40,
        brainConsume: 65
    },
    {
        id: 'uchuhikoushi',
        names: ['野球選手', 'プロ野球選手', 'ユニコーン'],
        abilities: { 国語: 0, 数学: 0, 理科: 0, 社会: 0, 英語: 0, 音楽: 0, 美術: 0, 体力: 380, 気力: 345, ルックス: 325, 素早さ: 360, 面白さ: 300, 優しさ: 0, エロさ: 0 },
        conditions: { bmi: [19, 28], gender: '男性' },
        salary: 120000,
        bodyConsume: 70,
        brainConsume: 60
    }
];
