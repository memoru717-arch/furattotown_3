// ============================================
// 所持品機能
// ============================================
let inventoryActiveTab = 'all';

// アイテム名からマスタデータを取得する共通ヘルパー
function findShopItemByName(name) {
    return shopItems.find(s => s.name === name)
        || tonyaItems.find(s => s.name === name)
        || shokudoItems.find(s => s.name === name)
        || onsenShopItems.find(s => s.name === name);
}

function openInventoryModal() {
    // モーダルを表示
    document.getElementById('inventoryModal').classList.add('active');

    // ビューをリセット
    document.getElementById('inventoryListView').style.display = 'block';
    document.getElementById('inventoryTitle').textContent = '所持品リスト';

    // 使うボタンをリセット
    const useBtn = document.getElementById('inventoryUseBtn');
    useBtn.disabled = true;
    useBtn.classList.remove('active');

    // タブをリセット＆描画
    inventoryActiveTab = 'all';
    renderInventoryTabs();

    // 所持品一覧を描画
    renderInventoryTable();

    // モーダルの高さを固定（タブ切替時のサイズ変動を防ぐ）
    requestAnimationFrame(() => {
        const modalContent = document.querySelector('.inventory-modal-content');
        if (modalContent) {
            modalContent.style.width = modalContent.offsetWidth + 'px';
        }
    });
}

function renderInventoryTabs() {
    const tabsEl = document.getElementById('inventoryTabs');
    if (!tabsEl) return;

    const possessions = gameState.player.possessions;
    const allCategories = [...new Set([...shopItems, ...tonyaItems, ...shokudoItems, ...onsenShopItems].filter(s => s.type === 'separator').map(s => s.name))];

    // 所持品に存在するジャンルだけ抽出（順番はallCategoriesの順を保持）
    const ownedCategories = new Set(possessions.map(p => getItemCategory(p.name)));
    const genres = allCategories.filter(c => ownedCategories.has(c));

    let html = `<button class="shop2-tab ${inventoryActiveTab === 'all' ? 'active' : ''}" onclick="inventorySelectTab('all')">全ジャンル</button>`;
    genres.forEach(genre => {
        html += `<button class="shop2-tab ${inventoryActiveTab === genre ? 'active' : ''}" onclick="inventorySelectTab('${genre}')">${genre}</button>`;
    });
    tabsEl.innerHTML = html;
}

function scrollInventoryTabs(amount) {
    const scroll = document.getElementById('inventoryTabsScroll');
    if (scroll) scroll.scrollBy({ left: amount, behavior: 'smooth' });
}

function inventorySelectTab(genre) {
    inventoryActiveTab = genre;
    renderInventoryTabs();
    renderInventoryTable();
}

// ============================================
// セーブ・ロード機能
// ============================================
let currentSaveSlot = parseInt(localStorage.getItem('townGameCurrentSlot') || '1');

function getSaveKey(slot) {
    return `townGameSave_${slot}`;
}

function saveGame(silent = false) {
    try {
        localStorage.setItem(getSaveKey(currentSaveSlot), JSON.stringify(gameState));
        if (!silent) showToast('セーブしました！');
    } catch (e) {
        console.error('保存に失敗しました:', e);
        showToast('保存に失敗しました');
    }
}

function loadGame() {
    try {
        // 旧キー（townGameSave）からスロット1へ移行
        const legacy = localStorage.getItem('townGameSave');
        if (legacy && !localStorage.getItem('townGameSave_1')) {
            localStorage.setItem('townGameSave_1', legacy);
            localStorage.removeItem('townGameSave');
        }

        const saved = localStorage.getItem(getSaveKey(currentSaveSlot));
        if (!saved) return;
        const data = JSON.parse(saved);
        Object.assign(gameState, data);

        // オフライン中の回復を計算（30秒ごとに1回復）
        const p = gameState.player;
        if (p.lastRegenTime) {
            const elapsed = Date.now() - p.lastRegenTime;
            const recovered = Math.floor(elapsed / 30000);
            if (recovered > 0) {
                p.health = Math.min(p.maxHealth, p.health + recovered);
                p.intelligence = Math.min(p.maxIntelligence, p.intelligence + recovered);
                p.lastRegenTime = Date.now();
            }
        }
    } catch (e) {
        console.error('ロードに失敗しました:', e);
    }
}

const slotNames = { 1: '本番', 2: 'テスト用' };

