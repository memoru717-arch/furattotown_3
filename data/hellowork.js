// ============================================
// ふらっとタウン - ハローワーク機能
// ============================================

// 現在表示中のクラスタブ（1=初級, 2=中級, 3=上級）
let helloworkCurrentTier = 1;

function getPlayerBmi() {
    return Math.round(gameState.player.weight / ((gameState.player.height / 100) ** 2) * 10) / 10;
}

function openHelloworkModal() {
    const modal = document.getElementById('helloworkModal');

    // ビューをリセット（メイン画面を表示）
    document.querySelector('.hellowork-body').style.display = '';
    document.querySelector('.hellowork-modal-content').classList.remove('complete-view');
    document.getElementById('helloworkCompleteView').style.display = 'none';
    document.querySelector('.hellowork-complete-details').style.display = '';

    // タブを初級に戻す
    helloworkCurrentTier = 1;
    updateTabUI();

    // ユーザー名を反映
    document.getElementById('helloworkUserName').textContent = gameState.player.name;

    // 職業テーブルを生成
    renderJobTable();

    // 就職可能な職業リストを更新
    updateAvailableJobs();

    // 目標職業の表示を更新
    updateTargetJobDropdown();
    renderTargetJobDisplay();

    modal.classList.add('active');
}

function closeHelloworkModal() {
    document.getElementById('helloworkModal').classList.remove('active');
    // ビューをリセット
    document.querySelector('.hellowork-body').style.display = '';
    document.querySelector('.hellowork-modal-content').classList.remove('complete-view');
    document.getElementById('helloworkCompleteView').style.display = 'none';
    document.querySelector('.hellowork-complete-details').style.display = '';
    // 就職したときだけランダムイベント判定
    flushRandomEvent();
}

// タブ切り替え
function switchJobTab(tier) {
    helloworkCurrentTier = tier;
    updateTabUI();
    renderJobTable();
    updateTargetJobDropdown();
    renderTargetJobDisplay();
}

// タブのアクティブ状態とクラスボーナス表示を更新
function updateTabUI() {
    document.querySelectorAll('.hellowork-tab').forEach(tab => {
        const tabTier = parseInt(tab.dataset.tier);
        tab.classList.toggle('active', tabTier === helloworkCurrentTier);
    });

    // tierクラスを付け替え（色テーマ切り替え用）
    const body = document.querySelector('.hellowork-body');
    if (body) {
        body.classList.remove('tier-1', 'tier-2', 'tier-3');
        body.classList.add(`tier-${helloworkCurrentTier}`);
    }

    // 吹き出し情報を更新（初級：ボーナスのみ / 中級・上級：レベル条件＋ボーナス）
    const infoEl = document.getElementById('helloworkClassInfo');
    if (infoEl) {
        infoEl.textContent = `レベルアップボーナス：給料の${classBonusRates[helloworkCurrentTier]}倍`;
    }

}

