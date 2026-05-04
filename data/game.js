// ============================================
// ふらっとタウン - ゲームロジック
// ============================================

// 選択可能なアバター（Profile1〜40）
const avatarOptions = Array.from({length: 40}, (_, i) => `Profile/Profile${i + 1}.png`);

// お知らせ本文マスター（localStorageに依存しないよう定数で管理）
const NEWS_BODIES = {
    1: {
        title: 'ふらっとタウンへようこそ！',
        snippet: 'タウンの使い方や各施設の説明はこちらをご覧ください。',
        body: `
        <p>こんにちは！ふらっとタウンへようこそ！<br>ここはみんながふらっと立ち寄れる街です。</p>

        <h4>まずはお仕事をするのがおすすめ！</h4>
        <p><img src="mapimg/work.png" style="width:27px;height:27px;vertical-align:middle;position:relative;top:-3px;margin-right:6px;"><strong>ハローワーク（H-10）</strong>で就職すると、会社に通勤してお金が稼げるようになります。<br>最初はアルバイトからスタート！<br>
        <img src="status/status1.png" style="width:27px;height:27px;vertical-align:middle;position:relative;top:0px;margin-right:6px;">のアイコンをクリックすると、出勤することができます。</p>

        <h4>能力値を上げることもできます</h4>
        <p><img src="mapimg/gym.png" style="width:27px;height:27px;vertical-align:middle;position:relative;top:-3px;margin-right:6px;"><strong>ジム（F-7）</strong>や<img src="mapimg/school.png" style="width:27px;height:27px;vertical-align:middle;position:relative;top:-3px;margin-right:6px;"><strong>習い事スクール（F-6）</strong>に通うと、身体・頭脳の能力値がアップ！<br>能力値が上がると、もっと良いお仕事にも就けます。<br>
        <img src="mapimg/store.png" style="width:27px;height:27px;vertical-align:middle;position:relative;top:-3px;margin-right:6px;"><strong>ショッピングモール（H-6）</strong>でアイテムを購入するのもオススメ👍️</p>

        <h4>ごはんも大事！</h4>
        <p><img src="mapimg/syokudo.png" style="width:27px;height:27px;vertical-align:middle;position:relative;top:-3px;margin-right:6px;"><strong>食堂（H-9）</strong>でごはんを食べて、空腹度を回復しましょう🍚<br>お腹がすいていると体調を崩してしまうこともあるので、適度に食べていきましょう。</p>

        <h4>最後はセーブも忘れずに！</h4>
        <p>終わるときは、<img src="status/status6.png" style="width:27px;height:27px;vertical-align:middle;position:relative;top:0px;margin-right:6px;">のアイコンを押して保存しましょう。</p>

        <br>
        <p>そのほかにも…<br>
            お金を貯めてマイホームを買ったり、<br>
            温泉でのんびりしたりすることもできます♨️
        </p>

        <p style="margin-top:14px; font-weight:bold; color:#3a6e35;">決まった遊び方はありません✨️<br>
        あなたのペースで、ふらっと過ごしてみてくださいね🏡</p>
        `,
    },
};

// ゲーム状態
const gameState = {
    player: {
        name: 'ユーザー',
        avatar: 'Profile/Profile1.png',
        avatarBgColor: '#FFB6C1',
        money: 10000,
        health: 50,
        maxHealth: 50,
        intelligence: 50,
        maxIntelligence: 50,
        weight: 47,
        height: 157,
        bodyFat: 17,
        gender: null, // 性別（'男性' / '女性' / null）
        lastMealTime: Date.now() - 4 * 60 * 60 * 1000, // 最後に食事した時刻（初期：丁度いい）
        lastRegenTime: Date.now(), // 最後にパワーが回復した時刻
        job: '無職',
        jobLevel: 0,
        jobExp: 0,
        currentJobId: null, // 現在の職業ID
        jobClass: 1, // 現在のクラス（1=初級, 2=中級, 3=上級）
        workCount: 0, // 出勤回数（今日の回数・病気判定用）
        totalWorkCount: 0, // 通算出勤回数
        lastWorkTime: null, // 最終出勤時刻
        spouse: null,
        lover: null,
        possessions: [], // 所有物（アイテム全般）
        shopInventory: [], // マイホームショップの仕入れ商品
        shopDescription: '', // マイホームショップの説明文
        disease: null, // 現在の病気（null = 健康）
        mealCount: 0, // 食事回数（病気判定用）
        targetJob: null, // 目標の職業ID（単一）
        targetJobTier: null, // 目標職業のクラス（1=初級, 2=中級, 3=上級）
        birthday: null, // 生年月日 { year, month, day }
        publicSettings: { gender: true, birthday: true, height: true, weight: true }, // 公開設定
        // 能力値
        abilities: {
            国語: 15,
            数学: 15,
            理科: 15,
            社会: 15,
            英語: 15,
            音楽: 15,
            美術: 15,
            体力: 15,
            気力: 15,
            ルックス: 15,
            素早さ: 15,
            面白さ: 15,
            優しさ: 15,
            エロさ: 15
        }
    },
    currentLocation: null,
    day: 1,
    actionCount: 0,
    lastDiseaseCheckDate: null, // 最後に病気チェックした日付（YYYY-MM-DD）
    lastDiseaseOccurredDate: null, // 最後に病気になった日付（重複防止用）
    // マイホームショップ仕入れ在庫
    shopStock: [],
    // 問屋の残り在庫（アイテム名: 残数）
    tonyaStock: {},
    lastTonyaStockResetDate: null,
    // 銀行預金
    savings: 50000000,
    // 入出金履歴（最新100件）
    bankHistory: [],
    // 掲示板データ
    boardPosts: [],
    boardNextId: 1,
    // お絵かき掲示板
    oekakiPosts: [],
    oekakiLiked: [],
    oekakiBookmarked: [],
    // つぶやきデータ
    tweets: [],
    tweetNextId: 1,
    tweetLikes: [],
    lastTweetTime: null,
    lastGymTime: null,
    lastSchoolTime: null,
    lastEmergencySupport: null,
    coinTree: {
        date: null,
        y: null,
        x: null,
        amount: null,
        collected: false
    },
    likedAnswers: [],
    likedBulletins: [],
    // カードゲームデータ
    cardGame: {
        tableCards: [],   // 現在のチェーン上のカード
        lastCard: null,   // 前の人が引いたカード（これと違う数字を引く必要がある）
        history: [],      // 最近のゲーム履歴（最大20件）
        lastDrawDate: null // 最後にカードを引いた日付（YYYY-MM-DD）
    },
    // メールボックスデータ
    mailbox: {
        inbox: [
            {
                id: 1,
                from: '管理人',
                fromAvatar: '🐻',
                fromAvatarBg: '#D4A017',
                subject: 'メインストリートへようこそ！',
                body: 'ふらっとタウンへようこそ！\n\nこの街は、ふらっと立ち寄って、\n自分のペースで過ごせる場所です🏡\n\nなんとなく歩いたり、\n誰かのつぶやきを見たり、\nこんな風にお手紙を書いて交流することもできますよ✉️✨️\n\n{{name}}さんなりの過ごし方を、\n見つけてみてくださいね🌷',
                date: Date.now() - 1000 * 60 * 60 * 24 * 3,
                read: false,
                starred: false,
                designImg: 'letter/flower2.png',
                fontFamily: 'gothic',
                fontSize: 13,
                honorific: 'さま'
            }
        ],
        sent: [],
        draft: [],
        favorites: [],
        later: [],
        trash: []
    },
    mailNextId: 2,
    // 通知データ
    notifications: [
        { id: 1, type: 'news', fromName: '管理人', fromAvatar: '🐻', fromAvatarBg: '#D4A017', title: 'ふらっとタウンへようこそ！', postSnippet: 'タウンの使い方や各施設の説明はこちらをご覧ください。', date: Date.now() - 24 * 60 * 60 * 1000, read: false },
    ],
    notifNextId: 2,
    // 温泉コンビニ購入記録（1日1個制限用）
    onsenShopPurchaseDate: null, // 最後に購入した日付(YYYY-MM-DD)
    onsenShopPurchased: [], // その日に購入済みの商品名リスト
    // アイテム使用間隔記録（{ itemName: timestamp }）
    itemCooldowns: {},
    // チャレンジ報酬受取日（YYYY-MM-DD）
    lastChallengeRewardDate: null,
    // 納税イベント最終発生日時（ISO文字列）
    lastTaxEventDate: null,
    // ランダムイベント保留フラグ
    pendingRandomEvent: false
};

// ============================================
// ユーティリティ
// ============================================
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

// ============================================
// マイホームをマップに反映（ロード後に呼ぶ）
// ============================================
function setHouseOnMap(row, col, houseId) {
    townMap[row][col] = 'myhouse';
    mapTiles[row][col] = `house/${houseId}.png`;
    if (typeof townMapIcon !== 'undefined' && townMapIcon[row]) {
        townMapIcon[row][col] = `house/${houseId}`;
    }
}

function restoreHouseOnMap() {
    const house = gameState.player.house;
    if (!house) return;
    setHouseOnMap(house.row, house.col, house.houseId);
}

