import { Scene } from 'phaser';
import { loadSave } from '../utils/save';

export class Preloader extends Scene {
    constructor() { super('Preloader'); }

    init() {
        // Load save data before anything else
        loadSave();

        // Minimal loading screen
        const W = this.scale.width, H = this.scale.height;
        this.add.rectangle(W / 2, H / 2, W, H, 0x06060f);

        this.add.text(W / 2, H / 2 - 10, 'PARKOUR WORLDS', {
            fontFamily: 'monospace', fontSize: 20, color: '#FFD700', fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        const bar = this.add.rectangle(W / 2, H / 2 + 30, 0, 4, 0xFFD700).setOrigin(0, 0.5);
        const barBg = this.add.rectangle(W / 2 - 150, H / 2 + 30, 300, 4, 0x444444).setOrigin(0, 0.5);

        this.load.on('progress', (p) => {
            bar.x = W / 2 - 150;
            bar.width = 300 * p;
        });
    }

    preload() {
        // No external assets required — all graphics are procedural
    }

    create() {
        this.scene.start('MainMenu');
    }
}
