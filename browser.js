var UP = false, DOWN = false, LEFT = false, RIGHT = false, A = false, B = false, C = false, D = false;
var FRAMETIME = 1, CAMERA_X = 0, CAMERA_Y = 0;

const _internal = {
    fb32:null,
    font:R.fontMini,
    updateFrequency: 1000 / 30,
    framebuffer:null,
    pen: {r:0, g:0, b:0, a:255},
    clearColor: {r:0, g:0, b:0, a:255},
    recolor: 0,
    mirrored: false,
    flipped: false,
    transparent: true,
    texture: null,
    map:null,
    renderQueue:[],
    push(cb, ...args) {
        _internal.renderQueue.push(Object.assign({}, _internal, {cb, args}));
    }
};

addEventListener('DOMContentLoaded', _=>{
    document.body.addEventListener('keydown', event => {
        if (event.code == "ArrowUp" || event.code == "KeyI") _internal.UP = true;
        else if (event.code == "ArrowDown" || event.code == "KeyK") _internal.DOWN = true;
        else if (event.code == "ArrowLeft" || event.code == "KeyJ") _internal.LEFT = true;
        else if (event.code == "ArrowRight" || event.code == "KeyL") _internal.RIGHT = true;
        else if (event.code == "KeyA" || event.code == "KeyQ" || event.code == "Control") _internal.A = true;
        else if (event.code == "KeyS" || event.code == "Shift") _internal.B = true;
        else if (event.code == "KeyD" || event.code == "KeyZ") _internal.D = true;
        else if (event.code == "KeyF" || event.code == "KeyX") _internal.C = true;
    });

    document.body.addEventListener('keyup', event => {
        if (event.code == "ArrowUp" || event.code == "KeyI") _internal.UP = false;
        else if (event.code == "ArrowDown" || event.code == "KeyK") _internal.DOWN = false;
        else if (event.code == "ArrowLeft" || event.code == "KeyJ") _internal.LEFT = false;
        else if (event.code == "ArrowRight" || event.code == "KeyL") _internal.RIGHT = false;
        else if (event.code == "KeyA" || event.code == "KeyQ" || event.code == "Control") _internal.A = false;
        else if (event.code == "KeyS" || event.code == "Shift") _internal.B = false;
        else if (event.code == "KeyD" || event.code == "KeyZ") _internal.D = false;
        else if (event.code == "KeyF" || event.code == "KeyX") _internal.C = false;
    });

    const ctx = canvas.getContext("2d");
    _internal.framebuffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
    _internal.fb32 = new Uint32Array(_internal.framebuffer.data.buffer);

    let startTime = performance.now();
    let prevTime = startTime;
    let updateCount = 0;
    init();
    requestAnimationFrame(tick);

    function tick() {
        let now = performance.now() - startTime;
        let delta = now - prevTime;
        prevTime = now;
        let targetUpdateCount = _internal.updateFrequency ? now / _internal.updateFrequency : updateCount + 1;
        let updateDelta = (targetUpdateCount - updateCount)|0;
        try {
            if (updateDelta >= 1) {
                if (updateDelta > 10) {
                    updateCount = targetUpdateCount|0;
                    updateDelta = 1;
                    delta = 1;
                } else {
                    updateCount += updateDelta;
                }

                UP = _internal.UP;
                DOWN = _internal.DOWN;
                LEFT = _internal.LEFT;
                RIGHT = _internal.RIGHT;
                A = _internal.A;
                B = _internal.B;
                D = _internal.D;
                C = _internal.C;

                let startUpdate = performance.now();
                let partial = delta / updateDelta;
                for (let i = 0; i < updateDelta; ++i)
                    update(now);
                render(now);

                let pen = _internal.clearColor;
                let rgb = (pen.r|0) | ((pen.g|0) << 8) | ((pen.b|0) << 16) | (0xFF << 24);
                if (rgb) {
                    _internal.fb32.fill(rgb);
                }

                if (_internal.map) {
                    renderMap(_internal.map);
                } else {
                    flushRenderQueue();
                }

                ctx.putImageData(_internal.framebuffer, 0, 0);
                FRAMETIME = ((performance.now() - startUpdate) | 0) || 1;
            }
        } finally {
            requestAnimationFrame(tick);
        }
    }

    function flushRenderQueue() {
        if (!_internal.renderQueue.length)
            return;
        let backup = Object.assign({}, _internal);
        let queue = _internal.renderQueue;
        for (let cmd of queue) {
            Object.assign(_internal, cmd);
            cmd.cb(...cmd.args);
        }
        Object.assign(_internal, backup);
        _internal.renderQueue.length = 0;
    }

    let header, mapCursor;

    function drawTiles(map) {
        const screenWidth = _internal.framebuffer.width;
        const screenHeight = _internal.framebuffer.height;
        const mapStride = header.mapWidth;
        const mapHeight = header.mapHeight;
        const nextMapCursor = mapCursor + header.mapHeight * mapStride;
        const tileHeight = header.tileHeight;
        const tileWidth = header.tileWidth;
        const tse = header.tileset;

        let rowsPerWindow = (screenHeight / tileHeight) | 0;
        const rowRemainder = screenHeight % tileHeight;
        let colsPerWindow = (screenWidth / header.tileWidth) | 0;
        const colRemainder = screenWidth % header.tileWidth;

        let startY = CAMERA_Y|0;
        if (startY < 0) {
            startY %= mapHeight * tileHeight;
            startY += mapHeight * tileHeight;
        }

        let startX = CAMERA_X|0;
        if (startX < 0) {
            startX %= mapStride * tileWidth;
            startX += mapStride * tileWidth;
        }

        let startRow = startY / tileHeight | 0;
        let startRowHeight = startY % tileHeight;
        startRow %= mapHeight;

        let startCol = startX / tileWidth | 0;
        let startColWidth = startX % tileWidth;
        startCol %= mapStride;

        if (startRowHeight) {
            startRowHeight = tileHeight - startRowHeight;
            if (startRowHeight <= rowRemainder) {
                rowsPerWindow++;
            }
        }

        if (startColWidth) {
            startColWidth = tileWidth - startColWidth;
            if (startColWidth <= colRemainder) {
                colsPerWindow++;
            }
        }

        let endRow = startRow + rowsPerWindow;
        let endRowHeight = screenHeight - startRowHeight - (rowsPerWindow - (startRowHeight ? 1 : 0)) * tileHeight;
        let endColWidth = screenWidth - startColWidth - (colsPerWindow - (startColWidth ? 1 : 0)) * tileWidth;

        let fboffset = 0;
        const fb = _internal.fb32;
        let src, line = 0;

        if (startRowHeight) {
            layer = mapCursor + startRow * mapStride;
            let lineOffset = 0;
            let colOffset = startCol;

            if (startColWidth) {
                let id = map[layer + colOffset];
                if (++colOffset == mapStride)
                    colOffset = 0;
                if (id) {
                    id--;
                    src = R[tse[id * 2].r];
                    let srcStride = src[0];
                    let srcoffset = (tse[id * 2].o|0) + (tileHeight - startRowHeight) * srcStride + (tileWidth - startColWidth);
                    let cursor = line;
                    for (let i = 0; i < startRowHeight; ++i, srcoffset += srcStride, cursor += screenWidth)
                        P_P(srcoffset, cursor, startColWidth);
                }
                lineOffset = startColWidth;
            }

            for (let tx = startColWidth ? 1 : 0; tx < colsPerWindow; ++tx, lineOffset += tileWidth) {
                let id = map[layer + colOffset];
                if (++colOffset == mapStride)
                    colOffset = 0;
                if (!id)
                    continue;
                id--;
                src = R[tse[id * 2].r];
                let srcStride = src[0];
                let srcoffset = (tse[id * 2].o|0) + (tileHeight - startRowHeight) * srcStride;
                let cursor = line + lineOffset;
                for (let i = 0; i < startRowHeight; ++i, srcoffset += srcStride, cursor += screenWidth)
                    P_P(srcoffset, cursor, tileWidth);
            }

            if (endColWidth) {
                let id = map[layer + colOffset];
                if (id) {
                    id--;
                    src = R[tse[id * 2].r];
                    let srcStride = src[0];
                    let srcoffset = (tse[id * 2].o|0) + (tileHeight - startRowHeight) * srcStride;
                    let cursor = line + lineOffset;
                    for (let i = 0; i < startRowHeight; ++i, srcoffset += srcStride, cursor += screenWidth)
                        P_P(srcoffset, cursor, endColWidth);
                }
            }

            line += startRowHeight * screenWidth;
        }

        for (let row = startRowHeight ? 1 : 0; row < rowsPerWindow; ++row, line += screenWidth * tileHeight) {
            let colOffset = startCol;

            let y = startRow + row;
            while (y >= mapHeight)
                y -= mapHeight;
            layer = mapCursor + y * mapStride;

            let lineOffset = 0;

            if (startColWidth) {
                let id = map[layer + startCol];
                if (++colOffset == mapStride)
                    colOffset = 0;
                if (id) {
                    id--;
                    src = R[tse[id * 2].r];
                    let srcStride = src[0];
                    let srcoffset = (tse[id * 2].o|0) + (tileWidth - startColWidth);
                    let cursor = line;
                    for (let i = 0; i < tileHeight; ++i, srcoffset += srcStride, cursor += screenWidth)
                        P_P(srcoffset, cursor, startColWidth);
                }
                lineOffset = startColWidth;
            }

            for (let tx = startColWidth ? 1 : 0; tx < colsPerWindow; ++tx, lineOffset += tileWidth) {
                let id = map[layer + colOffset];
                if (++colOffset == mapStride)
                    colOffset = 0;
                if (!id)
                    continue;
                id--;
                src = R[tse[id * 2].r];
                let srcoffset = (tse[id * 2].o|0);
                let srcStride = src[0];
                let cursor = line + lineOffset;
                for (let i = 0; i < tileHeight; ++i, srcoffset += srcStride, cursor += screenWidth)
                    P_P(srcoffset, cursor, tileWidth);
            }
            if (endColWidth) {
                let id = map[layer + colOffset];
                if (!id)
                    continue;
                id--;
                src = R[tse[id * 2].r];
                let srcStride = src[0];
                let srcoffset = (tse[id * 2].o|0);
                let cursor = line + lineOffset;
                for (let i = 0; i < tileHeight; ++i, srcoffset += srcStride, cursor += screenWidth)
                    P_P(srcoffset, cursor, endColWidth);
            }
        }

        if (endRowHeight) {
            let lineOffset = 0;
            let colOffset = startCol;

            endRow %= mapHeight;
            layer = mapCursor + endRow * mapStride;
            if (endRowHeight > tileHeight)
                endRowHeight = tileHeight;


            if (startColWidth) {
                let id = map[layer + colOffset];
                if (++colOffset == mapStride)
                    colOffset = 0;
                if (id) {
                    id--;
                    src = R[tse[id * 2].r];
                    let srcStride = src[0];
                    let srcoffset = (tse[id * 2].o|0) + (tileWidth - startColWidth);
                    let cursor = line;
                    for (let i = 0; i < endRowHeight; ++i, srcoffset += srcStride, cursor += screenWidth)
                        P_P(srcoffset, cursor, startColWidth);
                }
                lineOffset = startColWidth;
            }

            for (let tx = startColWidth ? 1 : 0; tx < colsPerWindow; ++tx, lineOffset += tileWidth) {
                let id = map[layer + colOffset];
                if (++colOffset == mapStride)
                    colOffset = 0;
                if (!id)
                    continue;
                id--;
                src = R[tse[id * 2].r];
                let srcStride = src[0];
                let srcoffset = (tse[id * 2].o|0);
                let cursor = line + lineOffset;
                for (let i = 0; i < endRowHeight; ++i, srcoffset += srcStride, cursor += screenWidth)
                    P_P(srcoffset, cursor, tileWidth);
            }

            if (endColWidth) {
                let id = map[layer + colOffset];
                if (id) {
                    id--;
                    src = R[tse[id * 2].r];
                    let srcStride = src[0];
                    let srcoffset = (tse[id * 2].o|0);
                    let cursor = line + lineOffset;
                    for (let i = 0; i < endRowHeight; ++i, srcoffset += srcStride, cursor += screenWidth)
                        P_P(srcoffset, cursor, endColWidth);
                }
            }
        }

        function P_P(srcoffset, cursor, amount) {
            for (let x = 0; x < amount; ++x) {
                let pixel = src[srcoffset + x];
                if (pixel)
                    fb[cursor + x] = palette[pixel];
            }
        }

        mapCursor = nextMapCursor;
    }

    function renderMap(map) {
        header = {
            layerCount: map[2],
            tileset:  R[map[4].r],
            mapWidth:   map[ 8] | (map[ 9] << 8),
            mapHeight:  map[10] | (map[11] << 8),
            tileWidth:  map[12] | (map[13] << 8),
            tileHeight: map[14] | (map[15] << 8)
        };

        mapCursor = 16;

        for (let i = 0, max = header.layerCount; i < max; ++i) {
            switch (map[mapCursor++]) {
            case 0:
                drawTiles(map);
                break;
            case 1:
                flushRenderQueue();
                break;
            default:
                return;
            }
        }

        flushRenderQueue();
    }
});