// ============================================
// 初期化
// ============================================
function init() {
    loadGame(); // セーブデータがあれば復元
    restoreHouseOnMap(); // セーブされた家をマップに反映
    updateBackground(); // 時間帯に応じた背景を設定
    renderMap();
    updateStatus();
    updateSlotIndicator(); // スロット番号表示
    updateMailBadges(); // メールアイコンバッジを初期表示

    renderTweetList();
    setupTweetInfiniteScroll(); // 無限スクロール設定

    // 最初はマップを表示（施設に移動しない）
    document.getElementById('mapView').style.display = 'block';
    document.getElementById('actionView').style.display = 'none';
    document.getElementById('tweetView').style.display = 'none';

    // ローディングオーバーレイを非表示
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

// ============================================
// 時間帯別背景設定
// ============================================
function updateBackground() {
    const hour = new Date().getHours();
    const body = document.body;

    // 既存の背景クラスを削除
    body.classList.remove('bg-day', 'bg-evening', 'bg-night');

    // 時間帯に応じてクラスを追加
    if (hour >= 5 && hour < 15) {
        // 5:00〜15:00 → 昼
        body.classList.add('bg-day');
    } else if (hour >= 15 && hour < 18) {
        // 15:00〜18:00 → 夕方
        body.classList.add('bg-evening');
    } else {
        // 18:00〜5:00 → 夜
        body.classList.add('bg-night');
    }
}

// ============================================
// モーダル操作
// ============================================

function openNameModal() {
    document.getElementById('nameInput').value = gameState.player.name;
    document.getElementById('nameModal').classList.add('active');
}

function closeNameModal() {
    document.getElementById('nameModal').classList.remove('active');
}

function saveName() {
    const newName = document.getElementById('nameInput').value.trim();
    if (newName && newName.length <= 10) {
        gameState.player.name = newName;
        updateStatus();
        closeNameModal();
    }
}

// ============================================
// マップ描画
// ============================================
// タイル名 → place ID マッピング表（新マップフォーマット用）
const tileToPlace = {
    // 施設名の読み替え
    'jinja':    'temple',
    'keiziban': 'board',
    'syokudo':  'shokudo',
    'ginkou':   'bank',
    'store':    'shop2',
    'game':     'arcade',
    'tonya':    'tonya',
    'bill':     'chintai',
    'kouji':    'kouji',
    // 道路タイル（クリック・ホバー無効）
    'yoko_road':  'road',
    'tate_road':  'road',
    'hodou_yoko': 'road',
    'hodou_tate': 'road',
    'hodou_big3': 'road',
    'hodou_big4': 'road',
    'T_yoko':     'road',
    'T_sita':     'road',
    'T_hidari':   'road',
    'T_ue':       'road',
    '+':          'road',
    'hyossiki2':  'border',
    // 木タイル（コインチェック有効）
    'tree':  'tree',
    'tree2': 'tree',
};

function renderMap() {
    const mapTable = document.getElementById('townMap');
    const labelsTop = document.getElementById('mapLabelsTop');
    const labelsLeft = document.getElementById('mapLabelsLeft');
    mapTable.innerHTML = '';
    labelsTop.innerHTML = '';
    labelsLeft.innerHTML = '';

    // 新フォーマット（townMapBg/townMapIcon）が使えるか判定
    const useNewFormat = typeof townMapBg !== 'undefined' && townMapBg !== null
                      && typeof townMapIcon !== 'undefined' && townMapIcon !== null;

    const numRows = useNewFormat ? townMapBg.length : townMap.length;
    const numCols = useNewFormat ? townMapBg[0].length : townMap[0].length;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // 上部ラベル（横軸の数字）
    for (let x = 1; x <= numCols; x++) {
        const label = document.createElement('div');
        label.classList.add('map-label', 'map-label-top');
        label.textContent = x;
        labelsTop.appendChild(label);
    }

    // 左側ラベル（縦軸 A, B, C...）
    for (let y = 0; y < numRows; y++) {
        const label = document.createElement('div');
        label.classList.add('map-label', 'map-label-left');
        label.textContent = alphabet[y] || (y + 1);
        labelsLeft.appendChild(label);
    }

    // マップ本体
    for (let y = 0; y < numRows; y++) {
        const row = document.createElement('tr');

        for (let x = 0; x < numCols; x++) {
            const cell = document.createElement('td');
            let placeId, tileForInfo;

            if (useNewFormat) {
                // 新フォーマット：bg + icon の2レイヤー
                const bgName = townMapBg[y] ? townMapBg[y][x] : null;
                const iconName = townMapIcon[y] ? townMapIcon[y][x] : null;
                const rawId = iconName || bgName || 'tree';
                placeId = tileToPlace[rawId] || rawId;
                // house/* タイルはmyhouseとして扱う
                if (rawId && rawId.startsWith('house/')) placeId = 'myhouse';
                tileForInfo = iconName;

                if (bgName || iconName) {
                    let html = '<div class="tile-wrap">';
                    if (bgName) html += `<img src="mapimg/${bgName}.png" class="tile-img tile-bg" alt="${bgName}">`;
                    if (iconName) html += `<img src="mapimg/${iconName}.png" class="tile-img tile-icon" alt="${iconName}">`;
                    html += '</div>';
                    cell.innerHTML = html;
                } else {
                    const place = places[placeId];
                    cell.innerHTML = `<span class="emoji">${place ? place.emoji : ''}</span>`;
                }

                // ホバーエフェクト無効化：placesに登録のない背景タイルや道路・木・空き地
                const noHoverIds = ['road', 'tree', 'sale'];
                const isNoHover = noHoverIds.includes(placeId) || !places[placeId];
                if (isNoHover) cell.classList.add('no-hover');
                if (placeId === 'road') cell.classList.add('road-tile');
            } else {
                // 旧フォーマット：townMap + mapTiles（後方互換）
                placeId = townMap[y][x];
                const place = places[placeId];
                const tile = mapTiles[y][x];
                tileForInfo = tile;

                if (tile) {
                    const imgPath = tile.includes('/') ? `${tile}.png` : `tree&road/${tile}.png`;
                    cell.innerHTML = `<img src="${imgPath}" alt="${tile}" class="tile-img">`;
                } else {
                    cell.innerHTML = `<span class="emoji">${place ? place.emoji : ''}</span>`;
                }

                const noHoverTiles = ['T', '+', 'Y', 'L', 'K', 'S'];
                if (noHoverTiles.includes(tile)) cell.classList.add('no-hover');
            }

            cell.dataset.place = placeId;
            if (placeId === 'road') cell.classList.add('road');

            cell.addEventListener('click', () => moveTo(placeId, y, x));
            cell.addEventListener('mouseenter', () => showPlaceInfo(placeId, tileForInfo, y, x));
            cell.addEventListener('mouseleave', () => hidePlaceInfo());
            row.appendChild(cell);
        }
        mapTable.appendChild(row);
    }
}

// ============================================
// マップホバー説明表示
// ============================================
function showPlaceInfo(placeId, tile, tileY, tileX) {
    const place = places[placeId];
    const infoBox = document.getElementById('placeInfoBox');

    if (placeId === 'tree') {
        // 木タイルはコインチェックを先に行う
        initDailyCoin();
        const coin = gameState.coinTree;
        if (!coin.collected && coin.y === tileY && coin.x === tileX) {
            infoBox.textContent = 'おや...？なにか落ちている...？';
        } else {
            infoBox.textContent = '';
        }
    } else if (placeId === 'board') {
        const boardNames = {
            '3,8': '📋 自己紹介掲示板',
            '5,3': '❓ ギモン解決！BBS',
            '9,9': '☀️ ハッピー掲示板',
            '7,13': '🎨 お絵かき掲示板',
        };
        infoBox.textContent = boardNames[`${tileY},${tileX}`] || '掲示板';
    } else if (placeId === 'road') {
        infoBox.textContent = '';
    } else if (placeId === 'sale') {
        infoBox.textContent = 'この場所に家を建てることができます';
    } else if (place) {
        infoBox.textContent = place.mapDescription || place.description || '';
    } else {
        // 旧フォーマット用フォールバック（タイルコード直接チェック）
        if (['T', '+', 'Y', 'L', 'K'].includes(tile)) {
            infoBox.textContent = '';
        } else if (tile === 'S') {
            infoBox.textContent = 'この場所に家を建てることができます';
        } else if (tile === 'H') {
            infoBox.textContent = '他のタウンに移動します。※ただいま建設工事中';
        } else {
            infoBox.textContent = '';
        }
    }
    infoBox.classList.add('visible');
}

function showStatusInfo(text) {
    const infoBox = document.getElementById('placeInfoBox');
    infoBox.textContent = text;
    infoBox.classList.add('visible');
}

function showWorkInfo() {
    const infoBox = document.getElementById('placeInfoBox');
    const p = gameState.player;
    if (p.job === '無職') {
        infoBox.textContent = '仕事に出かけます。※職に就いていません';
    } else {
        const currentLevel = getCurrentJobLevel();
        const nextLevel = jobLevels[currentLevel.level] || null;
        const expToNext = nextLevel ? nextLevel.expRequired - p.jobExp : 0;
        const nextText = nextLevel ? `次のLvまであと ${expToNext}` : 'MAX';
        infoBox.textContent = `仕事に出かけます。【現在】Lv.${currentLevel.level} | 経験値 ${p.jobExp} | ${nextText}`;
    }
    infoBox.classList.add('visible');
}

function hidePlaceInfo() {
    const infoBox = document.getElementById('placeInfoBox');
    infoBox.classList.remove('visible');
    infoBox.textContent = '';
}

// ============================================
// 移動
// ============================================
function moveTo(placeId, tileY, tileX) {
    const place = places[placeId];
    if (!place) return;

    // 道・空き地・準備中施設はクリックしても何もしない
    if (placeId === 'road' || placeId === 'sale' || placeId === 'chintai' || placeId === 'kouji') {
        return;
    }

    // 木：コインが落ちているかチェック
    if (placeId === 'tree') {
        checkTreeCoin(tileY, tileX);
        return;
    }

    gameState.currentLocation = placeId;

    // マップの現在地表示を更新
    document.querySelectorAll('.town-map td').forEach(cell => {
        cell.classList.remove('current');
        if (cell.dataset.place === placeId) {
            cell.classList.add('current');
        }
    });

    // 役場は直接モーダルを開く
    if (placeId === 'yakuba') {
        openYakubaModal();
        return;
    }

    // 温泉は直接モーダルを開く
    if (placeId === 'onsen') {
        openOnsenLobby();
        return;
    }

    // 掲示板は座標ごとに種別を判定して直接モーダルを開く
    if (placeId === 'board') {
        // D-9(y=3,x=8)=自己紹介 / F-4(y=5,x=3)=ギモン解決 / J-10(y=9,x=9)=ハッピー / H-14(y=7,x=13)=お絵かき
        let boardType = 'question'; // デフォルト（念のため）
        if (tileY === 3 && tileX === 8) boardType = 'intro';
        else if (tileY === 5 && tileX === 3) boardType = 'question';
        else if (tileY === 9 && tileX === 9) boardType = 'happy';
        else if (tileY === 7 && tileX === 13) boardType = 'oekaki';
        openBoard(boardType);
        return;
    }

    // マイホームは直接モーダルを開く
    if (placeId === 'myhouse') {
        openMyHome();
        return;
    }

    // 不動産屋は直接モーダルを開く
    if (placeId === 'hudosan') {
        openHudosan();
        return;
    }

    // 食堂は直接モーダルを開く
    if (placeId === 'shokudo') {
        openShokudo();
        return;
    }

    // 職業安定所は直接モーダルを開く
    if (placeId === 'work') {
        openHelloworkModal();
        return;
    }

    // 新デパートは直接モーダルを開く
    if (placeId === 'shop2') {
        openShop2();
        return;
    }

    // ジムは直接モーダルを開く
    if (placeId === 'gym') {
        openGymModal();
        return;
    }

    // 習い事スクールは直接モーダルを開く
    if (placeId === 'school') {
        openSchoolModal();
        return;
    }

    // 銀行は直接モーダルを開く
    if (placeId === 'bank') {
        openBankModal();
        return;
    }

    // 病院は直接モーダルを開く
    if (placeId === 'hospital') {
        openHospitalModal();
        return;
    }

    // ゲームセンター
    if (placeId === 'arcade') {
        openArcadeModal();
        return;
    }

    // 問屋
    if (placeId === 'tonya') {
        openTonyaModal();
        return;
    }


    // アクションビューを表示
    showActionView(place);
}

// ============================================
// アクションビュー表示
// ============================================
// 現在のアクションを保存するグローバル配列
let currentActions = [];

function showActionView(place) {
    // マップを非表示、アクションビューを表示
    document.getElementById('mapView').style.display = 'none';
    document.getElementById('actionView').style.display = 'block';

    const titleEl = document.getElementById('actionViewTitle');
    const descEl = document.getElementById('actionViewDesc');

    // タイトルを非表示
    titleEl.style.display = 'none';

    // 説明文を設定（HTMLタグ対応）
    descEl.innerHTML = place.description;

    // 説明の背景を非表示、フォント設定
    descEl.style.background = 'none';
    descEl.style.border = 'none';
    descEl.style.boxShadow = 'none';
    descEl.style.fontFamily = '"ヒラギノ角ゴシック", "Hiragino Sans", sans-serif';
    descEl.style.color = '#333333';


    // 施設スタイルのリセット
    document.getElementById('actionButtons').classList.remove('shop-buttons');
    document.querySelector('.action-view-content').style.borderColor = '';

    // アクションを保存
    currentActions = place.actions;

    // アクションボタンを生成
    const buttonsContainer = document.getElementById('actionButtons');
    let html = '';

    place.actions.forEach((action, index) => {
        const descHtml = action.description ? `<span class="action-btn-desc">${action.description}</span>` : '';
        html += `
            <button class="btn btn-primary action-btn" onclick="executeAction(${index})">
                <span class="action-btn-name">${action.name}</span>
                ${descHtml}
            </button>
        `;
    });

    buttonsContainer.innerHTML = html;

    // 商店スタイルの適用
    if (place === places.shop) {
        buttonsContainer.classList.add('shop-buttons');
    }
}

// アクション実行関数
function executeAction(index) {
    if (currentActions[index] && currentActions[index].effect) {
        currentActions[index].effect();
    }
}

// ============================================
// マップに戻る
// ============================================
function backToMap() {
    hideRandomEvent();
    document.getElementById('mapView').style.display = 'block';
    document.getElementById('actionView').style.display = 'none';
    document.getElementById('tweetView').style.display = 'none';
    // アクション後のみランダムイベント判定
    flushRandomEvent();
}

// ============================================
// ステータス更新
// ============================================
function updateStatus() {
    const p = gameState.player;

    // 基本情報
    document.getElementById('playerAvatar').innerHTML = `<img src="${p.avatar}" alt="アバター" class="player-avatar-img">`;
    document.getElementById('playerAvatar').style.backgroundColor = p.avatarBgColor;
    document.getElementById('playerName').textContent = p.name;
    const moneyEl = document.getElementById('money');
    moneyEl.textContent = p.money.toLocaleString();
    moneyEl.classList.toggle('money-negative', p.money < 0);

    // 総資産計算（所持金 + 銀行預金）
    document.getElementById('totalAssets').textContent = (p.money + gameState.savings).toLocaleString();

    // 職業
    document.getElementById('playerJob').textContent = p.job;
    const jobLevel = getCurrentJobLevel();
    document.getElementById('playerJobLevel').textContent = p.currentJobId ? `Lv.${jobLevel.level}` : '';

    // 身体ステータス
    document.getElementById('health').textContent = Math.floor(p.health);
    document.getElementById('maxHealth').textContent = p.maxHealth;
    document.getElementById('intelligence').textContent = Math.floor(p.intelligence);
    document.getElementById('maxIntelligence').textContent = p.maxIntelligence;
    document.getElementById('weight').textContent = p.weight.toFixed(1);
    document.getElementById('height').textContent = p.height;

    // BMI計算: 体重(kg) ÷ {身長(m) × 身長(m)}
    const bmi = calculateBMI(p);
    document.getElementById('bodyFat').textContent = bmi.toFixed(1);

    // バー更新
    const healthPercent = p.health / p.maxHealth * 100;
    const intelligencePercent = p.intelligence / p.maxIntelligence * 100;


    const healthBar = document.getElementById('healthBar');
    const intelligenceBar = document.getElementById('intelligenceBar');

    if (healthBar) {
        healthBar.style.width = healthPercent + '%';
        healthBar.style.background = getBarColor(healthPercent);
    }
    if (intelligenceBar) {
        intelligenceBar.style.width = intelligencePercent + '%';
        intelligenceBar.style.background = getBarColor(intelligencePercent);
    }

    // 空腹度テキスト
    const hungerResult = getHungerText();
    const hungerEl = document.getElementById('hungerText');
    if (hungerEl) {
        hungerEl.textContent = hungerResult.text;
        hungerEl.style.color = hungerResult.isWarning ? '#EB6101' : '';
    }

    // コンディション
    const condition = getCondition();
    const conditionEl = document.getElementById('condition');
    if (conditionEl) {
        conditionEl.textContent = condition.text;
        conditionEl.style.color = condition.class === 'bad' ? '#D32F2F' : '';
    }

    // BMIラベル
    const bmiLabel = getBMILabel(bmi);
    const bmiLabelEl = document.getElementById('bodyFatLabel');
    if (bmiLabelEl) {
        bmiLabelEl.textContent = bmiLabel.text;
        bmiLabelEl.className = 'body-fat-label ' + bmiLabel.class;
    }

    // 所有物更新
    renderPossessions();
}

// ============================================
// 職業レベル取得
// ============================================
function getCurrentJobLevel() {
    const exp = gameState.player.jobExp;
    for (let i = jobLevels.length - 1; i >= 0; i--) {
        if (exp >= jobLevels[i].expRequired) {
            return jobLevels[i];
        }
    }
    return jobLevels[0];
}

// プレイヤーの現在クラスを返す（1=初級, 2=中級, 3=上級）
// jobClass フィールドを優先参照。旧セーブデータ互換のため未定義時は job.names で検索してフォールバック。
function getPlayerCurrentClass() {
    const p = gameState.player;
    if (!p.currentJobId) return 1;
    if (p.jobClass) return p.jobClass;
    // 旧セーブデータ向けフォールバック（job.names の文字列検索）
    const job = jobsData.find(j => j.id === p.currentJobId);
    if (!job) return 1;
    const idx = job.names.indexOf(p.job);
    return idx >= 0 ? idx + 1 : 1;
}

// クラスアップ条件を満たしていれば昇格し、新クラス番号を返す（なければ null）
function checkAndApplyClassUp() {
    const p = gameState.player;
    if (!p.currentJobId) return null;
    const job = jobsData.find(j => j.id === p.currentJobId);
    if (!job) return null;

    const currentClass = getPlayerCurrentClass();
    const nextClass = currentClass + 1;
    if (nextClass > 3) return null;

    const currentLevel = getCurrentJobLevel().level;
    if (currentLevel < classUpLevels[nextClass]) return null;

    // 次クラスの能力値条件をチェック
    const tierData = getJobTierData(job, nextClass);
    const abilityKeys = ['国語', '数学', '理科', '社会', '英語', '音楽', '美術', '体力', '気力', 'ルックス', '素早さ', '面白さ', '優しさ', 'エロさ'];
    const abilitiesMet = abilityKeys.every(key => p.abilities[key] >= tierData.abilities[key]);
    if (!abilitiesMet) return null;

    p.job = job.names[nextClass - 1];
    p.jobClass = nextClass;
    p.jobExp = 0;
    return nextClass;
}

// ============================================
// 空腹度テキスト（時間ベース）
// ============================================

// 空腹度ステージ定義（startHours: そのステージの開始時間）
const hungerStages = [
    { stage: 1, text: '満腹（食事できません）', isWarning: true, startHours: 0 },
    { stage: 2, text: '丁度いい', isWarning: false, startHours: 2 },
    { stage: 3, text: 'やや空腹', isWarning: false, startHours: 8 },
    { stage: 4, text: '空腹', isWarning: false, startHours: 16 },
    { stage: 5, text: 'かなり空腹', isWarning: false, startHours: 24 },
    { stage: 6, text: '死にそう⋯', isWarning: true, startHours: 72 }
];

function getHungerText() {
    const lastMeal = gameState.player.lastMealTime;
    const now = Date.now();
    // lastMealTime が無効な場合は73時間前として扱う（死にそう状態）
    const elapsed = (typeof lastMeal === 'number' && isFinite(lastMeal)) ? now - lastMeal : 73 * 60 * 60 * 1000;
    const hoursElapsed = elapsed / (1000 * 60 * 60);

    // 後ろから判定して該当ステージを返す
    for (let i = hungerStages.length - 1; i >= 0; i--) {
        if (hoursElapsed >= hungerStages[i].startHours) {
            return { text: hungerStages[i].text, isWarning: hungerStages[i].isWarning, stage: hungerStages[i].stage };
        }
    }
    // フォールバック：死にそう（stage 6）
    return { text: hungerStages[5].text, isWarning: hungerStages[5].isWarning, stage: 6 };
}

// ============================================
// コンディション判定
// ============================================
function getCondition() {
    const p = gameState.player;
    const hungerStatus = getHungerText();

    // 死にそうな状態 → 絶不調
    if (hungerStatus.text === '死にそう⋯') {
        return { text: '絶不調', class: 'bad' };
    }
    // 病気の場合は病名を表示
    if (p.disease) {
        const diseaseInfo = diseasesData.find(d => d.id === p.disease);
        if (diseaseInfo) {
            return { text: diseaseInfo.name, class: 'bad' };
        }
    }

    // 「最高」判定：空腹度が丁度いい & 身体・頭脳パワー両方95%以上 & BMI 17~30
    const hpRatio = p.health / p.maxHealth;
    const intRatio = p.intelligence / p.maxIntelligence;
    const bmi = calculateBMI(p);
    if (hungerStatus.text === '丁度いい' && hpRatio >= 0.95 && intRatio >= 0.95 && bmi >= 17 && bmi < 30) {
        return { text: '最高', class: 'best' };
    }

    // 身体パワー + 頭脳パワーの合計で判定
    const totalPower = p.health + p.intelligence;
    const maxTotalPower = p.maxHealth + p.maxIntelligence;
    const powerRatio = totalPower / maxTotalPower;

    if (powerRatio >= 0.8) {
        return { text: '良好', class: 'good' };
    }
    if (powerRatio >= 0.5) {
        return { text: '普通', class: 'normal' };
    }
    if (powerRatio >= 0.3) {
        return { text: '悪い', class: 'tired' };
    }
    return { text: 'かなり悪い', class: 'bad' };
}

// ============================================
// BMIラベル
// ============================================
function getBMILabel(bmi) {
    if (bmi < 17) return { text: 'やせすぎ', class: 'thin' };
    if (bmi < 18.5) return { text: 'やせ', class: 'thin' };
    if (bmi < 25) return { text: '普通', class: 'normal' };
    if (bmi < 30) return { text: 'やや肥満', class: 'overweight' };
    return { text: '肥満', class: 'overweight' };
}

function calculateBMI(player) {
    const h = player.height / 100;
    return player.weight / (h * h);
}

function getBarColor(percent) {
    if (percent <= 10) return '#EB6101';
    if (percent <= 50) return '#EAD504';
    return '#329E27';
}

// ============================================
// 所有物描画
// ============================================
function renderPossessions() {
    const container = document.getElementById('possessions');
    if (!container) return; // 要素が存在しない場合はスキップ

    const poss = gameState.player.possessions;

    if (poss.length === 0) {
        container.innerHTML = '<div class="empty-inventory">何も持っていません</div>';
        return;
    }

    // アイテムをグループ化（同じ名前のアイテムをまとめる）
    const grouped = {};
    poss.forEach(item => {
        if (grouped[item.name]) {
            grouped[item.name].count++;
        } else {
            grouped[item.name] = { ...item, count: 1 };
        }
    });

    let html = '';
    Object.values(grouped).forEach(item => {
        const isConsumable = item.consumable;
        const countBadge = item.count > 1 ? `<span class="possession-count">×${item.count}</span>` : '';
        const useButton = isConsumable ? `<button class="btn-use" onclick="useItem('${item.name}')">使う</button>` : '';

        html += `
            <div class="possession-item ${isConsumable ? 'consumable' : ''}">
                <span class="possession-emoji">${item.emoji || ''}</span>
                <span class="possession-name">${item.name}</span>
                ${countBadge}
                ${useButton}
            </div>
        `;
    });

    container.innerHTML = html;
}

// ============================================
// アイテム使用
// ============================================

// '15分' → 15 * 60 * 1000 ms に変換
function parseCooldownMs(cooldownStr) {
    if (!cooldownStr || cooldownStr === '0分') return 0;
    const match = cooldownStr.match(/^(\d+)分$/);
    return match ? parseInt(match[1]) * 60 * 1000 : 0;
}

function useItem(itemName) {
    const p = gameState.player;
    const itemIndex = p.possessions.findIndex(item => item.name === itemName);

    if (itemIndex === -1) {
        return false;
    }

    const item = p.possessions[itemIndex];
    const shopItem = shopItems.find(si => si.name === itemName) || tonyaItems.find(si => si.name === itemName) || shokudoItems.find(si => si.name === itemName) || onsenShopItems.find(si => si.name === itemName);

    if (!shopItem || !shopItem.consumable) {
        return false;
    }

    // 使用間隔チェック（温泉アイテムはクールダウンなし）
    const isOnsenItem = !!(item.maxHpUp || item.maxIntUp);
    const cooldownMs = isOnsenItem ? 0 : parseCooldownMs(shopItem.cooldown);
    if (cooldownMs > 0) {
        if (!gameState.itemCooldowns) gameState.itemCooldowns = {};
        const lastUsed = gameState.itemCooldowns[itemName];
        if (lastUsed) {
            const elapsed = Date.now() - lastUsed;
            if (elapsed < cooldownMs) {
                const remaining = cooldownMs - elapsed;
                const min = Math.ceil(remaining / 60000);
                showToast(`使用間隔中です。あと${min}分お待ちください。`);
                return false;
            }
        }
    }

    // 病気を治す薬の場合、病気の有無・対応を確認
    if (shopItem.cures) {
        if (!p.disease) {
            showToast('今は病気ではありません。');
            return false;
        }
        const canCure = shopItem.cures === 'all' || shopItem.cures.includes(p.disease);
        if (!canCure) {
            const diseaseInfo = diseasesData.find(d => d.id === p.disease);
            showToast(`${diseaseInfo ? diseaseInfo.name : '病気'}にはこの薬は効きません。`);
            return false;
        }
    }

    // パワーチェック（消費パワーが足りるか確認）
    const bodyConsume = shopItem.bodyConsume || 0;
    const brainConsume = shopItem.brainConsume || 0;
    if (p.health < bodyConsume && p.intelligence < brainConsume) {
        showToast('身体パワーと頭脳パワーが足りません');
        return false;
    } else if (p.health < bodyConsume) {
        showToast('身体パワーが足りません');
        return false;
    } else if (p.intelligence < brainConsume) {
        showToast('頭脳パワーが足りません');
        return false;
    }

    // パワー消費
    p.health = Math.max(0, p.health - bodyConsume);
    p.intelligence = Math.max(0, p.intelligence - brainConsume);

    // 効果を適用
    if (shopItem.effect) {
        if (shopItem.effect.health) {
            changeHealth(shopItem.effect.health);
        }
        if (shopItem.effect.intelligence) {
            changeIntelligence(shopItem.effect.intelligence);
        }
        if (shopItem.effect.weight) {
            changeWeight(shopItem.effect.weight);
        }
        if (shopItem.effect.hunger) {
            eatFood(shopItem.hungerEffect || 1);
        }
        if (shopItem.effect.bodyFat) {
            changeBodyFat(shopItem.effect.bodyFat);
        }
        if (shopItem.effect.height) {
            changeHeight(shopItem.effect.height);
        }
    }

    // 上限値アップ（温泉コンビニ商品）
    if (shopItem.maxHpUp) {
        p.maxHealth += shopItem.maxHpUp;
    }
    if (shopItem.maxIntUp) {
        p.maxIntelligence += shopItem.maxIntUp;
    }

    // カロリーによる体重増加（1000kcal = 1kg）
    if (shopItem.calorie && shopItem.calorie > 0) {
        const weightGain = shopItem.calorie / 1000;
        changeWeight(weightGain);
    }

    // デザート・ドリンクは食べ過ぎで虫歯リスク（mealCountに加算）
    if (shopItem.isSweet) {
        gameState.player.mealCount++;
    }

    // 能力値を適用
    if (shopItem.stats) {
        const stats = shopItem.stats;
        const abilities = p.abilities;

        for (const key in stats) {
            if (key in abilities && stats[key]) {
                abilities[key] += stats[key];
            }
        }
    }

    // 病気を治す
    if (shopItem.cures) {
        p.disease = null;
    }

    // アイテムを消費（残り回数を減らす）
    if (item.remainingUses > 1) {
        item.remainingUses -= 1;
    } else {
        // 残り1個の場合は削除
        p.possessions.splice(itemIndex, 1);
    }

    // 使用間隔を記録
    if (cooldownMs > 0) {
        if (!gameState.itemCooldowns) gameState.itemCooldowns = {};
        gameState.itemCooldowns[itemName] = Date.now();
    }

    updateStatus();
    return true;
}


// ============================================
// ステータス変更ヘルパー
// ============================================
function changeHealth(amount) {
    const p = gameState.player;
    p.health = Math.max(0, Math.min(p.maxHealth, p.health + amount));
    updateStatus();
}

function changeMoney(amount) {
    gameState.player.money += amount;
    updateStatus();
}

function changeIntelligence(amount) {
    const p = gameState.player;
    // ノートパソコン所持で効率UP
    const hasLaptop = p.possessions.some(item => item.name === 'ノートパソコン');
    const finalAmount = hasLaptop && amount > 0 ? amount * 2 : amount;
    p.intelligence = Math.max(0, Math.min(p.maxIntelligence, p.intelligence + finalAmount));
    updateStatus();
}

function changeWeight(amount) {
    gameState.player.weight = Math.max(40, gameState.player.weight + amount);
    updateStatus();
}

function changeHeight(amount) {
    gameState.player.height = Math.max(1, gameState.player.height + amount);
    updateStatus();
}

function changeHunger(amount) {
    // 食事した場合（マイナス値）は lastMealTime をリセット
    if (amount < 0) {
        eatFood();
    }
    // プラス値は何もしない（時間ベースのため）
    updateStatus();
}

// 食事関数（hungerEffectの段階数ぶん空腹度を回復）
function eatFood(stages = 1) {
    const hungerStatus = getHungerText();
    if (hungerStatus.text === '満腹（食事できません）') {
        return false;
    }

    // 現在のステージからstages分だけ回復（最低ステージ1＝満腹）
    const currentStage = hungerStatus.stage;
    const targetStage = Math.max(1, currentStage - stages);

    // 目標ステージの開始時間ぶんだけlastMealTimeを設定
    const targetHours = hungerStages[targetStage - 1].startHours;
    gameState.player.lastMealTime = Date.now() - targetHours * 60 * 60 * 1000;

    gameState.player.mealCount++;
    updateStatus();
    return true;
}

function changeBodyFat(amount) {
    const p = gameState.player;
    p.bodyFat = Math.max(5, Math.min(40, p.bodyFat + amount));
    updateStatus();
}

// ============================================
// アクション後の処理
// ============================================
function afterAction() {
    gameState.actionCount++;
    gameState.pendingRandomEvent = true;
}

// ============================================
// パワー自然回復（30秒に1ポイント）
// ============================================
setInterval(() => {
    const p = gameState.player;
    if (p.health < p.maxHealth) {
        p.health = Math.min(p.maxHealth, p.health + 1);
    }
    if (p.intelligence < p.maxIntelligence) {
        p.intelligence = Math.min(p.maxIntelligence, p.intelligence + 1);
    }
    p.lastRegenTime = Date.now();
    updateStatus();
}, 30000);

// ============================================
// アクション関数
// ============================================

// 会社モーダル
let workCooldownInterval = null;

function openWorkModal() {
    const modal = document.getElementById('workModal');
    const messageEl = document.getElementById('workResultMessage');
    const detailsEl = document.getElementById('workResultDetails');
    const p = gameState.player;
    const buttonsEl = document.querySelector('.work-modal-buttons');
    const workOkBtn = document.getElementById('workOkBtn');
    const workModalBody = document.querySelector('.work-modal-body');
    buttonsEl.classList.remove('work-success');
    workOkBtn.classList.remove('work-ok-success');
    workModalBody.classList.remove('work-success');

    // 無職チェック
    if (p.job === '無職') {
        messageEl.innerHTML = '<span class="error-text">ERROR！</span><br>まだ職に就いていないようです。<br>E-12の職業安定所で職を探しましょう！';
        messageEl.classList.add('no-job');
        detailsEl.innerHTML = '';
    } else {
        // 現在の職業データを取得
        const job = jobsData.find(j => j.id === p.currentJobId);
        if (!job) {
            messageEl.innerHTML = '職業データが見つかりません。';
            messageEl.classList.add('no-job');
            detailsEl.innerHTML = '';
            modal.classList.add('active');
            return;
        }

        // 現在のクラスに応じたデータを取得（中級・上級は能力値・給料・消費が異なる）
        const currentClass = getPlayerCurrentClass();
        const tierData = getJobTierData(job, currentClass);

        // 出勤間隔チェック（1分 = 60000ミリ秒）
        const workInterval = 600000; // 10分のクールタイム
        if (p.lastWorkTime && Date.now() - p.lastWorkTime < workInterval) {
            messageEl.classList.add('no-job');
            detailsEl.innerHTML = '';

            // カウントダウン更新関数
            const updateWorkCooldown = () => {
                const remaining = workInterval - (Date.now() - p.lastWorkTime);
                if (remaining <= 0) {
                    if (workCooldownInterval) {
                        clearInterval(workCooldownInterval);
                        workCooldownInterval = null;
                    }
                    messageEl.innerHTML = '出勤できるようになりました！';
                    return;
                }
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                const timeText = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
                messageEl.innerHTML = `<span class="error-text">ERROR！</span><br>出勤できる間隔は10分です。<br>次に出勤できるまであと <span style="color: #4EA840; font-weight: bold;">${timeText}</span>`;
            };

            updateWorkCooldown();
            if (workCooldownInterval) clearInterval(workCooldownInterval);
            workCooldownInterval = setInterval(updateWorkCooldown, 1000);

            modal.classList.add('active');
            return;
        }

        // コンディションチェック
        const condition = getCondition();
        if (condition.text === '絶不調') {
            messageEl.innerHTML = '<span class="error-text">ERROR！</span><br>コンディションが絶不調のため出勤できないようです。。。';
            messageEl.classList.add('no-job');
            detailsEl.innerHTML = '';
            modal.classList.add('active');
            return;
        }

        // BMIチェック（表示値と合わせるため小数点1桁で比較）
        const heightM = p.height / 100;
        const playerBMI = Math.round(p.weight / (heightM * heightM) * 10) / 10;
        const minBMI = job.conditions.bmi[0];
        const maxBMI = job.conditions.bmi[1];
        if (playerBMI < minBMI || playerBMI > maxBMI) {
            messageEl.innerHTML = '<span class="error-text">ERROR！</span><br>体格指数（BMI）が<br>条件を満たしていないため、出勤できません。。。';
            messageEl.classList.add('no-job');
            detailsEl.innerHTML = '';
            modal.classList.add('active');
            return;
        }

        // パワーチェック（クラスに応じた消費量を使用）
        const bodyConsume = tierData.bodyConsume;
        const brainConsume = tierData.brainConsume;

        if (p.health < bodyConsume && p.intelligence < brainConsume) {
            messageEl.innerHTML = '<span class="error-text">ERROR！</span><br>身体パワーと頭脳パワーが足りないようです！';
            messageEl.classList.add('no-job');
            detailsEl.innerHTML = '';
            modal.classList.add('active');
            return;
        } else if (p.health < bodyConsume) {
            messageEl.innerHTML = '<span class="error-text">ERROR！</span><br>身体パワーが足りないようです！';
            messageEl.classList.add('no-job');
            detailsEl.innerHTML = '';
            modal.classList.add('active');
            return;
        } else if (p.intelligence < brainConsume) {
            messageEl.innerHTML = '<span class="error-text">ERROR！</span><br>頭脳パワーが足りないようです！';
            messageEl.classList.add('no-job');
            detailsEl.innerHTML = '';
            modal.classList.add('active');
            return;
        }

        // 最終出勤時刻を記録
        p.lastWorkTime = Date.now();

        // 出勤回数をカウント
        p.workCount++;
        p.totalWorkCount = (p.totalWorkCount || 0) + 1;

        // 経験値（コンディションに応じてランダム）
        const prevLevel = getCurrentJobLevel();
        const prevSalary = Math.floor(tierData.salary * prevLevel.salaryRate);

        let expGain;
        // 病気のときは経験値が減る
        const diseaseInfo = p.disease ? diseasesData.find(d => d.id === p.disease) : null;
        if (diseaseInfo) {
            if (diseaseInfo.severity === 1) {
                expGain = -(Math.floor(Math.random() * 3) + 2); // -2~-4
            } else if (diseaseInfo.severity === 2) {
                expGain = -(Math.floor(Math.random() * 4) + 5); // -5~-8
            } else {
                expGain = -(Math.floor(Math.random() * 4) + 9); // -9~-12
            }
        } else if (condition.text === '最高') {
            expGain = 20;
        } else if (condition.text === '良好') {
            expGain = Math.floor(Math.random() * 4) + 14; // 14~17
        } else if (condition.text === '普通') {
            expGain = Math.floor(Math.random() * 4) + 10; // 10~13
        } else if (condition.text === '悪い') {
            expGain = Math.floor(Math.random() * 4) + 6; // 6~9
        } else {
            expGain = Math.floor(Math.random() * 4) + 2; // 2~5（かなり悪い）
        }
        p.jobExp = Math.max(0, p.jobExp + expGain);

        // レベルアップチェック
        const newLevel = getCurrentJobLevel();
        const newSalary = Math.floor(tierData.salary * newLevel.salaryRate);
        const leveledUp = newLevel.level > prevLevel.level;

        // クラスアップチェック（給料計算前に実行し、クラスアップ時は新クラスの給料を適用）
        const classedUp = checkAndApplyClassUp();

        // 身体パワー・頭脳パワー消費
        p.health = Math.max(0, p.health - bodyConsume);
        p.intelligence = Math.max(0, p.intelligence - brainConsume);

        // 体重減少（ベース0.05 + 身体消費に応じた減少）
        const weightLoss = 0.05 + bodyConsume * 0.01;
        p.weight = Math.max(0, p.weight - weightLoss);

        // 給料計算（クラスアップ時は新クラスのtierDataとリセット後のレベルで計算）
        const salaryTierData = classedUp ? getJobTierData(job, classedUp) : tierData;
        const salaryLevel = classedUp ? getCurrentJobLevel() : newLevel;
        const baseSalary = Math.floor(salaryTierData.salary * salaryLevel.salaryRate);
        let salaryEarned = baseSalary;
        let bonusEarned = 0;

        // レベルアップボーナス（クラスアップ前の給料・クラス倍率で計算）
        if (leveledUp) {
            bonusEarned = prevSalary * classBonusRates[currentClass];
        }

        // 給料・ボーナスを銀行口座に追加（それぞれ加算→記録の順で正しい残高を記録する）
        if (salaryEarned > 0) {
            gameState.savings += salaryEarned;
            addBankHistory('deposit', salaryEarned, 'お給料');
        }
        if (bonusEarned > 0) {
            gameState.savings += bonusEarned;
            addBankHistory('deposit', bonusEarned, 'レベルアップボーナス');
        }

        // 表示を更新
        messageEl.innerHTML = `仕事に出かけました -${p.totalWorkCount}回目-`;
        messageEl.classList.remove('no-job');
        buttonsEl.classList.add('work-success');
        workOkBtn.classList.add('work-ok-success');
        workModalBody.classList.add('work-success');

        let detailsHTML = '';

        // ─── 上段：レベルアップ・クラスアップ・昇給（あるときだけ） ───
        let highlightHTML = '';
        if (leveledUp) {
            highlightHTML += `<p>おめでとうございます！</p>`;
            highlightHTML += `<p>・レベルが${newLevel.level}へ上がりました！</p>`;
            highlightHTML += `<p>・${newSalary.toLocaleString()}円 / 1回に昇給しました！</p>`;
        }

        if (classedUp) {
            const prevTierData = getJobTierData(job, classedUp - 1);
            const classedUpTierData = getJobTierData(job, classedUp);
            const levelUpLine = leveledUp ? `<p class="work-classup-levelup">レベルが${newLevel.level}へ上がりました！</p>` : '';
            highlightHTML = `
                <div class="work-classup-content">
                    <p class="work-classup-title">☆ おめでとうございます ☆</p>
                    ${levelUpLine}
                    <p class="work-classup-names">【${prevTierData.name}】から<span class="work-classup-highlight">【${classedUpTierData.name}】</span>へ<br>クラスアップしました！</p>
                    <p class="work-classup-salary-label">お給料が</p>
                    <p class="work-classup-amount"><span class="work-classup-highlight">${salaryEarned.toLocaleString()}円</span> に昇給しました！</p>
                </div>
            `;
            updateStatus();
        }
        if (highlightHTML) {
            detailsHTML += `<div class="work-highlight-section">${highlightHTML}</div>`;
        }

        // ─── 下段：結果テーブル ───
        detailsHTML += `<div class="shokudo-eat-changes work-result-table">`;
        // プラスブロック
        if (bonusEarned > 0) {
            detailsHTML += `<div class="shokudo-change-row"><span class="shokudo-change-label">レベルアップボーナス</span><span class="work-change-bonus">+${bonusEarned.toLocaleString()}円</span></div>`;
        }
        if (salaryEarned > 0) {
            detailsHTML += `<div class="shokudo-change-row"><span class="shokudo-change-label">お給料</span><span class="work-change-plus">+${salaryEarned.toLocaleString()}円</span></div>`;
        }
        detailsHTML += `<div class="shokudo-change-row"><span class="shokudo-change-label">経験値</span><span class="${expGain >= 0 ? 'work-change-plus' : 'work-change-minus'}">${expGain >= 0 ? '+' : ''}${expGain}</span></div>`;
        // セパレーター
        detailsHTML += `<div class="work-result-divider"></div>`;
        // マイナスブロック
        detailsHTML += `<div class="shokudo-change-row work-row-cost"><span class="shokudo-change-label">身体パワー</span><span class="work-change-minus">-${bodyConsume}</span></div>`;
        detailsHTML += `<div class="shokudo-change-row work-row-cost"><span class="shokudo-change-label">頭脳パワー</span><span class="work-change-minus">-${brainConsume}</span></div>`;
        detailsHTML += `<div class="shokudo-change-row work-row-cost"><span class="shokudo-change-label">体重</span><span class="work-change-minus">-${weightLoss.toFixed(2)}kg</span></div>`;
        detailsHTML += `</div>`;

        detailsEl.innerHTML = detailsHTML;

        // ステータス更新
        updateStatus();

        // 通勤成功時のみイベント判定フラグを立てる
        gameState.pendingRandomEvent = true;
    }

    modal.classList.add('active');
}

function closeWorkModal() {
    hideRandomEvent();
    if (workCooldownInterval) {
        clearInterval(workCooldownInterval);
        workCooldownInterval = null;
    }
    document.getElementById('workModal').classList.remove('active');
    // 通勤成功時のみランダムイベント判定
    flushRandomEvent();
}

// ジムモーダル
function openGymModal() {
    renderGymTable();
    document.getElementById('gymTableView').style.display = 'flex';
    document.getElementById('gymResultView').style.display = 'none';
    document.getElementById('gymModal').classList.add('active');
}

function closeGymModal() {
    document.getElementById('gymModal').classList.remove('active');
    flushRandomEvent();
}

// 習い事スクールモーダル
function openSchoolModal() {
    renderSchoolTable();
    document.getElementById('schoolTableView').style.display = 'flex';
    document.getElementById('schoolResultView').style.display = 'none';
    document.getElementById('schoolModal').classList.add('active');
}

function closeSchoolModal() {
    document.getElementById('schoolModal').classList.remove('active');
    flushRandomEvent();
}

// ジム
const gymMenus = [
    { name: 'スイミング',   image: 'public/gym/swimming.png',   stats: { 体力: 8, ルックス: 7, 素早さ: 6, エロさ: 9 },  price: 15000, bodyConsume: 20, bmi: [17, 35], calorie: 1050 },
    { name: 'ダンス',       image: 'public/gym/dance.png',       stats: { ルックス: 6, 素早さ: 7, 面白さ: 7, エロさ: 10 }, price: 15000, bodyConsume: 20, bmi: [17, 32], calorie: 850 },
    { name: 'ジョギング',   image: 'public/gym/Jogging.png',     stats: { 体力: 8, 気力: 8, ルックス: 7, 優しさ: 7 },  price: 15000, bodyConsume: 20, bmi: [17, 35], calorie: 700 },
    { name: 'フットサル',   image: 'public/gym/futsal.png',      stats: { 体力: 6, 素早さ: 9, 面白さ: 7, 優しさ: 8 },  price: 15000, bodyConsume: 20, bmi: [17, 33], calorie: 950 },
    { name: 'テニス',       image: 'public/gym/tennis.png',      stats: { 体力: 7, 気力: 6, 素早さ: 10, 面白さ: 7 },  price: 15000, bodyConsume: 20, bmi: [17, 33], calorie: 800 },
    { name: '空手',         image: 'public/gym/karate.png',      stats: { 体力: 8, 気力: 10, 優しさ: 7, エロさ: 5 },  price: 15000, bodyConsume: 20, bmi: [17, 35], calorie: 1000 },
    { name: 'ヨガ',         image: 'public/gym/yoga.png',        stats: { 気力: 7, ルックス: 8, 優しさ: 5, エロさ: 10 }, price: 15000, bodyConsume: 20, bmi: [17, 40], calorie: 600 },
    { name: 'ボクシング',   image: 'public/gym/boxing.png',      stats: { 体力: 8, 素早さ: 9, 面白さ: 5, エロさ: 8 },  price: 15000, bodyConsume: 20, bmi: [17, 35], calorie: 1200 },
    { name: 'トランポリン', image: 'public/gym/trampoline.png',  stats: { ルックス: 6, 素早さ: 5, 面白さ: 11, 優しさ: 8 }, price: 15000, bodyConsume: 20, bmi: [17, 30], calorie: 900 },
    { name: '弓道',         image: 'public/gym/kyudo.png',       stats: { 気力: 10, ルックス: 7, 面白さ: 5, 優しさ: 8 }, price: 15000, bodyConsume: 20, bmi: [17, 40], calorie: 650 },
    { name: 'バレエ',       image: 'public/gym/ballet.png',      stats: { 気力: 5, ルックス: 10, 素早さ: 6, エロさ: 9 }, price: 15000, bodyConsume: 20, bmi: [17, 25], calorie: 750 },
    { name: 'ボルダリング', image: 'public/gym/bouldering.png',  stats: { 体力: 7, 気力: 6, 面白さ: 9, 優しさ: 8 },  price: 15000, bodyConsume: 20, bmi: [17, 28], calorie: 1100 }
];

function updateGymPanel() {
    const selected = document.querySelector('input[name="gymMenu"]:checked');
    const panel = document.getElementById('gymPanel');
    const trainBtn = document.getElementById('gymTrainBtn');

    if (!selected) {
        panel.innerHTML = '<p class="shokudo-no-select">メニューを選んでください</p>';
        trainBtn.disabled = true;
        trainBtn.classList.remove('active');
        return;
    }

    const index = parseInt(selected.value);
    const menu = gymMenus[index];
    const p = gameState.player;
    const playerBmi = calculateBMI(p);
    const bmiOk = playerBmi >= menu.bmi[0] && playerBmi <= menu.bmi[1];
    const canTrain = p.health >= menu.bodyConsume && p.money >= menu.price && bmiOk && !p.disease;

    panel.innerHTML = `
        <div class="shokudo-selected-content">
            <p class="shokudo-select-name">${menu.name}</p>
            ${menu.image ? `<img src="${menu.image}" alt="${menu.name}" class="gym-select-img">` : ''}
            <div class="shokudo-select-divider"></div>
            <div class="shokudo-select-row">
                <span class="shokudo-select-key">消費カロリー</span>
                <span class="shokudo-select-val">${menu.calorie}kcal</span>
            </div>
            <div class="shokudo-select-row">
                <span class="shokudo-select-key">身体消費</span>
                <span class="shokudo-select-val">${menu.bodyConsume}</span>
            </div>
            <div class="shokudo-select-row shokudo-select-price-row">
                <span class="shokudo-select-key">金額</span>
                <span class="shokudo-select-val shokudo-select-price">${menu.price.toLocaleString()} 円</span>
            </div>
        </div>
    `;

    const bodyWarn = document.getElementById('gymBodyWarn');
    let warnMsg = '';
    if (p.disease) {
        warnMsg = '病気のためトレーニングできません';
    } else if (!bmiOk) {
        warnMsg = '体格指数の条件を満たしていません';
    } else if (p.money < menu.price) {
        warnMsg = '所持金が足りません';
    } else if (p.health < menu.bodyConsume) {
        warnMsg = '身体パワーが足りません';
    }
    if (warnMsg) {
        bodyWarn.textContent = warnMsg;
        bodyWarn.style.display = '';
    } else {
        bodyWarn.style.display = 'none';
    }

    trainBtn.disabled = !canTrain;
    trainBtn.classList.toggle('active', canTrain);
}

// テーブル列構成（11列）: 商品名(1) + 身体系能力値7(体力,気力,ルックス,素早さ,面白さ,優しさ,エロさ) + カロリー(1) + 価格(1) + 身体消費(1)
function renderGymTable() {
    const tbody = document.getElementById('gymTableBody');
    const abilities = gameState.player.abilities;
    const playerBmi = calculateBMI(gameState.player);

    const gymAbilityKeys = ['体力', '気力', 'ルックス', '素早さ', '面白さ', '優しさ', 'エロさ'];

    // ユーザー能力値行
    let userCells = '';
    gymAbilityKeys.forEach(key => {
        userCells += `<td>${abilities[key]}</td>`;
    });

    const userStatsRow = `
        <tr class="gym-user-stats">
            <td class="gym-user-stats-label">現在の能力値</td>
            ${userCells}
            <td></td>
            <td></td>
            <td></td>
        </tr>
    `;

    let targetJobRow = '';
    if (gameState.player.targetJob) {
        const targetJob = jobsData.find(j => j.id === gameState.player.targetJob);
        if (targetJob) {
            const tier = gameState.player.targetJobTier || 1;
            const tierData = getJobTierData(targetJob, tier);
            const targetCells = gymAbilityKeys.map(k => `<td>${tierData.abilities[k] || ''}</td>`).join('');
            targetJobRow = `
        <tr class="target-job-stats">
            <td class="target-job-stats-label">目標の職業：${targetJob.names[tier - 1]}</td>
            ${targetCells}
            <td></td><td></td><td></td>
        </tr>`;
        }
    }

    // メニュー行
    let menuRows = '';
    gymMenus.forEach((menu, index) => {
        let abilityCells = '';
        gymAbilityKeys.forEach(key => {
            const val = menu.stats[key];
            abilityCells += `<td>${val ? val : ''}</td>`;
        });

        menuRows += `
            <tr>
                <td class="gym-menu-name"><label><input type="radio" name="gymMenu" class="gym-radio" value="${index}" onchange="updateGymPanel()"> ${menu.name}</label></td>
                ${abilityCells}
                <td>${menu.calorie > 0 ? menu.calorie + 'kcal' : '-'}</td>
                <td class="gym-price">${menu.price.toLocaleString()}円</td>
                <td>${menu.bodyConsume}</td>
            </tr>
        `;
    });

    tbody.innerHTML = userStatsRow + targetJobRow + menuRows;

    // 右パネル初期化
    document.getElementById('gymMoney').textContent = `${gameState.player.money.toLocaleString()}円`;
    document.getElementById('gymPanel').innerHTML = '<p class="shokudo-no-select">メニューを選んでください</p>';
    document.getElementById('gymBodyWarn').style.display = 'none';
    const trainBtn = document.getElementById('gymTrainBtn');
    trainBtn.disabled = true;
    trainBtn.classList.remove('active');
}

// ============================================
// 習い事スクール
// ============================================
const schoolMenus = [
    { name: '英会話教室',         image: 'public/school/english.png', stats: { 国語: 8, 社会: 7, 英語: 9, 音楽: 6 },         price: 15000, brainConsume: 20 },
    { name: 'ピアノレッスン',      image: 'public/school/piano.png',   stats: { 数学: 5, 理科: 7, 音楽: 9, 美術: 9 },         price: 15000, brainConsume: 20 },
    { name: 'プログラミング講座',   image: 'public/school/program.png', stats: { 数学: 10, 理科: 8, 社会: 5, 英語: 7 },       price: 15000, brainConsume: 20 },
    { name: 'お料理教室',          image: 'public/school/cook.png',    stats: { 国語: 6, 理科: 8, 社会: 8, 美術: 8 },         price: 15000, brainConsume: 20 },
    { name: 'イラスト講座',        image: 'public/school/illust.png',  stats: { 国語: 7, 数学: 6, 音楽: 7, 美術: 10 },        price: 15000, brainConsume: 20 },
    { name: 'ボーカルレッスン',    image: 'public/school/vocal.png',   stats: { 国語: 6, 英語: 7, 音楽: 10, 美術: 7 },        price: 15000, brainConsume: 20 },
    { name: '写真教室',            image: 'public/school/photo.png',   stats: { 理科: 7, 社会: 8, 音楽: 7, 美術: 8 },         price: 15000, brainConsume: 20 },
    { name: 'コーヒー講座',        image: 'public/school/coffee.png',  stats: { 国語: 8, 数学: 8, 理科: 7, 社会: 7 },         price: 15000, brainConsume: 20 },
    { name: '心理学講座',          image: 'public/school/psy.png',     stats: { 国語: 9, 数学: 8, 社会: 8, 英語: 5 },         price: 15000, brainConsume: 20 },
    { name: 'ペン字・美文字',      image: 'public/school/bimoji.png',  stats: { 国語: 8, 数学: 5, 英語: 7, 美術: 10 },        price: 15000, brainConsume: 20 },
    { name: '占い講座',            image: 'public/school/fotune.png',  stats: { 理科: 7, 社会: 8, 英語: 9, 音楽: 6 },         price: 15000, brainConsume: 20 },
    { name: 'マネーリテラシー講座', image: 'public/school/money.png',   stats: { 数学: 9, 理科: 7, 英語: 8, 音楽: 6 },        price: 15000, brainConsume: 20 }
];

function updateSchoolPanel() {
    const selected = document.querySelector('input[name="schoolMenu"]:checked');
    const panel = document.getElementById('schoolPanel');
    const lessonBtn = document.getElementById('schoolLessonBtn');

    if (!selected) {
        panel.innerHTML = '<p class="shokudo-no-select">メニューを選んでください</p>';
        lessonBtn.disabled = true;
        lessonBtn.classList.remove('active');
        return;
    }

    const index = parseInt(selected.value);
    const menu = schoolMenus[index];
    const p = gameState.player;
    const canLesson = p.intelligence >= menu.brainConsume && p.money >= menu.price && !p.disease;

    panel.innerHTML = `
        <div class="shokudo-selected-content">
            <p class="shokudo-select-name">${menu.name}</p>
            ${menu.image ? `<img src="${menu.image}" alt="${menu.name}" class="gym-select-img">` : ''}
            <div class="shokudo-select-divider"></div>
            <div class="shokudo-select-row">
                <span class="shokudo-select-key">頭脳消費</span>
                <span class="shokudo-select-val">${menu.brainConsume}</span>
            </div>
            <div class="shokudo-select-row shokudo-select-price-row">
                <span class="shokudo-select-key">金額</span>
                <span class="shokudo-select-val shokudo-select-price">${menu.price.toLocaleString()} 円</span>
            </div>
        </div>
    `;

    const brainWarn = document.getElementById('schoolBrainWarn');
    let warnMsg = '';
    if (p.disease) {
        warnMsg = '病気のためレッスンを受けられません';
    } else if (p.money < menu.price) {
        warnMsg = '所持金が足りません';
    } else if (p.intelligence < menu.brainConsume) {
        warnMsg = '頭脳パワーが足りません';
    }
    if (warnMsg) {
        brainWarn.textContent = warnMsg;
        brainWarn.style.display = '';
    } else {
        brainWarn.style.display = 'none';
    }

    lessonBtn.disabled = !canLesson;
    lessonBtn.classList.toggle('active', canLesson);
}

// テーブル列構成（10列）: 商品名(1) + 頭脳系能力値7(国語,数学,理科,社会,英語,音楽,美術) + 価格(1) + 頭脳消費(1)
function renderSchoolTable() {
    const tbody = document.getElementById('schoolTableBody');
    const abilities = gameState.player.abilities;

    const schoolAbilityKeys = ['国語', '数学', '理科', '社会', '英語', '音楽', '美術'];

    // ユーザー能力値行
    let userCells = '';
    schoolAbilityKeys.forEach(key => {
        userCells += `<td>${abilities[key]}</td>`;
    });

    const userStatsRow = `
        <tr class="gym-user-stats">
            <td class="gym-user-stats-label">現在の能力値</td>
            ${userCells}
            <td></td>
            <td></td>
        </tr>
    `;

    let targetJobRow = '';
    if (gameState.player.targetJob) {
        const targetJob = jobsData.find(j => j.id === gameState.player.targetJob);
        if (targetJob) {
            const tier = gameState.player.targetJobTier || 1;
            const tierData = getJobTierData(targetJob, tier);
            const targetCells = schoolAbilityKeys.map(k => `<td>${tierData.abilities[k] || ''}</td>`).join('');
            targetJobRow = `
        <tr class="target-job-stats">
            <td class="target-job-stats-label">目標の職業：${targetJob.names[tier - 1]}</td>
            ${targetCells}
            <td></td><td></td>
        </tr>`;
        }
    }

    // メニュー行
    let menuRows = '';
    schoolMenus.forEach((menu, index) => {
        let abilityCells = '';
        schoolAbilityKeys.forEach(key => {
            const val = menu.stats[key];
            abilityCells += `<td>${val ? val : ''}</td>`;
        });

        menuRows += `
            <tr>
                <td class="gym-menu-name"><label><input type="radio" name="schoolMenu" class="gym-radio" value="${index}" onchange="updateSchoolPanel()"> ${menu.name}</label></td>
                ${abilityCells}
                <td class="gym-price">${menu.price.toLocaleString()}円</td>
                <td>${menu.brainConsume}</td>
            </tr>
        `;
    });

    tbody.innerHTML = userStatsRow + targetJobRow + menuRows;

    // 右パネル初期化
    document.getElementById('schoolMoney').textContent = `${gameState.player.money.toLocaleString()}円`;
    document.getElementById('schoolPanel').innerHTML = '<p class="shokudo-no-select">メニューを選んでください</p>';
    document.getElementById('schoolBrainWarn').style.display = 'none';
    const lessonBtn = document.getElementById('schoolLessonBtn');
    lessonBtn.disabled = true;
    lessonBtn.classList.remove('active');
}

function doSchoolLesson() {
    const selected = document.querySelector('input[name="schoolMenu"]:checked');
    if (!selected) {
        showToast('メニューを選択してください');
        return;
    }

    const menu = schoolMenus[selected.value];
    const p = gameState.player;

    // 病気チェック
    if (p.disease) {
        const diseaseInfo = diseasesData.find(d => d.id === p.disease);
        showToast(`${diseaseInfo ? diseaseInfo.name : '病気'}のためレッスンを受けられません。。。`, 2000);
        return;
    }

    // クールダウンチェック（30分）
    if (gameState.lastSchoolTime) {
        const elapsed = Date.now() - new Date(gameState.lastSchoolTime).getTime();
        const cooldownMs = 30 * 60 * 1000;
        if (elapsed < cooldownMs) {
            const remaining = cooldownMs - elapsed;
            const min = Math.floor(remaining / 60000);
            const sec = Math.floor((remaining % 60000) / 1000);
            showToast(`まだ30分経過していません。\n次のレッスンまであと ${min}分${sec.toString().padStart(2, '0')}秒`, 3000);
            return;
        }
    }

    // 所持金チェック
    if (p.money < menu.price) {
        showToast('所持金が足りません');
        return;
    }

    // 頭脳パワーチェック
    if (p.intelligence < menu.brainConsume) {
        showToast('頭脳パワーが足りません');
        return;
    }

    // 支払い＆消費
    changeMoney(-menu.price);
    changeIntelligence(-menu.brainConsume);

    // クールダウン開始時刻を記録
    gameState.lastSchoolTime = new Date().toISOString();

    // 能力値を加算
    const abilities = p.abilities;
    for (const key in menu.stats) {
        if (key in abilities && menu.stats[key]) {
            abilities[key] += menu.stats[key];
        }
    }

    updateStatus();

    // 結果表示（画面切り替え）
    let statsHtml = '';
    for (const [key, value] of Object.entries(menu.stats)) {
        if (value > 0) {
            statsHtml += `<div class="gym-stat-up-item">${key}が <strong>+${value}</strong> アップ！</div>`;
        }
    }

    let schoolStatsHtml = '<div class="shokudo-eat-changes">';
    for (const [key, value] of Object.entries(menu.stats)) {
        if (value > 0) {
            schoolStatsHtml += `<div class="shokudo-change-row">
                <span class="shokudo-change-label">${key}</span>
                <span class="shokudo-change-plus">+${value}</span>
            </div>`;
        }
    }
    schoolStatsHtml += `<div class="shokudo-change-row">
        <span class="shokudo-change-label">頭脳パワー消費</span>
        <span class="shokudo-change-plus">-${menu.brainConsume}</span>
    </div>`;
    schoolStatsHtml += '</div>';

    document.getElementById('schoolResultMessage').textContent = `${menu.name}を受講しました！`;
    document.getElementById('schoolResultStats').innerHTML = schoolStatsHtml;

    // スクールモーダル内でテーブルビューを隠して結果ビューを表示
    document.getElementById('schoolTableView').style.display = 'none';
    document.getElementById('schoolResultView').style.display = 'flex';

    gameState.pendingRandomEvent = true;
    afterAction();
}

// はてなツールチップ（position:fixed で overflow の影響を回避）
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.gym-hatena-wrapper').forEach(wrapper => {
        const icon = wrapper.querySelector('.gym-hatena-icon');
        const tooltip = wrapper.querySelector('.gym-hatena-tooltip');
        if (icon && tooltip) {
            icon.addEventListener('mouseenter', () => {
                const rect = icon.getBoundingClientRect();
                tooltip.style.left = (rect.left + rect.width / 2) + 'px';
                tooltip.style.top = (rect.top - 8) + 'px';
                tooltip.style.transform = 'translate(-50%, -100%)';
                tooltip.style.display = 'block';
            });
            icon.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        }
    });
});

