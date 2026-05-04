// ============================================
// 役場
// ============================================

function openYakubaModal() {
    document.getElementById('yakubaModal').classList.add('active');
}

function closeYakubaModal() {
    document.getElementById('yakubaModal').classList.remove('active');
}

function applyEmergencySupport() {
    const player = gameState.player;
    const totalAssets = player.money + gameState.savings;
    const heightM = player.height / 100;
    const bmi = player.weight / (heightM * heightM);

    // クールタイムチェック（7日に1回）
    if (gameState.lastEmergencySupport) {
        const daysSince = (Date.now() - gameState.lastEmergencySupport) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) {
            const remaining = Math.ceil(7 - daysSince);
            showToast(`緊急支援金は7日に1回です。あと${remaining}日お待ちください。`);
            return;
        }
    }

    // 受給条件：総資産が0円
    if (totalAssets > 0) {
        showToast('緊急支援金は総資産（所持金＋預金）が0円のときに申請できます。');
        return;
    }

    // BMIチェック
    const tooThin = bmi < 17;
    const tooFat = bmi > 35;

    if (!tooThin && !tooFat) {
        showToast('緊急支援金の対象条件を満たしていません（BMIが正常範囲内です）。');
        return;
    }

    // モーダル表示
    const supportItems = tooThin ? ['おにぎり', 'サンドイッチ', '焼きそば'] : [];
    const supportMoney = 5000;

    const nameEl = document.getElementById('emergencySupportName');
    const contentEl = document.getElementById('emergencySupportContent');
    if (nameEl) nameEl.textContent = player.name;
    document.querySelectorAll('.emergency-name-inline').forEach(el => el.textContent = player.name);

    let contentHtml = `<div class="emergency-support-item">💴 現金 <strong>${supportMoney.toLocaleString()}円</strong></div>`;
    if (tooThin) {
        supportItems.forEach(item => {
            contentHtml += `<div class="emergency-support-item">🍱 ${item} ×1</div>`;
        });
    }
    if (contentEl) contentEl.innerHTML = contentHtml;

    // 受給ボタンにデータをセット
    const receiveBtn = document.getElementById('emergencySupportReceiveBtn');
    if (receiveBtn) {
        receiveBtn.dataset.tooThin = tooThin ? '1' : '0';
    }

    document.getElementById('emergencySupportMainView').style.display = '';
    document.getElementById('emergencySupportCompleteView').style.display = 'none';
    document.getElementById('emergencySupportModal').style.display = 'flex';
}

function receiveEmergencySupport() {
    const player = gameState.player;
    const receiveBtn = document.getElementById('emergencySupportReceiveBtn');
    const tooThin = receiveBtn && receiveBtn.dataset.tooThin === '1';

    // 支給
    changeMoney(5000);
    addBankHistory('入金', 5000, '緊急支援金');

    if (tooThin) {
        const foodItems = [
            { name: 'おにぎり', consumable: true, price: 130, calorie: 180, hungerEffect: 1, description: 'コンビニのおにぎり。', effect: null, stats: {}, useCount: 1, remainingUses: 1, purchaseDate: Date.now() },
            { name: 'サンドイッチ', consumable: true, price: 300, calorie: 320, hungerEffect: 1, description: 'サンドイッチ。', effect: null, stats: {}, useCount: 1, remainingUses: 1, purchaseDate: Date.now() },
            { name: '焼きそば', consumable: true, price: 500, calorie: 500, hungerEffect: 2, description: '焼きそば。', effect: null, stats: { 体力: 1, 気力: 1 }, useCount: 1, remainingUses: 1, purchaseDate: Date.now() }
        ];
        foodItems.forEach(item => player.possessions.push(item));
    }

    gameState.lastEmergencySupport = Date.now();

    // 完了画面へ
    document.getElementById('emergencySupportMainView').style.display = 'none';
    document.getElementById('emergencySupportCompleteView').style.display = '';
}

function closeEmergencyModal() {
    document.getElementById('emergencySupportModal').style.display = 'none';
}


