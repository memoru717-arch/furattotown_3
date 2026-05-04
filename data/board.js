// ============================================
// ふらっとタウン - 掲示板・つぶやき機能
// ============================================
// ============================================
// 掲示板機能
// ============================================

// 現在の返信先を記録する変数
let currentReplyTarget = null;
let selectedCategory = null;
let currentPostId = null;
let bookmarkedPosts = new Set();

// サンプルデータ（後でgameState.boardPostsを使う）
const sampleBoardPosts = [
    { id: 1, authorName: 'のん', date: '2026/02/04', title: 'おすすめの稼ぎ方ってありますか？', categories: ['お金', '仕事', 'ゲーム'] },
    { id: 2, authorName: 'たろう', date: '2026/02/03', title: '銀行の利息っていつ入りますか？', categories: ['お金'] },
    { id: 3, authorName: 'はなこ', date: '2026/02/02', title: '体力の回復方法を教えてください！', categories: ['健康・美容', 'ゲーム'] },
    { id: 4, authorName: 'ゆうき', date: '2026/02/01', title: 'レベル上げのコツを知りたいです', categories: ['ゲーム', '趣味'] },
    { id: 5, authorName: 'みさき', date: '2026/01/31', title: '友達の作り方がわかりません...', categories: ['人間関係', '暮らし'] },
];

// 回答データ（postIdごとに管理）
const sampleAnswers = {
    1: [
        { id: 1, authorName: 'たろう', authorAvatar: '😄', date: '2026/2/4 18:15', text: 'おすすめは仕事をたくさんすることです！\nあとは銀行に預けておくと利息がつきますよ！' },
        { id: 2, authorName: 'はなこ', authorAvatar: '🌸', date: '2026/2/4 19:30', text: '私はコンビニでアイテムを買って転売してます！\n意外と儲かりますよ〜' },
        { id: 3, authorName: 'ゆうき', authorAvatar: '🎮', date: '2026/2/4 20:45', text: '稼ぎ方についてはいくつかおすすめがあります！\n\nまず、序盤は「ハローワーク」でお仕事を見つけるのが一番です。仕事によって給料が違うので、体力と相談しながら選んでくださいね。\n\n次に、銀行預金もおすすめです。利息が毎日つくので、使わないお金は預けておきましょう！\n\nあとは、イベントにも積極的に参加するといいですよ。報酬がもらえることがあります！\n\n長くなりましたが、参考になれば嬉しいです！' },
    ]
};

function openBoardLobby() {
    document.getElementById('boardLobbyModal').classList.add('active');

    // 時間帯別背景画像
    const hour = new Date().getHours();
    let bgImg = 'haikei/board.png';
    if (hour >= 5 && hour < 15) bgImg = 'haikei/board.png';
    else if (hour >= 15 && hour < 18) bgImg = 'haikei/board2.png';
    else bgImg = 'haikei/board3.png';
    const imgEl = document.getElementById('boardLobbyImg');
    if (imgEl) imgEl.src = bgImg;
}

function closeBoardLobby() {
    document.getElementById('boardLobbyModal').classList.remove('active');
}

function openBoard(boardType) {
    if (boardType === 'oekaki') {
        openOekakiBoard();
        return;
    }
    if (boardType !== 'question') {
        showToast('この掲示板は準備中です。');
        return;
    }
    const modal = document.getElementById('boardModal');
    currentReplyTarget = null;
    selectedCategory = null;
    renderBoardPostList();
    modal.classList.add('active');
}

function closeBoard() {
    document.getElementById('boardModal').classList.remove('active');
    currentReplyTarget = null;
    selectedCategory = null;

    // 投稿フォームをリセット
    document.getElementById('newPostTitle').value = '';
    document.getElementById('newPostBody').value = '';
    document.getElementById('newPostCategory1').value = '';
    document.getElementById('newPostCategory2').value = '';
    document.getElementById('newPostCategory3').value = '';
    document.getElementById('bodyCharCount').textContent = '0';

    // 画面をメインビューに戻す
    document.getElementById('boardNewPostView').style.display = 'none';
    document.getElementById('boardConfirmView').style.display = 'none';
    document.getElementById('boardDetailView').style.display = 'none';
    document.getElementById('boardHeader').style.display = 'block';
    document.getElementById('boardMainView').style.display = 'flex';
}

function openNewPostForm() {
    // メインビューを非表示、新規投稿フォームを表示
    document.getElementById('boardMainView').style.display = 'none';
    document.getElementById('boardNewPostView').style.display = 'flex';

    // カテゴリ選択肢を生成
    const categories = ['趣味', '暮らし', '健康・美容', '仕事', '人間関係', '恋愛', 'ゲーム', 'ファッション', 'グルメ', 'トレンド', '子育て', '家電・ガジェット', '学問', 'お金', 'スポーツ', '乗り物・旅行', '雑談', 'その他'];

    const selects = ['newPostCategory1', 'newPostCategory2', 'newPostCategory3'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        // 既に選択肢があれば再生成しない（戻るボタンで戻ってきた場合）
        if (select.options.length <= 1) {
            select.innerHTML = '<option value="">選択してください</option>';
            categories.forEach(cat => {
                select.innerHTML += `<option value="${cat}">${cat}</option>`;
            });
        }
    });
}

