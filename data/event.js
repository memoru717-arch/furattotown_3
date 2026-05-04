// ============================================
// ランダムイベント
// ============================================
// 通常ランダムイベント（病気以外）
const randomEvents = [
    {
        text: 'ピアノの練習をしました。音楽の力が３アップ！',
        type: 'good',
        effect: () => { gameState.player.abilities.音楽 += 3; }
    },
    {
        text: '出した本の印税が1000円入りました。',
        type: 'good',
        effect: () => { gameState.player.money += 1000; }
    },
    {
        text: '裸で寝ていたら体調を崩したようです。',
        type: 'bad',
        effect: () => { gameState.player.disease = 'kaze'; }
    },
    {
        text: '社会への関心が引き潮が引くように無くなっていきました。社会の力が３ダウン。',
        type: 'bad',
        effect: () => { gameState.player.abilities.社会 = Math.max(0, gameState.player.abilities.社会 - 3); }
    },
    {
        text: '文学に目覚めました。国語力３アップ！',
        type: 'good',
        effect: () => { gameState.player.abilities.国語 += 3; }
    },
    {
        text: 'スリに遭いました。持ち金が半分になってしまいました。',
        type: 'bad',
        effect: () => { gameState.player.money = Math.floor(gameState.player.money / 2); }
    },
    {
        text: '不思議に優しい気持ちにつつまれました。優しさ度が５アップ！',
        type: 'good',
        effect: () => { gameState.player.abilities.優しさ += 5; }
    },
    {
        text: '下痢気味でエッチにも力が入りません。。エロさ度が３ダウン。。',
        type: 'bad',
        effect: () => { gameState.player.abilities.エロさ = Math.max(0, gameState.player.abilities.エロさ - 3); }
    },
    {
        text: 'パチンコで１万すってしまいました。。',
        type: 'bad',
        effect: () => { gameState.player.money = Math.max(0, gameState.player.money - 10000); }
    },
    {
        text: '理科の実験で試験管を割ってしまいました。理科の力が３ダウン！',
        type: 'bad',
        effect: () => { gameState.player.abilities.理科 = Math.max(0, gameState.player.abilities.理科 - 3); }
    },
    {
        // 週1回限定：総資産の1%を納税
        condition: () => {
            if (!gameState.lastTaxEventDate) return true;
            const elapsed = Date.now() - new Date(gameState.lastTaxEventDate).getTime();
            return elapsed >= 7 * 24 * 60 * 60 * 1000;
        },
        textFn: () => {
            const tax = Math.floor((gameState.player.money + gameState.savings) * 0.01);
            return `税務署に総資産の１％である${tax.toLocaleString()}円を納税しました。`;
        },
        type: 'bad',
        effect: () => {
            const tax = Math.floor((gameState.player.money + gameState.savings) * 0.01);
            gameState.player.money = Math.max(0, gameState.player.money - tax);
            gameState.lastTaxEventDate = new Date().toISOString();
        }
    },
    {
        text: 'ゲームばかりしていてノイローゼになりました。体重が1kg減りました。',
        type: 'bad',
        effect: () => { gameState.player.weight = Math.max(0, Math.round((gameState.player.weight - 1) * 10) / 10); }
    },
    {
        text: '古典的なギャグで滑り、周囲の空気がマイナスに…。社会の力が2ダウン。',
        type: 'bad',
        effect: () => { gameState.player.abilities.社会 = Math.max(0, gameState.player.abilities.社会 - 2); }
    },
    {
        text: '鼻歌を歌っていたら野良猫が寄ってきた！音楽の力が4アップ！',
        type: 'good',
        effect: () => { gameState.player.abilities.音楽 += 4; }
    },
    {
        text: '「絶対儲かる」という看板に釣られて怪しいセミナーへ。参加費で20,000円払いました。',
        type: 'bad',
        effect: () => { gameState.player.money = Math.max(0, gameState.player.money - 20000); }
    },
    {
        text: 'ラッキー！タンスの奥からへそくりを発見！10,000円ゲット！',
        type: 'good',
        effect: () => { gameState.player.money += 10000; }
    },
    {
        text: '朝起きたら寝癖が芸術的でした。芸術力5アップ！',
        type: 'good',
        effect: () => { gameState.player.abilities.美術 += 5; }
    },
    {
        text: '辛いものと甘いものを交互に食べていたら3kg太ってしまいました。。。',
        type: 'bad',
        effect: () => { gameState.player.weight = Math.round((gameState.player.weight + 3) * 10) / 10; }
    },
    {
        text: '留学した友達が英語を教えてくれました。英語力５アップ！',
        type: 'good',
        effect: () => { gameState.player.abilities.英語 += 5; }
    },
    {
        text: '数学クイズで遊びました。数学力３アップ！',
        type: 'good',
        effect: () => { gameState.player.abilities.数学 += 3; }
    },
    {
        text: '数字恐怖症になりました。数学力３ダウン。',
        type: 'bad',
        effect: () => { gameState.player.abilities.数学 = Math.max(0, gameState.player.abilities.数学 - 3); }
    },
    {
        textFn: () => {
            const pct = (Math.floor(Math.random() * 5) + 1) * 10;
            gameState._stolenAmount = Math.floor(gameState.player.money * pct / 100);
            return `泥棒に入られました。${gameState._stolenAmount.toLocaleString()}円盗まれました。`;
        },
        type: 'bad',
        effect: () => {
            gameState.player.money = Math.max(0, gameState.player.money - (gameState._stolenAmount || 0));
            gameState._stolenAmount = 0;
        }
    },
    {
        text: '失恋してやけ食いしました。体重が1kg増えました。',
        type: 'bad',
        effect: () => { gameState.player.weight = Math.round((gameState.player.weight + 1) * 10) / 10; }
    },
    {
        text: '車にひかれかけましたが、軽いフットワークでかわしました。',
        type: 'good',
        effect: () => {}
    },
    {
        text: '電車に乗り遅れそうになって全力ダッシュした！素早さが3アップ！',
        type: 'good',
        effect: () => { gameState.player.abilities.素早さ += 3; }
    },
    {
        text: 'バナナの皮で滑ったが周囲の人を笑わせた！面白さが5アップ！',
        type: 'good',
        effect: () => { gameState.player.abilities.面白さ += 5; }
    },
    {
        text: 'なんか今日、顔がいい気がする。ルックスが3アップ！',
        type: 'good',
        effect: () => { gameState.player.abilities.ルックス += 3; }
    },
    {
        text: '流れ星に願い事をしたら元気が出てきた！気力が10アップ！',
        type: 'good',
        effect: () => { gameState.player.abilities.気力 += 10; }
    },
    {
        textFn: () => {
            gameState._walletAmount = (Math.floor(Math.random() * 6) + 1) * 500;
            return `落ちてる財布を発見！${gameState._walletAmount.toLocaleString()}円入っていたのでねこばばしました。`;
        },
        type: 'good',
        effect: () => {
            gameState.player.money += gameState._walletAmount || 0;
            gameState._walletAmount = 0;
        }
    },
    // 条件なし病気（ランダムイベントとして発生）
    {
        text: 'バナナの皮で滑って転倒！骨折してしまいました。',
        type: 'bad',
        isDisease: true,
        condition: () => !gameState.player.disease,
        effect: () => { gameState.player.disease = 'kossetsu'; }
    },
    {
        text: '消費期限切れの豚肉を食べたら胃腸炎にかかってしまいました。',
        type: 'bad',
        isDisease: true,
        condition: () => !gameState.player.disease,
        effect: () => { gameState.player.disease = 'ichouen'; }
    },
    {
        text: '寒気がする…風邪を引いてしまいました。',
        type: 'bad',
        isDisease: true,
        condition: () => !gameState.player.disease,
        effect: () => { gameState.player.disease = 'kaze'; }
    },
];

