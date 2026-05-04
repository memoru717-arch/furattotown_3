// ============================================
// ふらっとタウン - 不動産屋機能
// ============================================

// 現タウン設定（タウンごとに変更）
const TOWN_NAME = 'メインストリート';
const TOWN_LAND_PRICE = 10000000;

const formatManYen = (yen) => `${(yen / 10000).toLocaleString()}万円`;
function openHudosan() {
    const mc = document.querySelector('#hudosanModal .shop2-modal-content');
    mc.classList.add('hudosan-lobby-mode');
    document.getElementById('hudosanLobbyView').style.display = 'flex';
    document.getElementById('hudosanContentArea').style.display = 'none';
    document.getElementById('hudosanBackBtn').style.display = 'none';
    document.getElementById('hudosanModal').classList.add('active');

}

function closeHudosan() {
    document.querySelector('#hudosanModal .shop2-modal-content').classList.remove('hudosan-lobby-mode');
    document.getElementById('hudosanModal').classList.remove('active');
}

function backToHudosanLobby() {
    document.getElementById('hudosanBuyView').style.display = 'none';
    document.getElementById('hudosanContentArea').style.display = 'none';
    document.getElementById('hudosanLobbyView').style.display = 'flex';
    document.getElementById('hudosanBackBtn').style.display = 'none';
    requestAnimationFrame(() => {
        document.querySelector('#hudosanModal .shop2-modal-content').classList.add('hudosan-lobby-mode');
    });
}

function hudosanBack() {
    if (document.getElementById('hudosanBuyStep4').style.display !== 'none') {
        hudosanBackToStep3();
    } else if (document.getElementById('hudosanBuyStep3').style.display !== 'none') {
        hudosanBackToStep2();
    } else if (document.getElementById('hudosanBuyStep2').style.display !== 'none') {
        hudosanBackToStep1();
    } else {
        backToHudosanLobby();
    }
}

function openHudosanRent() {
    // TODO: 賃貸ビュー（未実装）
}

function openMyHomeSimulation() {
    // TODO: マイホーム体験（未実装）
}

const hudosanBuyState = {
    selectedRow: null,
    selectedCol: null,
    selectedCoord: null,
    selectedHouse: null,
    selectedRank: null,
    selectedContents: []
};

const hudosanRanks = [
    { id: 'compact', price: 1000000,  slots: 1, label: 'コンパクトプラン', shortLabel: 'コンパクト', color: '#4caf82' },
    { id: 'regular', price: 4000000,  slots: 2, label: 'レギュラープラン', shortLabel: 'レギュラー', color: '#eb6101' },
    { id: 'wide',    price: 8000000,  slots: 3, label: 'ワイドプラン',     shortLabel: 'ワイド',     color: '#3a8fc4' },
    { id: 'king',    price: 12000000, slots: 4, label: 'キングプラン',     shortLabel: 'キング',     color: '#8b5ca8' },
];

const hudosanContents = [
    { id: 'bulletin', name: '交流掲示板', icon: '', desc: '家主と訪問者が自由に書ける掲示板です。', img: 'public/hudosan/koryu.png' },
    { id: 'shop',     name: 'ショップ',   icon: '', desc: '仕入れた商品を販売できます。', img: 'public/hudosan/shop.png' },
    { id: 'url',      name: 'ウェブリンク', icon: '', desc: 'お好きなWebページを表示できます。', img: 'public/hudosan/web.png' },
    { id: 'diary',    name: '家主掲示板', icon: '', desc: '家主のみが書ける専用掲示板です。', img: 'public/hudosan/yanusi.png' },
];

function openHudosanBuy() {
    document.getElementById('hudosanLobbyView').style.display = 'none';
    document.getElementById('hudosanContentArea').style.display = '';
    document.getElementById('hudosanBuyView').style.display = 'flex';
    document.getElementById('hudosanBackBtn').style.display = '';
    hudosanBuyState.selectedRow = null;
    hudosanBuyState.selectedCol = null;
    hudosanBuyState.selectedCoord = null;
    hudosanBuyState.selectedHouse = null;
    hudosanBuyState.selectedRank = null;
    hudosanBuyState.selectedContents = [];

    document.getElementById('hudosanBuyStep1').style.display = 'flex';
    document.getElementById('hudosanBuyStep2').style.display = 'none';
    document.getElementById('hudosanBuyStep3').style.display = 'none';
    document.getElementById('hudosanBuyStep4').style.display = 'none';
    document.getElementById('hudosanCompleteView').style.display = 'none';
    document.getElementById('hudosanStep1NextBtn').disabled = true;
    document.getElementById('hudosanStep2NextBtn').disabled = true;
    const preview = document.getElementById('hudosanHousePreview');
    if (preview) preview.innerHTML = '<p class="hudosan-step2-placeholder">プレビュー画面</p>';

    const mc = document.querySelector('#hudosanModal .shop2-modal-content');
    requestAnimationFrame(() => {
        mc.classList.remove('hudosan-lobby-mode');
        let rendered = false;
        const handler = (e) => {
            if (e.propertyName !== 'width') return;
            rendered = true;
            mc.removeEventListener('transitionend', handler);
            renderHudosanMiniMap();
        };
        mc.addEventListener('transitionend', handler);
        // CSSトランジションが無効な環境でもマップを確実に描画する
        setTimeout(() => {
            if (rendered) return;
            mc.removeEventListener('transitionend', handler);
            renderHudosanMiniMap();
        }, 500);
    });
}

