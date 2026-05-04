// ============================================
// 家主掲示板
// ============================================

let diaryEditId = null;
let diaryEditDraftId = null;  // 編集中の下書きID（nullなら新規投稿）
let _pendingDraftSave = null; // 満杯時の保留中保存データ
let diarySavedRange = null;   // フォントドロップダウン用に選択範囲を保持
let diaryCurrentTags = [];    // compose中のタグ一時保持
let diaryBubbleAvatarL = null; // 左吹き出し用アイコン（base64）
let diaryBubbleAvatarR = null; // 右吹き出し用アイコン（base64）
let _diarySelChangeHandler = null; // selectionchange リスナー参照（解除用）
let _diaryCurFontSize = 16;       // 現在アクティブなフォントサイズ（ブロック単位）

/* ─── 下書きヘルパー（複数対応） ─────────────── */
function _getDiaryDrafts() {
    const diary = gameState.player.house?.diary;
    if (!diary) return [];
    // 旧フォーマット（単一 draft）をマイグレーション
    if (diary.draft && !diary.drafts) {
        diary.drafts = [{ id: diary.draft.savedAt || Date.now(), html: diary.draft.html, title: diary.draft.title || '', savedAt: diary.draft.savedAt || Date.now() }];
        diary.draft = null;
    }
    if (!diary.drafts) diary.drafts = [];
    return diary.drafts;
}

/* ─── 選択範囲 保存/復元（select用） ──────────── */
function diarySaveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        diarySavedRange = sel.getRangeAt(0).cloneRange();
    }
}
function diaryRestoreSelection() {
    const editor = document.getElementById('diaryEditor');
    if (!editor) return;
    editor.focus();
    if (diarySavedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(diarySavedRange);
    }
}

/* ─── ピッカー制御 ───────────────────────────── */
function closeDiaryPickers() {
    const sbPopup = document.getElementById('diaryColorPopup');
    if (sbPopup) sbPopup.style.display = 'none';
}

function diaryToggleSbColorPicker() {
    const popup = document.getElementById('diaryColorPopup');
    if (!popup) return;
    const isOpen = popup.style.display !== 'none';
    closeDiaryPickers();
    if (!isOpen) {
        const btn = popup.closest('.diary-sb-color-wrap')?.querySelector('button');
        if (btn) {
            const rect = btn.getBoundingClientRect();
            popup.style.top = (rect.bottom + 4) + 'px';
            popup.style.left = rect.left + 'px';
        }
        popup.style.display = 'flex';
    }
}

/* ─── 吹き出し編集（ポップアップ方式） ──────────────── */
let _bubbleEditTarget = null;
let _bubbleEditOriginal = '';
let _bubbleIsNew = false; // 新規挿入かどうか（キャンセル時の挙動を分岐）

function setupDiaryBubbleInner(inner) {
    inner.removeAttribute('contenteditable');
    inner.removeAttribute('oninput');
    inner.style.cursor = 'pointer';
    inner.addEventListener('click', function(e) {
        e.stopPropagation();
        openBubblePopup(inner);
    });
}

// 吹き出しのinnerHTMLをMarkdown風プレーンテキストに逆変換（textarea表示用）
function diaryBubbleHtmlToText(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toUpperCase();
    const cls = node.className || '';
    const kids = Array.from(node.childNodes).map(diaryBubbleHtmlToText).join('');
    if (tag === 'BR') return '\n';
    if (tag === 'B' || tag === 'STRONG') return '**' + kids + '**';
    if (tag === 'I' || tag === 'EM')     return '*' + kids + '*';
    if (cls === 'diary-md-h1') return '# ' + kids;
    if (cls === 'diary-md-h2') return '## ' + kids;
    if (cls === 'diary-md-h3') return '### ' + kids;
    if (cls === 'diary-md-hr') return '---';
    if (cls === 'diary-md-li-sub') return '  * ' + kids.replace(/^・\s*/, '');
    if (tag === 'DIV') return kids;
    return kids;
}

