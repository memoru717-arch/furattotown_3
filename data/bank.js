// ============================================
// 銀行
// ============================================
function openBankModal() {
    const mc = document.querySelector('#bankModal .bank-modal-content');
    mc.classList.add('bank-lobby-mode');

    // 全サブビューをリセットしてロビーを表示
    document.getElementById('bankLobbyView').style.display = 'flex';
    document.getElementById('bankDepositView').style.display = 'none';
    document.getElementById('bankDepositCompleteView').style.display = 'none';
    document.getElementById('bankWithdrawView').style.display = 'none';
    document.getElementById('bankWithdrawCompleteView').style.display = 'none';
    document.getElementById('bankTransferView').style.display = 'none';
    document.getElementById('bankTransferConfirmView').style.display = 'none';
    document.getElementById('bankHistoryView').style.display = 'none';
    bankHideBackBtn();
    document.getElementById('bankModal').classList.add('active');

    // 時間帯別背景画像
    const hour = new Date().getHours();
    let bgImg = 'haikei/atm1.jpg';
    if (hour >= 5 && hour < 15) bgImg = 'haikei/atm1.jpg';
    else if (hour >= 15 && hour < 18) bgImg = 'haikei/atm2.jpg';
    else bgImg = 'haikei/atm3.jpg';
    const imgEl = document.getElementById('bankLobbyImg');
    if (imgEl) imgEl.src = bgImg;
}

function closeBankModal() {
    document.querySelector('#bankModal .bank-modal-content').classList.remove('bank-lobby-mode');
    document.getElementById('bankModal').classList.remove('active');
    flushRandomEvent();
}

let depositNumpadStr = '';
let depositKeepSelected = null;

function depositNumpadUpdate() {
    const val = parseInt(depositNumpadStr) || 0;
    const el = document.getElementById('depositNumpadDisplay');
    const text = val.toLocaleString();
    el.textContent = text;

    // 利用可能な幅を計算
    const displayBox = el.closest('.bank-numpad-display');
    const unitEl = el.nextElementSibling;
    const boxStyle = getComputedStyle(displayBox);
    const available = displayBox.clientWidth
        - parseFloat(boxStyle.paddingLeft)
        - parseFloat(boxStyle.paddingRight)
        - (unitEl ? unitEl.offsetWidth + parseFloat(getComputedStyle(unitEl).marginLeft) : 20);

    if (available <= 0) { el.style.fontSize = '20px'; return; }

    // 画面外の probe 要素で実際の文字幅を計測
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;top:-9999px;left:0;white-space:nowrap;font-weight:bold;' +
        'font-family:' + getComputedStyle(el).fontFamily + ';font-size:20px';
    probe.textContent = text;
    document.body.appendChild(probe);

    let fs = 20;
    while (probe.offsetWidth > available && fs > 11) {
        fs--;
        probe.style.fontSize = fs + 'px';
    }
    document.body.removeChild(probe);

    el.style.fontSize = fs + 'px';

    // 所持金超過チェック → 預けるボタンのグレーアウト
    const confirmBtn = document.querySelector('.bank-deposit-confirm-btn');
    if (confirmBtn) {
        confirmBtn.disabled = val > 0 && val > gameState.player.money;
    }
}

function depositNumpadInput(digits) {
    if (depositNumpadStr.length >= 16) return;
    if (depositNumpadStr === '' && digits === '0') return;
    if (depositNumpadStr === '' && digits === '00') return;
    depositNumpadStr += digits;
    depositNumpadStr = String(parseInt(depositNumpadStr) || 0);
    if (depositNumpadStr === '0') depositNumpadStr = '';
    clearKeepSelection();
    depositNumpadUpdate();
}

function depositNumpadMan() {
    if (!depositNumpadStr) return;
    const val = parseInt(depositNumpadStr) * 10000;
    depositNumpadStr = String(Math.min(val, 9999999999999999));
    clearKeepSelection();
    depositNumpadUpdate();
}