// トースト通知
let toastTimer = null;
function showToast(message, duration = 2000) {
    const el = document.getElementById('toastNotification');
    el.textContent = message;
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        el.classList.remove('show');
    }, duration);
}

function doGymTraining() {
    const selected = document.querySelector('input[name="gymMenu"]:checked');
    if (!selected) {
        showToast('メニューを選択してください');
        return;
    }

    const menu = gymMenus[selected.value];
    const p = gameState.player;

    // 病気チェック
    if (p.disease) {
        const diseaseInfo = diseasesData.find(d => d.id === p.disease);
        showToast(`${diseaseInfo ? diseaseInfo.name : '病気'}のためトレーニングできません。。。`, 2000);
        return;
    }

    // クールダウンチェック（30分）※テスト用: 無効化
    /* if (gameState.lastGymTime) {
        const elapsed = Date.now() - new Date(gameState.lastGymTime).getTime();
        const cooldownMs = 30 * 60 * 1000;
        if (elapsed < cooldownMs) {
            const remaining = cooldownMs - elapsed;
            const min = Math.floor(remaining / 60000);
            const sec = Math.floor((remaining % 60000) / 1000);
            showToast(`まだ30分経過していません。\n次のトレーニングまであと ${min}分${sec.toString().padStart(2, '0')}秒`, 3000);
            return;
        }
    } */

    const playerBmi = calculateBMI(p);

    // BMIチェック
    if (playerBmi < menu.bmi[0] || playerBmi > menu.bmi[1]) {
        showToast('体格指数（BMI）が条件を満たしていません');
        return;
    }

    // 所持金チェック
    if (p.money < menu.price) {
        showToast('所持金が足りません');
        return;
    }

    // 身体パワーチェック
    if (p.health < menu.bodyConsume) {
        showToast('身体パワーが足りません');
        return;
    }

    // 支払い＆消費
    changeMoney(-menu.price);
    changeHealth(-menu.bodyConsume);
    const weightLoss = menu.calorie / 1000;
    changeWeight(-weightLoss);

    // クールダウン開始時刻を記録
    gameState.lastGymTime = new Date().toISOString();

    // 能力値を加算
    const abilities = p.abilities;
    for (const key in menu.stats) {
        if (key in abilities && menu.stats[key]) {
            abilities[key] += menu.stats[key];
        }
    }

    updateStatus();

    // 結果表示（画面切り替え）
    let statsHtml = '<div class="shokudo-eat-changes">';
    for (const [key, value] of Object.entries(menu.stats)) {
        if (value > 0) {
            statsHtml += `<div class="shokudo-change-row">
                <span class="shokudo-change-label">${key}</span>
                <span class="shokudo-change-plus">+${value}</span>
            </div>`;
        }
    }
    statsHtml += `<div class="shokudo-change-row">
        <span class="shokudo-change-label">消費カロリー</span>
        <span class="shokudo-change-plus">${menu.calorie}kcal</span>
    </div>
    <div class="shokudo-change-row">
        <span class="shokudo-change-label">体重</span>
        <span class="shokudo-change-plus">-${weightLoss.toFixed(1)}kg</span>
    </div>`;
    statsHtml += '</div>';

    document.getElementById('gymResultMessage').textContent = `${menu.name}をしました！`;
    document.getElementById('gymResultStats').innerHTML = statsHtml;

    // ジムモーダル内でテーブルビューを隠して結果ビューを表示
    document.getElementById('gymTableView').style.display = 'none';
    document.getElementById('gymResultView').style.display = 'flex';

    gameState.pendingRandomEvent = true;
    afterAction();
}