function closeNewPostForm() {
    // 新規投稿フォームを非表示、メインビューを表示
    document.getElementById('boardNewPostView').style.display = 'none';
    document.getElementById('boardMainView').style.display = 'flex';
}

function updateBodyCharCount() {
    const body = document.getElementById('newPostBody');
    const count = document.getElementById('bodyCharCount');
    count.textContent = body.value.length;
}

function showPostConfirm() {
    // 入力値を取得
    const title = document.getElementById('newPostTitle').value.trim();
    const category1 = document.getElementById('newPostCategory1').value;
    const category2 = document.getElementById('newPostCategory2').value;
    const category3 = document.getElementById('newPostCategory3').value;
    const body = document.getElementById('newPostBody').value.trim();

    // バリデーション
    if (!title) {
        alert('タイトルを入力してください');
        return;
    }
    if (!category1) {
        alert('カテゴリを1つ以上選択してください');
        return;
    }
    if (!body) {
        alert('本文を入力してください');
        return;
    }

    // カテゴリをまとめる
    const categories = [category1, category2, category3].filter(c => c);

    // 確認画面に値を反映
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmCategories').textContent = categories.join(' , ');
    document.getElementById('confirmBody').textContent = body;

    // 新規投稿フォームを非表示、確認画面を表示
    document.getElementById('boardNewPostView').style.display = 'none';
    document.getElementById('boardHeader').style.display = 'none';
    document.getElementById('boardConfirmView').style.display = 'flex';
}

function backToEditForm() {
    // 確認画面を非表示、新規投稿フォームを表示
    document.getElementById('boardConfirmView').style.display = 'none';
    document.getElementById('boardHeader').style.display = 'block';
    document.getElementById('boardNewPostView').style.display = 'flex';
}

function submitPost() {
    try {
    // 入力値を取得
    const title = document.getElementById('newPostTitle').value.trim();
    const category1 = document.getElementById('newPostCategory1').value;
    const category2 = document.getElementById('newPostCategory2').value;
    const category3 = document.getElementById('newPostCategory3').value;
    const body = document.getElementById('newPostBody').value.trim();
    const categories = [category1, category2, category3].filter(c => c);

    // 日付を生成
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

    // 新しい投稿を作成
    const playerName = (gameState && gameState.player && gameState.player.name) ? gameState.player.name : 'ゲスト';
    const newPost = {
        id: Date.now(),
        authorName: playerName,
        date: dateStr,
        title: title,
        categories: categories,
        body: body
    };

    // 投稿リストの先頭に追加
    sampleBoardPosts.unshift(newPost);

    // 確認画面を非表示、メインビューを表示
    document.getElementById('boardConfirmView').style.display = 'none';
    document.getElementById('boardHeader').style.display = 'block';
    document.getElementById('boardMainView').style.display = 'flex';

    // フォームをリセット
    document.getElementById('newPostTitle').value = '';
    document.getElementById('newPostCategory1').value = '';
    document.getElementById('newPostCategory2').value = '';
    document.getElementById('newPostCategory3').value = '';
    document.getElementById('newPostBody').value = '';

    // 投稿一覧を再描画
    renderBoardPostList();

    // 投稿完了のフィードバック
    showPostToast();
    } catch (e) {
        alert('エラー: ' + e.message);
    }
}

function showPostToast() {
    const existingToast = document.querySelector('.post-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'post-toast';
    toast.textContent = '投稿しました！';

    document.querySelector('.board-modal-content').appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 1500);
}