// ============================================
// プロフィール
// ============================================
let selectedProfileAvatar = 'Profile/Profile1.png';

// 使用済みの名前リスト（将来的にサーバーから取得する想定）
const reservedNames = ['管理人', 'admin', 'ふらっとタウン'];

function validateProfileName() {
    const name = document.getElementById('profileName').value.trim();
    const status = document.getElementById('profileNameStatus');
    const hint = document.getElementById('profileNameHint');

    if (!name) {
        status.textContent = '';
        status.className = 'profile-name-status';
        hint.textContent = '';
        return;
    }

    // 重複チェック（予約名 + 将来のユーザー名チェック）
    const isReserved = reservedNames.some(n => n.toLowerCase() === name.toLowerCase());

    if (isReserved) {
        status.textContent = '！';
        status.className = 'profile-name-status invalid';
        hint.textContent = 'この名前はすでに使われています';
    } else if (name.length > 10) {
        status.textContent = '！';
        status.className = 'profile-name-status invalid';
        hint.textContent = '名前は10文字以内で入力してください';
    } else {
        status.textContent = '✓';
        status.className = 'profile-name-status valid';
        hint.textContent = '';
    }
}

function openProfileRegistration() {
    const modal = document.getElementById('profileModal');
    const p = gameState.player;

    // 現在の値をフォームにセット
    document.getElementById('profileName').value = p.name || '';
    selectedProfileAvatar = p.avatar || 'Profile/Profile1.png';
    updateProfileAvatarPreview();
    document.getElementById('profileAvatarPreview').style.backgroundColor = p.avatarBgColor || '#FFB6C1';
    document.getElementById('profileBgColor').value = p.avatarBgColor || '#FFB6C1';

    // 性別（ラジオボタン）
    document.querySelectorAll('input[name="profileGender"]').forEach(radio => {
        radio.checked = (radio.value === p.gender);
    });

    // 生年月日プルダウンを生成
    initBirthdaySelects();

    // プロフィール登録済みかどうか（birthdayがあれば登録済み）
    const isRegistered = !!p.birthday;

    // 身長プルダウン（140〜190cm）
    const heightSelect = document.getElementById('profileHeight');
    heightSelect.innerHTML = '<option value="" disabled selected></option>';
    for (let h = 140; h <= 190; h++) {
        const opt = document.createElement('option');
        opt.value = h;
        opt.textContent = h;
        if (isRegistered && p.height === h) opt.selected = true;
        heightSelect.appendChild(opt);
    }

    // 体重プルダウン（40〜100kg）
    const weightSelect = document.getElementById('profileWeight');
    weightSelect.innerHTML = '<option value="" disabled selected></option>';
    for (let w = 40; w <= 100; w++) {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = w;
        if (isRegistered && Math.round(p.weight) === w) opt.selected = true;
        weightSelect.appendChild(opt);
    }

    // 登録済みの場合：生年月日・身長・体重を変更不可にする
    document.getElementById('profileBirthYear').disabled = isRegistered;
    document.getElementById('profileBirthMonth').disabled = isRegistered;
    document.getElementById('profileBirthDay').disabled = isRegistered;
    heightSelect.disabled = isRegistered;
    weightSelect.disabled = isRegistered;

    // 公開設定を復元
    if (p.publicSettings) {
        document.getElementById('profileGenderPublic').checked = p.publicSettings.gender !== false;
        document.getElementById('profileBirthdayPublic').checked = p.publicSettings.birthday !== false;
        document.getElementById('profileHeightPublic').checked = p.publicSettings.height !== false;
        document.getElementById('profileWeightPublic').checked = p.publicSettings.weight !== false;
    }

    // ヒントリセット
    document.getElementById('profileNameHint').textContent = '';
    document.getElementById('profileNameStatus').textContent = '';
    document.getElementById('profileNameStatus').className = 'profile-name-status';

    // アイコングリッド非表示
    document.getElementById('profileAvatarGrid').style.display = 'none';

    modal.classList.add('active');
}