function switchSaveSlot() {
    const nextSlot = currentSaveSlot === 1 ? 2 : 1;
    const nextName = slotNames[nextSlot];
    const currentName = slotNames[currentSaveSlot];
    const hasData = !!localStorage.getItem(getSaveKey(nextSlot));
    const msg = hasData
        ? `「${nextName}」に切り替えます。\n現在の「${currentName}」データは自動保存されます。`
        : `「${nextName}」は空です。新しいデータで始まります。\n現在の「${currentName}」データは自動保存されます。`;
    if (!confirm(msg)) return;

    saveGame(true);
    currentSaveSlot = nextSlot;
    localStorage.setItem('townGameCurrentSlot', String(currentSaveSlot));
    location.reload();
}

function updateSlotIndicator() {
    const el = document.getElementById('slotIndicator');
    if (el) el.textContent = slotNames[currentSaveSlot];
}

function resetGame() {
    const name = slotNames[currentSaveSlot];
    if (!confirm(`「${name}」のデータを削除して最初からやり直しますか？\nこの操作は取り消せません。`)) return;
    localStorage.removeItem(getSaveKey(currentSaveSlot));
    location.reload();
}

// スリープ復帰・タブ復帰時にオフライン分のパワーを補填する
function applyOfflineRecovery() {
    const p = gameState.player;
    if (!p.lastRegenTime) return;
    const elapsed = Date.now() - p.lastRegenTime;
    const recovered = Math.floor(elapsed / 30000);
    if (recovered > 0) {
        p.health = Math.min(p.maxHealth, p.health + recovered);
        p.intelligence = Math.min(p.maxIntelligence, p.intelligence + recovered);
        p.lastRegenTime = Date.now();
        updateStatus();
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        applyOfflineRecovery();
    }
});

// ============================================
// 更新機能
// ============================================
function refreshGame() {
    location.reload();
}

function renderAbilityRow(highlightStats = null) {
    const abilities = gameState.player.abilities;
    const row = document.getElementById('abilityRow');

    // ハイライトするかどうかを判定するヘルパー関数
    const highlight = (key) => {
        if (highlightStats && highlightStats[key] && highlightStats[key] > 0) {
            return ' class="ability-highlight"';
        }
        return '';
    };

    row.innerHTML = `
        <td${highlight('国語')}>${abilities.国語}</td>
        <td${highlight('数学')}>${abilities.数学}</td>
        <td${highlight('理科')}>${abilities.理科}</td>
        <td${highlight('社会')}>${abilities.社会}</td>
        <td${highlight('英語')}>${abilities.英語}</td>
        <td${highlight('音楽')}>${abilities.音楽}</td>
        <td${highlight('美術')}>${abilities.美術}</td>
        <td${highlight('体力')}>${abilities.体力}</td>
        <td${highlight('気力')}>${abilities.気力}</td>
        <td${highlight('ルックス')}>${abilities.ルックス}</td>
        <td${highlight('素早さ')}>${abilities.素早さ}</td>
        <td${highlight('面白さ')}>${abilities.面白さ}</td>
        <td${highlight('優しさ')}>${abilities.優しさ}</td>
        <td${highlight('エロさ')}>${abilities.エロさ}</td>
    `;
}

function closeInventoryModal() {
    // サイズ固定を解除してから閉じる
    const modalContent = document.querySelector('.inventory-modal-content');
    if (modalContent) {
        modalContent.style.height = '';
        modalContent.style.width = '';
    }
    document.getElementById('inventoryModal').classList.remove('active');
}