// BGM
// ↓ここに曲を追加するだけでランダム再生されます♪
const onsenBgmList = [
    'BGM/onsen-ryokan-1.mp3',
    'BGM/onsen-ryokan-3.mp3',
    'BGM/onsen-ryokan-6.mp3',
    'BGM/onsen-ryokan-7.mp3',
    'BGM/onsen-ryokan-8.mp3',
    'BGM/onsen-ryokan-9.mp3',
    'BGM/onsen-ryokan-15.mp3',
    'BGM/onsen-ryokan-16.mp3',
    'BGM/onsen-ryokan-17.mp3',
    'BGM/onsen-ryokan-18.mp3',
    'BGM/onsen-ryokan-19.mp3',
    'BGM/onsen-ryokan-20.mp3',
];

let bgmPlaying = false;
let lastBgmIndex = -1;
const bgmAudio = new Audio();
bgmAudio.volume = 0.50;

function playRandomBgm() {
    let index;
    if (onsenBgmList.length === 1) {
        index = 0;
    } else {
        do {
            index = Math.floor(Math.random() * onsenBgmList.length);
        } while (index === lastBgmIndex);
    }
    lastBgmIndex = index;
    bgmAudio.src = onsenBgmList[index];
    bgmAudio.play();
}

// 曲が終わったら次のランダム曲を再生
bgmAudio.addEventListener('ended', () => {
    if (bgmPlaying) {
        playRandomBgm();
    }
});

