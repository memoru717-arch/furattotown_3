// ============================================
// 共同掲示板（bulletin）
// ============================================

let bulletinCurrentPage = 1;
let _bulletinSavedRange = null;
let _bulletinAttachedImage = null;
let _bulletinAttachedFileName = '';
let _bulletinReplyingToCommentId = null;

/* ─── 家主判定（将来の訪問者対応ポイント） ─── */
function isBulletinOwner() {
    return true; // TODO: 訪問システム実装時に切替
}

function canDeleteBulletinItem(authorType) {
    return isBulletinOwner() || authorType === 'self';
}

function getBulletinAuthorInfo() {
    const p = gameState.player;
    return {
        type: 'owner',
        name: p.name || 'ゲスト',
        avatar: p.avatar || '😊',
        avatarBg: p.avatarBgColor || '#FFB6C1',
        job: p.job || '',
    };
}

/* ─── データ初期化 ─── */
function ensureBulletinState() {
    const house = gameState.player.house;
    if (!house) return;
    if (!house.bulletin) house.bulletin = { posts: [], nextNo: 1 };
    if (!house.bulletin.posts) house.bulletin.posts = [];
    if (!house.bulletin.nextNo) house.bulletin.nextNo = 1;
    if (!gameState.likedBulletins) gameState.likedBulletins = [];
}

/* ─── メインレンダリング ─── */
function renderBulletinContent(container) {
    ensureBulletinState();
    const isOwner = isBulletinOwner();
    const posts = gameState.player.house.bulletin.posts;
    const totalPages = Math.max(1, Math.ceil(posts.length / 20));
    if (bulletinCurrentPage > totalPages) bulletinCurrentPage = totalPages;
    const start = (bulletinCurrentPage - 1) * 20;
    const pagePosts = posts.slice(start, start + 20);

    container.innerHTML = `
        <div class="myhouse-bulletin-wrap">
            <div class="myhouse-bulletin-posts-col">
                <ul class="myhouse-bulletin-list">
                    ${pagePosts.length > 0
                        ? pagePosts.map(p => buildBulletinPostHtml(p, isOwner)).join('<hr class="myhouse-bulletin-divider">')
                        : '<li class="myhouse-bulletin-empty">まだ投稿がありません。最初の投稿をしてみよう！</li>'}
                </ul>
                ${totalPages > 1 ? buildBulletinPaginationHtml(totalPages) : ''}
            </div>
            <div class="myhouse-bulletin-form-col">
                ${buildBulletinFormHtml(isOwner)}
                ${buildBulletinProfileCardHtml()}
            </div>
        </div>`;

    // 添付画像が残っている場合は状態を復元
    if (_bulletinAttachedImage) {
        const area = document.getElementById('bulletinAttachment');
        const thumb = document.getElementById('bulletinAttachThumb');
        const name = document.getElementById('bulletinAttachName');
        if (area) area.style.display = 'flex';
        if (thumb) thumb.src = _bulletinAttachedImage;
        if (name) name.textContent = _bulletinAttachedFileName;
    }
}

/* ─── プロフィールカード ─── */
function buildBulletinProfileCardHtml() {
    const p = gameState.player;
    const bio = (p.house && p.house.bio) ? escapeHtml(p.house.bio) : '';
    const isImgPath = p.avatar && (p.avatar.includes('/') || p.avatar.includes('.'));
    const avatarHtml = isImgPath
        ? `<img src="${escapeHtml(p.avatar)}" class="myhouse-bulletin-avatar-img">`
        : `<span class="myhouse-bulletin-avatar-emoji">${p.avatar || '😊'}</span>`;
    const jobText = p.job ? escapeHtml(p.job) : '';
    return `
        <div class="myhouse-bulletin-profile-card">
            <div class="myhouse-bulletin-panel-header">プロフィール</div>
            <div class="myhouse-bulletin-profile-top">
                <div class="myhouse-bulletin-avatar" style="background:${escapeHtml(p.avatarBgColor || '#FFB6C1')}">${avatarHtml}</div>
                <div class="myhouse-bulletin-profile-meta">
                    <span class="myhouse-bulletin-profile-name">${escapeHtml(p.name || 'ゲスト')}</span>
                    ${jobText ? `<span class="myhouse-bulletin-profile-job">${jobText}</span>` : ''}
                </div>
            </div>
            ${bio ? `<p class="myhouse-bulletin-profile-bio">${bio}</p>` : '<p class="myhouse-bulletin-profile-bio myhouse-bulletin-profile-bio--empty">一言メモが未設定です</p>'}
            <div class="myhouse-bulletin-profile-actions">
                <button class="myhouse-bulletin-profile-action-btn" title="多人数プレイ時に使えます"><img src="house/icon/mail.svg" class="myhouse-bulletin-tb-icon" alt="">メールを送る</button>
                <button class="myhouse-bulletin-profile-action-btn" title="多人数プレイ時に使えます"><img src="house/icon/friend.svg" class="myhouse-bulletin-tb-icon" alt="">フレンド申請</button>
            </div>
        </div>`;
}