// テーブル列構成（20列）: 商品名(1) + 全能力値14 + 身体消費(1) + 頭脳消費(1) + カロリー(1) + 使用間隔(1) + 使用回数(1)
// separator colspan=20、能力値行の空td=5個
function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    const emptyMsg = document.getElementById('inventoryEmpty');
    const tableContainer = document.querySelector('.inventory-table-container');
    const possessions = gameState.player.possessions;

    tableContainer.style.display = 'block';
    const useBtn = document.getElementById('inventoryUseBtn');
    if (possessions.length === 0) {
        emptyMsg.style.display = 'block';
        if (useBtn) useBtn.style.display = 'none';
    } else {
        emptyMsg.style.display = 'none';
        if (useBtn) useBtn.style.display = '';
    }

    // 能力値行をテーブル先頭に生成
    const abilities = gameState.player.abilities;
    const abilityKeys = ['国語', '数学', '理科', '社会', '英語', '音楽', '美術', '体力', '気力', 'ルックス', '素早さ', '面白さ', '優しさ', 'エロさ'];
    let abilityCells = '';
    abilityKeys.forEach(key => {
        abilityCells += `<td>${abilities[key]}</td>`;
    });

    // 目標職業の能力値行
    let targetJobRow = '';
    if (gameState.player.targetJob) {
        const targetJob = jobsData.find(j => j.id === gameState.player.targetJob);
        if (targetJob) {
            const tier = gameState.player.targetJobTier || 1;
            const tierData = getJobTierData(targetJob, tier);
            let targetCells = '';
            abilityKeys.forEach(key => {
                const req = tierData.abilities[key];
                targetCells += `<td>${req || ''}</td>`;
            });
            targetJobRow = `
        <tr class="shop2-target-stats">
            <td class="shop2-stats-label">目標の職業：${targetJob.names[tier - 1]}</td>
            ${targetCells}
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>`;
        }
    }

    let html = `
        <tr class="shop2-user-stats">
            <td class="shop2-stats-label">現在の能力値</td>
            ${abilityCells}
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        ${targetJobRow}
    `;

    // カテゴリごとにグループ化
    const grouped = groupPossessionsByCategory(possessions);
    const categoryOrder = [...new Set([...shopItems, ...tonyaItems, ...shokudoItems, ...onsenShopItems].filter(s => s.type === 'separator').map(s => s.name))];

    categoryOrder.forEach(category => {
        if (inventoryActiveTab !== 'all' && inventoryActiveTab !== category) return;
        if (grouped[category] && grouped[category].length > 0) {
            // カテゴリヘッダー
            html += `<tr class="separator-row"><td colspan="20">${category}</td></tr>`;

            grouped[category].forEach(item => {
                const index = item.originalIndex;
                // アイテムにstatsがない場合はマスタデータから取得（後方互換性）
                const shopItem = findShopItemByName(item.name);
                const stats = item.stats || shopItem?.stats || {};
                const calorieVal = item.calorie !== undefined ? item.calorie : (shopItem?.calorie !== undefined ? shopItem.calorie : 0);
                const calorie = calorieVal ? calorieVal + 'kcal' : '';
                const isOnsenItem = !!(item.maxHpUp || item.maxIntUp);
                const cooldownVal = item.cooldown || (isOnsenItem ? '0分' : (shopItem?.cooldown || '0分'));
                const cooldown = cooldownVal !== '0分' ? cooldownVal : '';
                const bodyConsumeVal = item.bodyConsume !== undefined ? item.bodyConsume : (shopItem?.bodyConsume !== undefined ? shopItem.bodyConsume : 0);
                const bodyConsume = bodyConsumeVal ? bodyConsumeVal : '';
                const brainConsumeVal = item.brainConsume !== undefined ? item.brainConsume : (shopItem?.brainConsume !== undefined ? shopItem.brainConsume : 0);
                const brainConsume = brainConsumeVal ? brainConsumeVal : '';
                const remainingUses = item.remainingUses !== undefined ? item.remainingUses : (item.useCount || shopItem?.useCount || 1);
                const totalUses = item.useCount || shopItem?.useCount || 1;

                const isConsumable = item.consumable;

                // クールタイム残り時間を計算
                const itemCooldownMs = parseCooldownMs(cooldownVal);
                let cooldownDisplay = cooldown;
                let isOnCooldown = false;
                if (itemCooldownMs > 0 && gameState.itemCooldowns && gameState.itemCooldowns[item.name]) {
                    const elapsed = Date.now() - gameState.itemCooldowns[item.name];
                    if (elapsed < itemCooldownMs) {
                        const remaining = itemCooldownMs - elapsed;
                        const min = Math.ceil(remaining / 60000);
                        cooldownDisplay = `<span class="inventory-cooldown-remain">あと${min}分</span>`;
                        isOnCooldown = true;
                    }
                }

                const rowClass = isOnCooldown ? ' class="inventory-row-cooldown"' : '';
                html += `
                    <tr${rowClass}>
                        <td class="shop2-item-name"><label><input type="radio" name="inventoryItem" class="shop2-checkbox" value="${index}" ${(!isConsumable || isOnCooldown) ? 'disabled' : ''}> ${item.name}</label>${(() => { const descParts = []; if (item.maxHpUp) descParts.push(`身体パワー上限+${item.maxHpUp}`); if (item.maxIntUp) descParts.push(`頭脳パワー上限+${item.maxIntUp}`); const desc = descParts.join(' / ') || item.description || shopItem?.description || ''; return desc ? `<span class="shop2-desc-wrapper"><span class="shop2-desc-symbol">ⓘ</span><span class="shop2-desc-tooltip">${desc}</span></span>` : ''; })()}</td>
                        <td>${stats.国語 || ''}</td>
                        <td>${stats.数学 || ''}</td>
                        <td>${stats.理科 || ''}</td>
                        <td>${stats.社会 || ''}</td>
                        <td>${stats.英語 || ''}</td>
                        <td>${stats.音楽 || ''}</td>
                        <td>${stats.美術 || ''}</td>
                        <td>${stats.体力 || ''}</td>
                        <td>${stats.気力 || ''}</td>
                        <td>${stats.ルックス || ''}</td>
                        <td>${stats.素早さ || ''}</td>
                        <td>${stats.面白さ || ''}</td>
                        <td>${stats.優しさ || ''}</td>
                        <td>${stats.エロさ || ''}</td>
                        <td>${bodyConsume}</td>
                        <td>${brainConsume}</td>
                        <td>${calorie}</td>
                        <td>${cooldownDisplay}</td>
                        <td>${remainingUses}</td>
                    </tr>
                `;
            });
        }
    });

    tbody.innerHTML = html;

    // ヘッダー高さに基づいてstickyのtop値を設定
    requestAnimationFrame(() => {
        const table = document.getElementById('inventoryTable');
        const headerRows = table.querySelectorAll('thead tr');
        if (headerRows.length >= 2) {
            const firstRowHeight = headerRows[0].offsetHeight;
            const totalHeaderHeight = firstRowHeight + headerRows[1].offsetHeight;
            headerRows[1].querySelectorAll('th').forEach(th => {
                th.style.top = firstRowHeight + 'px';
            });
            const userStatsRow = table.querySelector('.shop2-user-stats');
            if (userStatsRow) {
                userStatsRow.style.top = totalHeaderHeight + 'px';
                const targetRow = table.querySelector('.shop2-target-stats');
                if (targetRow) {
                    targetRow.style.top = '88px';
                }
            }
        }
    });

    // 備考ツールチップ
    document.querySelectorAll('#inventoryTableBody .shop2-desc-symbol').forEach(symbol => {
        const tooltip = symbol.nextElementSibling;
        if (!tooltip) return;
        symbol.addEventListener('mouseenter', () => {
            const rect = symbol.getBoundingClientRect();
            tooltip.style.left = (rect.left + rect.width / 2) + 'px';
            tooltip.style.top = (rect.top - 8) + 'px';
            tooltip.style.transform = 'translate(-50%, -100%)';
            tooltip.style.display = 'block';
        });
        symbol.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });

    // ラジオボタンの変更を監視
    document.querySelectorAll('input[name="inventoryItem"]').forEach(radio => {
        radio.addEventListener('change', updateInventoryUseButton);
    });
    updateInventoryUseButton();
}

