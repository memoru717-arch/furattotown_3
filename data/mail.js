// ============================================
// ふらっとタウン - メール・通知機能
// ============================================
// ============================================
// メールボックス機能
// ============================================
let currentMailFolder = 'inbox';
let currentMailSearch = '';
let currentMailDetailIdx = null;
let currentNotifFilter = 'like';
let currentMailboxTab = 'mail'; // 現在開いているタブ（'mail' or 'notif'）

function openDMModal() {
    const modal = document.getElementById('mailboxModal');
    modal.classList.add('active');
    // プレイヤーアバターをセット
    const avatarEl = document.getElementById('mailboxUserAvatar');
    if (avatarEl) {
        avatarEl.style.backgroundColor = gameState.player.avatarBgColor || '#FFB6C1';
        avatarEl.innerHTML = `<img src="${gameState.player.avatar}" style="object-fit:cover;">`;
    }
    // 全ビューをリセット（前回の状態が残らないように）
    setMailSearchBarVisible(true);
    document.getElementById('mailboxComposeView').style.display = 'none';
    document.getElementById('mailboxDetailView').style.display = 'none';
    document.getElementById('mailboxListView').style.display = 'flex';
    // 受信箱を初期表示
    currentMailFolder = 'inbox';
    currentMailboxTab = 'mail';
    switchMailboxTab('mail');
    updateMailFolderUI();
    renderMailboxList();
    updateMailBadges();
    updateNotifBadge();
}

function closeMailboxModal() {
    if (isComposeStep3Open()) {
        showComposeLeaveDlg({ type: 'close' });
        return;
    }
    if (currentMailboxTab === 'notif') markCurrentNotifCategoryRead();
    document.getElementById('mailboxModal').classList.remove('active');
}

function switchMailboxTab(tab) {
    const prevTab = currentMailboxTab;
    currentMailboxTab = tab;

    document.getElementById('tabMail').classList.toggle('active', tab === 'mail');
    document.getElementById('tabNotif').classList.toggle('active', tab === 'notif');
    document.getElementById('mailSideContent').style.display = tab === 'mail' ? '' : 'none';
    document.getElementById('notifSideContent').style.display = tab === 'notif' ? '' : 'none';

    if (tab === 'notif') {
        setMailSearchBarVisible(false);
        document.getElementById('mailboxListView').style.display = 'none';
        document.getElementById('mailboxDetailView').style.display = 'none';
        document.getElementById('mailboxComposeView').style.display = 'none';
        document.getElementById('mailboxNotifView').style.display = 'flex';
        // バッジはそのまま表示、描画だけして既読化はしない
        currentNotifFilter = 'like';
        updateNotifCategoryUI();
        renderNotifList();
        updateNotifBadge();
    } else {
        if (prevTab === 'notif') markCurrentNotifCategoryRead(); // 通知タブから離れるときだけ既読化
        setMailSearchBarVisible(true);
        document.getElementById('mailboxNotifView').style.display = 'none';
        document.getElementById('mailboxListView').style.display = 'flex';
        document.getElementById('mailboxDetailView').style.display = 'none';
    }
}

let pendingMailAction = null; // { type: 'folder', folder: '...' } or { type: 'close' }

// 作成画面が開いていて、離脱確認が必要か
function isComposeStep3Open() {
    const el = document.getElementById('mailboxComposeView');
    if (!el || el.style.display === 'none') return false;
    if (composeState.step === 3) return true;
    // Step1・2でも書いた内容があれば確認対象
    return !!composeState.savedBody;
}

// 確認ダイアログを表示してアクションを保留
function showComposeLeaveDlg(action) {
    pendingMailAction = action;
    document.getElementById('composeLeaveDlg').style.display = 'flex';
}

function selectMailFolder(folder) {
    // 書いた内容がある場合は確認ダイアログ
    if (isComposeStep3Open()) {
        showComposeLeaveDlg({ type: 'folder', folder });
        return;
    }
    // 作成画面が開いているだけなら閉じて切り替え
    const composeView = document.getElementById('mailboxComposeView');
    if (composeView && composeView.style.display !== 'none') {
        composeView.style.display = 'none';
    }
    doSelectMailFolder(folder);
}

// 実際のフォルダ切り替え処理
function doSelectMailFolder(folder) {
    setMailSearchBarVisible(true);
    currentMailFolder = folder;
    currentMailSearch = '';
    const searchInput = document.getElementById('mailSearchInput');
    if (searchInput) searchInput.value = '';
    updateMailFolderUI();
    document.getElementById('mailboxComposeView').style.display = 'none';
    document.getElementById('mailboxDetailView').style.display = 'none';
    document.getElementById('mailboxListView').style.display = 'flex';
    renderMailboxList();
}

// 下書きを保存してアクションを実行
function composeLeaveSave() {
    const to   = document.getElementById('composeTo')?.value || composeState.savedTo || '';
    const body = document.getElementById('composeBody')?.innerHTML || composeState.savedBody || '';
    const subject = getBodyPreview(body);
    saveDraftData(to, subject, body);
    document.getElementById('composeLeaveDlg').style.display = 'none';
    executeMailLeaveAction();
}

// 破棄してアクションを実行
function composeLeaveDiscard() {
    document.getElementById('composeLeaveDlg').style.display = 'none';
    executeMailLeaveAction();
}

// 保留アクションを実行（フォルダ移動 or モーダルを閉じる）
function executeMailLeaveAction() {
    const action = pendingMailAction;
    pendingMailAction = null;
    if (!action) return;
    if (action.type === 'folder') {
        doSelectMailFolder(action.folder);
    } else if (action.type === 'close') {
        document.getElementById('mailboxModal').classList.remove('active');
    } else if (action.type === 'newCompose') {
        doOpenComposeView(action.replyMail);
    } else if (action.type === 'editDraft') {
        doEditDraft(action.idx);
    } else if (action.type === 'closeCompose') {
        // 内容を破棄して作成画面を閉じる
        composeState.savedTo = '';
        composeState.savedSubject = '';
        composeState.savedBody = '';
        closeComposeView();
        doSelectMailFolder('inbox');
    }
}

// キャンセル（作成画面に戻る）
function composeLeaveCancelDlg() {
    document.getElementById('composeLeaveDlg').style.display = 'none';
    pendingMailAction = null;
}

// 本文HTMLから先頭テキストを取り出して件名代わりにする
function getBodyPreview(html, len = 20) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    const text = (tmp.innerText || tmp.textContent || '').trim();
    return text.slice(0, len) || '(本文なし)';
}

// 下書き保存の共通処理（上書き or 新規）
function saveDraftData(to, subject, body) {
    const honorific = document.getElementById('composeHonorific')?.value ?? composeState.honorific ?? 'さん';
    const draftData = {
        to, subject, body, honorific,
        date: Date.now(), starred: false,
        category:  composeState.category,
        design:    composeState.design,
        designImg: composeState.designImg,
        textColor: composeState.textColor,
        bold:      composeState.bold,
        fontFamily:composeState.fontFamily,
        fontSize:  composeState.fontSize,
        attachment:composeState.attachment ? { ...composeState.attachment } : null,
    };
    if (composeState.editingDraftId != null) {
        // 既存の下書きを上書き
        const idx = gameState.mailbox.draft.findIndex(m => m.id === composeState.editingDraftId);
        if (idx !== -1) {
            gameState.mailbox.draft[idx] = { ...gameState.mailbox.draft[idx], ...draftData };
            updateMailBadges();
            return;
        }
    }
    // 新規保存
    gameState.mailbox.draft.push({ id: gameState.mailNextId++, ...draftData });
    updateMailBadges();
}

function searchMail() {
    const input = document.getElementById('mailSearchInput');
    currentMailSearch = input ? input.value.trim() : '';
    renderMailboxList();
}

function updateMailFolderUI() {
    const folders = ['inbox', 'sent', 'draft', 'favorites', 'later', 'trash'];
    folders.forEach(f => {
        const id = 'folder' + f.charAt(0).toUpperCase() + f.slice(1);
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', f === currentMailFolder);
    });
}

function updateMailBadges() {
    const unread = (gameState.mailbox.inbox || []).filter(m => !m.read).length;
    const inboxBadge = document.getElementById('inboxBadge');
    if (inboxBadge) {
        inboxBadge.textContent = unread;
        inboxBadge.classList.toggle('visible', unread > 0);
    }
    const tabMailDot = document.getElementById('tabMailDot');
    if (tabMailDot) tabMailDot.style.display = unread > 0 ? 'inline-block' : 'none';
    const unreadNotif = (gameState.notifications || []).filter(n => !n.read).length;
    const totalBadge = unread + unreadNotif;
    const actionMailBadge = document.getElementById('actionMailBadge');
    if (actionMailBadge) {
        actionMailBadge.textContent = totalBadge;
        actionMailBadge.style.display = totalBadge > 0 ? 'flex' : 'none';
    }
    const draftCount = (gameState.mailbox.draft || []).length;
    const draftBadge = document.getElementById('draftBadge');
    if (draftBadge) {
        draftBadge.textContent = draftCount;
        draftBadge.classList.toggle('visible', draftCount > 0);
    }
    const laterCount = (gameState.mailbox.later || []).length;
    const laterBadge = document.getElementById('laterBadge');
    if (laterBadge) {
        laterBadge.textContent = laterCount;
        laterBadge.classList.toggle('visible', laterCount > 0);
    }
}

// 現在のフォルダのメール一覧を取得（_srcFolder/_srcIdx付きコピー）
function getMailList() {
    const realFolders = ['inbox', 'sent', 'draft', 'later'];
    if (currentMailFolder === 'favorites') {
        return realFolders.flatMap(f =>
            (gameState.mailbox[f] || []).map((m, i) => Object.assign({}, m, {_srcFolder: f, _srcIdx: i})).filter(m => m.starred));
    }
    return (gameState.mailbox[currentMailFolder] || []).map((m, i) =>
        Object.assign({}, m, {_srcFolder: currentMailFolder, _srcIdx: i}));
}

