import { describe, it, expect, beforeEach } from 'vitest';
import {
    done,
    bests,
    SAVE_SLOTS,
    loadSave,
    saveDone,
    recTime,
    fmt,
    wUnlk,
    lUnlk,
} from './save.js';

function resetState() {
    localStorage.clear();
    for (let i = 0; i < done.length; i++) done[i] = false;
    for (let i = 0; i < bests.length; i++) bests[i].length = 0;
}

beforeEach(resetState);

// ── Constants ─────────────────────────────────────────────────────────────────

describe('SAVE_SLOTS', () => {
    it('is 44 (11 worlds × 4 levels)', () => {
        expect(SAVE_SLOTS).toBe(44);
    });

    it('done array matches SAVE_SLOTS', () => {
        expect(done).toHaveLength(SAVE_SLOTS);
    });

    it('bests array matches SAVE_SLOTS', () => {
        expect(bests).toHaveLength(SAVE_SLOTS);
    });
});

// ── fmt ───────────────────────────────────────────────────────────────────────

describe('fmt', () => {
    it('formats zero', () => {
        expect(fmt(0)).toBe('0.00');
    });

    it('formats sub-second times', () => {
        expect(fmt(50)).toBe('0.05');
        expect(fmt(999)).toBe('0.99');
    });

    it('formats sub-minute times without minute prefix', () => {
        expect(fmt(1000)).toBe('1.00');
        expect(fmt(12345)).toBe('12.34');
        expect(fmt(59990)).toBe('59.99');
    });

    it('pads seconds to two digits once minutes appear', () => {
        expect(fmt(60000)).toBe('1:00.00');
        expect(fmt(61500)).toBe('1:01.50');
        expect(fmt(125000)).toBe('2:05.00');
    });

    it('always pads centiseconds to two digits', () => {
        expect(fmt(1010)).toBe('1.01');
        expect(fmt(60010)).toBe('1:00.01');
    });
});

// ── recTime ───────────────────────────────────────────────────────────────────

describe('recTime', () => {
    it('records the first time and returns rank 0', () => {
        expect(recTime(0, 10000)).toBe(0);
        expect(bests[0]).toEqual([10000]);
    });

    it('keeps times sorted ascending', () => {
        recTime(0, 30000);
        recTime(0, 10000);
        recTime(0, 20000);
        expect(bests[0]).toEqual([10000, 20000, 30000]);
    });

    it('returns the rank of the inserted time', () => {
        expect(recTime(0, 30000)).toBe(0);
        expect(recTime(0, 10000)).toBe(0);
        expect(recTime(0, 20000)).toBe(1);
    });

    it('caps at top 3 and evicts worst time', () => {
        recTime(0, 30000);
        recTime(0, 20000);
        recTime(0, 10000);
        const rank = recTime(0, 25000);
        expect(bests[0]).toEqual([10000, 20000, 25000]);
        expect(rank).toBe(2);
    });

    it('returns -1 when a time fails to make top 3', () => {
        recTime(0, 10000);
        recTime(0, 20000);
        recTime(0, 30000);
        expect(recTime(0, 40000)).toBe(-1);
        expect(bests[0]).toEqual([10000, 20000, 30000]);
    });

    it('persists per-level bests to localStorage', () => {
        recTime(3, 15000);
        expect(JSON.parse(localStorage.getItem('ppb2_3'))).toEqual([15000]);
    });

    it('isolates bests across level indices', () => {
        recTime(0, 5000);
        recTime(1, 9000);
        expect(bests[0]).toEqual([5000]);
        expect(bests[1]).toEqual([9000]);
    });

    it('works correctly for new-world level slots (indices 32-43)', () => {
        expect(recTime(32, 12000)).toBe(0); // WD[8] level 0 — Frozen Peaks
        expect(recTime(36, 15000)).toBe(0); // WD[9] level 0 — Storm Spire
        expect(recTime(40, 18000)).toBe(0); // WD[10] level 0 — Crystal Realm
        expect(recTime(43, 22000)).toBe(0); // WD[10] level 3 — The Heart
        expect(bests[43]).toEqual([22000]);
    });
});

// ── wUnlk / lUnlk ────────────────────────────────────────────────────────────

describe('wUnlk', () => {
    it('unlocks all worlds 0-10', () => {
        for (let wi = 0; wi <= 10; wi++) {
            expect(wUnlk(wi), `world ${wi}`).toBe(true);
        }
    });
});

describe('lUnlk', () => {
    it('unlocks all levels of all worlds 0-10', () => {
        for (let wi = 0; wi <= 10; wi++) {
            for (let li = 0; li < 4; li++) {
                expect(lUnlk(wi, li), `w${wi} l${li}`).toBe(true);
            }
        }
    });
});

// ── loadSave / saveDone round-trip ────────────────────────────────────────────

describe('loadSave / saveDone round-trip', () => {
    it('persists and restores done flags across the full 44-slot range', () => {
        done[0] = true;
        done[19] = true;
        done[32] = true; // Frozen Peaks slot
        done[43] = true; // Crystal Realm last slot
        saveDone();

        for (let i = 0; i < done.length; i++) done[i] = false;
        loadSave();

        expect(done[0]).toBe(true);
        expect(done[19]).toBe(true);
        expect(done[32]).toBe(true);
        expect(done[43]).toBe(true);
        expect(done[1]).toBe(false);
    });

    it('restores per-level bests written by recTime', () => {
        recTime(7, 5000);
        recTime(7, 7000);

        for (let i = 0; i < bests.length; i++) bests[i].length = 0;
        loadSave();

        expect(bests[7]).toEqual([5000, 7000]);
    });

    it('restores bests for new-world slots', () => {
        recTime(40, 9999); // Crystal Realm level 0

        for (let i = 0; i < bests.length; i++) bests[i].length = 0;
        loadSave();

        expect(bests[40]).toEqual([9999]);
    });

    it('survives corrupt JSON in localStorage without throwing', () => {
        localStorage.setItem('ppd2', '{not valid json');
        localStorage.setItem('ppb2_3', '{not valid json');
        expect(() => loadSave()).not.toThrow();
    });

    it('treats missing keys as a fresh save', () => {
        expect(() => loadSave()).not.toThrow();
        expect(done.every(v => v === false)).toBe(true);
        expect(bests.every(b => b.length === 0)).toBe(true);
    });

    it('does not overflow done array when save has more slots than expected', () => {
        const oversized = new Array(60).fill(true);
        localStorage.setItem('ppd2', JSON.stringify(oversized));
        loadSave();
        expect(done).toHaveLength(SAVE_SLOTS);
    });
});