/* ─── 投稿フォーム ─── */
function buildBulletinFormHtml(isOwner) {
    const ownerTools = isOwner ? `
        <button class="myhouse-bulletin-tb-btn" onmousedown="event.preventDefault();bulletinTriggerImagePick()" title="画像を添付">
            <img src="house/icon/image.svg" class="myhouse-bulletin-tb-icon" alt="画像">画像
        </button>
        <input type="file" id="bulletinImageInput" accept="image/*" style="display:none" onchange="bulletinHandleImagePick(this)">
        <span style="color:#d6c5b8;font-size:13px;line-height:1;align-self:center;">|</span>
        <button class="myhouse-bulletin-tb-btn" onmousedown="event.preventDefault();bulletinSaveSelection();bulletinInsertLink()" title="リンクを挿入">
            <img src="house/icon/link.svg" class="myhouse-bulletin-tb-icon" alt="リンク">リンク
        </button>` : '';

    const commentToggle = isOwner ? `
        <label class="myhouse-bulletin-allow-label">
            <span class="myhouse-bulletin-allow-text">コメントを許可する：</span>
            <input type="checkbox" id="bulletinAllowComments" class="myhouse-bulletin-checkbox" checked>
        </label>` : '';

    return `
        <div class="myhouse-bulletin-form">
            <div class="myhouse-bulletin-panel-header">投稿する</div>
            <div class="myhouse-bulletin-toolbar">
                ${ownerTools}
                ${commentToggle}
            </div>
            <div id="bulletinEditor" class="myhouse-bulletin-editor" contenteditable="true"
                data-placeholder="ひとこと書いてみよう..."
                onkeydown="if(event.key==='Enter'&&event.ctrlKey){event.preventDefault();submitBulletinPost();}"
                onpaste="bulletinHandlePaste(event)"
                oninput="bulletinUpdateCharCount()"></div>
            <div id="bulletinAttachment" class="myhouse-bulletin-attachment" style="display:none;">
                <img id="bulletinAttachThumb" class="myhouse-bulletin-attach-thumb" src="" alt="添付画像">
                <span id="bulletinAttachName" class="myhouse-bulletin-attach-name"></span>
                <button class="myhouse-bulletin-attach-remove" onmousedown="event.preventDefault();bulletinRemoveAttachment()" title="添付を解除">×</button>
            </div>
            <div class="myhouse-bulletin-form-footer">
                <span class="myhouse-bulletin-char-count"><span id="bulletinCharCount">0</span>/300</span>
                <button class="myhouse-bulletin-submit-btn" onclick="submitBulletinPost()">投稿する</button>
            </div>
        </div>`;
}

/* ─── 投稿1件のHTML ─── */
function buildBulletinPostHtml(post, isOwner) {
    const isImg = typeof post.authorAvatar === 'string' && post.authorAvatar.includes('/');
    const avatarHtml = isImg
        ? `<img src="${escapeHtml(post.authorAvatar)}" alt="アバター" class="myhouse-bulletin-avatar-img">`
        : `<span class="myhouse-bulletin-avatar-emoji">${post.authorAvatar || '😊'}</span>`;

    const canDelete = canDeleteBulletinItem(post.authorType);
    const deleteBtn = canDelete
        ? `<button class="myhouse-bulletin-delete-btn" onclick="confirmDeleteBulletinPost('${escapeAttr(post.id)}')" title="削除">削除</button>`
        : '';

    const ownerBadge = post.authorType === 'owner' ? '<span class="myhouse-bulletin-owner-sep"> ｜ 家主</span>' : '';
    const dateText = formatBoardDate(post.createdAt);
    const likedNormal = (gameState.likedBulletins || []).includes(`${post.id}:normal`);
    const likedAnon   = (gameState.likedBulletins || []).includes(`${post.id}:anonymous`);
    const commentCount = (post.comments || []).length;

    // コメントアイコン（常に表示・クリックで入力フォームを開閉）
    const commentIconHtml = post.allowComments
        ? `<button class="myhouse-bulletin-action-btn myhouse-bulletin-action-btn--icon" id="bulletinCommentIcon-${escapeAttr(post.id)}"
               onclick="toggleBulletinReplyForm('${escapeAttr(post.id)}')">
               <img src="House/icon/Comment.svg" alt="返信" class="myhouse-bulletin-action-icon"><span class="myhouse-bulletin-action-label">返信する</span>
           </button>`
        : '';

    // 「N件の返信」テキスト（コメントがあるときだけ表示・クリックで一覧を開閉）
    const replyToggleHtml = (post.allowComments && commentCount > 0)
        ? `<span class="myhouse-bulletin-reply-toggle" id="bulletinReplyToggle-${escapeAttr(post.id)}"
               onclick="toggleBulletinReplies('${escapeAttr(post.id)}')">${commentCount}件の返信</span>`
        : '';

    return `
        <li class="myhouse-bulletin-item" data-post-id="${escapeAttr(post.id)}">
            <div class="myhouse-bulletin-post-head">
                <div class="myhouse-bulletin-avatar" style="background:${escapeHtml(post.authorAvatarBg || '#FFB6C1')}">${avatarHtml}</div>
                <div class="myhouse-bulletin-post-meta">
                    <span class="myhouse-bulletin-author">${escapeHtml(post.authorName)}${ownerBadge}</span>
                    <span class="myhouse-bulletin-date">${dateText}</span>
                </div>
                <div class="myhouse-bulletin-post-right">
                    ${deleteBtn}
                </div>
            </div>
            ${post.imageUrl ? `<div class="myhouse-bulletin-post-image"><img src="${escapeHtml(post.imageUrl)}" class="myhouse-bulletin-post-img" alt="投稿画像"></div>` : ''}
            <div class="myhouse-bulletin-post-body">${post.html || ''}</div>
            <div class="myhouse-bulletin-post-actions">
                ${commentIconHtml}
                <button class="myhouse-bulletin-action-btn myhouse-bulletin-action-btn--icon${likedNormal ? ' myhouse-bulletin-action-btn--active' : ''}"
                     id="bulletinHeart-${escapeAttr(post.id)}-normal"
                     onclick="toggleBulletinHeart('${escapeAttr(post.id)}','normal')">
                    <img src="House/icon/${likedNormal ? 'like2' : 'like'}.svg" alt="いいね" class="myhouse-bulletin-action-icon"><span class="myhouse-bulletin-action-label">いいね</span>
                </button>
                <button class="myhouse-bulletin-action-btn myhouse-bulletin-action-btn--icon${likedAnon ? ' myhouse-bulletin-action-btn--active' : ''}"
                     id="bulletinHeart-${escapeAttr(post.id)}-anonymous"
                     onclick="toggleBulletinHeart('${escapeAttr(post.id)}','anonymous')">
                    <img src="House/icon/${likedAnon ? 'secret4' : 'secret3'}.svg" alt="こっそりいいね" class="myhouse-bulletin-action-icon"><span class="myhouse-bulletin-action-label">こっそりいいね</span>
                </button>
                ${replyToggleHtml}
            </div>
            <div class="myhouse-bulletin-reply-list" id="bulletinReplyList-${escapeAttr(post.id)}" style="display:none;">
                ${buildBulletinReplyListHtml(post, isOwner)}
            </div>
            <div class="myhouse-bulletin-reply-form" id="bulletinReplyForm-${escapeAttr(post.id)}" style="display:none;">
                <textarea class="myhouse-bulletin-reply-textarea" id="bulletinCommentText-${escapeAttr(post.id)}"
                    placeholder="返信を入力..." rows="2"
                    onkeydown="if(event.key==='Enter'&&event.ctrlKey){event.preventDefault();submitBulletinComment('${escapeAttr(post.id)}');}"
                    oninput="bulletinUpdateReplyCharCount('${escapeAttr(post.id)}')"></textarea>
                <div class="myhouse-bulletin-reply-btns">
                    <span class="myhouse-bulletin-char-count" id="bulletinReplyCharCountWrap-${escapeAttr(post.id)}"><span id="bulletinReplyCharCount-${escapeAttr(post.id)}">0</span>/150</span>
                    <button class="myhouse-bulletin-comment-submit-btn" onclick="submitBulletinComment('${escapeAttr(post.id)}')">返信する</button>
                </div>
            </div>
        </li>`;
}