function updateInventoryUseButton() {
    const selected = document.querySelector('input[name="inventoryItem"]:checked');
    const useBtn = document.getElementById('inventoryUseBtn');
    const fullMsg = document.getElementById('inventoryFullMsg');

    if (!selected) {
        useBtn.disabled = true;
        useBtn.classList.remove('active');
        if (fullMsg) fullMsg.style.visibility = 'hidden';
        return;
    }

    // 選択アイテムが食べ物かつ満腹チェック
    const index = parseInt(selected.value);
    const item = gameState.player.possessions[index];
    const shopItem = findShopItemByName(item?.name);
    const isFoodItem = !!(shopItem?.effect?.hunger);
    const isFull = isFoodItem && getHungerText().stage === 1;

    // 薬チェック（健康・合わない病気のときは使用不可）
    const isMedicine = !!(shopItem?.cures);
    const isHealthy = isMedicine && !gameState.player.disease;
    const isWrongMedicine = isMedicine && gameState.player.disease &&
        shopItem.cures !== 'all' &&
        !shopItem.cures.includes(gameState.player.disease);

    // 使用間隔チェック（温泉アイテムはクールダウンなし）
    const isOnsenItem = !!(item?.maxHpUp || item?.maxIntUp);
    const cdMs = isOnsenItem ? 0 : parseCooldownMs(shopItem?.cooldown);
    const lastUsed = gameState.itemCooldowns && gameState.itemCooldowns[item?.name];
    const isOnCooldown = cdMs > 0 && lastUsed && (Date.now() - lastUsed) < cdMs;

    if (isFull || isHealthy || isWrongMedicine || isOnCooldown) {
        useBtn.disabled = true;
        useBtn.classList.remove('active');
        if (fullMsg) {
            if (isFull) {
                fullMsg.textContent = '満腹のため、食事できません。';
                fullMsg.style.visibility = 'visible';
            } else if (isHealthy || isWrongMedicine) {
                fullMsg.textContent = '今は使っても効果が無いようです。';
                fullMsg.style.visibility = 'visible';
            } else {
                fullMsg.style.visibility = 'hidden';
            }
        }
    } else {
        useBtn.disabled = false;
        useBtn.classList.add('active');
        if (fullMsg) fullMsg.style.visibility = 'hidden';
    }
}