function debug(...args) {
    console.log(...args);
    if (window.top != window)
        window.top.postMessage({log:[args]}, "*");
}

window.onerror = msg => debug(msg);

function rand(...args) {
    let a, b, min, range;

    switch (args.length) {
    case 0:
        return Math.random();

    case 1:
        return Math.random() * args[0] | 0;

    case 2:
        a = args[0];
        b = args[1];
        if (a < b) {
            min = a;
            range = b - a;
        } else if (a > b) {
            min = b;
            range = a - b;
        } else {
            return a;
        }
        return min + Math.random() * range;

    case 3:
        a = args[0];
        b = args[1];
        return (Math.random() * (b - a) + a)|0;
    }

    return Math.random() * 0xFFFF | 0;
}

const abs = Math.abs;
const floor = Math.floor;
const round = Math.round;
const ceil = Math.ceil;
const sqrt = Math.sqrt;
const cos = Math.cos;
const sin = Math.sin;
const atan2 = Math.atan2;
const tan = Math.tan;
const min = Math.min;
const max = Math.max;
const PI = Math.PI;
const HALF_PI = PI / 2;
const TWO_PI = PI * 2;

function vectorLength(...args) {
    let len = args.length;
    let ret = 0;
    for (let i = 0; i < len; ++i) {
        let v = parseFloat(args[i]) || 0;
        ret += v * v;
    }
    return Math.sqrt(ret);
}