function toggleBgm() {
    if (bgmPlaying) {
        bgmAudio.pause();
        bgmPlaying = false;
    } else {
        playRandomBgm();
        bgmPlaying = true;
    }
}

// 温泉施設
let onsenBgTimer = null;
let onsenRecoveryTimer = null;

function openOnsenLobby() {
    document.getElementById('onsenLobbyView').style.display = '';
    document.getElementById('onsenBathView').style.display = 'none';
    document.getElementById('onsenShopView').style.display = 'none';
    document.getElementById('onsenShopCompleteView').style.display = 'none';
    document.getElementById('onsenLobbyCloseBtn').style.display = '';
    const mc = document.querySelector('#onsenModal .modal-content');
    mc.classList.add('onsen-lobby-mode');
    mc.classList.remove('onsen-shop-mode');
    document.getElementById('onsenModal').classList.add('active');

    // 時間帯別背景画像
    const hour = new Date().getHours();
    let bgImg = 'haikei/onsen3.jpg';
    if (hour >= 5 && hour < 15) bgImg = 'haikei/onsen3.jpg';
    else if (hour >= 15 && hour < 18) bgImg = 'haikei/onsen4.jpg';
    else bgImg = 'haikei/onsen5.jpg';
    const imgEl = document.getElementById('onsenLobbyImg');
    if (imgEl) imgEl.src = bgImg;
}

