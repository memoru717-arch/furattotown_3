// ============================================
// ふらっとタウン - お絵かき掲示板
// ============================================

// --- ギャラリータブ ---
let oekakiCurrentTab = 'all';

function switchOekakiTab(tab) {
    oekakiCurrentTab = tab;
    ['all', 'mine', 'bookmark'].forEach(t => {
        const idMap = { all: 'oekakiTabAll', mine: 'oekakiTabMine', bookmark: 'oekakiTabBookmark' };
        document.getElementById(idMap[t])?.classList.toggle('active', t === tab);
    });
    renderOekakiGallery();
}

// --- 状態管理 ---
const oekaki = {
    tool: 'pencil',
    size: 'medium',
    fgColor: '#000000',
    palette: 'normal',
    zoom: 1,
    isDrawing: false,
    lastX: 0,
    lastY: 0,
};

// --- 描画履歴（Undo/Redo） ---
const oekakiHistory = {
    states:   [],
    index:    -1,
    maxSteps: 20,
};

// --- ブラシサイズ定義 ---
const PENCIL_SIZES   = { small: 2,  medium: 5,  large: 13 };
const ERASER_SIZES   = { small: 8,  medium: 18, large: 32 };
const AIRBRUSH_RADII = { small: 12, medium: 22, large: 38 };

// --- カラーパレット定義（1行 × 16色）---
// ノーマルを基準に、同じ色相でパステル（淡く）・ディープ（暗く）を揃えた配置
const OEKAKI_PALETTES = {
    //           白         赤         橙赤       橙         琥珀       黄         緑         ティール
    pastel: [
        '#FFFFFF','#FFB3B3','#FFD0B8','#FFE0B8','#FFF0BB','#FFFFBB','#BBFFBB','#BBFFE8',
        '#BBE8FF','#BBCCFF','#CCBBFF','#E8BBFF','#FFBBFF','#FFBBDD','#DDCCAA','#AAAAAA',
    //           空         青         藍         紫         マゼンタ   ピンク     茶         グレー
    ],
    normal: [
        '#FFFFFF','#FF0000','#FF6600','#FF9900','#FFCC00','#FFFF00','#00CC00','#00FFCC',
        '#00CCFF','#0066FF','#3300FF','#9900FF','#FF00FF','#FF0066','#804000','#000000',
    ],
    // くすみカラー：中彩度・グレイッシュで落ち着いた色味
    deep: [
        '#F0EDE8','#C47A7A','#C4896A','#C4A06A','#C4B56A','#C4C47A','#7AAA7A','#7AAAA0',
        '#7AAAC4','#7A8AC4','#8A7AC4','#A07AC4','#C47AC4','#C47A9A','#9A7A5A','#555555',
    ],
};

// ============================================
// モーダル開閉
// ============================================

function openOekakiBoard() {
    document.getElementById('oekakiModal').classList.add('active');
    renderOekakiGallery();
}

function closeOekakiModal() {
    document.getElementById('oekakiModal').classList.remove('active');
    document.getElementById('oekakiPaintModal').classList.remove('active');
    oekaki.isDrawing = false;
}

function openOekakiEditor() {
    document.getElementById('oekakiPaintModal').classList.add('active');
    initOekakiCanvas();
}

function closePaintModal() {
    document.getElementById('oekakiPaintModal').classList.remove('active');
    oekaki.isDrawing = false;
    oekakiEditingId  = null;
    renderOekakiGallery();
}

// 後方互換のために残す
function showOekakiGallery() {
    closePaintModal();
}

// ============================================
// キャンバス初期化
// ============================================