// 病気チェック（1日1回、重→中→軽の優先順）
function checkDisease() {
    const p = gameState.player;

    // 今日の日付（YYYY-MM-DD、JST基準）
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 日付が変わっていない場合は何もしない
    if (gameState.lastDiseaseCheckDate === today) return null;
    gameState.lastDiseaseCheckDate = today;

    // workCount/mealCountを保存してリセット（病気中でも必ず実行）
    const workCount = p.workCount;
    const mealCount = p.mealCount;
    p.workCount = 0;
    p.mealCount = 0;

    // すでに病気なら判定はしない（リセットだけして終了）
    if (p.disease) return null;

    const hpRatio = p.health / p.maxHealth;
    const kiryokuRatio = p.intelligence / p.maxIntelligence;

    // 重め（優先度：高）
    if (hpRatio <= 0.2 && Math.random() < 0.15) {
        return { id: 'haien', text: '肺炎にかかってしまいました。' };
    }
    if (hpRatio <= 0.3 && kiryokuRatio <= 0.3 && Math.random() < 0.15) {
        return { id: 'kansenshou', text: '感染症にかかってしまいました。' };
    }
    if (kiryokuRatio <= 0.10 && Math.random() < 0.45) {
        return { id: 'utsubyou', text: 'うつ病になってしまいました。' };
    }

    // 中くらい（優先度：中）
    if (workCount >= 8 && Math.random() < 0.45) {
        return { id: 'gikkurigoshi', text: 'ぎっくり腰になってしまいました。' };
    }

    // 軽め（優先度：低）
    if (mealCount >= 5 && Math.random() < 0.20) {
        return { id: 'mushiba', text: '虫歯になってしまいました。' };
    }

    // 骨折・胃腸炎・風邪は通常ランダムイベントに移動済み

    return null;
}