function openBubblePopup(inner, isNew) {
    if (document.getElementById('diaryBubblePopup')) {
        _diaryHistoryLock = false;
        return;
    }
    _bubbleEditTarget = inner;
    _bubbleEditOriginal = inner.innerHTML;
    _bubbleIsNew = !!isNew;

    // 編集モードのときは既存テキストを復元する
    let initialText = '';
    if (!isNew) {
        const tmp = document.createElement('div');
        tmp.innerHTML = inner.innerHTML;
        const lines = [];
        tmp.childNodes.forEach(function(n) { lines.push(diaryBubbleHtmlToText(n)); });
        initialText = lines.join('').replace(/\n{3,}/g, '\n\n').trim();
    }

    const popup = document.createElement('div');
    popup.id = 'diaryBubblePopup';
    popup.innerHTML = `
        <div class="diary-bp-box">
            <p class="diary-bp-label">セリフを入力</p>
            <textarea id="diaryBubblePopupTa" class="diary-bp-ta" rows="8"></textarea>
            <div class="diary-bp-btns">
                <button class="diary-bp-delete${isNew ? ' diary-bp-delete-hidden' : ''}" onclick="deleteBubbleEdit()">削除</button>
                <div class="diary-bp-btns-right">
                    <button class="diary-bp-cancel" onclick="cancelBubbleEdit()">キャンセル</button>
                    <button id="diaryBubblePopupOk" class="diary-bp-ok" onclick="confirmBubbleEdit()" disabled>確定</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(popup);


    const ta = document.getElementById('diaryBubblePopupTa');
    const okBtn = document.getElementById('diaryBubblePopupOk');
    if (initialText) {
        ta.value = initialText;
        okBtn.disabled = false;
    }
    ta.addEventListener('input', function() {
        okBtn.disabled = ta.value.trim() === '';
    });
    ta.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') { e.preventDefault(); cancelBubbleEdit(); return; }
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            if (ta.value.trim() !== '') confirmBubbleEdit();
            return;
        }
    });
    ta.focus();
    ta.select();
}

function confirmBubbleEdit() {
    const ta = document.getElementById('diaryBubblePopupTa');
    const target = _bubbleEditTarget;
    const isNewBubble = _bubbleIsNew; // closeBubblePopup で消える前に保持
    if (ta && target) {
        // プレースホルダーを実際のHTMLタグに変換（escapeHtml後でも安全）
        const applyBold = s => s
            .replace(/\x01BI\x01/g, '<b><i>').replace(/\x01\/BI\x01/g, '</i></b>')
            .replace(/\x01B\x01/g, '<b>').replace(/\x01\/B\x01/g, '</b>');
        // 複数行にまたがる bold/italic を事前にプレースホルダーへ（*** → BI, ** → B の順）
        let raw = ta.value;
        raw = raw.replace(/\*\*\*([\s\S]+?)\*\*\*/g, '\x01BI\x01$1\x01/BI\x01');
        raw = raw.replace(/\*\*([\s\S]+?)\*\*/g, '\x01B\x01$1\x01/B\x01');
        target.innerHTML = raw
            .split('\n')
            .map(function(line) {
                const t = line.trim();
                if (/^#{4,}\s/.test(t)) return applyBold('<div class="diary-md-h3">' + escapeHtml(t.replace(/^#{4,}\s+/, '')) + '</div>');
                if (/^#{3}\s/.test(t))  return applyBold('<div class="diary-md-h3">' + escapeHtml(t.replace(/^#{3}\s+/, '')) + '</div>');
                if (/^#{2}\s/.test(t))  return applyBold('<div class="diary-md-h2">' + escapeHtml(t.replace(/^#{2}\s+/, '')) + '</div>');
                if (/^#\s/.test(t))     return applyBold('<div class="diary-md-h1">' + escapeHtml(t.replace(/^#\s+/, '')) + '</div>');
                if (/^[-*_]{3,}$/.test(t)) return '<div class="diary-md-hr"><br></div>';
                let l = escapeHtml(line);
                // サブ箇条書き（2つ以上のスペース + * item）
                const subMatch = l.match(/^(\s{2,})\* (.*)$/);
                if (subMatch) return applyBold('<div class="diary-md-li-sub">・ ' + subMatch[2] + '</div>');
                if (/^\* /.test(l)) l = '・ ' + l.slice(2);  // * item → ・ item
                l = applyBold(l);
                l = l.replace(/\*([^*\n]+?)\*/g, '<i>$1</i>');
                return l;
            })
            .join('<br>');
    }
    closeBubblePopup();
    if (isNewBubble) _diaryHistoryLock = false; // 新規吹き出しのロックを解除
    updateDiaryCount();
    if (target) exitDiaryBubble(target);
}

function cancelBubbleEdit() {
    const target = _bubbleEditTarget;
    const original = _bubbleEditOriginal;
    const isNew = _bubbleIsNew;
    closeBubblePopup();
    if (isNew) _diaryHistoryLock = false; // 新規吹き出しのロックを解除
    if (!target) return;
    if (isNew) {
        // 新規挿入のキャンセル → 吹き出しごと削除
        const bubble = target.closest('.diary-bubble-l, .diary-bubble-r');
        if (bubble) {
            if (bubble.nextSibling && bubble.nextSibling.nodeName === 'BR') bubble.nextSibling.remove();
            bubble.remove();
        }
        const editor = document.getElementById('diaryEditor');
        if (editor) editor.focus();
    } else {
        // 既存編集のキャンセル → 元の内容に戻す
        target.innerHTML = original;
        exitDiaryBubble(target);
    }
}

function deleteBubbleEdit() {
    const target = _bubbleEditTarget;
    closeBubblePopup();
    if (!target) return;
    diaryHistorySave(); // 削除前の状態を保存
    const bubble = target.closest('.diary-bubble-l, .diary-bubble-r');
    if (bubble) {
        if (bubble.nextSibling && bubble.nextSibling.nodeName === 'BR') bubble.nextSibling.remove();
        bubble.remove();
    }
    const editor = document.getElementById('diaryEditor');
    if (editor) editor.focus();
    diaryHistorySave(); // 削除後の状態を保存
}

function closeBubblePopup() {
    const popup = document.getElementById('diaryBubblePopup');
    if (popup) popup.remove();
    _bubbleEditTarget = null;
    _bubbleEditOriginal = '';
    _bubbleIsNew = false;
}

function exitDiaryBubble(bubbleInner) {
    const bubble = bubbleInner.closest('.diary-bubble-l, .diary-bubble-r');
    if (!bubble) return;
    const editor = document.getElementById('diaryEditor');
    if (!editor) return;

    // 吹き出しの後ろに <br> がなければ追加
    const after = _diaryEnsureBrAfter(bubble);

    // カーソルを <br> の後に移動
    const range = document.createRange();
    if (after.nextSibling) {
        range.setStartBefore(after.nextSibling);
    } else {
        range.setStartAfter(after);
    }
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    editor.focus();
}

/* ─── 画像ツールバー ─────────────────────────── */
let _imgToolbarTarget = null;

function setupDiaryImage(img) {
    img.style.cursor = 'pointer';
    img.addEventListener('click', function(e) {
        e.stopPropagation();
        openImgToolbar(img);
    });
}

function openImgToolbar(img) {
    closeImgToolbar();
    _imgToolbarTarget = img;

    const cls = img.classList;
    const size  = cls.contains('diary-img-sm') ? 'sm' : cls.contains('diary-img-md') ? 'md' : 'lg';
    const align = cls.contains('diary-img-center') ? 'center' : cls.contains('diary-img-right') ? 'right' : 'left';

    const toolbar = document.createElement('div');
    toolbar.id = 'diaryImgToolbar';
    toolbar.className = 'diary-img-toolbar';
    toolbar.innerHTML =
        `<button class="diary-img-tb-btn${size==='sm'?' active':''}" data-size="sm" onmousedown="event.preventDefault();diaryImgSetSize('sm')">小</button>` +
        `<button class="diary-img-tb-btn${size==='md'?' active':''}" data-size="md" onmousedown="event.preventDefault();diaryImgSetSize('md')">中</button>` +
        `<button class="diary-img-tb-btn${size==='lg'?' active':''}" data-size="lg" onmousedown="event.preventDefault();diaryImgSetSize('lg')">大</button>` +
        `<span class="diary-img-tb-sep"></span>` +
        `<button class="diary-img-tb-btn${align==='left'?' active':''}" data-align="left" onmousedown="event.preventDefault();diaryImgSetAlign('left')" title="左揃え">⇤</button>` +
        `<button class="diary-img-tb-btn${align==='center'?' active':''}" data-align="center" onmousedown="event.preventDefault();diaryImgSetAlign('center')" title="中央揃え">⇔</button>` +
        `<button class="diary-img-tb-btn${align==='right'?' active':''}" data-align="right" onmousedown="event.preventDefault();diaryImgSetAlign('right')" title="右揃え">⇥</button>` +
        `<span class="diary-img-tb-sep"></span>` +
        `<button class="diary-img-tb-btn diary-img-tb-del" onmousedown="event.preventDefault();diaryImgDelete()" title="画像を削除">🗑</button>`;
    document.body.appendChild(toolbar);

    const rect = img.getBoundingClientRect();
    const tbH = 38;
    const top = rect.top > tbH + 10 ? rect.top - tbH - 6 : rect.bottom + 6;
    toolbar.style.top  = top + 'px';
    toolbar.style.left = Math.min(rect.left, window.innerWidth - 220) + 'px';

    setTimeout(() => {
        document.addEventListener('mousedown', _closeImgToolbarOutside);
    }, 0);
}

function _closeImgToolbarOutside(e) {
    const toolbar = document.getElementById('diaryImgToolbar');
    if (toolbar && !toolbar.contains(e.target) && e.target !== _imgToolbarTarget) {
        closeImgToolbar();
    }
}

function closeImgToolbar() {
    const toolbar = document.getElementById('diaryImgToolbar');
    if (toolbar) toolbar.remove();
    document.removeEventListener('mousedown', _closeImgToolbarOutside);
    _imgToolbarTarget = null;
}

function diaryImgDelete() {
    const img = _imgToolbarTarget;
    closeImgToolbar();
    if (!img) return;
    // 後続のBRも一緒に除去
    if (img.nextSibling && img.nextSibling.nodeName === 'BR') img.nextSibling.remove();
    img.remove();
    updateDiaryCount();
}

function diaryImgSetSize(size) {
    if (!_imgToolbarTarget) return;
    _imgToolbarTarget.classList.remove('diary-img-sm', 'diary-img-md', 'diary-img-lg');
    if (size !== 'lg') _imgToolbarTarget.classList.add('diary-img-' + size);
    document.querySelectorAll('#diaryImgToolbar [data-size]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.size === size);
    });
    updateDiaryCount();
}

function diaryImgSetAlign(align) {
    if (!_imgToolbarTarget) return;
    _imgToolbarTarget.classList.remove('diary-img-center', 'diary-img-right');
    if (align !== 'left') _imgToolbarTarget.classList.add('diary-img-' + align);
    document.querySelectorAll('#diaryImgToolbar [data-align]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.align === align);
    });
    updateDiaryCount();
}

/* ─── 履歴（Undo / Redo） ───────────────────── */
const DIARY_HISTORY_MAX = 50;
let _diaryHistory     = [];
let _diaryHistoryIdx  = -1;
let _diaryHistoryLock = false;
let _diaryHistoryTimer = null;
let _diaryObserver    = null;

function diaryHistoryInit() {
    _diaryHistory     = [];
    _diaryHistoryIdx  = -1;
    _diaryHistoryLock = false;
    clearTimeout(_diaryHistoryTimer);
    if (_diaryObserver) { _diaryObserver.disconnect(); _diaryObserver = null; }
}

function diaryHistoryObserve() {
    const editor = document.getElementById('diaryEditor');
    if (!editor) return;
    _diaryObserver = new MutationObserver(function() {
        if (_diaryHistoryLock) return;
        clearTimeout(_diaryHistoryTimer);
        _diaryHistoryTimer = setTimeout(diaryHistorySave, 800);
    });
    _diaryObserver.observe(editor, { childList: true, subtree: true, characterData: true, attributes: true });
}

function diaryHistorySave() {
    clearTimeout(_diaryHistoryTimer);
    if (_diaryHistoryLock) return;
    const editor = document.getElementById('diaryEditor');
    if (!editor) return;
    const html = editor.innerHTML;
    if (_diaryHistoryIdx >= 0 && _diaryHistory[_diaryHistoryIdx] === html) return;
    _diaryHistory = _diaryHistory.slice(0, _diaryHistoryIdx + 1);
    _diaryHistory.push(html);
    if (_diaryHistory.length > DIARY_HISTORY_MAX) {
        _diaryHistory.shift();
        _diaryHistoryIdx--;
    } else _diaryHistoryIdx++;
}

function diaryHistoryUndo() {
    clearTimeout(_diaryHistoryTimer);
    diaryHistorySave(); // 未保存の変化を先に確定
    if (_diaryHistoryIdx <= 0) return;
    _diaryHistoryIdx--;
    _diaryHistoryApply();
}

function diaryHistoryRedo() {
    clearTimeout(_diaryHistoryTimer);
    if (_diaryHistoryIdx >= _diaryHistory.length - 1) return;
    _diaryHistoryIdx++;
    _diaryHistoryApply();
}

function _diaryHistoryApply() {
    const editor = document.getElementById('diaryEditor');
    if (!editor) return;
    _diaryHistoryLock = true;
    clearTimeout(_diaryHistoryTimer);
    editor.innerHTML = _diaryHistory[_diaryHistoryIdx];
    editor.querySelectorAll('.diary-bubble-inner').forEach(el => setupDiaryBubbleInner(el));
    editor.querySelectorAll('.diary-img').forEach(el => setupDiaryImage(el));
    editor.querySelectorAll('.diary-colorbox-inner').forEach(el => setupDiaryColorbox(el));
    // カーソルをエディタ末尾に移動
    editor.focus();
    const _r = document.createRange();
    _r.selectNodeContents(editor);
    _r.collapse(false);
    const _s = window.getSelection();
    if (_s) { _s.removeAllRanges(); _s.addRange(_r); }
    // Chrome の DOM 正規化が完了するまで待ってからロック解除（50ms では足りなかった）
    setTimeout(() => { _diaryHistoryLock = false; }, 300);
    updateDiaryCount();
}

/* ─── ツールバーコマンド ─────────────────────── */
function diaryExec(cmd) {
    document.execCommand(cmd, false, null);
    if (cmd === 'bold') {
        const btn = document.querySelector('.diary-sb-bold');
        if (btn) btn.classList.toggle('active', document.queryCommandState('bold'));
    }
    updateDiaryCount();
}

function diarySetFont(fontFamily) {
    diaryRestoreSelection();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('fontName', false, fontFamily || 'inherit');
    diarySavedRange = null;
    updateDiaryCount();
}


function diarySetColor(color) {
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
    closeDiaryPickers();
    const indicator = document.getElementById('diaryColorIndicator');
    if (indicator) indicator.style.background = color;
    updateDiaryCount();
}

function diaryToggleMarker() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    document.execCommand('styleWithCSS', false, true);
    // カーソル位置の要素を起点にマーカー色が適用済みか確認
    let node = sel.getRangeAt(0).startContainer;
    if (node.nodeType === 3) node = node.parentElement;
    let hasMarker = false;
    const editor = document.getElementById('diaryEditor');
    let n = node;
    while (n && n !== editor) {
        const bg = (n.style && n.style.backgroundColor) || '';
        if (bg === '#fffe9a' || bg === 'rgb(255, 254, 154)') { hasMarker = true; break; }
        n = n.parentElement;
    }
    document.execCommand('hiliteColor', false, hasMarker ? 'transparent' : '#fffe9a');
    updateDiaryCount();
}

function diaryInsertBlockHtml(html) {
    document.execCommand('insertHTML', false, html);
    updateDiaryCount();
}

/* ─── フォントサイズ（ブロック単位） ──────────── */

// サイズボタンのアクティブ状態を更新
function _updateDiarySizeBtns() {
    document.querySelectorAll('.diary-sb-size2-btn').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.size) === _diaryCurFontSize);
    });
}

// container直属のテキストノードをdivで包む
function _diaryWrapTextNode(container, textNode) {
    const div = document.createElement('div');
    container.insertBefore(div, textNode);
    div.appendChild(textNode);
    return div;
}

// ノードからcontainer直属のブロックdivを取得
// isEditorRoot=true のときはバブル・カラーボックスを除外する
function _getEditorBlock(container, node, isEditorRoot) {
    let n = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    // n がcontainer自身 = 空のcontainer or 1行目の生テキストノード
    if (n === container) {
        if (!isEditorRoot) return container;  // カラーボックスinnerは自身に適用
        // エディタルート + テキストノード直属 → divで包む
        if (node.nodeType === Node.TEXT_NODE && node.parentNode === container) {
            return _diaryWrapTextNode(container, node);
        }
        return null;
    }

    while (n && n.parentElement !== container) {
        n = n.parentElement;
    }
    if (!n || n === container) {
        return null;
    }
    // エディタルートのみ：バブル・カラーボックスは対象外
    if (isEditorRoot && (
        n.classList.contains('diary-bubble-l') ||
        n.classList.contains('diary-bubble-r') ||
        n.classList.contains('diary-colorbox'))) {
        return null;
    }
    return n;
}

// 選択範囲内にあるcontainer直属のブロックdivをすべて返す
function _getDiarySelectedBlocks(container, range, isEditorRoot) {
    const startBlock = _getEditorBlock(container, range.startContainer, isEditorRoot);
    if (!startBlock) return [];
    if (range.collapsed) return [startBlock];

    const endBlock = _getEditorBlock(container, range.endContainer, isEditorRoot);
    if (!endBlock || startBlock === endBlock) return [startBlock];

    // startBlock〜endBlock 間のDIVを収集
    const result = [];
    let collecting = false;
    for (const child of Array.from(container.childNodes)) {
        if (child === startBlock) collecting = true;
        if (collecting &&
            child.nodeType === Node.ELEMENT_NODE &&
            child.tagName === 'DIV' &&
            (!isEditorRoot || (
                !child.classList.contains('diary-bubble-l') &&
                !child.classList.contains('diary-bubble-r') &&
                !child.classList.contains('diary-colorbox')
            ))) {
            result.push(child);
        }
        if (child === endBlock) break;
    }
    return result.length ? result : [startBlock];
}

// 空エディタ用：フォントサイズ付き初期ブロックを挿入してカーソルを移動
function _diaryInsertInitialBlock(editor, px) {
    const div = document.createElement('div');
    _applyDiaryTextSize(div, px);
    editor.insertBefore(div, editor.firstChild);
    const r = document.createRange();
    r.setStart(div, 0);
    r.collapse(true);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    editor.focus();
}

// フォントサイズをブロック単位で適用
function diarySetFontSize(px) {
    const editor = document.getElementById('diaryEditor');
    if (!editor) return;

    _diaryCurFontSize = px;
    _updateDiarySizeBtns();

    const sel = window.getSelection();

    // エディタ内の通常ブロックdiv（吹き出し・カラーボックス以外）を取得するヘルパー
    function _getEditorBlockDivs() {
        return Array.from(editor.childNodes).filter(c =>
            c.nodeType === Node.ELEMENT_NODE && c.tagName === 'DIV' &&
            !c.classList.contains('diary-bubble-l') &&
            !c.classList.contains('diary-bubble-r') &&
            !c.classList.contains('diary-colorbox')
        );
    }

    // selectionがない場合: 既存ブロックがあればそちらに適用、なければ初期ブロック挿入
    if (!sel || !sel.rangeCount) {
        const divs = _getEditorBlockDivs();
        if (divs.length > 0) {
            _applyDiaryTextSize(divs[divs.length - 1], px);
        } else if (editor === document.activeElement || editor.contains(document.activeElement)) {
            _diaryInsertInitialBlock(editor, px);
        }
        updateDiaryCount();
        return;
    }

    const range = sel.getRangeAt(0);

    // カーソルがカラーボックス内にあるか確認
    const colorboxInner = _getDiaryColorboxInner(range.startContainer, editor);

    // カラーボックス内はinnerを、通常はeditorをコンテナとして使う
    const container = colorboxInner || editor;
    const isEditorRoot = !colorboxInner;
    const blocks = _getDiarySelectedBlocks(container, range, isEditorRoot);

    if (blocks.length === 0 && !colorboxInner) {
        // カーソルがエディタ要素自身にある場合：既存ブロックがあればそこに適用
        const divs = _getEditorBlockDivs();
        if (divs.length > 0) {
            _applyDiaryTextSize(divs[0], px);
        } else {
            // エディタが本当に空のときだけ初期ブロックを挿入
            _diaryInsertInitialBlock(editor, px);
        }
        updateDiaryCount();
        return;
    }

    blocks.forEach(block => {
        _applyDiaryTextSize(block, px);
    });
    (colorboxInner || editor).focus();
    updateDiaryCount();
}

/* ─── フォントサイズ v2（再設計版） ─────────────── */

// エディタ直下に通常ブロックDIVがなければ作って返す（あればnullを返す）
function _ensureEditorHasBlock(editor) {
    const hasBlock = Array.from(editor.childNodes).some(n =>
        n.nodeType === 1 && n.tagName === 'DIV' &&
        !n.classList.contains('diary-bubble-l') &&
        !n.classList.contains('diary-bubble-r') &&
        !n.classList.contains('diary-colorbox')
    );
    if (hasBlock) return null;
    const div = document.createElement('div');
    const firstBr = (editor.firstChild && editor.firstChild.nodeName === 'BR') ? editor.firstChild : null;
    if (firstBr) {
        editor.insertBefore(div, firstBr);
        firstBr.remove();
    } else {
        editor.insertBefore(div, editor.firstChild);
    }
    return div;
}

// ノードからコンテナ直下の通常ブロックDIVを返す（バブル・カラーボックスは除外）
// テキストノードがcontainerの直接の子のときはdivで包んで返す（1行目対策）
function _findEditorBlockV2(container, node) {
    if (node.nodeType === Node.TEXT_NODE && node.parentNode === container) {
        return _diaryWrapTextNode(container, node);
    }
    let n = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (n && n.parentElement !== container) {
        n = n.parentElement;
    }
    if (!n || n === container) return null;
    if (n.classList.contains('diary-bubble-l') ||
        n.classList.contains('diary-bubble-r') ||
        n.classList.contains('diary-colorbox')) return null;
    return n;
}

function diarySetSizeV2(px) {
    const editor = document.getElementById('diaryEditor');
    if (!editor) return;

    _diaryCurFontSize = px;
    document.querySelectorAll('.diary-sb-size2-btn').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.size) === px);
    });

    // ── カラーボックス内にカーソルがあるか確認（editor.focus()より前に） ──
    const selPre = window.getSelection();
    const colorboxInner = (selPre && selPre.rangeCount)
        ? _getDiaryColorboxInner(selPre.getRangeAt(0).startContainer, editor)
        : null;

    // ── カラーボックス内の処理 ──
    if (colorboxInner) {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) { updateDiaryCount(); return; }
        const range = sel.getRangeAt(0);
        if (!range.collapsed) {
            // 範囲選択：選択内のブロックに適用
            const startBlock = _findEditorBlockV2(colorboxInner, range.startContainer);
            const endBlock   = _findEditorBlockV2(colorboxInner, range.endContainer);
            if (!startBlock) {
                // 子ブロックなし → colorboxInner自身に適用
                _applyDiaryTextSize(colorboxInner, px);
            } else {
                let collecting = false;
                for (const child of Array.from(colorboxInner.childNodes)) {
                    if (child === startBlock) collecting = true;
                    if (collecting && child.nodeType === 1 && child.tagName === 'DIV') {
                        _applyDiaryTextSize(child, px);
                    }
                    if (child === endBlock) break;
                }
            }
        } else {
            // カーソルのみ → 現在のブロック or colorboxInner自身に適用
            const block = _findEditorBlockV2(colorboxInner, range.startContainer);
            _applyDiaryTextSize(block || colorboxInner, px);
        }
        colorboxInner.focus();
        updateDiaryCount();
        return;
    }

    // ── 通常エディタの処理 ──
    const sel = window.getSelection();
    if (!sel) return;

    // カーソルがエディタ外 → ボタン表示だけ更新してDOMは触らない
    if (!sel.rangeCount || !editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        updateDiaryCount();
        return;
    }

    // エディタにブロックがなければ → ボタン表示だけ更新してDOMは触らない
    const hasBlock = Array.from(editor.childNodes).some(n =>
        n.nodeType === 1 && n.tagName === 'DIV' &&
        !n.classList.contains('diary-bubble-l') &&
        !n.classList.contains('diary-bubble-r') &&
        !n.classList.contains('diary-colorbox')
    );
    if (!hasBlock) {
        updateDiaryCount();
        return;
    }

    const range = sel.getRangeAt(0);

    // 範囲選択 → 選択内のすべてのブロックに適用
    if (!range.collapsed) {
        const startBlock = _findEditorBlockV2(editor, range.startContainer);
        const endBlock   = _findEditorBlockV2(editor, range.endContainer);
        let collecting = false;
        for (const child of Array.from(editor.childNodes)) {
            if (child === startBlock) collecting = true;
            if (collecting && child.nodeType === 1 && child.tagName === 'DIV' &&
                !child.classList.contains('diary-bubble-l') &&
                !child.classList.contains('diary-bubble-r') &&
                !child.classList.contains('diary-colorbox')) {
                _applyDiaryTextSize(child, px);
            }
            if (child === endBlock) break;
        }
        updateDiaryCount();
        return;
    }

    // カーソルのみ → 現在のブロックに適用
    const savedContainer = range.startContainer;
    const savedOffset    = range.startOffset;
    const block = _findEditorBlockV2(editor, range.startContainer);
    if (block) {
        _applyDiaryTextSize(block, px);
        // wrap で DOM が変わってもカーソル位置を復元
        try {
            const r = document.createRange();
            r.setStart(savedContainer, savedOffset);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
        } catch(e) {}
    }
    updateDiaryCount();
}

/* ─── カラーボックス ─────────────────────────── */

// ノードから最も近い diary-colorbox-inner 祖先を返す（なければ null）
function _getDiaryColorboxInner(node, editor) {
    let n = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (n && n !== editor) {
        if (n.classList && n.classList.contains('diary-colorbox-inner')) return n;
        n = n.parentElement;
    }
    return null;
}

// カーソルがカラーボックスの「先頭」にあるか判定
function _isAtStartOfColorbox(el) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return false;
    const range = sel.getRangeAt(0);
    const testRange = document.createRange();
    testRange.selectNodeContents(el);
    try {
        testRange.setEnd(range.startContainer, range.startOffset);
    } catch(e) { return false; }
    return testRange.cloneContents().textContent.replace(/[\s\u200B]/g, '') === '';
}

// カーソルがカラーボックスの「末尾」にあるか判定
function _isAtEndOfColorbox(el) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return false;
    const range = sel.getRangeAt(0);
    // el の内容を包む範囲を作り、カーソル位置からel末尾までのテキストを取得
    const testRange = document.createRange();
    testRange.selectNodeContents(el);
    try {
        testRange.setStart(range.endContainer, range.endOffset);
    } catch(e) { return false; }
    // テキストが空（空白・ZWSも除く）なら末尾とみなす
    return testRange.cloneContents().textContent.replace(/[\s\u200B]/g, '') === '';
}

// 要素の直後に <br> を挿入して返す（挿入系：必ず新規追加）
function _diaryInsertBrAfter(el) {
    const br = document.createElement('br');
    if (el.nextSibling) {
        el.parentNode.insertBefore(br, el.nextSibling);
    } else {
        el.parentNode.appendChild(br);
    }
    return br;
}

// 要素の直後に <br> がなければ追加して返す（exit系：重複追加しない）
function _diaryEnsureBrAfter(el) {
    let after = el.nextSibling;
    if (!after || after.nodeName !== 'BR') {
        const br = document.createElement('br');
        el.parentNode.insertBefore(br, el.nextSibling);
        after = br;
    }
    return after;
}

// 末尾の空BR・空ブロックを削除（2連続Enter後の後片付け）
function _removeTrailingEmptyFromColorbox(el) {
    while (el.lastChild) {
        const last = el.lastChild;
        if (last.nodeName === 'BR') { last.remove(); continue; }
        if (last.nodeType === 1 &&
            last.textContent.replace(/\s/g, '') === '' &&
            !last.querySelector('img')) { last.remove(); continue; }
        break;
    }
}

// カラーボックス内側のcontenteditable設定とキーボードハンドラを登録
function setupDiaryColorbox(inner) {
    inner.contentEditable = 'true';

    // クロージャで「直前のEnterが末尾だったか」を管理
    let _lastEnterAtEnd = false;

    inner.addEventListener('keydown', function(e) {
        // IME変換中は無視
        if (e.isComposing) return;

        // Enter以外が押されたらフラグをリセット
        if (e.key !== 'Enter' && e.key !== 'Backspace') {
            _lastEnterAtEnd = false;
        }

        // ─ Backspace：ボックスが空 or カーソルが先頭 → ボックスごと削除 ─
        if (e.key === 'Backspace') {
            const isEmpty = inner.textContent.replace(/[\s\u200B]/g, '') === '' &&
                            !inner.querySelector('img');
            const atStart = !isEmpty && _isAtStartOfColorbox(inner);
            if (isEmpty || atStart) {
                e.preventDefault();
                e.stopPropagation(); // バブリングを止めてエディタ側のBackspaceハンドラが誤動作しないようにする
                _lastEnterAtEnd = false;
                diaryHistorySave(); // 削除前の「空ボックス」状態を履歴に確定してからボックスを消す
                const box = inner.closest('.diary-colorbox');
                if (!box) return;
                const editor = document.getElementById('diaryEditor');
                // カーソルをボックスの前に移動
                const r = document.createRange();
                r.setStartBefore(box);
                r.collapse(true);
                const s = window.getSelection();
                s.removeAllRanges();
                s.addRange(r);
                if (box.nextSibling && box.nextSibling.nodeName === 'BR') box.nextSibling.remove();
                box.remove();
                if (editor) editor.focus();
                updateDiaryCount();
            }
            return;
        }

        if (e.key !== 'Enter') return;

        const atEnd = _isAtEndOfColorbox(inner);

        if (atEnd && _lastEnterAtEnd) {
            // ── 2連続Enter（末尾のみ）→ ボックスの外へ出る ──
            e.preventDefault();
            _lastEnterAtEnd = false;
            // 1回目のEnterで生まれた末尾の空行を除去してからexit
            _removeTrailingEmptyFromColorbox(inner);
            _exitDiaryColorbox(inner);
        } else if (atEnd) {
            // ── 1回目（末尾）→ フラグを立てて通常改行を許可 ──
            _lastEnterAtEnd = true;
        } else {
            // ── 末尾でないEnter → 通常改行（フラグはリセット）──
            _lastEnterAtEnd = false;
        }
    });

    // クリックイベントがエディタに伝播してカーソルがずれないようにする
    inner.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // フォーカスが外れたらフラグをリセット
    inner.addEventListener('blur', function() {
        _lastEnterAtEnd = false;
    });
}

// カラーボックスを抜けてカーソルをその直後に移動
function _exitDiaryColorbox(inner) {
    const box = inner.closest('.diary-colorbox');
    if (!box) return;
    const editor = document.getElementById('diaryEditor');
    if (!editor) return;

    // focus を先に呼ばないと Chrome がカーソルを先頭にリセットしてしまう
    editor.focus();

    // ボックスの後ろにBRがなければ追加
    const after = _diaryEnsureBrAfter(box);

    // カーソルを配置
    const moveRange = document.createRange();
    if (after.nextSibling) {
        // BRの次に要素がある → その直前にカーソルを置く
        moveRange.setStartBefore(after.nextSibling);
    } else {
        // BRが最後の要素 → BRを削除してボックス直後にカーソルを置く（空行を出さない）
        after.remove();
        moveRange.setStartAfter(box);
    }
    moveRange.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(moveRange);
}

// カラーボックスをカーソル位置に挿入
function diaryInsertColorbox(color) {
    const editor = document.getElementById('diaryEditor');
    if (!editor) return;

    diaryHistorySave(); // 挿入前の状態を履歴に保存

    // カーソルが既存カラーボックスの中にある場合は外に出す
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
        const node = sel.getRangeAt(0).commonAncestorContainer;
        const domNode = node.nodeType === 3 ? node.parentElement : node;
        const existing = domNode.closest?.('.diary-colorbox');
        if (existing) {
            const r = document.createRange();
            r.setStartAfter(existing);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
        }
    }

    // ボックスを生成
    const box = document.createElement('div');
    box.className = 'diary-colorbox';
    box.style.background = color;
    box.contentEditable = 'false';

    const inner = document.createElement('div');
    inner.className = 'diary-colorbox-inner';
    inner.setAttribute('data-placeholder', 'ここに文字を入力...');
    box.appendChild(inner);

    // カーソル位置に挿入
    editor.focus();
    const insertSel = window.getSelection();
    if (insertSel && insertSel.rangeCount &&
        editor.contains(insertSel.getRangeAt(0).commonAncestorContainer)) {
        const range = insertSel.getRangeAt(0);
        range.collapse(true);
        range.insertNode(box);
    } else {
        editor.appendChild(box);
    }

    // ボックスの後ろにBRを追加
    _diaryInsertBrAfter(box);

    // キーボードハンドラを登録
    setupDiaryColorbox(inner);

    // フォーカスをボックス内に移動
    const focusRange = document.createRange();
    focusRange.setStart(inner, 0);
    focusRange.collapse(true);
    const focusSel = window.getSelection();
    focusSel.removeAllRanges();
    focusSel.addRange(focusRange);
    inner.focus();

    updateDiaryCount();
}

function diaryInsertHr(type) {
    const cls = type === 'dashed' ? 'diary-md-hr-dashed' : type === 'dotted' ? 'diary-md-hr-dotted' : 'diary-md-hr';
    const editor = document.getElementById('diaryEditor');
    if (!editor) return;

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    // カーソルがカラーボックス内にあるか確認
    const colorboxInner = _getDiaryColorboxInner(sel.getRangeAt(0).startContainer, editor);
    const container = colorboxInner || editor;

    // 挿入前に現在のブロックを取得
    let insertAfter = null;
    if (editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        insertAfter = _findEditorBlockV2(container, sel.getRangeAt(0).startContainer);
    }

    // HR div と次行 div（現在のフォントサイズを引き継ぐ）を作成
    const hrDiv = document.createElement('div');
    hrDiv.className = cls;
    const nextDiv = document.createElement('div');
    _applyDiaryTextSize(nextDiv, _diaryCurFontSize);
    nextDiv.appendChild(document.createElement('br'));

    if (insertAfter && insertAfter.parentNode === container) {
        container.insertBefore(hrDiv, insertAfter.nextSibling);
        container.insertBefore(nextDiv, hrDiv.nextSibling);
    } else {
        container.appendChild(hrDiv);
        container.appendChild(nextDiv);
    }

    // カーソルを次行 div へ
    const r = document.createRange();
    r.setStart(nextDiv, 0);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    updateDiaryCount();
}


function diaryInsertBubble(direction) {
    const editor = document.getElementById('diaryEditor');
    if (!editor) return;

    diaryHistorySave(); // 挿入前の状態を先に保存
    _diaryHistoryLock = true; // 空の吹き出し状態が履歴に保存されないようロック

    // 吹き出しの中にカーソルがある場合は外に出す
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
        const node = sel.getRangeAt(0).commonAncestorContainer;
        const domNode = node.nodeType === 3 ? node.parentElement : node;
        const existing = domNode.closest?.('.diary-bubble-l, .diary-bubble-r');
        if (existing) {
            const r = document.createRange();
            r.setStartAfter(existing);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
        }
    }

    const cls = direction === 'left' ? 'diary-bubble-l' : 'diary-bubble-r';
    const avatar = direction === 'left' ? diaryBubbleAvatarL : diaryBubbleAvatarR;

    // execCommand('insertHTML') は contenteditable 属性を剥がすことがあるため
    // DOM を直接操作して確実に contenteditable を設定する
    const bubble = document.createElement('div');
    bubble.className = cls;
    bubble.contentEditable = 'false';

    const inner = document.createElement('div');
    inner.className = 'diary-bubble-inner';
    inner.dataset.placeholder = 'セリフを入力...';

    if (avatar) {
        const img = document.createElement('img');
        img.src = avatar;
        img.className = 'diary-bubble-avatar';
        img.alt = 'アイコン';
        if (direction === 'left') {
            bubble.appendChild(img);
            bubble.appendChild(inner);
        } else {
            bubble.appendChild(inner);
            bubble.appendChild(img);
        }
    } else {
        bubble.appendChild(inner);
    }

    // カーソル位置（editor 内）に挿入
    editor.focus();
    const insertSel = window.getSelection();
    if (insertSel && insertSel.rangeCount && editor.contains(insertSel.getRangeAt(0).commonAncestorContainer)) {
        const range = insertSel.getRangeAt(0);
        range.collapse(true);
        range.insertNode(bubble);
    } else {
        editor.appendChild(bubble);
    }
    // bubble の後に <br> を追加
    _diaryInsertBrAfter(bubble);

    // クリックハンドラを設定して、すぐにポップアップを開く（新規なので isNew=true）
    // ロックはポップアップの確定/キャンセル時に解除する
    setupDiaryBubbleInner(inner);
    openBubblePopup(inner, true);

    updateDiaryCount();
}

function diarySetBubbleAvatar(side) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.onchange = async function() {
        const file = fileInput.files[0];
        document.body.removeChild(fileInput);
        if (!file) return;
        const dataUrl = await compressImage(file, 200, 0.85); // アバター：小さいサイズで十分
        const previewId = side === 'left' ? 'diaryAvatarPreviewL' : 'diaryAvatarPreviewR';
        const emptyId  = side === 'left' ? 'diaryAvatarEmptyL'   : 'diaryAvatarEmptyR';
        if (side === 'left') diaryBubbleAvatarL = dataUrl;
        else                 diaryBubbleAvatarR = dataUrl;
        const img   = document.getElementById(previewId);
        const empty = document.getElementById(emptyId);
        if (img)   { img.src = dataUrl; img.style.display = 'block'; }
        if (empty) empty.style.display = 'none';
    };
    fileInput.click();
}

function diaryInsertImage() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // ファイルダイアログを開く前にカーソルのコンテキストを保存
    // （ダイアログを開くと選択状態が消えるため）
    const editor = document.getElementById('diaryEditor');
    const preSel = window.getSelection();
    const savedColorboxInner = (editor && preSel && preSel.rangeCount)
        ? _getDiaryColorboxInner(preSel.getRangeAt(0).startContainer, editor)
        : null;

    fileInput.onchange = async function() {
        const file = fileInput.files[0];
        document.body.removeChild(fileInput);
        if (!file) return;

        const dataUrl = await compressImage(file, 900, 0.82);
        if (!editor) return;

        const img = document.createElement('img');
        img.src = dataUrl;
        img.className = 'diary-img';
        img.alt = '投稿画像';
        setupDiaryImage(img);

        // カラーボックス内にいた場合はそこに挿入、それ以外はエディタに挿入
        const target = savedColorboxInner || editor;
        const sel = window.getSelection();
        if (sel && sel.rangeCount && target.contains(sel.getRangeAt(0).commonAncestorContainer)) {
            const range = sel.getRangeAt(0);
            range.collapse(true);
            range.insertNode(img);
        } else {
            target.appendChild(img);
        }

        const br = _diaryInsertBrAfter(img);

        // カーソルをbrの後へ（ファイルダイアログでフォーカスが外れるので必ずfocusを戻す）
        editor.focus();
        const moveRange = document.createRange();
        if (br.nextSibling) {
            moveRange.setStartBefore(br.nextSibling);
        } else {
            moveRange.setStartAfter(br);
        }
        moveRange.collapse(true);
        const moveSel = window.getSelection();
        if (moveSel) { moveSel.removeAllRanges(); moveSel.addRange(moveRange); }

        updateDiaryCount();
    };
    fileInput.click();
}

function diaryInsertLink() {
    // 選択中テキストを保存
    diarySaveSelection();
    const sel = window.getSelection();
    const selectedText = (sel && !sel.isCollapsed) ? sel.toString() : '';

    // モーダル生成
    const overlay = document.createElement('div');
    overlay.id = 'diaryLinkOverlay';
    overlay.className = 'diary-link-overlay';
    overlay.innerHTML = `
        <div class="diary-link-box">
            <p class="diary-link-ttl">🔗 リンクを挿入</p>
            <div class="diary-link-field">
                <label class="diary-link-label">テキスト</label>
                <input class="diary-link-input" id="diaryLinkText" type="text"
                    placeholder="表示するテキスト"
                    value="${escapeHtml(selectedText)}"
                    onkeydown="if(event.key==='Enter'&&!event.isComposing){event.preventDefault();document.getElementById('diaryLinkUrl').focus();}if(event.key==='Escape')closeDiaryLinkPopup();">
            </div>
            <div class="diary-link-field">
                <label class="diary-link-label">URL</label>
                <input class="diary-link-input" id="diaryLinkUrl" type="url"
                    placeholder="https://"
                    onkeydown="if(event.key==='Enter')event.preventDefault();if(event.key==='Escape')closeDiaryLinkPopup();">
            </div>
            <div class="diary-link-btns">
                <button class="diary-link-cancel-btn" onclick="closeDiaryLinkPopup()">キャンセル</button>
                <button class="diary-link-submit-btn" onclick="submitDiaryLink()">挿入する</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // フォーカス：テキストが入ってればURL欄へ
    setTimeout(() => {
        const input = document.getElementById(selectedText ? 'diaryLinkUrl' : 'diaryLinkText');
        if (input) input.focus();
    }, 30);
}