/* ─── コメント1件のHTML ─── */
function _buildCommentHtml(c, post, isOwner, isNested) {
    const isImg = typeof c.authorAvatar === 'string' && c.authorAvatar.includes('/');
    const avatarHtml = isImg
        ? `<img src="${escapeHtml(c.authorAvatar)}" alt="アバター" class="myhouse-bulletin-comment-avatar-img">`
        : `<span class="myhouse-bulletin-comment-avatar-emoji">${c.authorAvatar || '😊'}</span>`;
    const ownerBadge = c.authorType === 'owner' ? '<span class="myhouse-bulletin-owner-sep"> ｜ 家主</span>' : '';
    const canDeleteC = canDeleteBulletinItem(c.authorType);
    const deleteBtnC = canDeleteC
        ? `<button class="myhouse-bulletin-delete-btn myhouse-bulletin-delete-btn-sm" onclick="confirmDeleteBulletinComment('${escapeAttr(post.id)}','${escapeAttr(c.id)}')" title="削除">削除</button>`
        : '';
    const likedComment = (gameState.likedBulletins || []).includes(`${c.id}:like`);
    const likedCommentAnon = (gameState.likedBulletins || []).includes(`${c.id}:anonymous`);
    const nestedClass = isNested ? ' myhouse-bulletin-comment--nested' : '';
    return `
        <div class="myhouse-bulletin-comment${nestedClass}">
            <div class="myhouse-bulletin-comment-avatar" style="background:${escapeHtml(c.authorAvatarBg || '#FFB6C1')}">${avatarHtml}</div>
            <div class="myhouse-bulletin-comment-body">
                <div class="myhouse-bulletin-comment-head">
                    <div class="myhouse-bulletin-comment-meta">
                        <span class="myhouse-bulletin-comment-author">${escapeHtml(c.authorName)}${ownerBadge}</span>
                        <span class="myhouse-bulletin-comment-date">${formatBoardDate(c.createdAt)}</span>
                    </div>
                    ${deleteBtnC}
                </div>
                <div class="myhouse-bulletin-comment-text">${escapeHtml(c.text).replace(/^(&gt;&gt; [^\n]+)/m, '<span class="myhouse-bulletin-mention">$1</span>').replace(/\n/g, '<br>')}</div>
                <div class="myhouse-bulletin-comment-actions">
                    <button class="myhouse-bulletin-action-btn myhouse-bulletin-action-btn--icon"
                            id="bulletinCommentReplyIcon-${escapeAttr(c.id)}"
                            onclick="toggleBulletinReplyForm('${escapeAttr(post.id)}','${escapeAttr(c.authorName)}','bulletinCommentReplyIcon-${escapeAttr(c.id)}','${escapeAttr(c.id)}')">
                        <img src="House/icon/Comment.svg" alt="返信" class="myhouse-bulletin-action-icon"><span class="myhouse-bulletin-action-label">返信する</span>
                    </button>
                    <button class="myhouse-bulletin-action-btn myhouse-bulletin-action-btn--icon${likedComment ? ' myhouse-bulletin-action-btn--active' : ''}"
                            id="bulletinCommentHeart-${escapeAttr(c.id)}"
                            onclick="toggleBulletinCommentHeart('${escapeAttr(c.id)}')">
                        <img src="House/icon/${likedComment ? 'like2' : 'like'}.svg" alt="いいね" class="myhouse-bulletin-action-icon"><span class="myhouse-bulletin-action-label">いいね</span>
                    </button>
                    <button class="myhouse-bulletin-action-btn myhouse-bulletin-action-btn--icon${likedCommentAnon ? ' myhouse-bulletin-action-btn--active' : ''}"
                            id="bulletinCommentSecretHeart-${escapeAttr(c.id)}"
                            onclick="toggleBulletinCommentAnonHeart('${escapeAttr(c.id)}')">
                        <img src="House/icon/${likedCommentAnon ? 'secret4' : 'secret3'}.svg" alt="こっそりいいね" class="myhouse-bulletin-action-icon"><span class="myhouse-bulletin-action-label">こっそりいいね</span>
                    </button>
                </div>
                <div id="bulletinCommentReplyForm-${escapeAttr(c.id)}" class="myhouse-bulletin-reply-form" style="display:none;">
                    <div id="bulletinReplyTo-${escapeAttr(c.id)}" class="myhouse-bulletin-reply-to" style="display:none;"></div>
                    <textarea class="myhouse-bulletin-reply-textarea" id="bulletinCommentText-${escapeAttr(c.id)}"
                        placeholder="返信を入力..." rows="2"
                        onkeydown="if(event.key==='Enter'&&event.ctrlKey){event.preventDefault();submitBulletinComment('${escapeAttr(post.id)}','${escapeAttr(c.id)}');}"
                        oninput="bulletinUpdateReplyCharCount('${escapeAttr(c.id)}')"></textarea>
                    <div class="myhouse-bulletin-reply-btns">
                        <span class="myhouse-bulletin-char-count" id="bulletinReplyCharCountWrap-${escapeAttr(c.id)}"><span id="bulletinReplyCharCount-${escapeAttr(c.id)}">0</span>/150</span>
                        <button class="myhouse-bulletin-comment-submit-btn" onclick="submitBulletinComment('${escapeAttr(post.id)}','${escapeAttr(c.id)}')">返信する</button>
                    </div>
                </div>
            </div>
        </div>`;
}

