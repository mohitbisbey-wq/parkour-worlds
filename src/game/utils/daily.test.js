import { describe, it, expect } from 'vitest';
import { dailyHash } from './daily.js';

describe('dailyHash', () => {
    it('always returns world index in range [0, 7]', () => {
        for (let day = 0; day < 1000; day++) {
            const { wi } = dailyHash(day);
            expect(wi).toBeGreaterThanOrEqual(0);
            expect(wi).toBeLessThanOrEqual(7);
        }
    });

    it('always returns level index in range [0, 3]', () => {
        for (let day = 0; day < 1000; day++) {
            const { li } = dailyHash(day);
            expect(li).toBeGreaterThanOrEqual(0);
            expect(li).toBeLessThanOrEqual(3);
        }
    });

    it('is deterministic — same day always returns same result', () => {
        const day = 20241215;
        const a = dailyHash(day);
        const b = dailyHash(day);
        expect(a).toEqual(b);
    });

    it('produces different results for different days (no constant output)', () => {
        const results = new Set();
        for (let day = 0; day < 100; day++) {
            const { wi, li } = dailyHash(day);
            results.add(`${wi}-${li}`);
        }
        expect(results.size).toBeGreaterThan(1);
    });

    it('covers a reasonable spread of worlds over 365 days', () => {
        const wiCounts = new Array(8).fill(0);
        for (let day = 0; day < 365; day++) {
            wiCounts[dailyHash(day).wi]++;
        }
        // No world should be completely absent or dominate (>50%) over a year
        for (const count of wiCounts) {
            expect(count).toBeGreaterThan(0);
            expect(count).toBeLessThan(365 * 0.5);
        }
    });

    it('covers all 4 level slots over 365 days', () => {
        const liCounts = new Array(4).fill(0);
        for (let day = 0; day < 365; day++) {
            liCounts[dailyHash(day).li]++;
        }
        for (const count of liCounts) {
            expect(count).toBeGreaterThan(0);
        }
    });

    it('does not produce negative indices for large day numbers', () => {
        // day ~20000 = ~54 years from epoch
        for (let day = 19000; day < 19100; day++) {
            const { wi, li } = dailyHash(day);
            expect(wi).toBeGreaterThanOrEqual(0);
            expect(li).toBeGreaterThanOrEqual(0);
        }
    });
});