function fitHudosanMap() {
    const mapArea = document.querySelector('#hudosanBuyStep1 .hudosan-step1-map-area');
    const mapInfo = document.querySelector('#hudosanBuyStep1 .hudosan-step1-map-info');
    const wrap    = document.querySelector('#hudosanBuyStep1 .hudosan-mini-map-wrap');
    const table   = document.getElementById('hudosanMiniMapTable');
    if (!mapArea || !mapInfo || !wrap || !table) return;

    const BASE_W = 35 * 16; // 560px
    const BASE_H = 35 * 12; // 420px

    // mapAreaの実サイズを直接測定してfitスケールを決める
    const PADDING = 10;
    const availW = mapArea.clientWidth - PADDING * 2;
    const availH = mapArea.clientHeight - mapInfo.offsetHeight - PADDING * 2;
    if (availW <= 0 || availH <= 0) return;

    const scale = Math.min(availW / BASE_W, availH / BASE_H);
    wrap.style.width  = Math.round(BASE_W * scale + PADDING * 2) + 'px';
    wrap.style.height = Math.round(BASE_H * scale + PADDING * 2) + 'px';
    table.style.zoom  = scale;
}

function renderHudosanMiniMap() {
    const townNameEl = document.getElementById('hudosanMapTownName');
    if (townNameEl) townNameEl.textContent = TOWN_NAME;
    const landPriceEl = document.getElementById('hudosanMapLandPrice');
    if (landPriceEl) {
        landPriceEl.textContent = formatManYen(TOWN_LAND_PRICE);
    }

    const table = document.getElementById('hudosanMiniMapTable');
    let html = '';
    for (let y = 0; y < townMapBg.length; y++) {
        html += '<tr>';
        for (let x = 0; x < townMapBg[y].length; x++) {
            const bgName = townMapBg[y] ? townMapBg[y][x] : null;
            const iconName = townMapIcon[y] ? townMapIcon[y][x] : null;
            const isSale = iconName === 'sale';
            const cls = isSale ? ' class="sale-lot"' : '';
            const coord = `${String.fromCharCode(65 + y)}-${x + 1}`;
            const onClick  = isSale ? ` onclick="selectHudosanLot(${y},${x})"` : '';
            const onHover  = isSale ? ` onmouseenter="document.getElementById('hudosanMapCoordHint').textContent='${coord}'" onmouseleave="restoreCoordHint()"` : '';
            let inner = '<div class="tile-wrap">';
            if (bgName) inner += `<img src="mapimg/${bgName}.png" class="tile-bg" alt="">`;
            if (iconName) inner += `<img src="mapimg/${iconName}.png" class="tile-icon" alt="">`;
            inner += '</div>';
            html += `<td${cls}${onClick}${onHover}>${inner}</td>`;
        }
        html += '</tr>';
    }
    table.innerHTML = html;

    // レイアウト確定後にズーム調整
    requestAnimationFrame(() => requestAnimationFrame(fitHudosanMap));

    // ウィンドウリサイズでも追従（重複登録を防ぐ）
    window.removeEventListener('resize', fitHudosanMap);
    window.addEventListener('resize', fitHudosanMap);
}

function restoreCoordHint() {
    const hint = document.getElementById('hudosanMapCoordHint');
    if (hint) hint.textContent = hudosanBuyState.selectedCoord || '';
}

function selectHudosanLot(row, col) {
    const table = document.getElementById('hudosanMiniMapTable');
    table.querySelectorAll('.sale-lot.selected').forEach(td => td.classList.remove('selected'));
    table.querySelectorAll('tr')[row].querySelectorAll('td')[col].classList.add('selected');

    hudosanBuyState.selectedRow = row;
    hudosanBuyState.selectedCol = col;
    const rowLetter = String.fromCharCode(65 + row);
    const colNum = col + 1;
    hudosanBuyState.selectedCoord = `${rowLetter}-${colNum}`;

    document.getElementById('hudosanStep1NextBtn').disabled = false;
}