/* ─── コメント一覧のHTML（1段ネスト対応） ─── */
function buildBulletinReplyListHtml(post, isOwner) {
    const comments = post.comments || [];
    if (comments.length === 0) return '';

    const topLevel = comments.filter(c => !c.parentCommentId);
    return topLevel.map(c => {
        const replies = comments.filter(r => r.parentCommentId === c.id);
        const repliesHtml = replies.length > 0
            ? `<div class="myhouse-bulletin-nested-list">${replies.map(r => _buildCommentHtml(r, post, isOwner, true)).join('')}</div>`
            : '';
        return _buildCommentHtml(c, post, isOwner, false) + repliesHtml;
    }).join('');
}

/* ─── ページネーション ─── */
function buildBulletinPaginationHtml(totalPages) {
    const prev = bulletinCurrentPage > 1
        ? `<button class="myhouse-bulletin-page-btn myhouse-bulletin-page-arrow" onclick="bulletinGoToPage(${bulletinCurrentPage - 1})">&#8249;</button>`
        : `<button class="myhouse-bulletin-page-btn myhouse-bulletin-page-arrow" disabled>&#8249;</button>`;
    const next = bulletinCurrentPage < totalPages
        ? `<button class="myhouse-bulletin-page-btn myhouse-bulletin-page-arrow" onclick="bulletinGoToPage(${bulletinCurrentPage + 1})">&#8250;</button>`
        : `<button class="myhouse-bulletin-page-btn myhouse-bulletin-page-arrow" disabled>&#8250;</button>`;
    let pages = '';
    for (let i = 1; i <= totalPages; i++) {
        pages += `<button class="myhouse-bulletin-page-btn${i === bulletinCurrentPage ? ' active' : ''}" onclick="bulletinGoToPage(${i})">${i}</button>`;
    }
    return `<nav class="myhouse-bulletin-pagination">${prev}${pages}${next}</nav>`;
}

function bulletinGoToPage(page) {
    bulletinCurrentPage = page;
    renderBulletinContent(document.getElementById('myhouseRight'));
}

/* ─── エディタ操作 ─── */

function bulletinSaveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) _bulletinSavedRange = sel.getRangeAt(0).cloneRange();
}

function bulletinRestoreSelection() {
    const editor = document.getElementById('bulletinEditor');
    if (!editor) return;
    editor.focus();
    if (_bulletinSavedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(_bulletinSavedRange);
    }
}

function _bulletinCloneEditorHtml(editor) {
    const clone = editor.cloneNode(true);
    clone.removeAttribute('contenteditable');
    return clone.innerHTML.replace(/\u200B/g, '');
}

