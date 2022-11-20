"set platform espboy";
"include std.js";
"include bat.js";

let width;
let height;
let bgHeight;
let bgWidth;

let cameraX = 0.01;
let cameraY = 0.01;

let frame = 0;
let frames = 0;
let start = 0;
let fps = 0;
let recolor = 0;
let prevTime = 0;
const bats = new Array(10);

function init() {
    width = getWidth();
    height = getHeight();
    bgHeight = getHeight(R.background);
    bgWidth = getWidth(R.background);

    for (let i = 0; i < bats.length; ++i)
        bats[i] = new Bat(i);
}

function update(time) {
    let targetFrame = ceil(time * 30 / 1000)
    let delta = targetFrame - frame;
    prevTime = time;
    frames++;
    if (time - start > 1000) {
        fps = frames;
        frames = 0;
        start = time;
        debug(fps);
    }

    if (A) {
        recolor = rand(0xFF);
        debug("Recolor: ", recolor);
    }

    for (let i = 0; i < delta; ++i) {
        ++frame;
        for (let bat of bats)
            bat.update(delta);
    }
}

function render() {
    setMirrored(false);
    setFlipped(false);
    setTransparent(false);
    setRecolor(recolor);

    let bgX = (-cameraX) % bgWidth;
    if (bgX > 0)
        bgX -= bgWidth;
    image(R.background, bgX, -cameraY);
    image(R.background, bgX + bgWidth, -cameraY);

    for (let bat of bats)
        bat.draw();

    setPen(0, 0, 0);
    text(fps, 5, 5);
}