function angleDifference(x, y, c = Math.PI) {
    // return mod(Math.abs(x - y) + c, 2 * c) - c;
    let TAU = c * 2;
    let a = mod(x - y, TAU);
    let b = mod(y - x, TAU);
    return a < b ? -a : b;
    function mod(a, n) {return a - Math.floor(a / n) * n;}
}

function setScreenMode(){}

function getTime() {
    return performance.now();
}

function setFPS(targetFPS) {
    targetFPS |= 0;
    _internal.updateFrequency = targetFPS ? 1000 / targetFPS : 0;
    return {};
}

function setPen(r, g, b){
    let pen = r;
    if (pen && typeof pen == 'object') {
        r = pen.r;
        g = pen.g;
        b = pen.b;
    }

    const pal = new Uint8Array(palette.buffer);
    let closest;

    if (typeof r == 'number' && (g === undefined || b === undefined)) {
        closest = r & 0xFF;
        g = pal[closest * 4 + 1];
        b = pal[closest * 4 + 2];
        r = pal[closest * 4 + 0];
    }

    _internal.pen = {
        r:r&0xFF,
        g:g&0xFF,
        b:b&0xFF,
        a:255
    };

    if (closest === undefined) {
        closest = 0;
        let closestDistance = -1>>>0;
        for (let i = 1; i < 256; ++i) {
            let tr = pal[i * 4 + 0];
            let dr = r - tr;

            let tg = pal[i * 4 + 1];
            let dg = g - tg;

            let tb = pal[i * 4 + 2];
            let db = b - tb;

            let d = dr*dr + dg*dg + db*db;
            if (d < closestDistance) {
                closest = i;
                closestDistance = d;
                if (!closestDistance)
                    break;
            }
        }
    }

    _internal.recolor = closest;

    return closest;
}

