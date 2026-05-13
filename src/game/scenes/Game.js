import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { WD, MP4 } from '../data/worlds';
import { sfx } from '../utils/audio';
import { done, bests, recTime, saveDone, fmt } from '../utils/save';

const W = 800, H = 450;

// Per-world pixel art color schemes
const WC = [
    { coat: 0xB71C1C, hat: 0x4a1500, hatHi: 0x7a2a1a, platBody: 0x7a5c12, platTop: 0x9a7520, platSeam: 0x5a4010 },
    { coat: 0x4A148C, hat: 0x1a0030, hatHi: 0x5a2a9a, platBody: 0x1e1c2a, platTop: 0xC62828, platSeam: 0x0a0a18 },
    { coat: 0xE65100, hat: 0x3b1f00, hatHi: 0x8b4a00, platBody: 0x8b6030, platTop: 0xC8A060, platSeam: 0x604020 },
    { coat: 0x00695C, hat: 0x003030, hatHi: 0x009a88, platBody: 0x0e4a3a, platTop: 0x20B090, platSeam: 0x083828 },
    { coat: 0x880E4F, hat: 0x400020, hatHi: 0xBB3070, platBody: 0x1a0808, platTop: 0xFF3D00, platSeam: 0x100404 },
    { coat: 0x424242, hat: 0x212121, hatHi: 0x616161, platBody: 0x333333, platTop: 0x555555, platSeam: 0x222222 },
];

const EC = [
    { body: 0x8B0000, hat: 0x4a1500, eye: 0xFF4444 },
    { body: 0x1a003a, hat: 0x0d001a, eye: 0xDD88FF },
    { body: 0x6b3a1f, hat: 0x3b1f00, eye: 0xFFBB44 },
    { body: 0x005f6b, hat: 0x002f38, eye: 0x44FFEE },
    { body: 0x8B2500, hat: 0x5c1000, eye: 0xFF6600 },
    { body: 0x555555, hat: 0x333333, eye: 0xFFFFFF },
];

const COIN_COLORS = [0xFFD700, 0xCE93D8, 0xFFCC80, 0x80DEEA, 0xFF7043, 0xAAAAAA];

export class Game extends Scene {
    constructor() { super('Game'); }

    init(data) {
        this.wi = data?.wi ?? 0;
        this.li = data?.li ?? 0;
    }

