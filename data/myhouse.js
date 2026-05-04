// ============================================
// マイホーム
// ============================================
const myhouseContentDefs = {
    bulletin: { name: '共同掲示板', icon: '📋' },
    shop:     { name: 'ショップ', icon: '🏪' },
    url:      { name: 'ウェブリンク', icon: '🌐' },
    diary:    { name: '家主掲示板', icon: '📖' },
};

let myhouseMode = 'view'; // 'view' | 'settings'
let myhouseActiveContent = null;
let myhouseActiveSetting = null;

function openMyHome() {
    const house = gameState.player.house;
    if (!house) return;

    myhouseMode = 'view';
    myhouseActiveSetting = null;
    document.getElementById('myhouseModal').classList.remove('settings-mode');

    const contents = house.contents || [];
    const homeId = house.homeContent || 'bulletin';
    myhouseActiveContent = contents.includes(homeId) ? homeId : (contents[0] || null);

    renderMyhouseSidebar();
    if (myhouseActiveContent) {
        renderMyhouseContent(myhouseActiveContent, document.getElementById('myhouseRight'));
    } else {
        document.getElementById('myhouseRight').innerHTML = '';
    }
    document.getElementById('myhouseModal').style.display = 'flex';
}

function renderMyhouseSidebar() {
    const sidebar = document.getElementById('myhouseSidebar');
    const house = gameState.player.house;
    const contents = (house && house.contents) || [];

    if (myhouseMode === 'view') {
        let contentHtml = '';
        if (contents.length === 0) {
            contentHtml = '<p class="myhouse-sb-empty">コンテンツがありません</p>';
        } else {
            contentHtml = contents.map(id => {
                const def = myhouseContentDefs[id] || { name: id, icon: '🏠' };
                const isActive = id === myhouseActiveContent;
                const title = getContentTitle(id);
                return `<button class="myhouse-sb-btn${isActive ? ' active' : ''}" onclick="selectMyhouseContent('${id}', this)">${title}</button>`;
            }).join('');
        }
        sidebar.innerHTML = `
            <div class="myhouse-sb-content">${contentHtml}</div>
            <div class="myhouse-sb-footer">
                <button class="myhouse-sb-setting-btn" onclick="openSaisenModal()"><img src="status/mail/coin.svg" class="myhouse-setting-icon saisen-btn-icon">お賽銭する</button>
                <button class="myhouse-sb-setting-btn" onclick="switchMyhouseToSettings()">
                    <img src="status/mail/haguruma.png" class="myhouse-setting-icon">おうち設定
                </button>
            </div>`;
    } else {
        const allDefs = [
            { id: 'bulletin', def: myhouseContentDefs.bulletin },
            { id: 'shop',     def: myhouseContentDefs.shop },
            { id: 'url',      def: myhouseContentDefs.url },
            { id: 'diary',    def: myhouseContentDefs.diary },
        ];
        const contentSubHtml = allDefs.map(({ id, def }) => {
            const isActive = myhouseActiveSetting === `content_${id}`;
            return `<button class="myhouse-sb-sub-btn${isActive ? ' active' : ''}" onclick="selectMyhouseSetting('content_${id}', this)">${def.name}</button>`;
        }).join('');
        const kisekaeActive  = myhouseActiveSetting === 'kisekae';
        const exteriorActive = myhouseActiveSetting === 'exterior';
        const sellActive     = myhouseActiveSetting === 'sell';
        sidebar.innerHTML = `
            <div class="myhouse-sb-content">
                <button class="myhouse-sb-top-btn${kisekaeActive ? ' active' : ''}" onclick="selectMyhouseSetting('kisekae', this)">🎨 きせかえ</button>
                <p class="myhouse-sb-section-label">コンテンツ設定</p>
                ${contentSubHtml}
                <p class="myhouse-sb-section-label">おうち全般</p>
                <button class="myhouse-sb-sub-btn${exteriorActive ? ' active' : ''}" onclick="selectMyhouseSetting('exterior', this)">🏠 外装変更</button>
                <button class="myhouse-sb-sub-btn${sellActive ? ' active' : ''}" onclick="selectMyhouseSetting('sell', this)">💰 売却</button>
            </div>
            <div class="myhouse-sb-footer">
                <button class="myhouse-sb-back-btn" onclick="switchMyhouseToView()">← 本番に戻る</button>
            </div>`;
    }
}

function selectMyhouseContent(id, btn) {
    myhouseActiveContent = id;
    const backBtn = document.getElementById('diaryComposeBackBtn');
    if (backBtn) backBtn.style.display = 'none';
    renderMyhouseSidebar();
    renderMyhouseContent(id, document.getElementById('myhouseRight'));
}

function switchMyhouseToSettings() {
    myhouseMode = 'settings';
    myhouseActiveSetting = null;
    document.getElementById('myhouseModal').classList.add('settings-mode');
    renderMyhouseSidebar();
    document.getElementById('myhouseRight').innerHTML = '';
}

function switchMyhouseToView() {
    myhouseMode = 'view';
    myhouseActiveContent = null;
    document.getElementById('myhouseModal').classList.remove('settings-mode');
    renderMyhouseSidebar();
    document.getElementById('myhouseRight').innerHTML = '';
}

function selectMyhouseSetting(id, btn) {
    myhouseActiveSetting = id;
    renderMyhouseSidebar();
    renderMyhouseSettingArea(id);
}

function renderMyhouseSettingArea(id) {
    const right = document.getElementById('myhouseRight');
    if (id === 'kisekae') {
        right.innerHTML = `<div class="myhouse-placeholder">
            <div class="myhouse-placeholder-icon">🎨</div>
            <div class="myhouse-placeholder-name">きせかえ</div>
            <p class="myhouse-placeholder-msg">準備中です。<br>もうしばらくお待ちください！</p>
        </div>`;
        return;
    }
    if (id.startsWith('content_')) {
        renderContentSettingArea(id.replace('content_', ''));
        return;
    }
    if (id === 'exterior') {
        right.innerHTML = `<div class="myhouse-placeholder">
            <div class="myhouse-placeholder-icon">🏠</div>
            <div class="myhouse-placeholder-name">外装変更</div>
            <p class="myhouse-placeholder-msg">準備中です。<br>もうしばらくお待ちください！</p>
        </div>`;
        return;
    }
    if (id === 'sell') {
        right.innerHTML = `<div class="myhouse-sell-area">
            <p class="myhouse-sell-title">🏠 家を売却する</p>
            <p class="myhouse-sell-desc">家を売却すると、住所がなくなります。<br>よく考えてから決めてください。</p>
            <button class="myhouse-sell-btn" onclick="alert('売却機能は準備中です。')">家を売却する</button>
        </div>`;
        return;
    }
}