function getTileProperty(x, y, key) {
    let layerNumber = 0;
    if (!_internal.map)
        return 0;

    let map = _internal.map;

    header = {
        layerCount: map[2],
        tileset:  R[map[4].r],
        mapWidth:   map[ 8] | (map[ 9] << 8),
        mapHeight:  map[10] | (map[11] << 8),
        tileWidth:  map[12] | (map[13] << 8),
        tileHeight: map[14] | (map[15] << 8)
    };

    let layer = 16;

    y += CAMERA_Y|0;
    x += CAMERA_X|0;

    const tse = header.tileset;

    for (let i = 0, max = header.layerCount; i < max; ++i) {
        switch (map[layer]) {
        case 0:
            layer++;
            if (i == layerNumber) {
                const mapStride = header.mapWidth;
                const mapHeight = header.mapHeight;
                const tileHeight = header.tileHeight;
                const tileWidth = header.tileWidth;

                if (y < 0) {
                    y %= mapHeight * tileHeight;
                    y += mapHeight * tileHeight;
                }

                if (x < 0) {
                    x %= mapStride * tileWidth;
                    x += mapStride * tileWidth;
                }

                let row = (y / tileHeight | 0) % mapHeight;
                let col = (x /  tileWidth | 0)  % mapStride;
                let id = map[layer + row * mapStride + col];

                if (id == 0)
                    return 0;

                let data = tse[(id - 1) * 2 + 1] & 0xFFFF;

                if (data == 0)
                    return 0;

                let hashmap = data;
                const length = tse[hashmap++];
                for (let j = 0; j < length; ++j, hashmap += 2) {
                    let obj = tse[hashmap];
                    if (obj && typeof obj == "object" && obj.h == key) {
                        return tse[hashmap + 1];
                    }
                }

                return 0;
            }
            layer += header.mapHeight * header.mapWidth;
            break;
        case 1:
            layer++;
            break;
        default:
            return 0;
        }
    }

    return 0;

}