function useSelectedInventoryItem() {
    const selected = document.querySelector('input[name="inventoryItem"]:checked');
    if (!selected) return;
    const useBtn = document.getElementById('inventoryUseBtn');
    useBtn.disabled = true;
    useBtn.classList.remove('active');
    useInventoryItem(parseInt(selected.value));
}

function useInventoryItem(index) {
    const item = gameState.player.possessions[index];
    if (!item || !item.consumable) return;

    // アイテム情報を取得（使用前に取得）
    const shopItem = findShopItemByName(item.name);

    // 満腹チェックはupdateInventoryUseButton()でボタン無効化により防止済み

    const p = gameState.player;
    const itemName = item.name;
    const stats = shopItem?.stats || {};

    // 変更前の値を保存
    const beforeStats = {};
    if (shopItem?.stats) {
        for (const key in shopItem.stats) {
            if (key in p.abilities && shopItem.stats[key]) {
                beforeStats[key] = p.abilities[key];
            }
        }
    }
    const beforeHunger = getHungerText().text;
    const beforeHealth = p.health;
    const beforeIntelligence = p.intelligence;
    const beforeWeight = p.weight;
    const beforeHeight = p.height;
    const beforeMaxHealth = p.maxHealth;
    const beforeMaxIntelligence = p.maxIntelligence;
    const beforeDisease = p.disease;

    // アイテムを使用
    const success = useItem(item.name);
    if (!success) return;

    // 変更後の値を取得
    const afterHunger = getHungerText().text;
    const afterHealth = p.health;
    const afterIntelligence = p.intelligence;
    const afterWeight = p.weight;
    const afterHeight = p.height;

    // 結果画面を表示
    showItemUsedResult(itemName, stats, beforeStats, beforeHunger, afterHunger, beforeHealth, afterHealth, beforeIntelligence, afterIntelligence, beforeWeight, afterWeight, beforeHeight, afterHeight, beforeMaxHealth, beforeMaxIntelligence, beforeDisease);
}