function initOekakiCanvas() {
    const canvas = document.getElementById('oekakiCanvas');

    // 状態リセット
    oekaki.tool      = 'pencil';
    oekaki.size      = 'medium';
    oekaki.fgColor   = '#000000';
    oekaki.palette   = 'normal';
    oekaki.zoom      = 1;
    oekaki.isDrawing = false;

    // 履歴リセット
    oekakiHistory.states = [];
    oekakiHistory.index  = -1;

    // マウスイベントを登録（再登録を防ぐためにクローン）
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);

    // クローン後に白塗り（cloneNodeはcanvasの描画内容を引き継がないため）
    const ctx = newCanvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);

    // 初期状態を履歴に保存
    const initSnapshot = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
    oekakiHistory.states.push(initSnapshot);
    oekakiHistory.index = 0;

    applyOekakiZoom();
    updateOekakiToolUI();
    updateOekakiSizeUI();
    selectOekakiPalette('normal');
    updateUndoRedoUI();

    newCanvas.addEventListener('mousedown',  onOekakiMouseDown);
    newCanvas.addEventListener('click',      onOekakiClick);
    newCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ============================================
// マウスイベント
// ============================================

function getOekakiCanvasPos(e, clamp) {
    const canvas = document.getElementById('oekakiCanvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    let x = Math.floor((e.clientX - rect.left) * scaleX);
    let y = Math.floor((e.clientY - rect.top)  * scaleY);
    if (clamp) {
        x = Math.max(0, Math.min(canvas.width  - 1, x));
        y = Math.max(0, Math.min(canvas.height - 1, y));
    }
    return { x, y };
}

function onOekakiMouseDown(e) {
    if (e.button !== 0) return;
    const pos = getOekakiCanvasPos(e);

    if (oekaki.tool === 'fill') {
        floodFill(pos.x, pos.y, oekaki.fgColor);
        saveOekakiState(); // 塗りつぶし後に保存
        return;
    }
    if (oekaki.tool === 'eyedropper') {
        pickOekakiColor(pos.x, pos.y);
        return;
    }
    if (oekaki.tool === 'zoom') {
        if (oekaki.zoom > 1) {
            // 拡大中はドラッグでパン
            oekaki.isPanning    = true;
            oekaki.panStartX    = e.clientX;
            oekaki.panStartY    = e.clientY;
            const wrapper = document.querySelector('.oekaki-canvas-wrapper');
            oekaki.panScrollLeft = wrapper ? wrapper.scrollLeft : 0;
            oekaki.panScrollTop  = wrapper ? wrapper.scrollTop  : 0;
            const canvas = document.getElementById('oekakiCanvas');
            if (canvas) canvas.style.cursor = 'zoom-out';
            document.addEventListener('mousemove', onOekakiMouseMoveDoc);
            document.addEventListener('mouseup',   onOekakiMouseUpDoc);
        }
        return; // click で拡大縮小処理
    }

    oekaki.isDrawing = true;
    oekaki.outsideCanvas = false;
    oekaki.lastX = pos.x;
    oekaki.lastY = pos.y;

    // 始点に1点描画
    if (oekaki.tool === 'pencil')   drawOekakiLine(pos.x, pos.y, pos.x, pos.y);
    if (oekaki.tool === 'eraser')   eraseOekakiLine(pos.x, pos.y, pos.x, pos.y);
    if (oekaki.tool === 'airbrush') drawAirbrush(pos.x, pos.y);

    // ドラッグ中はdocumentで追跡（キャンバス外に出ても描き続ける）
    document.addEventListener('mousemove', onOekakiMouseMoveDoc);
    document.addEventListener('mouseup',   onOekakiMouseUpDoc);
}

function onOekakiMouseMoveDoc(e) {
    if (oekaki.isPanning) {
        const wrapper = document.querySelector('.oekaki-canvas-wrapper');
        if (wrapper) {
            wrapper.scrollLeft = oekaki.panScrollLeft - (e.clientX - oekaki.panStartX);
            wrapper.scrollTop  = oekaki.panScrollTop  - (e.clientY - oekaki.panStartY);
        }
        oekaki.didPan = true; // 実際に移動したことを記録
        return;
    }
    if (!oekaki.isDrawing) return;
    const pos = getOekakiCanvasPos(e, false); // クランプなし
    const canvas = document.getElementById('oekakiCanvas');
    const inBounds = pos.x >= 0 && pos.x < canvas.width && pos.y >= 0 && pos.y < canvas.height;

    if (!inBounds) {
        if (!oekaki.outsideCanvas) {
            // キャンバスから出た瞬間：端まで線を引いてから停止
            const clipped = clipLineToCanvas(oekaki.lastX, oekaki.lastY, pos.x, pos.y, canvas.width, canvas.height);
            if (oekaki.tool === 'pencil')   drawOekakiLine(oekaki.lastX, oekaki.lastY, clipped.x, clipped.y);
            if (oekaki.tool === 'eraser')   eraseOekakiLine(oekaki.lastX, oekaki.lastY, clipped.x, clipped.y);
            if (oekaki.tool === 'airbrush') drawAirbrush(clipped.x, clipped.y);
        }
        oekaki.outsideCanvas = true;
        return;
    }

    if (oekaki.outsideCanvas) {
        // キャンバスに戻ってきた：端に線を引かず、新しい始点から再開
        oekaki.lastX = pos.x;
        oekaki.lastY = pos.y;
        oekaki.outsideCanvas = false;
    }

    if (oekaki.tool === 'pencil')   drawOekakiLine(oekaki.lastX, oekaki.lastY, pos.x, pos.y);
    if (oekaki.tool === 'eraser')   eraseOekakiLine(oekaki.lastX, oekaki.lastY, pos.x, pos.y);
    if (oekaki.tool === 'airbrush') drawAirbrush(pos.x, pos.y);

    oekaki.lastX = pos.x;
    oekaki.lastY = pos.y;
}

function onOekakiMouseUpDoc() {
    if (oekaki.isPanning) {
        oekaki.isPanning = false;
        const canvas = document.getElementById('oekakiCanvas');
        if (canvas) canvas.style.cursor = 'zoom-out';
        document.removeEventListener('mousemove', onOekakiMouseMoveDoc);
        document.removeEventListener('mouseup',   onOekakiMouseUpDoc);
        return;
    }
    if (oekaki.isDrawing) {
        saveOekakiState(); // 一筆描き終わったら保存
    }
    oekaki.isDrawing = false;
    document.removeEventListener('mousemove', onOekakiMouseMoveDoc);
    document.removeEventListener('mouseup',   onOekakiMouseUpDoc);
}

function onOekakiClick(e) {
    if (oekaki.tool === 'zoom') {
        if (oekaki.didPan) { oekaki.didPan = false; return; } // パン後のclickは無視
        const pos = getOekakiCanvasPos(e, false); // クリック位置をキャンバス座標で取得
        toggleOekakiZoom();
        // 拡大時：クリックした場所がラッパーの中央にくるようにスクロール
        if (oekaki.zoom > 1) {
            const wrapper = document.querySelector('.oekaki-canvas-wrapper');
            if (wrapper) {
                wrapper.scrollLeft = pos.x * oekaki.zoom - wrapper.clientWidth  / 2;
                wrapper.scrollTop  = pos.y * oekaki.zoom - wrapper.clientHeight / 2;
            }
        }
    }
}

// ============================================
// 描画ツール
// ============================================

// 始点（内側）→終点（外側）の線をキャンバス端でクリップ
function clipLineToCanvas(x0, y0, x1, y1, w, h) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    let t = 1;
    if (dx !== 0) {
        if (x1 < 0)  t = Math.min(t, (0     - x0) / dx);
        if (x1 >= w) t = Math.min(t, (w - 1 - x0) / dx);
    }
    if (dy !== 0) {
        if (y1 < 0)  t = Math.min(t, (0     - y0) / dy);
        if (y1 >= h) t = Math.min(t, (h - 1 - y0) / dy);
    }
    return {
        x: Math.round(x0 + t * dx),
        y: Math.round(y0 + t * dy),
    };
}

