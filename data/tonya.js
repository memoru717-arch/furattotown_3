// ============================================
// 問屋システム（商店スタイル）
// ============================================

// マイホームにショップを持っているか判定
function playerHasTonyaShop() {
    const house = gameState.player.house;
    return !!(house && house.contents && house.contents.includes('shop'));
}

// カート
let tonyaCart = [];

// フィルター状態
let tonyaPriceFilter = 'all';
let tonyaGenreFilter = 'all';
let tonyaAbilityFilter = 'none';

// ロット割引率を計算
function getTonyaDiscountRate(quantity) {
    if (quantity >= 20) return 0.50; // 50% OFF
    if (quantity >= 10) return 0.70; // 30% OFF
    return 1.00; // 割引なし（定価）
}

// 割引後の単価を計算
function getTonyaUnitPrice(basePrice, quantity) {
    const rate = getTonyaDiscountRate(quantity);
    return Math.floor(basePrice * rate);
}

// 6時リセット基準の「今日のキー」を返す
function getTonyaDailyKey() {
    const now = new Date();
    if (now.getHours() < 6) now.setDate(now.getDate() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// シード付き乱数（LCG）
function makeTonyaRng(seed) {
    let s = seed >>> 0;
    return function() {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

// Fisher-Yatesシャッフル（シード付き）
function shuffleSeeded(arr, rng) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// 今日の問屋アイテム（ジャンルごとに最大5件・価格順）を返す
// trueにすると全商品表示（テスト用）、falseで日替わりランダム
const TONYA_SHOW_ALL = false;

function getTonyaDailyItems() {
    // ジャンルごとにグループ化（同名ジャンルはまとめる）
    const allItems = [...shopItems, ...tonyaItems];
    const genreMap = new Map(); // ジャンル名 → { sep, items }
    const genreOrder = [];      // 登場順を保持
    let currentGenreName = null;
    for (const item of allItems) {
        if (item.type === 'separator') {
            currentGenreName = item.name;
            if (!genreMap.has(currentGenreName)) {
                genreMap.set(currentGenreName, { sep: item, items: [] });
                genreOrder.push(currentGenreName);
            }
        } else if (currentGenreName) {
            genreMap.get(currentGenreName).items.push(item);
        }
    }
    const genres = genreOrder.map(name => genreMap.get(name));

    // テストモード：全商品を価格順で表示
    if (TONYA_SHOW_ALL) {
        const result = [];
        for (const genre of genres) {
            const sorted = [...genre.items].sort((a, b) => a.price - b.price);
            if (sorted.length > 0) {
                result.push(genre.sep);
                result.push(...sorted);
            }
        }
        return result;
    }

    // 通常モード：各ジャンルから最大5件をランダム抽選して価格順にソート
    const seed = parseInt(getTonyaDailyKey().replace(/-/g, ''));
    const rng = makeTonyaRng(seed);
    const result = [];
    for (const genre of genres) {
        const selected = shuffleSeeded(genre.items, rng)
            .slice(0, 5)
            .sort((a, b) => a.price - b.price);
        if (selected.length > 0) {
            result.push(genre.sep);
            result.push(...selected);
        }
    }
    return result;
}

// 6時をまたいだら問屋の在庫をリセット
function checkTonyaStockReset() {
    const key = getTonyaDailyKey();
    if (gameState.lastTonyaStockResetDate === key) return;
    gameState.lastTonyaStockResetDate = key;
    gameState.tonyaStock = {};
    saveGame(true);
}

// 問屋モーダルを開く
function openTonyaModal() {
    checkTonyaStockReset();
    tonyaCart = [];
    tonyaPriceFilter = 'all';
    tonyaGenreFilter = 'all';
    tonyaAbilityFilter = 'none';

    document.getElementById('tonyaModal').classList.add('active');
    document.getElementById('tonyaListView').style.display = '';
    document.getElementById('tonyaCartModal').style.display = 'none';
    document.getElementById('tonyaCompleteView').style.display = 'none';

    // カートボタンをショップ所持状況に応じて制御
    const cartBtn = document.querySelector('#tonyaListView .shop2-cart-open-btn');
    if (cartBtn) cartBtn.disabled = !playerHasTonyaShop();

    // ジャンルセレクト初期化
    initTonyaGenreSelect();
    renderTonyaTable();
    updateTonyaCartBadge();
}

// 問屋モーダルを閉じる
function closeTonyaModal() {
    document.getElementById('tonyaModal').classList.remove('active');
}

// ジャンルセレクト初期化
function initTonyaGenreSelect() {
    const select = document.getElementById('tonyaGenreSelect');
    const genres = [];

    for (const item of getTonyaDailyItems()) {
        if (item.type === 'separator' && !genres.includes(item.name)) {
            genres.push(item.name);
        }
    }

    select.innerHTML = '<option value="all">ジャンル</option>' +
        genres.map(g => `<option value="${g}">${g}</option>`).join('');
}

// テーブル描画
function renderTonyaTable() {
    const tbody = document.getElementById('tonyaTableBody');
    const items = getFilteredTonyaItems();
    const hasShop = playerHasTonyaShop();
    const abilities = ['国語', '数学', '理科', '社会', '英語', '音楽', '美術', '体力', '気力', 'ルックス', '素早さ', '面白さ', '優しさ', 'エロさ'];


    // ── アイテム行 ──
    let itemsHtml = '';
    for (const item of items) {
        if (item.type === 'separator') {
            itemsHtml += `<tr class="separator-row"><td colspan="21">${item.name}</td></tr>`;
            continue;
        }

        const stats = item.stats || {};
        const inCart = tonyaCart.some(c => c.name === item.name);
        const rowClass = inCart ? 'shop2-row-selected' : '';
        const tonyaPrice = getTonyaUnitPrice(item.price, 1);

        itemsHtml += `<tr class="${rowClass}" data-item-name="${item.name.replace(/"/g, '&quot;')}">`;
        if (hasShop) {
            itemsHtml += `<td class="shop2-item-name"><label><input type="checkbox" class="shop2-checkbox tonya-item-cb" data-name="${item.name.replace(/"/g, '&quot;')}" ${inCart ? 'checked' : ''}>${item.name}</label></td>`;
        } else {
            itemsHtml += `<td class="shop2-item-name"><b>${item.name}</b></td>`;
        }
        for (const ab of abilities) {
            itemsHtml += `<td>${stats[ab] || ''}</td>`;
        }
        itemsHtml += `<td>${item.bodyConsume || ''}</td>`;
        itemsHtml += `<td>${item.brainConsume || ''}</td>`;
        itemsHtml += `<td>${item.useCount || ''}</td>`;
        itemsHtml += `<td>${item.cooldown || ''}</td>`;
        const tonyaRemaining = (gameState.tonyaStock && gameState.tonyaStock[item.name] !== undefined)
            ? gameState.tonyaStock[item.name]
            : 30;
        itemsHtml += `<td class="shop2-price">${tonyaPrice.toLocaleString()}円</td>`;
        itemsHtml += `<td>${tonyaRemaining}</td>`;
        itemsHtml += `</tr>`;
    }

    tbody.innerHTML = itemsHtml;

    // チェックボックスイベント設定（ショップ所持者のみ）
    if (hasShop) {
        document.querySelectorAll('#tonyaTableBody .tonya-item-cb').forEach(cb => {
            cb.addEventListener('change', () => {
                tonyaToggleItem(cb.dataset.name);
            });
        });
    }

}

// フィルター後アイテム取得
function getFilteredTonyaItems() {
    let items = getTonyaDailyItems();

    // ジャンルフィルター
    if (tonyaGenreFilter !== 'all') {
        const filtered = [];
        let inGenre = false;
        for (const item of items) {
            if (item.type === 'separator') {
                inGenre = (item.name === tonyaGenreFilter);
                if (inGenre) filtered.push(item);
                continue;
            }
            if (inGenre) filtered.push(item);
        }
        items = filtered;
    }

    // 価格フィルター
    if (tonyaPriceFilter !== 'all') {
        const filtered = [];
        let lastSep = null;
        for (const item of items) {
            if (item.type === 'separator') {
                lastSep = item;
                continue;
            }
            const price = getTonyaUnitPrice(item.price, 1);
            let match = false;
            if (tonyaPriceFilter === 'over') {
                match = price > 10000000;
            } else {
                match = price <= parseInt(tonyaPriceFilter);
            }
            if (match) {
                if (lastSep && !filtered.includes(lastSep)) filtered.push(lastSep);
                filtered.push(item);
            }
        }
        items = filtered;
    }

    // 能力値フィルター
    if (tonyaAbilityFilter !== 'none') {
        const filtered = [];
        let lastSep = null;
        for (const item of items) {
            if (item.type === 'separator') {
                lastSep = item;
                continue;
            }
            const stats = item.stats || {};
            if (tonyaAbilityFilter === '身体パワー') {
                if (item.effect?.health > 0) {
                    if (lastSep && !filtered.includes(lastSep)) filtered.push(lastSep);
                    filtered.push(item);
                }
            } else if (tonyaAbilityFilter === '頭脳パワー') {
                if (item.effect?.intelligence > 0) {
                    if (lastSep && !filtered.includes(lastSep)) filtered.push(lastSep);
                    filtered.push(item);
                }
            } else if (stats[tonyaAbilityFilter]) {
                if (lastSep && !filtered.includes(lastSep)) filtered.push(lastSep);
                filtered.push(item);
            }
        }
        items = filtered;
    }

    return items;
}

// テーブル行の選択状態をDOMに反映（change イベント方式ではチェックボックス状態は変更不要）
function updateTonyaRowState(itemName, selected) {
    const rows = document.querySelectorAll('#tonyaTableBody tr');
    for (const row of rows) {
        if (row.dataset.itemName === itemName) {
            row.classList.toggle('shop2-row-selected', selected);
            // change イベント由来の場合はブラウザがすでにチェック状態を変更済み
            // renderTonyaTable 後の初期化など他の場合に備えてチェック状態も同期
            const cb = row.querySelector('.tonya-item-cb');
            if (cb && cb.checked !== selected) cb.checked = selected;
            break;
        }
    }
}

// アイテム選択切り替え
function tonyaToggleItem(itemName) {
    const idx = tonyaCart.findIndex(c => c.name === itemName);
    if (idx >= 0) {
        tonyaCart.splice(idx, 1);
        updateTonyaRowState(itemName, false);
    } else {
        const item = shopItems.find(i => i.name === itemName) || tonyaItems.find(i => i.name === itemName);
        if (item) {
            tonyaCart.push({ name: itemName, quantity: 1 });
            updateTonyaRowState(itemName, true);
        }
    }
    // カートが開いていれば即時更新
    const cartModal = document.getElementById('tonyaCartModal');
    if (cartModal && cartModal.style.display !== 'none') {
        renderTonyaCart();
    }
    updateTonyaCartBadge();
}

// カートバッジ更新
function updateTonyaCartBadge() {
    const badge = document.getElementById('tonyaCartBadge');
    const count = tonyaCart.reduce((sum, c) => sum + c.quantity, 0);
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = '';
    } else {
        badge.style.display = 'none';
    }
}

// カートモーダル開く
function openTonyaCartModal() {
    document.getElementById('tonyaCartModal').style.display = '';
    renderTonyaCart();
}

// カートモーダル閉じる
function closeTonyaCartModal() {
    const modal = document.getElementById('tonyaCartModal');
    if (!modal || modal.style.display === 'none') return;
    modal.classList.add('closing');
    modal.addEventListener('animationend', () => {
        modal.classList.remove('closing');
        modal.style.display = 'none';
    }, { once: true });
}

// カート描画
function renderTonyaCart() {
    const container = document.getElementById('tonyaCartItems');
    const moneyEl = document.getElementById('tonyaMoneyValue');
    const totalEl = document.getElementById('tonyaTotalPrice');
    const insuffEl = document.getElementById('tonyaInsufficient');
    const btn = document.getElementById('tonyaPurchaseBtn');

    moneyEl.textContent = gameState.savings.toLocaleString() + '円';

    if (tonyaCart.length === 0) {
        container.innerHTML = '<p class="shop2-cart-empty">アイテムを選んでください</p>';
        totalEl.textContent = '0円';
        insuffEl.style.display = 'none';
        btn.disabled = true;
        btn.classList.remove('active');
        return;
    }

    let html = '';
    let total = 0;

    for (const cartItem of tonyaCart) {
        const item = shopItems.find(i => i.name === cartItem.name) || tonyaItems.find(i => i.name === cartItem.name);
        if (!item) continue;

        const unitPrice = getTonyaUnitPrice(item.price, cartItem.quantity);
        const subtotal = unitPrice * cartItem.quantity;
        total += subtotal;

        const discountLabel = cartItem.quantity >= 20 ? '50%OFF' :
                              cartItem.quantity >= 10 ? '30%OFF' : null;
        const discountHtml = discountLabel
            ? `<span class="shop2-cart-item-discount">${discountLabel}</span>`
            : '';

        const safeNameAttr = JSON.stringify(cartItem.name).replace(/"/g, '&quot;');
        html += `
            <div class="shop2-cart-item">
                <span class="shop2-cart-name">${cartItem.name}</span>
                ${discountHtml}
                <span class="shop2-cart-price">${subtotal.toLocaleString()}円</span>
                <div class="shop2-cart-qty">
                    <button class="shop2-qty-btn" onclick="tonyaChangeQty(${safeNameAttr}, -1)">－</button>
                    <span class="shop2-qty-num">${cartItem.quantity}</span>
                    <button class="shop2-qty-btn" onclick="tonyaChangeQty(${safeNameAttr}, 1)">＋</button>
                </div>
                <button class="shop2-cart-delete" onclick="tonyaRemoveItem(${safeNameAttr})"><img src="public/icon/dustbox2.png" alt="削除"></button>
            </div>
        `;
    }

    container.innerHTML = html;
    totalEl.textContent = total.toLocaleString() + '円';

    if (total > gameState.savings) {
        insuffEl.style.display = '';
        btn.disabled = true;
        btn.classList.remove('active');
    } else {
        insuffEl.style.display = 'none';
        btn.disabled = false;
        btn.classList.add('active');
    }
}

// 数量変更
function tonyaChangeQty(itemName, delta) {
    const cartItem = tonyaCart.find(c => c.name === itemName);
    if (!cartItem) return;
    cartItem.quantity = Math.max(1, Math.min(30, cartItem.quantity + delta));
    renderTonyaCart();
    updateTonyaCartBadge();
}

// 数量設定
function tonyaSetQty(itemName, value) {
    const cartItem = tonyaCart.find(c => c.name === itemName);
    if (!cartItem) return;
    cartItem.quantity = Math.max(1, Math.min(30, parseInt(value) || 1));
    renderTonyaCart();
    updateTonyaCartBadge();
}

// アイテム削除
function tonyaRemoveItem(itemName) {
    tonyaCart = tonyaCart.filter(c => c.name !== itemName);
    updateTonyaRowState(itemName, false);
    renderTonyaCart();
    updateTonyaCartBadge();
}

// 購入処理
function purchaseTonya() {
    let total = 0;
    const purchaseList = [];

    for (const cartItem of tonyaCart) {
        const item = shopItems.find(i => i.name === cartItem.name) || tonyaItems.find(i => i.name === cartItem.name);
        if (!item) continue;

        const unitPrice = getTonyaUnitPrice(item.price, cartItem.quantity);
        const subtotal = unitPrice * cartItem.quantity;
        total += subtotal;

        purchaseList.push({
            name: cartItem.name,
            quantity: cartItem.quantity,
            costPrice: unitPrice
        });
    }

    // 預金残高チェック
    if (total > gameState.savings) {
        return;
    }

    // 預金から引き落とし
    gameState.savings -= total;

    // 仕入れ在庫に追加 & 問屋在庫を減らす
    if (!gameState.shopStock) gameState.shopStock = [];
    if (!gameState.tonyaStock) gameState.tonyaStock = {};

    for (const purchase of purchaseList) {
        // プレイヤーの仕入れ在庫に追加
        const existing = gameState.shopStock.find(s => s.name === purchase.name);
        if (existing) {
            existing.quantity += purchase.quantity;
            existing.costPrice = purchase.costPrice;
        } else {
            gameState.shopStock.push(purchase);
        }

        // 問屋の残り在庫を減らす
        const tonyaCurrent = gameState.tonyaStock[purchase.name] !== undefined
            ? gameState.tonyaStock[purchase.name]
            : 30;
        gameState.tonyaStock[purchase.name] = Math.max(0, tonyaCurrent - purchase.quantity);
    }

    // 入出金履歴に追加
    gameState.bankHistory.unshift({
        type: 'withdraw',
        amount: total,
        description: '問屋仕入れ',
        date: new Date().toISOString()
    });
    if (gameState.bankHistory.length > 100) {
        gameState.bankHistory.pop();
    }

    // 保存
    saveGame(true);
    updateStatus();

    // 完了画面
    tonyaCart = [];
    closeTonyaCartModal();
    document.getElementById('tonyaListView').style.display = 'none';
    document.getElementById('tonyaCompleteView').style.display = '';
}

// フィルター関数
function tonyaSetPriceFilter(value) {
    tonyaPriceFilter = value;
    renderTonyaTable();
}

function tonyaSetGenreFilter(value) {
    tonyaGenreFilter = value;
    renderTonyaTable();
}

function tonyaSetAbilityFilter(value) {
    tonyaAbilityFilter = value;
    renderTonyaTable();
}

function tonyaResetFilters() {
    tonyaPriceFilter = 'all';
    tonyaGenreFilter = 'all';
    tonyaAbilityFilter = 'none';

    document.getElementById('tonyaPriceSelect').value = 'all';
    document.getElementById('tonyaGenreSelect').value = 'all';
    document.getElementById('tonyaAbilitySelect').value = 'none';

    renderTonyaTable();
}