function initBirthdaySelects() {
    const yearSelect = document.getElementById('profileBirthYear');
    const monthSelect = document.getElementById('profileBirthMonth');
    const daySelect = document.getElementById('profileBirthDay');
    const p = gameState.player;

    // 年（1950〜2015）
    yearSelect.innerHTML = '<option value="" disabled selected></option>';
    for (let y = 1950; y <= 2015; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (p.birthday && p.birthday.year === y) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    // 月（1〜12）
    monthSelect.innerHTML = '<option value="" disabled selected></option>';
    for (let m = 1; m <= 12; m++) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        if (p.birthday && p.birthday.month === m) opt.selected = true;
        monthSelect.appendChild(opt);
    }

    // 日（1〜31）
    daySelect.innerHTML = '<option value="" disabled selected></option>';
    for (let d = 1; d <= 31; d++) {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        if (p.birthday && p.birthday.day === d) opt.selected = true;
        daySelect.appendChild(opt);
    }
}

function openProfileAvatarSelect() {
    const grid = document.getElementById('profileAvatarGrid');
    if (grid.style.display === 'none') {
        grid.style.display = 'grid';
        grid.innerHTML = avatarOptions.map(path =>
            `<div class="profile-avatar-option ${path === selectedProfileAvatar ? 'selected' : ''}"
                  onclick="selectProfileAvatar('${path}')">
                <img src="${path}" alt="アバター">
            </div>`
        ).join('');
    } else {
        grid.style.display = 'none';
    }
}

function selectProfileAvatar(path) {
    selectedProfileAvatar = path;
    updateProfileAvatarPreview();
    // 選択状態を更新
    document.querySelectorAll('.profile-avatar-option').forEach(el => {
        el.classList.remove('selected');
        if (el.querySelector('img').src.includes(path)) {
            el.classList.add('selected');
        }
    });
}

function updateProfileAvatarPreview() {
    document.getElementById('profileAvatarPreview').innerHTML =
        `<img src="${selectedProfileAvatar}" alt="アバター" class="profile-avatar-img">`;
}

function changeProfileBgColor(color) {
    document.getElementById('profileAvatarPreview').style.backgroundColor = color;
}

function showProfileConfirm() {
    const name = document.getElementById('profileName').value.trim();
    const genderRadio = document.querySelector('input[name="profileGender"]:checked');
    const gender = genderRadio ? genderRadio.value : '';
    const birthYear = document.getElementById('profileBirthYear').value;
    const birthMonth = document.getElementById('profileBirthMonth').value;
    const birthDay = document.getElementById('profileBirthDay').value;
    const height = document.getElementById('profileHeight').value;
    const weight = document.getElementById('profileWeight').value;
    const hint = document.getElementById('profileNameHint');

    // バリデーション
    if (!name) {
        hint.textContent = '名前を入力してください';
        return;
    }
    if (name.length > 10) {
        hint.textContent = '名前は10文字以内で入力してください';
        return;
    }
    // 重複チェック
    const isReserved = reservedNames.some(n => n.toLowerCase() === name.toLowerCase());
    if (isReserved) {
        hint.textContent = 'この名前はすでに使われています';
        return;
    }
    if (!gender) {
        hint.textContent = '';
        showToast('性別を選択してください');
        return;
    }
    if (!birthYear || !birthMonth || !birthDay) {
        hint.textContent = '';
        showToast('生年月日を選択してください');
        return;
    }
    if (!height) {
        hint.textContent = '';
        showToast('身長を選択してください');
        return;
    }
    if (!weight) {
        hint.textContent = '';
        showToast('体重を選択してください');
        return;
    }
    hint.textContent = '';

    // 公開設定テキスト
    const publicTag = (isPublic) => isPublic
        ? '<span class="profile-confirm-tag profile-tag-public">公開</span>'
        : '<span class="profile-confirm-tag profile-tag-private">非公開</span>';
    const genderPublic = document.getElementById('profileGenderPublic').checked;
    const birthdayPublic = document.getElementById('profileBirthdayPublic').checked;
    const heightPublic = document.getElementById('profileHeightPublic').checked;
    const weightPublic = document.getElementById('profileWeightPublic').checked;

    // 確認画面HTML生成
    const bgColor = document.getElementById('profileBgColor').value;
    let html = '';
    html += `<div class="profile-confirm-avatar"><span class="profile-confirm-label">プロフィールアイコン</span><div class="profile-avatar-preview" style="background-color: ${bgColor}; margin: 8px auto 0;"><img src="${selectedProfileAvatar}" alt="アバター" class="profile-avatar-img"></div></div>`;
    html += `<div class="profile-confirm-row"><span class="profile-confirm-label">名前</span><span class="profile-confirm-value">${name}</span></div>`;
    html += `<div class="profile-confirm-row"><span class="profile-confirm-label">性別 ${publicTag(genderPublic)}</span><span class="profile-confirm-value">${gender}</span></div>`;
    html += `<div class="profile-confirm-row"><span class="profile-confirm-label profile-caution">生年月日 ${publicTag(birthdayPublic)}</span><span class="profile-confirm-value profile-caution">${birthYear}年${birthMonth}月${birthDay}日</span></div>`;
    html += `<div class="profile-confirm-row"><span class="profile-confirm-label profile-caution">身長 ${publicTag(heightPublic)}</span><span class="profile-confirm-value profile-caution">${height}cm</span></div>`;
    html += `<div class="profile-confirm-row"><span class="profile-confirm-label profile-caution">体重 ${publicTag(weightPublic)}</span><span class="profile-confirm-value profile-caution">${weight}kg</span></div>`;

    document.getElementById('profileConfirmContent').innerHTML = html;

    // 画面切り替え
    document.getElementById('profileFormView').style.display = 'none';
    document.getElementById('profileConfirmView').style.display = 'block';
}