const hudosanHouses = [
    // ── 1階建ての家 ──
    { id: '1kai1', file: 'house/1kai1.png', name: '1階建て①', enName: '1F House I',    group: '1kai', groupName: '1階建ての家', price:  500000, bgColor: '#C4904A', stats: { space:1, style:1, calm:2 }, desc: 'こぢんまりとした小さな一軒家。はじめての家選びにぴったりのシンプルなかわいさ。' },
    { id: '1kai2', file: 'house/1kai2.png', name: '1階建て②', enName: '1F House II',   group: '1kai', groupName: '1階建ての家', price:  800000, bgColor: '#C4904A', stats: { space:1, style:2, calm:2 }, desc: 'すっきりとしたデザインの一階建て。使いやすい間取りで暮らしやすい。' },
    { id: '1kai3', file: 'house/1kai3.png', name: '1階建て③', enName: '1F House III',  group: '1kai', groupName: '1階建ての家', price: 1200000, bgColor: '#C4904A', stats: { space:1, style:2, calm:3 }, desc: '明るい雰囲気の一階建て。シンプルながらどこかほっとする温かみがある。' },
    { id: '1kai4', file: 'house/1kai4.png', name: '1階建て④', enName: '1F House IV',   group: '1kai', groupName: '1階建ての家', price: 1800000, bgColor: '#C4904A', stats: { space:2, style:2, calm:3 }, desc: 'ゆとりのある一階建て。広めのリビングで毎日をのびのびと過ごせる。' },
    { id: '1kai5', file: 'house/1kai5.png', name: '1階建て⑤', enName: '1F House V',    group: '1kai', groupName: '1階建ての家', price: 2500000, bgColor: '#C4904A', stats: { space:2, style:3, calm:3 }, desc: 'こだわりの外観が光る一階建て。リーズナブルに個性を出せるモデル。' },
    { id: '1kai6', file: 'house/1kai6.png', name: '1階建て⑥', enName: '1F House VI',   group: '1kai', groupName: '1階建ての家', price: 3500000, bgColor: '#C4904A', stats: { space:2, style:3, calm:4 }, desc: '見た目も間取りも洗練された一階建て。小さくても豊かな暮らしができる。' },

    // ── 2階建ての家 ──
    { id: '2kai1', file: 'house/2kai1.png', name: '2階建て①', enName: '2F House I',    group: '2kai', groupName: '2階建ての家', price:  4000000, bgColor: '#5C90C0', stats: { space:3, style:2, calm:3 }, desc: '2階建てデビューにちょうどいいスタンダードモデル。収納スペースも充実。' },
    { id: '2kai2', file: 'house/2kai2.png', name: '2階建て②', enName: '2F House II',   group: '2kai', groupName: '2階建ての家', price:  6000000, bgColor: '#5C90C0', stats: { space:3, style:3, calm:3 }, desc: '明るくて使いやすい2階建て。上下階で暮らしを切り替えられるのが魅力。' },
    { id: '2kai3', file: 'house/2kai3.png', name: '2階建て③', enName: '2F House III',  group: '2kai', groupName: '2階建ての家', price:  8000000, bgColor: '#5C90C0', stats: { space:4, style:3, calm:3 }, desc: 'ゆったりとした居住スペースが自慢の2階建て。くつろぎの空間が広がる。' },
    { id: '2kai4', file: 'house/2kai4.png', name: '2階建て④', enName: '2F House IV',   group: '2kai', groupName: '2階建ての家', price: 10000000, bgColor: '#5C90C0', stats: { space:4, style:3, calm:4 }, desc: 'こだわりの外観と広い間取りを両立した2階建て。毎日帰りたくなる住まい。' },
    { id: '2kai5', file: 'house/2kai5.png', name: '2階建て⑤', enName: '2F House V',    group: '2kai', groupName: '2階建ての家', price: 13000000, bgColor: '#5C90C0', stats: { space:4, style:4, calm:4 }, desc: 'デザイン性と実用性を兼ね備えた2階建て。家族みんなで暮らしたくなる。' },
    { id: '2kai6', file: 'house/2kai6.png', name: '2階建て⑥', enName: '2F House VI',   group: '2kai', groupName: '2階建ての家', price: 16000000, bgColor: '#5C90C0', stats: { space:5, style:4, calm:4 }, desc: '贅沢なスペースと洗練されたデザインの2階建て。憧れの住まいがここに。' },

    // ── ナチュラルな家 ──
    { id: 'natural1', file: 'house/natural1.png', name: 'ナチュラル①', enName: 'Natural Style I',   group: 'natural', groupName: 'ナチュラルな家', price:  1500000, bgColor: '#78A868', stats: { space:1, style:2, calm:3 }, desc: '木の温もりを感じるナチュラルスタイルの小さな家。心がほっとするデザイン。' },
    { id: 'natural2', file: 'house/natural2.png', name: 'ナチュラル②', enName: 'Natural Style II',  group: 'natural', groupName: 'ナチュラルな家', price:  3000000, bgColor: '#78A868', stats: { space:2, style:3, calm:4 }, desc: '自然素材を生かした穏やかな雰囲気の住まい。毎日の疲れが癒される。' },
    { id: 'natural3', file: 'house/natural3.png', name: 'ナチュラル③', enName: 'Natural Style III', group: 'natural', groupName: 'ナチュラルな家', price:  5000000, bgColor: '#78A868', stats: { space:2, style:3, calm:4 }, desc: '緑との調和が美しいナチュラルな一軒家。自然と寄り添って暮らせる。' },
    { id: 'natural4', file: 'house/natural4.png', name: 'ナチュラル④', enName: 'Natural Style IV',  group: 'natural', groupName: 'ナチュラルな家', price:  7000000, bgColor: '#78A868', stats: { space:3, style:4, calm:4 }, desc: '広々とした空間に柔らかな光が差し込む。ナチュラルスタイルの中核モデル。' },
    { id: 'natural5', file: 'house/natural5.png', name: 'ナチュラル⑤', enName: 'Natural Style V',   group: 'natural', groupName: 'ナチュラルな家', price: 10000000, bgColor: '#78A868', stats: { space:3, style:4, calm:5 }, desc: '大きな窓から緑が見える、穏やかで豊かな住まい。ゆったり過ごせる空間。' },
    { id: 'natural6', file: 'house/natural6.png', name: 'ナチュラル⑥', enName: 'Natural Style VI',  group: 'natural', groupName: 'ナチュラルな家', price: 14000000, bgColor: '#78A868', stats: { space:4, style:4, calm:5 }, desc: '大自然に抱かれるような、最高のナチュラルスタイル。心安らぐ理想の家。' },

    // ── スタイリッシュな家 ──
    { id: 'cool1', file: 'house/cool1.png', name: 'スタイリッシュ①', enName: 'Cool Style I',   group: 'cool', groupName: 'スタイリッシュな家', price:  2000000, bgColor: '#607888', stats: { space:1, style:3, calm:2 }, desc: 'シャープなラインが映えるコンパクトなスタイリッシュハウス。都会的な雰囲気。' },
    { id: 'cool2', file: 'house/cool2.png', name: 'スタイリッシュ②', enName: 'Cool Style II',  group: 'cool', groupName: 'スタイリッシュな家', price:  4000000, bgColor: '#607888', stats: { space:2, style:4, calm:2 }, desc: 'モダンデザインが光るスタイリッシュな住まい。センスを感じさせる外観。' },
    { id: 'cool3', file: 'house/cool3.png', name: 'スタイリッシュ③', enName: 'Cool Style III', group: 'cool', groupName: 'スタイリッシュな家', price:  6000000, bgColor: '#607888', stats: { space:2, style:4, calm:2 }, desc: '無駄を省いたクールなデザイン。シンプルさの中に高いこだわりが宿る。' },
    { id: 'cool4', file: 'house/cool4.png', name: 'スタイリッシュ④', enName: 'Cool Style IV',  group: 'cool', groupName: 'スタイリッシュな家', price:  9000000, bgColor: '#607888', stats: { space:3, style:5, calm:2 }, desc: '洗練されたフォルムと広い空間を誇るスタイリッシュハウス。存在感抜群。' },
    { id: 'cool5', file: 'house/cool5.png', name: 'スタイリッシュ⑤', enName: 'Cool Style V',   group: 'cool', groupName: 'スタイリッシュな家', price: 12000000, bgColor: '#607888', stats: { space:3, style:5, calm:3 }, desc: 'まるでホテルのような上質な空間。目を引く外観で街の人気者になれる。' },
    { id: 'cool6', file: 'house/cool6.png', name: 'スタイリッシュ⑥', enName: 'Cool Style VI',  group: 'cool', groupName: 'スタイリッシュな家', price: 16000000, bgColor: '#607888', stats: { space:4, style:5, calm:3 }, desc: 'スタイリッシュの頂点に立つ最高峰モデル。圧倒的な存在感と美しさ。' },

    // ── かわいい家 ──
    { id: 'cute1', file: 'house/cute1.png', name: 'キュート①', enName: 'Cute House I',   group: 'cute', groupName: 'かわいい家', price:  1500000, bgColor: '#D06090', stats: { space:1, style:3, calm:2 }, desc: '見ているだけで笑顔になれる小さなかわいい家。はじめての家に迷ったらこれ！' },
    { id: 'cute2', file: 'house/cute2.png', name: 'キュート②', enName: 'Cute House II',  group: 'cute', groupName: 'かわいい家', price:  3000000, bgColor: '#D06090', stats: { space:2, style:4, calm:2 }, desc: 'ふんわりかわいいデザインが目を引く住まい。お気に入りの場所ができる。' },
    { id: 'cute3', file: 'house/cute3.png', name: 'キュート③', enName: 'Cute House III', group: 'cute', groupName: 'かわいい家', price:  5000000, bgColor: '#D06090', stats: { space:2, style:4, calm:3 }, desc: '色彩豊かでポップなかわいい家。通りを歩く人がつい振り返るかわいさ。' },
    { id: 'cute4', file: 'house/cute4.png', name: 'キュート④', enName: 'Cute House IV',  group: 'cute', groupName: 'かわいい家', price:  7000000, bgColor: '#D06090', stats: { space:3, style:4, calm:3 }, desc: '広々とした空間にかわいさが詰まった一軒家。毎日ウキウキして過ごせる。' },
    { id: 'cute5', file: 'house/cute5.png', name: 'キュート⑤', enName: 'Cute House V',   group: 'cute', groupName: 'かわいい家', price: 10000000, bgColor: '#D06090', stats: { space:3, style:5, calm:3 }, desc: 'かわいさと快適さを高いレベルで両立。お家時間がもっと好きになる住まい。' },
    { id: 'cute6', file: 'house/cute6.png', name: 'キュート⑥', enName: 'Cute House VI',  group: 'cute', groupName: 'かわいい家', price: 13000000, bgColor: '#D06090', stats: { space:4, style:5, calm:3 }, desc: 'かわいい家の最高峰！圧倒的な存在感でみんなの注目を集めること間違いなし。' },

    // ── 北欧風の家 ──
    { id: 'hokuo1', file: 'house/hokuo1.png', name: '北欧スタイル①', enName: 'Nordic Style I',   group: 'hokuo', groupName: '北欧風の家', price:  4000000, bgColor: '#6890B8', stats: { space:2, style:4, calm:3 }, desc: 'シンプルで機能的な北欧スタイルの小ぶりな家。すっきりとした暮らしが始まる。' },
    { id: 'hokuo2', file: 'house/hokuo2.png', name: '北欧スタイル②', enName: 'Nordic Style II',  group: 'hokuo', groupName: '北欧風の家', price:  6000000, bgColor: '#6890B8', stats: { space:2, style:4, calm:4 }, desc: '白と木のコントラストが美しい北欧スタイル。上品でどこか懐かしい雰囲気。' },
    { id: 'hokuo3', file: 'house/hokuo3.png', name: '北欧スタイル③', enName: 'Nordic Style III', group: 'hokuo', groupName: '北欧風の家', price:  8000000, bgColor: '#6890B8', stats: { space:3, style:4, calm:4 }, desc: '北欧らしい穏やかな色合いと洗練されたデザイン。心地よい暮らしを演出する。' },
    { id: 'hokuo4', file: 'house/hokuo4.png', name: '北欧スタイル④', enName: 'Nordic Style IV',  group: 'hokuo', groupName: '北欧風の家', price: 11000000, bgColor: '#6890B8', stats: { space:3, style:5, calm:4 }, desc: '広々とした空間に北欧テイストが溢れる住まい。センスある暮らしを楽しめる。' },
    { id: 'hokuo5', file: 'house/hokuo5.png', name: '北欧スタイル⑤', enName: 'Nordic Style V',   group: 'hokuo', groupName: '北欧風の家', price: 14000000, bgColor: '#6890B8', stats: { space:4, style:5, calm:4 }, desc: 'ゆったりとした間取りに北欧の美学が宿る。丁寧な暮らしを大切にしたい人に。' },
    { id: 'hokuo6', file: 'house/hokuo6.png', name: '北欧スタイル⑥', enName: 'Nordic Style VI',  group: 'hokuo', groupName: '北欧風の家', price: 18000000, bgColor: '#6890B8', stats: { space:4, style:5, calm:5 }, desc: '北欧スタイルの集大成。洗練されたデザインと最高の居住性を兼ね備えた一軒家。' },

    // ── 和風の家 ──
    { id: 'japan1', file: 'house/japan1.png', name: '和風の家①', enName: 'Japanese Style I',   group: 'japan', groupName: '和風の家', price:  5000000, bgColor: '#807048', stats: { space:2, style:4, calm:4 }, desc: '日本の美しさを感じる、落ち着いた和風の住まい。穏やかな時間が流れる。' },
    { id: 'japan2', file: 'house/japan2.png', name: '和風の家②', enName: 'Japanese Style II',  group: 'japan', groupName: '和風の家', price:  8000000, bgColor: '#807048', stats: { space:3, style:4, calm:4 }, desc: '伝統的な和の美を取り入れた住まい。どこか懐かしく、心が安らぐ空間。' },
    { id: 'japan3', file: 'house/japan3.png', name: '和風の家③', enName: 'Japanese Style III', group: 'japan', groupName: '和風の家', price: 11000000, bgColor: '#807048', stats: { space:3, style:4, calm:5 }, desc: '和の素材にこだわった上品な一軒家。訪れた人も思わず感嘆する美しさ。' },
    { id: 'japan4', file: 'house/japan4.png', name: '和風の家④', enName: 'Japanese Style IV',  group: 'japan', groupName: '和風の家', price: 15000000, bgColor: '#807048', stats: { space:4, style:5, calm:5 }, desc: '広々とした和風建築。趣ある佇まいが、ここに暮らす誇りを感じさせる。' },
    { id: 'japan5', file: 'house/japan5.png', name: '和風の家⑤', enName: 'Japanese Style V',   group: 'japan', groupName: '和風の家', price: 18000000, bgColor: '#807048', stats: { space:4, style:5, calm:5 }, desc: '日本の職人技が光る、本格的な和風住宅。静かで深みのある暮らしを。' },
    { id: 'japan6', file: 'house/japan6.png', name: '和風の家⑥', enName: 'Japanese Style VI',  group: 'japan', groupName: '和風の家', price: 22000000, bgColor: '#807048', stats: { space:5, style:5, calm:5 }, desc: '和の美の最高峰。日本建築の粋を集めた、唯一無二の住まい。' },

    // ── 猫の家 ──
    { id: 'cat1', file: 'house/cat1.png', name: 'ネコのおうち①', enName: 'Cat House I',   group: 'cat', groupName: '猫の家', price:  2000000, bgColor: '#C89840', stats: { space:1, style:3, calm:3 }, desc: 'ネコのモチーフがかわいい、ユニークな小さな家。訪れる人を笑顔にする。' },
    { id: 'cat2', file: 'house/cat2.png', name: 'ネコのおうち②', enName: 'Cat House II',  group: 'cat', groupName: '猫の家', price:  4000000, bgColor: '#C89840', stats: { space:2, style:3, calm:3 }, desc: '猫好きのための夢の住まい！細部まで猫愛が詰まったかわいい家。' },
    { id: 'cat3', file: 'house/cat3.png', name: 'ネコのおうち③', enName: 'Cat House III', group: 'cat', groupName: '猫の家', price:  6000000, bgColor: '#C89840', stats: { space:2, style:4, calm:3 }, desc: 'にゃんとも個性的な外観のネコハウス。街の中でひときわ目立つ存在。' },
    { id: 'cat4', file: 'house/cat4.png', name: 'ネコのおうち④', enName: 'Cat House IV',  group: 'cat', groupName: '猫の家', price:  9000000, bgColor: '#C89840', stats: { space:3, style:4, calm:4 }, desc: '広さも個性もたっぷりのネコのおうち。住んでいるだけで楽しくなれる。' },
    { id: 'cat5', file: 'house/cat5.png', name: 'ネコのおうち⑤', enName: 'Cat House V',   group: 'cat', groupName: '猫の家', price: 12000000, bgColor: '#C89840', stats: { space:3, style:5, calm:4 }, desc: 'ネコのおうちの中でも特別なモデル。独特の世界観に包まれた夢の住まい。' },
    { id: 'cat6', file: 'house/cat6.png', name: 'ネコのおうち⑥', enName: 'Cat House VI',  group: 'cat', groupName: '猫の家', price: 15000000, bgColor: '#C89840', stats: { space:4, style:5, calm:4 }, desc: 'ネコ愛の結晶、最高峰のネコハウス！圧倒的なかわいさと個性が炸裂する。' },
];