// ブレゼンハムのライン描画（アンチエイリアスなし・ピクセル単位）
function bresenhamLine(ctx, x0, y0, x1, y1, size) {
    const half = Math.floor(size / 2);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
        ctx.fillRect(x0 - half, y0 - half, size, size);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 <  dx) { err += dx; y0 += sy; }
    }
}

function drawOekakiLine(x1, y1, x2, y2) {
    const ctx  = document.getElementById('oekakiCanvas').getContext('2d');
    const size = PENCIL_SIZES[oekaki.size];
    ctx.fillStyle = oekaki.fgColor;
    bresenhamLine(ctx, x1, y1, x2, y2, size);
}

function eraseOekakiLine(x1, y1, x2, y2) {
    const ctx  = document.getElementById('oekakiCanvas').getContext('2d');
    const size = ERASER_SIZES[oekaki.size];
    ctx.fillStyle = '#FFFFFF';
    bresenhamLine(ctx, x1, y1, x2, y2, size);
}

function drawAirbrush(cx, cy) {
    const ctx     = document.getElementById('oekakiCanvas').getContext('2d');
    const radius  = AIRBRUSH_RADII[oekaki.size];
    const density = Math.floor(radius * 1.8);
    ctx.fillStyle = oekaki.fgColor;
    for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        const x = Math.round(cx + r * Math.cos(angle));
        const y = Math.round(cy + r * Math.sin(angle));
        ctx.fillRect(x, y, 1, 1); // 1pxドットでAA無し
    }
}

