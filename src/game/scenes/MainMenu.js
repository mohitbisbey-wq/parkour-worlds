import { Scene } from 'phaser';
import { WD } from '../data/worlds';
import { playMusic } from '../utils/music';
import { drawEmblem } from '../utils/emblems';

const W = 800, H = 450;

// Per-world island grass & dirt colors
const ISLAND_GRASS = [0x1875c8, 0x8844aa, 0xb87818, 0x189898, 0xc42800];
const ISLAND_DIRT  = [0x0d1a2e, 0x100828, 0x1e1408, 0x081c20, 0x1c0808];

export class MainMenu extends Scene {
    constructor() { super('MainMenu'); }

    create() {
        this.bgGfx = this.add.graphics().setDepth(0);
        this._buildStaticBg();
        this._buildTitle();
        this._buildUI();

        playMusic(-1);
        this.input.keyboard.once('keydown-SPACE', () => this.scene.start('WorldSelect'));
        this.input.once('pointerdown', () => this.scene.start('WorldSelect'));
    }

    _buildStaticBg() {
        const g = this.add.graphics().setDepth(1);

        // Horizon atmosphere glow
        g.fillStyle(0x3020a0, 0.10);
        g.fillRect(0, 240, W, 140);

        // 5 floating islands — one per world, positioned below title panel
        const islands = [
            { wi: 0, cx: 88,  cy: 286, w: 122, h: 22 },
            { wi: 1, cx: 248, cy: 265, w: 108, h: 20 },
            { wi: 2, cx: 400, cy: 279, w: 120, h: 22 },
            { wi: 3, cx: 554, cy: 263, w: 108, h: 20 },
            { wi: 4, cx: 708, cy: 273, w: 114, h: 20 },
        ];

        islands.forEach(({ wi, cx, cy, w, h }) => {
            const half = w >> 1;
            const grassCol = ISLAND_GRASS[wi];
            const dirtCol  = ISLAND_DIRT[wi];
            const accentCol = parseInt(WD[wi].c.replace('#', ''), 16);

            // Tapering hanging roots
            g.fillStyle(dirtCol, 0.9);
            g.fillRect(cx - half + 10, cy + h,      w - 20, 8);
            g.fillRect(cx - half + 20, cy + h + 7,  w - 40, 7);
            g.fillRect(cx - half + 30, cy + h + 13, w - 60, 6);

            // Dirt body
            g.fillStyle(dirtCol, 1);
            g.fillRect(cx - half, cy + 4, w, h - 4);

            // Underside shadow strip
            g.fillStyle(0x000000, 0.30);
            g.fillRect(cx - half, cy + h - 4, w, 4);

            // Grass top
            g.fillStyle(grassCol, 1);
            g.fillRect(cx - half, cy, w, 5);
            // Accent sheen
            g.fillStyle(accentCol, 0.35);
            g.fillRect(cx - half, cy, w, 2);
            // Top-edge highlight
            g.fillStyle(0xffffff, 0.18);
            g.fillRect(cx - half, cy, w, 1);

            // Grass tufts
            g.fillStyle(grassCol, 1);
            for (let tx = cx - half + 5; tx < cx + half - 5; tx += 9) {
                g.fillRect(tx, cy - 2, 2, 3);
            }

            // World emblem centered above the island
            drawEmblem(g, wi, cx, cy - 22, 34);
        });

        // Ground strip at bottom
        g.fillStyle(0x12102a, 1);
        g.fillRect(0, 360, W, H - 360);
        g.fillStyle(0x2a1860, 0.7);
        g.fillRect(0, 358, W, 4);
        g.fillStyle(0x1a1240, 0.5);
        g.fillRect(0, 354, W, 6);

        // World emblem icon row (world select preview)
        WD.slice(0, 5).forEach((wd, i) => {
            const cx = Math.round(W / 2 + (i - 2) * 128);
            const cy = 388;
            const col = parseInt(wd.c.replace('#', ''), 16);
            g.fillStyle(col, 0.16);
            g.fillRect(cx - 22, cy - 22, 44, 44);
            g.lineStyle(1, col, 0.65);
            g.strokeRect(cx - 22, cy - 22, 44, 44);
            g.fillStyle(col, 0.30);
            g.fillRect(cx - 22, cy - 22, 44, 2);
            drawEmblem(g, i, cx, cy - 2, 28);
        });
    }