/* ─── 画像添付 ─── */
function bulletinTriggerImagePick() {
    const input = document.getElementById('bulletinImageInput');
    if (input) input.click();
}

async function bulletinHandleImagePick(input) {
    const file = input.files[0];
    if (!file) return;
    const dataUrl = await compressImage(file, 900, 0.82);
    _bulletinAttachedImage = dataUrl;
    _bulletinAttachedFileName = file.name;
    const thumb = document.getElementById('bulletinAttachThumb');
    const name = document.getElementById('bulletinAttachName');
    const area = document.getElementById('bulletinAttachment');
    if (thumb) thumb.src = dataUrl;
    if (name) name.textContent = file.name;
    if (area) area.style.display = 'flex';
    input.value = '';
}

function bulletinRemoveAttachment() {
    _bulletinAttachedImage = null;
    _bulletinAttachedFileName = '';
    const area = document.getElementById('bulletinAttachment');
    const thumb = document.getElementById('bulletinAttachThumb');
    const input = document.getElementById('bulletinImageInput');
    if (area) area.style.display = 'none';
    if (thumb) thumb.src = '';
    if (input) input.value = '';
}

/* ─── ペーストフィルター ─── */
function bulletinHandlePaste(e) {
    e.preventDefault();
    const clipHtml = e.clipboardData.getData('text/html');
    const clipText = e.clipboardData.getData('text/plain');
    const html = clipHtml
        ? _bulletinSanitizePaste(clipHtml)
        : escapeHtml(clipText).replace(/\n/g, '<br>');
    document.execCommand('insertHTML', false, html);
}

function _bulletinSanitizePaste(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return _bulletinCleanPasteNode(doc.body);
}

function _bulletinCleanPasteNode(node) {
    let result = '';
    for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
            result += escapeHtml(child.textContent);
            continue;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) continue;
        const tag = child.tagName.toLowerCase();
        const inner = _bulletinCleanPasteNode(child);
        if (tag === 'b' || tag === 'strong') {
            result += `<b>${inner}</b>`;
        } else if (tag === 'a') {
            const href = child.getAttribute('href') || '';
            const safeHref = /^https?:\/\//.test(href) ? escapeHtml(href) : '';
            result += safeHref ? `<a href="${safeHref}" target="_blank">${inner}</a>` : inner;
        } else if (tag === 'br') {
            result += '<br>';
        } else if (tag === 'hr') {
            // 区切り線は除去
        } else if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'].includes(tag)) {
            // ブロック要素は中身だけ取り出して末尾に改行
            if (inner) result += inner + '<br>';
        } else {
            result += inner;
        }
    }
    return result;
}

