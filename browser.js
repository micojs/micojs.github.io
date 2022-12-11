var UP = false, DOWN = false, LEFT = false, RIGHT = false, A = false, B = false, C = false, D = false;

const _internal = {
    font:R.fontMini,
    updateFrequency: 1000 / 30,
    framebuffer:null,
    pen: {r:0, g:0, b:0, a:255},
    recolor: 0,
    mirrored: false,
    flipped: false,
    transparent: true,
    texture: null
};

addEventListener('DOMContentLoaded', _=>{
    document.body.addEventListener('keydown', event => {
        if (event.code == "ArrowUp" || event.code == "KeyI") UP = true;
        else if (event.code == "ArrowDown" || event.code == "KeyK") DOWN = true;
        else if (event.code == "ArrowLeft" || event.code == "KeyJ") LEFT = true;
        else if (event.code == "ArrowRight" || event.code == "KeyL") RIGHT = true;
        else if (event.code == "KeyA" || event.code == "KeyQ" || event.code == "Control") A = true;
        else if (event.code == "KeyS" || event.code == "Shift") B = true;
        else if (event.code == "KeyD" || event.code == "KeyZ") D = true;
        else if (event.code == "KeyF" || event.code == "KeyX") C = true;
    });

    document.body.addEventListener('keyup', event => {
        if (event.code == "ArrowUp" || event.code == "KeyI") UP = false;
        else if (event.code == "ArrowDown" || event.code == "KeyK") DOWN = false;
        else if (event.code == "ArrowLeft" || event.code == "KeyJ") LEFT = false;
        else if (event.code == "ArrowRight" || event.code == "KeyL") RIGHT = false;
        else if (event.code == "KeyA" || event.code == "KeyQ" || event.code == "Control") A = false;
        else if (event.code == "KeyS" || event.code == "Shift") B = false;
        else if (event.code == "KeyD" || event.code == "KeyZ") D = false;
        else if (event.code == "KeyF" || event.code == "KeyX") C = false;
    });

    const ctx = canvas.getContext("2d");
    _internal.framebuffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
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
                let partial = delta / updateDelta;
                for (let i = 0; i < updateDelta; ++i)
                    update(now);
                render(now);
                ctx.putImageData(_internal.framebuffer, 0, 0);
            }
        } finally {
            requestAnimationFrame(tick);
        }
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

function vectorLength() {
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
    let pen = _internal.pen;
    let rgb = (pen.r|0) | ((pen.g|0) << 8) | ((pen.b|0) << 16) | (0xFF << 24);
    let arr = new Uint32Array(_internal.framebuffer.data.buffer);
    arr.fill(rgb);
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

    let fb = new Uint32Array(_internal.framebuffer.data.buffer);
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
        blitInternal(0, 0);
        break;

    case 1:
        setTexture(args[0]);
        blitInternal(0, 0, 0, 1);
        break;

    case 2:
        blitInternal(args[0]|0, args[1]|0, 0, 1);
        break;

    case 3:
        setTexture(args[0]);
        blitInternal(args[1]|0, args[2]|0, 0, 1);
        break;

    case 4:
        setTexture(args[0]);
        blitInternal(args[1]|0, args[2]|0, args[3], 1.0);
        break;

    case 5:
        setTexture(args[0]);
        blitInternal(args[1]|0, args[2]|0, args[3], args[4]);
        break;

    default:
        break;
    }
    return
}

function rect(x, y, w, h) {
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
}

function text(str, x, y){
    if (!_internal.font)
        return;

    str += '';
    x |= 0;
    y |= 0;

    for (let c of str) {
        x += drawChar(x, y, c.charCodeAt(0));
    }
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
