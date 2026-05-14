import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { WD } from '../data/worlds';
import { done, bests, wUnlk, lUnlk, fmt } from '../utils/save';
import { playMusic } from '../utils/music';
import { drawEmblem } from '../utils/emblems';

const W = 800, H = 450;

export class WorldSelect extends Scene {
    constructor() { super('WorldSelect'); }

    create() {
        playMusic(-1);
        // Dark background
        this.add.rectangle(W / 2, H / 2, W, H, 0x06060f);

        // Star field
        const stars = this.add.graphics();
        stars.fillStyle(0xFFFFFF, 0.32);
        for (let i = 0; i < 55; i++) {
            stars.fillRect((i * 97 + 3) % W, (i * 61 + 5) % H, 1, 1);
        }

        // Title
        this.add.text(W / 2, 26, 'CHOOSE YOUR WORLD', {
            fontFamily: 'monospace', fontSize: 15, color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        // Controls hint
        this.add.text(W / 2, H - 52, 'WASD / Arrows  move  ·  Space  jump  ·  Push wall + jump  =  wall jump', {
            fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)'
        }).setOrigin(0.5, 0.5);

        // ESC hint
        this.add.text(10, H - 20, 'ESC = back', {
            fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)'
        }).setOrigin(0, 0.5);

        this._buildCards();
        this._buildPracticeBtn();

        // Keyboard nav
        this.input.keyboard.once('keydown-ESC', () => this.scene.start('MainMenu'));
    }