function renderMailboxList() {
    resetMailSelection();
    const bulkStarBtn      = document.getElementById('bulkStarBtn');
    const bulkLaterBtn     = document.getElementById('bulkLaterBtn');
    const bulkToInboxBtn   = document.getElementById('bulkToInboxBtn');
    const bulkTrashBtn     = document.getElementById('bulkTrashBtn');
    const bulkRestoreBtn   = document.getElementById('bulkRestoreBtn');
    const bulkPermDeleteBtn= document.getElementById('bulkPermDeleteBtn');
    const isDraft     = currentMailFolder === 'draft';
    const isFavorites = currentMailFolder === 'favorites';
    const isTrash     = currentMailFolder === 'trash';
    const isLater     = currentMailFolder === 'later';
    const senderHeader = document.getElementById('mailSenderColHeader');
    if (senderHeader) senderHeader.textContent = (isDraft || currentMailFolder === 'sent') ? '宛先 ▾' : '差出人 ▾';
    if (bulkStarBtn)       bulkStarBtn.style.display       = (isDraft || currentMailFolder === 'sent' || isFavorites || isTrash) ? 'none' : '';
    if (bulkLaterBtn)      bulkLaterBtn.style.display      = (isDraft || currentMailFolder === 'sent' || isFavorites || isTrash || isLater) ? 'none' : '';
    if (bulkToInboxBtn)    bulkToInboxBtn.style.display    = isLater ? '' : 'none';
    if (bulkTrashBtn)      bulkTrashBtn.style.display      = isTrash ? 'none' : '';
    if (bulkRestoreBtn)    bulkRestoreBtn.style.display    = isTrash ? '' : 'none';
    if (bulkPermDeleteBtn) bulkPermDeleteBtn.style.display = isTrash ? '' : 'none';
    const listEl = document.getElementById('mailboxList');
    let mails = getMailList();

    // 検索フィルター
    if (currentMailSearch) {
        const q = currentMailSearch.toLowerCase();
        mails = mails.filter(m =>
            (m.subject || '').toLowerCase().includes(q) ||
            (m.from || m.to || '').toLowerCase().includes(q) ||
            (m.body || '').toLowerCase().includes(q)
        );
    }

    document.getElementById('mailboxListView').style.display = 'flex';
    document.getElementById('mailboxDetailView').style.display = 'none';

    if (mails.length === 0) {
        listEl.innerHTML = `<div class="mailbox-empty">${currentMailSearch ? '「' + escapeHtml(currentMailSearch) + '」に一致するメールがありません' : 'メールがありません'}</div>`;
        return;
    }

    listEl.innerHTML = mails.map((mail, idx) => {
        const isRead = mail.read !== false;
        const isStarred = mail.starred;
        const dateStr = formatMailDate(mail.date);
        const isOwnMail = currentMailFolder === 'draft' || currentMailFolder === 'sent'
            || (currentMailFolder === 'trash' && (mail._originalFolder === 'draft' || mail._originalFolder === 'sent'));
        const avatarBg = isOwnMail ? (mail.toAvatarBg || '#C8E6C9') : (mail.fromAvatarBg || '#FFD0A0');
        const avatarHtml = isOwnMail
            ? (mail.toAvatar ? `<img src="${mail.toAvatar}" style="width:85%;height:85%;object-fit:cover;">` : '👤')
            : (mail.fromAvatar || '👤');
        const sender = isOwnMail
            ? escapeHtml(mail.to || '(宛先なし)')
            : escapeHtml(mail.from || mail.to || '(不明)');

        return `
        <div class="mailbox-row ${isRead ? 'read' : 'unread'}" onclick="openMailDetail(${idx})">
            <div class="mailbox-row-check"><input type="checkbox" data-folder="${mail._srcFolder}" data-real-idx="${mail._srcIdx}" onclick="event.stopPropagation()" onchange="updateSelectAllState()"></div>
            ${isOwnMail ? '' : `<div class="mailbox-row-star ${isStarred ? 'starred' : ''}" onclick="event.stopPropagation(); toggleMailStar('${mail._srcFolder}', ${mail._srcIdx}, this)">
                <img src="status/mail/${isStarred ? 'star3' : 'star2'}.png" class="star-icon-img">
            </div>`}
            <div class="mailbox-row-subject">${escapeHtml(getBodyPreview(mail.body, 25))}</div>
            <div class="mailbox-row-sender">
                <span class="sender-avatar" style="background:${avatarBg}">${avatarHtml}</span>
                <span>${sender}</span>
            </div>
            <div class="mailbox-row-date">${dateStr}</div>
        </div>`;
    }).join('');
}

function openMailDetail(idx) {
    currentMailDetailIdx = idx;
    const mails = getMailList();
    const mail = mails[idx];
    if (!mail) return;

    // 既読にする（コピーではなく元のオブジェクトを更新）
    if (mail.read === false) {
        const realMail = gameState.mailbox[mail._srcFolder] && gameState.mailbox[mail._srcFolder][mail._srcIdx];
        if (realMail) realMail.read = true;
        updateMailBadges();
        // リストの行も既読スタイルに更新
        const rows = document.querySelectorAll('#mailboxList .mailbox-row');
        if (rows[idx]) {
            rows[idx].classList.remove('unread');
            rows[idx].classList.add('read');
        }
    }

    document.getElementById('mailboxListView').style.display = 'none';
    document.getElementById('mailboxDetailView').style.display = 'flex';

    // フォルダに応じてヘッダーボタンを切り替え
    const actionsEl = document.getElementById('mailboxDetailActions');
    if (actionsEl) {
        if (currentMailFolder === 'draft') {
            actionsEl.innerHTML = `
                <button class="mailbox-stamp-btn" onclick="trashCurrentMail()"><img src="status/mail/dustbox.png" class="stamp-icon-img"></button>
                <button class="mailbox-detail-edit-btn" onclick="editDraft(${idx})">続きを書く</button>
            `;
        } else if (currentMailFolder === 'sent') {
            actionsEl.innerHTML = `
                <button class="mailbox-stamp-btn" onclick="trashCurrentMail()"><img src="status/mail/dustbox.png" class="stamp-icon-img"></button>
            `;
        } else if (currentMailFolder === 'favorites') {
            actionsEl.innerHTML = `
                <button class="mailbox-stamp-btn" onclick="trashCurrentMail()"><img src="status/mail/dustbox.png" class="stamp-icon-img"></button>
            `;
        } else if (currentMailFolder === 'trash') {
            actionsEl.innerHTML = `
                <button class="mailbox-back-btn" onclick="restoreMailFromTrash()">復元する</button>
                <button class="mailbox-detail-edit-btn" onclick="permanentlyDeleteMail()">完全に削除</button>
            `;
        } else {
            // inbox / later
            const laterBtn = currentMailFolder !== 'later'
                ? `<button class="mailbox-back-btn" onclick="moveCurrentMailToLater()">あとで返す</button>` : '';
            const toInboxBtn = currentMailFolder === 'later'
                ? `<button class="mailbox-stamp-btn" onclick="moveCurrentMailToInbox()"><img src="status/mail/letter.png" class="stamp-icon-img"></button>` : '';
            const realMail = gameState.mailbox[mail._srcFolder] && gameState.mailbox[mail._srcFolder][mail._srcIdx];
            const lastStamp = realMail && realMail.stamps && realMail.stamps.length > 0
                ? realMail.stamps[realMail.stamps.length - 1].id : null;
            const stampImg = lastStamp ? `status/mail/${lastStamp}.png` : 'status/mail/stamp.png';
            actionsEl.innerHTML = `
                <button class="mailbox-stamp-btn" onclick="trashCurrentMail()"><img src="status/mail/dustbox.png" class="stamp-icon-img"></button>
                ${toInboxBtn}
                <button class="mailbox-stamp-btn" onclick="openStampPicker(this)"><img src="${stampImg}" class="stamp-icon-img"></button>
                ${laterBtn}
                <button class="mailbox-reply-btn" onclick="replyToMail()">返信する</button>
            `;
        }
    }

    const avatarBg = mail.fromAvatarBg || '#FFD0A0';
    const avatarEmoji = mail.fromAvatar || '👤';
    const sender = mail.from || mail.to || '(不明)';
    const dateStr = formatMailDateFull(mail.date);

    if (mail.designImg) {
        // 作成画面で書いたお手紙：スタイルを再現して表示
        const fontMap = {
            gothic: "'Hiragino Kaku Gothic Pro', 'Yu Gothic', sans-serif",
            mincho: "'ZenOldMincho', 'Hiragino Mincho Pro', serif",
            uzura:  'uzura, sans-serif'
        };
        const ff      = fontMap[mail.fontFamily] || fontMap.gothic;
        const ptSize  = (mail.fontSize || 13) + 'pt';
        const displayTo = mail.to || (gameState && gameState.player && gameState.player.name) || '';
        document.getElementById('mailboxDetailContent').innerHTML = `
            <div class="compose-letter-scroll">
                <div class="compose-letter-wrap">
                    <img src="${mail.designImg}" class="compose-letter-img" alt="">
                    <div class="compose-letter-inputs">
                        <div class="compose-letter-to-block">
                            <div class="compose-letter-to-row">
                                <div class="compose-letter-to" style="font-family:${ff}">${escapeHtml(displayTo)}</div>
                                <span class="compose-letter-honorific-display" style="font-family:${ff}">${escapeHtml(mail.honorific || '')}</span>
                                <span class="compose-letter-to-suffix" style="font-family:${ff}">へ</span>
                            </div>
                        </div>
                        <div class="compose-letter-body" style="font-family:${ff};font-size:${ptSize}">${escapeHtml(mail.body || '').replace(/\{\{name\}\}/g, escapeHtml((gameState && gameState.player && gameState.player.name) || '')).replace(/\n/g, '<br>')}</div>
                    </div>
                </div>
            </div>
        `;
    } else {
        // 受信したお手紙：従来の便箋スタイルで表示
        const letterNum = mail.letter || 1;
        document.getElementById('mailboxDetailContent').innerHTML = `
            <div class="letter-wrap">
                <img src="letter/letter${letterNum}.png" class="letter-img" alt="">
                <div class="letter-text letter-font-${letterNum}">
                    <div class="letter-subject">${escapeHtml(mail.subject)}</div>
                    <div class="letter-body">${escapeHtml(mail.body)}</div>
                    <div class="letter-sign">${avatarEmoji} ${escapeHtml(sender)} より</div>
                </div>
            </div>
        `;
    }
}

