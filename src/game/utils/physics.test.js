import { describe, it, expect } from 'vitest';
import { ov } from './physics.js';

describe('ov — AABB overlap', () => {
    it('returns true for identical rectangles', () => {
        expect(ov(0, 0, 10, 10, 0, 0, 10, 10)).toBe(true);
    });

    it('returns true when one rect is fully inside the other', () => {
        expect(ov(2, 2, 4, 4, 0, 0, 10, 10)).toBe(true);
    });

    it('returns true for partial overlap on all four sides', () => {
        expect(ov(5, 0, 10, 10, 0, 0, 10, 10)).toBe(true); // overlaps right side
        expect(ov(-5, 0, 10, 10, 0, 0, 10, 10)).toBe(true); // overlaps left side
        expect(ov(0, 5, 10, 10, 0, 0, 10, 10)).toBe(true); // overlaps bottom
        expect(ov(0, -5, 10, 10, 0, 0, 10, 10)).toBe(true); // overlaps top
    });

    it('returns false when rectangles are adjacent (touching edges, no overlap)', () => {
        expect(ov(10, 0, 10, 10, 0, 0, 10, 10)).toBe(false); // touching right
        expect(ov(-10, 0, 10, 10, 0, 0, 10, 10)).toBe(false); // touching left
        expect(ov(0, 10, 10, 10, 0, 0, 10, 10)).toBe(false); // touching bottom
        expect(ov(0, -10, 10, 10, 0, 0, 10, 10)).toBe(false); // touching top
    });

    it('returns false when rectangles are separated', () => {
        expect(ov(20, 0, 5, 5, 0, 0, 10, 10)).toBe(false); // far right
        expect(ov(0, 20, 5, 5, 0, 0, 10, 10)).toBe(false); // far below
        expect(ov(-20, 0, 5, 5, 0, 0, 10, 10)).toBe(false); // far left
        expect(ov(0, -20, 5, 5, 0, 0, 10, 10)).toBe(false); // far above
    });

    it('handles single-pixel overlap (boundary condition)', () => {
        expect(ov(9, 0, 10, 10, 0, 0, 10, 10)).toBe(true);  // 1px overlap
        expect(ov(10, 0, 10, 10, 0, 0, 10, 10)).toBe(false); // 0px overlap
    });

    it('works with floating-point coordinates (player/platform physics)', () => {
        expect(ov(9.5, 0, 10, 10, 0, 0, 10, 10)).toBe(true);
        expect(ov(10.1, 0, 10, 10, 0, 0, 10, 10)).toBe(false);
    });

    it('is symmetric — ov(A,B) equals ov(B,A)', () => {
        const cases = [
            [0, 0, 10, 10, 5, 5, 10, 10],
            [0, 0, 5, 5, 10, 10, 5, 5],
            [3, 3, 4, 4, 0, 0, 10, 10],
        ];
        for (const [ax, ay, aw, ah, bx, by, bw, bh] of cases) {
            expect(ov(ax, ay, aw, ah, bx, by, bw, bh))
                .toBe(ov(bx, by, bw, bh, ax, ay, aw, ah));
        }
    });

    it('correctly models player-standing-on-platform (vy>0 land check)', () => {
        // Player 18×20 dropping onto a platform at y=400, h=15
        const playerH = 20, playerW = 18;
        const platX = 100, platY = 400, platW = 90, platH = 15;
        // Just landed: player bottom at 420, top at 400
        expect(ov(109, 400, playerW, playerH, platX, platY, platW, platH)).toBe(true);
        // Still airborne: player bottom at 399
        expect(ov(109, 379, playerW, playerH, platX, platY, platW, platH)).toBe(false);
    });
});