// 投稿一覧を描画（左下ブロック）
function renderBoardPostList() {
    const container = document.getElementById('boardPostList');

    // カテゴリで絞り込み
    let posts = sampleBoardPosts;
    if (selectedCategory) {
        posts = sampleBoardPosts.filter(post => post.categories.includes(selectedCategory));
    }

    if (posts.length === 0) {
        container.innerHTML = '<div class="board-post-list-empty">該当する投稿がありません</div>';
        return;
    }

    let html = '';
    posts.forEach(post => {
        const categoriesText = post.categories.join(' ,  ');
        html += `
            <div class="board-post-item" onclick="selectPost(${post.id})">
                <div class="board-post-item-header">
                    <span class="board-post-item-author">${post.authorName} さん</span>
                    <span class="board-post-item-separator">|</span>
                    <span class="board-post-item-categories">${categoriesText}</span>
                    <span class="board-post-item-date">${post.date}</span>
                </div>
                <div class="board-post-item-title">${post.title}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function selectPost(postId) {
    // 投稿データを取得
    const post = sampleBoardPosts.find(p => p.id === postId);
    if (!post) return;

    currentPostId = postId;

    // 詳細画面にデータを反映
    document.getElementById('detailAuthorName').textContent = post.authorName;
    document.getElementById('detailDate').textContent = post.date + ' 17:39';
    document.getElementById('detailCategories').textContent = post.categories.join(' , ');
    document.getElementById('detailTitle').textContent = post.title;
    document.getElementById('detailBody').textContent = post.body || 'ここに本文が入ります。サンプルテキストです。\n\nみなさんのご回答お待ちしております！';

    // ブックマーク状態を反映
    const bookmarkImg = document.getElementById('detailBookmark');
    if (bookmarkedPosts.has(postId)) {
        bookmarkImg.src = 'status/Bookmark_B.png';
    } else {
        bookmarkImg.src = 'status/Bookmark_A.png';
    }

    // メインビューを非表示、詳細ビューを表示
    document.getElementById('boardMainView').style.display = 'none';
    document.getElementById('boardHeader').style.display = 'none';
    document.getElementById('boardDetailView').style.display = 'flex';

    // 回答フォームを閉じる
    document.getElementById('boardAnswerForm').style.display = 'none';

    // 回答一覧を描画
    renderAnswers(postId);
}

function closeDetailView() {
    // 詳細ビューを非表示、メインビューを表示
    document.getElementById('boardDetailView').style.display = 'none';
    document.getElementById('boardHeader').style.display = 'block';
    document.getElementById('boardMainView').style.display = 'flex';
}

function toggleBookmark() {
    if (!currentPostId) return;

    const bookmarkImg = document.getElementById('detailBookmark');

    if (bookmarkedPosts.has(currentPostId)) {
        // ブックマーク解除
        bookmarkedPosts.delete(currentPostId);
        bookmarkImg.src = 'status/Bookmark_A.png';
    } else {
        // ブックマーク追加
        bookmarkedPosts.add(currentPostId);
        bookmarkImg.src = 'status/Bookmark_B.png';
        showBookmarkToast();
    }
}

function showBookmarkToast() {
    // 既存のトーストがあれば削除
    const existingToast = document.querySelector('.bookmark-toast');
    if (existingToast) existingToast.remove();

    // トースト要素を作成
    const toast = document.createElement('div');
    toast.className = 'bookmark-toast';
    toast.textContent = 'ブックマークしました！';

    // ブックマークアイコンの近くに配置
    const bookmarkImg = document.getElementById('detailBookmark');
    bookmarkImg.parentElement.appendChild(toast);

    // アニメーション後に削除
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 1000);
}

function toggleAnswerForm() {
    const form = document.getElementById('boardAnswerForm');
    if (form.style.display === 'none') {
        form.style.display = 'block';
        document.getElementById('answerText').value = '';
        document.getElementById('answerText').focus();
    } else {
        form.style.display = 'none';
    }
}

function submitAnswer() {
    const answerText = document.getElementById('answerText').value.trim();
    if (!answerText) return;
    if (!currentPostId) return;

    // 現在の日時を取得
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 回答データを作成
    const newAnswer = {
        id: Date.now(),
        authorName: gameState.player.name,
        authorAvatar: gameState.player.avatar,
        date: dateStr,
        text: answerText
    };

    // 回答リストに追加（なければ作成）
    if (!sampleAnswers[currentPostId]) {
        sampleAnswers[currentPostId] = [];
    }
    // 先頭に追加（新しいものが上）
    sampleAnswers[currentPostId].unshift(newAnswer);

    // フォームを閉じて再描画
    document.getElementById('boardAnswerForm').style.display = 'none';
    document.getElementById('answerText').value = '';
    renderAnswers(currentPostId);
}

function renderAnswers(postId) {
    const container = document.getElementById('boardAnswersSection');
    const answers = sampleAnswers[postId] || [];

    if (answers.length === 0) {
        container.innerHTML = `
            <h4 class="board-answers-title">回答</h4>
            <div class="board-answers-divider"></div>
            <p style="color: rgba(255,255,255,0.7); text-align: center;">まだ回答がありません</p>
        `;
        return;
    }

    let html = `<h4 class="board-answers-title">回答</h4>`;
    html += `<div class="board-answers-divider"></div>`;

    answers.forEach((answer, index) => {
        // アバターが画像パスかどうかで表示を切り替え
        const avatarHtml = answer.authorAvatar.includes('/')
            ? `<img src="${answer.authorAvatar}" alt="アバター" class="board-answer-avatar-img">`
            : answer.authorAvatar;

        // 返信の表示（折りたたみ式）
        let repliesHtml = '';
        if (answer.replies && answer.replies.length > 0) {
            const count = answer.replies.length;
            let replyItems = '';
            answer.replies.forEach((reply, index) => {
                const replyAvatar = reply.authorAvatar || '😊';
                const replyAvatarHtml = replyAvatar.includes('/')
                    ? `<img src="${replyAvatar}" alt="アバター" class="board-reply-avatar-img">`
                    : replyAvatar;
                replyItems += `
                    <div class="board-reply-item">
                        <div class="board-reply-author-row">
                            <div class="board-reply-avatar">${replyAvatarHtml}</div>
                            <div class="board-reply-author-info">
                                <div class="board-reply-author-name">${reply.authorName}</div>
                                <div class="board-reply-date">${reply.date}</div>
                            </div>
                        </div>
                        <div class="board-reply-text">${reply.replyTo ? `<span class="board-reply-to">&gt;&gt;${reply.replyTo}</span><br>` : ''}${reply.text.replace(/\n/g, '<br>')}</div>
                        <div class="board-answer-actions">
                            <img src="status/Comment.png" alt="返信" class="board-action-icon board-comment-icon" onclick="toggleReplyForm(${answer.id}, '${reply.authorName.replace(/'/g, "\\'")}')">
                            <img src="status/${gameState.likedAnswers.includes('reply-' + answer.id + '-' + index) ? 'Heart2' : 'Heart'}.png" alt="いいね" class="board-action-icon board-heart-icon" id="heartIcon-reply-${answer.id}-${index}" onclick="toggleHeart('reply-${answer.id}-${index}')">
                        </div>
                    </div>
                `;
            });
            repliesHtml = `
                <div class="board-reply-list" id="replyList-${answer.id}" style="display: none;">
                    ${replyItems}
                </div>
            `;
        }

        html += `
            <div class="board-answer-item">
                <div class="board-answer-author-row">
                    <div class="board-answer-avatar">${avatarHtml}</div>
                    <div class="board-answer-author-info">
                        <div class="board-answer-author-name">${answer.authorName}</div>
                        <div class="board-answer-date">${answer.date}</div>
                    </div>
                </div>
                <div class="board-answer-text truncated" id="answerText-${answer.id}">${answer.text.replace(/\n/g, '<br>')}</div>
                <div class="board-read-more" id="readMore-${answer.id}" style="display: none;" onclick="toggleReadMore(${answer.id})">もっと読む ▼</div>
                <div class="board-answer-actions">
                    <img src="status/Comment.png" alt="返信" class="board-action-icon board-comment-icon" onclick="toggleReplyForm(${answer.id})">
                    <img src="status/${gameState.likedAnswers.includes('answer-' + answer.id) ? 'Heart2' : 'Heart'}.png" alt="いいね" class="board-action-icon board-heart-icon" id="heartIcon-answer-${answer.id}" onclick="toggleHeart('answer-${answer.id}')">
                    ${answer.replies && answer.replies.length > 0 ? `<span class="board-reply-toggle" id="replyToggle-${answer.id}" onclick="toggleReplies(${answer.id})">${answer.replies.length}件の返信</span>` : ''}
                </div>
                ${repliesHtml}
                <div class="board-reply-form" id="replyForm-${answer.id}" style="display: none;">
                    <textarea class="board-reply-textarea" id="replyText-${answer.id}" placeholder="返信を入力..." maxlength="500"></textarea>
                    <div class="board-reply-buttons">
                        <button class="btn board-btn-reply-submit" onclick="submitBoardReply(${answer.id})">返信する</button>
                    </div>
                </div>
            </div>
        `;
        // 最後以外は区切り線を追加
        if (index < answers.length - 1) {
            html += `<div class="board-answers-divider"></div>`;
        }
    });

    container.innerHTML = html;

    // 4行を超えるテキストに「もっと読む」を表示
    answers.forEach(answer => {
        const textEl = document.getElementById(`answerText-${answer.id}`);
        const readMoreEl = document.getElementById(`readMore-${answer.id}`);
        if (textEl && readMoreEl) {
            // scrollHeightがclientHeightより大きければ切り詰められている
            if (textEl.scrollHeight > textEl.clientHeight) {
                readMoreEl.style.display = 'block';
            }
        }
    });
}

function toggleReadMore(answerId) {
    const textEl = document.getElementById(`answerText-${answerId}`);
    const readMoreEl = document.getElementById(`readMore-${answerId}`);
    if (!textEl || !readMoreEl) return;

    if (textEl.classList.contains('truncated')) {
        textEl.classList.remove('truncated');
        textEl.classList.add('expanded');
        readMoreEl.textContent = '閉じる ▲';
    } else {
        textEl.classList.remove('expanded');
        textEl.classList.add('truncated');
        readMoreEl.textContent = 'もっと読む ▼';
    }
}

function toggleReplies(answerId) {
    const list = document.getElementById(`replyList-${answerId}`);
    const toggle = document.getElementById(`replyToggle-${answerId}`);
    if (!list || !toggle) return;
    if (list.style.display === 'none') {
        list.style.display = 'block';
        toggle.classList.add('open');
    } else {
        list.style.display = 'none';
        toggle.classList.remove('open');
    }
}

function toggleHeart(answerId) {
    const icon = document.getElementById(`heartIcon-${answerId}`);
    if (!icon) return;
    const liked = gameState.likedAnswers;
    const idx = liked.indexOf(answerId);
    if (idx >= 0) {
        liked.splice(idx, 1);
        icon.src = 'status/Heart.png';
    } else {
        liked.push(answerId);
        icon.src = 'status/Heart2.png';
    }
}

function toggleReplyForm(answerId, replyToName) {
    const form = document.getElementById(`replyForm-${answerId}`);
    if (!form) return;

    if (form.style.display === 'none') {
        // 他の返信フォームを閉じる
        document.querySelectorAll('.board-reply-form').forEach(f => {
            f.style.display = 'none';
        });
        // 返信先の名前を記録
        currentReplyTarget = replyToName || null;
        form.style.display = 'block';
        document.getElementById(`replyText-${answerId}`).value = '';
        document.getElementById(`replyText-${answerId}`).focus();
    } else {
        form.style.display = 'none';
        currentReplyTarget = null;
    }
}

function submitBoardReply(answerId) {
    const textArea = document.getElementById(`replyText-${answerId}`);
    if (!textArea) return;

    const replyText = textArea.value.trim();
    if (!replyText) return;
    if (!currentPostId) return;

    // 対象の回答を探す
    const answers = sampleAnswers[currentPostId];
    if (!answers) return;
    const answer = answers.find(a => a.id === answerId);
    if (!answer) return;

    // 現在の日時を取得
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 返信データを作成
    const newReply = {
        id: Date.now(),
        authorName: gameState.player.name || 'ゲスト',
        authorAvatar: gameState.player.avatar || '😊',
        date: dateStr,
        text: replyText,
        replyTo: currentReplyTarget || answer.authorName
    };
    currentReplyTarget = null;

    // 返信リストに追加（なければ作成）
    if (!answer.replies) {
        answer.replies = [];
    }
    answer.replies.push(newReply);

    // 再描画して返信一覧だけ開いた状態にする
    renderAnswers(currentPostId);
    const replyList = document.getElementById(`replyList-${answerId}`);
    if (replyList) replyList.style.display = 'block';
}

function selectCategory(category) {
    selectedCategory = category;
    renderBoardPostList();
}

function formatBoardDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hour}:${min}`;
}

function renderBoardPosts() {
    const container = document.getElementById('boardPosts');
    const posts = gameState.boardPosts;

    if (posts.length === 0) {
        container.innerHTML = '<div class="board-empty">まだ投稿がありません。最初の投稿をしてみましょう！</div>';
        return;
    }

    let html = '';
    // 新しい順に表示
    const sortedPosts = [...posts].reverse();

    sortedPosts.forEach(post => {
        html += `
            <div class="board-post">
                <div class="board-post-header">
                    <span class="board-post-no">No.${post.id}</span>
                    <span class="board-post-author">${post.authorAvatar} ${post.authorName}</span>
                    <span class="board-post-date">${formatBoardDate(post.date)}</span>
                </div>
                <div class="board-post-content">${escapeHtml(post.content)}</div>
                <div class="board-post-actions">
                    <button class="btn-reply" onclick="showReplyForm(${post.id}, null, '${escapeAttr(post.authorName)}')">💬 返信</button>
                </div>
                <div class="board-reply-form" id="replyForm-${post.id}" style="display:none;">
                    <div class="reply-target-info" id="replyTargetInfo-${post.id}"></div>
                    <textarea class="board-reply-input" id="replyInput-${post.id}" placeholder="返信を入力..." maxlength="200"></textarea>
                    <div class="board-reply-buttons">
                        <button class="btn btn-success btn-small" onclick="submitReply(${post.id})">送信</button>
                        <button class="btn btn-close btn-small" onclick="hideReplyForm(${post.id})">キャンセル</button>
                    </div>
                </div>
                ${renderReplies(post.replies, post.id)}
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderReplies(replies, postId) {
    if (!replies || replies.length === 0) return '';

    let html = '<div class="board-replies">';
    replies.forEach((reply, index) => {
        const replyNo = `${postId}-${index + 1}`;
        // 返信先の表示
        let replyToHtml = '';
        if (reply.replyTo) {
            replyToHtml = `<span class="reply-to-anchor">&gt;&gt;${reply.replyTo.no} (${reply.replyTo.name}さんへ)</span>`;
        }

        html += `
            <div class="board-reply" id="reply-${replyNo}">
                <div class="board-reply-header">
                    <span class="board-reply-no">No.${replyNo}</span>
                    <span class="board-post-author">${reply.authorAvatar} ${reply.authorName}</span>
                    <span class="board-post-date">${formatBoardDate(reply.date)}</span>
                </div>
                ${replyToHtml}
                <div class="board-reply-content">${escapeHtml(reply.content)}</div>
                <div class="board-reply-actions">
                    <button class="btn-reply-small" onclick="showReplyForm(${postId}, ${index + 1}, '${escapeAttr(reply.authorName)}')">↩️ 返信</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    return text.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

function submitPostOld() {
    const input = document.getElementById('boardNewPost');
    const content = input.value.trim();

    if (!content) {
        return;
    }

    if (content.length > 300) {
        return;
    }

    const post = {
        id: gameState.boardNextId++,
        authorName: gameState.player.name,
        authorAvatar: gameState.player.avatar,
        content: content,
        date: new Date().toISOString(),
        replies: []
    };

    gameState.boardPosts.push(post);
    input.value = '';
    renderBoardPosts();
}

function showReplyForm(postId, replyIndex, targetName) {
    // 他の返信フォームを閉じる
    document.querySelectorAll('.board-reply-form').forEach(form => {
        form.style.display = 'none';
    });

    const form = document.getElementById(`replyForm-${postId}`);
    const targetInfo = document.getElementById(`replyTargetInfo-${postId}`);
    const input = document.getElementById(`replyInput-${postId}`);

    // 返信先を設定
    if (replyIndex === null) {
        // 元の投稿への返信
        currentReplyTarget = {
            postId: postId,
            replyIndex: null,
            no: `${postId}`,
            name: targetName
        };
        targetInfo.innerHTML = `<span class="reply-target-badge">📝 No.${postId} ${targetName}さんへ返信</span>`;
    } else {
        // 返信への返信
        currentReplyTarget = {
            postId: postId,
            replyIndex: replyIndex,
            no: `${postId}-${replyIndex}`,
            name: targetName
        };
        targetInfo.innerHTML = `<span class="reply-target-badge">↩️ No.${postId}-${replyIndex} ${targetName}さんへ返信</span>`;
    }

    form.style.display = 'block';
    input.value = '';
    input.focus();
}

function hideReplyForm(postId) {
    document.getElementById(`replyForm-${postId}`).style.display = 'none';
    document.getElementById(`replyInput-${postId}`).value = '';
    currentReplyTarget = null;
}

function submitReply(postId) {
    const input = document.getElementById(`replyInput-${postId}`);
    const content = input.value.trim();

    if (!content) {
        return;
    }

    if (content.length > 200) {
        return;
    }

    const post = gameState.boardPosts.find(p => p.id === postId);
    if (!post) return;

    const reply = {
        authorName: gameState.player.name,
        authorAvatar: gameState.player.avatar,
        content: content,
        date: new Date().toISOString(),
        replyTo: currentReplyTarget ? {
            no: currentReplyTarget.no,
            name: currentReplyTarget.name
        } : null
    };

    post.replies.push(reply);
    currentReplyTarget = null;
    renderBoardPosts();
}

// ============================================
// つぶやき機能
// ============================================
let tweetCooldownInterval = null;
let isChallengeReply = false; // チャレンジ経由フラグ

function openTweetModal(challengeTopic = null) {
    document.getElementById('tweetModal').classList.add('active');

    // プレイヤー情報を更新
    document.getElementById('tweetComposeAvatar').innerHTML = `<img src="${gameState.player.avatar}" alt="アバター" class="tweet-avatar-img">`;
    document.getElementById('tweetComposeAvatar').style.backgroundColor = gameState.player.avatarBgColor;
    document.getElementById('tweetComposeName').textContent = gameState.player.name;

    // タグエリア・入力欄・フラグをリセット
    resetTweetTag();
    document.getElementById('tweetInput').value = '';
    updateTweetCharCount();

    // チャレンジ経由で開かれた場合は自動でハッシュタグを挿入
    if (challengeTopic) {
        insertChallengeHashtag();
    }

    // 報酬結果ビューを隠して入力欄を表示
    document.getElementById('tweetComposeContent').style.display = '';
    document.getElementById('challengeRewardView').style.display = 'none';

    // クールダウンチェック
    checkTweetCooldown();

    // 文字数カウントイベント
    document.getElementById('tweetInput').oninput = updateTweetCharCount;
}

// タグエリアに表示中のハッシュタグ文字列を返す（先頭スペース付き・末尾に付ける用）
function getActiveTag() {
    const chip = document.getElementById('tweetTagChip');
    return chip && chip.textContent ? '\n' + chip.textContent : '';
}

// タグエリアをリセット
function resetTweetTag() {
    document.getElementById('tweetTagArea').style.display = 'none';
    document.getElementById('tweetTagChip').textContent = '';
    const challengeCard = document.getElementById('tweetChallengeCard');
    if (challengeCard) challengeCard.classList.remove('used');
    isChallengeReply = false;
    updateTweetMaxLength();
}

// textareaのmaxlengthをタグの有無に応じて調整
function updateTweetMaxLength() {
    document.getElementById('tweetInput').maxLength = 60;
}

// チャレンジピルを押したときにタグエリアへ追加
function insertChallengeHashtag() {
    if (document.getElementById('tweetTagChip').textContent) return; // 既にある
    const topic = getTodaysTopic();
    document.getElementById('tweetTagChip').textContent = topic;
    document.getElementById('tweetTagArea').style.display = 'flex';
    const challengeCard = document.getElementById('tweetChallengeCard');
    if (challengeCard) challengeCard.classList.add('used');
    isChallengeReply = true;
    updateTweetMaxLength();
    updateTweetCharCount();
    document.getElementById('tweetInput').focus();
}

// タグを削除する×ボタン
function removeChallengeTag() {
    resetTweetTag();
    updateTweetCharCount();
    document.getElementById('tweetInput').focus();
}

function formatTweetContent(content) {
    const escaped = escapeHtml(content);
    return escaped
        .replace(/\n/g, '<br>')  // 改行を表示
        .replace(/#([^\s#]+)/g, '<span class="tweet-hashtag">#$1</span>');
}

function closeTweetModal() {
    document.getElementById('tweetModal').classList.remove('active');
    document.getElementById('tweetComposeContent').style.display = '';
    document.getElementById('challengeRewardView').style.display = 'none';
    isChallengeReply = false;
    if (tweetCooldownInterval) {
        clearInterval(tweetCooldownInterval);
        tweetCooldownInterval = null;
    }
    renderPinnedChallenge();
}

function closeChallengeReward() {
    closeTweetModal();
}

function updateTweetCharCount() {
    const input = document.getElementById('tweetInput');
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
    const count = input.value.length;
    const countEl = document.getElementById('tweetCharCount');
    countEl.textContent = count;
    countEl.style.color = count > 60 ? '#cc0000' : '';

    const countContainer = countEl.parentElement;
    countContainer.classList.remove('near-limit', 'at-limit');
    if (count >= 60) {
        countContainer.classList.add('at-limit');
    } else if (count >= 50) {
        countContainer.classList.add('near-limit');
    }
}

function checkTweetCooldown() {
    const btn = document.getElementById('tweetSubmitBtn');
    const msg = document.getElementById('tweetCooldownMsg');
    const timeEl = document.getElementById('tweetCooldownTime');

    if (!gameState.lastTweetTime) {
        btn.disabled = false;
        msg.style.display = 'none';
        return;
    }

    const now = new Date().getTime();
    const lastTweet = new Date(gameState.lastTweetTime).getTime();
    const cooldownMs = 3 * 60 * 1000; // 3分
    const remaining = cooldownMs - (now - lastTweet);

    if (remaining <= 0) {
        btn.disabled = false;
        msg.style.display = 'none';
        if (tweetCooldownInterval) {
            clearInterval(tweetCooldownInterval);
            tweetCooldownInterval = null;
        }
        return;
    }

    btn.disabled = true;
    msg.style.display = 'block';

    // 残り時間を更新
    const updateRemaining = () => {
        const nowUpdate = new Date().getTime();
        const remainingUpdate = cooldownMs - (nowUpdate - lastTweet);

        if (remainingUpdate <= 0) {
            btn.disabled = false;
            msg.style.display = 'none';
            if (tweetCooldownInterval) {
                clearInterval(tweetCooldownInterval);
                tweetCooldownInterval = null;
            }
            return;
        }

        const minutes = Math.floor(remainingUpdate / 60000);
        const seconds = Math.floor((remainingUpdate % 60000) / 1000);
        timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    updateRemaining();
    if (tweetCooldownInterval) clearInterval(tweetCooldownInterval);
    tweetCooldownInterval = setInterval(updateRemaining, 1000);
}

function submitTweet() {
    const input = document.getElementById('tweetInput');
    const normalizedText = input.value.replace(/\n{2,}/g, '\n').trim();
    const content = normalizedText;
    const activeTopic = isChallengeReply ? getTodaysTopic() : null;


    // クールダウンチェック
    if (gameState.lastTweetTime) {
        const now = new Date().getTime();
        const lastTweet = new Date(gameState.lastTweetTime).getTime();
        const cooldownMs = 3 * 60 * 1000; // 3分
        if (now - lastTweet < cooldownMs) return;
    }

    // つぶやきを追加
    const tweet = {
        id: gameState.tweetNextId++,
        authorName: gameState.player.name,
        authorJob: gameState.player.job,
        authorAvatar: gameState.player.avatar,
        authorAvatarBgColor: gameState.player.avatarBgColor,
        content: content,
        topic: activeTopic,
        date: new Date().toISOString()
    };

    gameState.tweets.unshift(tweet); // 先頭に追加
    gameState.lastTweetTime = tweet.date;

    // チャレンジフラグをリセット前に保存
    const wasChallenge = isChallengeReply;

    // 入力をクリア
    input.value = '';
    resetTweetTag();
    updateTweetCharCount();

    // 左側の掲示板を更新
    renderTweetList();

    // クールダウン表示を更新
    checkTweetCooldown();

    // チャレンジ報酬処理
    if (wasChallenge) {
        isChallengeReply = false;
        const today = todayStr();
        if (gameState.lastChallengeRewardDate !== today) {
            // 1000〜2000円のランダム報酬（100円単位）
            const reward = (Math.floor(Math.random() * 11) + 10) * 100;
            changeMoney(reward);
            gameState.lastChallengeRewardDate = today;
            // 結果画面を表示
            document.getElementById('tweetComposeContent').style.display = 'none';
            document.getElementById('challengeRewardView').style.display = '';
            document.getElementById('challengeRewardMessage').innerHTML =
                `チャレンジ報酬で<span style="color:#d8b42a;">${reward.toLocaleString()}円</span>の<br>おこづかいをもらいました！`;
            return;
        }
    }

    // モーダルを閉じる
    closeTweetModal();
}

// 表示するつぶやき数（無限スクロール用）
let tweetDisplayCount = 10;

function renderTweetList(reset = true) {
    const container = document.getElementById('tweetList');

    // ピン留めチャレンジを常に描画
    renderPinnedChallenge();

    // リセット時は表示数を初期化
    if (reset) {
        tweetDisplayCount = 10;
    }

    if (gameState.tweets.length === 0) {
        container.innerHTML = '';
        return;
    }

    // 表示するつぶやきを制限
    const tweetsToShow = gameState.tweets.slice(0, tweetDisplayCount);
    const likes = gameState.tweetLikes || [];

    let html = '';
    tweetsToShow.forEach(tweet => {
        // アバターが画像パスか絵文字かを判定
        const bgColor = tweet.authorAvatarBgColor || '#FFB6C1';
        const avatarHtml = tweet.authorAvatar.includes('/')
            ? `<img src="${tweet.authorAvatar}" alt="アバター" class="tweet-avatar-img">`
            : tweet.authorAvatar;
        const jobText = tweet.authorJob || '無職';
        const isLiked = likes.includes(tweet.id);
        html += `
            <div class="tweet-item">
                <div class="tweet-header">
                    <span class="tweet-avatar" style="background-color: ${bgColor}">${avatarHtml}</span>
                    <div class="tweet-author-info">
                        <span class="tweet-name">${escapeHtml(tweet.authorName)}</span>
                        <span class="tweet-job">${escapeHtml(jobText)}</span>
                    </div>
                    <span class="tweet-time">${formatTweetTime(tweet.date)}</span>
                </div>
                ${tweet.topic ? `<div class="tweet-topic-label">${tweet.topic}</div>` : ''}
                <div class="tweet-body">
                    <div class="tweet-content">${formatTweetContent(tweet.content)}</div>
                    <div class="tweet-heart-area">
                        <img src="status/Heart2.png" alt="いいね" class="tweet-heart-icon${isLiked ? ' liked' : ''}" id="tweetHeart-${tweet.id}" onclick="toggleTweetHeart(${tweet.id})">
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// 無限スクロール：もっと読み込む
function loadMoreTweets() {
    if (tweetDisplayCount >= gameState.tweets.length) {
        return; // もう全部表示済み
    }
    tweetDisplayCount += 10;
    renderTweetList(false); // リセットしない
}

// 無限スクロールのイベント設定
function setupTweetInfiniteScroll() {
    const container = document.getElementById('tweetList');
    container.addEventListener('scroll', () => {
        // 下端に近づいたら読み込み
        const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (scrollBottom < 50) {
            loadMoreTweets();
        }
    });
}

// ============================================
// 今日のつぶやきチャレンジ
// ============================================
const todaysTopics = [
    '動物と話せるなら何を話す？',
    '日常で愛用しているものは？',
    'もし1日だけ違う職業になれるとしたら？',
    '今一番欲しいものは何？',
    '子どもの頃の夢は何でしたか？',
    'もし空を飛べるとしたら、最初にどこへ行く？',
    '最近うれしかったことを教えてください',
    'あなたのリラックス方法は？',
    '好きな季節とその理由は？',
    '無人島に1つだけ持っていくとしたら？',
    '今日のご飯、何が食べたい？',
    'もし魔法が使えるとしたら？',
];

function getTodaysTopic() {
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % todaysTopics.length;
    return todaysTopics[dayIndex];
}

function renderPinnedChallenge() {
    const container = document.getElementById('tweetPinnedChallenge');
    if (!container) return;
    const today = todayStr();
    if (gameState.lastChallengeRewardDate === today) {
        container.innerHTML = '';
        return;
    }
    const topic = getTodaysTopic();
    container.innerHTML = `
        <div class="tweet-pin-card">
            <div class="tweet-pin-tag">\\ 今日のつぶやきチャレンジ /</div>
            <div class="tweet-pin-topic">${topic}</div>
            <button class="tweet-pin-btn" onclick="openChallengeReply()">投稿する</button>
        </div>
    `;
}

function openChallengeReply() {
    openTweetModal(getTodaysTopic());
}

// ============================================
// ハート（いいね）機能
// ============================================
function toggleTweetHeart(tweetId) {
    if (!gameState.tweetLikes) gameState.tweetLikes = [];
    const idx = gameState.tweetLikes.indexOf(tweetId);
    const icon = document.getElementById(`tweetHeart-${tweetId}`);
    if (idx >= 0) {
        gameState.tweetLikes.splice(idx, 1);
        if (icon) icon.classList.remove('liked');
    } else {
        gameState.tweetLikes.push(tweetId);
        if (icon) icon.classList.add('liked');
    }
}

function formatTweetTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return 'たった今';
    if (diffMin < 60) return `${diffMin}分前`;
    if (diffHour < 24) return `${diffHour}時間前`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