/* ─── リンク挿入 ─── */
function bulletinInsertLink() {
    bulletinSaveSelection();
    const sel = window.getSelection();
    const selectedText = (sel && !sel.isCollapsed) ? sel.toString() : '';
    const overlay = document.createElement('div');
    overlay.id = 'bulletinLinkOverlay';
    overlay.className = 'diary-link-overlay';
    overlay.innerHTML = `
        <div class="diary-link-box">
            <p class="diary-link-ttl">🔗 リンクを挿入</p>
            <div class="diary-link-field">
                <label class="diary-link-label">テキスト</label>
                <input class="diary-link-input" id="bulletinLinkText" type="text" placeholder="表示するテキスト"
                    value="${escapeHtml(selectedText)}"
                    onkeydown="if(event.key==='Enter'&&!event.isComposing){event.preventDefault();document.getElementById('bulletinLinkUrl').focus();}if(event.key==='Escape')closeBulletinLinkPopup();">
            </div>
            <div class="diary-link-field">
                <label class="diary-link-label">URL</label>
                <input class="diary-link-input" id="bulletinLinkUrl" type="url" placeholder="https://"
                    onkeydown="if(event.key==='Enter')event.preventDefault();if(event.key==='Escape')closeBulletinLinkPopup();">
            </div>
            <div class="diary-link-btns">
                <button class="diary-link-cancel-btn" onclick="closeBulletinLinkPopup()">キャンセル</button>
                <button class="diary-link-submit-btn" onclick="submitBulletinLink()">挿入する</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    setTimeout(() => {
        const input = document.getElementById(selectedText ? 'bulletinLinkUrl' : 'bulletinLinkText');
        if (input) input.focus();
    }, 30);
}

function closeBulletinLinkPopup() {
    const el = document.getElementById('bulletinLinkOverlay');
    if (el) el.remove();
}

function submitBulletinLink() {
    const urlInput  = document.getElementById('bulletinLinkUrl');
    const textInput = document.getElementById('bulletinLinkText');
    if (!urlInput) return;
    const url = urlInput.value.trim();
    if (!url || url === 'https://') { urlInput.focus(); return; }
    if (/^javascript:/i.test(url)) { urlInput.focus(); return; }
    const linkText = (textInput && textInput.value.trim()) || url;
    closeBulletinLinkPopup();
    bulletinRestoreSelection();
    document.execCommand('insertHTML', false,
        `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(linkText)}</a>`);
    _bulletinSavedRange = null;
}

/* ─── 返信文字数カウント ─── */
function bulletinUpdateReplyCharCount(commentId) {
    const ta = document.getElementById(`bulletinCommentText-${commentId}`);
    const countEl = document.getElementById(`bulletinReplyCharCount-${commentId}`);
    const wrapEl = document.getElementById(`bulletinReplyCharCountWrap-${commentId}`);
    if (!ta || !countEl) return;
    const count = ta.value.length;
    countEl.textContent = count;
    wrapEl?.classList.remove('near-limit', 'at-limit');
    if (count >= 150) wrapEl?.classList.add('at-limit');
    else if (count >= 120) wrapEl?.classList.add('near-limit');
}

/* ─── 文字数カウント ─── */
function bulletinUpdateCharCount() {
    const editor = document.getElementById('bulletinEditor');
    const countEl = document.getElementById('bulletinCharCount');
    const charCountEl = countEl?.closest('.myhouse-bulletin-char-count');
    if (!editor || !countEl) return;
    const count = editor.textContent.length;
    countEl.textContent = count;
    charCountEl?.classList.remove('near-limit', 'at-limit');
    if (count >= 300) charCountEl?.classList.add('at-limit');
    else if (count >= 250) charCountEl?.classList.add('near-limit');
}

/* ─── 投稿保存 ─── */
function submitBulletinPost() {
    ensureBulletinState();
    const editor = document.getElementById('bulletinEditor');
    if (!editor) return;
    const html  = _bulletinCloneEditorHtml(editor);
    const text  = editor.textContent.trim();
    if (!text && !_bulletinAttachedImage) { editor.focus(); return; }
    if (editor.textContent.length > 300) { editor.focus(); return; }

    const isOwner = isBulletinOwner();
    const allowComments = isOwner
        ? (document.getElementById('bulletinAllowComments')?.checked !== false)
        : true;
    const author   = getBulletinAuthorInfo();
    const bulletin = gameState.player.house.bulletin;

    const post = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        no: bulletin.nextNo,
        authorType: author.type,
        authorName: author.name,
        authorAvatar: author.avatar,
        authorAvatarBg: author.avatarBg,
        authorJob: author.job,
        html,
        text: editor.textContent.replace(/\s+/g, ' ').trim(),
        imageUrl: _bulletinAttachedImage || null,
        createdAt: Date.now(),
        allowComments,
        comments: [],
    };
    bulletin.posts.unshift(post);
    bulletin.nextNo++;
    editor.innerHTML = '';
    bulletinRemoveAttachment();
    if (isOwner) {
        const cb = document.getElementById('bulletinAllowComments');
        if (cb) cb.checked = true;
    }
    bulletinCurrentPage = 1;
    saveGame(true);
    renderBulletinContent(document.getElementById('myhouseRight'));
}

/* ─── コメント保存 ─── */
function submitBulletinComment(postId, replyToCommentId) {
    ensureBulletinState();
    const taId = replyToCommentId ? `bulletinCommentText-${replyToCommentId}` : `bulletinCommentText-${postId}`;
    const textarea = document.getElementById(taId);
    if (!textarea) return;
    const replyLabel = replyToCommentId ? document.getElementById(`bulletinReplyTo-${replyToCommentId}`) : null;
    const replyPrefix = replyLabel && replyLabel.style.display !== 'none' ? replyLabel.textContent + '\n' : '';
    const text = replyPrefix + textarea.value.trim();
    if (!textarea.value.trim()) { textarea.focus(); return; }
    if (textarea.value.length > 150) { textarea.focus(); return; }
    const post = gameState.player.house.bulletin.posts.find(p => p.id === postId);
    if (!post || !post.allowComments) return;

    const author = getBulletinAuthorInfo();
    // ネストは1段まで：返信先が既にネストされていればその親を使う
    let parentCommentId = replyToCommentId || null;
    if (parentCommentId) {
        const target = post.comments.find(c => c.id === parentCommentId);
        if (target && target.parentCommentId) parentCommentId = target.parentCommentId;
    }
    const comment = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        authorType: author.type,
        authorName: author.name,
        authorAvatar: author.avatar,
        authorAvatarBg: author.avatarBg,
        authorJob: author.job,
        text,
        createdAt: Date.now(),
        parentCommentId,
    };
    post.comments.push(comment);
    pushBulletinCommentNotif(post, comment);
    saveGame(true);
    textarea.value = '';

    // 入力フォームを閉じてアイコンをリセット
    document.querySelectorAll('.myhouse-bulletin-reply-form').forEach(f => f.style.display = 'none');
    document.querySelectorAll('[id^="bulletinCommentIcon-"], [id^="bulletinCommentReplyIcon-"]')
        .forEach(btn => {
            btn.querySelector('img').src = 'House/icon/Comment.svg';
            btn.classList.remove('myhouse-bulletin-action-btn--active');
        });

    // コメント一覧を更新・表示
    const replyList = document.getElementById(`bulletinReplyList-${postId}`);
    if (replyList) {
        replyList.innerHTML = buildBulletinReplyListHtml(post, isBulletinOwner());
        replyList.style.display = 'block';
    }
    // 「N件の返信」トグルを更新（なければ新規作成）
    const actions = replyList ? replyList.closest('.myhouse-bulletin-item')?.querySelector('.myhouse-bulletin-post-actions') : null;
    if (actions) {
        let toggle = document.getElementById(`bulletinReplyToggle-${postId}`);
        const count = post.comments.length;
        if (toggle) {
            toggle.textContent = count + '件の返信';
        } else {
            toggle = document.createElement('span');
            toggle.className = 'myhouse-bulletin-reply-toggle';
            toggle.id = `bulletinReplyToggle-${postId}`;
            toggle.setAttribute('onclick', `toggleBulletinReplies('${escapeAttr(postId)}')`);
            toggle.textContent = count + '件の返信';
            actions.appendChild(toggle);
        }
    }
}

/* ─── 入力フォームの開閉 ─── */
function toggleBulletinReplyForm(postId, replyToName, commentIconId, commentId) {
    const formId = commentId ? `bulletinCommentReplyForm-${commentId}` : `bulletinReplyForm-${postId}`;
    const form = document.getElementById(formId);
    if (!form) return;
    const activeIconBtn = commentIconId
        ? document.getElementById(commentIconId)
        : document.getElementById(`bulletinCommentIcon-${postId}`);
    const activeIcon = activeIconBtn ? activeIconBtn.querySelector('img') : null;

    if (form.style.display === 'none') {
        // 全フォームを閉じて全アイコンをリセット
        document.querySelectorAll('.myhouse-bulletin-reply-form').forEach(f => f.style.display = 'none');
        document.querySelectorAll('[id^="bulletinCommentIcon-"], [id^="bulletinCommentReplyIcon-"]')
            .forEach(btn => {
                btn.querySelector('img').src = 'House/icon/Comment.svg';
                btn.classList.remove('myhouse-bulletin-action-btn--active');
            });
        form.style.display = 'block';
        if (activeIcon) activeIcon.src = 'House/icon/Comment2.svg';
        if (activeIconBtn) activeIconBtn.classList.add('myhouse-bulletin-action-btn--active');
        const taId = commentId ? `bulletinCommentText-${commentId}` : `bulletinCommentText-${postId}`;
        const ta = document.getElementById(taId);
        if (ta) {
            ta.value = '';
            ta.focus();
        }
        if (replyToName && commentId) {
            const label = document.getElementById(`bulletinReplyTo-${commentId}`);
            if (label) { label.textContent = `>> ${replyToName}`; label.style.display = 'block'; }
        }
    } else {
        form.style.display = 'none';
        if (activeIcon) activeIcon.src = 'House/icon/Comment.svg';
        if (activeIconBtn) activeIconBtn.classList.remove('myhouse-bulletin-action-btn--active');
    }
}

/* ─── コメント一覧の開閉 ─── */
function toggleBulletinReplies(postId) {
    const list   = document.getElementById(`bulletinReplyList-${postId}`);
    const toggle = document.getElementById(`bulletinReplyToggle-${postId}`);
    if (!list) return;
    const post = (gameState.player.house.bulletin.posts || []).find(p => p.id === postId);
    const count = post ? (post.comments || []).length : 0;
    if (list.style.display === 'none') {
        list.style.display = 'block';
        if (toggle) { toggle.textContent = count + '件の返信'; toggle.classList.add('open'); }
    } else {
        list.style.display = 'none';
        if (toggle) { toggle.textContent = count + '件の返信'; toggle.classList.remove('open'); }
    }
}

/* ─── いいね ─── */
function toggleBulletinHeart(postId, kind) {
    ensureBulletinState();
    const key   = `${postId}:${kind}`;
    const liked = gameState.likedBulletins;
    const idx   = liked.indexOf(key);
    const btn  = document.getElementById(`bulletinHeart-${postId}-${kind}`);
    const img  = btn ? btn.querySelector('img') : null;
    if (idx >= 0) {
        liked.splice(idx, 1);
        if (img) img.src = kind === 'anonymous' ? 'House/icon/secret3.svg' : 'House/icon/like.svg';
        if (btn) btn.classList.remove('myhouse-bulletin-action-btn--active');
    } else {
        liked.push(key);
        if (img) img.src = kind === 'anonymous' ? 'House/icon/secret4.svg' : 'House/icon/like2.svg';
        if (btn) btn.classList.add('myhouse-bulletin-action-btn--active');
        const post = (gameState.player.house.bulletin.posts || []).find(p => p.id === postId);
        if (post && post.authorType !== 'owner') pushBulletinLikeNotif(post, kind);
    }
    saveGame(true);
}

/* ─── 削除確認モーダル ─── */
function _showBulletinDeleteConfirm(titleText, subText, onConfirm) {
    let overlay = document.getElementById('bulletinDeleteConfirmOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'bulletinDeleteConfirmOverlay';
        overlay.className = 'diary-post-overlay';
        overlay.addEventListener('mousedown', function(e) {
            if (e.target === overlay) closeBulletinDeleteConfirm();
        });
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div class="diary-post-modal diary-confirm-modal">
            <div class="win-titlebar-facility">
                <span class="win-titlebar-facility-title"></span>
                <div class="win-titlebar-btns">
                    <button class="win-titlebar-btn win-titlebar-facility-close" onclick="closeBulletinDeleteConfirm()">✕</button>
                </div>
            </div>
            <div class="diary-confirm-body">
                <p class="diary-confirm-text">${titleText}</p>
                <p class="diary-confirm-sub">${subText}</p>
                <div class="diary-confirm-btns">
                    <button class="diary-confirm-delete" id="bulletinDeleteConfirmBtn">削除する</button>
                    <button class="diary-confirm-cancel" onclick="closeBulletinDeleteConfirm()">キャンセル</button>
                </div>
            </div>
        </div>`;
    overlay.style.display = 'flex';
    document.getElementById('bulletinDeleteConfirmBtn').addEventListener('click', function() {
        closeBulletinDeleteConfirm();
        onConfirm();
    });
}