function depositNumpadSen() {
    if (!depositNumpadStr) return;
    const val = parseInt(depositNumpadStr) * 1000;
    depositNumpadStr = String(Math.min(val, 9999999999999999));
    clearKeepSelection();
    depositNumpadUpdate();
}

function depositNumpadAll() {
    depositNumpadStr = String(gameState.player.money);
    clearKeepSelection();
    depositNumpadUpdate();
}

function depositNumpadCorrect() {
    depositNumpadStr = '';
    clearKeepSelection();
    depositNumpadUpdate();
}

function clearKeepSelection() {
    depositKeepSelected = null;
    document.querySelectorAll('.bank-keep-btn').forEach(b => b.classList.remove('selected'));
}

function selectKeepAmount(btn, amount) {
    depositKeepSelected = amount;
    document.querySelectorAll('.bank-keep-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    depositNumpadStr = '';
    depositNumpadUpdate();
}

function confirmKeepDeposit() {
    if (depositKeepSelected === null) return;
    depositKeepAmountDirect(depositKeepSelected);
}

function depositConfirmUnified() {
    if (depositNumpadStr && parseInt(depositNumpadStr) > 0) {
        confirmDeposit();
    } else if (depositKeepSelected !== null) {
        depositKeepAmountDirect(depositKeepSelected);
    }
}

function deposit() {
    // ロビーを隠してお預入れ画面を表示
    document.getElementById('bankLobbyView').style.display = 'none';
    document.getElementById('bankDepositView').style.display = 'block';
    bankShowBackBtn();
    requestAnimationFrame(() => {
        document.querySelector('#bankModal .bank-modal-content').classList.remove('bank-lobby-mode');
    });

    // 現在の所持金と預金残高を表示
    document.getElementById('depositCurrentMoney').textContent = gameState.player.money.toLocaleString();
    document.getElementById('depositCurrentSavings').textContent = gameState.savings.toLocaleString();

    // テンキー・選択状態をリセット
    depositNumpadStr = '';
    depositNumpadUpdate();
    depositKeepSelected = null;
    const money = gameState.player.money;
    document.querySelectorAll('.bank-keep-btn').forEach(b => {
        b.classList.remove('selected');
        const keep = parseInt(b.dataset.keep);
        b.disabled = keep > 0 && money <= keep;
    });
}

function bankGoBack() {
    if (document.getElementById('bankTransferConfirmView').style.display !== 'none') {
        backToTransferInput();
    } else {
        backToBankMenu();
    }
}

function bankShowBackBtn() {
    const btn = document.getElementById('bankBackBtn');
    if (btn) btn.style.display = '';
}

function bankHideBackBtn() {
    const btn = document.getElementById('bankBackBtn');
    if (btn) btn.style.display = 'none';
}

function backToBankMenu() {
    // 全サブビューを隠してロビーに戻る
    document.getElementById('bankDepositView').style.display = 'none';
    document.getElementById('bankDepositCompleteView').style.display = 'none';
    document.getElementById('bankWithdrawView').style.display = 'none';
    document.getElementById('bankWithdrawCompleteView').style.display = 'none';
    document.getElementById('bankTransferView').style.display = 'none';
    document.getElementById('bankTransferConfirmView').style.display = 'none';
    document.getElementById('bankHistoryView').style.display = 'none';
    document.getElementById('bankLobbyView').style.display = 'flex';
    bankHideBackBtn();
    requestAnimationFrame(() => {
        document.querySelector('#bankModal .bank-modal-content').classList.add('bank-lobby-mode');
    });
}

function showBankResultModal(title, html) {
    document.getElementById('bankResultModalTitle').textContent = title;
    document.getElementById('bankResultContent').innerHTML = html;
    document.getElementById('bankResultModal').classList.add('active');
}

function closeBankResultModal() {
    document.getElementById('bankResultModal').classList.remove('active');
    document.getElementById('bankModal').classList.remove('active');
}

function showDepositComplete(amount) {
    const html = `
        <p style="font-size:20px;font-weight:bold;margin:0 0 20px;color:#eb6101;text-align:center;">
            ${amount.toLocaleString()}円預けました。
        </p>
        <div style="display:inline-block;text-align:left;">
            <p style="margin:4px 0;color:#333;">所持金　：${gameState.player.money.toLocaleString()}円</p>
            <p style="margin:4px 0;color:#333;">預金残高：${gameState.savings.toLocaleString()}円</p>
        </div>
    `;
    showBankResultModal('', html);
}

function confirmDeposit() {
    const amount = parseInt(depositNumpadStr) || 0;

    if (amount <= 0) {
        return;
    }

    if (amount > gameState.player.money) {
        return;
    }

    // 預け入れ処理
    gameState.player.money -= amount;
    gameState.savings += amount;
    addBankHistory('deposit', amount, 'お預入れ');
    updateStatus();

    // 完了画面を表示
    gameState.pendingRandomEvent = true;
    showDepositComplete(amount);
    afterAction();
}

function depositKeepAmountDirect(keepAmount) {
    const currentMoney = gameState.player.money;

    if (keepAmount === 0) {
        if (currentMoney <= 0) return;
        gameState.player.money = 0;
        gameState.savings += currentMoney;
        addBankHistory('deposit', currentMoney, 'お預入れ');
        updateStatus();
        gameState.pendingRandomEvent = true;
        showDepositComplete(currentMoney);
        afterAction();
        return;
    }

    if (currentMoney <= keepAmount) return;

    const depositAmount = currentMoney - keepAmount;
    gameState.player.money -= depositAmount;
    gameState.savings += depositAmount;
    addBankHistory('deposit', depositAmount, 'お預入れ');
    updateStatus();
    gameState.pendingRandomEvent = true;
    showDepositComplete(depositAmount);
    afterAction();
}

function showBankHistory() {
    document.getElementById('bankLobbyView').style.display = 'none';
    document.getElementById('bankHistoryView').style.display = '';
    bankShowBackBtn();
    requestAnimationFrame(() => {
        document.querySelector('#bankModal .bank-modal-content').classList.remove('bank-lobby-mode');
    });

    // テーブルを更新
    renderBankHistory();
}

function renderBankHistory() {
    const tbody = document.getElementById('bankHistoryTableBody');
    const emptyMsg = document.getElementById('bankHistoryEmpty');

    // 最新100件を取得（新しい順）
    const history = gameState.bankHistory.slice(-100).reverse();

    if (history.length === 0) {
        tbody.innerHTML = '';
        emptyMsg.style.display = 'block';
        return;
    }

    emptyMsg.style.display = 'none';

    tbody.innerHTML = history.map(item => {
        const date = new Date(item.date);
        const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
        const payment = item.payment ? `<span class="payment">-${item.payment.toLocaleString()}</span>` : '';
        const deposit = item.deposit ? `<span class="deposit">+${item.deposit.toLocaleString()}</span>` : '';
        const balance = `<span class="balance">${item.balance.toLocaleString()}</span>`;

        return `
            <tr>
                <td>${dateStr}</td>
                <td>${item.description}</td>
                <td>${payment}</td>
                <td>${deposit}</td>
                <td>${balance}</td>
            </tr>
        `;
    }).join('');
}

function addBankHistory(type, amount, description, memo = '') {
    const now = new Date();
    const entry = {
        date: now.getTime(),
        payment: type === 'payment' ? amount : 0,
        deposit: type === 'deposit' ? amount : 0,
        description: description,
        balance: gameState.savings,
        memo: memo
    };

    gameState.bankHistory.push(entry);

    // 100件を超えたら古いものを削除
    if (gameState.bankHistory.length > 100) {
        gameState.bankHistory = gameState.bankHistory.slice(-100);
    }
}

function showTransfer() {
    // ロビーを隠してお振り込み画面を表示
    document.getElementById('bankLobbyView').style.display = 'none';
    document.getElementById('bankTransferView').style.display = 'block';
    bankShowBackBtn();
    requestAnimationFrame(() => {
        document.querySelector('#bankModal .bank-modal-content').classList.remove('bank-lobby-mode');
    });

    // 預金残高を表示
    document.getElementById('transferCurrentSavings').textContent = gameState.savings.toLocaleString();

    // 入力欄をリセット
    document.getElementById('transferName').value = '';
    document.getElementById('transferAmount').value = '';
}

function showTransferConfirm() {
    const name = document.getElementById('transferName').value.trim();
    const amount = parseInt(document.getElementById('transferAmount').value) || 0;
    const errorEl = document.getElementById('transferErrorMessage');

    if (gameState.savings <= 0) {
        errorEl.textContent = '預金が無いためお振込みができません';
        errorEl.style.display = 'block';
        return;
    }

    if (!name) {
        errorEl.textContent = 'お振込み先のお名前を入力してください';
        errorEl.style.display = 'block';
        return;
    }

    if (amount <= 0 || amount > gameState.savings) {
        errorEl.textContent = '預金残高が足りません';
        errorEl.style.display = 'block';
        return;
    }

    errorEl.style.display = 'none';

    // 確認画面に情報を表示
    document.getElementById('transferTargetName').textContent = name;
    document.getElementById('transferTargetJob').textContent = '---'; // Firebase連携時に取得
    document.getElementById('transferTargetAvatar').innerHTML = `<img src="${gameState.player.avatar}" alt="アバター" class="player-avatar-img">`;
    document.getElementById('transferTargetAvatar').style.backgroundColor = gameState.player.avatarBgColor;
    document.getElementById('transferConfirmAmount').textContent = amount.toLocaleString();
    document.getElementById('transferConfirmSavings').textContent = gameState.savings.toLocaleString();

    // 確認画面を表示
    document.getElementById('bankTransferView').style.display = 'none';
    document.getElementById('bankTransferConfirmView').style.display = 'block';
}

function backToTransferInput() {
    // 入力画面に戻る
    document.getElementById('bankTransferConfirmView').style.display = 'none';
    document.getElementById('bankTransferView').style.display = 'block';
}

function confirmTransfer() {
    const name = document.getElementById('transferName').value.trim();
    const amount = parseInt(document.getElementById('transferAmount').value) || 0;

    // 振り込み処理（普通口座から引き落とし）
    gameState.savings -= amount;
    addBankHistory('payment', amount, `お振込み→${name}`);
    updateStatus();

    // 確認画面を非表示にして銀行メニューに戻る
    gameState.pendingRandomEvent = true;
    document.getElementById('bankTransferConfirmView').style.display = 'none';
    backToBankMenu();
    afterAction();
}

let withdrawNumpadStr = '';
let withdrawKeepSelected = null;

function withdrawNumpadUpdate() {
    const val = parseInt(withdrawNumpadStr) || 0;
    const el = document.getElementById('withdrawNumpadDisplay');
    const text = val.toLocaleString();
    el.textContent = text;

    const displayBox = el.closest('.bank-numpad-display');
    const unitEl = el.nextElementSibling;
    const boxStyle = getComputedStyle(displayBox);
    const available = displayBox.clientWidth
        - parseFloat(boxStyle.paddingLeft)
        - parseFloat(boxStyle.paddingRight)
        - (unitEl ? unitEl.offsetWidth + parseFloat(getComputedStyle(unitEl).marginLeft) : 20);

    if (available <= 0) { el.style.fontSize = '20px'; return; }

    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;top:-9999px;left:0;white-space:nowrap;font-weight:bold;' +
        'font-family:' + getComputedStyle(el).fontFamily + ';font-size:20px';
    probe.textContent = text;
    document.body.appendChild(probe);

    let fs = 20;
    while (probe.offsetWidth > available && fs > 11) {
        fs--;
        probe.style.fontSize = fs + 'px';
    }
    document.body.removeChild(probe);
    el.style.fontSize = fs + 'px';

    const confirmBtn = document.getElementById('withdrawConfirmBtn');
    if (confirmBtn) {
        confirmBtn.disabled = val > 0 && val > gameState.savings;
    }
}

function withdrawNumpadInput(digits) {
    if (withdrawNumpadStr.length >= 16) return;
    if (withdrawNumpadStr === '' && digits === '0') return;
    if (withdrawNumpadStr === '' && digits === '00') return;
    withdrawNumpadStr += digits;
    withdrawNumpadStr = String(parseInt(withdrawNumpadStr) || 0);
    if (withdrawNumpadStr === '0') withdrawNumpadStr = '';
    clearWithdrawKeepSelection();
    withdrawNumpadUpdate();
}

function withdrawNumpadMan() {
    if (!withdrawNumpadStr) return;
    const val = parseInt(withdrawNumpadStr) * 10000;
    withdrawNumpadStr = String(Math.min(val, 9999999999999999));
    clearWithdrawKeepSelection();
    withdrawNumpadUpdate();
}

function withdrawNumpadSen() {
    if (!withdrawNumpadStr) return;
    const val = parseInt(withdrawNumpadStr) * 1000;
    withdrawNumpadStr = String(Math.min(val, 9999999999999999));
    clearWithdrawKeepSelection();
    withdrawNumpadUpdate();
}

function withdrawNumpadAll() {
    withdrawNumpadStr = String(gameState.savings);
    clearWithdrawKeepSelection();
    withdrawNumpadUpdate();
}

function withdrawNumpadCorrect() {
    withdrawNumpadStr = '';
    clearWithdrawKeepSelection();
    withdrawNumpadUpdate();
}

function clearWithdrawKeepSelection() {
    withdrawKeepSelected = null;
    document.querySelectorAll('#bankWithdrawView .bank-keep-btn').forEach(b => b.classList.remove('selected'));
}

function selectWithdrawKeepAmount(btn, amount) {
    withdrawKeepSelected = amount;
    document.querySelectorAll('#bankWithdrawView .bank-keep-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    withdrawNumpadStr = '';
    withdrawNumpadUpdate();
}

function withdrawConfirmUnified() {
    const amount = parseInt(withdrawNumpadStr) || 0;
    if (amount <= 0) return;
    if (amount > gameState.savings) return;
    gameState.savings -= amount;
    gameState.player.money += amount;
    addBankHistory('payment', amount, 'お引き出し');
    updateStatus();
    gameState.pendingRandomEvent = true;
    showWithdrawComplete(amount);
    afterAction();
}

function withdraw() {
    // ロビーを隠してお引き出し画面を表示
    document.getElementById('bankLobbyView').style.display = 'none';
    document.getElementById('bankWithdrawView').style.display = 'block';
    bankShowBackBtn();
    requestAnimationFrame(() => {
        document.querySelector('#bankModal .bank-modal-content').classList.remove('bank-lobby-mode');
    });

    // 表示をリセット
    withdrawNumpadStr = '';
    withdrawKeepSelected = null;
    document.querySelectorAll('#bankWithdrawView .bank-keep-btn').forEach(b => b.classList.remove('selected'));
    withdrawNumpadUpdate();

    document.getElementById('withdrawCurrentMoney').textContent = gameState.player.money.toLocaleString();
    document.getElementById('withdrawCurrentSavings').textContent = gameState.savings.toLocaleString();

    // 残高に応じてkeepボタンを無効化
    const savings = gameState.savings;
    document.querySelectorAll('#bankWithdrawView .bank-keep-btn').forEach(btn => {
        const keep = parseInt(btn.dataset.keep);
        btn.disabled = keep > 0 && savings <= keep;
    });
}

function showWithdrawComplete(amount) {
    const html = `
        <p style="font-size:20px;font-weight:bold;margin:0 0 20px;color:#eb6101;text-align:center;">
            ${amount.toLocaleString()}円引き出しました。
        </p>
        <div style="display:inline-block;text-align:left;">
            <p style="margin:4px 0;color:#333;">所持金　：${gameState.player.money.toLocaleString()}円</p>
            <p style="margin:4px 0;color:#333;">預金残高：${gameState.savings.toLocaleString()}円</p>
        </div>
    `;
    showBankResultModal('', html);
}