function showItemUsedResult(itemName, stats, beforeStats, beforeHunger, afterHunger, beforeHealth, afterHealth, beforeIntelligence, afterIntelligence, beforeWeight, afterWeight, beforeHeight, afterHeight, beforeMaxHealth, beforeMaxIntelligence, beforeDisease) {
    const p = gameState.player;

    // ジャンルに応じたアクション動詞を取得
    const category = getItemCategory(itemName);
    let actionVerb = '使用しました';
    if (category.includes('テイクアウト品') || category.includes('食料品') || category.includes('デザート') || category.includes('フード')) actionVerb = '食べました';
    else if (category.includes('ドリンク') || category.includes('薬')) actionVerb = '飲みました';
    else if (category.includes('書籍')) actionVerb = '読みました';
    else if (category.includes('スポーツ用品') || category.includes('電化製品')) actionVerb = '使いました';
    else if (category.includes('アクセサリー')) actionVerb = '身につけました';
    else if (category.includes('乗り物')) actionVerb = '乗りました';

    const statNames = {
        国語: '国語', 数学: '数学', 理科: '理科', 社会: '社会', 英語: '英語',
        音楽: '音楽', 美術: '美術', 体力: '体力', 気力: '気力',
        ルックス: 'ルックス', 素早さ: '素早さ', 面白さ: '面白さ',
        優しさ: '優しさ', エロさ: 'エロさ'
    };

    let html = `<div class="shokudo-eat-result">`;
    html += `<div class="shokudo-eat-heading">${itemName}を${actionVerb}！</div>`;
    html += `<div class="shokudo-eat-changes">`;

    // 能力値の変化（+N のみ）
    for (const [key, value] of Object.entries(stats)) {
        if (value && value > 0) {
            const diff = p.abilities[key] - beforeStats[key];
            html += `<div class="shokudo-change-row">`;
            html += `<span class="shokudo-change-label">${statNames[key] || key}</span>`;
            html += `<span class="shokudo-change-plus">+${diff}</span>`;
            html += `</div>`;
        }
    }

    // 空腹度の変化
    if (beforeHunger !== afterHunger) {
        const displayAfterHunger = afterHunger.replace('（食事できません）', '');
        html += `<div class="shokudo-change-row">`;
        html += `<span class="shokudo-change-label">空腹度</span>`;
        html += `<span class="shokudo-change-after shokudo-change-up">${displayAfterHunger}</span>`;
        html += `</div>`;
    }

    // 身体パワーの変化
    if (beforeHealth !== afterHealth) {
        const diff = afterHealth - beforeHealth;
        const cls = diff > 0 ? 'shokudo-change-plus' : 'work-change-minus';
        html += `<div class="shokudo-change-row">`;
        html += `<span class="shokudo-change-label">身体パワー</span>`;
        html += `<span class="${cls}">${diff > 0 ? '+' : ''}${diff}</span>`;
        html += `</div>`;
    }

    // 頭脳パワーの変化
    if (beforeIntelligence !== afterIntelligence) {
        const diff = afterIntelligence - beforeIntelligence;
        const cls = diff > 0 ? 'shokudo-change-plus' : 'work-change-minus';
        html += `<div class="shokudo-change-row">`;
        html += `<span class="shokudo-change-label">頭脳パワー</span>`;
        html += `<span class="${cls}">${diff > 0 ? '+' : ''}${diff}</span>`;
        html += `</div>`;
    }

    // 体重の変化
    if (beforeWeight !== afterWeight) {
        const weightDiff = parseFloat((afterWeight - beforeWeight).toFixed(2));
        const cls = weightDiff > 0 ? 'shokudo-change-plus' : 'work-change-minus';
        html += `<div class="shokudo-change-row">`;
        html += `<span class="shokudo-change-label">体重</span>`;
        html += `<span class="${cls}">${weightDiff > 0 ? '+' : ''}${weightDiff}kg</span>`;
        html += `</div>`;
    }

    // 身長の変化
    if (beforeHeight !== afterHeight) {
        const heightDiff = afterHeight - beforeHeight;
        const cls = heightDiff > 0 ? 'shokudo-change-plus' : 'work-change-minus';
        html += `<div class="shokudo-change-row">`;
        html += `<span class="shokudo-change-label">身長</span>`;
        html += `<span class="${cls}">${heightDiff > 0 ? '+' : ''}${heightDiff}cm</span>`;
        html += `</div>`;
    }

    // 身体パワー上限の変化
    if (beforeMaxHealth !== undefined && p.maxHealth !== beforeMaxHealth) {
        const diff = p.maxHealth - beforeMaxHealth;
        html += `<div class="shokudo-change-row">`;
        html += `<span class="shokudo-change-label">身体パワー上限</span>`;
        html += `<span class="shokudo-change-plus">+${diff}</span>`;
        html += `</div>`;
    }

    // 頭脳パワー上限の変化
    if (beforeMaxIntelligence !== undefined && p.maxIntelligence !== beforeMaxIntelligence) {
        const diff = p.maxIntelligence - beforeMaxIntelligence;
        html += `<div class="shokudo-change-row">`;
        html += `<span class="shokudo-change-label">頭脳パワー上限</span>`;
        html += `<span class="shokudo-change-plus">+${diff}</span>`;
        html += `</div>`;
    }

    // コンディションの変化（病気が治った場合）
    if (beforeDisease && !p.disease) {
        const afterCondition = getCondition();
        html += `<div class="shokudo-change-row">`;
        html += `<span class="shokudo-change-label">コンディション</span>`;
        html += `<span class="shokudo-change-plus">${afterCondition.text}</span>`;
        html += `</div>`;
    }

    html += `</div></div>`;
    document.getElementById('itemUsedContent').innerHTML = html;
    document.getElementById('itemResultModal').classList.add('active');
}

function closeItemResultModal() {
    document.getElementById('itemResultModal').classList.remove('active');
    // タブをリセット＆再描画（空になったジャンルを消す）
    inventoryActiveTab = 'all';
    renderInventoryTabs();
    renderInventoryTable();
}

function backToInventoryList() {
    closeItemResultModal();
}

