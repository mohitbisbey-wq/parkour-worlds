import { describe, it, expect } from 'vitest';
import { WD, MP4 } from './worlds.js';

// ── Top-level shape ───────────────────────────────────────────────────────────

describe('WD top-level shape', () => {
    it('has 11 worlds (5 main + practice + gauntlet + clockwork + 3 new)', () => {
        expect(WD).toHaveLength(11);
    });

    it('gives each of the 8 main worlds exactly 4 levels', () => {
        const fourLevelWorlds = [0, 1, 2, 3, 4, 7, 8, 9, 10];
        for (const wi of fourLevelWorlds) {
            expect(WD[wi].ls, `world ${wi} (${WD[wi].n})`).toHaveLength(4);
        }
    });

    it('gives Practice (WD[5]) exactly 1 level', () => {
        expect(WD[5].ls).toHaveLength(1);
    });

    it('gives The Gauntlet (WD[6]) exactly 1 level', () => {
        expect(WD[6].ls).toHaveLength(1);
    });
});

// ── Per-world metadata ────────────────────────────────────────────────────────

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

// ── Per-level shape (all worlds) ──────────────────────────────────────────────

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

// ── Clockwork conveyor data ───────────────────────────────────────────────────

describe('Clockwork (WD[7]) conveyor platforms', () => {
    const wd = WD[7];

    it('every level has at least one conveyor', () => {
        for (const lv of wd.ls) {
            expect(Array.isArray(lv.cv)).toBe(true);
            expect(lv.cv.length).toBeGreaterThan(0);
        }
    });

    it('each conveyor entry is [x, y, w, h, dir, spd] with dir ±1 and spd > 0', () => {
        for (const lv of wd.ls) {
            for (const cv of lv.cv) {
                expect(cv).toHaveLength(6);
                const [, , w, h, dir, spd] = cv;
                expect(w).toBeGreaterThan(0);
                expect(h).toBeGreaterThan(0);
                expect([-1, 1]).toContain(dir);
                expect(spd).toBeGreaterThan(0);
            }
        }
    });
});

// ── Storm Spire wind zone data ────────────────────────────────────────────────

describe('Storm Spire (WD[9]) wind zones', () => {
    const wd = WD[9];

    it('every level has at least one wind zone', () => {
        for (const lv of wd.ls) {
            expect(Array.isArray(lv.wz)).toBe(true);
            expect(lv.wz.length).toBeGreaterThan(0);
        }
    });

    it('each wind zone is [x, y, w, h, dx, dy] with positive area and non-zero force', () => {
        for (const lv of wd.ls) {
            for (const wz of lv.wz) {
                expect(wz).toHaveLength(6);
                const [, , w, h, dx, dy] = wz;
                expect(w).toBeGreaterThan(0);
                expect(h).toBeGreaterThan(0);
                expect(dx !== 0 || dy !== 0).toBe(true);
            }
        }
    });

    it('wind force magnitudes are small enough to not be instant-kills (≤ 0.5 per axis)', () => {
        for (const lv of wd.ls) {
            for (const [, , , , dx, dy] of lv.wz) {
                expect(Math.abs(dx)).toBeLessThanOrEqual(0.5);
                expect(Math.abs(dy)).toBeLessThanOrEqual(0.5);
            }
        }
    });
});

// ── Crystal Realm bounce pad data ─────────────────────────────────────────────

describe('Crystal Realm (WD[10]) bounce pads', () => {
    const wd = WD[10];

    it('every level has at least one bounce pad', () => {
        for (const lv of wd.ls) {
            expect(Array.isArray(lv.bp)).toBe(true);
            expect(lv.bp.length).toBeGreaterThan(0);
        }
    });

    it('each bounce pad is [x, y, w, h] with positive dimensions', () => {
        for (const lv of wd.ls) {
            for (const bp of lv.bp) {
                expect(bp).toHaveLength(4);
                const [, , w, h] = bp;
                expect(w).toBeGreaterThan(0);
                expect(h).toBeGreaterThan(0);
            }
        }
    });

    it('all bounce pads are within the map width', () => {
        for (const lv of wd.ls) {
            for (const [bx, , bw] of lv.bp) {
                expect(bx).toBeGreaterThanOrEqual(0);
                expect(bx + bw).toBeLessThanOrEqual(lv.mw);
            }
        }
    });
});

// ── MP4 moving platforms ──────────────────────────────────────────────────────

describe('MP4 moving platforms', () => {
    it('has one entry per main world (0-4)', () => {
        expect(MP4).toHaveLength(5);
    });

    describe.each(MP4.map((mps, wi) => [wi, mps]))('world %i moving platforms', (wi, mps) => {
        it('has at least one moving platform', () => {
            expect(mps.length).toBeGreaterThan(0);
        });

        it.each(mps.map((m, i) => [i, m]))('platform %i is well-formed [x,y,w,h,x0,x1,spd]', (_i, m) => {
            expect(m).toHaveLength(7);
            const [, , w, h, x0, x1, spd] = m;
            expect(w).toBeGreaterThan(0);
            expect(h).toBeGreaterThan(0);
            expect(x1).toBeGreaterThanOrEqual(x0);
            expect(spd).toBeGreaterThan(0);
        });

        it('keeps the full x-range within the matching level mw', () => {
            const lv = WD[wi].ls[3];
            for (const [, , , , x0, x1] of mps) {
                expect(x0).toBeGreaterThanOrEqual(0);
                expect(x1).toBeLessThanOrEqual(lv.mw);
            }
        });
    });
});