    _buildCards() {
        const cw = 136, ch = 316, gap = 13;
        const x0 = (W - (5 * cw + 4 * gap)) / 2;
        // Single graphics layer for all emblems (drawn on top of cards)
        const emblGfx = this.add.graphics();

        WD.slice(0, 5).forEach((wd, wi) => {
            const cx = x0 + wi * (cw + gap), cy = 50;
            const unlk = wUnlk(wi);
            const accentColor = parseInt(wd.c.replace('#', ''), 16);

            // Card background
            const card = this.add.graphics();
            card.fillStyle(unlk ? 0xFFFFFF : 0xFFFFFF, unlk ? 0.07 : 0.03);
            card.fillRect(cx, cy, cw, ch);
            card.lineStyle(1.5, unlk ? accentColor : 0xFFFFFF, unlk ? 0.9 : 0.15);
            card.strokeRect(cx + 0.75, cy + 0.75, cw - 1.5, ch - 1.5);

            if (unlk) {
                // Color accent top bar
                card.fillStyle(accentColor, 1);
                card.fillRect(cx, cy, cw, 4);
            }

            // Pixel-art emblem (greyed out when locked)
            if (!unlk) emblGfx.setAlpha(0.25);
            drawEmblem(emblGfx, wi, cx + cw / 2, cy + 34, 28);
            emblGfx.setAlpha(1);

            // World name
            this.add.text(cx + cw / 2, cy + 60, wd.n.toUpperCase(), {
                fontFamily: 'monospace', fontSize: 9,
                color: unlk ? '#ffffff' : 'rgba(255,255,255,0.3)',
                fontStyle: 'bold',
                wordWrap: { width: cw - 4 }
            }).setOrigin(0.5, 0.5);

            if (unlk) {
                // Stars row
                for (let i = 0; i < 4; i++) {
                    const cleared = done[wi * 4 + i];
                    this.add.text(cx + 14 + i * 28, cy + 80, '★', {
                        fontFamily: 'monospace', fontSize: 13,
                        color: cleared ? '#FFD700' : 'rgba(255,255,255,0.15)'
                    }).setOrigin(0.5, 0.5);
                }

                // Level buttons
                wd.ls.forEach((lv, li) => {
                    const bx = cx + 6, by = cy + 94 + li * 54;
                    const bw = cw - 12, bh = 48;
                    const ul = lUnlk(wi, li);
                    const li2 = wi * 4 + li;

                    const btn = this.add.graphics();
                    btn.fillStyle(ul ? 0xFFFFFF : 0xFFFFFF, ul ? 0.08 : 0.03);
                    btn.fillRect(bx, by, bw, bh);
                    btn.lineStyle(1, ul ? accentColor : 0xFFFFFF, ul ? 0.6 : 0.08);
                    btn.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

                    // Level name
                    this.add.text(bx + bw / 2, by + 14, lv.n, {
                        fontFamily: 'monospace', fontSize: 9,
                        color: ul ? '#dddddd' : 'rgba(255,255,255,0.25)',
                        fontStyle: 'bold'
                    }).setOrigin(0.5, 0.5);

                    // Status
                    let statusTxt = '', statusColor = '#888888';
                    if (done[li2]) {
                        statusTxt = bests[li2].length ? '★ ' + fmt(bests[li2][0]) : 'CLEARED';
                        statusColor = '#FFD700';
                    } else if (ul) {
                        statusTxt = 'PLAY';
                        statusColor = 'rgba(255,255,255,0.4)';
                    } else {
                        statusTxt = '🔒 LOCKED';
                        statusColor = 'rgba(255,255,255,0.2)';
                    }
                    this.add.text(bx + bw / 2, by + 33, statusTxt, {
                        fontFamily: 'monospace', fontSize: 9, color: statusColor
                    }).setOrigin(0.5, 0.5);

                    if (ul) {
                        // Invisible interactive zone
                        const zone = this.add.zone(bx, by, bw, bh).setOrigin(0, 0).setInteractive({ useHandCursor: true });
                        zone.on('pointerover', () => { btn.clear(); btn.fillStyle(accentColor, 0.2); btn.fillRect(bx, by, bw, bh); btn.lineStyle(1.5, accentColor, 1); btn.strokeRect(bx + 0.75, by + 0.75, bw - 1.5, bh - 1.5); });
                        zone.on('pointerout', () => { btn.clear(); btn.fillStyle(0xFFFFFF, 0.08); btn.fillRect(bx, by, bw, bh); btn.lineStyle(1, accentColor, 0.6); btn.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1); });
                        zone.on('pointerdown', () => this.scene.start('Game', { wi, li }));
                    }
                });
            } else {
                // Locked world
                this.add.text(cx + cw / 2, cy + 168, '🔒', {
                    fontFamily: 'monospace', fontSize: 26
                }).setOrigin(0.5, 0.5);

                const prevEmoji = WD[wi - 1] ? WD[wi - 1].e : '';
                this.add.text(cx + cw / 2, cy + 210, `clear ${prevEmoji}`, {
                    fontFamily: 'monospace', fontSize: 8,
                    color: 'rgba(255,255,255,0.2)',
                    wordWrap: { width: cw - 8 }
                }).setOrigin(0.5, 0.5);
                this.add.text(cx + cw / 2, cy + 226, 'to unlock', {
                    fontFamily: 'monospace', fontSize: 8,
                    color: 'rgba(255,255,255,0.2)'
                }).setOrigin(0.5, 0.5);
            }
        });
    }

    _buildPracticeBtn() {
        const pw = WD[5];
        const pbx = W / 2 - 90, pby = H - 44, pbw = 180, pbh = 28;

        const btn = this.add.graphics();
        btn.fillStyle(0xFFFFFF, 0.06);
        btn.fillRect(pbx, pby, pbw, pbh);
        btn.lineStyle(1, 0xAAAAAA, 0.8);
        btn.strokeRect(pbx + 0.5, pby + 0.5, pbw - 1, pbh - 1);

        this.add.text(W / 2, pby + pbh / 2, `${pw.e}  ${pw.ls[0].n}  —  practice`, {
            fontFamily: 'monospace', fontSize: 10, color: '#aaaaaa'
        }).setOrigin(0.5, 0.5);

        const zone = this.add.zone(pbx, pby, pbw, pbh).setOrigin(0, 0).setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => { btn.clear(); btn.fillStyle(0xAAAAAA, 0.15); btn.fillRect(pbx, pby, pbw, pbh); btn.lineStyle(1.5, 0xAAAAAA, 1); btn.strokeRect(pbx + 0.75, pby + 0.75, pbw - 1.5, pbh - 1.5); });
        zone.on('pointerout', () => { btn.clear(); btn.fillStyle(0xFFFFFF, 0.06); btn.fillRect(pbx, pby, pbw, pbh); btn.lineStyle(1, 0xAAAAAA, 0.8); btn.strokeRect(pbx + 0.5, pby + 0.5, pbw - 1, pbh - 1); });
        zone.on('pointerdown', () => this.scene.start('Game', { wi: 5, li: 0 }));
    }
}