function closeBulletinDeleteConfirm() {
    const overlay = document.getElementById('bulletinDeleteConfirmOverlay');
    if (overlay) overlay.style.display = 'none';
}

function confirmDeleteBulletinPost(postId) {
    _showBulletinDeleteConfirm(
        'この投稿を削除しますか？',
        '削除した投稿は元に戻せません。',
        () => deleteBulletinPost(postId)
    );
}

function confirmDeleteBulletinComment(postId, commentId) {
    _showBulletinDeleteConfirm(
        'このコメントを削除しますか？',
        '削除したコメントは元に戻せません。',
        () => deleteBulletinComment(postId, commentId)
    );
}

/* ─── 削除 ─── */
function deleteBulletinPost(postId) {
    ensureBulletinState();
    const b = gameState.player.house.bulletin;
    const deletedPost = b.posts.find(p => p.id === postId);
    const commentIds = deletedPost ? (deletedPost.comments || []).map(c => c.id) : [];
    b.posts = b.posts.filter(p => p.id !== postId);
    gameState.likedBulletins = (gameState.likedBulletins || []).filter(k =>
        !k.startsWith(postId + ':') && !commentIds.some(cid => k.startsWith(cid + ':'))
    );
    bulletinCurrentPage = 1;
    saveGame(true);
    renderBulletinContent(document.getElementById('myhouseRight'));
}

