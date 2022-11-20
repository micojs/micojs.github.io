const batDead = R.bat1;
const batFly = [R.bat2, R.bat3, R.bat4];

class Bat {
    constructor(id) {
        this.id = id;
        this.x = rand(300);
        this.y = rand(10);
        this.z = 1;
        this.vx = 0;
        this.vy = 0;
        this.hp = 100;
        this.angle = 0;
    }

    updatePlayer() {
        this.vx += RIGHT - LEFT;
        this.vy += DOWN - UP;
    }

    updateAI() {
        let tx = this.x - bats[0].x;
        let ty = this.y - bats[0].y;

        if (tx*tx + ty*ty < 500) {
            this.vx *= 1.026;
            this.vy *= 1.026;
        } else {
            this.vx += (tx < 0) * 2 - 1;
            this.vy += (ty < 0) * 2 - 1;
        }
    }

    update() {
        if (!this.id)
            this.updatePlayer();
        else
            this.updateAI();

        let x = this.x;
        let y = this.y;
        let vx = this.vx;
        let vy = this.vy;

        for (let i = 0; i < this.id; ++i) {
            let tx = x - bats[i].x;
            let ty = y - bats[i].y;
            let d = tx*tx + ty*ty;
            if (d < 200) {
                vx += tx;
                vy += ty;
            }
        }

        vx *= 0.975;
        vy *= 0.975;

        x += vx * 0.1;
        y += vy * 0.1;

        if (y > bgHeight*0.45 && vy > 0) {
            vy = -vy;
            y = bgHeight*0.45;
        }

        if (vx && vy) {
            this.angle = -atan2(vy, vx);
        }

        this.vx = vx;
        this.vy = vy;
        this.x = x;
        this.y = y;

        if (!this.id) {
            cameraX = (cameraX * 15 + (x - width/2)) / 16;
            cameraY = (cameraY * 15 + (y - height/2)) / 16;
            cameraY = max(height - bgHeight, cameraY);
            cameraY = min(height - bgHeight * 0.6, cameraY);
        }
    }

    draw() {
        setFlipped(this.vx < 0);
        setMirrored(false);
        setRecolor((!!this.id) * 2);

        let texture = batDead;
        if (this.hp > 0)
            texture = batFly[(this.id + (frame >> 2))%batFly.length];
        image(texture, this.x - cameraX, this.y - cameraY, this.angle, 1 - 0.25 * !!this.id);
    }
}