function backToMailList() {
    document.getElementById('mailboxListView').style.display = 'flex';
    document.getElementById('mailboxDetailView').style.display = 'none';
}

// 下書きをゴミ箱へ移動
function trashCurrentMail() {
    const mails = getMailList();
    const mail = mails[currentMailDetailIdx];
    if (!mail) return;
    const folderArr = gameState.mailbox[mail._srcFolder];
    if (!folderArr) return;
    if (mail._srcFolder !== 'trash') {
        const trashCopy = Object.assign({}, mail);
        trashCopy._originalFolder = mail._srcFolder;
        gameState.mailbox.trash.push(trashCopy);
    }
    folderArr.splice(mail._srcIdx, 1);
    updateMailBadges();
    backToMailList();
    renderMailboxList();
}

// ゴミ箱から元フォルダへ復元
function restoreMailFromTrash() {
    const mails = getMailList();
    const mail = mails[currentMailDetailIdx];
    if (!mail) return;
    const trashArr = gameState.mailbox.trash;
    const realIdx = mail._srcIdx;
    if (!trashArr || trashArr[realIdx] === undefined) return;
    const restored = Object.assign({}, trashArr[realIdx]);
    const targetFolder = restored._originalFolder || 'inbox';
    restored.starred = false;
    delete restored._originalFolder;
    gameState.mailbox[targetFolder].push(restored);
    trashArr.splice(realIdx, 1);
    updateMailBadges();
    backToMailList();
    renderMailboxList();
}

// ゴミ箱から完全削除
function permanentlyDeleteMail() {
    const mails = getMailList();
    const mail = mails[currentMailDetailIdx];
    if (!mail) return;
    const trashArr = gameState.mailbox.trash;
    if (!trashArr) return;
    trashArr.splice(mail._srcIdx, 1);
    backToMailList();
    renderMailboxList();
}

// 一括：あとで返すから受信箱へ移動
function bulkActionMoveToInbox() {
    const selected = getSelectedMailIds();
    selected.sort((a, b) => b.idx - a.idx);
    selected.forEach(({ idx }) => {
        const laterArr = gameState.mailbox.later;
        if (!laterArr || laterArr[idx] === undefined) return;
        const mail = Object.assign({}, laterArr[idx]);
        gameState.mailbox.inbox.push(mail);
        laterArr.splice(idx, 1);
    });
    updateMailBadges();
    renderMailboxList();
    resetMailSelection();
}

// 一括：ゴミ箱から元フォルダへ復元
function bulkActionRestore() {
    const selected = getSelectedMailIds();
    selected.sort((a, b) => b.idx - a.idx);
    selected.forEach(({ idx }) => {
        const trashArr = gameState.mailbox.trash;
        if (!trashArr || trashArr[idx] === undefined) return;
        const restored = Object.assign({}, trashArr[idx]);
        const targetFolder = restored._originalFolder || 'inbox';
        restored.starred = false;
        delete restored._originalFolder;
        gameState.mailbox[targetFolder].push(restored);
        trashArr.splice(idx, 1);
    });
    updateMailBadges();
    renderMailboxList();
    resetMailSelection();
}

// 一括：完全削除
function bulkActionPermanentDelete() {
    const selected = getSelectedMailIds();
    selected.sort((a, b) => b.idx - a.idx);
    selected.forEach(({ idx }) => {
        const trashArr = gameState.mailbox.trash;
        if (!trashArr) return;
        trashArr.splice(idx, 1);
    });
    renderMailboxList();
    resetMailSelection();
}

// 下書きを編集モードで開く
function editDraft(idx) {
    if (isComposeStep3Open()) {
        showComposeLeaveDlg({ type: 'editDraft', idx });
        return;
    }
    doEditDraft(idx);
}

function doEditDraft(idx) {
    const mails = getMailList();
    const mail = mails[idx];
    if (!mail) return;
    composeState = {
        step: 3,
        category:       mail.category  || 'letter',
        design:         mail.design    || 'letter1',
        designImg:      mail.designImg || 'letter/letter1.png',
        textColor:      mail.textColor || '#000000',
        bold:           mail.bold      || false,
        fontFamily:     mail.fontFamily|| 'gothic',
        fontSize:       mail.fontSize  || 12,
        attachment:     mail.attachment ? { ...mail.attachment } : null,
        replyTo:        null,
        editingDraftId: mail.id ?? null  // 上書き保存用
    };
    setMailSearchBarVisible(false);
    document.getElementById('mailboxListView').style.display = 'none';
    document.getElementById('mailboxDetailView').style.display = 'none';
    document.getElementById('mailboxComposeView').style.display = 'flex';
    renderComposeStep();
    // フィールドを下書き内容で埋める
    const toEl      = document.getElementById('composeTo');
    const subjectEl = document.getElementById('composeSubject');
    const bodyEl    = document.getElementById('composeBody');
    if (toEl)      toEl.value         = mail.to      || '';
    if (subjectEl) subjectEl.textContent = mail.subject || '';
    if (bodyEl) {
        bodyEl.innerHTML = mail.body || '';
        bodyEl.classList.toggle('is-empty', !bodyEl.innerText.trim());
    }
}

function moveCurrentMailToInbox() {
    if (currentMailDetailIdx === null) return;
    const mail = getMailList()[currentMailDetailIdx];
    if (!mail) return;
    const folderArr = gameState.mailbox[mail._srcFolder];
    if (!folderArr) return;
    gameState.mailbox.inbox.push(Object.assign({}, mail));
    folderArr.splice(mail._srcIdx, 1);
    updateMailBadges();
    backToMailList();
    renderMailboxList();
}

function moveCurrentMailToLater() {
    if (currentMailDetailIdx === null) return;
    const mail = getMailList()[currentMailDetailIdx];
    if (!mail) return;
    const folderArr = gameState.mailbox[mail._srcFolder];
    if (!folderArr || mail._srcFolder === 'later') return;
    const laterCopy = Object.assign({}, mail);
    laterCopy._originalFolder = mail._srcFolder;
    gameState.mailbox.later.push(laterCopy);
    folderArr.splice(mail._srcIdx, 1);
    updateMailBadges();
    backToMailList();
    renderMailboxList();
}

// ヘッダーチェックボックス → 全選択/解除
function toggleSelectAllMail(headerCb) {
    const checkboxes = document.querySelectorAll('#mailboxList .mailbox-row-check input[type="checkbox"]');
    checkboxes.forEach(cb => { cb.checked = headerCb.checked; });
    const bulkActions = document.getElementById('mailBulkActions');
    if (bulkActions) bulkActions.style.display = headerCb.checked && checkboxes.length > 0 ? 'flex' : 'none';
}

// 個別チェック変更時 → ヘッダーの状態を更新
function updateSelectAllState() {
    const headerCb = document.getElementById('mailSelectAll');
    const bulkActions = document.getElementById('mailBulkActions');
    if (!headerCb) return;
    const checkboxes = [...document.querySelectorAll('#mailboxList .mailbox-row-check input[type="checkbox"]')];
    if (checkboxes.length === 0) {
        headerCb.checked = false;
        headerCb.indeterminate = false;
        if (bulkActions) bulkActions.style.display = 'none';
        return;
    }
    const checkedCount = checkboxes.filter(cb => cb.checked).length;
    headerCb.indeterminate = false;
    headerCb.checked = checkedCount === checkboxes.length;
    if (bulkActions) bulkActions.style.display = checkedCount > 0 ? 'flex' : 'none';
}

function toggleMailStar(folder, idx, el) {
    const mail = gameState.mailbox[folder][idx];
    if (!mail) return;
    mail.starred = !mail.starred;

    // お気に入りフォルダ内では常にアイコンだけ更新（リスト再描画しない）
    // → 別フォルダに移動して戻ってきたときに初めてリストが更新される
    if (currentMailFolder === 'favorites' && el) {
        el.classList.toggle('starred', mail.starred);
        el.innerHTML = `<img src="status/mail/${mail.starred ? 'star3' : 'star2'}.png" class="star-icon-img">`;
        return;
    }
    renderMailboxList();
}

// 選択中メールの folder+idx 情報を取得
function getSelectedMailIds() {
    const checkboxes = [...document.querySelectorAll('#mailboxList .mailbox-row-check input[type="checkbox"]:checked')];
    return checkboxes.map(cb => ({ folder: cb.dataset.folder, idx: parseInt(cb.dataset.realIdx) }));
}

// 一括操作後にヘッダーチェック・バルクアイコンをリセット
function resetMailSelection() {
    const headerCb = document.getElementById('mailSelectAll');
    if (headerCb) { headerCb.checked = false; headerCb.indeterminate = false; }
    const bulkActions = document.getElementById('mailBulkActions');
    if (bulkActions) bulkActions.style.display = 'none';
}