function floodFill(startX, startY, fillColorHex) {
    const canvas = document.getElementById('oekakiCanvas');
    const ctx    = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // 起点の色を取得
    const si = (startY * w + startX) * 4;
    const targetR = data[si];
    const targetG = data[si + 1];
    const targetB = data[si + 2];
    const targetA = data[si + 3];

    // 塗りつぶし色をRGBに変換
    const fillR = parseInt(fillColorHex.slice(1, 3), 16);
    const fillG = parseInt(fillColorHex.slice(3, 5), 16);
    const fillB = parseInt(fillColorHex.slice(5, 7), 16);

    // すでに同じ色なら何もしない
    if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === 255) return;

    const tolerance = 15;
    function matchesTarget(i) {
        return Math.abs(data[i]     - targetR) <= tolerance &&
               Math.abs(data[i + 1] - targetG) <= tolerance &&
               Math.abs(data[i + 2] - targetB) <= tolerance &&
               Math.abs(data[i + 3] - targetA) <= tolerance;
    }

    const visited = new Uint8Array(w * h);
    const stack   = [startX + startY * w];

    while (stack.length > 0) {
        const pos = stack.pop();
        if (visited[pos]) continue;
        visited[pos] = 1;

        const i = pos * 4;
        if (!matchesTarget(i)) continue;

        data[i]     = fillR;
        data[i + 1] = fillG;
        data[i + 2] = fillB;
        data[i + 3] = 255;

        const x = pos % w;
        const y = Math.floor(pos / w);
        if (x > 0)     stack.push(pos - 1);
        if (x < w - 1) stack.push(pos + 1);
        if (y > 0)     stack.push(pos - w);
        if (y < h - 1) stack.push(pos + w);
    }

    ctx.putImageData(imageData, 0, 0);
}

function pickOekakiColor(x, y) {
    const ctx   = document.getElementById('oekakiCanvas').getContext('2d');
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex   = '#' + [pixel[0], pixel[1], pixel[2]]
        .map(v => v.toString(16).padStart(2, '0')).join('');
    oekaki.fgColor = hex;
    updateOekakiColorDisplay();

    // 全パレットから色を検索してタブごと切り替え
    let foundPalette = null;
    for (const [key, colors] of Object.entries(OEKAKI_PALETTES)) {
        if (colors.some(c => c.toLowerCase() === hex.toLowerCase())) {
            foundPalette = key;
            break;
        }
    }
    if (foundPalette) {
        selectOekakiPalette(foundPalette); // タブ切り替え＋再描画
        updatePaletteSelection(hex);       // 選択枠を付ける
    } else {
        updatePaletteSelection(hex);       // パレット外の色は選択枠なし
    }

}

// パレットの選択枠を指定色に合わせて更新
function updatePaletteSelection(hex) {
    document.querySelectorAll('.oekaki-color-cell').forEach(cell => {
        if (cell.dataset.color.toLowerCase() === hex.toLowerCase()) {
            cell.classList.add('selected');
        } else {
            cell.classList.remove('selected');
        }
    });
}

function toggleOekakiZoom() {
    oekaki.zoom = (oekaki.zoom === 1) ? 2 : 1;
    applyOekakiZoom();
}