function deleteBulletinComment(postId, commentId) {
    ensureBulletinState();
    const post = gameState.player.house.bulletin.posts.find(p => p.id === postId);
    if (!post) return;
    post.comments = post.comments.filter(c => c.id !== commentId);
    saveGame(true);
    const replyList = document.getElementById(`bulletinReplyList-${postId}`);
    if (replyList) replyList.innerHTML = buildBulletinReplyListHtml(post, isBulletinOwner());
    const toggle = document.getElementById(`bulletinReplyToggle-${postId}`);
    if (toggle) {
        const count = post.comments.length;
        if (count > 0) {
            toggle.textContent = count + '件の返信';
        } else {
            toggle.remove();
        }
    }
}

/* ─── コメントいいね ─── */
function toggleBulletinCommentHeart(commentId) {
    ensureBulletinState();
    const key  = `${commentId}:like`;
    const liked = gameState.likedBulletins;
    const idx  = liked.indexOf(key);
    const btn  = document.getElementById(`bulletinCommentHeart-${commentId}`);
    const img  = btn ? btn.querySelector('img') : null;
    if (idx >= 0) {
        liked.splice(idx, 1);
        if (img) img.src = 'House/icon/like.svg';
        if (btn) btn.classList.remove('myhouse-bulletin-action-btn--active');
    } else {
        liked.push(key);
        if (img) img.src = 'House/icon/like2.svg';
        if (btn) btn.classList.add('myhouse-bulletin-action-btn--active');
    }
    saveGame(true);
}

/* ─── コメントこっそりいいね ─── */
function toggleBulletinCommentAnonHeart(commentId) {
    ensureBulletinState();
    const key  = `${commentId}:anonymous`;
    const liked = gameState.likedBulletins;
    const idx  = liked.indexOf(key);
    const btn  = document.getElementById(`bulletinCommentSecretHeart-${commentId}`);
    const img  = btn ? btn.querySelector('img') : null;
    if (idx >= 0) {
        liked.splice(idx, 1);
        if (img) img.src = 'House/icon/secret3.svg';
        if (btn) btn.classList.remove('myhouse-bulletin-action-btn--active');
    } else {
        liked.push(key);
        if (img) img.src = 'House/icon/secret4.svg';
        if (btn) btn.classList.add('myhouse-bulletin-action-btn--active');
    }
    saveGame(true);
}

/* ─── 通知 ─── */
function pushBulletinLikeNotif(post, kind) {
    if (!gameState.notifications) gameState.notifications = [];
    const author = getBulletinAuthorInfo();
    gameState.notifications.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        type: 'like',
        fromName:    kind === 'anonymous' ? '匿名さん'  : author.name,
        fromAvatar:  kind === 'anonymous' ? '👤'        : author.avatar,
        fromAvatarBg: kind === 'anonymous' ? '#cccccc'  : author.avatarBg,
        postSnippet: post.text ? post.text.slice(0, 30) : '',
        date: Date.now(),
        read: false,
    });
    if (typeof updateNotifBadge === 'function') updateNotifBadge();
}

function pushBulletinCommentNotif(post, comment) {
    if (!gameState.notifications) gameState.notifications = [];
    if (post.authorType === 'owner') return; // 自分の投稿には通知しない
    gameState.notifications.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        type: 'comment',
        fromName:    comment.authorName,
        fromAvatar:  comment.authorAvatar,
        fromAvatarBg: comment.authorAvatarBg,
        postSnippet: post.text ? post.text.slice(0, 30) : '',
        commentText: comment.text.slice(0, 40),
        date: Date.now(),
        read: false,
    });
    if (typeof updateNotifBadge === 'function') updateNotifBadge();
}