// 一括：お気に入り追加
function bulkActionStar() {
    getSelectedMailIds().forEach(({ folder, idx }) => {
        const mail = gameState.mailbox[folder] && gameState.mailbox[folder][idx];
        if (mail) mail.starred = true;
    });
    renderMailboxList();
    resetMailSelection();
}

// 一括：あとで返す（元フォルダから移動、降順処理でインデックスずれ防止）
function bulkActionLater() {
    const selected = getSelectedMailIds();
    const byFolder = {};
    selected.forEach(({ folder, idx }) => {
        if (!byFolder[folder]) byFolder[folder] = [];
        byFolder[folder].push(idx);
    });
    Object.entries(byFolder).forEach(([folder, indices]) => {
        if (folder === 'later') return;
        indices.sort((a, b) => b - a);
        indices.forEach(idx => {
            const folderArr = gameState.mailbox[folder];
            if (!folderArr) return;
            const mail = folderArr[idx];
            if (mail) {
                const laterCopy = Object.assign({}, mail);
                laterCopy._originalFolder = folder;
                gameState.mailbox.later.push(laterCopy);
                folderArr.splice(idx, 1);
            }
        });
    });
    renderMailboxList();
    resetMailSelection();
    updateMailBadges();
}

// 一括：ゴミ箱に移動（ゴミ箱内なら完全削除）
function bulkActionTrash() {
    const selected = getSelectedMailIds();
    const byFolder = {};
    selected.forEach(({ folder, idx }) => {
        if (!byFolder[folder]) byFolder[folder] = [];
        byFolder[folder].push(idx);
    });
    Object.entries(byFolder).forEach(([folder, indices]) => {
        indices.sort((a, b) => b - a);
        indices.forEach(idx => {
            const folderArr = gameState.mailbox[folder];
            if (!folderArr) return;
            const mail = folderArr[idx];
            if (mail) {
                if (folder !== 'trash') {
                    const trashCopy = Object.assign({}, mail);
                    trashCopy._originalFolder = folder;
                    gameState.mailbox.trash.push(trashCopy);
                }
                folderArr.splice(idx, 1);
            }
        });
    });
    renderMailboxList();
    resetMailSelection();
    updateMailBadges();
}

// ============================================
// メール作成機能
// ============================================

const mailDesigns = {
    letter: [
        // シンプル（8枚）
        { id: 'simple1', name: 'シンプル 1', img: 'letter/simple1.png', group: 'simple', groupName: 'シンプル', period: null },
        { id: 'simple2', name: 'シンプル 2', img: 'letter/simple2.png', group: 'simple', groupName: 'シンプル', period: null },
        { id: 'simple3', name: 'シンプル 3', img: 'letter/simple3.png', group: 'simple', groupName: 'シンプル', period: null },
        { id: 'simple4', name: 'シンプル 4', img: 'letter/simple4.png', group: 'simple', groupName: 'シンプル', period: null },
        { id: 'simple5', name: 'シンプル 5', img: 'letter/simple5.png', group: 'simple', groupName: 'シンプル', period: null },
        { id: 'simple6', name: 'シンプル 6', img: 'letter/simple6.png', group: 'simple', groupName: 'シンプル', period: null },
        { id: 'simple7', name: 'シンプル 7', img: 'letter/simple7.png', group: 'simple', groupName: 'シンプル', period: null },
        { id: 'simple8', name: 'シンプル 8', img: 'letter/simple8.png', group: 'simple', groupName: 'シンプル', period: null },
        // 花・植物（4枚）
        { id: 'flower1', name: '花・植物 1', img: 'letter/flower1.png', group: 'flower', groupName: '花・植物', period: null },
        { id: 'flower2', name: '花・植物 2', img: 'letter/flower2.png', group: 'flower', groupName: '花・植物', period: null },
        { id: 'flower3', name: '花・植物 3', img: 'letter/flower3.png', group: 'flower', groupName: '花・植物', period: null },
        { id: 'flower4', name: '花・植物 4', img: 'letter/flower4.png', group: 'flower', groupName: '花・植物', period: null },
        // ビンテージ（4枚）
        { id: 'vintage1', name: 'ビンテージ 1', img: 'letter/vintage1.png', group: 'vintage', groupName: 'ビンテージ', period: null },
        { id: 'vintage2', name: 'ビンテージ 2', img: 'letter/vintage2.png', group: 'vintage', groupName: 'ビンテージ', period: null },
        { id: 'vintage3', name: 'ビンテージ 3', img: 'letter/vintage3.png', group: 'vintage', groupName: 'ビンテージ', period: null },
        { id: 'vintage4', name: 'ビンテージ 4', img: 'letter/vintage4.png', group: 'vintage', groupName: 'ビンテージ', period: null },
        // 動物（4枚）
        { id: 'animal1', name: '動物 1', img: 'letter/animal1.png', group: 'animal', groupName: '動物', period: null },
        { id: 'animal2', name: '動物 2', img: 'letter/animal2.png', group: 'animal', groupName: '動物', period: null },
        { id: 'animal3', name: '動物 3', img: 'letter/animal3.png', group: 'animal', groupName: '動物', period: null },
        { id: 'animal4', name: '動物 4', img: 'letter/animal4.png', group: 'animal', groupName: '動物', period: null },
        // キャラクター（4枚）
        { id: 'character1', name: 'キャラクター 1', img: 'letter/character1.png', group: 'character', groupName: 'キャラクター', period: null },
        { id: 'character2', name: 'キャラクター 2', img: 'letter/character2.png', group: 'character', groupName: 'キャラクター', period: null },
        { id: 'character3', name: 'キャラクター 3', img: 'letter/character3.png', group: 'character', groupName: 'キャラクター', period: null },
        { id: 'character4', name: 'キャラクター 4', img: 'letter/character4.png', group: 'character', groupName: 'キャラクター', period: null },
        // 風景（4枚）
        { id: 'landscape1', name: '風景 1', img: 'letter/landscape1.png', group: 'landscape', groupName: '風景', period: null },
        { id: 'landscape2', name: '風景 2', img: 'letter/landscape2.png', group: 'landscape', groupName: '風景', period: null },
        { id: 'landscape3', name: '風景 3', img: 'letter/landscape3.png', group: 'landscape', groupName: '風景', period: null },
        { id: 'landscape4', name: '風景 4', img: 'letter/landscape4.png', group: 'landscape', groupName: '風景', period: null },
        // モノクロ（4枚）
        { id: 'monoqlo1', name: 'モノクロ 1', img: 'letter/monoqlo1.png', group: 'monoqlo', groupName: 'モノクロ', period: null },
        { id: 'monoqlo2', name: 'モノクロ 2', img: 'letter/monoqlo2.png', group: 'monoqlo', groupName: 'モノクロ', period: null },
        { id: 'monoqlo3', name: 'モノクロ 3', img: 'letter/monoqlo3.png', group: 'monoqlo', groupName: 'モノクロ', period: null },
        { id: 'monoqlo4', name: 'モノクロ 4', img: 'letter/monoqlo4.png', group: 'monoqlo', groupName: 'モノクロ', period: null },
        // 和風（4枚）
        { id: 'japanese1', name: '和風 1', img: 'letter/japanese1.png', group: 'japanese', groupName: '和風', period: null },
        { id: 'japanese2', name: '和風 2', img: 'letter/japanese2.png', group: 'japanese', groupName: '和風', period: null },
        { id: 'japanese3', name: '和風 3', img: 'letter/japanese3.png', group: 'japanese', groupName: '和風', period: null },
        { id: 'japanese4', name: '和風 4', img: 'letter/japanese4.png', group: 'japanese', groupName: '和風', period: null },
    ],
    card: [
        // シンプル（8枚）
        { id: 'simple1', name: 'シンプル 1', img: 'letter/Messagecard/simple1.png', group: 'simple', groupName: 'シンプル', period: null },
        { id: 'simple2', name: 'シンプル 2', img: 'letter/Messagecard/simple2.png', group: 'simple', groupName: 'シンプル', period: null },
        { id: 'simple3', name: 'シンプル 3', img: 'letter/Messagecard/simple3.png', group: 'simple', groupName: 'シンプル', period: null },
        { id: 'simple4', name: 'シンプル 4', img: 'letter/Messagecard/simple4.png', group: 'simple', groupName: 'シンプル', period: null },
        { id: 'simple5', name: 'シンプル 5', img: 'letter/Messagecard/simple5.png', group: 'simple', groupName: 'シンプル', period: null },
        { id: 'simple6', name: 'シンプル 6', img: 'letter/Messagecard/simple6.png', group: 'simple', groupName: 'シンプル', period: null },
        { id: 'simple7', name: 'シンプル 7', img: 'letter/Messagecard/simple7.png', group: 'simple', groupName: 'シンプル', period: null },
        { id: 'simple8', name: 'シンプル 8', img: 'letter/Messagecard/simple8.png', group: 'simple', groupName: 'シンプル', period: null },
        // 花・植物（4枚）
        { id: 'flower1', name: '花・植物 1', img: 'letter/Messagecard/flower1.png', group: 'flower', groupName: '花・植物', period: null },
        { id: 'flower2', name: '花・植物 2', img: 'letter/Messagecard/flower2.png', group: 'flower', groupName: '花・植物', period: null },
        { id: 'flower3', name: '花・植物 3', img: 'letter/Messagecard/flower3.png', group: 'flower', groupName: '花・植物', period: null },
        { id: 'flower4', name: '花・植物 4', img: 'letter/Messagecard/flower4.png', group: 'flower', groupName: '花・植物', period: null },
        // ビンテージ（4枚）
        { id: 'vintage1', name: 'ビンテージ 1', img: 'letter/Messagecard/vintage1.png', group: 'vintage', groupName: 'ビンテージ', period: null },
        { id: 'vintage2', name: 'ビンテージ 2', img: 'letter/Messagecard/vintage2.png', group: 'vintage', groupName: 'ビンテージ', period: null },
        { id: 'vintage3', name: 'ビンテージ 3', img: 'letter/Messagecard/vintage3.png', group: 'vintage', groupName: 'ビンテージ', period: null },
        { id: 'vintage4', name: 'ビンテージ 4', img: 'letter/Messagecard/vintage4.png', group: 'vintage', groupName: 'ビンテージ', period: null },
        // 動物（4枚）
        { id: 'animal1', name: '動物 1', img: 'letter/Messagecard/animal1.png', group: 'animal', groupName: '動物', period: null },
        { id: 'animal2', name: '動物 2', img: 'letter/Messagecard/animal2.png', group: 'animal', groupName: '動物', period: null },
        { id: 'animal3', name: '動物 3', img: 'letter/Messagecard/animal3.png', group: 'animal', groupName: '動物', period: null },
        { id: 'animal4', name: '動物 4', img: 'letter/Messagecard/animal4.png', group: 'animal', groupName: '動物', period: null },
        // キャラクター（4枚）
        { id: 'character1', name: 'キャラクター 1', img: 'letter/Messagecard/character1.png', group: 'character', groupName: 'キャラクター', period: null },
        { id: 'character2', name: 'キャラクター 2', img: 'letter/Messagecard/character2.png', group: 'character', groupName: 'キャラクター', period: null },
        { id: 'character3', name: 'キャラクター 3', img: 'letter/Messagecard/character3.png', group: 'character', groupName: 'キャラクター', period: null },
        { id: 'character4', name: 'キャラクター 4', img: 'letter/Messagecard/character4.png', group: 'character', groupName: 'キャラクター', period: null },
        // 風景（4枚）
        { id: 'landscape1', name: '風景 1', img: 'letter/Messagecard/landscape1.png', group: 'landscape', groupName: '風景', period: null },
        { id: 'landscape2', name: '風景 2', img: 'letter/Messagecard/landscape2.png', group: 'landscape', groupName: '風景', period: null },
        { id: 'landscape3', name: '風景 3', img: 'letter/Messagecard/landscape3.png', group: 'landscape', groupName: '風景', period: null },
        { id: 'landscape4', name: '風景 4', img: 'letter/Messagecard/landscape4.png', group: 'landscape', groupName: '風景', period: null },
        // モノクロ（4枚）
        { id: 'monoqlo1', name: 'モノクロ 1', img: 'letter/Messagecard/monoqlo1.png', group: 'monoqlo', groupName: 'モノクロ', period: null },
        { id: 'monoqlo2', name: 'モノクロ 2', img: 'letter/Messagecard/monoqlo2.png', group: 'monoqlo', groupName: 'モノクロ', period: null },
        { id: 'monoqlo3', name: 'モノクロ 3', img: 'letter/Messagecard/monoqlo3.png', group: 'monoqlo', groupName: 'モノクロ', period: null },
        { id: 'monoqlo4', name: 'モノクロ 4', img: 'letter/Messagecard/monoqlo4.png', group: 'monoqlo', groupName: 'モノクロ', period: null },
        // 和風（4枚）
        { id: 'japanese1', name: '和風 1', img: 'letter/Messagecard/japanese1.png', group: 'japanese', groupName: '和風', period: null },
        { id: 'japanese2', name: '和風 2', img: 'letter/Messagecard/japanese2.png', group: 'japanese', groupName: '和風', period: null },
        { id: 'japanese3', name: '和風 3', img: 'letter/Messagecard/japanese3.png', group: 'japanese', groupName: '和風', period: null },
        { id: 'japanese4', name: '和風 4', img: 'letter/Messagecard/japanese4.png', group: 'japanese', groupName: '和風', period: null },
    ],
    nenga: [
        { id: 'default', name: 'スタンダード', img: 'letter/nenga1.png', period: null },
    ]
};