function scanTileMap(filter, callback) {
    if (!filter)
        return;
    scanTileMapInternal(0, (x, y, properties, offset, len) => {
        for (let key in filter) {
            let match = false;
            let value = filter[key];;

            for (let i = 0; i < len; ++i ) {
                if (key != properties[offset + i * 2].h)
                    continue;
                let pv = properties[offset + i * 2 + 1];
                if (pv && pv.h)
                    pv = pv.h;
                if (value == pv) {
                    match = true;
                    break;
                }
            }

            if (!match)
                return;
        }

        callback(x, y);
    });

    function scanTileMapInternal(layerNumber, callback) {
        let map = _internal.map;
        if (!map)
            return;

        header = {
            layerCount: map[2],
            tileset:  R[map[4].r],
            mapWidth:   map[ 8] | (map[ 9] << 8),
            mapHeight:  map[10] | (map[11] << 8),
            tileWidth:  map[12] | (map[13] << 8),
            tileHeight: map[14] | (map[15] << 8)
        };

        let layer = 16;

        const tse = header.tileset;
        const mapStride = header.mapWidth;
        const mapHeight = header.mapHeight;
        const tileHeight = header.tileHeight;
        const tileWidth = header.tileWidth;
        const spriteX = (tileWidth / 2 - CAMERA_X)|0;
        const spriteY = (tileHeight / 2 - CAMERA_Y)|0;

        for (let i = 0, max = header.layerCount; i < max; ++i) {
            switch (map[layer]) {
            case 0:
                layer++;
                if (i == layerNumber) {
                    let index = 0;
                    for (let y = 0; y < mapHeight; ++y) {
                        for (let x = 0; x < mapStride; ++x, ++index) {
                            let id = map[layer + index];
                            if (id == 0)
                                continue;

                            let data = tse[(id - 1) * 2 + 1] & 0xFFFF;
                            if (data == 0)
                                continue;

                            let hashmap = data;
                            const length = tse[hashmap++];
                            callback(x * tileWidth + spriteX, y * tileHeight + spriteY, tse, hashmap, length);
                        }
                    }
                    return;
                }
                layer += header.mapHeight * header.mapWidth;
                break;
            case 1:
                layer++;
                break;
            default:
                return;
            }
        }
    }
}


function setTileMap(map) {
    const u32 = Uint32Array.from(map);
    const u8 = new Uint8Array(u32.buffer);
    const out = Array.from(u8);
    for (let i = 0; i < map.length; ++i) {
        let value = map[i];
        if (value && typeof value == "object") {
            out[i << 2] = value;
        }
    }
    _internal.map = out;
}

function setFont(font){
    _internal.font = font;
}

function setLED(){}

function setTexture(tex){
    if (tex && tex instanceof Uint8Array)
        _internal.texture = tex;
    else
        _internal.texture = null;
}

function setMirrored(v) {_internal.mirrored = !!v;}
function setFlipped(v) {_internal.flipped = !!v;}
function setTransparent(v) {_internal.transparent = !!v;}
function setRecolor(v) {_internal.recolor = v|0;}