    create() {
        const lv = WD[this.wi].ls[this.li];
        this.mw = lv.mw;

        this.plats = lv.pl.map(p => ({ x: p[0], y: p[1], w: p[2], h: p[3] }));
        this.coins = lv.co.map(c => ({ x: c[0], y: c[1], got: false }));
        this.cpObj = { x: lv.cp.x, y: lv.cp.y, hit: false };
        this.deaths = 0;
        this.runRank = -1;
        this.t0 = Date.now();
        this.t1 = 0;
        this.camX = 0;
        this.phase = 'play';

        this.movPlats = this.li === 3 && this.wi < 5
            ? MP4[this.wi].map(m => ({ x: m[0], y: m[1], w: m[2], h: m[3], x0: m[4], x1: m[5], spd: m[6], t: 0 }))
            : [];

        this.enemies = this.plats.length >= 7
            ? (lv.en || [2, 4, 6]).map(i => {
                const pl = this.plats[i];
                const cx = pl.x + pl.w / 2 - 7;
                return { x: cx, y: pl.y - 14, minX: pl.x, maxX: pl.x + pl.w - 10, dir: 1, w: 10, h: 14, dead: false, respawn: 0 };
            })
            : [];

        this.P = this._mkP(lv.sp);

        // Graphics layers
        this.bgGfx = this.add.graphics().setScrollFactor(0).setDepth(0);
        this.worldGfx = this.add.graphics().setScrollFactor(1).setDepth(1);
        this.hudGfx = this.add.graphics().setScrollFactor(0).setDepth(10);

        // HUD text objects
        const wd = WD[this.wi];
        this.hudWorldTxt = this.add.text(9, 22, `${wd.e} ${wd.n} › ${wd.ls[this.li].n}`, {
            fontFamily: 'monospace', fontSize: 11, color: wd.c, fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(11).setOrigin(0, 1);

        this.hudTimerTxt = this.add.text(W / 2, 22, '0.00', {
            fontFamily: 'monospace', fontSize: 14, color: '#ffffff', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(11).setOrigin(0.5, 1);

        this.hudCoinsTxt = this.add.text(W / 2 + 32, 22, '0/0', {
            fontFamily: 'monospace', fontSize: 11, color: '#ffffff', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(11).setOrigin(0.5, 1);

        this.hudDeathsTxt = this.add.text(W - 9, 22, '☠ 0', {
            fontFamily: 'monospace', fontSize: 11, color: '#ff6b6b', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(11).setOrigin(1, 1);

        this.add.text(W - 9, 34, 'ESC = menu', {
            fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)'
        }).setScrollFactor(0).setDepth(11).setOrigin(1, 1);

        // Complete overlay
        this.overlayGfx = this.add.graphics().setScrollFactor(0).setDepth(5).setVisible(false);
        this._ctxts = this._buildCompleteTxts();
        this._nextTween = null;

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    _mkP(sp) {
        return { x: sp.x, y: sp.y, vx: 0, vy: 0, w: 18, h: 26, gnd: false, wall: 0, coy: 0, jbuf: 0, cpx: sp.x, cpy: sp.y, nc: 0, face: 1, df: 0 };
    }

    _buildCompleteTxts() {
        const mk = (x, y, str, sz, col, bold) => this.add.text(x, y, str, {
            fontFamily: 'monospace', fontSize: sz, color: col, fontStyle: bold ? 'bold' : 'normal'
        }).setScrollFactor(0).setDepth(6).setOrigin(0.5, 0.5).setVisible(false);

        return {
            title: mk(W / 2, H / 2 - 120, 'LEVEL COMPLETE!', 22, '#FFD700', true),
            time: mk(W / 2, H / 2 - 86, '', 20, '#ffffff', true),
            rank: mk(W / 2, H / 2 - 62, '', 11, '#FFD700', true),
            bestLabel: mk(W / 2, H / 2 - 32, 'BEST TIMES', 10, 'rgba(255,255,255,0.45)', false),
            b0: mk(W / 2, H / 2 - 14, '', 11, '#FFD700', true),
            b1: mk(W / 2, H / 2 + 4, '', 11, '#C0C0C0', true),
            b2: mk(W / 2, H / 2 + 22, '', 11, '#cd7f32', true),
            deaths: mk(W / 2 - 70, H / 2 + 58, '', 11, '#ff6b6b', false),
            coins: mk(W / 2 + 70, H / 2 + 58, '', 11, '#FFD700', false),
            next: mk(W / 2, H / 2 + 88, '', 12, '#FFD700', true),
            esc: mk(W / 2, H / 2 + 110, 'ESC → world select', 10, 'rgba(255,255,255,0.4)', false),
        };
    }

    update(time) {
        const K = Phaser.Input.Keyboard;
        this._jumpJust = K.JustDown(this.spaceKey) || K.JustDown(this.cursors.up) || K.JustDown(this.wasd.up);
        this._escJust = K.JustDown(this.escKey);

        if (this._escJust) {
            this._hideOverlay();
            this.scene.start('WorldSelect');
            return;
        }

        if (this.phase === 'complete') {
            this._handleCompleteInput();
        } else {
            this._physicsUpdate();
        }

        this._drawAll(time / 1000);
    }

    _handleCompleteInput() {
        if (!this._jumpJust) return;
        const nextLi = this.li + 1;
        if (nextLi < WD[this.wi].ls.length) {
            this._hideOverlay();
            this.scene.start('Game', { wi: this.wi, li: nextLi });
        }
    }

    _hideOverlay() {
        this.overlayGfx.setVisible(false);
        Object.values(this._ctxts).forEach(t => t.setVisible(false));
        if (this._nextTween) { this._nextTween.stop(); this._nextTween = null; }
    }

    isL() { return this.cursors.left.isDown || this.wasd.left.isDown; }
    isR() { return this.cursors.right.isDown || this.wasd.right.isDown; }

    _ov(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    _die() {
        sfx('die');
        const p = this.P;
        this.deaths++;
        p.x = p.cpx; p.y = p.cpy;
        p.vx = 0; p.vy = 0;
        p.gnd = false; p.wall = 0; p.df = 60;
    }

    _physicsUpdate() {
        const p = this.P;
        if (p.df > 0) p.df--;

        let mv = 0;
        if (this.isL()) { mv = -1.5; p.face = -1; }
        if (this.isR()) { mv = 1.5; p.face = 1; }

        if (this._jumpJust) p.jbuf = 10;
        if (p.jbuf > 0) {
            if (p.coy > 0) {
                p.vy = -11; sfx('jump'); p.vx = 0; p.coy = 0; p.jbuf = 0;
            } else if (p.wall && !p.gnd) {
                p.vy = -10; sfx('jump'); p.vx = p.wall * -6; p.wall = 0; p.jbuf = 0;
            }
        }
        if (p.jbuf > 0) p.jbuf--;

        if (p.wall && !p.gnd && ((p.wall === 1 && this.isR()) || (p.wall === -1 && this.isL()))) {
            p.vy = Math.min(p.vy, 1.2);
        }

        p.vy = Math.min(p.vy + 0.38, 8);
        if (p.vx) { p.vx *= p.gnd ? 0.82 : 0.88; if (Math.abs(p.vx) < 0.1) p.vx = 0; }

        for (const mp of this.movPlats) {
            mp.t += mp.spd * 0.025;
            mp.x = mp.x0 + (mp.x1 - mp.x0) * (0.5 - 0.5 * Math.cos(mp.t));
        }

        const allPlats = [...this.plats, ...this.movPlats];
        let tx = mv + p.vx;
        p.x += tx; p.gnd = false; p.wall = 0;

        for (const pl of allPlats) {
            if (!this._ov(p.x, p.y, p.w, p.h, pl.x, pl.y, pl.w, pl.h)) continue;
            if (tx > 0) { p.x = pl.x - p.w; p.wall = 1; }
            else if (tx < 0) { p.x = pl.x + pl.w; p.wall = -1; }
            else { p.x = (p.x + 9 < pl.x + pl.w / 2) ? pl.x - p.w : pl.x + pl.w; p.wall = tx > 0 ? 1 : -1; }
            p.vx = 0;
        }

        p.y += p.vy;
        for (const pl of allPlats) {
            if (!this._ov(p.x, p.y, p.w, p.h, pl.x, pl.y, pl.w, pl.h)) continue;
            if (p.vy > 0) { p.y = pl.y - p.h; p.vy = 0; p.gnd = true; }
            else { p.y = pl.y + pl.h; p.vy = Math.max(p.vy, 0); }
        }

        if (p.gnd) { p.coy = 6; p.wall = 0; } else p.coy = Math.max(0, p.coy - 1);
        if (p.x < 0) p.x = 0;

        // Camera tracking
        const lv = WD[this.wi].ls[this.li];
        this.camX += (Math.min(Math.max(p.x - W / 3, 0), lv.mw - W) - this.camX) * 0.1;
        this.cameras.main.scrollX = Math.round(this.camX);

        // Coins
        for (const c of this.coins) {
            if (!c.got && this._ov(p.x, p.y, p.w, p.h, c.x - 8, c.y - 8, 16, 16)) {
                c.got = true; sfx('coin'); p.nc++;
            }
        }

        // Checkpoint
        if (!this.cpObj.hit && this._ov(p.x, p.y, p.w, p.h, this.cpObj.x - 14, this.cpObj.y - 38, 28, 38)) {
            this.cpObj.hit = true; sfx('checkpoint');
            p.cpx = this.cpObj.x - 9; p.cpy = this.cpObj.y - 26;
        }

        // Goal
        const g = lv.go;
        if (this._ov(p.x, p.y, p.w, p.h, g.x - 20, g.y - 28, 40, 28)) {
            this.t1 = Date.now();
            const li = this.wi * 4 + this.li;
            this.runRank = recTime(li, this.t1 - this.t0);
            if (!done[li]) { done[li] = true; saveDone(); }
            this.phase = 'complete';
            sfx('complete');
            this._showComplete();
        }

        // Fell out of world
        if (p.y > H + 120) this._die();

        // Enemies
        for (const e of this.enemies) {
            if (e.dead) {
                if (--e.respawn <= 0) { e.dead = false; e.x = (e.minX + e.maxX) / 2; }
                continue;
            }
            e.x += e.dir * 0.2;
            if (e.x <= e.minX || e.x + e.w >= e.maxX) e.dir *= -1;
            const p2 = this.P;
            if (p2.df === 0 && this._ov(p2.x, p2.y, p2.w, p2.h, e.x, e.y, e.w, e.h)) {
                if (p2.vy > 0 && p2.y + p2.h < e.y + e.h * 0.6) {
                    e.dead = true; e.respawn = 420; p2.vy = -7;
                } else {
                    this._die();
                }
            }
        }
    }

    _showComplete() {
        const li = this.wi * 4 + this.li;
        const ms = this.t1 - this.t0;
        const b = bests[li];
        const tx = this._ctxts;

        this.overlayGfx.setVisible(true);
        this.overlayGfx.clear();
        this.overlayGfx.fillStyle(0x000000, 0.75);
        this.overlayGfx.fillRect(0, 0, W, H);
        this.overlayGfx.fillStyle(0xFFFFFF, 0.04);
        this.overlayGfx.fillRect(W / 2 - 196, H / 2 - 148, 392, 292);
        this.overlayGfx.lineStyle(1, 0xFFD700, 0.3);
        this.overlayGfx.strokeRect(W / 2 - 195, H / 2 - 147, 390, 290);
        this.overlayGfx.lineStyle(1, 0xFFFFFF, 0.1);
        this.overlayGfx.strokeRect(W / 2 - 146, H / 2 - 42, 292, 0);
        this.overlayGfx.strokeRect(W / 2 - 146, H / 2 + 46, 292, 0);

        tx.title.setVisible(true);
        tx.time.setText(fmt(ms)).setVisible(true);

        const mc = ['#FFD700', '#C0C0C0', '#cd7f32'];
        if (this.runRank >= 0) {
            tx.rank.setText(['★ NEW BEST!  #1', '★ TOP 3   #2', '★ TOP 3   #3'][this.runRank])
                .setColor(mc[this.runRank]).setVisible(true);
        } else {
            tx.rank.setText('not a top 3 time').setColor('rgba(255,255,255,0.35)').setVisible(true);
        }

        tx.bestLabel.setVisible(true);
        [tx.b0, tx.b1, tx.b2].forEach((t, i) => {
            if (b[i] !== undefined) {
                const marker = i === this.runRank ? '  ◀' : '';
                t.setText(`${['#1', '#2', '#3'][i]}  ${fmt(b[i])}${marker}`).setVisible(true);
            }
        });

        tx.deaths.setText(`☠ ${this.deaths} death${this.deaths !== 1 ? 's' : ''}`).setVisible(true);
        tx.coins.setText(`${this.P.nc}/${this.coins.length} coins`).setVisible(true);

        const wd = WD[this.wi];
        let nextMsg = '', nextColor = '#FFD700';
        if (this.wi === 5) {
            nextMsg = 'Practice complete!'; nextColor = '#aaaaaa';
        } else if (this.wi === 4 && this.li === 3) {
            nextMsg = 'You conquered all 5 worlds!';
        } else if (this.li < wd.ls.length - 1) {
            nextMsg = 'SPACE → next level';
        } else if (this.wi < 4) {
            nextMsg = `${WD[this.wi + 1].n} UNLOCKED!`; nextColor = '#CE93D8';
        }

        tx.next.setText(nextMsg).setColor(nextColor).setVisible(true);
        tx.esc.setVisible(true);

        const hasNext = this.wi !== 5 && this.li < wd.ls.length - 1;
        if (hasNext) {
            this._nextTween = this.tweens.add({ targets: tx.next, alpha: 0, duration: 500, yoyo: true, repeat: -1, ease: 'Linear' });
        }
    }

    // ── RENDERING ────────────────────────────────────────────────────────

    _drawAll(t) {
        this.bgGfx.clear();
        this.worldGfx.clear();
        this.hudGfx.clear();
        this._drawBg(t);
        this._drawWorld(t);
        this._drawHUD();
    }

    _drawBg(t) {
        const wd = WD[this.wi];
        const c1 = parseInt(wd.bg[0].replace('#', ''), 16);
        const c2 = parseInt(wd.bg[1].replace('#', ''), 16);
        this.bgGfx.fillGradientStyle(c1, c1, c2, c2, 1);
        this.bgGfx.fillRect(0, 0, W, H);

        switch (this.wi) {
            case 0: this._bgPirate(t); break;
            case 1: this._bgNinja(t); break;
            case 2: this._bgWest(t); break;
            case 3: this._bgOcean(t); break;
            case 4: this._bgFire(t); break;
            default: this._bgPractice(); break;
        }

        const bot = parseInt(wd.bot.replace('#', ''), 16);
        this.bgGfx.fillStyle(bot, 1);
        this.bgGfx.fillRect(0, H - 28, W, 28);
        if (this.wi === 4) { this.bgGfx.fillStyle(0xFF3D00, 0.5); this.bgGfx.fillRect(0, H - 28, W, 28); }

        // Wave shimmer
        this.bgGfx.fillStyle(0xFFFFFF, 0.04);
        for (let i = 0; i < 5; i++) {
            const wx = Math.floor((t * 55 + i * 160) % W);
            this.bgGfx.fillRect(wx, H - 18, 44, 2);
        }
    }

    _bgPirate(t) {
        // Pixel art sun
        this.bgGfx.fillStyle(0xFFEB50, 1);
        this.bgGfx.fillRect(688, 44, 28, 28);
        this.bgGfx.fillStyle(0xFFFF88, 0.6);
        this.bgGfx.fillRect(698, 40, 8, 4);
        this.bgGfx.fillRect(698, 72, 8, 4);
        this.bgGfx.fillRect(684, 54, 4, 8);
        this.bgGfx.fillRect(716, 54, 4, 8);
        // Diagonal rays
        this.bgGfx.fillRect(684, 44, 4, 4);
        this.bgGfx.fillRect(716, 44, 4, 4);
        this.bgGfx.fillRect(684, 68, 4, 4);
        this.bgGfx.fillRect(716, 68, 4, 4);

        // Blocky pixel art clouds
        this.bgGfx.fillStyle(0xC4DFF5, 0.2);
        for (let i = 0; i < 4; i++) {
            const cx = Math.floor(((i * 230 + t * 18) % 920) - 60);
            const cy = 50 + i * 10;
            this.bgGfx.fillRect(cx, cy + 8, 70, 14);
            this.bgGfx.fillRect(cx + 10, cy, 40, 12);
            this.bgGfx.fillRect(cx + 22, cy - 8, 22, 12);
        }
    }

    _bgNinja(t) {
        // Twinkling pixel stars
        this.bgGfx.fillStyle(0xFFFFFF, 0.55);
        for (let i = 0; i < 45; i++) {
            if (Math.sin(t * 2.5 + i * 0.7) > 0.3) {
                this.bgGfx.fillRect((i * 97 + 3) % W, (i * 67 + 5) % 280, 2, 2);
            }
        }

        // Pixel art crescent moon
        this.bgGfx.fillStyle(0xFFF5C8, 0.9);
        this.bgGfx.fillRect(648, 42, 28, 28);
        this.bgGfx.fillStyle(0x12082b, 1);
        this.bgGfx.fillRect(658, 38, 24, 24); // cutout = crescent

        // Aurora bands
        this.bgGfx.fillStyle(0x6622AA, 0.06);
        for (let i = 0; i < 3; i++) {
            const ay = 60 + i * 40 + Math.sin(t * 0.5 + i) * 8;
            this.bgGfx.fillRect(0, Math.floor(ay), W, 10);
        }
    }

    _bgWest(t) {
        // Pixel art sun with heat rings
        this.bgGfx.fillStyle(0xFF8C00, 0.12); this.bgGfx.fillRect(652, 28, 74, 74);
        this.bgGfx.fillStyle(0xFFAA00, 0.2);  this.bgGfx.fillRect(660, 36, 58, 58);
        this.bgGfx.fillStyle(0xFFCC00, 0.9);  this.bgGfx.fillRect(670, 46, 38, 38);

        // Mesa silhouettes
        this.bgGfx.fillStyle(0x5a2a08, 0.4);
        [[40, 300, 90, 130], [580, 295, 120, 150], [680, 278, 60, 157]].forEach(([x, y, w, h]) => {
            this.bgGfx.fillRect(x, y, w, h);
            this.bgGfx.fillRect(x - 12, y + 30, w + 24, h);
        });

        // Tumbleweed pixels
        this.bgGfx.fillStyle(0x8B5E3C, 0.35);
        for (let i = 0; i < 3; i++) {
            const tx2 = Math.floor(((i * 270 + t * 35) % 880) - 40);
            this.bgGfx.fillRect(tx2, H - 52, 14, 14);
            this.bgGfx.fillRect(tx2 + 4, H - 56, 6, 6);
        }

        // Dust
        this.bgGfx.fillStyle(0xFFAA55, 0.08);
        for (let i = 0; i < 6; i++) {
            this.bgGfx.fillRect(Math.floor((i * 140 + t * 22) % W), H - 60 - Math.floor((t * 35 + i * 40) % 60), 4, 2);
        }
    }

    _bgOcean(t) {
        // Caustic light streaks
        this.bgGfx.fillStyle(0x0088FF, 0.04);
        for (let i = 0; i < 8; i++) {
            this.bgGfx.fillRect(Math.floor((i * 110 + t * 18) % (W + 40)) - 20, 20 + (i * 47) % 200, 30 + (i * 13) % 40, 4);
        }

        // Rising bubbles (pixel squares)
        this.bgGfx.fillStyle(0x55CCFF, 0.15);
        for (let i = 0; i < 8; i++) {
            const br = 3 + (i % 3) * 2;
            const bx = (i * 110 + 25) % W;
            const by = Math.floor(H - 30 - ((t * 55 + i * 75) % H));
            this.bgGfx.fillRect(bx - br / 2, by - br / 2, br, br);
        }

        // Kelp columns
        this.bgGfx.fillStyle(0x009966, 0.15);
        for (let i = 0; i < 5; i++) {
            const kx = Math.floor(60 + i * 160 + Math.sin(t * 1.5 + i) * 6);
            for (let ky = H - 80; ky < H - 22; ky += 8) {
                this.bgGfx.fillRect(kx, ky, 4, 6);
            }
        }
    }

    _bgFire(t) {
        // Rising ember sparks
        for (let i = 0; i < 14; i++) {
            const col = [0xFF4400, 0xFF6600, 0xFFAA00, 0xFF2200][i % 4];
            const alpha = 0.07 + (i % 3) * 0.04;
            this.bgGfx.fillStyle(col, alpha);
            const ex = Math.floor((i * 73 + t * 38) % W);
            const ey = Math.floor(H - 40 - ((t * 60 + i * 52) % (H - 50)));
            this.bgGfx.fillRect(ex, ey, 4, 4);
        }

        // Lava surface glow
        this.bgGfx.fillStyle(0xFF2200, 0.2);
        this.bgGfx.fillRect(0, H - 40, W, 12);
        this.bgGfx.fillStyle(0xFF6600, 0.12);
        for (let i = 0; i < 6; i++) {
            this.bgGfx.fillRect(Math.floor((i * 130 + t * 22) % W), H - 36, 50, 8);
        }
    }

    _bgPractice() {
        this.bgGfx.lineStyle(1, 0x444444, 0.3);
        for (let x = 0; x < W; x += 32) this.bgGfx.strokeRect(x, 0, 1, H);
        for (let y = 0; y < H; y += 32) this.bgGfx.strokeRect(0, y, W, 1);
    }

    _drawWorld(t) {
        const visL = this.camX - 16;
        const visR = this.camX + W + 16;
        const wc = WC[this.wi];
        const g = this.worldGfx;

        for (const pl of this.plats) {
            if (pl.x + pl.w >= visL && pl.x <= visR) this._drawPlat(pl, wc);
        }

        const mpColors = [0x50B4FF, 0xA050FF, 0xFFAA28, 0x28E6B4, 0xFF6414];
        for (const mp of this.movPlats) {
            if (mp.x + mp.w < visL || mp.x > visR) continue;
            g.fillStyle(mpColors[this.wi] || 0xFFFFFF, 0.35);
            g.fillRect(mp.x - 3, mp.y - 3, mp.w + 6, mp.h + 6);
            this._drawPlat(mp, wc);
            g.fillStyle(0xFFFFFF, 0.12 + Math.abs(Math.sin(t * 4 + mp.x0 * 0.01)) * 0.1);
            g.fillRect(mp.x, mp.y, mp.w, 2);
        }

        this._drawCoins(t, visL, visR);
        this._drawCP();
        this._drawGoal(t);
        this._drawEnemies(t, visL, visR);
        this._drawPlayer();
    }

    _drawPlat(pl, wc) {
        const g = this.worldGfx;
        const { x, y, w, h } = pl;
        g.fillStyle(wc.platBody, 1);
        g.fillRect(x, y, w, h);
        g.fillStyle(wc.platTop, 1);
        g.fillRect(x, y, w, 4);
        // Tile seam lines
        const tileW = [18, 20, 24, 14, 16, 24][this.wi];
        g.fillStyle(wc.platSeam, 0.5);
        for (let tx = Math.ceil(x / tileW) * tileW; tx < x + w; tx += tileW) {
            g.fillRect(tx, y, 1, h);
        }
        if (this.wi === 3) {
            // Ocean: stripe tint
            g.fillStyle(0x64FFC8, 0.05);
            for (let tx = x; tx < x + w; tx += 14) g.fillRect(tx, y, 7, h);
        } else if (this.wi === 4) {
            // Fire: lava seep
            g.fillStyle(0xFF3D00, 0.12);
            g.fillRect(x, y + h - 2, w, 2);
        }
    }

    _drawCoins(t, visL, visR) {
        const g = this.worldGfx;
        const col = COIN_COLORS[this.wi];
        for (const c of this.coins) {
            if (c.got || c.x < visL || c.x > visR) continue;
            const bob = Math.floor(Math.sin(t * 2.5 + c.x * 0.07) * 3);
            // Pixel art diamond coin
            g.fillStyle(col, 1);
            g.fillRect(c.x - 4, c.y + bob - 6, 8, 12);
            g.fillRect(c.x - 6, c.y + bob - 3, 12, 6);
            g.fillStyle(0xFFFFFF, 0.45);
            g.fillRect(c.x - 3, c.y + bob - 5, 3, 3);
        }
    }

    _drawCP() {
        const g = this.worldGfx;
        const cp = this.cpObj;
        g.fillStyle(0x666666, 1);
        g.fillRect(cp.x - 1, cp.y - 40, 3, 40);
        const flagColor = cp.hit ? 0x00E676 : 0xF44336;
        g.fillStyle(flagColor, 1);
        g.fillRect(cp.x + 2, cp.y - 40, 18, 7);
        g.fillRect(cp.x + 2, cp.y - 33, 14, 7);
        g.fillRect(cp.x + 2, cp.y - 26, 10, 7);
        if (cp.hit) {
            g.fillStyle(0x00E676, 0.15);
            g.fillRect(cp.x - 14, cp.y - 54, 28, 28);
        }
    }

    _drawGoal(t) {
        const g = this.worldGfx;
        const lv = WD[this.wi].ls[this.li];
        const goal = lv.go;
        if (this.phase === 'complete') {
            const pulse = 0.1 + Math.abs(Math.sin(t * 6)) * 0.2;
            g.fillStyle(0xFFD700, pulse);
            g.fillRect(goal.x - 32, goal.y - 42, 64, 50);
        }
        g.fillStyle(0x5c2d0a, 1); g.fillRect(goal.x - 18, goal.y - 20, 36, 20);
        g.fillStyle(0x8B4513, 1); g.fillRect(goal.x - 20, goal.y - 28, 40, 9);
        g.fillStyle(0xB8860B, 1);
        g.fillRect(goal.x - 18, goal.y - 19, 36, 3);
        g.fillRect(goal.x - 20, goal.y - 27, 40, 2);
        g.fillStyle(0xFFD700, 1);
        g.fillRect(goal.x - 4, goal.y - 16, 8, 5);
        g.fillRect(goal.x - 3, goal.y - 11, 6, 4);
    }

    _drawEnemies(t, visL, visR) {
        const g = this.worldGfx;
        const ec = EC[this.wi];
        const p = this.P;

        for (const e of this.enemies) {
            if (e.dead && e.respawn >= 60) continue;
            if (e.x + e.w < visL || e.x > visR) continue;

            const a = e.dead ? (60 - e.respawn) / 60 : 1;
            const f = e.dir === -1 ? -1 : 1;
            const ox = Math.round(e.x) + 7;
            const oy = Math.round(e.y);

            const mr = (rx, ry, rw, rh, col, alpha = a) => {
                g.fillStyle(col, alpha);
                g.fillRect(f === 1 ? ox + rx : ox - rx - rw, oy + ry, rw, rh);
            };

            mr(-5, 12, 4, 6, 0x222222);
            mr(1, 12, 4, 6, 0x222222);
            mr(-6, 4, 12, 9, ec.body);
            mr(-6, 4, 12, 2, 0xFFFFFF, a * 0.18);
            mr(-4, 0, 8, 5, 0xFFCC80);
            mr(0, 1, 3, 2, ec.eye);
            mr(1, 1, 1, 1, 0xFFFFFF, a * 0.6);
            mr(-5, -4, 10, 4, ec.hat);
            mr(-3, -7, 7, 3, ec.hat);

            // Warning glow when near player
            if (Math.abs(p.x - e.x) < 80 && Math.abs(p.y - e.y) < 60) {
                g.fillStyle(0xFF3C00, (0.18 + Math.sin(t * 12) * 0.12) * a);
                g.fillRect(ox - 10, oy - 12, 20, 20);
            }
        }
    }

    _drawPlayer() {
        const p = this.P;
        if (p.df > 0 && Math.floor(p.df / 2) % 2 === 0) return;

        const g = this.worldGfx;
        const wc = WC[this.wi];
        const ox = Math.round(p.x) + 9;
        const oy = Math.round(p.y);
        const f = p.face;

        const mr = (rx, ry, rw, rh, col, a = 1) => {
            g.fillStyle(col, a);
            g.fillRect(f === 1 ? ox + rx : ox - rx - rw, oy + ry, rw, rh);
        };

        // Shoes
        mr(-8, 18, 7, 8, 0x111111);
        mr(1, 18, 7, 8, 0x111111);
        // Pants
        mr(-7, 14, 6, 6, 0x222244);
        mr(1, 14, 6, 6, 0x222244);
        // Coat
        mr(-9, 6, 18, 10, wc.coat);
        // Belt
        mr(-9, 14, 18, 3, 0x3e2723);
        mr(-3, 14, 6, 3, 0xFFD700);
        // Face
        mr(-6, 0, 12, 7, 0xFFCC80);
        // Eye
        mr(1, 2, 3, 3, 0x111111);
        mr(2, 2, 1, 1, 0xFFFFFF, 0.8);
        // Hat brim
        mr(-9, -5, 18, 4, wc.hat);
        // Hat top
        mr(-6, -10, 12, 6, wc.hat);
        // Hat highlight
        mr(-5, -9, 5, 2, wc.hatHi);

        // Wall slide glow
        if (p.wall && !p.gnd) {
            const wx = p.wall === 1 ? p.x + p.w : p.x - 4;
            g.fillStyle(0xFFFFFF, 0.18);
            g.fillRect(Math.round(wx), oy - 2, 4, p.h + 4);
        }
    }

    _drawHUD() {
        this.hudGfx.fillStyle(0x000000, 0.55);
        this.hudGfx.fillRect(0, 0, W, 38);
        this.hudGfx.fillStyle(COIN_COLORS[this.wi], 1);
        this.hudGfx.fillRect(W / 2 + 4, 14, 8, 8);

        const ms = (this.phase === 'play' ? Date.now() : this.t1) - this.t0;
        this.hudTimerTxt.setText(fmt(ms));
        this.hudCoinsTxt.setText(`${this.P.nc}/${this.coins.length}`);
        this.hudDeathsTxt.setText(`☠ ${this.deaths}`);
    }
}