function applyOekakiZoom() {
    const canvas = document.getElementById('oekakiCanvas');
    canvas.style.width  = (640 * oekaki.zoom) + 'px';
    canvas.style.height = (480 * oekaki.zoom) + 'px';

    const wrapper = canvas.closest('.oekaki-canvas-wrapper');
    if (wrapper) {
        if (oekaki.zoom === 1) {
            wrapper.style.overflow = 'hidden';
            wrapper.scrollLeft = 0;
            wrapper.scrollTop  = 0;
        } else {
            wrapper.style.overflow = 'auto';
        }
    }

    // ズームボタンのタイトルとカーソルを更新
    const zoomBtn = document.querySelector('.oekaki-tool-btn[data-tool="zoom"]');
    if (zoomBtn) zoomBtn.title = oekaki.zoom === 1 ? '虫眼鏡（クリックで拡大）' : '虫眼鏡（クリックで縮小）';
    if (oekaki.tool === 'zoom') {
        const canvas = document.getElementById('oekakiCanvas');
        if (canvas) canvas.style.cursor = oekaki.zoom === 1 ? 'zoom-in' : 'zoom-out';
    }
}

function clearOekakiCanvas() {
    const canvas = document.getElementById('oekakiCanvas');
    const ctx    = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveOekakiState(); // クリア後に保存
}

// ============================================
// UI 制御
// ============================================

function selectOekakiTool(tool) {
    oekaki.tool      = tool;
    oekaki.isDrawing = false;
    updateOekakiToolUI();

    const canvas = document.getElementById('oekakiCanvas');
    if (!canvas) return;
    const cursors = {
        pencil:    'crosshair',
        eraser:    'cell',
        fill:      'copy',
        zoom:      oekaki.zoom === 1 ? 'zoom-in' : 'zoom-out',
        eyedropper:'crosshair',
        airbrush:  'crosshair',
    };
    canvas.style.cursor = cursors[tool] || 'crosshair';
}

function updateOekakiToolUI() {
    document.querySelectorAll('.oekaki-tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === oekaki.tool);
    });
}

function selectOekakiSize(size) {
    oekaki.size = size;
    updateOekakiSizeUI();
}

function updateOekakiSizeUI() {
    document.querySelectorAll('.oekaki-size-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.size === oekaki.size);
    });
}

function selectOekakiPalette(palette) {
    oekaki.palette = palette;
    document.querySelectorAll('.oekaki-palette-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.palette === palette);
    });
    renderOekakiPalette();
}

function renderOekakiPalette() {
    const grid   = document.getElementById('oekakiColorGrid');
    const colors = OEKAKI_PALETTES[oekaki.palette];
    if (!grid) return;
    grid.innerHTML = '';
    colors.forEach(color => {
        const cell = document.createElement('div');
        cell.className = 'oekaki-color-cell';
        cell.style.background = color;
        cell.dataset.color = color;
        cell.title = color;
        if (color.toLowerCase() === oekaki.fgColor.toLowerCase()) {
            cell.classList.add('selected');
        }
        cell.addEventListener('click', () => {
            oekaki.fgColor = color;
            updateOekakiColorDisplay();
            updatePaletteSelection(color);
            cell.blur();
        });
        cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            oekaki.bgColor = color;
            updateOekakiColorDisplay();
        });
        grid.appendChild(cell);
    });
}

function updateOekakiColorDisplay() {
    const fg = document.getElementById('oekakiFgColor');
    const bg = document.getElementById('oekakiBgColor');
    if (fg) fg.style.background = oekaki.fgColor;
    if (bg) bg.style.background = oekaki.bgColor;
}

// ============================================
// 投稿・ギャラリー
// ============================================