// 最後にフォーカスしていた作成フィールドのID
let lastComposeFocusId = 'composeBody';

// 返信元メッセージのプレビュー表示中か
let composePreviewMode = false;

// 現在の作成状態
let composeState = {
    step: 1, category: null, design: null, designImg: null,
    textColor: '#000000', bold: false, fontFamily: 'gothic', fontSize: 13, editingDraftId: null,
    attachment: null, replyTo: null,
    savedTo: '', savedSubject: '', savedBody: '', honorific: 'さん'
};

// 期間チェック [[startMonth, startDay, endMonth, endDay], ...]
// 年をまたぐ場合（例：冬 12/1〜2/28）は sm > em になる
function isInMailPeriod(periods) {
    if (!periods) return true;
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    return periods.some(([sm, sd, em, ed]) => {
        if (sm <= em) {
            return (m > sm || (m === sm && d >= sd)) && (m < em || (m === em && d <= ed));
        } else {
            return (m > sm || (m === sm && d >= sd)) || (m < em || (m === em && d <= ed));
        }
    });
}

// 年賀状期間（12/26〜1/7）
function isNengaPeriod() {
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    return (m === 12 && d >= 26) || (m === 1 && d <= 7);
}

// 利用可能なデザイン一覧
function getAvailableDesigns(category) {
    return (mailDesigns[category] || []).filter(d => isInMailPeriod(d.period));
}

// 作成画面を開く（replyMail: 返信元のメールオブジェクト or null）
function openComposeView(replyMail) {
    // Step3が開いている場合は確認ダイアログを出す
    if (isComposeStep3Open()) {
        showComposeLeaveDlg({ type: 'newCompose', replyMail: replyMail || null });
        return;
    }
    doOpenComposeView(replyMail);
}

function doOpenComposeView(replyMail) {
    composeState = {
        step: 1, category: null, design: null, designImg: null,
        textColor: '#000000', bold: false, fontFamily: 'gothic', fontSize: 13, editingDraftId: null,
        attachment: null, replyTo: replyMail || null,
        savedTo: '', savedSubject: '', savedBody: '', honorific: 'さん'
    };
    setMailSearchBarVisible(false);
    document.getElementById('mailboxListView').style.display = 'none';
    document.getElementById('mailboxDetailView').style.display = 'none';
    document.getElementById('mailboxComposeView').style.display = 'flex';
    renderComposeStep();
}

// 作成画面を閉じる
function closeComposeView() {
    setMailSearchBarVisible(true);
    document.getElementById('mailboxComposeView').style.display = 'none';
    if (composeState.replyTo) {
        document.getElementById('mailboxDetailView').style.display = 'flex';
    } else {
        document.getElementById('mailboxListView').style.display = 'flex';
        renderMailboxList();
    }
}

// 検索バー（設定・アイコン含む）の表示切り替え
function setMailSearchBarVisible(show) {
    const el  = document.querySelector('.mailbox-search-bar');
    const box = document.querySelector('.mailbox-box-container');
    if (el)  el.style.display = show ? '' : 'none';
    // 作成モード時だけ上余白を付ける
    if (box) box.classList.toggle('compose-mode', !show);
}

// 戻るボタン
function composeBack() {
    if (composeState.step === 1) {
        // 書いた内容があれば確認ダイアログを表示
        if (composeState.savedBody) {
            showComposeLeaveDlg({ type: 'closeCompose' });
            return;
        }
        closeComposeView();
        return;
    }
    // Step3から戻るとき、入力内容を保存しておく
    if (composeState.step === 3) {
        composeState.savedTo      = document.getElementById('composeTo')?.value || '';
        composeState.savedSubject = document.getElementById('composeSubject')?.innerHTML || '';
        composeState.savedBody    = document.getElementById('composeBody')?.innerHTML || '';
    }
    composeState.step--;
    renderComposeStep();
}

// ステップに応じた描画
function renderComposeStep() {
    const contentEl      = document.getElementById('composeStepContent');
    const headerActions  = document.getElementById('composeHeaderActions');
    const toolbarWrap    = document.getElementById('composeToolbarWrap');
    const previewBtn     = document.getElementById('composePreviewBtn');
    const previewContent = document.getElementById('composePreviewContent');
    const isStep3        = composeState.step === 3;

    // Step3 のみヘッダーボタン・ツールバーを表示
    if (headerActions) headerActions.style.display = isStep3 ? 'flex' : 'none';
    if (toolbarWrap)  toolbarWrap.style.display  = isStep3 ? ''    : 'none';
    // Step3 だけ内部でスクロール管理するため overflow を切り替える
    if (contentEl) contentEl.style.overflowY = isStep3 ? 'hidden' : 'auto';

    // 返信時のみプレビューボタンを表示、ステップ変更時はリセット
    const showPreview = isStep3 && !!composeState.replyTo;
    if (previewBtn) { previewBtn.style.display = showPreview ? '' : 'none'; previewBtn.textContent = '相手のメッセージ'; }
    composePreviewMode = false;
    if (previewContent) { previewContent.style.display = 'none'; previewContent.innerHTML = ''; }
    if (contentEl) contentEl.style.display = '';

    if (composeState.step === 1) renderComposeStep1();
    else if (composeState.step === 2) renderComposeStep2();
    else renderComposeStep3();
}

// 返信元メッセージのプレビュー切替
function toggleReplyPreview() {
    composePreviewMode = !composePreviewMode;
    const contentEl      = document.getElementById('composeStepContent');
    const toolbarWrap    = document.getElementById('composeToolbarWrap');
    const previewContent = document.getElementById('composePreviewContent');
    const previewBtn     = document.getElementById('composePreviewBtn');

    if (composePreviewMode) {
        if (contentEl)      contentEl.style.display      = 'none';
        if (toolbarWrap)    toolbarWrap.style.display     = 'none';
        if (previewContent) { previewContent.style.display = ''; renderReplyPreview(); }
        if (previewBtn)     previewBtn.textContent        = '編集画面に戻る';
    } else {
        if (contentEl)      contentEl.style.display      = '';
        if (toolbarWrap)    toolbarWrap.style.display     = '';
        if (previewContent) previewContent.style.display  = 'none';
        if (previewBtn)     previewBtn.textContent        = '相手のメッセージ';
    }
}