function closeDiaryLinkPopup() {
    const overlay = document.getElementById('diaryLinkOverlay');
    if (overlay) overlay.remove();
}

function submitDiaryLink() {
    const urlInput = document.getElementById('diaryLinkUrl');
    const textInput = document.getElementById('diaryLinkText');
    if (!urlInput) return;

    const url = urlInput.value.trim();
    if (!url || url === 'https://') { urlInput.focus(); return; }
    if (/^javascript:/i.test(url)) { urlInput.focus(); return; }

    const linkText = (textInput && textInput.value.trim()) || url;

    closeDiaryLinkPopup();
    diaryRestoreSelection();
    document.execCommand('insertHTML', false,
        `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(linkText)}</a>`);
    diarySavedRange = null;
    updateDiaryCount();
}

function openDiaryPreview() {
    const editor = document.getElementById('diaryEditor');
    if (!editor) return;
    const html = editor.innerHTML;
    const titleInput = document.getElementById('diaryTitleInput');
    const title = escapeHtml((titleInput ? titleInput.value : '') || '');

    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const tagsHtml = (diaryCurrentTags && diaryCurrentTags.length > 0)
        ? `<div class="diary-post-modal-tags">${diaryCurrentTags.map(t => `<span class="diary-post-tag">#${escapeHtml(t)}</span>`).join('')}</div>`
        : '';

    let overlay = document.getElementById('diaryPreviewOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'diaryPreviewOverlay';
        overlay.className = 'diary-post-overlay';
        overlay.addEventListener('mousedown', function(e) {
            if (e.target === overlay) overlay.style.display = 'none';
        });
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div class="diary-post-modal">
            <div class="win-titlebar-facility">
                <span class="win-titlebar-facility-title">プレビュー</span>
                <div class="win-titlebar-btns">
                    <button class="win-titlebar-btn win-titlebar-facility-close" onclick="document.getElementById('diaryPreviewOverlay').style.display='none'">✕</button>
                </div>
            </div>
            <div class="diary-post-modal-body">
                <div class="diary-post-modal-datebar">
                    <p class="diary-post-modal-date">${dateStr}</p>
                </div>
                <h2 class="diary-post-modal-title">${title}</h2>
                <div class="diary-post-modal-content diary-content">${html}</div>
                ${tagsHtml ? `<hr class="diary-post-modal-rule">${tagsHtml}` : ''}
            </div>
        </div>`;
    overlay.style.display = 'flex';
}

/* ─── 定数 ──────────────────────────────────── */

// フォントサイズ px → CSS クラスのマッピング（16px=中はデフォルトなのでクラスなし）
const DIARY_SIZE_CLASSES  = ['diary-text-sm', 'diary-text-lg', 'diary-text-xl'];
const DIARY_SIZE_CLASS_MAP = { 12: 'diary-text-sm', 16: '', 20: 'diary-text-lg', 24: 'diary-text-xl' };

// ブロックにフォントサイズを適用（インラインスタイルを除去してCSSクラスで管理）
function _applyDiaryTextSize(block, px) {
    block.style.removeProperty('font-size');
    DIARY_SIZE_CLASSES.forEach(c => block.classList.remove(c));
    const cls = DIARY_SIZE_CLASS_MAP[px];
    if (cls) block.classList.add(cls);
}

const DIARY_TEXT_COLORS = [
    '#222222','#888888','#cc2222','#e07020',
    '#c8a000','#228800','#0066cc','#7733cc',
    '#cc44aa','#ffffff',
];

const DIARY_COLORBOX_COLORS = [
    '#FFE4EC', // ピンク
    '#EDE4FF', // パープル
    '#E0EEFF', // ブルー
    '#E0F5EE', // ミント
    '#FFF8D6', // イエロー
    '#FFE8D6', // オレンジ
    '#EEEDF0', // グレー
];

/* ─── 投稿カード HTML 生成（フィルター共通） ── */
function buildDiaryPostsHtml(posts) {
    if (posts.length === 0) {
        return '<p class="myhouse-diary-empty">該当する投稿がありません。</p>';
    }
    const sorted = [...posts].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.timestamp - a.timestamp;
    });
    return sorted.map(post => {
        const d = new Date(post.timestamp);
        const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
        const title = escapeHtml(post.title || '');
        // 最初の画像を抽出
        const tmp = document.createElement('div');
        tmp.innerHTML = post.html || '';
        const firstImg = tmp.querySelector('img:not(.diary-bubble-avatar)');
        const thumbSrc = firstImg ? firstImg.src : null;
        // テキストプレビュー（60文字）
        const plainText = (tmp.innerText || post.text || '').replace(/\s+/g, ' ').trim();
        const preview = escapeHtml(plainText);
        const hasMore = plainText.length > 40;
        const pinIcon = post.pinned ? '<img src="house/icon/pin.svg" class="diary-card-pin-inline" alt="pin">' : '';
        return `
            <div class="diary-card${post.pinned ? ' diary-card--pinned' : ''}" onclick="openDiaryPostModal('${post.id}')">
                <div class="diary-card-thumb">
                    ${thumbSrc ? `<img src="${thumbSrc}" alt="">` : '<div class="diary-card-noimage"></div>'}
                </div>
                <div class="diary-card-body">
                    <div class="diary-card-title-row">${pinIcon}<span class="diary-card-title">${title}</span></div>
                    <p class="diary-card-preview">${preview}</p>
                    <div class="diary-card-bottom">
                        <span class="diary-card-date">${dateStr}</span>
                        ${hasMore ? '<span class="diary-card-more">もっと読む »</span>' : ''}
                    </div>
                </div>
            </div>`;
    }).join('');
}

/* ─── 投稿詳細モーダル ──────────────────────── */
function openDiaryPostModal(id) {
    const posts = (gameState.player.house?.diary?.posts) || [];
    const post = posts.find(p => p.id === id);
    if (!post) return;

    const d = new Date(post.timestamp);
    const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const content = post.html
        ? `<div class="diary-post-modal-content diary-content">${post.html}</div>`
        : `<div class="diary-post-modal-content">${escapeHtml(post.text || '').replace(/\n/g, '<br>')}</div>`;
    const tagsHtml = (post.tags && post.tags.length > 0)
        ? `<div class="diary-post-modal-tags">${post.tags.map(t => `<span class="diary-post-tag">#${escapeHtml(t)}</span>`).join('')}</div>`
        : '';

    let overlay = document.getElementById('diaryPostModalOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'diaryPostModalOverlay';
        overlay.className = 'diary-post-overlay';
        overlay.addEventListener('mousedown', function(e) {
            if (e.target === overlay) closeDiaryPostModal();
        });
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div class="diary-post-modal">
            <div class="win-titlebar-facility">
                <span class="win-titlebar-facility-title"></span>
                <div class="win-titlebar-btns">
                    <button class="win-titlebar-btn win-titlebar-facility-close" onclick="closeDiaryPostModal()">✕</button>
                </div>
            </div>
            <div class="diary-post-modal-body">
                <div class="diary-post-modal-datebar">
                    <p class="diary-post-modal-date">${dateStr}</p>
                    <div class="diary-post-modal-actions">
                        <button class="myhouse-diary-post-pin${post.pinned ? ' is-pinned' : ''}" onclick="toggleDiaryPin('${post.id}')"><img src="house/icon/pin.svg" class="diary-pin-icon" alt="">${post.pinned ? 'ピン解除' : 'ピン留め'}</button>
                        <button class="myhouse-diary-post-edit" onclick="closeDiaryPostModal();editDiaryPost('${post.id}')">編集</button>
                        <button class="myhouse-diary-post-del" onclick="confirmDeleteDiaryPost('${post.id}')">削除</button>
                    </div>
                </div>
                <h2 class="diary-post-modal-title">${escapeHtml(post.title || '')}</h2>
                ${content}
                ${tagsHtml ? `<hr class="diary-post-modal-rule">${tagsHtml}` : ''}
            </div>
        </div>`;
    overlay.style.display = 'flex';
}

function closeDiaryPostModal() {
    const overlay = document.getElementById('diaryPostModalOverlay');
    if (overlay) overlay.style.display = 'none';
}

function toggleDiaryPin(id) {
    const posts = (gameState.player.house?.diary?.posts) || [];
    const post = posts.find(p => p.id === id);
    if (!post) return;
    if (post.pinned) {
        post.pinned = false;
    } else {
        posts.forEach(p => { p.pinned = false; });
        post.pinned = true;
    }
    saveGame(true);
    const list = document.getElementById('diaryPostList');
    if (list) list.innerHTML = buildDiaryPostsHtml(posts);
    openDiaryPostModal(id);
}

/* ─── 検索・月別フィルター ──────────────────── */
function filterDiaryBySearch(query) {
    const posts = (gameState.player.house?.diary?.posts) || [];
    const q = query.toLowerCase().trim();
    const filtered = q ? posts.filter(p =>
        (p.title || '').toLowerCase().includes(q) || (p.text || '').toLowerCase().includes(q)
    ) : posts;
    const list = document.getElementById('diaryPostList');
    if (list) list.innerHTML = buildDiaryPostsHtml(filtered);
    // 月別アクティブをリセット
    document.querySelectorAll('.diary-sub-month-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-month=""]')?.classList.add('active');
}

function filterDiaryByMonth(monthKey) {
    const posts = (gameState.player.house?.diary?.posts) || [];
    document.querySelectorAll('.diary-sub-month-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.month === monthKey)
    );
    document.querySelectorAll('.diary-sub-tag-btn').forEach(b => b.classList.remove('active'));
    const searchInput = document.querySelector('.diary-sub-search');
    if (searchInput) searchInput.value = '';

    const filtered = monthKey ? posts.filter(p => {
        const d = new Date(p.timestamp);
        return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}` === monthKey;
    }) : posts;
    const list = document.getElementById('diaryPostList');
    if (list) list.innerHTML = buildDiaryPostsHtml(filtered);
}

function filterDiaryByTag(tag) {
    const posts = (gameState.player.house?.diary?.posts) || [];
    document.querySelectorAll('.diary-sub-tag-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.tag === tag)
    );
    document.querySelectorAll('.diary-sub-month-btn').forEach(b => b.classList.remove('active'));
    const searchInput = document.querySelector('.diary-sub-search');
    if (searchInput) searchInput.value = '';

    const filtered = posts.filter(p => (p.tags || []).includes(tag));
    const list = document.getElementById('diaryPostList');
    if (list) list.innerHTML = buildDiaryPostsHtml(filtered);
}

/* ─── タグ操作（compose用） ─────────────────── */
function diaryAddTag() {
    const input = document.getElementById('diaryTagInput');
    if (!input) return;
    const tag = input.value.trim();
    if (!tag || diaryCurrentTags.includes(tag) || diaryCurrentTags.length >= 5 || tag.length > 10) return;
    diaryCurrentTags.push(tag);
    input.value = '';
    renderDiaryTagChips();
}

function diaryRemoveTag(idx) {
    diaryCurrentTags.splice(idx, 1);
    renderDiaryTagChips();
}

function renderDiaryTagChips() {
    const container = document.getElementById('diaryTagChips');
    if (!container) return;
    container.innerHTML = diaryCurrentTags.map((tag, idx) =>
        `<span class="diary-tag-chip">${escapeHtml(tag)}<button class="diary-tag-chip-del" onmousedown="event.preventDefault();diaryRemoveTag(${idx})">×</button></span>`
    ).join('');
    container.style.display = diaryCurrentTags.length > 0 ? 'flex' : 'none';
}

/* ─── サブカラム HTML 生成（一覧モード） ──────── */
function buildDiarySubColHtml() {
    const posts = (gameState.player.house?.diary?.posts) || [];

    // 月別集計
    const monthMap = {};
    posts.forEach(post => {
        const d = new Date(post.timestamp);
        const key = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}`;
        monthMap[key] = (monthMap[key] || 0) + 1;
    });
    const monthHtml = Object.entries(monthMap)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([key, count]) =>
            `<button class="diary-sub-month-btn" data-month="${key}" onclick="filterDiaryByMonth('${key}')">${key} <span class="diary-sub-count">${count}</span></button>`
        ).join('');

    // タグ集計
    const tagMap = {};
    posts.forEach(p => (p.tags || []).forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }));
    const tagHtml = Object.entries(tagMap)
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) =>
            `<button class="diary-sub-tag-btn" data-tag="${escapeHtml(tag)}" onclick="filterDiaryByTag('${escapeHtml(tag)}')">${escapeHtml(tag)} <span class="diary-sub-count">${count}</span></button>`
        ).join('');

    return `
        <div class="diary-sub-section">
            <p class="diary-sub-label">検索</p>
            <input class="diary-sub-search" type="text" placeholder="キーワード..." oninput="filterDiaryBySearch(this.value)">
        </div>
        <div class="diary-sub-section">
            <p class="diary-sub-label">月別</p>
            <div class="diary-sub-months">
                <button class="diary-sub-month-btn active" data-month="" onclick="filterDiaryByMonth('')">すべて <span class="diary-sub-count">${posts.length}</span></button>
                ${monthHtml}
            </div>
        </div>
        ${tagHtml ? `
        <div class="diary-sub-section">
            <p class="diary-sub-label">タグ</p>
            <div class="diary-sub-tag-list">${tagHtml}</div>
        </div>` : ''}`