function renderMyhouseContent(contentId, container) {
    if (contentId === 'bulletin') {
        renderBulletinContent(container);
        return;
    }
    if (contentId === 'url') {
        renderUrlSpaceContent(container);
        return;
    }
    if (contentId === 'diary') {
        renderDiaryContent(container);
        return;
    }
    if (contentId === 'shop') {
        renderMyhouseShopContent(container);
        return;
    }
    const def = myhouseContentDefs[contentId] || { name: contentId, icon: '🏠' };
    container.innerHTML = `
        <div class="myhouse-placeholder">
            <div class="myhouse-placeholder-icon">${def.icon}</div>
            <div class="myhouse-placeholder-name">${def.name}</div>
            <p class="myhouse-placeholder-msg">このコンテンツは準備中です。<br>もうしばらくお待ちください！</p>
        </div>`;
}

// ============================================
// マイホーム ショップ コンテンツビュー
// ============================================
let myhouseShopCart = [];

function renderMyhouseShopContent(container) {
    container.innerHTML = `
        <div class="myhouse-shop-view">
            <div class="myhouse-shop-cart-bar">
                <p class="myhouse-shop-desc">${escapeHtml(gameState.player.shopDescription || '')}</p>
                <button class="shop2-cart-open-btn" onclick="openMyhouseShopCart()">
                    <img src="public/icon/cart.png" alt="カート">
                    カートを見る
                    <span class="shop2-cart-badge" id="myhouseShopCartBadge" style="display:none;"></span>
                </button>
            </div>
            <div class="myhouse-shop-listview">
                <div class="shop2-table-container">
                    <table class="shop2-table" id="myhouseShopTable">
                        <thead>
                            <tr class="shop2-header-group">
                                <th rowspan="2">商品名</th>
                                <th colspan="14">アップする能力値</th>
                                <th colspan="2">消費パワー</th>
                                <th rowspan="2">使用<br>回数</th>
                                <th rowspan="2">使用<br>間隔</th>
                                <th rowspan="2">価格</th>
                                <th rowspan="2">在庫</th>
                            </tr>
                            <tr class="shop2-header-sub">
                                <th>国</th><th>数</th><th>理</th><th>社</th><th>英</th>
                                <th>音</th><th>美</th><th>体</th><th>気</th><th>ル</th>
                                <th>素</th><th>面</th><th>優</th><th>エ</th>
                                <th>身体</th><th>頭脳</th>
                            </tr>
                        </thead>
                        <tbody id="myhouseShopTableBody"></tbody>
                    </table>
                </div>
            </div>
            <div class="shop2-cart-overlay" id="myhouseShopCartPanel" style="display:none;">
                <div class="shop2-cart-tab" onclick="closeMyhouseShopCart()">閉じる</div>
                <div class="shop2-cart-overlay-body">
                    <div class="shop2-right-money">
                        現在の所持金<br>
                        <span id="myhouseShopMoneyValue">0円</span>
                    </div>
                    <div class="shop2-cart-title">カート</div>
                    <div class="shop2-cart-items" id="myhouseShopCartItems">
                        <p class="shop2-cart-empty">商品を選んでください</p>
                    </div>
                    <div class="shop2-cart-total">
                        <span>合計</span>
                        <span id="myhouseShopCartTotal">0円</span>
                    </div>
                    <button class="shop2-purchase-btn" id="myhouseShopPurchaseBtn" onclick="alert('購入機能は準備中です。')">購入する</button>
                </div>
            </div>
        </div>`;

    myhouseShopCart = [];
    renderMyhouseShopTable();
}