function postOekakiDrawing() {
    const canvas = document.getElementById('oekakiCanvas');
    const ctx    = canvas.getContext('2d');

    // 真っ白キャンバスのまま投稿しようとした場合はブロック
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasDrawing = false;
    for (let i = 0; i < imageData.length; i += 4) {
        if (imageData[i] < 248 || imageData[i+1] < 248 || imageData[i+2] < 248) {
            hasDrawing = true;
            break;
        }
    }
    if (!hasDrawing) {
        showToast('何か描いてから投稿してね🎨');
        return;
    }

    const dataURL = canvas.toDataURL('image/png');

    if (!gameState.oekakiPosts) gameState.oekakiPosts = [];

    if (oekakiEditingId !== null) {
        // 編集モード：既存の投稿を更新
        const existing = gameState.oekakiPosts.find(p => p.id === oekakiEditingId);
        if (existing) existing.image = dataURL;
        oekakiEditingId = null;
        showToast('更新したよ！');
    } else {
        // 新規投稿
        const post = {
            id:         Date.now(),
            authorName: gameState.player.name || 'なまえなし',
            date:       new Date().toLocaleDateString('ja-JP'),
            image:      dataURL,
        };
        gameState.oekakiPosts.unshift(post);
        // 最新100件を超えたら古いものを削除
        if (gameState.oekakiPosts.length > 100) {
            gameState.oekakiPosts = gameState.oekakiPosts.slice(0, 100);
        }
        showToast('投稿したよ！✨');
    }

    saveGame();
    showOekakiGallery();
}

function renderOekakiGallery() {
    const gallery = document.getElementById('oekakiGallery');
    const posts   = gameState.oekakiPosts || [];
    const myName  = gameState.player.name || '';

    if (posts.length === 0) {
        gallery.innerHTML = '<p class="oekaki-empty">まだ作品がないよ！<br>最初の一枚を描いてみよう🎨</p>';
        return;
    }

    gallery.innerHTML = posts.map(post => {
        const isOwn      = post.authorName === myName;
        const ownOverlay = isOwn ? `
            <div class="oekaki-card-own-overlay">
                <button class="oekaki-card-own-btn oekaki-card-delete-btn" onclick="event.stopPropagation(); deleteOekakiPost(${post.id})">削除する</button>
                <button class="oekaki-card-own-btn oekaki-card-download-btn" onclick="event.stopPropagation(); downloadOekakiPost(${post.id})" title="保存する">
                    <img src="public/keiziban/download.svg" alt="保存">
                </button>
            </div>` : '';
        return `
        <div class="oekaki-card" onclick="openOekakiView(${post.id})">
            <div class="oekaki-card-img-wrap">
                ${ownOverlay}
                <img src="${post.image}" class="oekaki-card-img" alt="お絵かき作品">
            </div>
            <div class="oekaki-card-info">
                <span class="oekaki-card-author">作者：${oekakiEsc(post.authorName)}</span>
                <img src="status/${(gameState.oekakiLiked||[]).includes(post.id) ? 'Heart2' : 'Heart'}.png"
                     class="oekaki-card-action-icon" id="oekakiHeart-${post.id}"
                     onclick="event.stopPropagation(); toggleOekakiLike(${post.id})" alt="いいね" title="いいね">
            </div>
        </div>`;
    }).join('');
}

function toggleOekakiLike(postId) {
    if (!gameState.oekakiLiked) gameState.oekakiLiked = [];
    const arr = gameState.oekakiLiked;
    const idx = arr.indexOf(postId);
    const icon = document.getElementById(`oekakiHeart-${postId}`);
    if (idx >= 0) {
        arr.splice(idx, 1);
        if (icon) icon.src = 'status/Heart.png';
    } else {
        arr.push(postId);
        if (icon) icon.src = 'status/Heart2.png';
    }
    saveGame(true);
}

function toggleOekakiBookmark(postId) {
    if (!gameState.oekakiBookmarked) gameState.oekakiBookmarked = [];
    const arr = gameState.oekakiBookmarked;
    const idx = arr.indexOf(postId);
    const icon = document.getElementById(`oekakiBm-${postId}`);
    if (idx >= 0) {
        arr.splice(idx, 1);
        if (icon) icon.src = 'status/Bookmark_A.png';
    } else {
        arr.push(postId);
        if (icon) icon.src = 'status/Bookmark_B.png';
        showToast('ブックマークしたよ！');
    }
    saveGame(true);
}

