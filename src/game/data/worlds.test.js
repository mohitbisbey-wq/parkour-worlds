import { describe, it, expect } from 'vitest';
import { WD, MP4 } from './worlds.js';

describe('WD top-level shape', () => {
    it('has 5 main worlds plus 1 practice world', () => {
        expect(WD).toHaveLength(6);
    });

    it('gives each main world exactly 4 levels (matches save slots 0-19)', () => {
        for (let wi = 0; wi < 5; wi++) {
            expect(WD[wi].ls, `world ${wi} (${WD[wi].n})`).toHaveLength(4);
        }
    });

    it('gives the practice world exactly 1 level', () => {
        expect(WD[5].ls).toHaveLength(1);
    });
});

describe.each(WD.map((wd, wi) => [wi, wd.n, wd]))('world %i (%s) metadata', (wi, _name, wd) => {
    it('has a non-empty name and emoji', () => {
        expect(wd.n).toBeTypeOf('string');
        expect(wd.n.length).toBeGreaterThan(0);
        expect(wd.e).toBeTypeOf('string');
        expect(wd.e.length).toBeGreaterThan(0);
    });

    it('has a valid hex accent color', () => {
        expect(wd.c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('has a 2-stop background gradient and a bottom color', () => {
        expect(wd.bg).toHaveLength(2);
        expect(wd.bg[0]).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(wd.bg[1]).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(wd.bot).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
});

describe.each(
    WD.flatMap((wd, wi) =>
        wd.ls.map((lv, li) => [wi, li, `${wd.n} / ${lv.n}`, lv])
    )
)('level w%i.l%i (%s)', (_wi, _li, _label, lv) => {
    it('has spawn, checkpoint, and goal coordinates', () => {
        expect(lv.sp).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
        expect(lv.cp).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
        expect(lv.go).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
    });

    it('has a positive map width', () => {
        expect(lv.mw).toBeGreaterThan(0);
    });

    it('has at least one platform', () => {
        expect(Array.isArray(lv.pl)).toBe(true);
        expect(lv.pl.length).toBeGreaterThan(0);
    });

    it('keeps spawn, checkpoint, and goal within the map width', () => {
        expect(lv.sp.x).toBeGreaterThanOrEqual(0);
        expect(lv.sp.x).toBeLessThanOrEqual(lv.mw);
        expect(lv.cp.x).toBeGreaterThanOrEqual(0);
        expect(lv.cp.x).toBeLessThanOrEqual(lv.mw);
        expect(lv.go.x).toBeGreaterThanOrEqual(0);
        expect(lv.go.x).toBeLessThanOrEqual(lv.mw);
    });

    it('uses [x, y, w, h] tuples with positive dimensions for platforms', () => {
        for (const p of lv.pl) {
            expect(p).toHaveLength(4);
            const [, , w, h] = p;
            expect(w).toBeGreaterThan(0);
            expect(h).toBeGreaterThan(0);
        }
    });

    it('keeps every coin inside the map width', () => {
        for (const [cx] of lv.co) {
            expect(cx).toBeGreaterThanOrEqual(0);
            expect(cx).toBeLessThanOrEqual(lv.mw);
        }
    });

    it('places the spawn above (or on) a platform top edge', () => {
        const onTop = lv.pl.some(([px, py, pw]) =>
            lv.sp.x >= px - 9 && lv.sp.x <= px + pw + 9 && lv.sp.y <= py
        );
        expect(onTop).toBe(true);
    });

    it('references valid platform indices in en[] when provided', () => {
        if (!lv.en) return;
        for (const idx of lv.en) {
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(idx).toBeLessThan(lv.pl.length);
        }
    });
});

describe('MP4 moving platforms', () => {
    it('has one entry per non-practice world', () => {
        expect(MP4).toHaveLength(5);
    });

    describe.each(MP4.map((mps, wi) => [wi, mps]))('world %i moving platforms', (wi, mps) => {
        it('has at least one moving platform', () => {
            expect(mps.length).toBeGreaterThan(0);
        });

        it.each(mps.map((m, i) => [i, m]))('platform %i is well-formed', (_i, m) => {
            // [x, y, w, h, x0, x1, spd]
            expect(m).toHaveLength(7);
            const [x, y, w, h, x0, x1, spd] = m;
            expect(x).toBeTypeOf('number');
            expect(y).toBeTypeOf('number');
            expect(w).toBeGreaterThan(0);
            expect(h).toBeGreaterThan(0);
            expect(x1).toBeGreaterThanOrEqual(x0);
            expect(spd).toBeGreaterThan(0);
        });

        it('keeps the full x-range within the matching level mw', () => {
            const lv = WD[wi].ls[3];
            for (const [, , , , x0, x1, , ] of mps) {
                expect(x0).toBeGreaterThanOrEqual(0);
                expect(x1).toBeLessThanOrEqual(lv.mw);
            }
        });
    });
});