    _buildTitle() {
        // Compact panel in upper area (islands fill the rest)
        const px = W / 2 - 232, py = 52, pw = 464, ph = 152;
        const glow = this.add.graphics().setDepth(3);
        // Outer glow halo
        glow.fillStyle(0x4010a0, 0.07);
        glow.fillRect(px - 20, py - 16, pw + 40, ph + 32);
        // Panel body
        glow.fillStyle(0x080418, 0.76);
        glow.fillRect(px, py, pw, ph);
        // Panel border
        glow.lineStyle(1, 0xb888ff, 0.22);
        glow.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
        // Top accent bar
        glow.fillStyle(0x6020c0, 0.35);
        glow.fillRect(px, py, pw, 2);

        // Title: PARKOUR (gold) + WORLDS (purple) — same horizontal line
        const titleY = py + 58;
        // Shadow pass
        this.add.text(W / 2 - 2, titleY + 3, 'PARKOUR', {
            fontFamily: 'monospace', fontSize: 48, color: '#3a1800', fontStyle: 'bold italic',
        }).setOrigin(1, 0.5).setDepth(3).setAlpha(0.65);
        this.add.text(W / 2 + 2, titleY + 3, 'WORLDS', {
            fontFamily: 'monospace', fontSize: 48, color: '#0d0420', fontStyle: 'bold italic',
        }).setOrigin(0, 0.5).setDepth(3).setAlpha(0.65);

        // Main title — gold PARKOUR | purple WORLDS
        this.add.text(W / 2 - 2, titleY, 'PARKOUR', {
            fontFamily: 'monospace', fontSize: 48, color: '#FFD700', fontStyle: 'bold italic',
        }).setOrigin(1, 0.5).setDepth(4);
        this.add.text(W / 2 + 2, titleY, 'WORLDS', {
            fontFamily: 'monospace', fontSize: 48, color: '#b888ff', fontStyle: 'bold italic',
        }).setOrigin(0, 0.5).setDepth(4);

        // Two-tone divider
        const divY = titleY + 36;
        const div = this.add.graphics().setDepth(4);
        div.fillStyle(0xFFD700, 0.55);
        div.fillRect(W / 2 - 210, divY, 210, 2);
        div.fillStyle(0xb888ff, 0.55);
        div.fillRect(W / 2, divY, 210, 2);

        // Subtitle
        this.add.text(W / 2, divY + 16, '5 worlds  ·  20 levels  ·  beat the clock', {
            fontFamily: 'monospace', fontSize: 11, color: '#9977bb',
        }).setOrigin(0.5, 0.5).setDepth(4);
    }

    _buildUI() {
        // World name labels
        WD.slice(0, 5).forEach((wd, i) => {
            const cx = Math.round(W / 2 + (i - 2) * 128);
            this.add.text(cx, 412, wd.n.split(' ')[0].toUpperCase(), {
                fontFamily: 'monospace', fontSize: 7, color: wd.c, fontStyle: 'bold',
            }).setOrigin(0.5, 0).setDepth(4);
        });
        this.add.text(W / 2, 427, '5 themed worlds  ·  20 levels', {
            fontFamily: 'monospace', fontSize: 8, color: '#6655aa',
        }).setOrigin(0.5, 0.5).setDepth(4);

        // Prompt button — positioned below the title panel
        const pbY = 218;
        const pb = this.add.graphics().setDepth(4);
        pb.fillStyle(0xb888ff, 0.10);
        pb.fillRect(W / 2 - 155, pbY, 310, 28);
        pb.lineStyle(1, 0xb888ff, 0.45);
        pb.strokeRect(W / 2 - 155, pbY, 310, 28);

        const prompt = this.add.text(W / 2, pbY + 14, 'PRESS  SPACE  OR  CLICK  TO  START', {
            fontFamily: 'monospace', fontSize: 13, color: '#b888ff', fontStyle: 'bold',
        }).setOrigin(0.5, 0.5).setDepth(5);

        this.tweens.add({
            targets: [prompt, pb], alpha: 0.15,
            duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
    }

    update(time) {
        const t = time / 1000;
        this.bgGfx.clear();

        // Purple twilight sky gradient
        this.bgGfx.fillGradientStyle(0x0c0420, 0x0c0420, 0x181660, 0x181660, 1);
        this.bgGfx.fillRect(0, 0, W, H);

        // Stars (purple-tinted)
        for (let i = 0; i < 60; i++) {
            const sx = (i * 97 + 3) % W, sy = (i * 61 + 5) % 260;
            const blink = Math.sin(t * 2.1 + i * 0.72);
            const a = 0.10 + blink * 0.18;
            this.bgGfx.fillStyle(0xCCBBFF, Math.max(0.03, a));
            this.bgGfx.fillRect(sx, sy, blink > 0.6 ? 2 : 1, blink > 0.6 ? 2 : 1);
        }

        // Drifting pixel clouds (purple-gray)
        this.bgGfx.fillStyle(0x281860, 0.50);
        for (let i = 0; i < 4; i++) {
            const cx = Math.floor(((i * 210 + t * 9) % (W + 140)) - 70);
            const cy = 135 + i * 28;
            this.bgGfx.fillRect(cx, cy + 8, 80, 10);
            this.bgGfx.fillRect(cx + 12, cy, 52, 10);
            this.bgGfx.fillRect(cx + 24, cy - 8, 28, 10);
        }

        // Brand-purple nebula wisps
        const nebulaCols = [0x5028c8, 0x3018a0, 0x6038d8];
        for (let i = 0; i < 3; i++) {
            const nx = Math.floor(((i * 280 + t * 5) % (W + 120)) - 60);
            const ny = 28 + i * 78;
            this.bgGfx.fillStyle(nebulaCols[i], 0.05);
            this.bgGfx.fillRect(nx, ny, 180, 48);
            this.bgGfx.fillRect(nx + 22, ny - 12, 136, 72);
        }

        // Crescent moon (purplish glow)
        const moonX = W - 108 + Math.sin(t * 0.08) * 4;
        this.bgGfx.fillStyle(0xEEDDFF, 0.92);
        this.bgGfx.fillRect(Math.floor(moonX), 22, 22, 22);
        this.bgGfx.fillStyle(0x0c0420, 1);
        this.bgGfx.fillRect(Math.floor(moonX) + 6, 18, 18, 18);
        this.bgGfx.fillStyle(0xCC99FF, 0.09);
        this.bgGfx.fillRect(Math.floor(moonX) - 8, 14, 38, 38);

        // Horizon sparkles (distant purple lights)
        this.bgGfx.fillStyle(0xaa88ff, 0.11);
        for (let i = 0; i < 18; i++) {
            const lx = (i * 45 + 12) % W;
            const ly = 338 + ((i * 17) % 18);
            if (Math.sin(t * 0.8 + i) > 0) this.bgGfx.fillRect(lx, ly, 2, 2);
        }
    }
}