function openOekakiView(postId) {
    const post = (gameState.oekakiPosts || []).find(p => p.id === postId);
    if (!post) return;

    const modal  = document.getElementById('oekakiViewModal');
    const canvas = document.getElementById('oekakiViewCanvas');
    const ctx    = canvas.getContext('2d');
    const img    = new Image();

    document.getElementById('oekakiViewTitle').textContent = `作者：${post.authorName}`;

    img.onload = () => {
        canvas.width  = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // 右下にウォーターマーク
        const text     = `作者：${post.authorName}`;
        const fontSize = Math.max(16, Math.floor(img.width * 0.03));
        ctx.font       = `bold ${fontSize}px sans-serif`;
        const padding  = fontSize * 0.6;
        const tw       = ctx.measureText(text).width;
        const tx       = img.width  - tw - padding;
        const ty       = img.height - padding;

        // 影（読みやすくするため）
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillText(text, tx + 1, ty + 1);
        // 白テキスト
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText(text, tx, ty);

        modal.classList.add('active');
    };
    img.src = post.image;
}

function closeOekakiView() {
    document.getElementById('oekakiViewModal').classList.remove('active');
}

function downloadOekakiPost(postId) {
    const post = (gameState.oekakiPosts || []).find(p => p.id === postId);
    if (!post) return;
    const a = document.createElement('a');
    a.href = post.image;
    a.download = `oekaki_${post.date.replace(/\//g, '-')}.png`;
    a.click();
}

function deleteOekakiPost(postId) {
    if (!confirm('この作品を削除しますか？')) return;
    gameState.oekakiPosts = (gameState.oekakiPosts || []).filter(p => p.id !== postId);
    // 関連するいいね・ブックマークも削除
    gameState.oekakiLiked      = (gameState.oekakiLiked      || []).filter(id => id !== postId);
    gameState.oekakiBookmarked = (gameState.oekakiBookmarked || []).filter(id => id !== postId);
    saveGame();
    renderOekakiGallery();
}

let oekakiEditingId = null; // 編集中の投稿ID（nullなら新規）

function editOekakiPost(postId) {
    const post = (gameState.oekakiPosts || []).find(p => p.id === postId);
    if (!post) return;
    oekakiEditingId = postId;
    openPaintModal();
    // キャンバスに既存の絵を読み込む
    const img = new Image();
    img.onload = () => {
        const canvas = document.getElementById('oekakiCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // 編集開始状態として履歴をリセット
        oekakiHistory.states = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
        oekakiHistory.index  = 0;
        updateUndoRedoUI();
    };
    img.src = post.image;
}

// ============================================
// Undo / Redo
// ============================================

function saveOekakiState() {
    const canvas = document.getElementById('oekakiCanvas');
    if (!canvas) return;
    const snapshot = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);

    // 現在位置より後のredo履歴を削除
    oekakiHistory.states.splice(oekakiHistory.index + 1);
    oekakiHistory.states.push(snapshot);

    // 最大ステップを超えたら一番古いものを削除
    if (oekakiHistory.states.length > oekakiHistory.maxSteps) {
        oekakiHistory.states.shift();
    }

    oekakiHistory.index = oekakiHistory.states.length - 1;
    updateUndoRedoUI();
}

function undoOekaki() {
    if (oekakiHistory.index <= 0) return;
    oekakiHistory.index--;
    const canvas = document.getElementById('oekakiCanvas');
    canvas.getContext('2d').putImageData(oekakiHistory.states[oekakiHistory.index], 0, 0);
    updateUndoRedoUI();
}

function redoOekaki() {
    if (oekakiHistory.index >= oekakiHistory.states.length - 1) return;
    oekakiHistory.index++;
    const canvas = document.getElementById('oekakiCanvas');
    canvas.getContext('2d').putImageData(oekakiHistory.states[oekakiHistory.index], 0, 0);
    updateUndoRedoUI();
}

function updateUndoRedoUI() {
    const undoBtn = document.getElementById('oekakiUndoBtn');
    const redoBtn = document.getElementById('oekakiRedoBtn');
    if (undoBtn) undoBtn.disabled = oekakiHistory.index <= 0;
    if (redoBtn) redoBtn.disabled = oekakiHistory.index >= oekakiHistory.states.length - 1;
}

function oekakiEsc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