function backToProfileForm() {
    document.getElementById('profileConfirmView').style.display = 'none';
    document.getElementById('profileFormView').style.display = 'block';
}

function submitProfile() {
    // 確認画面からの登録（バリデーション済み）
    const name = document.getElementById('profileName').value.trim();
    const genderRadio = document.querySelector('input[name="profileGender"]:checked');
    const gender = genderRadio ? genderRadio.value : '';
    const birthYear = document.getElementById('profileBirthYear').value;
    const birthMonth = document.getElementById('profileBirthMonth').value;
    const birthDay = document.getElementById('profileBirthDay').value;
    const height = document.getElementById('profileHeight').value;
    const weight = document.getElementById('profileWeight').value;

    // プレイヤーデータに反映
    const p = gameState.player;
    const isFirstRegistration = !p.birthday;
    p.name = name;
    p.avatar = selectedProfileAvatar;
    p.avatarBgColor = document.getElementById('profileBgColor').value;
    p.gender = gender;

    // 初回登録時のみ：生年月日・身長・体重を設定（以降変更不可）
    if (isFirstRegistration) {
        p.birthday = { year: parseInt(birthYear), month: parseInt(birthMonth), day: parseInt(birthDay) };
        p.height = parseInt(height);
        p.weight = parseFloat(weight);
    }

    // 公開設定を保存
    p.publicSettings = {
        gender: document.getElementById('profileGenderPublic').checked,
        birthday: document.getElementById('profileBirthdayPublic').checked,
        height: document.getElementById('profileHeightPublic').checked,
        weight: document.getElementById('profileWeightPublic').checked
    };

    // ステータス更新
    updateStatus();

    closeProfileModal();
    showToast(isFirstRegistration ? 'プロフィールを登録しました！' : 'プロフィールを更新しました！');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
    // 次回開いたとき入力画面に戻す
    document.getElementById('profileFormView').style.display = 'block';
    document.getElementById('profileConfirmView').style.display = 'none';
}

function openInformation() {
    // TODO: インフォメーション画面を表示
    showToast('インフォメーション（準備中）');
}

function openFeedback() {
    // TODO: ご意見・ご感想画面を表示
    showToast('ご意見・ご感想（準備中）');
}

function openNews() {
    // TODO: 最近のニュース画面を表示
    showToast('最近のニュース（準備中）');
}
