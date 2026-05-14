import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { WD, MP4 } from '../data/worlds';
import { sfx } from '../utils/audio';
import { done, bests, recTime, saveDone, fmt } from '../utils/save';
import { playMusic, toggleMute, isMuted } from '../utils/music';

const W = 800, H = 450;

// Per-world tileset + player color schemes (Celeste-inspired)
const WC = [
    // 0: Pirate Seas — weathered navy wood
    { coat: 0xB71C1C, hat: 0x4a1500, hatHi: 0x7a2a1a,
      body: 0x1A3448, edgeHi: 0x5AABCC, edgeSub: 0x2A6888,
      seam: 0x0E1E2E, tileInner: 0x1E4060, surf: 0x7AC8E4 },
    // 1: Ninja Dojo — dark polished stone
    { coat: 0x4A148C, hat: 0x1a0030, hatHi: 0x5a2a9a,
      body: 0x18102C, edgeHi: 0x8844CC, edgeSub: 0x442288,
      seam: 0x0C0820, tileInner: 0x28145A, surf: 0xAA77EE },
    // 2: Wild West — warm sandstone / adobe
    { coat: 0xE65100, hat: 0x3b1f00, hatHi: 0x8b4a00,
      body: 0x5A3418, edgeHi: 0xCE8840, edgeSub: 0x9A6028,
      seam: 0x38200E, tileInner: 0x7A4828, surf: 0xE4AA60 },
    // 3: Deep Ocean — dark teal stone / coral
    { coat: 0x00695C, hat: 0x003030, hatHi: 0x009a88,
      body: 0x082030, edgeHi: 0x00BB99, edgeSub: 0x007766,
      seam: 0x04101A, tileInner: 0x0C3040, surf: 0x22DDBB },
    // 4: Fire & Brimstone — obsidian with lava veins
    { coat: 0x880E4F, hat: 0x400020, hatHi: 0xBB3070,
      body: 0x140808, edgeHi: 0xFF3300, edgeSub: 0xAA1A00,
      seam: 0x080404, tileInner: 0x200C0C, surf: 0xFF5500 },
    // 5: Practice — clean gray
    { coat: 0x424242, hat: 0x212121, hatHi: 0x616161,
      body: 0x2A2A2A, edgeHi: 0x666666, edgeSub: 0x444444,
      seam: 0x1A1A1A, tileInner: 0x333333, surf: 0x888888 },
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
        this.particles = [];
        this.shakeLife = 0;
        this.shakeStr = 0;

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
        this.dashKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.zKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.mKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

        playMusic(this.wi);
    }

    _mkP(sp) {
        return { x: sp.x, y: sp.y, vx: 0, vy: 0, w: 18, h: 26, gnd: false, wall: 0, coy: 0, jbuf: 0,
                 cpx: sp.x, cpy: sp.y, nc: 0, face: 1, df: 0,
                 dash: 0, dashDir: 1, dashAvail: true, dashTrail: [] };
    }

    _buildCompleteTxts() {
        const mk = (x, y, str, sz, col, bold) => this.add.text(x, y, str, {
            fontFamily: 'monospace', fontSize: sz, color: col, fontStyle: bold ? 'bold' : 'normal'
        }).setScrollFactor(0).setDepth(6).setOrigin(0.5, 0.5).setVisible(false);

        return {
            title: mk(W / 2, H / 2 - 120, 'Level Complete!', 22, '#FFD700', true),
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
        this._escJust  = K.JustDown(this.escKey);
        this._dashJust = K.JustDown(this.dashKey) || K.JustDown(this.zKey);
        if (K.JustDown(this.mKey)) toggleMute();

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
        this._emit(p.x + p.w / 2, p.y + p.h / 2, 20, {
            col: [WC[this.wi].edgeHi, 0xFFFFFF, 0xFFDD88],
            spdMin: 1.5, spdMax: 5.5, life: 30, size: 3, grav: 0.18,
        });
        this.shakeStr = 6; this.shakeLife = 14;
        p.x = p.cpx; p.y = p.cpy;
        p.vx = 0; p.vy = 0;
        p.gnd = false; p.wall = 0; p.df = 60;
        p.dash = 0; p.dashAvail = true; p.dashTrail = [];
    }

    _physicsUpdate() {
        const p = this.P;
        const prevGnd = p.gnd;
        if (p.df > 0) p.df--;

        // ── Dash activation (Shift / Z) ──────────────────────────────────
        if (this._dashJust && p.dashAvail && p.df === 0 && p.dash === 0) {
            const dir = this.isL() ? -1 : this.isR() ? 1 : p.face;
            p.dash = 12; p.dashDir = dir; p.face = dir;
            p.dashAvail = false; p.vy = 0; p.vx = 0; p.dashTrail = [];
            sfx('jump');
        }

        // ── Horizontal movement ──────────────────────────────────────────
        let mv = 0;
        if (p.dash > 0) {
            mv = p.dashDir * 14;   // override: fast dash, gravity suspended
            p.vy = 0;
            p.dash--;
            if (p.dash === 0) p.vx = p.dashDir * 2.5;
            p.dashTrail.push({ x: p.x, y: p.y });
            if (p.dashTrail.length > 7) p.dashTrail.shift();
            // Trailing sparks every other dash frame
            if (p.dash % 2 === 0) this._emit(
                p.x + (p.dashDir > 0 ? 0 : p.w), p.y + p.h * 0.5, 3, {
                    col: WC[this.wi].edgeHi, spdMin: 0.2, spdMax: 1.4, life: 7, size: 2, grav: 0,
                    cone: Math.PI * (p.dashDir > 0 ? 1 : 0), spread: 0.7,
                }
            );
        } else {
            if (this.isL()) { mv = -2.25; p.face = -1; }
            if (this.isR()) { mv = 2.25; p.face = 1; }
            if (p.dashTrail.length > 0) p.dashTrail.shift();
        }

        // ── Jump ─────────────────────────────────────────────────────────
        if (this._jumpJust) p.jbuf = 10;
        if (p.jbuf > 0) {
            if (p.coy > 0) {
                p.vy = -14; sfx('jump'); p.vx = 0; p.coy = 0; p.jbuf = 0;
                if (p.dash > 0) p.dash = 0;
            } else if (p.wall && !p.gnd) {
                p.vy = -13; sfx('jump'); p.vx = p.wall * -8; p.wall = 0; p.jbuf = 0;
                p.dashAvail = true;
            }
        }
        if (p.jbuf > 0) p.jbuf--;

        if (p.wall && !p.gnd && ((p.wall === 1 && this.isR()) || (p.wall === -1 && this.isL()))) {
            p.vy = Math.min(p.vy, 1.2);
            // Wall-slide sparks (throttled to avoid flooding)
            if (p.vy > 0.4 && this.particles.length < 60) this._emit(
                p.wall === 1 ? p.x + p.w : p.x,
                p.y + p.h * 0.3 + Math.random() * p.h * 0.5, 1, {
                    col: 0xFFEEBB, spdMin: 0.4, spdMax: 1.8, life: 8, size: 2, grav: 0.12,
                    cone: Math.PI / 2, spread: 0.5,
                }
            );
        }

        if (p.dash === 0) p.vy = Math.min(p.vy + 0.30, 9);
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
            if (p.dash > 0) p.dash = 0; // wall cancels dash
        }

        const landVy = p.vy;
        p.y += p.vy;
        for (const pl of allPlats) {
            if (!this._ov(p.x, p.y, p.w, p.h, pl.x, pl.y, pl.w, pl.h)) continue;
            if (p.vy > 0) { p.y = pl.y - p.h; p.vy = 0; p.gnd = true; }
            else { p.y = pl.y + pl.h; p.vy = Math.max(p.vy, 0); }
        }

        if (p.gnd) {
            p.coy = 6; p.wall = 0; p.dashAvail = true;
            // Landing dust + optional shake on hard impact
            if (!prevGnd) {
                const wc = WC[this.wi];
                this._emit(p.x + p.w / 2, p.y + p.h, 9, {
                    col: [wc.surf, wc.edgeHi, 0xBBAA99],
                    spdMin: 0.4, spdMax: 2.5, life: 18, size: 2, grav: 0.08,
                    cone: -Math.PI / 2, spread: Math.PI * 0.55,
                });
                if (landVy > 5) { this.shakeStr = 2; this.shakeLife = 5; }
            }
        } else {
            p.coy = Math.max(0, p.coy - 1);
        }
        if (p.x < 0) p.x = 0;

        // Camera tracking
        const lv = WD[this.wi].ls[this.li];
        this.camX += (Math.min(Math.max(p.x - W / 3, 0), lv.mw - W) - this.camX) * 0.1;
        this.cameras.main.scrollX = Math.round(this.camX);
        if (this.shakeLife > 0) {
            const s = ((this.shakeStr * this.shakeLife / 12) | 0) || 1;
            this.cameras.main.scrollX += ((Math.random() * 2 - 1) * s) | 0;
            this.cameras.main.scrollY  = ((Math.random() * 2 - 1) * s) | 0;
            this.shakeLife--;
        } else {
            this.cameras.main.scrollY = 0;
        }

        // Coins
        for (const c of this.coins) {
            if (!c.got && this._ov(p.x, p.y, p.w, p.h, c.x - 8, c.y - 8, 16, 16)) {
                c.got = true; sfx('coin'); p.nc++;
                this._emit(c.x, c.y, 12, {
                    col: [COIN_COLORS[this.wi], 0xFFFFFF, 0xFFFF88],
                    spdMin: 0.8, spdMax: 3.2, life: 22, size: 2, grav: 0.1,
                });
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
                    this._emit(e.x + e.w / 2, e.y, 10, {
                        col: [WC[this.wi].edgeHi, 0xFFFFFF], spdMin: 1, spdMax: 3, life: 18, size: 2, grav: 0.15,
                        cone: -Math.PI / 2, spread: Math.PI * 0.7,
                    });
                    this.shakeStr = 2; this.shakeLife = 4;
                } else {
                    this._die();
                }
            }
        }

        // Tick all particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx; pt.y += pt.vy; pt.vy += pt.grav; pt.life--;
            if (pt.life <= 0) this.particles.splice(i, 1);
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
        this.overlayGfx.fillStyle(0xFFFFFF, 0.1);
        this.overlayGfx.fillRect(W / 2 - 146, H / 2 - 42, 292, 1);
        this.overlayGfx.fillRect(W / 2 - 146, H / 2 + 46, 292, 1);

        tx.title.setVisible(true);
        tx.time.setText(fmt(ms)).setVisible(true);

        const mc = ['#FFD700', '#C0C0C0', '#cd7f32'];
        if (this.runRank >= 0) {
            tx.rank.setText(['★ New Best! #1', '★ Top 3 · #2', '★ Top 3 · #3'][this.runRank])
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

    _emit(x, y, n, opt) {
        const cols = Array.isArray(opt.col) ? opt.col : [opt.col];
        const grav = opt.grav ?? 0.12;
        for (let i = 0; i < n; i++) {
            const angle = opt.cone != null
                ? opt.cone + (Math.random() - 0.5) * (opt.spread ?? Math.PI)
                : Math.random() * Math.PI * 2;
            const spd = opt.spdMin + Math.random() * (opt.spdMax - opt.spdMin);
            const life = Math.round(opt.life * (0.7 + Math.random() * 0.6));
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd + (opt.dvx ?? 0),
                vy: Math.sin(angle) * spd + (opt.dvy ?? 0),
                life, maxLife: life,
                col: cols[(Math.random() * cols.length) | 0],
                size: opt.size ?? 2,
                grav,
            });
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
        const g = this.bgGfx;
        const off = this.camX;

        // Far: distant islands (5% parallax)
        g.fillStyle(0x0D3560, 0.45);
        [120, 380, 640].forEach((bx, i) => {
            const sx = ((bx - off * 0.05 + 4000) % W) | 0;
            g.fillRect(sx - 30, 308 + i * 6, 80, 62);
            g.fillRect(sx, 290 + i * 4, 28, 20);
        });

        // Lighthouse (12% parallax)
        const lhX = ((650 - off * 0.12 + 4000) % W) | 0;
        g.fillStyle(0xEAEAD0, 0.65);
        g.fillRect(lhX, 268, 12, 52);
        g.fillRect(lhX - 4, 262, 20, 8);
        g.fillStyle(0xFFCC00, 0.4 + Math.sin(t * 2) * 0.3);
        g.fillRect(lhX - 2, 258, 16, 6);

        // Ship silhouettes (18% parallax)
        g.fillStyle(0x0D2D50, 0.75);
        [200, 540].forEach((bx, i) => {
            const sx = ((bx - off * 0.18 + 4000) % W) | 0;
            g.fillRect(sx - 24, 340, 48, 10);
            g.fillRect(sx - 16, 332, 32, 10);
            g.fillRect(sx - 3, 300, 3, 34);
            g.fillRect(sx + 8, 308, 3, 26);
            g.fillStyle(0xD4C8A0, 0.28);
            g.fillRect(sx - 12, 301, 14, 20);
            g.fillRect(sx + 7, 309, 12, 16);
            g.fillStyle(0x0D2D50, 0.75);
        });

        // Pixel art sun
        g.fillStyle(0xFFEB50, 1);
        g.fillRect(688, 44, 28, 28);
        g.fillStyle(0xFFFF88, 0.6);
        for (const [rx, ry] of [[698,40],[698,72],[684,54],[716,54],[684,44],[716,44],[684,68],[716,68]]) {
            g.fillRect(rx, ry, rx > 690 && rx < 712 ? 8 : 4, rx > 690 && rx < 712 ? 4 : 8);
        }

        // Pixel clouds
        g.fillStyle(0xC4DFF5, 0.2);
        for (let i = 0; i < 4; i++) {
            const cx = Math.floor(((i * 230 + t * 18) % 920) - 60);
            const cy = 50 + i * 10;
            g.fillRect(cx, cy + 8, 70, 14);
            g.fillRect(cx + 10, cy, 40, 12);
            g.fillRect(cx + 22, cy - 8, 22, 12);
        }

        // Ocean horizon glow
        g.fillStyle(0x1A6BB5, 0.12);
        g.fillRect(0, 348, W, 28);
    }

    _bgNinja(t) {
        const g = this.bgGfx;
        const off = this.camX;

        // Far: pagoda / fortress silhouettes (6% parallax)
        g.fillStyle(0x0E0820, 0.85);
        [80, 310, 560, 720].forEach((bx, i) => {
            const sx = ((bx - off * 0.06 + 4000) % W) | 0;
            const h2 = 80 + i * 20;
            // Main tower
            g.fillRect(sx, 340 - h2, 28, h2);
            // Tiered roofs (pagoda style)
            g.fillRect(sx - 8, 340 - h2, 44, 6);
            g.fillRect(sx - 4, 340 - h2 + 26, 36, 5);
            g.fillRect(sx - 1, 340 - h2 + 50, 30, 4);
        });

        // Bamboo stalks (20% parallax)
        g.fillStyle(0x1A3A1A, 0.5);
        for (let i = 0; i < 6; i++) {
            const bx = ((i * 130 + 60 - off * 0.20 + 4000) % W) | 0;
            for (let seg = 0; seg < 6; seg++) {
                g.fillRect(bx, 280 - seg * 28, 5, 25);
                g.fillRect(bx - 2, 280 - seg * 28 + 24, 9, 2); // node ring
                if (seg % 2 === 0) g.fillRect(bx + 5, 280 - seg * 28 + 4, 12, 3); // leaf
            }
        }

        // Twinkling pixel stars
        g.fillStyle(0xFFFFFF, 0.55);
        for (let i = 0; i < 45; i++) {
            if (Math.sin(t * 2.5 + i * 0.7) > 0.3)
                g.fillRect((i * 97 + 3) % W, (i * 67 + 5) % 280, 2, 2);
        }

        // Crescent moon
        g.fillStyle(0xFFF5C8, 0.9); g.fillRect(648, 42, 28, 28);
        g.fillStyle(0x12082b, 1);   g.fillRect(658, 38, 24, 24);

        // Aurora bands
        g.fillStyle(0x6622AA, 0.06);
        for (let i = 0; i < 3; i++) {
            const ay = 60 + i * 40 + Math.sin(t * 0.5 + i) * 8;
            g.fillRect(0, Math.floor(ay), W, 10);
        }

        // Lantern glow dots
        g.fillStyle(0xFFAA00, 0.18);
        for (let i = 0; i < 5; i++) {
            const lx = ((i * 155 + 40 - off * 0.15 + 4000) % W) | 0;
            g.fillRect(lx - 3, 316, 6, 8);
            g.fillStyle(0xFFAA00, 0.06 + Math.sin(t * 3 + i) * 0.05);
            g.fillRect(lx - 8, 310, 16, 18);
            g.fillStyle(0xFFAA00, 0.18);
        }
    }

    _bgWest(t) {
        const g = this.bgGfx;
        const off = this.camX;

        // Far: distant mesa buttes (5% parallax)
        g.fillStyle(0x3A1800, 0.55);
        [30, 240, 480, 680].forEach((bx, i) => {
            const sx = ((bx - off * 0.05 + 4000) % W) | 0;
            const mh = 90 + i * 22;
            g.fillRect(sx, 350 - mh, 70 + i * 10, mh);          // main butte
            g.fillRect(sx - 10, 350 - mh + 18, 90 + i * 10, mh); // wider base
        });

        // Mid: cacti row (14% parallax)
        g.fillStyle(0x2A4A18, 0.55);
        for (let i = 0; i < 5; i++) {
            const cx = ((i * 155 + 70 - off * 0.14 + 4000) % W) | 0;
            g.fillRect(cx, 295, 8, 55);          // trunk
            g.fillRect(cx - 12, 308, 12, 6);     // left arm
            g.fillRect(cx - 12, 302, 6, 8);      // left arm up
            g.fillRect(cx + 8, 320, 12, 6);      // right arm
            g.fillRect(cx + 14, 314, 6, 8);      // right arm up
        }

        // Pixel art sun with heat rings
        g.fillStyle(0xFF8C00, 0.12); g.fillRect(652, 28, 74, 74);
        g.fillStyle(0xFFAA00, 0.2);  g.fillRect(660, 36, 58, 58);
        g.fillStyle(0xFFCC00, 0.9);  g.fillRect(670, 46, 38, 38);

        // Tumbleweed pixels
        g.fillStyle(0x8B5E3C, 0.35);
        for (let i = 0; i < 3; i++) {
            const tx2 = Math.floor(((i * 270 + t * 35) % 880) - 40);
            g.fillRect(tx2, H - 52, 14, 14);
            g.fillRect(tx2 + 4, H - 56, 6, 6);
        }

        // Dust haze at ground level
        g.fillStyle(0xFFAA55, 0.07);
        for (let i = 0; i < 6; i++)
            g.fillRect(Math.floor((i * 140 + t * 22) % W), H - 60 - Math.floor((t * 35 + i * 40) % 60), 4, 2);
    }

    _bgOcean(t) {
        const g = this.bgGfx;
        const off = this.camX;

        // Far: coral reef silhouette (5% parallax)
        g.fillStyle(0x042030, 0.8);
        [60, 260, 480, 680].forEach((bx, i) => {
            const sx = ((bx - off * 0.05 + 4000) % W) | 0;
            // Fan coral shape
            g.fillRect(sx, 330, 6, 40);
            g.fillRect(sx - 10, 320, 26, 12);
            g.fillRect(sx - 6, 310, 18, 12);
            g.fillRect(sx - 2, 300, 10, 12);
        });

        // Mid: deep-sea creature silhouettes (12% parallax)
        g.fillStyle(0x043848, 0.5);
        [180, 480].forEach((bx) => {
            const sx = ((bx - off * 0.12 + 4000) % W) | 0;
            // Jellyfish bell
            g.fillRect(sx - 14, 180, 28, 16);
            g.fillRect(sx - 10, 196, 20, 8);
            // Tentacles
            for (let j = 0; j < 5; j++) {
                const tx2 = sx - 10 + j * 5;
                const ty = 204 + Math.floor(Math.sin(t * 2 + j) * 8);
                g.fillRect(tx2, ty, 2, 20);
            }
        });

        // Caustic light streaks
        g.fillStyle(0x0088FF, 0.04);
        for (let i = 0; i < 8; i++)
            g.fillRect(Math.floor((i * 110 + t * 18) % (W + 40)) - 20, 20 + (i * 47) % 200, 30 + (i * 13) % 40, 4);

        // Rising bubbles
        g.fillStyle(0x55CCFF, 0.15);
        for (let i = 0; i < 8; i++) {
            const br = 3 + (i % 3) * 2;
            const bx = (i * 110 + 25) % W;
            const by = Math.floor(H - 30 - ((t * 55 + i * 75) % H));
            g.fillRect(bx - br / 2, by - br / 2, br, br);
        }

        // Kelp columns (swaying)
        g.fillStyle(0x009966, 0.15);
        for (let i = 0; i < 5; i++) {
            const kx = Math.floor(60 + i * 160 + Math.sin(t * 1.5 + i) * 6);
            for (let ky = H - 80; ky < H - 22; ky += 8)
                g.fillRect(kx, ky, 4, 6);
        }

        // Bioluminescent sparkle floor
        g.fillStyle(0x00DDBB, 0.12);
        for (let i = 0; i < 10; i++) {
            if (Math.sin(t * 3 + i * 1.3) > 0.5)
                g.fillRect((i * 83 + 12) % W, H - 35 + ((i * 11) % 16), 3, 3);
        }
    }

    _bgFire(t) {
        const g = this.bgGfx;
        const off = this.camX;

        // Far: volcano silhouette (5% parallax)
        g.fillStyle(0x0A0000, 0.9);
        [150, 560].forEach((bx, i) => {
            const sx = ((bx - off * 0.05 + 4000) % W) | 0;
            const vw = 120 + i * 30;
            // Volcano cone
            for (let h2 = 0; h2 < 120 + i * 20; h2 += 4) {
                const ww = Math.floor(vw * (h2 / (120 + i * 20)));
                g.fillRect(sx - ww / 2, 370 - h2, ww, 4);
            }
            // Crater glow
            g.fillStyle(0xFF3300, 0.3 + Math.sin(t * 0.8 + i) * 0.15);
            g.fillRect(sx - 12, 252, 24, 6);
            g.fillStyle(0xFFAA00, 0.2);
            g.fillRect(sx - 6, 248, 12, 4);
            g.fillStyle(0x0A0000, 0.9);
        });

        // Mid: lava river channels (10% parallax)
        g.fillStyle(0xFF2200, 0.18);
        [100, 400, 680].forEach((bx) => {
            const sx = ((bx - off * 0.10 + 4000) % W) | 0;
            // Zigzag lava stream
            g.fillRect(sx - 4, 300, 8, 40);
            g.fillRect(sx - 8, 340, 16, 20);
            g.fillRect(sx - 4, 360, 8, 20);
        });
        g.fillStyle(0xFF6600, 0.1);
        for (let i = 0; i < 6; i++) {
            const sx2 = ((i * 130 - off * 0.10 + 4000) % W) | 0;
            g.fillRect(sx2, 380, 50, 6);
        }

        // Rising ember sparks
        for (let i = 0; i < 14; i++) {
            const col = [0xFF4400, 0xFF6600, 0xFFAA00, 0xFF2200][i % 4];
            g.fillStyle(col, 0.07 + (i % 3) * 0.04);
            const ex = Math.floor((i * 73 + t * 38) % W);
            const ey = Math.floor(H - 40 - ((t * 60 + i * 52) % (H - 50)));
            g.fillRect(ex, ey, 4, 4);
        }

        // Lava pool glow at bottom
        g.fillStyle(0xFF2200, 0.2);
        g.fillRect(0, H - 40, W, 12);
        g.fillStyle(0xFF6600, 0.12);
        for (let i = 0; i < 6; i++)
            g.fillRect(Math.floor((i * 130 + t * 22) % W), H - 36, 50, 8);

        // Smoke plumes rising from volcano tops
        g.fillStyle(0x330000, 0.15);
        for (let i = 0; i < 4; i++) {
            const sx = ((i * 185 + 60 - off * 0.05 + 4000) % W) | 0;
            const sy = 220 - Math.floor((t * 20 + i * 40) % 60);
            g.fillRect(sx - 6, sy, 12, 10);
            g.fillRect(sx - 9, sy + 10, 18, 8);
            g.fillRect(sx - 12, sy + 18, 24, 6);
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
        // Particles (drawn above world objects, in world space)
        for (const pt of this.particles) {
            const a = pt.life / pt.maxLife;
            g.fillStyle(pt.col, a * 0.85);
            const s = pt.size;
            g.fillRect((pt.x - s / 2) | 0, (pt.y - s / 2) | 0, s, s);
        }
    }

    _drawPlat(pl, wc) {
        const g = this.worldGfx;
        const { x, y, w, h } = pl;

        // Body fill
        g.fillStyle(wc.body, 1);
        g.fillRect(x, y, w, h);

        // 8×8 tile grid seams
        const TS = 8;
        g.fillStyle(wc.seam, 1);
        for (let tx = Math.ceil(x / TS) * TS; tx < x + w; tx += TS)
            g.fillRect(tx, y, 1, h);
        for (let ty = Math.ceil(y / TS) * TS; ty < y + h; ty += TS)
            g.fillRect(x, ty, w, 1);

        // Inner tile X-pattern: 4 corner dots per 8×8 cell
        const cx0 = Math.ceil(x / TS) * TS, cy0 = Math.ceil(y / TS) * TS;
        g.fillStyle(wc.tileInner, 1);
        for (let cx = cx0; cx + TS <= x + w; cx += TS) {
            for (let cy = cy0; cy + TS <= y + h; cy += TS) {
                g.fillRect(cx + 2, cy + 2, 2, 2);
                g.fillRect(cx + TS - 4, cy + 2, 2, 2);
                g.fillRect(cx + 2, cy + TS - 4, 2, 2);
                g.fillRect(cx + TS - 4, cy + TS - 4, 2, 2);
            }
        }

        // World-specific surface decoration above top edge
        this._drawPlatTop(x, y, w, wc);

        // Bright 2px top edge + 1px sub-highlight
        g.fillStyle(wc.edgeHi, 1);
        g.fillRect(x, y, w, 2);
        g.fillStyle(wc.edgeSub, 1);
        g.fillRect(x, y + 2, w, 1);
        // Subtle left-edge highlight
        g.fillStyle(wc.edgeHi, 0.22);
        g.fillRect(x, y, 1, h);
        // Dark bottom shadow
        g.fillStyle(0x000000, 0.28);
        g.fillRect(x, y + h - 2, w, 2);
    }

    _drawPlatTop(x, y, w, wc) {
        const g = this.worldGfx;
        const seed = (x * 7 + y * 13) | 0;
        switch (this.wi) {
            case 0: { // Pirate: sea-spray foam bumps
                g.fillStyle(wc.surf, 0.75);
                for (let sx = x; sx < x + w; sx += 4) {
                    const n = ((seed + sx * 3) * 1103515245 + 12345) >>> 0;
                    if (n % 3 !== 0) g.fillRect(sx, y - 2, 3, 2);
                }
                g.fillStyle(0xFFFFFF, 0.55);
                for (let sx = x + 1; sx < x + w; sx += 7) g.fillRect(sx, y - 1, 2, 1);
                break;
            }
            case 1: { // Ninja: purple energy wisps
                g.fillStyle(wc.surf, 0.5);
                for (let sx = x + 3; sx < x + w - 3; sx += 9) {
                    const n = ((seed + sx) * 1103515245) >>> 0;
                    const ht = 2 + n % 3;
                    g.fillRect(sx, y - ht, 2, ht);
                    g.fillRect(sx + 4, y - 1, 2, 1);
                }
                break;
            }
            case 2: { // Wild West: sand grain noise + pebbles
                g.fillStyle(wc.surf, 1);
                for (let sx = x; sx < x + w; sx += 3) {
                    const n = ((seed + sx * 5) * 1103515245) >>> 0;
                    if (n % 4 !== 0) g.fillRect(sx, y, 2, 1);
                }
                g.fillStyle(0xC07838, 1);
                for (let sx = x + 2; sx < x + w - 2; sx += 7) {
                    const n = ((seed + sx * 11) * 1103515245) >>> 0;
                    if (n % 3 === 0) g.fillRect(sx, y - 2, 3, 2);
                }
                break;
            }
            case 3: { // Ocean: coral / seaweed tufts
                g.fillStyle(wc.surf, 0.85);
                for (let sx = x + 2; sx < x + w - 2; sx += 8) {
                    const n = ((seed + sx * 7) * 1103515245) >>> 0;
                    if (n % 2 === 0) {
                        g.fillRect(sx, y - 6, 2, 6);
                        g.fillRect(sx - 1, y - 3, 4, 2);
                    } else {
                        g.fillRect(sx, y - 4, 4, 4);
                    }
                }
                break;
            }
            case 4: { // Fire: cracked lava crust + ember sparks
                g.fillStyle(wc.surf, 1);
                g.fillRect(x, y, w, 3);
                g.fillStyle(0xFF6600, 0.55);
                for (let sx = x + 3; sx < x + w - 3; sx += 9) g.fillRect(sx, y, 1, 3);
                g.fillStyle(0xFF2200, 0.5);
                for (let sx = x + 5; sx < x + w; sx += 16) {
                    g.fillRect(sx, y - 2, 2, 2);
                    g.fillRect(sx + 2, y - 4, 2, 2);
                }
                break;
            }
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

            switch (this.wi) {
                case 0: this._sprPirate(mr, g, ox, oy, f, t, a); break;
                case 1: this._sprNinja(mr, g, ox, oy, f, t, a); break;
                case 2: this._sprCowboy(mr, g, ox, oy, f, t, a); break;
                case 3: this._sprCrab(g, ox, oy, f, t, a); break;
                case 4: this._sprGolem(mr, g, ox, oy, t, a); break;
                default: this._sprDefault(mr, t, a); break;
            }

            if (Math.abs(p.x - e.x) < 80 && Math.abs(p.y - e.y) < 60) {
                g.fillStyle(0xFF3C00, (0.18 + Math.sin(t * 12) * 0.12) * a);
                g.fillRect(ox - 10, oy - 12, 20, 20);
            }
        }
    }

    _sprPirate(mr, g, ox, oy, f, t, a) {
        // Dark boots
        mr(-5, 10, 4, 6, 0x1a0a00);
        mr(1,  10, 4, 6, 0x1a0a00);
        // Blue/white striped shirt
        mr(-6, 4, 12, 2, 0xf0f0f0, a * 0.9);
        mr(-6, 6, 12, 2, 0x1a3e7a);
        mr(-6, 8, 12, 2, 0xf0f0f0, a * 0.9);
        // Belt + gold buckle
        mr(-6, 10, 12, 2, 0x3e2000);
        mr(-1, 10,  3, 2, 0xFFD700);
        // Face (skin)
        mr(-5, -1, 10, 6, 0xFFCC80);
        // Eye patch (front-facing side)
        mr(0, 0, 3, 3, 0x111111);
        // Back eye gleam
        mr(-4, 1, 2, 2, 0x222222);
        mr(-3, 1, 1, 1, 0xFFFFFF, a * 0.7);
        // Tricorn hat: brim
        mr(-8, -2, 16, 3, 0x120a00);
        // Crown + side wings
        mr(-5, -9, 10, 8, 0x120a00);
        mr(-8, -5,  3, 4, 0x120a00);
        mr( 5, -5,  3, 4, 0x120a00);
        // Gold hat band
        mr(-5, -2, 10, 1, 0xFFD700, a * 0.8);
        // Cutlass blade (front hand)
        mr(4, -4, 2, 14, 0xC8C8C8);
        mr(4, -5, 2,  2, 0xFFFFFF, a * 0.6);
        // Crossguard + handle
        mr(3, 5, 5, 2, 0x888888);
        mr(4, 6, 2, 5, 0x5a2800);
    }

    _sprNinja(mr, g, ox, oy, f, t, a) {
        // Dark legs + sandal straps
        mr(-5, 10, 4, 7, 0x080814);
        mr( 1, 10, 4, 7, 0x080814);
        mr(-5, 15, 4, 2, 0x4a2800);
        mr( 1, 15, 4, 2, 0x4a2800);
        // Gi body + sash
        mr(-6,  4, 12, 7, 0x080814);
        mr(-6, 10, 12, 2, 0x550055);
        // Head wrap/mask (all dark)
        mr(-5, -1, 10, 7, 0x080814);
        mr(-5, -1, 10, 2, 0x1a0022);
        mr(-4, -1,  8, 1, 0x8800CC, a * 0.8);
        // Glowing eye slit (only visible feature)
        mr(0, 1, 3, 2, 0x111122);
        mr(0, 1, 3, 1, 0xDDEEFF, a * 0.95);
        mr(-3, 1, 2, 1, 0x8899BB, a * 0.5);
        // Shuriken (front hand): 5x5 body + 4-point star highlights
        mr(5, 2, 5, 5, 0x667788);
        mr(6, 1, 3, 1, 0x99AABB, a * 0.9);
        mr(6, 6, 3, 1, 0x99AABB, a * 0.9);
        mr(5, 3, 1, 3, 0x99AABB, a * 0.9);
        mr(9, 3, 1, 3, 0x99AABB, a * 0.9);
        mr(6, 3, 3, 3, 0x334455);
        // Back arm extended
        mr(-8, 5, 3, 6, 0x080814);
    }

    _sprCowboy(mr, g, ox, oy, f, t, a) {
        // Spurred boots
        mr(-5, 10, 4, 7, 0x3a1800);
        mr( 1, 10, 4, 7, 0x3a1800);
        mr(-6, 15, 2, 2, 0x888888);
        mr( 5, 15, 2, 2, 0x888888);
        // Jeans + leather vest
        mr(-5, 6, 4, 5, 0x1a3a6a);
        mr( 1, 6, 4, 5, 0x1a3a6a);
        mr(-6, 4, 12, 7, 0x6a3a10);
        mr(-6, 4, 12, 2, 0x4a2800, a * 0.5);
        // Belt + buckle
        mr(-6, 10, 12, 2, 0x3e2000);
        mr(-1, 10,  3, 2, 0xCCCC00);
        // Face (skin)
        mr(-5, -1, 10, 6, 0xFFCC80);
        // Red bandana (covers lower half of face)
        mr(-5, 2, 10, 3, 0xCC1111);
        mr(-4, 2,  8, 1, 0xEE2222, a * 0.6);
        // Eyes (above bandana)
        mr( 0, 0, 3, 2, 0x222222);
        mr( 1, 0, 1, 1, 0xFFFFFF, a * 0.7);
        mr(-3, 0, 2, 2, 0x222222);
        // Wide brim cowboy hat
        mr(-10, -3, 20, 3, 0x4a2800);
        mr( -8, -3, 16, 1, 0x7a4a20, a * 0.4);
        // Hat crown
        mr(-6, -10, 12, 8, 0x4a2800);
        mr(-5,  -9, 10, 1, 0x7a4a20, a * 0.5);
        // Revolver (front hand)
        mr(4, 4, 3, 7, 0x555555);
        mr(3, 8, 5, 4, 0x333333);
        mr(4, 3, 6, 3, 0x555555);
    }

    _sprCrab(g, ox, oy, f, t, a) {
        const lb1 = Math.sin(t * 6) > 0 ? 1 : 0;
        const lb2 = Math.sin(t * 6) < 0 ? 1 : 0;
        // Walking legs (4 pairs, alternating phase)
        g.fillStyle(0xCC4400, a * 0.9);
        g.fillRect(ox - 10, oy + 8 + lb1, 3, 4);
        g.fillRect(ox -  7, oy + 7 + lb2, 2, 5);
        g.fillRect(ox +  5, oy + 7 + lb1, 2, 5);
        g.fillRect(ox +  8, oy + 8 + lb2, 3, 4);
        // Dome body (3 overlapping rects give rounded silhouette)
        g.fillStyle(0xDD5500, a);
        g.fillRect(ox - 7, oy + 2, 14, 10);
        g.fillRect(ox - 9, oy + 4, 18,  7);
        g.fillRect(ox - 5, oy,     10,  4);
        // Belly sheen
        g.fillStyle(0xFF8844, a * 0.6);
        g.fillRect(ox - 4, oy + 6, 8, 4);
        g.fillStyle(0xFF7722, a * 0.5);
        g.fillRect(ox - 4, oy + 2, 6, 2);
        // Claws (animated open/close, opposite phase each side)
        const clawA = Math.floor(Math.abs(Math.sin(t * 4)) * 4);
        const clawB = Math.floor(Math.abs(Math.sin(t * 4 + Math.PI)) * 4);
        g.fillStyle(0xCC4400, a);
        g.fillRect(ox - 15, oy + 2,             7, 5);
        g.fillRect(ox - 16, oy,                 5, 3 + clawA);
        g.fillRect(ox - 16, oy + 3 + clawA,     5, 3);
        g.fillRect(ox +  8, oy + 2,             7, 5);
        g.fillRect(ox + 11, oy,                 5, 3 + clawB);
        g.fillRect(ox + 11, oy + 3 + clawB,     5, 3);
        // Eye stalks (bobbing)
        const eyeBob = Math.round(Math.sin(t * 3));
        g.fillStyle(0xCC4400, a);
        g.fillRect(ox - 4, oy - 2 + eyeBob, 2, 4);
        g.fillRect(ox + 2, oy - 2 + eyeBob, 2, 4);
        g.fillStyle(0x111111, a);
        g.fillRect(ox - 5, oy - 3 + eyeBob, 4, 3);
        g.fillRect(ox + 1, oy - 3 + eyeBob, 4, 3);
        g.fillStyle(0xFFFFFF, a * 0.8);
        g.fillRect(ox - 4, oy - 2 + eyeBob, 2, 2);
        g.fillRect(ox + 2, oy - 2 + eyeBob, 2, 2);
    }

    _sprGolem(mr, g, ox, oy, t, a) {
        // Rocky legs
        mr(-6, 8, 5, 8, 0x2a1a0a);
        mr( 1, 8, 5, 8, 0x2a1a0a);
        // Chunky body (jagged rects for rocky silhouette)
        mr(-7, 2, 14, 8, 0x1e1206);
        mr(-8, 4, 16, 5, 0x1e1206);
        mr(-6, 1, 12, 3, 0x2a1a0a);
        // Lava crack veins (animated glow)
        const crA = a * (0.7 + Math.sin(t * 3) * 0.3);
        g.fillStyle(0xFF4400, crA);
        g.fillRect(ox - 3, oy + 3, 1, 6);
        g.fillRect(ox - 2, oy + 5, 4, 1);
        g.fillRect(ox + 2, oy + 4, 1, 5);
        g.fillStyle(0xFF8800, a * (0.5 + Math.sin(t * 4 + 1) * 0.2));
        g.fillRect(ox - 5, oy + 6, 3, 1);
        g.fillRect(ox + 3, oy + 7, 3, 1);
        // Boulder arm (front side)
        mr(5, 3, 7, 6, 0x1e1206);
        mr(8, 1, 5, 4, 0x2a1a0a);
        mr(6, 4, 1, 4, 0xFF5500, a * (0.5 + Math.sin(t * 2) * 0.2));
        // Rock head
        mr(-6, -4, 12, 7, 0x1e1206);
        mr(-5, -5, 10, 2, 0x2a1a0a);
        // Single pulsing lava eye (centered, ignores facing)
        const eyeA = a * (0.8 + Math.sin(t * 4) * 0.2);
        g.fillStyle(0xFF4400, eyeA);
        g.fillRect(ox - 3, oy - 2, 6, 4);
        g.fillStyle(0xFF8800, eyeA);
        g.fillRect(ox - 2, oy - 1, 4, 2);
        g.fillStyle(0xFFCC00, eyeA * 0.9);
        g.fillRect(ox - 1, oy - 1, 2, 2);
    }

    _sprDefault(mr, t, a) {
        // Metal legs + foot plates
        mr(-5, 10, 4, 7, 0x334444);
        mr( 1, 10, 4, 7, 0x334444);
        mr(-5, 15, 4, 2, 0x445555);
        mr( 1, 15, 4, 2, 0x445555);
        // Box body
        mr(-6,  4, 12, 8, 0x445555);
        mr(-6,  4, 12, 2, 0x667777, a * 0.6);
        mr(-6, 10, 12, 2, 0x223333);
        // Blinking LED chest light
        mr(-1, 7, 3, 2, 0x00FFAA, a * (0.7 + Math.sin(t * 5) * 0.3));
        // Box head
        mr(-5, -2, 10, 7, 0x334444);
        mr(-5, -2, 10, 1, 0x667777, a * 0.5);
        // Visor (single glowing slit)
        mr(-4, 0, 8, 2, 0x001122);
        mr(-4, 0, 8, 1, 0x00FFFF, a * (0.8 + Math.sin(t * 5) * 0.2));
        // Antenna + tip glow
        mr(-1, -6, 2, 5, 0x556666);
        mr(-2, -7, 4, 2, 0x00FFFF, a * 0.7);
    }

    _drawPlayer() {
        const p = this.P;
        if (p.df > 0 && Math.floor(p.df / 2) % 2 === 0) return;

        const g = this.worldGfx;
        const wc = WC[this.wi];

        // Dash trail: ghost afterimages fading in behind player
        if (p.dashTrail && p.dashTrail.length > 0) {
            for (let i = 0; i < p.dashTrail.length; i++) {
                g.fillStyle(wc.edgeHi, (i / p.dashTrail.length) * 0.45);
                g.fillRect(Math.round(p.dashTrail[i].x), Math.round(p.dashTrail[i].y), p.w, p.h);
            }
        }
        // Dash active: white flash outline
        if (p.dash > 0) {
            g.fillStyle(0xFFFFFF, p.dash / 12 * 0.3);
            g.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, p.w + 4, p.h + 4);
        }

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

        // Dash indicator: small diamond left of timer (bright=ready, dim=spent)
        const p = this.P;
        const dashX = (W / 2 - 46) | 0;
        const dashCol = p.dashAvail ? 0x88DDFF : 0x334455;
        const dashA   = p.dashAvail ? 1.0 : 0.45;
        this.hudGfx.fillStyle(dashCol, dashA);
        this.hudGfx.fillRect(dashX + 3, 15, 2, 2);
        this.hudGfx.fillRect(dashX + 1, 17, 6, 4);
        this.hudGfx.fillRect(dashX + 3, 21, 2, 2);
        if (p.dash > 0) {
            this.hudGfx.fillStyle(0xAAEEFF, p.dash / 12 * 0.6);
            this.hudGfx.fillRect(dashX - 2, 13, 12, 12);
        }

        // Mute indicator (speaker icon, bottom-right of HUD bar)
        const mx = W - 9, my = 30;
        const mA = isMuted() ? 0.35 : 0.7;
        this.hudGfx.fillStyle(0xFFFFFF, mA);
        this.hudGfx.fillRect(mx - 8, my - 4, 4, 8);   // speaker body
        this.hudGfx.fillRect(mx - 4, my - 6, 4, 12);  // cone left
        this.hudGfx.fillRect(mx,     my - 3, 2, 6);   // first wave
        if (!isMuted()) {
            this.hudGfx.fillRect(mx + 3, my - 5, 2, 10); // second wave
        } else {
            // X over speaker when muted
            this.hudGfx.fillStyle(0xFF4444, 0.7);
            this.hudGfx.fillRect(mx - 1, my - 5, 2, 10);
            this.hudGfx.fillRect(mx - 4, my - 1, 8, 2);
        }

        const ms = (this.phase === 'play' ? Date.now() : this.t1) - this.t0;
        // HUD shows seconds only during play; centiseconds appear in the complete modal
        const sec = Math.floor(ms / 1000);
        const m = Math.floor(sec / 60), s = sec % 60;
        this.hudTimerTxt.setText(m ? `${m}:${String(s).padStart(2, '0')}` : String(s));
        this.hudCoinsTxt.setText(`${this.P.nc}/${this.coins.length}`);
        this.hudDeathsTxt.setText(`☠ ${this.deaths}`);
    }
}