function closeOnsenLobbyAndOpenShop() {
    openOnsenShop();
}

function normalBath() {
    if (gameState.player.money < 1500) {
        showToast('所持金が足りません（入浴料：1,500円）');
        return;
    }
    changeMoney(-1500);
    updateStatus();

    const p = gameState.player;
    const healthPercent = p.health / p.maxHealth * 100;
    const intelligencePercent = p.intelligence / p.maxIntelligence * 100;
    document.getElementById('onsenHealth').textContent = p.health;
    document.getElementById('onsenMaxHealth').textContent = p.maxHealth;
    document.getElementById('onsenHealthBar').style.width = healthPercent + '%';
    document.getElementById('onsenHealthBar').style.background = getBarColor(healthPercent);

    document.getElementById('onsenIntelligence').textContent = p.intelligence;
    document.getElementById('onsenMaxIntelligence').textContent = p.maxIntelligence;
    document.getElementById('onsenIntelligenceBar').style.width = intelligencePercent + '%';
    document.getElementById('onsenIntelligenceBar').style.background = getBarColor(intelligencePercent);

    // ロビーを隠して入浴ビューを表示
    document.getElementById('onsenLobbyView').style.display = 'none';
    document.getElementById('onsenBathView').style.display = '';
    document.getElementById('onsenLobbyCloseBtn').style.display = 'none';
    document.querySelector('#onsenModal .modal-content').classList.remove('onsen-lobby-mode');
    document.getElementById('onsenModal').classList.add('active');

    // 背景画像の交互切り替え開始
    const img = document.getElementById('onsenBgImg');
    let isFirst = true;
    img.src = 'haikei/onsen.png';
    onsenBgTimer = setInterval(() => {
        isFirst = !isFirst;
        img.src = isFirst ? 'haikei/onsen.png' : 'haikei/onsen2.png';
    }, 2000);

    // 10倍速回復（3秒に1ポイント）
    onsenRecoveryTimer = setInterval(() => {
        const pl = gameState.player;
        let recovered = false;
        if (pl.health < pl.maxHealth) {
            pl.health = Math.min(pl.maxHealth, pl.health + 1);
            recovered = true;
        }
        if (pl.intelligence < pl.maxIntelligence) {
            pl.intelligence = Math.min(pl.maxIntelligence, pl.intelligence + 1);
            recovered = true;
        }
        if (recovered) {
            const hp = pl.health / pl.maxHealth * 100;
            const ip = pl.intelligence / pl.maxIntelligence * 100;
            document.getElementById('onsenHealth').textContent = pl.health;
            document.getElementById('onsenHealthBar').style.width = hp + '%';
            document.getElementById('onsenHealthBar').style.background = getBarColor(hp);
            document.getElementById('onsenIntelligence').textContent = pl.intelligence;
            document.getElementById('onsenIntelligenceBar').style.width = ip + '%';
            document.getElementById('onsenIntelligenceBar').style.background = getBarColor(ip);
            updateStatus();
        }
    }, 3000);
}