// 職業テーブルを動的に生成（現在のtierに基づく）
function renderJobTable() {
    const tbody = document.getElementById('helloworkTableBody');
    const tier = helloworkCurrentTier;
    const abilities = gameState.player.abilities;
    const playerBmi = getPlayerBmi();
    const playerGender = gameState.player.gender || null;

    // ユーザー能力値行（プレイヤーの現在値を表示）
    const userStatsRow = `
        <tr class="hellowork-user-stats">
            <td class="user-stats-label">現在の能力値</td>
            <td id="userStatKokugo">${abilities.国語}</td>
            <td id="userStatSugaku">${abilities.数学}</td>
            <td id="userStatRika">${abilities.理科}</td>
            <td id="userStatShakai">${abilities.社会}</td>
            <td id="userStatEigo">${abilities.英語}</td>
            <td id="userStatOngaku">${abilities.音楽}</td>
            <td id="userStatBijutsu">${abilities.美術}</td>
            <td id="userStatTairyoku">${abilities.体力}</td>
            <td id="userStatKiryoku">${abilities.気力}</td>
            <td id="userStatLooks">${abilities.ルックス}</td>
            <td id="userStatSubayasa">${abilities.素早さ}</td>
            <td id="userStatOmoshirosa">${abilities.面白さ}</td>
            <td id="userStatYasashisa">${abilities.優しさ}</td>
            <td id="userStatErosa">${abilities.エロさ}</td>
            <td id="userStatBMI">${playerBmi.toFixed(1)}</td>
            <td id="userStatGender">${playerGender || ''}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    `;

    // 職業行を生成
    const abilityKeys = ['国語', '数学', '理科', '社会', '英語', '音楽', '美術', '体力', '気力', 'ルックス', '素早さ', '面白さ', '優しさ', 'エロさ'];
    let jobRows = '';
    let rowIndex = 0;

    jobsData.forEach(job => {
        const tierData = getJobTierData(job, tier);

        // 就職可能ハイライトは初級タブのみ
        const canApply = tier === 1 && checkJobRequirements(job);
        const evenClass = rowIndex % 2 === 0 ? 'row-even' : '';
        const rowClass = [canApply ? 'job-available' : '', evenClass].filter(Boolean).join(' ');
        rowIndex++;

        // 能力値セルを生成（要求値のみ表示、0の場合は空白）
        let abilityCells = '';
        abilityKeys.forEach(key => {
            const required = tierData.abilities[key];
            abilityCells += `<td>${required > 0 ? required : ''}</td>`;
        });

        // BMI条件セル（条件は全クラス共通）
        let bmiText = '';
        if (job.conditions.bmi[0] > 0 || job.conditions.bmi[1] < 99) {
            if (job.conditions.bmi[1] >= 99) {
                bmiText = `${job.conditions.bmi[0]}以上`;
            } else if (job.conditions.bmi[0] <= 0) {
                bmiText = `${job.conditions.bmi[1]}以下`;
            } else {
                bmiText = `${job.conditions.bmi[0]}~${job.conditions.bmi[1]}`;
            }
        }

        // 性別条件セル
        const genderText = job.conditions.gender || '';

        jobRows += `
            <tr class="${rowClass}" id="job-row-${job.id}">
                <td class="job-name">${tierData.name}</td>
                ${abilityCells}
                <td>${bmiText}</td>
                <td>${genderText}</td>
                <td>${Math.round((0.05 + tierData.bodyConsume * 0.01) * 1000)}kcal</td>
                <td class="salary">${tierData.salary.toLocaleString()}円</td>
                <td>${tierData.bodyConsume}</td>
                <td>${tierData.brainConsume}</td>
            </tr>
        `;
    });

    tbody.innerHTML = userStatsRow + jobRows;
}

// 初級の就職条件を満たしているかチェック
function checkJobRequirements(job) {
    const abilities = gameState.player.abilities;
    const playerBmi = getPlayerBmi();
    const playerGender = gameState.player.gender || null;
    const abilityKeys = ['国語', '数学', '理科', '社会', '英語', '音楽', '美術', '体力', '気力', 'ルックス', '素早さ', '面白さ', '優しさ', 'エロさ'];

    for (const key of abilityKeys) {
        if (abilities[key] < job.abilities[key]) return false;
    }
    if (playerBmi < job.conditions.bmi[0] || playerBmi > job.conditions.bmi[1]) return false;
    if (job.conditions.gender && playerGender !== job.conditions.gender) return false;

    return true;
}

// 就職セレクトを更新（初級のみ・条件を満たした職業）
function updateAvailableJobs() {
    const select = document.getElementById('helloworkJobSelect');
    select.innerHTML = '<option value="">-- 職業を選択 --</option>';

    const availableJobs = jobsData.filter(job => checkJobRequirements(job));
    availableJobs.forEach(job => {
        const option = document.createElement('option');
        option.value = job.id;
        option.textContent = job.names[0];
        select.appendChild(option);
    });

    if (availableJobs.length === 0) {
        select.innerHTML = '<option value="">就職可能な職業がありません</option>';
    }
}