function readByte(arg, offset) {
    return arg[offset|0];
}

function getWidth(texture){
    if (!texture)
        return _internal.framebuffer.width;
    return texture[0];
}

function getHeight(texture){
    if (!texture)
        return _internal.framebuffer.height;
    return texture[1];
}

function clear(){
    _internal.renderQueue.length = 0;
    Object.assign(_internal.clearColor, _internal.pen);
}

function blitInternal(x, y, angle, scale) {
    let texture = _internal.texture;
    if (!texture)
        return;
    let screenWidth = _internal.framebuffer.width;
    let screenHeight = _internal.framebuffer.height;
    let data = texture;
    let width = texture[0];
    let height = texture[1];
    let stride = width;
    let source = data;

    let anchorX = 0.5;
    let anchorY = 0.5;

    let iscale = ((1<<16) / scale)|0;
    let sa = Math.sin(angle);
    let ca = Math.cos(angle);
    let cx = ca * iscale | 0;
    let cy = sa * iscale | 0;
    let lx = -cy;
    let ly = cx;
    let W = width * scale;
    let H = height * scale;
    let ax = 0;
    let ay = 0;

    let t;
    let corner0X = - W * anchorX;
    let corner0Y = - H * anchorY;
    t = ca * corner0X + sa * corner0Y;
    corner0Y = -sa * corner0X + ca * corner0Y;
    corner0X = t;

    let corner1X = W * (1 - anchorX);
    let corner1Y = - H * anchorY;
    t = ca * corner1X + sa * corner1Y;
    corner1Y = -sa * corner1X + ca * corner1Y;
    corner1X = t;

    let corner2X = - W * anchorX;
    let corner2Y = H * (1 - anchorY);
    t = ca * corner2X + sa * corner2Y;
    corner2Y = -sa * corner2X + ca * corner2Y;
    corner2X = t;

    let corner3X = W * (1 - anchorX);
    let corner3Y = H * (1 - anchorY);
    t = ca * corner3X + sa * corner3Y;
    corner3Y = -sa * corner3X + ca * corner3Y;
    corner3X = t;

    corner0X |= 0;
    corner0Y |= 0;
    corner1X |= 0;
    corner1Y |= 0;
    corner2X |= 0;
    corner2Y |= 0;
    corner3X |= 0;
    corner3Y |= 0;

    let minX = corner0X;
    let maxX = corner0X;
    let minY = corner0Y;
    let maxY = corner0Y;

    if (corner1X < minX) minX = corner1X;
    if (corner1X > maxX) maxX = corner1X;
    if (corner1Y < minY) minY = corner1Y;
    if (corner1Y > maxY) maxY = corner1Y;
    if (corner2X < minX) minX = corner2X;
    if (corner2X > maxX) maxX = corner2X;
    if (corner2Y < minY) minY = corner2Y;
    if (corner2Y > maxY) maxY = corner2Y;
    if (corner3X < minX) minX = corner3X;
    if (corner3X > maxX) maxX = corner3X;
    if (corner3Y < minY) minY = corner3Y;
    if (corner3Y > maxY) maxY = corner3Y;

    let dy = minY - corner0Y;
    if (dy < 0){
        ay += ly * dy;
        ax += lx * dy;
    }

    let dx = minX - corner0X;
    if (dx < 0){
        ay += cy * dx;
        ax += cx * dx;
    }

    minX += x;
    minY += y;
    maxX += x;
    maxY += y;

    if (minY < 0){
        ay -= ly * minY;
        ax -= lx * minY;
        minY = 0;
    }
    if (maxY > screenHeight) {
        maxY = screenHeight;
    }
    if (maxX > screenWidth) {
        maxX = screenWidth;
    }
    if (maxY <= 0 || minY >= screenHeight) {
        return;
    }

    let sx = 0x8000;
    let sy = 0x8000;
    if (minX < 0) {
        sx += cx * -minX;
        sy += cy * -minX;
        minX = 0;
    }

    let fb = _internal.fb32;
    let fbi = minY * screenWidth;
    let srci = 4;
    let sign = 1;
    const recolor = _internal.recolor;
    const transparent = _internal.transparent;
    if (_internal.mirrored) {
        srci += width - 1;
        sign = -1;
    }

    if (_internal.flipped) {
        srci += stride * (height - 1);
        stride = -stride;
    }

    for (y = minY; y < maxY; ++y, fbi += screenWidth) {
        let px = ax + sx;
        let py = ay + sy;
        ax += lx; ay += ly;
        for (x = minX; x < maxX; ++x, px += cx, py += cy) {
            let tx = ((px) >> 16) >>> 0;
            let ty = ((py) >> 16) >>> 0;
            if (tx >= width || ty >= height) {
                // fb[fbi + x] = 0xFFFF00FF;
                continue;
            }
            let pixel = source[srci + ty * stride + tx * sign];
            if (!transparent || pixel)
                fb[fbi + x] = palette[(pixel + recolor) & 0xFF];
        }
    }

}