function tryShowRandomEvent() {
    // 今日の日付（JST基準）
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // まず病気チェック（1日1回）
    const diseaseResult = checkDisease();
    if (diseaseResult) {
        gameState.player.disease = diseaseResult.id;
        gameState.lastDiseaseOccurredDate = today;
        saveGame(true);
        updateStatus();
        showRandomEvent(diseaseResult.text, 'bad');
        return;
    }

    // 通常ランダムイベント（10%の確率）
    if (Math.random() > 0.1) return;

    // 発生可能なイベントを絞り込む
    // 今日すでに病気になっていれば病気系イベントは除外する
    const hadDiseaseToday = gameState.lastDiseaseOccurredDate === today;
    const eligibleEvents = randomEvents.filter(e => {
        if (e.condition && !e.condition()) return false;
        if (hadDiseaseToday && e.isDisease) return false;
        return true;
    });
    if (eligibleEvents.length === 0) return;

    const event = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
    const text = event.textFn ? event.textFn() : event.text;
    event.effect();
    if (event.isDisease) {
        gameState.lastDiseaseOccurredDate = today;
        saveGame(true);
    }
    updateStatus();
    showRandomEvent(text, event.type);
}

function hideRandomEvent() {
    const container = document.getElementById('randomEventNotification');
    if (container) container.style.display = 'none';
}

function flushRandomEvent() {
    hideRandomEvent();
    if (gameState.pendingRandomEvent) {
        gameState.pendingRandomEvent = false;
        tryShowRandomEvent();
    }
}

function showRandomEvent(text, type) {
    const container = document.getElementById('randomEventNotification');
    const textEl = document.getElementById('randomEventText');
    if (!container || !textEl) return;

    // 一旦非表示にしてアニメーションをリセット
    container.style.display = 'none';
    container.className = 'random-event-notification';

    // 少し遅延させてアニメーションを確実に再トリガー
    requestAnimationFrame(() => {
        textEl.innerHTML = '●イベント発生！<br>' + text;
        container.classList.add(type === 'good' ? 'event-good' : 'event-bad');
        container.style.display = '';
    });
}
