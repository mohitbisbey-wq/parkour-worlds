import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainMenu } from './scenes/MainMenu';
import { WorldSelect } from './scenes/WorldSelect';
import { Game as ParkourGame } from './scenes/Game';

const config = {
    type: AUTO,
    width: 800,
    height: 450,
    parent: 'game-container',
    backgroundColor: '#06060f',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    },
    scene: [Boot, Preloader, MainMenu, WorldSelect, ParkourGame],
};

const StartGame = (parent) => {
    return new Game({ ...config, parent });
};

export default StartGame;