function renderReplyPreview() {
    const mail = composeState.replyTo;
    const el   = document.getElementById('composePreviewContent');
    if (!mail || !el) return;

    const avatarEmoji = mail.fromAvatar || '👤';
    const sender      = mail.from || '(不明)';
    const headerHtml  = `<div class="compose-preview-header">${avatarEmoji} <span>${escapeHtml(sender)}</span> さんからのメッセージ</div>`;

    if (mail.designImg) {
        const fontMap = {
            gothic: "'Hiragino Kaku Gothic Pro', 'Yu Gothic', sans-serif",
            mincho: "'ZenOldMincho', 'Hiragino Mincho Pro', serif",
            uzura:  'uzura, sans-serif'
        };
        const ff     = fontMap[mail.fontFamily] || fontMap.gothic;
        const ptSize = (mail.fontSize || 13) + 'pt';
        el.innerHTML = headerHtml + `
            <div class="compose-preview-scroll">
                <div class="compose-letter-scroll">
                    <div class="compose-letter-wrap">
                        <img src="${mail.designImg}" class="compose-letter-img" alt="">
                        <div class="compose-letter-inputs">
                            <div class="compose-letter-to-block">
                                <div class="compose-letter-to-row">
                                    <div class="compose-letter-to" style="font-family:${ff}">${escapeHtml(mail.to || '')}</div>
                                    <span class="compose-letter-honorific-display" style="font-family:${ff}">${escapeHtml(mail.honorific || '')}</span>
                                    <span class="compose-letter-to-suffix">へ</span>
                                </div>
                            </div>
                            <div class="compose-letter-body" style="font-family:${ff};font-size:${ptSize}">${mail.body || ''}</div>
                        </div>
                    </div>
                </div>
            </div>`;
    } else {
        const letterNum = mail.letter || 1;
        el.innerHTML = headerHtml + `
            <div class="compose-preview-scroll">
                <div class="letter-wrap">
                    <img src="letter/letter${letterNum}.png" class="letter-img" alt="">
                    <div class="letter-text letter-font-${letterNum}">
                        <div class="letter-subject">${escapeHtml(mail.subject)}</div>
                        <div class="letter-body">${escapeHtml(mail.body)}</div>
                        <div class="letter-sign">${avatarEmoji} ${escapeHtml(sender)} より</div>
                    </div>
                </div>
            </div>`;
    }
}

// Step1: カテゴリ選択
function renderComposeStep1() {
    const content = document.getElementById('composeStepContent');
    const cats = [
        { id: 'letter', name: '手紙',           desc: '長文を書くのに適しています',         img: 'letter/flower2.png', ok: true },
        { id: 'card',   name: 'メッセージカード', desc: '短いメッセージを気軽に送れます',     img: 'letter/Messagecard/flower2.png',   ok: true },
        { id: 'nenga',  name: '年賀状',          desc: '新年のご挨拶を送りましょう',         img: 'letter/nenga1.png',  ok: isNengaPeriod() },
    ].filter(c => c.ok);

    content.innerHTML = `
        <div class="compose-intro">種類を選択してください</div>
        <div class="compose-cat-list">
            ${cats.map(c => `
                <button class="compose-cat-row" onclick="composeCatSelect('${c.id}')">
                    <div class="compose-cat-info">
                        <div class="compose-cat-row-name">${c.name}</div>
                        <div class="compose-cat-row-desc">${c.desc}</div>
                    </div>
                    <div class="compose-cat-preview">
                        <img src="${c.img}" alt="${c.name}"
                             onerror="this.style.display='none';this.parentNode.classList.add('no-preview')">
                    </div>
                </button>
            `).join('')}
        </div>
    `;
}

function composeCatSelect(cat) {
    composeState.category = cat;
    composeState.step = 2;
    renderComposeStep();
}

// Step2: デザイン選択
function renderComposeStep2() {
    const content = document.getElementById('composeStepContent');
    const designs = getAvailableDesigns(composeState.category);

    // letter・card カテゴリはジャンル小見出しを挿入する
    let gridItems = '';
    if (composeState.category === 'letter' || composeState.category === 'card') {
        let lastGroup = null;
        designs.forEach(d => {
            if (d.group && d.group !== lastGroup) {
                gridItems += `<div class="compose-design-group-heading">${d.groupName}</div>`;
                lastGroup = d.group;
            }
            gridItems += `
                <button class="compose-design-card" onclick="composeDesignSelect('${d.id}', '${d.img}')">
                    <div class="compose-design-thumb">
                        <img src="${d.img}" alt="${d.name}"
                             onerror="this.style.display='none';this.parentNode.classList.add('no-img')" loading="lazy">
                    </div>
                </button>
            `;
        });
    } else {
        gridItems = designs.map(d => `
            <button class="compose-design-card" onclick="composeDesignSelect('${d.id}', '${d.img}')">
                <div class="compose-design-thumb">
                    <img src="${d.img}" alt="${d.name}"
                         onerror="this.style.display='none';this.parentNode.classList.add('no-img')" loading="lazy">
                </div>
                <div class="compose-design-label">${d.name}</div>
            </button>
        `).join('');
    }

    content.innerHTML = `
        <div class="compose-intro">デザインを選択してください</div>
        <div class="compose-design-grid compose-design-grid--${composeState.category}">
            ${gridItems}
        </div>
    `;
}

function composeDesignSelect(designId, designImg) {
    composeState.design    = designId;
    composeState.designImg = designImg;
    composeState.step      = 3;
    renderComposeStep();
}

// Step3: 書く画面
function renderComposeStep3() {
    const content      = document.getElementById('composeStepContent');
    const toolbarWrap  = document.getElementById('composeToolbarWrap');
    const img          = composeState.designImg || '';
    const defTo        = composeState.replyTo ? escapeHtml(composeState.replyTo.from || '') : '';
    const colors       = ['#000000','#666666','#783f04','#cc0000','#e69138','#f1c232','#6aa84f','#45818e','#3c78d8','#3d85c6','#674ea7','#a64d79'];
    const attachHtml   = composeState.attachment
        ? `<span class="compose-attach-tag">${escapeHtml(composeState.attachment.name)}<button class="compose-detach-btn" onclick="detachItem()">✕</button></span>`
        : `<button class="compose-attach-opener" onclick="openAttachmentPicker()">ギフトを贈る</button>`;

    // 便箋エリアのみ（ツールバー・フッターは別要素へ）
    content.innerHTML = `
        <div class="compose-letter-scroll">
            <div class="compose-letter-wrap">
                <img src="${img}" class="compose-letter-img" alt=""
                     onerror="this.style.display='none';this.parentNode.classList.add('no-letter-img')">
                <div class="compose-letter-inputs">
                    <div class="compose-letter-to-block">
                        <div class="compose-letter-to-label">宛先</div>
                        <div class="compose-letter-to-row">
                            <input type="text" id="composeTo" class="compose-letter-to-input" placeholder="お名前" value="${defTo}">
                            <select id="composeHonorific" class="compose-honorific-sel" onchange="composeState.honorific=this.value">
                                ${['さん','ちゃん','くん','様','先生','殿','っち',''].map(h =>
                                    `<option value="${h}" ${(composeState.honorific||'さん') === h ? 'selected' : ''}>${h || '（なし）'}</option>`
                                ).join('')}
                            </select>
                            <span class="compose-letter-to-suffix">へ</span>
                        </div>
                    </div>
                    <div id="composeBody" class="compose-letter-body" contenteditable="true" data-placeholder="本文..."></div>
                </div>
            </div>
        </div>
    `;

    // ツールバーを一番下の専用エリアへ
    if (toolbarWrap) {
        toolbarWrap.innerHTML = `
            <div class="compose-toolbar-strip">
                <div class="compose-colors">
                    ${colors.map(c => `<button class="compose-color-btn${composeState.textColor === c ? ' sel' : ''}" style="background:${c}" data-color="${c}" onclick="setComposeColor('${c}')"></button>`).join('')}
                </div>
                <span class="compose-tb-sep"></span>
                <button class="compose-bold-btn${composeState.bold ? ' sel' : ''}" onclick="toggleComposeBold()" ${composeState.fontFamily === 'uzura' ? 'disabled' : ''}>B</button>
                <span class="compose-tb-sep"></span>
                <select id="composeFont" class="compose-font-sel" onchange="setComposeFont(this.value)">
                    <option value="gothic" ${composeState.fontFamily === 'gothic' ? 'selected' : ''}>ゴシック体</option>
                    <option value="mincho" ${composeState.fontFamily === 'mincho' ? 'selected' : ''}>明朝体</option>
                    <option value="uzura"  ${composeState.fontFamily === 'uzura'  ? 'selected' : ''}>手書き風</option>
                </select>
                <span class="compose-tb-sep"></span>
                ${attachHtml}
            </div>
        `;
    }

    applyComposeBodyStyle();

    // 戻ってきたときに保存内容を復元
    const toEl  = document.getElementById('composeTo');
    const bodyEl = document.getElementById('composeBody');
    if (composeState.savedTo   && toEl)   toEl.value       = composeState.savedTo;
    if (composeState.savedBody && bodyEl) bodyEl.innerHTML = composeState.savedBody;

    // contenteditable の空状態クラス管理
    if (bodyEl) {
        bodyEl.classList.toggle('is-empty', !bodyEl.innerText.trim());

        // 枠内に収まるよう入力を制限（行の途中で切れないようにする）
        let _prevBodyHtml = bodyEl.innerHTML;
        bodyEl.addEventListener('beforeinput', function() {
            _prevBodyHtml = this.innerHTML;
        });
        bodyEl.addEventListener('input', function() {
            if (this.scrollHeight > this.clientHeight) {
                this.innerHTML = _prevBodyHtml;
                // カーソルを末尾に戻す
                const range = document.createRange();
                range.selectNodeContents(this);
                range.collapse(false);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
            this.classList.toggle('is-empty', this.innerText.trim() === '');
        });
        // 初回フォーカス時に選択中カラーをセット
        bodyEl.addEventListener('focus', function() {
            document.execCommand('foreColor', false, composeState.textColor || '#000000');
        }, { once: true });
        // 選択変化時にBボタンの状態を更新
        document.addEventListener('selectionchange', updateComposeBoldBtn);
    }

    if (bodyEl) {
        bodyEl.addEventListener('focus', () => { lastComposeFocusId = 'composeBody'; }, true);
    }

    // ドラッグドロップを無効化（画像の二重表示バグ防止）
    if (bodyEl) {
        bodyEl.addEventListener('drop', e => e.preventDefault());
        bodyEl.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'none'; });
    }
}

