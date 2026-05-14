// Pixel-art world emblems from the Parkour Worlds design system.
// Rect data: [x, y, w, h, '#rrggbb'] in a 16×16 grid.

const _E = {
    anchor: [
        [0,13,2,2,'#9bd0ff'],[2,14,3,2,'#9bd0ff'],[5,13,2,2,'#9bd0ff'],
        [7,14,3,2,'#9bd0ff'],[10,13,2,2,'#9bd0ff'],[12,14,4,2,'#9bd0ff'],
        [6,0,4,1,'#ffffff'],[5,1,1,2,'#ffffff'],[10,1,1,2,'#ffffff'],
        [6,3,4,1,'#ffffff'],[7,4,2,7,'#ffffff'],[4,5,8,1,'#ffffff'],
        [3,9,1,1,'#ffffff'],[3,10,1,1,'#ffffff'],[4,11,2,1,'#ffffff'],
        [12,9,1,1,'#ffffff'],[12,10,1,1,'#ffffff'],[10,11,2,1,'#ffffff'],
        [6,11,4,1,'#ffffff'],
    ],
    shuriken: [
        [7,0,2,6,'#3a2440'],[7,10,2,6,'#3a2440'],[0,7,6,2,'#3a2440'],[10,7,6,2,'#3a2440'],
        [7,0,1,6,'#ffffff'],[0,7,6,1,'#ffffff'],[7,10,1,6,'#ffffff'],[10,7,6,1,'#ffffff'],
        [6,6,4,4,'#CE93D8'],[7,7,2,2,'#ffffff'],
    ],
    cactus: [
        [6,3,4,11,'#3a8c2a'],
        [2,6,2,1,'#3a8c2a'],[2,7,2,3,'#3a8c2a'],[3,10,1,1,'#3a8c2a'],
        [12,4,2,1,'#3a8c2a'],[12,5,2,3,'#3a8c2a'],[12,8,1,1,'#3a8c2a'],
        [6,3,1,11,'#6ec044'],[2,6,1,4,'#6ec044'],[12,4,1,4,'#6ec044'],
        [9,3,1,11,'#1d5d18'],
        [3,14,10,1,'#c8a060'],[4,15,8,1,'#8b6030'],
        [7,2,2,1,'#ff7043'],[13,3,1,1,'#ff7043'],
    ],
    shell: [
        [5,2,6,1,'#ffe9c2'],[4,3,8,1,'#ffe9c2'],[3,4,10,5,'#ffe9c2'],
        [3,9,10,1,'#ffe9c2'],[4,10,9,1,'#ffe9c2'],[5,11,8,1,'#ffe9c2'],
        [6,12,6,1,'#ffe9c2'],
        [4,4,8,1,'#ff9b6b'],[3,6,10,1,'#ff9b6b'],[3,8,9,1,'#ff9b6b'],
        [5,10,6,1,'#ff9b6b'],
        [6,5,4,3,'#80DEEA'],[7,6,2,1,'#ffffff'],
        [12,9,1,3,'#ff7043'],
        [5,1,6,1,'#ffffff'],[3,2,2,2,'#ffffff'],[11,2,2,2,'#ffffff'],
        [2,4,1,5,'#ffffff'],[13,4,1,5,'#ffffff'],
        [3,9,2,1,'#ffffff'],[13,9,1,1,'#ffffff'],
        [4,10,2,1,'#ffffff'],[13,10,2,1,'#ffffff'],
        [5,11,2,1,'#ffffff'],[13,11,2,1,'#ffffff'],
        [6,12,2,1,'#ffffff'],[12,12,2,1,'#ffffff'],
        [7,13,6,1,'#ffffff'],
    ],
    flame: [
        [7,1,2,1,'#ff3d00'],[6,2,4,1,'#ff3d00'],[5,3,6,1,'#ff3d00'],
        [4,4,2,2,'#ff3d00'],[10,4,2,2,'#ff3d00'],
        [4,6,1,3,'#ff3d00'],[11,6,1,3,'#ff3d00'],
        [3,9,10,3,'#ff3d00'],[4,12,8,1,'#ff3d00'],[5,13,6,1,'#ff3d00'],
        [7,4,2,1,'#FF7043'],[6,5,4,1,'#FF7043'],[5,6,6,3,'#FF7043'],
        [6,9,4,3,'#FF7043'],
        [7,7,2,3,'#FFD700'],[7,6,1,1,'#FFD700'],[7,10,2,1,'#FFD700'],
        [1,6,1,1,'#FFD700'],[14,8,1,1,'#FFD700'],
        [2,11,1,1,'#ff3d00'],
    ],
    target: [
        [3,7,10,2,'#c62828'],
        [4,3,8,1,'#c62828'],[3,4,10,1,'#c62828'],[2,5,12,1,'#c62828'],
        [2,10,12,1,'#c62828'],[3,11,10,1,'#c62828'],[4,12,8,1,'#c62828'],
        [5,6,6,4,'#ff7043'],
        [6,7,4,2,'#FFD700'],[7,7,2,2,'#ffffff'],
        [4,2,8,1,'#ffffff'],[2,4,2,2,'#ffffff'],[12,4,2,2,'#ffffff'],
        [1,6,1,4,'#ffffff'],[14,6,1,4,'#ffffff'],
        [2,10,2,2,'#ffffff'],[12,10,2,2,'#ffffff'],
        [4,13,8,1,'#ffffff'],
        [3,6,10,1,'#ffffff'],[2,6,1,4,'#ffffff'],[13,6,1,4,'#ffffff'],[3,9,10,1,'#ffffff'],
        [9,6,3,1,'#222222'],[11,5,2,1,'#222222'],[12,4,2,1,'#FFD700'],
    ],
};

export const WORLD_EMBLEMS = ['anchor', 'shuriken', 'cactus', 'shell', 'flame', 'target'];

// Draw emblem centered at (cx, cy) at the given pixel size.
// g: Phaser.GameObjects.Graphics  wi: world index 0-5  size: output px (default 26)
export function drawEmblem(g, wi, cx, cy, size = 26) {
    const kind = WORLD_EMBLEMS[wi] ?? 'anchor';
    const rects = _E[kind] ?? [];
    const s = size / 16;
    for (const [rx, ry, rw, rh, col] of rects) {
        g.fillStyle(parseInt(col.replace('#', ''), 16), 1);
        g.fillRect(
            Math.round(cx - size / 2 + rx * s),
            Math.round(cy - size / 2 + ry * s),
            Math.max(1, Math.round(rw * s)),
            Math.max(1, Math.round(rh * s))
        );
    }
}