function renderMyhouseShopTable() {
    const tbody = document.getElementById('myhouseShopTableBody');
    if (!tbody) return;

    const abilities = ['国語', '数学', '理科', '社会', '英語', '音楽', '美術', '体力', '気力', 'ルックス', '素早さ', '面白さ', '優しさ', 'エロさ'];

    const itemGenreMap = {};
    const itemOrderMap = {};
    {
        const genreMap = new Map();
        const genreOrder = [];
        let cg = null;
        for (const item of [...shopItems, ...tonyaItems]) {
            if (item.type === 'separator') {
                cg = item.name;
                if (!genreMap.has(cg)) { genreMap.set(cg, []); genreOrder.push(cg); }
            } else if (item.name && cg) {
                const arr = genreMap.get(cg);
                if (!arr.includes(item.name)) arr.push(item.name);
            }
        }
        genreOrder.forEach((genre, gi) => {
            genreMap.get(genre).forEach((name, ii) => {
                itemGenreMap[name] = genre;
                itemOrderMap[name] = gi * 10000 + ii;
            });
        });
    }

    let listedInv = (gameState.shopInventory || []).filter(inv => inv.listed === true && inv.sellPrice > 0);
    listedInv = [...listedInv].sort((a, b) => (itemOrderMap[a.name] ?? 999) - (itemOrderMap[b.name] ?? 999));

    if (listedInv.length === 0) {
        tbody.innerHTML = `<tr><td colspan="21" class="shopinv-empty">陳列中の商品がありません。</td></tr>`;
        return;
    }

    let html = '';
    let lastGenre = null;
    for (const inv of listedInv) {
        const genre = itemGenreMap[inv.name] || '';
        if (genre !== lastGenre) {
            lastGenre = genre;
            html += `<tr class="separator-row"><td colspan="21">${escapeHtml(genre)}</td></tr>`;
        }
        const master = shopItems.find(i => i.name === inv.name) || tonyaItems.find(i => i.name === inv.name) || {};
        const stats = master.stats || {};
        const stockEntry = (gameState.shopStock || []).find(s => s.name === inv.name);
        const displayQty = inv.sellQty !== undefined ? Math.min(inv.sellQty, stockEntry?.quantity || 0) : (stockEntry?.quantity || 0);
        const inCart = myhouseShopCart.some(c => c.name === inv.name);
        const safeNameJs = JSON.stringify(inv.name).replace(/"/g, '&quot;');

        html += `<tr>`;
        html += `<td class="shop2-item-name"><label><input type="checkbox" class="shop2-checkbox myhouse-shop-cb" data-name="${escapeHtml(inv.name)}" ${inCart ? 'checked' : ''} onchange="myhouseShopToggleCart(${safeNameJs}, this.checked)"> ${escapeHtml(inv.name)}</label></td>`;
        for (const ab of abilities) { html += `<td>${stats[ab] || ''}</td>`; }
        html += `<td>${master.bodyConsume || ''}</td>`;
        html += `<td>${master.brainConsume || ''}</td>`;
        html += `<td>${master.useCount || ''}</td>`;
        html += `<td>${master.cooldown || ''}</td>`;
        html += `<td class="shop2-price">${inv.sellPrice.toLocaleString()}円</td>`;
        html += `<td>${displayQty}</td>`;
        html += `</tr>`;
    }
    tbody.innerHTML = html;
}


function myhouseShopToggleCart(itemName, checked) {
    if (checked) {
        const inv = (gameState.shopInventory || []).find(i => i.name === itemName);
        if (inv && !myhouseShopCart.some(c => c.name === itemName)) {
            myhouseShopCart.push({ name: itemName, price: inv.sellPrice, qty: 1 });
        }
    } else {
        const idx = myhouseShopCart.findIndex(c => c.name === itemName);
        if (idx !== -1) myhouseShopCart.splice(idx, 1);
    }
    updateMyhouseShopCartBadge();
    updateMyhouseShopCartPanel();
}

function myhouseShopCartChangeQty(itemName, delta) {
    const item = myhouseShopCart.find(c => c.name === itemName);
    if (!item) return;
    const inv = (gameState.shopInventory || []).find(i => i.name === itemName);
    const stockEntry = (gameState.shopStock || []).find(s => s.name === itemName);
    const maxQty = inv?.sellQty !== undefined
        ? Math.min(inv.sellQty, stockEntry?.quantity || 0)
        : (stockEntry?.quantity || 0);
    item.qty = Math.max(1, Math.min(maxQty, item.qty + delta));
    updateMyhouseShopCartBadge();
    updateMyhouseShopCartPanel();
}

function myhouseShopCartRemove(itemName) {
    const idx = myhouseShopCart.findIndex(c => c.name === itemName);
    if (idx !== -1) myhouseShopCart.splice(idx, 1);
    // テーブルのチェックボックスも外す
    document.querySelectorAll('.myhouse-shop-cb').forEach(cb => {
        if (cb.dataset.name === itemName) cb.checked = false;
    });
    updateMyhouseShopCartBadge();
    updateMyhouseShopCartPanel();
}

function updateMyhouseShopCartBadge() {
    const badge = document.getElementById('myhouseShopCartBadge');
    if (!badge) return;
    const count = myhouseShopCart.reduce((s, c) => s + c.qty, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
}

function updateMyhouseShopCartPanel() {
    const itemsEl = document.getElementById('myhouseShopCartItems');
    const totalEl = document.getElementById('myhouseShopCartTotal');
    if (!itemsEl) return;
    const btn = document.getElementById('myhouseShopPurchaseBtn');
    if (myhouseShopCart.length === 0) {
        itemsEl.innerHTML = '<p class="shop2-cart-empty">商品を選んでください</p>';
        if (totalEl) totalEl.textContent = '0円';
        if (btn) btn.classList.remove('active');
        return;
    }
    let total = 0;
    itemsEl.innerHTML = myhouseShopCart.map(c => {
        const lineTotal = c.price * c.qty;
        total += lineTotal;
        const safeNameJs = JSON.stringify(c.name).replace(/"/g, '&quot;');
        return `<div class="shop2-cart-item">
            <span class="shop2-cart-name">${escapeHtml(c.name)}</span>
            <div class="shop2-cart-qty">
                <button class="shop2-qty-btn" onclick="myhouseShopCartChangeQty(${safeNameJs}, -1)">－</button>
                <span class="shop2-qty-num">${c.qty}</span>
                <button class="shop2-qty-btn" onclick="myhouseShopCartChangeQty(${safeNameJs}, 1)">＋</button>
            </div>
            <span class="shop2-cart-price">${lineTotal.toLocaleString()}円</span>
            <button class="shop2-cart-delete" onclick="myhouseShopCartRemove(${safeNameJs})">
                <img src="public/icon/dustbox2.png" alt="削除">
            </button>
        </div>`;
    }).join('');
    if (totalEl) totalEl.textContent = total.toLocaleString() + '円';
    if (btn) btn.classList.toggle('active', myhouseShopCart.length > 0);
}

function openMyhouseShopCart() {
    const panel = document.getElementById('myhouseShopCartPanel');
    if (!panel) return;
    const moneyEl = document.getElementById('myhouseShopMoneyValue');
    if (moneyEl) moneyEl.textContent = (gameState.player?.money || 0).toLocaleString() + '円';
    updateMyhouseShopCartPanel();
    panel.classList.remove('closing');
    panel.style.display = '';
}

function closeMyhouseShopCart() {
    const panel = document.getElementById('myhouseShopCartPanel');
    if (!panel || panel.style.display === 'none') return;
    panel.classList.add('closing');
    panel.addEventListener('animationend', () => {
        panel.classList.remove('closing');
        panel.style.display = 'none';
    }, { once: true });
}

let urlSlideshowImages = [];
let urlSlideshowIndex  = 0;

function renderUrlSpaceContent(container) {
    const s = (gameState.player.house && gameState.player.house.urlSpace) || {};
    urlSlideshowIndex = 0;

    if (s.hidden) {
        container.innerHTML = `<p class="myhouse-url-empty">URLスペースは非表示に設定されています。</p>`;
        return;
    }

    const images = (s.images || []).filter(Boolean);
    const hasUrl = !!s.url;

    if (!images.length && !hasUrl) {
        container.innerHTML = `<p class="myhouse-url-empty">URLがまだ設定されていません。</p>`;
        return;
    }

    urlSlideshowImages = images;

    let domain = '';
    if (hasUrl) { try { domain = new URL(s.url).hostname; } catch(e) { domain = s.url; } }
    const displayLabel = s.label || domain;

    const counterHtml = images.length > 1
        ? `<span class="url-slideshow-counter" id="urlSlideshowCounter">1 / ${images.length}</span>`
        : '';
    const arrowsHtml = images.length > 1
        ? `<button class="url-slideshow-arrow url-slideshow-prev" onclick="prevUrlSlide()"><img src="house/icon/yajirusi.svg" style="width:18px;transform:scaleX(-1);"></button>
           <button class="url-slideshow-arrow url-slideshow-next" onclick="nextUrlSlide()"><img src="house/icon/yajirusi.svg" style="width:18px;"></button>`
        : '';
    const slideshowHtml = images.length
        ? `<div class="myhouse-url-slideshow">
               ${arrowsHtml}
               ${counterHtml}
               <img id="urlSlideshowImg" src="${images[0]}" class="url-slideshow-img" alt="プレビュー">
           </div>`
        : '';
    const linkHtml = hasUrl
        ? `<div class="myhouse-url-fallback">
               <span class="myhouse-url-fallback-label">${escapeHtml(displayLabel)}</span>
               <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer"
                   class="myhouse-url-open-btn">開いてみる <img src="house/icon/open.svg" style="width:18px;vertical-align:middle;margin-bottom:2px;"></a>
           </div>`
        : '';

    container.innerHTML = `<div class="myhouse-url-view">${slideshowHtml}${linkHtml}</div>`;
}

function prevUrlSlide() {
    if (urlSlideshowImages.length <= 1) return;
    urlSlideshowIndex = (urlSlideshowIndex - 1 + urlSlideshowImages.length) % urlSlideshowImages.length;
    updateUrlSlideshow();
}
function nextUrlSlide() {
    if (urlSlideshowImages.length <= 1) return;
    urlSlideshowIndex = (urlSlideshowIndex + 1) % urlSlideshowImages.length;
    updateUrlSlideshow();
}
function goToUrlSlide(i) {
    urlSlideshowIndex = i;
    updateUrlSlideshow();
}
function updateUrlSlideshow() {
    const img = document.getElementById('urlSlideshowImg');
    if (img) img.src = urlSlideshowImages[urlSlideshowIndex];
    const counter = document.getElementById('urlSlideshowCounter');
    if (counter) counter.textContent = `${urlSlideshowIndex + 1} / ${urlSlideshowImages.length}`;
}

function compressImage(file, maxW = 1920, quality = 0.95) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/webp', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function handleUrlImageUpload(index, input) {
    if (!input.files || !input.files[0]) return;
    const compressed = await compressImage(input.files[0]);
    if (!gameState.player.house.urlSpace) gameState.player.house.urlSpace = {};
    if (!gameState.player.house.urlSpace.images) gameState.player.house.urlSpace.images = [];
    gameState.player.house.urlSpace.images[index] = compressed;
    saveGame(true);
    renderContentSettingArea('url');
}

function deleteUrlImage(index) {
    const images = gameState.player.house.urlSpace && gameState.player.house.urlSpace.images;
    if (!images) return;
    images.splice(index, 1);
    saveGame(true);
    renderContentSettingArea('url');
}

/* ─── マイホーム 汎用 ────────────────────────── */
function closeMyHome() {
    document.getElementById('myhouseModal').style.display = 'none';
}

let currentContentSettingId = null;

function saveMyhouseContentSetting() {
    if (currentContentSettingId === 'url') {
        saveUrlSpaceSetting();
    }
}

function saveUrlSpaceSetting() {
    const urlInput = document.getElementById('urlSpaceInput');
    const labelInput = document.getElementById('urlLabelInput');
    const hiddenInput = document.getElementById('urlHiddenInput');
    if (!urlInput) return;

    const url = urlInput.value.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        alert('URLは http:// または https:// から始めてください。');
        return;
    }

    if (!gameState.player.house.urlSpace) gameState.player.house.urlSpace = {};
    gameState.player.house.urlSpace.url    = url;
    gameState.player.house.urlSpace.label  = labelInput ? labelInput.value.trim() : '';
    gameState.player.house.urlSpace.hidden = hiddenInput ? hiddenInput.checked : false;

    saveGame(true);

    const btn = document.querySelector('.myhouse-url-save-btn');
    if (btn) {
        const orig = btn.textContent;
        btn.textContent = '保存しました';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
    }
}

function previewUrlSpace() {
    const url    = document.getElementById('urlSpaceInput')?.value.trim() || '';
    const label  = document.getElementById('urlLabelInput')?.value.trim() || '';
    const hidden = document.getElementById('urlHiddenInput')?.checked     || false;
    const images = (gameState.player.house.urlSpace || {}).images          || [];

    // コンテンツナビボタンを生成（表示のみ・非機能）
    const house = gameState.player.house;
    const contents = (house && house.contents) || [];
    const navRow = document.getElementById('urlPreviewNavRow');
    navRow.innerHTML = contents.map(id => {
        const def = myhouseContentDefs[id] || { name: id, icon: '' };
        const isActive = id === 'url';
        return `<button class="myhouse-nav-btn${isActive ? ' active' : ''}" style="cursor:default">${def.icon} ${def.name}</button>`;
    }).join('');

    // プレビュー内容を描画（保存前の現在値で）
    const viewArea = document.getElementById('urlPreviewViewArea');
    const original = gameState.player.house.urlSpace;
    gameState.player.house.urlSpace = { url, label, hidden, images };
    renderUrlSpaceContent(viewArea);
    gameState.player.house.urlSpace = original;

    // きせかえテーマをプレビューモーダルに反映
    const myhouseEl = document.getElementById('myhouseModal');
    const previewEl = document.getElementById('urlPreviewModal');
    const themeVars = [
        '--myhouse-accent', '--myhouse-accent-dark', '--myhouse-accent-light',
        '--myhouse-bg', '--myhouse-content-bg', '--myhouse-border',
        '--myhouse-nav-color', '--myhouse-nav-radius', '--myhouse-text', '--myhouse-font-size'
    ];
    const computed = getComputedStyle(myhouseEl);
    themeVars.forEach(v => {
        const val = computed.getPropertyValue(v).trim();
        if (val) previewEl.style.setProperty(v, val);
    });

    previewEl.style.display = 'flex';
}

function closeUrlPreview() {
    document.getElementById('urlPreviewModal').style.display = 'none';
}

function renderContentSettingArea(contentId) {
    currentContentSettingId = contentId;
    const area = document.getElementById('myhouseRight');
    const homeId = (gameState.player.house && gameState.player.house.homeContent) || 'bulletin';
    const isHome = homeId === contentId;
    const def = myhouseContentDefs[contentId] || { name: contentId, icon: '🏠' };
    const currentTitle = ((gameState.player.house && gameState.player.house.contentTitles) || {})[contentId] || '';

    const titleFieldHtml = `
        <div class="myhouse-url-field">
            <label class="myhouse-url-label">タイトル名（10文字以内）</label>
            <div class="myhouse-title-input-row">
                <input type="text" id="contentTitleInput" class="myhouse-url-input"
                    maxlength="10" placeholder="${def.name}" value="${escapeHtml(currentTitle)}">
                <button class="myhouse-title-save-btn" onclick="saveContentTitle('${contentId}')">変更</button>
            </div>
            <p class="myhouse-url-hint">空欄の場合、デフォルト名「${def.name}」が表示されます</p>
        </div>`;
    const homeCheckHtml = `
        <div class="myhouse-url-field myhouse-home-check-row">
            <label class="myhouse-home-check-label">
                <input type="checkbox" id="homeContentCheck" ${isHome ? 'checked' : ''}
                    onchange="setHomeContent('${contentId}', this.checked)">
                このコンテンツをホーム画面にする
            </label>
            <p class="myhouse-url-hint">訪問者がおうちを開いたとき、最初に表示されるコンテンツです</p>
        </div>`;

    if (contentId === 'diary') {
        const d = (gameState.player.house && gameState.player.house.diary) || {};
        const visibility = d.visibility || 'public';
        const visibilityOptions = [
            { value: 'public',  label: '全員に公開',       desc: '訪問者全員が閲覧できます' },
            { value: 'friends', label: 'フレンドのみ公開', desc: 'フレンド登録済みのユーザーだけが閲覧できます' },
            { value: 'private', label: '自分のみ閲覧可',   desc: '自分だけが閲覧できます（非公開）' },
        ];
        const visibilityHtml = visibilityOptions.map(opt => `
            <label class="myhouse-diary-vis-label">
                <input type="radio" name="diaryVisibility" value="${opt.value}" ${visibility === opt.value ? 'checked' : ''}>
                <span class="myhouse-diary-vis-text">
                    <span class="myhouse-diary-vis-title">${opt.label}</span>
                    <span class="myhouse-diary-vis-desc">${opt.desc}</span>
                </span>
            </label>`).join('');
        area.innerHTML = `
            <div class="myhouse-right-scroll"><div class="myhouse-url-setting">
                <p class="myhouse-url-setting-title">${def.icon} ${def.name}の設定</p>
                ${titleFieldHtml}
                ${homeCheckHtml}
                <div class="myhouse-url-field">
                    <label class="myhouse-url-label">公開範囲</label>
                    <div class="myhouse-diary-vis-options">${visibilityHtml}</div>
                </div>
                <div class="myhouse-url-actions">
                    <button class="myhouse-url-save-btn" id="diarySaveBtn" onclick="saveDiarySetting()">設定を保存</button>
                </div>
            </div></div>`;
        return;
    }

    if (contentId === 'url') {
        const s = (gameState.player.house && gameState.player.house.urlSpace) || {};
        const images = s.images || [];
        let slotsHtml = '';
        for (let i = 0; i < 4; i++) {
            if (images[i]) {
                slotsHtml += `
                    <div class="myhouse-url-slot myhouse-url-slot-filled">
                        <img src="${images[i]}" class="myhouse-url-slot-thumb" alt="プレビュー${i+1}">
                        <button class="myhouse-url-slot-del" onclick="deleteUrlImage(${i})">×</button>
                    </div>`;
            } else {
                slotsHtml += `
                    <div class="myhouse-url-slot myhouse-url-slot-empty"
                        onclick="document.getElementById('urlImgInput_${i}').click()">
                        <span class="myhouse-url-slot-plus">＋</span>
                        <input type="file" id="urlImgInput_${i}" accept="image/*" style="display:none"
                            onchange="handleUrlImageUpload(${i}, this)">
                    </div>`;
            }
        }
        area.innerHTML = `
            <div class="myhouse-right-scroll"><div class="myhouse-url-setting">
                <p class="myhouse-url-setting-title">URLスペースの設定</p>
                ${titleFieldHtml}
                ${homeCheckHtml}
                <div class="myhouse-url-field">
                    <label class="myhouse-url-label">URL</label>
                    <input type="url" id="urlSpaceInput" class="myhouse-url-input"
                        placeholder="https://..." value="${escapeHtml(s.url || '')}">
                </div>
                <div class="myhouse-url-field">
                    <label class="myhouse-url-label">表示名（任意）</label>
                    <input type="text" id="urlLabelInput" class="myhouse-url-input"
                        placeholder="例：私のお店、ポートフォリオ など" value="${escapeHtml(s.label || '')}">
                    <p class="myhouse-url-hint">空欄の場合、URLのドメインが自動表示されます</p>
                </div>
                <div class="myhouse-url-field">
                    <label class="myhouse-url-label">プレビュー画像（最大4枚）</label>
                    <p class="myhouse-url-hint">Webサイトのスクリーンショットをアップロードすると、訪問者に見せることができます。横長サイズ推奨(16:9)</p>
                    <div class="myhouse-url-slots">${slotsHtml}</div>
                </div>
                <div class="myhouse-url-field">
                    <label class="myhouse-url-checkbox-label">
                        <input type="checkbox" id="urlHiddenInput" ${s.hidden ? 'checked' : ''}>
                        URLスペースを非表示にする
                    </label>
                </div>
                <div class="myhouse-url-actions">
                    <button class="myhouse-url-preview-btn" onclick="previewUrlSpace()">プレビュー</button>
                    <button class="myhouse-url-save-btn" onclick="saveUrlSpaceSetting()">設定を保存</button>
                </div>
            </div></div>`;
        return;
    }

    if (contentId === 'shop') {
        area.innerHTML = `
            <div class="myhouse-right-scroll"><div class="myhouse-url-setting">
                <p class="myhouse-url-setting-title">${def.icon} ${def.name}の設定</p>
                ${titleFieldHtml}
                ${homeCheckHtml}
                <div class="myhouse-url-field">
                    <label class="myhouse-url-label">ショップの説明文</label>
                    <p class="myhouse-url-hint">ショップ画面の上部に表示される説明文です。1行・60文字まで入力できます。</p>
                    <textarea class="myhouse-url-input" id="shopDescInput" rows="1" placeholder="例：毎日仕入れています！お気軽にどうぞ♪" oninput="onShopDescInput()">${escapeHtml(gameState.player.shopDescription || '')}</textarea>
                    <p class="myhouse-url-error" id="shopDescError" style="display:none;">60文字以内で入力してください</p>
                    <button class="myhouse-url-save-btn" id="shopDescSaveBtn" onclick="saveShopDescription()">保存する</button>
                </div>
                <div class="myhouse-url-field">
                    <label class="myhouse-url-label">商品の管理</label>
                    <p class="myhouse-url-hint">問屋で仕入れた商品の在庫・価格を管理できます。</p>
                    <button class="myhouse-url-save-btn" onclick="openShopInventoryModal()">🏪 商品の管理を開く</button>
                </div>
            </div></div>`;
        return;
    }

    if (contentId === 'bulletin') {
        const bio = (gameState.player.house && gameState.player.house.bio) || '';
        area.innerHTML = `
            <div class="myhouse-right-scroll"><div class="myhouse-url-setting">
                <p class="myhouse-url-setting-title">${def.icon} ${def.name}の設定</p>
                ${titleFieldHtml}
                ${homeCheckHtml}
                <div class="myhouse-url-field">
                    <label class="myhouse-url-label">プロフィール一言メモ（100文字以内）</label>
                    <textarea id="profileBioInput" class="myhouse-url-input" maxlength="100"
                        placeholder="こんにちは！気軽に書き込んでね🌸" style="height:80px;resize:vertical;">${escapeHtml(bio)}</textarea>
                    <p class="myhouse-url-hint">掲示板のプロフィールカードに表示されます</p>
                </div>
                <div class="myhouse-url-actions">
                    <button class="myhouse-url-save-btn" onclick="saveProfileBio()">設定を保存</button>
                </div>
            </div></div>`;
        return;
    }

    area.innerHTML = `
        <div class="myhouse-right-scroll"><div class="myhouse-url-setting">
            <p class="myhouse-url-setting-title">${def.icon} ${def.name}の設定</p>
            ${titleFieldHtml}
            ${homeCheckHtml}
            <div class="myhouse-placeholder" style="min-height:180px;">
                <p class="myhouse-placeholder-msg">その他の設定項目は準備中です。<br>もうしばらくお待ちください！</p>
            </div>
        </div></div>`;
}

// ============================================
// ショップ在庫管理
// ============================================
let shopinvCurrentItem = null;

function onShopDescInput() {
    const input = document.getElementById('shopDescInput');
    const errorEl = document.getElementById('shopDescError');
    const btn = document.getElementById('shopDescSaveBtn');
    if (!input) return;
    const over = input.value.trim().length > 60;
    if (errorEl) errorEl.style.display = over ? '' : 'none';
    if (btn) btn.disabled = over;
}

function saveShopDescription() {
    const input = document.getElementById('shopDescInput');
    if (!input || input.value.length > 60) return;
    gameState.player.shopDescription = input.value.trim();
    saveGame();
    showToast('説明文を保存しました！');
}

function openShopInventoryModal() {
    shopinvCurrentItem = null;
    const right = document.getElementById('myhouseRight');
    right.innerHTML = `
        <div class="shopinv-view">
            <div class="shopinv-view-header">
                <button class="shopinv-back-btn" onclick="renderContentSettingArea('shop')">← 戻る</button>
                <span class="shopinv-view-title">🏪 商品の管理</span>
            </div>
            <div class="shopinv-listview">
                <div class="shop2-table-container">
                    <table class="shop2-table" id="shopInventoryTable">
                        <thead>
                            <tr class="shop2-header-group">
                                <th rowspan="2">販売</th>
                                <th rowspan="2">商品名</th>
                                <th rowspan="2">販売価格</th>
                                <th colspan="14">アップする能力値</th>
                                <th colspan="2">消費パワー</th>
                                <th rowspan="2">使用<br>回数</th>
                                <th rowspan="2">使用<br>間隔</th>
                                <th rowspan="2">在庫数</th>
                            </tr>
                            <tr class="shop2-header-sub">
                                <th>国</th><th>数</th><th>理</th><th>社</th><th>英</th>
                                <th>音</th><th>美</th><th>体</th><th>気</th><th>ル</th>
                                <th>素</th><th>面</th><th>優</th><th>エ</th>
                                <th>身体</th><th>頭脳</th>
                            </tr>
                        </thead>
                        <tbody id="shopInventoryTableBody"></tbody>
                    </table>
                </div>
                <div class="shop2-cart-overlay" id="shopInventoryPanel" style="display:none;">
                    <div class="shop2-cart-tab" onclick="closeShopInventoryPanel()">閉じる</div>
                    <div class="shop2-cart-overlay-body">
                        <div class="shopinv-info-group">
                            <div class="shopinv-info-row">
                                <span class="shopinv-info-label">商品名</span>
                                <span id="shopinvPanelName" class="shopinv-info-value"></span>
                            </div>
                            <div class="shopinv-info-row">
                                <span class="shopinv-info-label">仕入れ値</span>
                                <span id="shopinvPanelPurchasePrice" class="shopinv-info-value"></span>円
                            </div>
                            <div class="shopinv-info-row">
                                <span class="shopinv-info-label">在庫数</span>
                                <span id="shopinvPanelStock" class="shopinv-info-value"></span>個
                            </div>
                        </div>
                        <div class="shopinv-field">
                            <label class="shopinv-label">販売価格</label>
                            <div class="shopinv-input-row">
                                <input type="number" id="shopinvSellPrice" class="shopinv-input" min="1">
                                <span class="shopinv-unit">円</span>
                            </div>
                            <p class="shopinv-hint" id="shopinvPriceHint"></p>
                        </div>
                        <div class="shopinv-field">
                            <label class="shopinv-label">陳列個数</label>
                            <div class="shopinv-input-row">
                                <input type="number" id="shopinvSellQty" class="shopinv-input" min="0" max="30">
                                <span class="shopinv-unit">個</span>
                            </div>
                        </div>
                        <div class="shopinv-field shopinv-discard-group">
                            <label class="shopinv-label">破棄</label>
                            <div class="shopinv-input-row">
                                <input type="number" id="shopinvDiscardQty" class="shopinv-input" min="1" placeholder="個数">
                                <span class="shopinv-unit">個</span>
                                <button class="shopinv-discard-btn" onclick="discardShopInventoryItem(false)">破棄</button>
                            </div>
                            <button class="shopinv-discard-all-btn" onclick="discardShopInventoryItem(true)">全部破棄する</button>
                        </div>
                        <div class="shopinv-save-area">
                            <button class="shopinv-save-btn" onclick="saveShopInventoryItem()">保存する</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    renderShopInventoryTable();
}

function renderShopInventoryTable() {
    const tbody = document.getElementById('shopInventoryTableBody');
    const stock = gameState.shopStock || [];
    const abilities = ['国語', '数学', '理科', '社会', '英語', '音楽', '美術', '体力', '気力', 'ルックス', '素早さ', '面白さ', '優しさ', 'エロさ'];

    // shopItems＋tonyaItemsのジャンルをMap方式でマージして並び替え
    const itemOrderMap = {};
    const itemGenreMap = {};
    {
        const genreMap = new Map();
        const genreOrder = [];
        let cg = null;
        for (const item of [...shopItems, ...tonyaItems]) {
            if (item.type === 'separator') {
                cg = item.name;
                if (!genreMap.has(cg)) { genreMap.set(cg, []); genreOrder.push(cg); }
            } else if (item.name && cg) {
                const arr = genreMap.get(cg);
                if (!arr.includes(item.name)) arr.push(item.name);
            }
        }
        genreOrder.forEach((genre, gi) => {
            genreMap.get(genre).forEach((name, ii) => {
                itemGenreMap[name] = genre;
                itemOrderMap[name] = gi * 10000 + ii;
            });
        });
    }
    const sorted = [...stock].sort((a, b) => (itemOrderMap[a.name] ?? 999) - (itemOrderMap[b.name] ?? 999));

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="22" class="shopinv-empty">仕入れた商品がありません。<br>問屋で商品を仕入れてください。</td></tr>`;
        return;
    }

    let html = '';
    let lastGenre = null;
    for (const s of sorted) {
        const genre = itemGenreMap[s.name] || '';
        if (genre !== lastGenre) {
            lastGenre = genre;
            html += `<tr class="separator-row"><td colspan="22">${genre}</td></tr>`;
        }
        const master = shopItems.find(i => i.name === s.name) || tonyaItems.find(i => i.name === s.name) || {};
        const stats = master.stats || {};
        const isActive = shopinvCurrentItem === s.name;
        const inv = ((gameState.shopInventory || []).find(i => i.name === s.name)) || {};
        const listed = inv.listed === true;
        const sellPriceText = inv.sellPrice ? inv.sellPrice.toLocaleString() + '円' : '—';
        const safeNameJs = JSON.stringify(s.name).replace(/"/g, '&quot;');

        html += `<tr class="shopinv-row${isActive ? ' active' : ''}" onclick="openShopInventoryPanel(${safeNameJs})">`;
        html += `<td class="shopinv-cb-cell" onclick="event.stopPropagation()"><input type="checkbox" class="shopinv-listed-cb" ${listed ? 'checked' : ''} onchange="toggleShopListed(${safeNameJs}, this.checked)"></td>`;
        html += `<td class="shopinv-name-cell">${s.name}</td>`;
        html += `<td class="shop2-price">${sellPriceText}</td>`;
        for (const ab of abilities) {
            html += `<td>${stats[ab] || ''}</td>`;
        }
        html += `<td>${master.bodyConsume || ''}</td>`;
        html += `<td>${master.brainConsume || ''}</td>`;
        html += `<td>${master.useCount || ''}</td>`;
        html += `<td>${master.cooldown || ''}</td>`;
        html += `<td>${s.quantity}</td>`;
        html += `</tr>`;
    }
    tbody.innerHTML = html;
}

function openShopInventoryPanel(itemName) {
    shopinvCurrentItem = itemName;

    // アクティブ行の更新
    document.querySelectorAll('#shopInventoryTableBody tr').forEach(tr => {
        const nameCell = tr.querySelector('.shopinv-name-cell');
        tr.classList.toggle('active', nameCell?.textContent === itemName);
    });

    const stock = (gameState.shopStock || []).find(s => s.name === itemName);
    const inv = ((gameState.shopInventory || []).find(i => i.name === itemName)) || {};
    if (!stock) return;

    document.getElementById('shopinvPanelName').textContent = itemName;
    document.getElementById('shopinvPanelPurchasePrice').textContent = (stock.costPrice || 0).toLocaleString();
    document.getElementById('shopinvPanelStock').textContent = stock.quantity;
    const maxPrice = (stock.costPrice || 0) * 3;
    document.getElementById('shopinvSellPrice').value = inv.sellPrice || '';
    document.getElementById('shopinvSellPrice').min = 1;
    document.getElementById('shopinvSellPrice').max = maxPrice;
    document.getElementById('shopinvSellQty').value = inv.sellQty !== undefined ? inv.sellQty : stock.quantity;
    document.getElementById('shopinvSellQty').max = stock.quantity;
    document.getElementById('shopinvPriceHint').textContent = `1円〜${maxPrice.toLocaleString()}円（仕入れ値の3倍）まで`;
    document.getElementById('shopinvDiscardQty').value = '';
    document.getElementById('shopinvDiscardQty').max = stock.quantity;

    const panel = document.getElementById('shopInventoryPanel');
    panel.classList.remove('closing');
    panel.style.display = '';
}

function closeShopInventoryPanel() {
    const panel = document.getElementById('shopInventoryPanel');
    if (!panel || panel.style.display === 'none') return;
    panel.classList.add('closing');
    panel.addEventListener('animationend', () => {
        panel.classList.remove('closing');
        panel.style.display = 'none';
        shopinvCurrentItem = null;
        document.querySelectorAll('#shopInventoryTableBody tr').forEach(tr => tr.classList.remove('active'));
    }, { once: true });
}

function showShopinvError(message) {
    document.getElementById('shopinvErrorMessage').textContent = message;
    document.getElementById('shopinvErrorModal').classList.add('active');
}

function closeShopinvErrorModal() {
    document.getElementById('shopinvErrorModal').classList.remove('active');
}

// チェックボックスで陳列ON/OFFを切り替え（即保存）
function toggleShopListed(itemName, checked) {
    if (checked) {
        // 販売価格が未設定の場合はチェック不可
        const inv = (gameState.shopInventory || []).find(i => i.name === itemName);
        if (!inv || !inv.sellPrice || inv.sellPrice <= 0) {
            showShopinvError('販売価格が未設定です。\n設定後にチェックを入れることができます。');
            document.querySelectorAll('.shopinv-listed-cb').forEach(cb => {
                const nameCell = cb.closest('tr')?.querySelector('.shopinv-name-cell');
                if (nameCell?.textContent === itemName) cb.checked = false;
            });
            return;
        }
        // 最大15種類チェック
        const listedCount = (gameState.shopInventory || []).filter(
            i => i.name !== itemName && i.listed !== false
        ).length;
        if (listedCount >= 15) {
            showShopinvError('販売できる商品は最大15種類までです。');
            document.querySelectorAll('.shopinv-listed-cb').forEach(cb => {
                const nameCell = cb.closest('tr')?.querySelector('.shopinv-name-cell');
                if (nameCell?.textContent === itemName) cb.checked = false;
            });
            return;
        }
    }
    if (!gameState.shopInventory) gameState.shopInventory = [];
    const existing = gameState.shopInventory.find(i => i.name === itemName);
    if (existing) {
        existing.listed = checked;
    } else {
        gameState.shopInventory.push({ name: itemName, listed: checked });
    }
    saveGame(true);
    renderShopInventoryTable();
}

function saveShopInventoryItem() {
    if (!shopinvCurrentItem) return;

    const sellPrice = parseInt(document.getElementById('shopinvSellPrice').value) || 0;
    const sellQty = parseInt(document.getElementById('shopinvSellQty').value);

    const stock = (gameState.shopStock || []).find(s => s.name === shopinvCurrentItem);
    if (!stock) return;

    const maxSellPrice = (stock.costPrice || 0) * 3;
    if (sellPrice < 1) {
        alert('販売価格を入力してください。');
        return;
    }
    if (sellPrice > maxSellPrice) {
        alert(`販売価格は仕入れ値の3倍（${maxSellPrice.toLocaleString()}円）までです。`);
        return;
    }
    if (isNaN(sellQty) || sellQty < 0 || sellQty > stock.quantity) {
        alert(`陳列個数は0〜${stock.quantity}個の範囲で入力してください。`);
        return;
    }
    if (sellQty > 30) {
        alert('陳列できる個数は1種類につき最大30個までです。');
        return;
    }

    if (!gameState.shopInventory) gameState.shopInventory = [];
    const existing = gameState.shopInventory.find(i => i.name === shopinvCurrentItem);
    if (existing) {
        existing.sellPrice = sellPrice;
        existing.sellQty = sellQty;
    } else {
        gameState.shopInventory.push({ name: shopinvCurrentItem, sellPrice, sellQty, listed: false });
    }

    saveGame(true);
    renderShopInventoryTable();

    const btn = document.querySelector('.shopinv-save-btn');
    if (btn) {
        const orig = btn.textContent;
        btn.textContent = '保存しました';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
    }
}

function discardShopInventoryItem(all) {
    if (!shopinvCurrentItem) return;
    const stock = (gameState.shopStock || []).find(s => s.name === shopinvCurrentItem);
    if (!stock) return;

    let qty;
    if (all) {
        if (!confirm(`「${shopinvCurrentItem}」を全部（${stock.quantity}個）破棄しますか？`)) return;
        qty = stock.quantity;
    } else {
        const input = parseInt(document.getElementById('shopinvDiscardQty').value) || 0;
        if (input < 1 || input > stock.quantity) {
            alert(`1〜${stock.quantity}個の範囲で入力してください。`);
            return;
        }
        if (!confirm(`「${shopinvCurrentItem}」を${input}個破棄しますか？`)) return;
        qty = input;
    }

    stock.quantity -= qty;
    if (stock.quantity <= 0) {
        gameState.shopStock = (gameState.shopStock || []).filter(s => s.name !== shopinvCurrentItem);
        if (gameState.shopInventory) {
            gameState.shopInventory = gameState.shopInventory.filter(i => i.name !== shopinvCurrentItem);
        }
        saveGame(true);
        closeShopInventoryPanel();
        renderShopInventoryTable();
    } else {
        document.getElementById('shopinvPanelStock').textContent = stock.quantity;
        document.getElementById('shopinvDiscardQty').value = '';
        saveGame(true);
        renderShopInventoryTable();
    }
}

function setHomeContent(contentId, checked) {
    if (!gameState.player.house) return;
    gameState.player.house.homeContent = checked ? contentId : null;
    saveGame(true);
}

function getContentTitle(contentId) {
    const titles = (gameState.player.house && gameState.player.house.contentTitles) || {};
    const def = myhouseContentDefs[contentId] || { name: contentId };
    return titles[contentId] || def.name;
}

function saveProfileBio() {
    const input = document.getElementById('profileBioInput');
    if (!input) return;
    gameState.player.house.bio = input.value.trim().slice(0, 100);
    saveGame(true);
    showToast('プロフィールを保存しました！');
}

function saveContentTitle(contentId) {
    const input = document.getElementById('contentTitleInput');
    if (!input) return;
    const val = input.value.trim().slice(0, 10);
    if (!gameState.player.house.contentTitles) gameState.player.house.contentTitles = {};
    gameState.player.house.contentTitles[contentId] = val;
    saveGame(true);
    renderMyhouseSidebar();

    const btn = document.querySelector('.myhouse-title-save-btn');
    if (btn) {
        const orig = btn.textContent;
        btn.textContent = '変更しました';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
    }
}

// ============================================
// お賽銭
// ============================================
const SAISEN_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];
let saisenSelectedAmount = null;

