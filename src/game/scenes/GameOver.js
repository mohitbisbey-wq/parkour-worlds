import { Scene } from 'phaser';

export class GameOver extends Scene {
    constructor() {
        super('GameOver');
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.won = data.won || false;
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;
        const best = this.registry.get('highScore') || 0;

        // Background
        const sky = this.add.graphics();
        if (this.won) {
            sky.fillGradientStyle(0x001a00, 0x001a00, 0x003300, 0x003300, 1);
        } else {
            sky.fillGradientStyle(0x1a0000, 0x1a0000, 0x0a1a08, 0x0a1a08, 1);
        }
        sky.fillRect(0, 0, W, H);

        this.drawJungleSilhouette(W, H);

        // Main panel
        const panel = this.add.graphics();
        panel.fillStyle(0x000000, 0.65);
        panel.fillRoundedRect(W / 2 - 240, H / 2 - 200, 480, 380, 18);
        panel.setDepth(5);

        // Title
        const titleText = this.won ? 'YOU WIN!' : 'GAME OVER';
        const titleColor = this.won ? '#44ff66' : '#ff4444';
        this.add.text(W / 2, H / 2 - 160, titleText, {
            fontFamily: 'Arial Black',
            fontSize: 58,
            color: titleColor,
            stroke: '#000000',
            strokeThickness: 10
        }).setOrigin(0.5).setDepth(6);

        if (this.won) {
            this.add.text(W / 2, H / 2 - 100, 'You reached the jungle gem!', {
                fontFamily: 'Arial',
                fontSize: 20,
                color: '#aaffaa',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(6);
        }

        // Score
        this.add.text(W / 2, H / 2 - 48, `SCORE`, {
            fontFamily: 'Arial Black',
            fontSize: 22,
            color: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(6);

        this.add.text(W / 2, H / 2 + 10, `${this.finalScore}`, {
            fontFamily: 'Arial Black',
            fontSize: 56,
            color: '#ffff44',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5).setDepth(6);

        // Best score
        this.add.text(W / 2, H / 2 + 78, `BEST: ${best}`, {
            fontFamily: 'Arial Black',
            fontSize: 22,
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(6);

        // Restart prompt
        const prompt = this.add.text(W / 2, H / 2 + 138, 'CLICK TO PLAY AGAIN', {
            fontFamily: 'Arial Black',
            fontSize: 26,
            color: '#ffffff',
            stroke: '#003300',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(6);

        this.tweens.add({
            targets: prompt,
            alpha: 0.2,
            duration: 650,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Menu link
        const menuText = this.add.text(W / 2, H / 2 + 185, '[ Main Menu ]', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#88ccff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(6).setInteractive({ useHandCursor: true });

        menuText.on('pointerover', () => menuText.setColor('#aaddff'));
        menuText.on('pointerout', () => menuText.setColor('#88ccff'));
        menuText.on('pointerdown', () => this.scene.start('MainMenu'));

        // Click anywhere restarts
        this.input.once('pointerdown', (pointer) => {
            // ignore if clicking the menu text
            this.scene.start('Game');
        });
    }

    drawJungleSilhouette(W, H) {
        const g = this.add.graphics().setDepth(1);
        g.fillStyle(0x061a0a);
        for (let x = 0; x < W + 120; x += 120) {
            const h = 180 + Math.sin(x * 0.04) * 50;
            g.fillTriangle(x + 60, H - h, x, H, x + 120, H);
            g.fillRect(x + 54, H - 60, 12, 70);
        }
        const g2 = this.add.graphics().setDepth(2);
        g2.fillStyle(0x0e3a18);
        for (let x = -20; x < W + 100; x += 100) {
            const h = 220 + Math.sin(x * 0.06) * 30;
            g2.fillTriangle(x + 50, H - h, x, H - 10, x + 100, H - 10);
            g2.fillRect(x + 44, H - 50, 12, 60);
        }
        const ground = this.add.graphics().setDepth(3);
        ground.fillStyle(0x3a8c2a);
        ground.fillRect(0, H - 60, W, 60);
        ground.fillStyle(0x4faa35);
        ground.fillRect(0, H - 60, W, 8);
    }
}
