function setArcadeLobbyMode() {
    const mc = document.querySelector('#arcadeModal .arcade-modal-content');
    mc.classList.add('arcade-lobby-mode');
    mc.classList.remove('arcade-card-mode');
    document.getElementById('arcadeLobbyView').style.display = '';
    document.getElementById('arcadeCardView').style.display = 'none';
    document.getElementById('arcadeBackBtn').style.display = 'none';
}

function openArcadeModal() {
    setArcadeLobbyMode();
    document.getElementById('arcadeModal').classList.add('active');
}

function closeArcadeModal() {
    const mc = document.querySelector('#arcadeModal .arcade-modal-content');
    mc.classList.remove('arcade-lobby-mode');
    mc.classList.remove('arcade-card-mode');
    document.getElementById('arcadeModal').classList.remove('active');
}

function openArcadeCardGame() {
    const el = document.querySelector('#arcadeModal .arcade-modal-content');
    el.classList.remove('arcade-lobby-mode');
    el.classList.add('arcade-card-mode');
    document.getElementById('arcadeLobbyView').style.display = 'none';
    document.getElementById('arcadeCardView').style.display = '';
    document.getElementById('arcadeBackBtn').style.display = '';
}

function backToArcadeLobby() {
    setArcadeLobbyMode();
}

// モーダルを開いた時点の lastCard と、引いたカードを保持する表示用一時変数
let _cgPrevCard = null;
let _cgDrawnCard = null;

function openCardGameModal() {
    const cg = gameState.cardGame;
    if (cg.lastCard === null) {
        cg.lastCard = Math.floor(Math.random() * 7) + 1;
    }
    _cgPrevCard = cg.lastCard;  // モーダルを開いた時点の値を「前回のカード」として固定
    _cgDrawnCard = null;
    renderCardGame();
    openArcadeCardGame();
}

function closeCardGameModal() {
    backToArcadeLobby();
}

function hasDrawnToday() {
    return gameState.cardGame.lastDrawDate === todayStr();
}

function addCardGameHistory(win, text) {
    const history = gameState.cardGame.history;
    history.push({ win, text });
    if (history.length > 20) history.shift();
}

function renderCardGame() {
    const cg = gameState.cardGame;

    const currentCardEl = document.getElementById('cardgameCurrentCard');
    if (_cgDrawnCard !== null) {
        currentCardEl.className = 'cardgame-card-front';
        currentCardEl.textContent = _cgDrawnCard;
    } else {
        currentCardEl.className = 'cardgame-card-back';
        currentCardEl.textContent = '?';
    }

    document.getElementById('cardgamePrevCard').textContent = _cgPrevCard;

    const tableEl = document.getElementById('cardgameTable');
    if (cg.tableCards.length === 0) {
        tableEl.innerHTML = '<span class="cardgame-empty-msg">まだカードはありません</span>';
    } else {
        tableEl.innerHTML = cg.tableCards.map(n =>
            `<div class="cardgame-card">${n}</div>`
        ).join('');
    }

    const stakeEl = document.getElementById('cardgameStake');
    const drawBtn = document.getElementById('cardgameDrawBtn');
    const resultEl = document.getElementById('cardgameResult');

    stakeEl.textContent = '';
    if (hasDrawnToday()) {
        drawBtn.disabled = true;
        // セッション中に引いていない（モーダルを開き直した）場合のみメッセージを表示
        if (_cgDrawnCard === null) {
            resultEl.className = 'arcade-card-result';
            resultEl.textContent = '本日はすでに引きました。また明日どうぞ！';
        }
    } else {
        drawBtn.disabled = false;
    }

    renderCardGameHistory();
}

function drawCard() {
    const cg = gameState.cardGame;

    if (hasDrawnToday()) {
        showToast('本日はすでにカードを引きました。また明日どうぞ！');
        return;
    }

    const drawn = Math.floor(Math.random() * 7) + 1;
    const prevCard = cg.lastCard;
    const chainLen = cg.tableCards.length;
    const resultEl = document.getElementById('cardgameResult');

    if (drawn !== prevCard) {
        const reward = (chainLen + 1) * 10000;
        changeMoney(reward);
        cg.tableCards.push(drawn);
        cg.lastCard = drawn;

        const text = `${gameState.player.name}さんが${reward / 10000}万円をゲットしました。`;
        addCardGameHistory(true, text);

        resultEl.className = 'arcade-card-result cardgame-result-win';
        resultEl.innerHTML = `セーフ！${reward / 10000}万円ゲットしました！`;
    } else {
        const penalty = (chainLen + 1) * 10000;

        changeMoney(-penalty);

        cg.tableCards = [];
        cg.lastCard = Math.floor(Math.random() * 7) + 1;

        const text = `${gameState.player.name}さんが${penalty / 10000}万円を支払いました。`;
        const resultMsg = `アウトォォーーーー！！！！${penalty / 10000}万円支払いました！`;
        addCardGameHistory(false, text);

        resultEl.className = 'arcade-card-result cardgame-result-lose';
        resultEl.innerHTML = resultMsg;
    }

    _cgDrawnCard = drawn;
    cg.lastDrawDate = todayStr();
    renderCardGame();
    updateStatus();
    saveGame(true);
}

function renderCardGameHistory() {
    const historyEl = document.getElementById('cardgameHistory');
    const cg = gameState.cardGame;

    if (cg.history.length === 0) {
        historyEl.innerHTML = '<span class="cardgame-empty-msg">まだゲーム履歴はありません</span>';
        return;
    }
    historyEl.innerHTML = '';
    for (let i = cg.history.length - 1; i >= 0; i--) {
        const h = cg.history[i];
        const div = document.createElement('div');
        div.className = h.win ? 'arcade-card-history-win' : 'arcade-card-history-lose';
        div.textContent = h.text;
        historyEl.appendChild(div);
    }
}