function renderHudosanNeighborhoodPreview(houseId, tableId = 'hudosanNeighborhoodMap', wrapId = 'hudosanNeighborhoodWrap') {
    const table = document.getElementById(tableId);
    const wrap  = document.getElementById(wrapId);
    if (!table || !wrap) return;

    const row = hudosanBuyState.selectedRow;
    const col = hudosanBuyState.selectedCol;
    if (row === null || col === null) return;

    const RANGE = 4;
    const TILE  = 35;
    const GRID  = RANGE * 2 + 1; // 9×9

    let html = '';
    for (let dy = -RANGE; dy <= RANGE; dy++) {
        html += '<tr>';
        for (let dx = -RANGE; dx <= RANGE; dx++) {
            const r = row + dy;
            const c = col + dx;
            const isSelected = (dy === 0 && dx === 0);
            const inBounds = r >= 0 && r < townMapBg.length &&
                             c >= 0 && townMapBg[r] && c < townMapBg[r].length;

            const bgName = inBounds ? townMapBg[r][c] : null;
            let iconHtml = '';
            if (isSelected) {
                iconHtml = `<img src="house/${houseId}.png" class="tile-icon" alt="">`;
            } else if (inBounds && townMapIcon[r] && townMapIcon[r][c]) {
                iconHtml = `<img src="mapimg/${townMapIcon[r][c]}.png" class="tile-icon" alt="">`;
            }

            const cls = isSelected ? ' class="nb-selected"' : (!inBounds ? ' class="nb-oob"' : '');
            let inner = '<div class="tile-wrap">';
            if (bgName) inner += `<img src="mapimg/${bgName}.png" class="tile-bg" alt="">`;
            inner += iconHtml + '</div>';
            html += `<td${cls}>${inner}</td>`;
        }
        html += '</tr>';
    }
    table.innerHTML = html;

    requestAnimationFrame(() => {
        const BASE   = TILE * GRID;
        const availW = wrap.clientWidth;
        const scale  = availW > 0 ? availW / BASE : 1;
        table.style.zoom = scale;
        wrap.style.visibility = '';
    });
}

