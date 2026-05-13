import { Scene } from 'phaser';

const W = 800, H = 450;

export class MainMenu extends Scene {
    constructor() { super('MainMenu'); }

    create() {
        // Dark starfield background
        this.add.rectangle(W / 2, H / 2, W, H, 0x06060f);

        // Stars (deterministic pixel positions)
        const stars = this.add.graphics();
        stars.fillStyle(0xFFFFFF, 0.35);
        for (let i = 0; i < 55; i++) {
            stars.fillRect((i * 97 + 3) % W, (i * 61 + 5) % H, 1, 1);
        }

        // Larger accent stars
        stars.fillStyle(0xFFFFFF, 0.7);
        for (let i = 0; i < 12; i++) {
            stars.fillRect((i * 173 + 15) % W, (i * 83 + 20) % H, 2, 2);
        }

        // Title — PARKOUR
        this.add.text(W / 2, H / 2 - 50, 'PARKOUR', {
            fontFamily: 'monospace',
            fontSize: 58,
            color: '#FFD700',
            fontStyle: 'bold',
        }).setOrigin(0.5, 1);

        // Title — WORLDS
        this.add.text(W / 2, H / 2 + 12, 'WORLDS', {
            fontFamily: 'monospace',
            fontSize: 58,
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5, 1);

        // Subtitle
        this.add.text(W / 2, H / 2 + 40, '5 worlds  ·  20 levels  ·  beat the clock', {
            fontFamily: 'monospace',
            fontSize: 13,
            color: 'rgba(255,255,255,0.35)',
        }).setOrigin(0.5, 0.5);

        // Blinking start prompt
        const prompt = this.add.text(W / 2, H / 2 + 80, 'PRESS SPACE OR CLICK TO START', {
            fontFamily: 'monospace',
            fontSize: 14,
            color: '#FFD700',
            fontStyle: 'bold',
        }).setOrigin(0.5, 0.5);

        this.tweens.add({ targets: prompt, alpha: 0, duration: 500, yoyo: true, repeat: -1, ease: 'Linear' });

        // Input
        this.input.keyboard.once('keydown-SPACE', () => this.scene.start('WorldSelect'));
        this.input.once('pointerdown', () => this.scene.start('WorldSelect'));
    }
}