;}

/* ─── 投稿一覧（2カラムレイアウト） ─────────── */
function renderDiaryContent(container) {
    const backBtn = document.getElementById('diaryComposeBackBtn');
    if (backBtn) backBtn.style.display = 'none';

    const diary = (gameState.player.house && gameState.player.house.diary) || {};
    const posts = diary.posts || [];

    container.innerHTML = `
        <div class="myhouse-diary-wrap">
            <div class="myhouse-diary-header">
                <button class="myhouse-diary-draft-list-btn" onclick="renderDiaryDraftList()">下書き一覧</button>
                <button class="myhouse-diary-compose-btn" onclick="openDiaryCompose('','',true)">新しい投稿</button>
            </div>
            <div class="myhouse-diary-layout">
                <div class="myhouse-diary-posts-col">
                    <div class="myhouse-diary-list" id="diaryPostList">
                        ${posts.length === 0
                            ? '<p class="myhouse-diary-empty">まだ投稿がありません。</p>'
                            : buildDiaryPostsHtml(posts)}
                    </div>
                </div>
                <div class="myhouse-diary-sub-col">
                    ${buildDiarySubColHtml()}
                </div>
            </div>
        </div>`;
}

/* ─── 投稿フォーム ──────────────────────────── */
function openDiaryCompose(initialHtml = '', initialTitle = '', ignoreDraft = false, draftId = null) {
    const container = document.getElementById('myhouseRight');
    const isEdit = !!diaryEditId;
    diaryHistoryInit();
    _diaryCurFontSize = 16;
    if (!isEdit) {
        diaryBubbleAvatarL = null;
        diaryBubbleAvatarR = null;
        diaryEditDraftId = draftId;
    }

    // タグ初期化（編集時は既存タグを読み込む）
    diaryCurrentTags = isEdit
        ? [...((gameState.player.house.diary?.posts?.find(p => p.id === diaryEditId)?.tags) || [])]
        : [];

    const colorSwatches = DIARY_TEXT_COLORS.map(c =>
        `<button class="diary-sb-swatch" style="background:${c}" onmousedown="event.preventDefault();diarySetColor('${c}')"></button>`
    ).join('');

    // タイトルバーの戻るボタンを表示
    const backBtn = document.getElementById('diaryComposeBackBtn');
    if (backBtn) backBtn.style.display = '';

    container.innerHTML = `
        <div class="myhouse-diary-wrap">
            <div class="myhouse-diary-layout">
                <!-- 左：エディタ -->
                <div class="myhouse-diary-posts-col">
                    <div class="myhouse-diary-compose">
                        <div class="myhouse-diary-compose-body">
                            <input id="diaryTitleInput" class="myhouse-diary-title-input" type="text"
                                placeholder="タイトルを入力..." maxlength="50" value="${escapeHtml(initialTitle)}">
                            <div id="diaryEditor" class="myhouse-diary-editor diary-content" contenteditable="true"
                                oninput="updateDiaryCount()"></div>
                            <div class="diary-tag-bar">
                                <span class="diary-tag-bar-icon">🏷</span>
                                <input class="diary-tag-bar-input" id="diaryTagInput" placeholder="タグを追加..." maxlength="10"
                                    onkeydown="if(event.key==='Enter'&&!event.isComposing){event.preventDefault();diaryAddTag();}">
                                <span class="diary-tag-bar-hint">10文字以内・5個まで</span>
                            </div>
                            <div class="diary-tag-chips" id="diaryTagChips" style="display:none"></div>
                            <div class="myhouse-diary-count-row">
                                <div class="myhouse-diary-count-left">
                                    <button class="myhouse-diary-preview-btn" onclick="openDiaryPreview()">プレビュー</button>
                                    <span class="myhouse-diary-count"><span id="diaryCharCount">0</span> / 3000</span>
                                </div>
                                <div class="myhouse-diary-count-right">
                                    ${!isEdit ? '<button class="myhouse-diary-draft-btn" onclick="saveDiaryDraft()">下書き保存</button>' : ''}
                                    <button class="myhouse-diary-submit-btn" onclick="submitDiaryPost()">${isEdit ? '更新する' : '投稿する'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- 右：書式・挿入・タグパネル -->
                <div class="myhouse-diary-sub-col diary-compose-sidebar">
                    <!-- 操作 -->
                    <div class="diary-sb-section">
                        <p class="diary-sb-section-title">操作</p>
                        <div class="diary-sb-row">
                            <button class="diary-sb-btn diary-sb-undo-btn" onmousedown="event.preventDefault();diaryHistoryUndo()">↩ 1つ戻る</button>
                            <button class="diary-sb-btn diary-sb-undo-btn" onmousedown="event.preventDefault();diaryHistoryRedo()">↪ 1つ進む</button>
                        </div>
                    </div>
                    <!-- 書式 -->
                    <div class="diary-sb-section">
                        <p class="diary-sb-section-title">書式</p>
                        <div class="diary-sb-row">
                            <select id="diaryFontSelect" class="diary-sb-font-select" style="display:none"
                                onmousedown="diarySaveSelection()"
                                onchange="diarySetFont(this.value)">
                                <option value="">デフォルト</option>
                                <option value="serif">明朝体</option>
                                <option value="monospace">等幅</option>
                                <option value="cursive">手書き風</option>
                            </select>
                            <div class="diary-sb-color-wrap">
                                <button class="diary-sb-btn" onmousedown="event.preventDefault();diaryToggleSbColorPicker()" title="文字色">
                                    <span id="diaryColorIndicator" class="diary-sb-color-indicator"></span>
                                </button>
                                <div class="diary-sb-color-popup" id="diaryColorPopup" style="display:none">${colorSwatches}</div>
                            </div>
                            <button class="diary-sb-btn diary-sb-bold" onmousedown="event.preventDefault();diaryExec('bold')" title="太字">B</button>
                            <button class="diary-sb-btn diary-sb-marker-btn" onmousedown="event.preventDefault();diaryToggleMarker()" title="マーカー">
                                <img src="house/icon/Marker.png" class="diary-sb-marker-icon" alt="マーカー">
                            </button>
                        </div>
                        <p class="diary-sb-label">サイズ</p>
                        <div class="diary-sb-row">
                            <button class="diary-sb-btn diary-sb-size2-btn" data-size="12" onmousedown="event.preventDefault();diarySetSizeV2(12)">小</button>
                            <button class="diary-sb-btn diary-sb-size2-btn active" data-size="16" onmousedown="event.preventDefault();diarySetSizeV2(16)">中</button>
                            <button class="diary-sb-btn diary-sb-size2-btn" data-size="20" onmousedown="event.preventDefault();diarySetSizeV2(20)">大</button>
                            <button class="diary-sb-btn diary-sb-size2-btn" data-size="24" onmousedown="event.preventDefault();diarySetSizeV2(24)">特大</button>
                        </div>
                        <p class="diary-sb-label">揃え</p>
                        <div class="diary-sb-row">
                            <button class="diary-sb-btn" onmousedown="event.preventDefault();diaryExec('justifyLeft')" title="左揃え">⇤</button>
                            <button class="diary-sb-btn" onmousedown="event.preventDefault();diaryExec('justifyCenter')" title="中央揃え">⇔</button>
                            <button class="diary-sb-btn" onmousedown="event.preventDefault();diaryExec('justifyRight')" title="右揃え">⇥</button>
                        </div>
                    </div>
                    <!-- 挿入 -->
                    <div class="diary-sb-section diary-sb-last">
                        <p class="diary-sb-section-title">挿入</p>
                        <p class="diary-sb-label">吹き出し</p>
                        <div class="diary-sb-bubble-grid">
                            <div class="diary-sb-avatar-slot" onclick="diarySetBubbleAvatar('left')" title="クリックしてアイコンを登録">
                                <img id="diaryAvatarPreviewL" class="diary-sb-avatar-img" style="display:none">
                                <span id="diaryAvatarEmptyL" class="diary-sb-avatar-placeholder">＋</span>
                            </div>
                            <div class="diary-sb-row diary-sb-bubble-btns">
                                <button class="diary-sb-insert-btn diary-sb-bubble-insert" onmousedown="event.preventDefault();diaryInsertBubble('left')">左側</button>
                                <button class="diary-sb-insert-btn diary-sb-bubble-insert" onmousedown="event.preventDefault();diaryInsertBubble('right')">右側</button>
                            </div>
                            <div class="diary-sb-avatar-slot" onclick="diarySetBubbleAvatar('right')" title="クリックしてアイコンを登録">
                                <img id="diaryAvatarPreviewR" class="diary-sb-avatar-img" style="display:none">
                                <span id="diaryAvatarEmptyR" class="diary-sb-avatar-placeholder">＋</span>
                            </div>
                        </div>
                        <p class="diary-sb-label">添付</p>
                        <div class="diary-sb-row">
                            <button class="diary-sb-insert-btn" style="flex:1" onclick="diaryInsertImage()">🖼 画像</button>
                            <button class="diary-sb-insert-btn" style="flex:1" onclick="diaryInsertLink()">🔗 リンク</button>
                        </div>
                        <p class="diary-sb-label">区切り線</p>
                        <div class="diary-sb-row">
                            <button class="diary-sb-insert-btn diary-sb-hr-btn" onmousedown="event.preventDefault();diaryInsertHr('solid')"><span style="display:block;width:80%;border-top:1px solid #ddd;margin:0 auto"></span></button>
                            <button class="diary-sb-insert-btn diary-sb-hr-btn" onmousedown="event.preventDefault();diaryInsertHr('dashed')"><span style="display:block;width:80%;height:1.5px;background-image:repeating-linear-gradient(to right,#999 0,#999 6px,transparent 6px,transparent 10px);background-size:100% 1.5px;background-repeat:no-repeat;margin:0 auto"></span></button>
                            <button class="diary-sb-insert-btn diary-sb-hr-btn" onmousedown="event.preventDefault();diaryInsertHr('dotted')"><span style="display:block;width:80%;height:4px;background-image:radial-gradient(circle,#f0d5b3 2px,transparent 2px);background-size:8px 4px;background-repeat:repeat-x;margin:0 auto"></span></button>
                        </div>
                        <p class="diary-sb-label">カラーボックス</p>
                        <div class="diary-sb-cb-palette">
                            ${DIARY_COLORBOX_COLORS.map(c =>
                                `<button class="diary-sb-cb-swatch" style="background:${c}" title="${c}"
                                    onmousedown="event.preventDefault();diaryInsertColorbox('${c}')"></button>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

    const editor = document.getElementById('diaryEditor');
    if (initialHtml) {
        editor.innerHTML = initialHtml;
        editor.querySelectorAll('.diary-bubble-inner').forEach(el => setupDiaryBubbleInner(el));
        editor.querySelectorAll('.diary-img').forEach(el => setupDiaryImage(el));
        editor.querySelectorAll('.diary-colorbox-inner').forEach(el => setupDiaryColorbox(el));

        // 編集時：既存の吹き出しアバターをサイドバーに復元
        if (isEdit) {
            const leftAvatarImg  = editor.querySelector('.diary-bubble-l .diary-bubble-avatar');
            const rightAvatarImg = editor.querySelector('.diary-bubble-r .diary-bubble-avatar');
            if (leftAvatarImg)  diaryBubbleAvatarL = leftAvatarImg.src;
            if (rightAvatarImg) diaryBubbleAvatarR = rightAvatarImg.src;

            const prevL = document.getElementById('diaryAvatarPreviewL');
            const emptyL = document.getElementById('diaryAvatarEmptyL');
            if (diaryBubbleAvatarL && prevL && emptyL) {
                prevL.src = diaryBubbleAvatarL;
                prevL.style.display = 'block';
                emptyL.style.display = 'none';
            }
            const prevR = document.getElementById('diaryAvatarPreviewR');
            const emptyR = document.getElementById('diaryAvatarEmptyR');
            if (diaryBubbleAvatarR && prevR && emptyR) {
                prevR.src = diaryBubbleAvatarR;
                prevR.style.display = 'block';
                emptyR.style.display = 'none';
            }
        }
    }

    diaryHistoryObserve();
    diaryHistorySave(); // 初期状態を履歴の起点として保存

    // ── ペースト：プレーンテキストをMarkdown変換してDOMに直接挿入 ──
    editor.addEventListener('paste', function(e) {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain') || '';

        // 各行をDOMノードに変換
        // ※ h1/h2/h3/hr タグはContentEditable正規化で消えることがあるため
        //   div + CSSクラスで見出し・区切り線を表現する
        const tmp = document.createElement('div');
        text.split('\n').forEach(function(line) {
            const t = line.trim();
            const node = document.createElement('div');
            if      (/^#{4,}\s/.test(t)) { node.className = 'diary-md-h3'; node.textContent = t.replace(/^#{4,}\s+/, ''); }
            else if (/^#{3}\s/.test(t)) { node.className = 'diary-md-h3'; node.textContent = t.replace(/^#{3}\s+/, ''); }
            else if (/^#{2}\s/.test(t)) { node.className = 'diary-md-h2'; node.textContent = t.replace(/^#{2}\s+/, ''); }
            else if (/^#\s/.test(t))    { node.className = 'diary-md-h1'; node.textContent = t.replace(/^#\s+/, ''); }
            else if (/^[-*_]{3,}$/.test(t)) { node.className = 'diary-md-hr'; node.innerHTML = '<br>'; }
            else {
                // インライン Markdown 変換（太字・斜体・コード・箇条書き）
                let l = escapeHtml(line);
                // サブ箇条書き（2つ以上のスペース + * item）
                const subMatch = line.match(/^(\s{2,})\* (.*)/);
                if (subMatch) {
                    node.className = 'diary-md-li-sub';
                    node.innerHTML = '・ ' + escapeHtml(subMatch[2]);
                } else {
                    if (/^\* /.test(l)) l = '・ ' + l.slice(2);       // * item → ・ item
                    else if (/^- /.test(l)) l = '・ ' + l.slice(2); // - item → ・ item
                    l = l.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>');
                    l = l.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
                    l = l.replace(/\*([^*\n]+?)\*/g,  '<i>$1</i>');
                    l = l.replace(/`([^`\n]+?)`/g,    '<code>$1</code>');
                    node.innerHTML = l || '<br>';
                }
            }
            tmp.appendChild(node);
        });

        // Range API でカーソル位置に挿入
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) { updateDiaryCount(); return; }
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const frag = document.createDocumentFragment();
        while (tmp.firstChild) frag.appendChild(tmp.firstChild);
        range.insertNode(frag);
        sel.collapseToEnd();

        updateDiaryCount();
    });

    // ── Backspace/Delete：吹き出しを BR ごとスムーズに削除 ──
    editor.addEventListener('keydown', function(e) {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;

        if (e.key !== 'Backspace' && e.key !== 'Delete') return;
        if (!sel.isCollapsed) return;
        const { startContainer, startOffset } = sel.getRangeAt(0);

        // カーソルがカラーボックス内にあるなら、エディタレベルの削除処理はスキップ
        // （内側のkeydownハンドラで処理する）
        if (_getDiaryColorboxInner(startContainer, editor)) return;

        function isBubble(n) {
            return n && n.nodeType === 1 &&
                   (n.classList.contains('diary-bubble-l') || n.classList.contains('diary-bubble-r'));
        }
        function isColorbox(n) {
            return n && n.nodeType === 1 && n.classList.contains('diary-colorbox');
        }
        function isImg(n) {
            return n && n.nodeType === 1 && n.classList.contains('diary-img');
        }
        function prevNode() {
            if (startContainer.nodeType === 3 && startOffset === 0) {
                // テキストノードの先頭：前の兄弟があればそれを返す
                if (startContainer.previousSibling) return startContainer.previousSibling;
                // テキストノードが親ブロックの最初の子 → 親ブロックの前の兄弟を返す
                // （Chromeがtyping時に自動生成したdiv内にカーソルがある場合の対応）
                const parent = startContainer.parentNode;
                if (parent && parent !== editor) return parent.previousSibling;
                return null;
            }
            if (startContainer.nodeType === 1 && startOffset > 0) return startContainer.childNodes[startOffset - 1];
            if (startContainer.nodeType === 1 && startOffset === 0) return startContainer.previousSibling;
            return null;
        }
        function nextNode() {
            if (startContainer.nodeType === 3 && startOffset === startContainer.length) return startContainer.nextSibling;
            if (startContainer.nodeType === 1) return startContainer.childNodes[startOffset] || null;
            return null;
        }

        if (e.key === 'Backspace') {
            const p = prevNode();
            if (isBubble(p)) {
                // 直前が吹き出し → 後続BRも含めて削除
                e.preventDefault();
                if (p.nextSibling && p.nextSibling.nodeName === 'BR') p.nextSibling.remove();
                p.remove();
                updateDiaryCount();
            } else if (p && p.nodeName === 'BR' && isBubble(p.previousSibling)) {
                // 直前がBR・その前が吹き出し → まとめて削除
                e.preventDefault();
                const bubble = p.previousSibling;
                p.remove();
                bubble.remove();
                updateDiaryCount();
            } else if (isColorbox(p)) {
                // 直前がカラーボックス → 後続BRも含めて削除
                e.preventDefault();
                if (p.nextSibling && p.nextSibling.nodeName === 'BR') p.nextSibling.remove();
                p.remove();
                updateDiaryCount();
            } else if (p && p.nodeName === 'BR' && isColorbox(p.previousSibling)) {
                // 直前がBR・その前がカラーボックス → BRのみ削除（カラーボックスは残す）
                e.preventDefault();
                p.remove();
                updateDiaryCount();
            } else if (isImg(p)) {
                // 直前が画像 → 画像を削除
                e.preventDefault();
                p.remove();
                updateDiaryCount();
            } else if (p && p.nodeName === 'BR' && isImg(p.previousSibling)) {
                // 直前がBR・その前が画像 → BR＋画像をまとめて削除
                e.preventDefault();
                const imgEl = p.previousSibling;
                p.remove();
                imgEl.remove();
                updateDiaryCount();
            }
        } else if (e.key === 'Delete') {
            const n = nextNode();
            if (isBubble(n)) {
                e.preventDefault();
                if (n.nextSibling && n.nextSibling.nodeName === 'BR') n.nextSibling.remove();
                n.remove();
                updateDiaryCount();
            } else if (isColorbox(n)) {
                // カーソルの直前がBR（カラーボックスの出口行）の場合 → BRのみ削除
                const prevEl = startContainer.nodeType === 1 && startOffset > 0
                    ? startContainer.childNodes[startOffset - 1] : null;
                if (prevEl && prevEl.nodeName === 'BR') {
                    e.preventDefault();
                    prevEl.remove();
                    updateDiaryCount();
                } else {
                    // 直後がカラーボックス（カーソルが直接隣接） → 後続BRも含めて削除
                    e.preventDefault();
                    if (n.nextSibling && n.nextSibling.nodeName === 'BR') n.nextSibling.remove();
                    n.remove();
                    updateDiaryCount();
                }
            } else if (isImg(n)) {
                // 直後が画像 → 画像のみ削除（後続BRは次のDeleteで消せる）
                e.preventDefault();
                n.remove();
                updateDiaryCount();
            }
        }
    });

    // selectionchange：カーソル移動のたびにツールバーのON/OFF状態を同期
    if (_diarySelChangeHandler) {
        document.removeEventListener('selectionchange', _diarySelChangeHandler);
    }
    _diarySelChangeHandler = function() {
        const ed = document.getElementById('diaryEditor');
        if (!ed) {
            // エディターがDOMから消えたらリスナーを自動解除
            document.removeEventListener('selectionchange', _diarySelChangeHandler);
            _diarySelChangeHandler = null;
            return;
        }
        updateDiaryToolbarState();
    };
    document.addEventListener('selectionchange', _diarySelChangeHandler);

    // 新規・空エディタのとき: 最初の行を <div> で確保し、
    // カーソルをその中に明示的に置くことで diarySetFontSize が確実に動くようにする
    if (!initialHtml) {
        let firstDiv = editor.firstChild;
        if (!firstDiv || firstDiv.nodeName !== 'DIV') {
            firstDiv = document.createElement('div');
            editor.insertBefore(firstDiv, editor.firstChild);
        }
        editor.focus();
        const r = document.createRange();
        r.setStart(firstDiv, 0);
        r.collapse(true);
        const s = window.getSelection();
        if (s) { s.removeAllRanges(); s.addRange(r); }
    } else {
        editor.focus();
    }
    updateDiaryCount();
    renderDiaryTagChips();
}

function updateDiaryCount() {
    const editor = document.getElementById('diaryEditor');
    const count = document.getElementById('diaryCharCount');
    if (editor && count) {
        const len = (editor.innerText || '').replace(/\n$/, '').length;
        count.textContent = len;
        count.style.color = len > 2700 ? '#e05020' : '';
    }
}

function updateDiaryToolbarState() {
    const editor = document.getElementById('diaryEditor');
    if (!editor) return;

    // カーソルがエディター内にあるときだけ更新する
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    if (!editor.contains(sel.getRangeAt(0).commonAncestorContainer)) return;

    // 太字ボタン
    const boldBtn = document.querySelector('.diary-sb-bold');
    if (boldBtn) boldBtn.classList.toggle('active', document.queryCommandState('bold'));
}

function editDiaryPost(id) {
    const posts = (gameState.player.house.diary || {}).posts || [];
    const post = posts.find(p => p.id === id);
    if (!post) return;
    diaryEditId = id;
    diaryCurrentTags = post.tags ? [...post.tags] : [];
    // html（リッチ）があればそのまま、なければプレーンテキストをHTMLに変換
    openDiaryCompose(post.html || escapeHtml(post.text || '').replace(/\n/g, '<br>'), post.title || '');
}

// エディタのDOMをクローンして contenteditable を除去し、HTMLを返す
function _diaryCloneEditorHtml(editor) {
    const clone = editor.cloneNode(true);
    clone.querySelectorAll('.diary-bubble-inner, .diary-colorbox-inner').forEach(el => el.removeAttribute('contenteditable'));
    return clone.innerHTML.replace(/\u200B/g, '');
}

function saveDiaryDraft() {
    closeBubblePopup();
    const editor = document.getElementById('diaryEditor');
    if (!editor || !gameState.player.house) return;
    if (!gameState.player.house.diary) gameState.player.house.diary = {};
    const titleInput = document.getElementById('diaryTitleInput');
    const title = titleInput ? titleInput.value : '';
    const draftHtml = _diaryCloneEditorHtml(editor);
    const drafts = _getDiaryDrafts();

    if (diaryEditDraftId) {
        const idx = drafts.findIndex(d => d.id === diaryEditDraftId);
        if (idx >= 0) {
            drafts[idx] = { id: diaryEditDraftId, html: draftHtml, title, savedAt: Date.now() };
        } else {
            diaryEditDraftId = null;
        }
    }
    if (!diaryEditDraftId) {
        if (drafts.length >= 3) {
            _pendingDraftSave = { html: draftHtml, title };
            renderDiaryDraftList(true);
            return;
        }
        const newId = Date.now();
        drafts.push({ id: newId, html: draftHtml, title, savedAt: newId });
        diaryEditDraftId = newId;
    }

    gameState.player.house.diary.drafts = drafts;
    saveGame(true);

    const btn = document.querySelector('.myhouse-diary-draft-btn');
    if (btn) {
        btn.textContent = '保存しました ✓';
        btn.disabled = true;
        setTimeout(() => { if (btn) { btn.textContent = '下書き保存'; btn.disabled = false; } }, 1800);
    }
}

function renderDiaryDraftList(saveMode = false) {
    let overlay = document.getElementById('diaryDraftListOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'diaryDraftListOverlay';
        overlay.className = 'diary-post-overlay';
        overlay.addEventListener('mousedown', function(e) {
            if (e.target === overlay) closeDiaryDraftList();
        });
        document.body.appendChild(overlay);
    }

    const drafts = _getDiaryDrafts();
    const desc = saveMode
        ? '下書き保存できる記事は３件までです。削除する記事を選んでください。'
        : '下書き保存できる記事は３件までです。';

    const itemsHtml = drafts.length === 0
        ? '<p class="myhouse-diary-empty" style="margin:16px 0">下書きはありません。</p>'
        : drafts.map(d => {
            const dateStr = new Date(d.savedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const title = escapeHtml(d.title || 'タイトルなし');
            const actionBtns = saveMode
                ? `<button class="myhouse-diary-draft-del-btn myhouse-diary-draft-delsave-btn" onclick="deleteDraftAndSave(${d.id})">削除する</button>`
                : `<button class="myhouse-diary-draft-open-btn" onclick="closeDiaryDraftList();openDiaryFromDraft(${d.id})">開く</button>
                   <button class="myhouse-diary-draft-del-btn" onclick="deleteDiaryDraft(${d.id})">削除</button>`;
            return `<div class="myhouse-diary-draft-item">
                <div class="myhouse-diary-draft-info">
                    <span class="myhouse-diary-draft-title">${title}</span>
                    <span class="myhouse-diary-draft-date">${dateStr}</span>
                </div>
                <div class="myhouse-diary-draft-actions">
                    ${actionBtns}
                </div>
            </div>`;
        }).join('');

    overlay.innerHTML = `
        <div class="diary-post-modal diary-draft-list-modal">
            <div class="win-titlebar-facility">
                <span class="win-titlebar-facility-title">下書き一覧</span>
                <div class="win-titlebar-btns">
                    <button class="win-titlebar-btn win-titlebar-facility-close" onclick="closeDiaryDraftList()">✕</button>
                </div>
            </div>
            <div class="diary-draft-list-body">
                <p class="myhouse-diary-draft-list-desc">${desc}</p>
                ${itemsHtml}
            </div>
        </div>`;
    overlay.style.display = 'flex';
}

function closeDiaryDraftList() {
    const overlay = document.getElementById('diaryDraftListOverlay');
    if (overlay) overlay.style.display = 'none';
    _pendingDraftSave = null;
}

function deleteDraftAndSave(draftId) {
    const diary = gameState.player.house?.diary;
    if (!diary || !diary.drafts) return;
    diary.drafts = diary.drafts.filter(d => d.id !== draftId);

    // 保留中の内容を新しい下書きとして保存
    if (_pendingDraftSave) {
        const newId = Date.now();
        if (!diary.drafts) diary.drafts = [];
        diary.drafts.push({ id: newId, html: _pendingDraftSave.html, title: _pendingDraftSave.title, savedAt: newId });
        diaryEditDraftId = newId;
        _pendingDraftSave = null;
    }

    saveGame(true);
    closeDiaryDraftList();
    showToast('下書きを保存しました。');
}

function openDiaryFromDraft(draftId) {
    const drafts = _getDiaryDrafts();
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return;
    diaryEditId = null;
    openDiaryCompose(draft.html, draft.title, true, draftId);
}

function deleteDiaryDraft(draftId) {
    if (!confirm('この下書きを削除しますか？')) return;
    const diary = gameState.player.house?.diary;
    if (!diary || !diary.drafts) return;
    diary.drafts = diary.drafts.filter(d => d.id !== draftId);
    saveGame(true);
    renderDiaryDraftList(); // モーダル内を再描画
}

function submitDiaryPost() {
    closeBubblePopup();
    const editor = document.getElementById('diaryEditor');
    if (!editor) return;
    const titleInput = document.getElementById('diaryTitleInput');
    const title = titleInput ? titleInput.value.trim() : '';
    if (!title) { alert('タイトルを入力してください。'); titleInput && titleInput.focus(); return; }
    // 保存前に吹き出し・カラーボックス内の contenteditable 属性を除去
    const html = _diaryCloneEditorHtml(editor);
    const text = (editor.innerText || '').replace(/\u200B/g, '').trim();
    if (!text) return;
    if (text.length > 3000) { alert('3000文字以内で入力してください。'); return; }

    if (!gameState.player.house.diary) gameState.player.house.diary = {};
    if (!gameState.player.house.diary.posts) gameState.player.house.diary.posts = [];

    if (diaryEditId) {
        const idx = gameState.player.house.diary.posts.findIndex(p => p.id === diaryEditId);
        if (idx !== -1) {
            gameState.player.house.diary.posts[idx].title = title;
            gameState.player.house.diary.posts[idx].html = html;
            gameState.player.house.diary.posts[idx].text = text;
            gameState.player.house.diary.posts[idx].tags = [...diaryCurrentTags];
            gameState.player.house.diary.posts[idx].editedAt = Date.now();
        }
        diaryEditId = null;
    } else {
        const post = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
            title, html, text,
            tags: [...diaryCurrentTags],
            timestamp: Date.now()
        };
        gameState.player.house.diary.posts.push(post);
        if (gameState.player.house.diary.posts.length > 50) gameState.player.house.diary.posts.shift();
        // 投稿元の下書きを削除
        if (diaryEditDraftId && gameState.player.house.diary.drafts) {
            gameState.player.house.diary.drafts = gameState.player.house.diary.drafts.filter(d => d.id !== diaryEditDraftId);
        }
        diaryEditDraftId = null;
    }
    diaryCurrentTags = [];

    saveGame(true);
    closeDiaryPickers();
    renderDiaryContent(document.getElementById('myhouseRight'));
}

function confirmDeleteDiaryPost(id) {
    let overlay = document.getElementById('diaryDeleteConfirmOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'diaryDeleteConfirmOverlay';
        overlay.className = 'diary-post-overlay';
        overlay.addEventListener('mousedown', function(e) {
            if (e.target === overlay) closeDiaryDeleteConfirm();
        });
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div class="diary-post-modal diary-confirm-modal">
            <div class="win-titlebar-facility">
                <span class="win-titlebar-facility-title"></span>
                <div class="win-titlebar-btns">
                    <button class="win-titlebar-btn win-titlebar-facility-close" onclick="closeDiaryDeleteConfirm()">✕</button>
                </div>
            </div>
            <div class="diary-confirm-body">
                <p class="diary-confirm-text">この投稿を削除しますか？</p>
                <p class="diary-confirm-sub">削除した投稿は元に戻せません。</p>
                <div class="diary-confirm-btns">
                    <button class="diary-confirm-delete" onclick="closeDiaryDeleteConfirm();closeDiaryPostModal();deleteDiaryPost('${id}')">削除する</button>
                    <button class="diary-confirm-cancel" onclick="closeDiaryDeleteConfirm()">キャンセル</button>
                </div>
            </div>
        </div>`;
    overlay.style.display = 'flex';
}

function closeDiaryDeleteConfirm() {
    const overlay = document.getElementById('diaryDeleteConfirmOverlay');
    if (overlay) overlay.style.display = 'none';
}

function deleteDiaryPost(id) {
    if (!gameState.player.house || !gameState.player.house.diary) return;
    gameState.player.house.diary.posts = gameState.player.house.diary.posts.filter(p => p.id !== id);
    saveGame(true);
    renderDiaryContent(document.getElementById('myhouseRight'));
}

function saveDiarySetting() {
    if (!gameState.player.house) return;
    if (!gameState.player.house.diary) gameState.player.house.diary = {};
    const checked = document.querySelector('input[name="diaryVisibility"]:checked');
    if (checked) gameState.player.house.diary.visibility = checked.value;
    saveGame(true);

    const btn = document.getElementById('diarySaveBtn');
    if (btn) {
        const orig = btn.textContent;
        btn.textContent = '保存しました';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
    }
}


