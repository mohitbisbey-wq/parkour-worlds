import { Scene } from 'phaser';

export class Boot extends Scene {
    constructor() { super('Boot'); }

    preload() {
        // No boot assets needed — all graphics are procedural
    }

    create() {
        this.scene.start('Preloader');
    }
}