function closeOnsenModal() {
    // タイマー停止
    if (onsenBgTimer) {
        clearInterval(onsenBgTimer);
        onsenBgTimer = null;
    }
    if (onsenRecoveryTimer) {
        clearInterval(onsenRecoveryTimer);
        onsenRecoveryTimer = null;
    }
    // BGM停止
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmPlaying = false;
    document.getElementById('onsenModal').classList.remove('active');
    // ビューをロビーに戻す
    document.getElementById('onsenLobbyView').style.display = '';
    document.getElementById('onsenBathView').style.display = 'none';
    document.getElementById('onsenShopView').style.display = 'none';
    document.getElementById('onsenShopCompleteView').style.display = 'none';
    document.getElementById('onsenLobbyCloseBtn').style.display = '';
    const mc = document.querySelector('#onsenModal .modal-content');
    mc.classList.add('onsen-lobby-mode');
    mc.classList.remove('onsen-shop-mode');
    // ランダムイベント判定
    flushRandomEvent();
}

function adBath() {
    // TODO: 広告風呂の処理
}

// ============================================
// 木のコイン
// ============================================
function getTreePositions() {
    const positions = [];
    const useNewFormat = typeof townMapBg !== 'undefined' && townMapBg !== null
                      && typeof townMapIcon !== 'undefined' && townMapIcon !== null;

    if (useNewFormat) {
        // 新フォーマット：描画と同じ townMapIcon を参照して木タイルを検索
        for (let y = 0; y < townMapIcon.length; y++) {
            for (let x = 0; x < townMapIcon[y].length; x++) {
                const icon = townMapIcon[y][x];
                const placeId = (icon && tileToPlace[icon]) || icon;
                if (placeId === 'tree') {
                    positions.push({ y, x });
                }
            }
        }
    } else {
        // 旧フォーマット：townMap を参照
        for (let y = 0; y < townMap.length; y++) {
            for (let x = 0; x < townMap[y].length; x++) {
                if (townMap[y][x] === 'tree') {
                    positions.push({ y, x });
                }
            }
        }
    }
    return positions;
}