function updateComposeBoldBtn() {
    const body = document.getElementById('composeBody');
    // bodyがなくなったらリスナー解除
    if (!body) {
        document.removeEventListener('selectionchange', updateComposeBoldBtn);
        return;
    }
    const sel = window.getSelection();
    if (!sel || !body.contains(sel.anchorNode)) return;
    const isBold = document.queryCommandState('bold');
    composeState.bold = isBold;
    const btn = document.querySelector('.compose-bold-btn');
    if (btn) btn.classList.toggle('sel', isBold);
}

// テキストスタイルを本文・フィールドに反映
function applyComposeBodyStyle() {
    const body = document.getElementById('composeBody');
    if (!body) return;
    const fontMap = {
        gothic: "'Hiragino Kaku Gothic Pro', 'Yu Gothic', sans-serif",
        mincho: "'ZenOldMincho', 'Hiragino Mincho Pro', serif",
        uzura:  'uzura, sans-serif'
    };
    const ff = fontMap[composeState.fontFamily] || fontMap.gothic;
    body.style.fontFamily = ff;
    const ptSize = (composeState.fontSize || 13) + 'pt';
    body.style.fontSize   = ptSize;
    // 宛先・敬称・「へ」にもフォントを反映
    const toEl = document.getElementById('composeTo');
    if (toEl) toEl.style.fontFamily = ff;
    const honorificEl = document.getElementById('composeHonorific');
    if (honorificEl) honorificEl.style.fontFamily = ff;
    document.querySelectorAll('.compose-letter-to-suffix').forEach(el => el.style.fontFamily = ff);
}

function setComposeFontSize(s) {
    composeState.fontSize = s;
    applyComposeBodyStyle();
}

function composeSizeStep(dir) {
    const MIN_PT = 8, MAX_PT = 24;
    const newPt = (composeState.fontSize || 13) + dir;
    if (newPt < MIN_PT || newPt > MAX_PT) return;
    composeState.fontSize = newPt;
    applyComposeBodyStyle();
    const labelEl = document.getElementById('composeSizeLabel');
    if (labelEl) labelEl.textContent = newPt + 'pt';
    const [btnDown, btnUp] = document.querySelectorAll('.compose-size-step-btn');
    if (btnDown) btnDown.disabled = newPt <= MIN_PT;
    if (btnUp)   btnUp.disabled   = newPt >= MAX_PT;
}

function setComposeColor(c) {
    composeState.textColor = c;
    document.querySelectorAll('.compose-color-btn').forEach(b =>
        b.classList.toggle('sel', b.dataset.color === c)
    );
    // 最後にフォーカスしていたフィールドに色を適用
    const target = document.getElementById(lastComposeFocusId) || document.getElementById('composeBody');
    if (target) {
        target.focus();
        document.execCommand('foreColor', false, c);
    }
}

function toggleComposeBold() {
    const body = document.getElementById('composeBody');
    if (!body) return;
    body.focus();
    document.execCommand('bold');
    const isBold = document.queryCommandState('bold');
    composeState.bold = isBold;
    const btn = document.querySelector('.compose-bold-btn');
    if (btn) btn.classList.toggle('sel', isBold);
}

function setComposeFont(val) {
    composeState.fontFamily = val;
    applyComposeBodyStyle();
    const boldBtn = document.querySelector('.compose-bold-btn');
    if (boldBtn) boldBtn.disabled = val === 'uzura';
}

// プレゼント添付ピッカー
function openAttachmentPicker() {
    const items = gameState.player.possessions;
    if (!items || items.length === 0) {
        showComposeToast('所持品にアイテムがありません');
        return;
    }
    const overlay = document.getElementById('attachPickerOverlay');
    overlay.innerHTML = `
        <div class="attach-picker-box">
            <div class="attach-picker-ttl">アイテムを選択してください</div>
            <div class="attach-picker-list">
                ${items.map((item, i) => `
                    <button class="attach-picker-row" onclick="attachItem(${i})">
                        <span class="attach-picker-name">${escapeHtml(item.name)}</span>
                        <span class="attach-picker-qty">×${item.quantity ?? 1}</span>
                    </button>
                `).join('')}
            </div>
            <button class="attach-picker-cancel" onclick="closeAttachPicker()">キャンセル</button>
        </div>
    `;
    overlay.style.display = 'flex';
}

function attachItem(idx) {
    const item = gameState.player.possessions[idx];
    if (item) composeState.attachment = item;
    closeAttachPicker();
    saveComposeBodyToState();
    renderComposeStep3();
}

function closeAttachPicker() {
    const overlay = document.getElementById('attachPickerOverlay');
    if (overlay) overlay.style.display = 'none';
}

function detachItem() {
    composeState.attachment = null;
    saveComposeBodyToState();
    renderComposeStep3();
}

function saveComposeBodyToState() {
    const to   = document.getElementById('composeTo');
    const body = document.getElementById('composeBody');
    if (to)   composeState.savedTo   = to.value;
    if (body) composeState.savedBody = body.innerHTML;
}

// 下書き保存
function saveComposeDraft() {
    const to   = document.getElementById('composeTo')?.value || '';
    const body = document.getElementById('composeBody')?.innerHTML || '';
    const subject = getBodyPreview(body);
    saveDraftData(to, subject, body);
    // 即座に画面切り替え
    closeComposeView();
    doSelectMailFolder('inbox');
    showMailboxGlobalToast('下書きに保存しました');
}

// 送信
function sendComposedMail() {
    const to      = document.getElementById('composeTo')?.value?.trim() || '';
    const bodyEl  = document.getElementById('composeBody');
    const body    = bodyEl?.innerHTML || '';
    const bodyText = bodyEl?.innerText?.trim() || '';
    const subject = getBodyPreview(body);
    if (!to)       { showComposeToast('宛先を入力してください'); return; }
    if (!bodyText) { showComposeToast('本文を書いてください');   return; }

    const honorific = document.getElementById('composeHonorific')?.value ?? composeState.honorific ?? 'さん';
    gameState.mailbox.sent.push({
        id: gameState.mailNextId++,
        to, subject, body, honorific,
        from: gameState.player.name || '自分',
        fromAvatar: gameState.player.avatar || '',
        fromAvatarBg: gameState.player.avatarBgColor || '#FFD0A0',
        date: Date.now(), read: true, starred: false,
        category: composeState.category, design: composeState.design,
        designImg: composeState.designImg, textColor: composeState.textColor,
        bold: composeState.bold, fontFamily: composeState.fontFamily, fontSize: composeState.fontSize,
        attachment: composeState.attachment ? { ...composeState.attachment } : null,
    });
    updateMailBadges();
    closeComposeView();
    doSelectMailFolder('sent');
    showMailboxGlobalToast(`${to}${honorific} にお手紙を送りました ✈️`);
}

// スタンプピッカー
let currentStampBtn = null;

function openStampPicker(btn) {
    const picker = document.getElementById('stampPicker');
    if (!picker) return;
    if (picker.style.display !== 'none') {
        picker.style.display = 'none';
        return;
    }
    currentStampBtn = btn;
    picker.style.display = 'block';
    const btnRect = btn.getBoundingClientRect();
    const pw = picker.offsetWidth;
    const left = Math.round(btnRect.left + btnRect.width / 2 - pw / 2);
    picker.style.top  = (btnRect.bottom + 16) + 'px';
    picker.style.left = left + 'px';
}

function closeStampPicker() {
    const picker = document.getElementById('stampPicker');
    if (picker) picker.style.display = 'none';
}

function selectStamp(stampId) {
    closeStampPicker();
    const mails = getMailList();
    const mail = mails[currentMailDetailIdx];
    if (!mail) return;
    const realMail = gameState.mailbox[mail._srcFolder] && gameState.mailbox[mail._srcFolder][mail._srcIdx];
    if (realMail) {
        if (!realMail.stamps) realMail.stamps = [];
        realMail.stamps.push({ id: stampId, from: gameState.player.name || '自分' });
    }
    // スタンプボタンの画像を送ったスタンプに切り替え
    if (currentStampBtn) {
        const img = currentStampBtn.querySelector('img');
        if (img) img.src = `status/mail/${stampId}.png`;
    }
    showMailboxGlobalToast('スタンプを送りました！');
}

// 返信ボタン（詳細画面から呼ばれる）
function replyToMail() {
    const mails = getMailList();
    const mail  = mails[currentMailDetailIdx];
    if (!mail) return;
    openComposeView(mail);
}

// メールボックス全体トースト（一覧画面でも表示できる）
function showMailboxGlobalToast(msg) {
    const el = document.getElementById('mailboxGlobalToast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.classList.add('show');
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => { el.style.display = 'none'; }, 300);
    }, 1600);
}