function openSaisenModal() {
    saisenSelectedAmount = null;
    renderSaisenBody();
    document.getElementById('saisenModal').style.display = 'flex';
}

function renderSaisenBody() {
    const body = document.querySelector('#saisenModal .saisen-modal-body');
    body.innerHTML = `
        <p class="saisen-desc">金額を選んでください</p>
        <div class="saisen-amount-list" id="saisenAmountList">
            ${SAISEN_AMOUNTS.map(a =>
                `<button class="saisen-amount-btn" onclick="selectSaisenAmount(${a}, this)">${a.toLocaleString()}円</button>`
            ).join('')}
        </div>
        <img src="house/icon/saisen.png" alt="賽銭箱" class="saisen-img">
        <button class="saisen-confirm-btn" id="saisenConfirmBtn" onclick="confirmSaisen()" disabled>お賽銭する</button>`;
}

function closeSaisenModal() {
    document.getElementById('saisenModal').style.display = 'none';
}

function selectSaisenAmount(amount, btn) {
    saisenSelectedAmount = amount;
    document.querySelectorAll('#saisenAmountList .saisen-amount-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('saisenConfirmBtn').disabled = false;
}

function confirmSaisen() {
    if (!saisenSelectedAmount) return;
    const amount = saisenSelectedAmount;

    if (gameState.player.money < amount) {
        const body = document.querySelector('#saisenModal .saisen-modal-body');
        body.innerHTML = `<p class="saisen-result-msg error"><span class="error-text">ERROR！</span>所持金が足りません。。。<br>（所持金：${gameState.player.money.toLocaleString()}円）</p>
            <button class="saisen-back-btn" onclick="renderSaisenBody()">戻る</button>`;
        return;
    }

    gameState.player.money -= amount;
    gameState.savings += amount;
    addBankHistory('deposit', amount, 'お賽銭収入');

    if (!gameState.notifications) gameState.notifications = [];
    gameState.notifications.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        type: 'saisen',
        fromName: gameState.player.name,
        fromAvatar: gameState.player.avatar,
        fromAvatarBg: gameState.player.avatarBgColor,
        amount: amount,
        date: Date.now(),
        read: false,
    });

    updateStatus();
    updateNotifBadge();
    saveGame(true);

    const body = document.querySelector('#saisenModal .saisen-modal-body');
    body.innerHTML = `
        <p class="saisen-result-msg success"><span style="color:#EB6101">${amount.toLocaleString()}円</span>のお賽銭をしました！</p>
        <button class="saisen-ok-btn" onclick="closeSaisenModal()">OK</button>`;
}