function initDailyCoin() {
    const today = todayStr();
    if (gameState.coinTree.date === today) {
        // 保存された座標が現在のマップの木タイルか確認（マップ変更で無効になる場合がある）
        const positions = getTreePositions();
        const isValid = positions.some(p => p.y === gameState.coinTree.y && p.x === gameState.coinTree.x);
        if (isValid) return;
        // 無効な座標なら再初期化
    }

    const positions = getTreePositions();
    if (!positions.length) return;
    const pos = positions[Math.floor(Math.random() * positions.length)];

    // 確率：500(50%) 1000(30%) 3000(12%) 5000(6%) 10000(2%)
    const rand = Math.random() * 100;
    let amount;
    if (rand < 50) amount = 500;
    else if (rand < 80) amount = 1000;
    else if (rand < 92) amount = 3000;
    else if (rand < 98) amount = 5000;
    else amount = 10000;

    gameState.coinTree = {
        date: today,
        y: pos.y,
        x: pos.x,
        amount: amount,
        collected: false
    };
}

function checkTreeCoin(y, x) {
    initDailyCoin();
    const coin = gameState.coinTree;
    if (!coin.collected && coin.y === y && coin.x === x) {
        const msg = coin.amount === 10000
            ? `超ラッキー！！${coin.amount.toLocaleString()}円を見つけた！！`
            : `ラッキー！${coin.amount.toLocaleString()}円を見つけた！`;
        document.getElementById('treeCoinMessage').textContent = msg;
        changeMoney(coin.amount);
        coin.collected = true;
        document.getElementById('treeCoinModal').classList.add('active');
    }
}

function collectCoin() {
    closeTreeCoinModal();
}

function closeTreeCoinModal() {
    document.getElementById('treeCoinModal').classList.remove('active');
}


// 神社
function pray() {
    if (gameState.player.money < 100) {
        return;
    }
    changeMoney(-100);
    const luck = Math.random();
    if (luck < 0.3) {
        changeMoney(500);
    } else {
        changeHealth(10);
    }
    afterAction();
}

function drawFortune() {
    if (gameState.player.money < 200) {
        return;
    }
    changeMoney(-200);
    const fortunes = [
        { name: '大吉', effect: () => { changeMoney(1000); return '臨時収入1000円！'; } },
        { name: '吉', effect: () => { changeHealth(20); return '体力+20！'; } },
        { name: '中吉', effect: () => { changeIntelligence(5); return '知力+5！'; } },
        { name: '小吉', effect: () => { changeHealth(10); return '体力+10！'; } },
        { name: '末吉', effect: () => { return '今日は静かに過ごしましょう'; } },
        { name: '凶', effect: () => { changeHealth(-5); return 'ちょっと疲れました...'; } }
    ];
    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    fortune.effect();
    afterAction();
}

// 学校


// ※ランダムイベント・病気チェック → event.js に移動

// ============================================
// 能力値ツールチップ（アバターホバー）
// ============================================
function buildAbilityTooltip() {
    const abilities = gameState.player.abilities;
    const values = Object.values(abilities);
    const maxVal = Math.max(...values, 1);

    let html = '<div class="ab-title">現在の能力値</div>';
    for (const [name, val] of Object.entries(abilities)) {
        const pct = Math.max((val / maxVal) * 100, 15);
        html += `<div class="ab-row">
            <span class="ab-name">${name}</span>
            <div class="ab-bar-outer">
                <div class="ab-bar-inner" style="width:${pct}%">
                    <span class="ab-num">${val}</span>
                </div>
            </div>
        </div>`;
    }
    return html;
}

document.addEventListener('DOMContentLoaded', () => {
    const avatar = document.getElementById('playerAvatar');
    const tooltip = document.getElementById('abilityTooltip');
    if (!avatar || !tooltip) return;

    avatar.addEventListener('mouseenter', () => {
        tooltip.innerHTML = buildAbilityTooltip();
        tooltip.style.display = 'block';

        const rect = avatar.getBoundingClientRect();
        const tw = tooltip.offsetWidth;
        const th = tooltip.offsetHeight;

        // アバターの左側に表示、はみ出したら右側に
        let left = rect.left - tw - 10;
        if (left < 5) left = rect.right + 10;

        // 上端が画面外に出ないよう調整
        let top = rect.top;
        if (top + th > window.innerHeight - 10) {
            top = window.innerHeight - th - 10;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    });

    avatar.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });
});

// ============================================
// 病院
// ============================================
function openHospitalModal() {
    const p = gameState.player;
    const diseaseInfo = p.disease ? diseasesData.find(d => d.id === p.disease) : null;

    // 診察画面をリセット
    document.getElementById('hospitalMainView').style.display = 'block';
    document.getElementById('hospitalCompleteView').style.display = 'none';

    if (diseaseInfo) {
        document.getElementById('hospitalModalDesc').innerHTML = diseaseInfo.doctorMsg;
        document.getElementById('hospitalModalButtons').innerHTML = `
            <button class="btn btn-primary hospital-action-btn" onclick="treatDisease()">お願いします</button>
            <button class="btn hospital-cancel-btn" onclick="closeHospitalModal()">ぼったくりっぽいのでやめる</button>
        `;
    } else {
        document.getElementById('hospitalModalDesc').innerHTML = 'どこも悪いところはないようです。<br>念のため注射を打っておきますか？<br>10,000円かかりますが。。。';
        document.getElementById('hospitalModalButtons').innerHTML = `
            <button class="btn btn-primary hospital-action-btn" onclick="preventiveShot()">お願いします</button>
            <button class="btn hospital-cancel-btn" onclick="closeHospitalModal()">金を取られる前に退散する</button>
        `;
    }

    document.getElementById('hospitalModal').classList.add('active');
}

function closeHospitalModal() {
    document.getElementById('hospitalModal').classList.remove('active');
    flushRandomEvent();
}

function treatDisease() {
    const p = gameState.player;
    const diseaseInfo = p.disease ? diseasesData.find(d => d.id === p.disease) : null;
    if (!diseaseInfo) return;

    if (p.money < diseaseInfo.cost) {
        showToast('お金が足りません。。。', 2000);
        return;
    }

    p.money -= diseaseInfo.cost;
    p.disease = null;
    gameState.pendingRandomEvent = true;
    updateStatus();

    document.getElementById('hospitalMainView').style.display = 'none';
    document.getElementById('hospitalCompleteMsg').innerHTML = '病気の治療が完了しました。<br>これでもう安心です。<br>病気の際はまた当院をご利用くださいませ。';
    document.getElementById('hospitalCompleteView').style.display = 'block';
}

function preventiveShot() {
    const p = gameState.player;

    if (p.money < 10000) {
        showToast('お金が足りません。。。', 2000);
        return;
    }

    p.money -= 10000;
    gameState.pendingRandomEvent = true;
    updateStatus();

    document.getElementById('hospitalMainView').style.display = 'none';
    document.getElementById('hospitalCompleteMsg').innerHTML = 'これで風邪予防は万全です。<br>まぁ、だからと言って体調に何の変化もありませんがね。<br>ぜひまたお待ちしております。';
    document.getElementById('hospitalCompleteView').style.display = 'block';
}

// ============================================
// 起動
// ============================================
window.addEventListener('DOMContentLoaded', init);