function image(...args){
    switch (args.length) {
    case 0:
        _internal.push(_=>blitInternal(0, 0));
        break;

    case 1:
        setTexture(args[0]);
        _internal.push(_=>blitInternal(0, 0, 0, 1));
        break;

    case 2:
        _internal.push((x, y)=>blitInternal(x, y, 0, 1), args[0]|0, args[1]|0);
        break;

    case 3:
        setTexture(args[0]);
        _internal.push((x, y)=>blitInternal(x, y, 0, 1), args[1]|0, args[2]|0);
        break;

    case 4:
        setTexture(args[0]);
        _internal.push((x, y, a)=>blitInternal(x, y, a, 1.0), args[1]|0, args[2]|0, args[3]|0);
        break;

    case 5:
        setTexture(args[0]);
        _internal.push((x, y, a, z)=>blitInternal(x, y, a, z), args[1]|0, args[2]|0, args[3], args[4]);
        break;

    default:
        break;
    }
    return
}

function rect(x, y, w, h) {
    _internal.push((x, y, w, h) => {
        x |= 0;
        y |= 0;
        w |= 0;
        h |= 0;
        const fb = _internal.framebuffer;

        if (x < 0) {
            w += x;
            x = 0;
        }
        if (y < 0) {
            h += y;
            y = 0;
        }
        if (x + w >= fb.width) {
            w = fb.width - x;
        }
        if (y + h >= fb.height) {
            h = fb.height - y;
        }
        if (w <= 0 || h <= 0) {
            return;
        }

        h += y;
        const pen = _internal.pen;
        for (; y < h; ++y) {
            let j = (y * fb.width + x) * 4;
            for (let i = 0; i < w; ++i) {
                fb.data[j++] = pen.r;
                fb.data[j++] = pen.g;
                fb.data[j++] = pen.b;
                fb.data[j++] = 255;
            }
        }
    }, x, y, w, h);
}

function text(str, x, y){
    if (!_internal.font)
        return;

    str += '';
    x |= 0;
    y |= 0;

    _internal.push((str, x, y) => {
        for (let c of str)
            x += drawChar(x, y, c.charCodeAt(0));
    }, str, x, y);

    return;

    function pixel(x, y) {
        const fb = _internal.framebuffer;
        if (x < fb.width && y < fb.height) {
            const pen = _internal.pen;
            let i = (y * fb.width + x) * 4;
            fb.data[i++] = pen.r;
            fb.data[i++] = pen.g;
            fb.data[i++] = pen.b;
            fb.data[i++] = 255;
        }
    }

    function drawChar(x, y, ch){
        let font = _internal.font;
        const fontW = font[0];
        const fontH = font[1];
        const hbytes = (fontH + 7) >> 3;
        if (font[3] && ch >= 'a'.charCodeAt(0) && ch <= 'z'.charCodeAt(0)) {
            ch = (ch - 'a'.charCodeAt(0)) + 'A'.charCodeAt(0);
        }
        const index = ch - font[2];

        let bitmap = 4 + index * (1 + fontW * hbytes); //add an offset to the pointer
        const charW = font[bitmap++]; //first byte of char is char width

        for (let i = 0; i < charW; ++i) {
            for(let byteNum = 0; byteNum < hbytes; ++byteNum) {
                let bitcolumn = font[bitmap++];
                const endRow = (8 + 8*byteNum < fontH) ? (8 + 8*byteNum) : fontH;
                for (let j = 8*byteNum; j < endRow; ++j) { // was j<=h
                    if (bitcolumn&1) {
                        pixel(x + i, y + j);
                    }
                    bitcolumn>>=1;
                }
            }
        }

        return charW + 1;
    }

}