function hudosanGoStep2() {
    document.getElementById('hudosanBuyStep1').style.display = 'none';
    document.getElementById('hudosanBuyStep2').style.display = 'flex';
    renderHudosanHouseGrid();
}

function renderHudosanHouseGrid() {
    const grid = document.getElementById('hudosanHouseGrid');
    let html = '';
    let lastGroup = null;
    hudosanHouses.forEach(h => {
        if (h.group !== lastGroup) {
            html += `<div class="hudosan-house-group-heading">${h.groupName}</div>`;
            lastGroup = h.group;
        }
        html += `
        <div class="hudosan-house-card" id="houseCard-${h.id}" onclick="selectHudosanHouse('${h.id}')">
            <img src="${h.file}" alt="${h.name}">
        </div>`;
    });
    grid.innerHTML = html;
}

function hudosanStars(n) {
    return '<span style="opacity:1">★</span>'.repeat(n) + '<span style="opacity:0.2">★</span>'.repeat(5 - n);
}

function selectHudosanHouse(id) {
    document.querySelectorAll('.hudosan-house-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(`houseCard-${id}`).classList.add('selected');
    hudosanBuyState.selectedHouse = id;
    const house = hudosanHouses.find(h => h.id === id);
    if (!house) return;
    const priceStr = formatManYen(house.price);

    const container = document.getElementById('hudosanHousePreview');

    if (!container.querySelector('.hudosan-preview-card')) {
        container.innerHTML = `
            <div class="hudosan-preview-card">
                <div class="hudosan-preview-card-header">
                    <div class="hudosan-preview-header-left">
                        <div class="hudosan-step2-preview-name"></div>
                    </div>
                    <div class="hudosan-preview-header-right">
                        <div class="hudosan-preview-price-value"></div>
                    </div>
                </div>
                <div class="hudosan-preview-card-body">
                    <div class="hudosan-preview-card-top-row">
                        <div class="hudosan-preview-img-block">
                            <img class="hudosan-step2-preview-img" alt="">
                        </div>
                        <div class="hudosan-preview-right-col">
                            <div class="hudosan-preview-stats">
                                <div class="hudosan-preview-stat-item"><span class="hudosan-preview-stat-label">広さ</span><span class="stat-val-space"></span></div>
                                <div class="hudosan-preview-stat-item"><span class="hudosan-preview-stat-label">おしゃれ度</span><span class="stat-val-style"></span></div>
                                <div class="hudosan-preview-stat-item"><span class="hudosan-preview-stat-label">落ち着き度</span><span class="stat-val-calm"></span></div>
                            </div>
                            <div class="hudosan-step2-preview-desc"></div>
                        </div>
                    </div>
                    <div class="hudosan-preview-map-section">
                        <div class="hudosan-preview-map-wrap" id="hudosanNeighborhoodWrap">
                            <table class="hudosan-neighborhood-map" id="hudosanNeighborhoodMap"></table>
                            <div class="hudosan-map-overlay-label">建設イメージ</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    const card = container.querySelector('.hudosan-preview-card');
    card.querySelector('.hudosan-step2-preview-name').textContent          = house.name;
    const priceEl = card.querySelector('.hudosan-preview-price-value');
    priceEl.textContent    = priceStr;
    const img = card.querySelector('.hudosan-step2-preview-img');
    img.src = house.file;
    img.alt = house.name;
    card.querySelector('.hudosan-preview-stats').style.color = '#94784a';
    card.querySelector('.stat-val-space').innerHTML = hudosanStars(house.stats.space);
    card.querySelector('.stat-val-style').innerHTML = hudosanStars(house.stats.style);
    card.querySelector('.stat-val-calm').innerHTML  = hudosanStars(house.stats.calm);
    card.querySelector('.hudosan-step2-preview-desc').textContent = house.desc;

    document.getElementById('hudosanStep2NextBtn').disabled = false;

    const table = document.getElementById('hudosanNeighborhoodMap');
    const selectedIcon = table && table.querySelector('.nb-selected .tile-icon');
    if (selectedIcon) {
        selectedIcon.src = `house/${id}.png`;
    } else {
        const wrap = document.getElementById('hudosanNeighborhoodWrap');
        if (wrap) wrap.style.visibility = 'hidden';
        requestAnimationFrame(() => requestAnimationFrame(() => {
            renderHudosanNeighborhoodPreview(id);
        }));
    }
}

function hudosanBackToStep1() {
    document.getElementById('hudosanBuyStep2').style.display = 'none';
    document.getElementById('hudosanBuyStep1').style.display = 'flex';

    hudosanBuyState.selectedHouse = null;

    document.querySelectorAll('.hudosan-house-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('hudosanStep2NextBtn').disabled = true;

    const preview = document.getElementById('hudosanHousePreview');
    if (preview) preview.innerHTML = '';

}

function hudosanGoStep3() {
    document.getElementById('hudosanBuyStep2').style.display = 'none';
    document.getElementById('hudosanBuyStep3').style.display = 'flex';
    hudosanBuyState.selectedContents = [];
    document.getElementById('hudosanBuyStep3').classList.remove('rank-selected');
    document.getElementById('hudosanContentSelectTitle').textContent = 'プランを選んでください';
    document.getElementById('hudosanRankInfo').textContent = '';
    document.getElementById('hudosanContentCheckList').innerHTML = '';
    renderHudosanRankGrid();
}

function renderHudosanRankGrid() {
    const grid = document.getElementById('hudosanRankGrid');
    grid.innerHTML = hudosanRanks.map(rank => `
        <div class="hudosan-rank-btn" id="rankCard-${rank.id}" style="--rank-color:${rank.color}" onclick="selectHudosanRank('${rank.id}')">
            <div class="hudosan-rank-btn-name">${rank.shortLabel}</div>
        </div>`
    ).join('');
}

function renderHudosanContentSelect() {
    const rank = hudosanRanks.find(r => r.id === hudosanBuyState.selectedRank);
    const title = document.getElementById('hudosanContentSelectTitle');
    const list  = document.getElementById('hudosanContentCheckList');

    title.innerHTML = `設置するコンテンツを <span style="color:${rank.color};font-size:23px">${rank.slots}つ</span> 選んでください`;
    document.getElementById('hudosanRankInfo').textContent = '';
    document.getElementById('hudosanStep3RankPriceValue').textContent = formatManYen(rank.price);
    document.getElementById('hudosanStep3RankPriceValue').style.color = rank.color;
    document.getElementById('hudosanStep3RankPrice').style.display = '';

    list.innerHTML = hudosanContents.map(c => {
        const checked    = hudosanBuyState.selectedContents.includes(c.id);
        const maxReached = hudosanBuyState.selectedContents.length >= rank.slots;
        const disabled   = !checked && maxReached;
        return `
            <div class="hudosan-content-card${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}"
                 onclick="${disabled ? '' : `toggleHudosanContent('${c.id}')`}">
                <div class="hudosan-content-card-head">
                    <div class="hudosan-content-card-check"></div>
                    <div class="hudosan-content-card-name">${c.icon} ${c.name}</div>
                </div>
                <div class="hudosan-content-card-desc">${c.desc}</div>
                <div class="hudosan-content-card-preview">${c.img ? `<img src="${c.img}" alt="${c.name}" class="hudosan-content-card-img">` : ''}</div>
            </div>`;
    }).join('');
}

function toggleHudosanContent(id) {
    const rank = hudosanRanks.find(r => r.id === hudosanBuyState.selectedRank);
    const idx  = hudosanBuyState.selectedContents.indexOf(id);
    if (idx !== -1) {
        hudosanBuyState.selectedContents.splice(idx, 1);
    } else {
        if (hudosanBuyState.selectedContents.length >= rank.slots) return;
        hudosanBuyState.selectedContents.push(id);
    }
    renderHudosanContentSelect();
    updateHudosanStep3Btn();
}

function updateHudosanStep3Btn() {
    const rank  = hudosanRanks.find(r => r.id === hudosanBuyState.selectedRank);
    const ready = rank && hudosanBuyState.selectedContents.length === rank.slots;
    document.getElementById('hudosanStep3NextBtn').disabled = !ready;
}

function selectHudosanRank(id) {
    document.querySelectorAll('.hudosan-rank-btn').forEach(c => {
        c.classList.remove('selected');
    });
    const rank = hudosanRanks.find(r => r.id === id);
    const btn = document.getElementById(`rankCard-${id}`);
    btn.classList.add('selected');

    const step3 = document.getElementById('hudosanBuyStep3');
    step3.style.setProperty('--plan-color', rank.color);

    hudosanBuyState.selectedRank = id;
    hudosanBuyState.selectedContents = [];
    step3.classList.add('rank-selected');
    renderHudosanContentSelect();
    updateHudosanStep3Btn();
}

function hudosanBackToStep2() {
    document.getElementById('hudosanBuyStep3').style.display = 'none';
    document.getElementById('hudosanBuyStep2').style.display = 'flex';
}

function hudosanGoStep4() {
    document.getElementById('hudosanBuyStep3').style.display = 'none';
    const step4 = document.getElementById('hudosanBuyStep4');
    step4.style.display = 'flex';
    const rank = hudosanRanks.find(r => r.id === hudosanBuyState.selectedRank);
    if (rank) step4.style.setProperty('--plan-color', rank.color);

    const step4Wrap = document.getElementById('hudosanStep4MapWrap');
    if (step4Wrap) step4Wrap.style.visibility = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => {
        renderHudosanNeighborhoodPreview(hudosanBuyState.selectedHouse, 'hudosanStep4Map', 'hudosanStep4MapWrap');
    }));

    const house = hudosanHouses.find(h => h.id === hudosanBuyState.selectedHouse);
    if (!house || !rank) return;
    const total = TOWN_LAND_PRICE + house.price + rank.price;

    document.getElementById('hudosanConfirmCoord').textContent     = hudosanBuyState.selectedCoord;
    document.getElementById('hudosanConfirmHouseImg').src          = house.file;
    document.getElementById('hudosanConfirmHouseName').textContent = house.name;
    document.getElementById('hudosanConfirmRankName').innerHTML  = `プラン名：<span style="color:var(--plan-color, #444)">${rank.label.replace(/プラン$/, '')}</span>`;
    document.getElementById('hudosanConfirmContents').innerHTML =
        hudosanContents
            .map(c => {
                const selected = hudosanBuyState.selectedContents.includes(c.id);
                return `<span class="hudosan-content-badge${selected ? '' : ' hudosan-content-badge--off'}">${c.name}</span>`;
            })
            .join('');
    document.getElementById('hudosanCostLand').textContent  = `${TOWN_LAND_PRICE.toLocaleString()}円`;
    document.getElementById('hudosanCostHouse').textContent = `${house.price.toLocaleString()}円`;
    document.getElementById('hudosanCostRank').textContent  = `${rank.price.toLocaleString()}円`;
    document.getElementById('hudosanCostTotal').textContent = `${total.toLocaleString()}円`;
    document.getElementById('hudosanConfirmMoney').textContent = `${gameState.savings.toLocaleString()}円`;

    const alreadyOwned = !!(gameState.player.house && gameState.player.house.coord);
    const canAfford = gameState.savings >= total;
    document.getElementById('hudosanPurchaseBtn').disabled = alreadyOwned || !canAfford;
    document.getElementById('hudosanBuyInsufficient').style.display = (!alreadyOwned && !canAfford) ? '' : 'none';
    document.getElementById('hudosanBuyAlreadyOwned').style.display = alreadyOwned ? '' : 'none';
}

function hudosanBackToStep3() {
    document.getElementById('hudosanBuyStep4').style.display = 'none';
    document.getElementById('hudosanBuyStep3').style.display = 'flex';
}

function executeHudosanPurchase() {
    const house = hudosanHouses.find(h => h.id === hudosanBuyState.selectedHouse);
    const rank  = hudosanRanks.find(r => r.id === hudosanBuyState.selectedRank);
    if (!house || !rank) return;
    const total = TOWN_LAND_PRICE + house.price + rank.price;

    if (gameState.savings < total) return;

    gameState.savings -= total;
    addBankHistory('payment', total, '家の購入');
    updateStatus();

    const row = hudosanBuyState.selectedRow;
    const col = hudosanBuyState.selectedCol;
    setHouseOnMap(row, col, hudosanBuyState.selectedHouse);

    gameState.player.house = {
        coord:    hudosanBuyState.selectedCoord,
        row, col,
        houseId:  hudosanBuyState.selectedHouse,
        rank:     hudosanBuyState.selectedRank,
        contents: [...hudosanBuyState.selectedContents]
    };

    renderMap();

    document.getElementById('hudosanBuyStep4').style.display = 'none';


    document.getElementById('hudosanCompleteIcon').innerHTML = `<img src="${house.file}" alt="${house.name}">`;
    document.getElementById('hudosanCompleteCoord').textContent = `建設場所：${hudosanBuyState.selectedCoord}`;
    document.getElementById('hudosanCompleteView').style.display = 'flex';
}