// トースト通知
function showComposeToast(msg) {
    const el = document.getElementById('composeToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
}

function formatMailDate(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    if (diff < hour) return 'たった今';
    if (diff < day) return `${Math.floor(diff / hour)}時間前`;
    if (diff < 7 * day) return `${Math.floor(diff / day)}日前`;
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatMailDateFull(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    const days = Math.floor((now - d) / (24 * 60 * 60 * 1000));
    if (days === 0) return '今日';
    if (days === 1) return '昨日';
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// ============================================
// 通知機能
// ============================================

// 現在表示中のカテゴリを既読化してバッジを更新（カテゴリ離脱・タブ離脱時に呼ぶ）
function markCurrentNotifCategoryRead() {
    if (currentNotifFilter === 'news') return;
    const types = getNotifFilterTypes(currentNotifFilter);
    (gameState.notifications || []).forEach(n => {
        if (types.includes(n.type)) n.read = true;
    });
    updateNotifBadge();
}

function switchNotifCategory(type) {
    markCurrentNotifCategoryRead(); // 今いるカテゴリを既読にしてからバッジを消す
    currentNotifFilter = type;
    updateNotifCategoryUI();
    renderNotifList(); // 新カテゴリを描画（未読色はそのまま表示）
}

function updateNotifCategoryUI() {
    ['Like', 'Comment', 'Friend', 'Saisen', 'News'].forEach(t => {
        const btn = document.getElementById(`notifCat${t}`);
        if (btn) btn.classList.toggle('active', currentNotifFilter === t.toLowerCase());
    });
    const titles = { like: 'いいね', comment: 'コメント', friend: '友達', saisen: 'お賽銭', news: 'お知らせ' };
    const titleEl = document.getElementById('notifViewTitle');
    if (titleEl) { titleEl.textContent = titles[currentNotifFilter] || ''; titleEl.style.display = ''; }
    const backBtn = document.getElementById('notifBackBtn');
    if (backBtn) backBtn.style.display = 'none';
    const readAllBtn = document.querySelector('.notif-read-all-btn');
    if (readAllBtn) readAllBtn.style.display = currentNotifFilter === 'news' ? 'none' : '';
}

function getNotifFilterTypes(filter) {
    if (filter === 'like')    return ['like', 'stamp'];
    if (filter === 'comment') return ['comment', 'reply'];
    if (filter === 'saisen')  return ['saisen'];
    if (filter === 'friend')  return ['friend_build_house', 'friend_build_town', 'friend_request'];
    if (filter === 'news')    return ['news'];
    return [];
}

function getNotifActionText(n) {
    const name = `<strong>${n.fromName}</strong>`;
    switch (n.type) {
        case 'like':               return `${name}さんがあなたの投稿に <img src="status/Heart2.png" style="width:16px;height:16px;vertical-align:middle;margin:0 -1px;position:relative;top:-2px;"> いいねしました`;
        case 'stamp':              return `${name}さんがあなたの投稿に ${n.stampEmoji || '🌸'} スタンプしました`;
        case 'comment':            return `${name}さんがあなたの投稿にコメントしました`;
        case 'reply':              return `${name}さんがコメントに返信しました`;
        case 'friend_build_house': return `${name}さんが新しいおうちを建てました 🏠`;
        case 'friend_build_town':  return `${name}さんが新しいタウンを作りました 🏙️`;
        case 'friend_request':     return `${name}さんがフレンド申請を送ってきました！`;
        case 'saisen':             return `${name}さんから${n.amount?.toLocaleString()}円のお賽銭をもらいました！`;
        case 'news':               return (typeof NEWS_BODIES !== 'undefined' && NEWS_BODIES[n.id]?.title) || n.title || 'お知らせが届いています 📢';
        default:                   return `${name}さんから通知があります`;
    }
}

function renderNotifList() {
    const el = document.getElementById('notifList');
    if (!el) return;
    const types = getNotifFilterTypes(currentNotifFilter);
    const items = (gameState.notifications || []).filter(n => types.includes(n.type));
    if (items.length === 0) {
        el.innerHTML = `<div class="notif-empty">現在、通知はありません</div>`;
        return;
    }
    const sorted = [...items].sort((a, b) => b.date - a.date);
    el.innerHTML = sorted.map(n => {
        const isImg = typeof n.fromAvatar === 'string' && n.fromAvatar.endsWith('.png');
        const avatarHtml = isImg
            ? `<img src="${n.fromAvatar}">`
            : `<span style="font-size:20px;">${n.fromAvatar || '👤'}</span>`;
        const newsData = (typeof NEWS_BODIES !== 'undefined') && NEWS_BODIES[n.id];
        const hasNewsBody = n.type === 'news' && newsData?.body;
        const displaySnippet = (n.type === 'news' && newsData?.snippet) ? newsData.snippet : n.postSnippet;
        const actionText = getNotifActionText(n);
        const isComment = n.type === 'comment' || n.type === 'reply';
        const snippetHtml = !isComment && displaySnippet
            ? `<div class="notif-item-snippet">${displaySnippet}</div>` : '';
        const commentHtml = n.commentText
            ? `<div class="notif-item-snippet"><img src="status/mail/Comment3.png" style="width:14px;height:14px;vertical-align:middle;position:relative;top:-1px;margin-right:3px;">${n.commentText}</div>` : '';
        const clickHandler = hasNewsBody ? `showNewsDetail(${n.id})` : `markNotifRead(${n.id})`;
        const arrowHtml = hasNewsBody ? `<div class="notif-item-arrow">›</div>` : '';
        return `
        <div class="notif-item ${n.read ? '' : 'unread'}" onclick="${clickHandler}">
            <div class="notif-item-avatar" style="background:${n.fromAvatarBg || '#FFB6C1'}">${avatarHtml}</div>
            <div class="notif-item-body">
                <div class="notif-item-action">${actionText}</div>
                ${snippetHtml}${commentHtml}
            </div>
            <div class="notif-item-time">${formatMailDate(n.date)}</div>
            ${arrowHtml}
        </div>`;
    }).join('');
}

function showNewsDetail(id) {
    const n = (gameState.notifications || []).find(n => n.id === id);
    if (!n) return;
    n.read = true;
    updateNotifBadge();

    const backBtn  = document.getElementById('notifBackBtn');
    const titleEl  = document.getElementById('notifViewTitle');
    const readAll  = document.querySelector('.notif-read-all-btn');
    if (backBtn)  backBtn.style.display  = '';
    if (titleEl)  titleEl.style.display  = 'none';
    if (readAll)  readAll.style.display  = 'none';

    const el = document.getElementById('notifList');
    if (!el) return;
    const newsData = (typeof NEWS_BODIES !== 'undefined') && NEWS_BODIES[n.id];
    const body = newsData?.body || n.body || '';
    const title = newsData?.title || n.title || 'お知らせ';
    el.innerHTML = `
        <div class="news-detail">
            <h3 class="news-detail-title">${title}</h3>
            <hr class="news-detail-divider">
            <div class="news-detail-body">${body}</div>
        </div>`;
}

function backFromNewsDetail() {
    const backBtn  = document.getElementById('notifBackBtn');
    const titleEl  = document.getElementById('notifViewTitle');
    if (backBtn)  backBtn.style.display  = 'none';
    if (titleEl)  titleEl.style.display  = '';

    renderNotifList();
}

function markNotifRead(id) {
    const n = (gameState.notifications || []).find(n => n.id === id);
    if (n) n.read = true;
    renderNotifList();
    updateNotifBadge();
}

function markAllNotifRead() {
    const types = getNotifFilterTypes(currentNotifFilter);
    (gameState.notifications || []).forEach(n => {
        if (types.includes(n.type)) n.read = true;
    });
    renderNotifList();
    updateNotifBadge();
}

function updateNotifBadge() {
    const notifs = gameState.notifications || [];
    const likeCnt    = notifs.filter(n => ['like','stamp'].includes(n.type) && !n.read).length;
    const commentCnt = notifs.filter(n => ['comment','reply'].includes(n.type) && !n.read).length;
    const friendCnt  = notifs.filter(n => ['friend_build_house','friend_build_town','friend_request'].includes(n.type) && !n.read).length;
    const saisenCnt  = notifs.filter(n => n.type === 'saisen' && !n.read).length;
    const newsCnt    = notifs.filter(n => n.type === 'news' && !n.read).length;

    const likeBadge    = document.getElementById('notifLikeBadge');
    const commentBadge = document.getElementById('notifCommentBadge');
    const friendBadge  = document.getElementById('notifFriendBadge');
    const saisenBadge  = document.getElementById('notifSaisenBadge');
    const newsBadge    = document.getElementById('notifNewsBadge');
    if (likeBadge)    { likeBadge.textContent    = likeCnt;    likeBadge.classList.toggle('visible',    likeCnt    > 0); }
    if (commentBadge) { commentBadge.textContent = commentCnt; commentBadge.classList.toggle('visible', commentCnt > 0); }
    if (friendBadge)  { friendBadge.textContent  = friendCnt;  friendBadge.classList.toggle('visible',  friendCnt  > 0); }
    if (saisenBadge)  { saisenBadge.textContent  = saisenCnt;  saisenBadge.classList.toggle('visible',  saisenCnt  > 0); }
    if (newsBadge)    { newsBadge.textContent    = newsCnt;    newsBadge.classList.toggle('visible',    newsCnt    > 0); }

    // タブボタンの未読ドット
    const totalUnread = likeCnt + commentCnt + friendCnt + saisenCnt + newsCnt;
    const dot = document.getElementById('tabNotifDot');
    if (dot) dot.style.display = totalUnread > 0 ? 'inline-block' : 'none';

    // ステータス画面のアイコンバッジも更新
    updateMailBadges();
}

// ============================================
// 友人関係機能（未実装）
// ============================================
function openFriendModal() {
    // 友人関係機能は現在準備中です
}