// 目標職業ドロップダウンを更新（現在の職業をおすすめとして先頭に表示）
function updateTargetJobDropdown() {
    const select = document.getElementById('targetJobSelect');
    const tierIndex = helloworkCurrentTier - 1;
    select.innerHTML = '<option value="">-- 職業を選択 --</option>';

    const currentJob = gameState.player.currentJobId
        ? jobsData.find(j => j.id === gameState.player.currentJobId)
        : null;

    if (currentJob && helloworkCurrentTier > 1) {
        // おすすめグループ（中級・上級のみ表示）
        const recommendGroup = document.createElement('optgroup');
        recommendGroup.label = 'おすすめ';
        const recOption = document.createElement('option');
        recOption.value = currentJob.id;
        recOption.textContent = currentJob.names[tierIndex];
        recommendGroup.appendChild(recOption);
        select.appendChild(recommendGroup);

        // その他の職業グループ
        const otherGroup = document.createElement('optgroup');
        otherGroup.label = 'その他の職業';
        jobsData.forEach(job => {
            if (job.id === currentJob.id) return;
            const option = document.createElement('option');
            option.value = job.id;
            option.textContent = job.names[tierIndex];
            otherGroup.appendChild(option);
        });
        select.appendChild(otherGroup);
    } else {
        // 職業なし：全職業をフラットに表示
        jobsData.forEach(job => {
            const option = document.createElement('option');
            option.value = job.id;
            option.textContent = job.names[tierIndex];
            select.appendChild(option);
        });
    }
}

// 目標職業の表示を切り替え
function renderTargetJobDisplay() {
    const selectArea = document.getElementById('targetJobSelectArea');
    const display = document.getElementById('targetJobDisplay');
    const nameSpan = document.getElementById('targetJobName');
    const btn = document.getElementById('targetJobBtn');

    if (gameState.player.targetJob) {
        const job = jobsData.find(j => j.id === gameState.player.targetJob);
        if (job) {
            const tierIndex = (gameState.player.targetJobTier || 1) - 1;
            nameSpan.textContent = job.names[tierIndex];
            selectArea.style.display = 'none';
            display.style.display = '';
            btn.textContent = 'キャンセルする';
            btn.classList.add('btn-cancel');
            btn.onclick = removeTargetJob;
        }
    } else {
        selectArea.style.display = '';
        display.style.display = 'none';
        btn.textContent = 'この職業を目標にする';
        btn.classList.remove('btn-cancel');
        btn.onclick = setTargetJob;
    }
}

// 目標職業を設定
function setTargetJob() {
    const select = document.getElementById('targetJobSelect');
    const jobId = select.value;
    if (!jobId) return;

    gameState.player.targetJob = jobId;
    gameState.player.targetJobTier = helloworkCurrentTier;
    renderTargetJobDisplay();
}

// 目標職業を解除
function removeTargetJob() {
    gameState.player.targetJob = null;
    gameState.player.targetJobTier = null;
    renderTargetJobDisplay();
    updateTargetJobDropdown();
}

function applyForJob() {
    const select = document.getElementById('helloworkJobSelect');
    const jobId = select.value;
    if (!jobId) return;

    const job = jobsData.find(j => j.id === jobId);
    if (!job) return;

    // 同じ職業に就いている場合はエラー表示
    if (gameState.player.currentJobId === jobId) {
        document.querySelector('.hellowork-body').style.display = 'none';
        document.querySelector('.hellowork-modal-content').classList.add('complete-view');
        const msgEl = document.querySelector('.hellowork-complete-message');
        msgEl.innerHTML = '<span class="error-text">ERROR！</span><br>もう既にその職業に就いています！';
        msgEl.classList.add('no-job');
        document.querySelector('.hellowork-complete-details').style.display = 'none';
        document.getElementById('helloworkCompleteView').style.display = 'flex';
        return;
    }

    // 就職処理（初級・Lv.1からスタート）
    gameState.pendingRandomEvent = true;
    gameState.player.job = job.names[0];
    gameState.player.jobLevel = 1;
    gameState.player.jobExp = 0;
    gameState.player.workCount = 0;
    gameState.player.currentJobId = job.id;
    gameState.player.jobClass = 1;

    updateStatus();

    // 就職完了画面を表示
    document.querySelector('.hellowork-body').style.display = 'none';
    document.querySelector('.hellowork-modal-content').classList.add('complete-view');
    const msgEl = document.querySelector('.hellowork-complete-message');
    msgEl.innerHTML = 'おめでとうございます！<br><span id="helloworkCompleteJobName"></span>になりました。';
    document.getElementById('helloworkCompleteJobName').textContent = job.names[0];
    msgEl.classList.remove('no-job');
    document.querySelector('.hellowork-complete-details').style.display = '';
    document.getElementById('helloworkCompleteSalary').textContent = getJobTierData(job, 1).salary.toLocaleString();
    document.getElementById('helloworkCompleteBonus').textContent = classBonusRates[1];
    document.getElementById('helloworkCompleteView').style.display = 'flex';
}
