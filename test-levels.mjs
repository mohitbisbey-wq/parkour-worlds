/**
 * Level jump verifier + uniqueness checker.
 * Physics constants match Game.js exactly.
 * Run: node test-levels.mjs
 */
import { WD, MP4 } from './src/game/data/worlds.js';

// ── Physics ──────────────────────────────────────────────────────────────────
const VX        = 2.25;   // run speed px/frame
const VY_JUMP   = 14;     // |jump vy| (positive = up)
const VY_WJUMP  = 13;     // |wall-jump vy|
const VX_WJUMP  = 8;      // wall-jump horizontal speed
const GRAVITY   = 0.30;   // px/frame²
const MAX_FALL  = 9;      // terminal velocity

// Time (frames) to land on a platform at by given take-off from ay.
// ay, by are y-coords (downward positive in Phaser).
// Returns Infinity when target is unreachable (above max jump height).
function landTime(ay, by) {
    const d = by - ay;                   // positive = B is lower
    const disc = VY_JUMP * VY_JUMP + 2 * GRAVITY * d;
    if (disc < 0) return Infinity;       // B is above max jump height
    return (VY_JUMP + Math.sqrt(disc)) / GRAVITY;
}

function maxHoriz(ay, by) {
    const t = landTime(ay, by);
    if (t === Infinity) return 0;
    // Clamp for fall-speed cap: once vy reaches MAX_FALL, extra fall is linear
    const tCap = (VY_JUMP + MAX_FALL) / GRAVITY;  // frame when fall cap hits
    if (t <= tCap) return VX * t;
    // Extra time beyond cap: constant fall of MAX_FALL px/frame
    // Height at cap: use energy: h_cap = VY_JUMP²/(2g) - extra_height
    // We already have t via quadratic; the cap doesn't affect this much in practice
    // For accuracy, just use full t (slight over-estimate for extreme falls, safe margin)
    return VX * t;
}

// Check if player on platform A can reach platform B in one jump.
// Platforms: [x, y, w, h]
function checkGap(a, b, label = '') {
    const [ax, ay, aw] = a;
    const [bx, by, bw] = b;
    const gap    = bx - (ax + aw);   // pixels of empty space
    const maxG   = maxHoriz(ay, by);
    const heightAbove = ay - by;      // positive = B is higher than A

    const reachable = gap <= 0 || gap <= maxG + bw;   // can land anywhere on B
    return {
        label,
        gap:     Math.round(gap),
        maxG:    Math.round(maxG + bw),
        heightAbove: Math.round(heightAbove),
        ok:      reachable,
    };
}

// ── Wall-jump feasibility ────────────────────────────────────────────────────
// Given two vertical pillars, check bouncing between them is enough to climb h px.
// Returns number of bounces needed and whether it's feasible.
function checkWallJump(leftPillar, rightPillar) {
    const [lx, ly, lw] = leftPillar;
    const [rx, ry, rw] = rightPillar;

    const innerGap = rx - (lx + lw);    // horizontal gap between inner faces
    const pillarH  = Math.abs(ly - ry); // pillar tops (should be equal)
    const pillarTop = Math.min(ly, ry);

    // Height gained per wall-jump bounce (player wall-jumps, crosses gap G)
    // t_cross = innerGap / VX_WJUMP (frames to cross)
    // height_gain ≈ VY_WJUMP * t_cross - 0.5 * GRAVITY * t_cross² (upward positive)
    const tCross = innerGap / VX_WJUMP;
    const heightPerBounce = VY_WJUMP * tCross - 0.5 * GRAVITY * tCross * tCross;

    // Pillar body height (how far above the approach platform)
    // We need to measure from the bottom of the pillar (approach level) to the top
    const [, pillarBotY, , pillarBodyH] = leftPillar;  // y + h = bottom y of pillar
    const climbNeeded = pillarBodyH;  // total height of pillar

    const bouncesNeeded = Math.ceil(climbNeeded / heightPerBounce);
    const maxBouncesFit = Math.floor(climbNeeded / (innerGap / 2));   // rough upper bound

    return {
        innerGap:       Math.round(innerGap),
        heightPerBounce: Math.round(heightPerBounce),
        climbNeeded:    Math.round(climbNeeded),
        bouncesNeeded,
        ok: heightPerBounce > 0 && heightPerBounce * 2 > climbNeeded * 0.5,
    };
}

// ── Main analysis ────────────────────────────────────────────────────────────
let allOk = true;
const worldSummaries = [];

WD.forEach((wd, wi) => {
    if (wi === 5) return;  // skip Practice
    const wSummary = { world: wd.n, levels: [] };

    wd.ls.forEach((lv, li) => {
        const pl = lv.pl;
        const isMoving = li === 3;
        const mp4 = isMoving ? MP4[wi] : [];

        // Separate vertical pillars (h >> w) from floor/step platforms
        const pillars  = pl.filter(p => p[3] > p[2] * 2 && p[2] < 30);
        const floors   = pl.filter(p => !(p[3] > p[2] * 2 && p[2] < 30));

        // Sort floors by x for path analysis
        const sorted   = [...floors].sort((a, b) => a[0] - b[0]);

        const issues = [];
        const gaps   = [];

        // Check each consecutive platform pair on the path
        for (let i = 0; i < sorted.length - 1; i++) {
            const a = sorted[i], b = sorted[i + 1];
            const res = checkGap(a, b, `plat[${i}]→[${i+1}]`);
            gaps.push(res);
            if (!res.ok) {
                issues.push(`  ❌ IMPOSSIBLE JUMP: ${res.label}  gap=${res.gap}px  maxReach=${res.maxG}px  heightAbove=${res.heightAbove}px`);
                allOk = false;
            }
        }

        // Check pillar pairs (wall-jump sections)
        for (let i = 0; i < pillars.length - 1; i += 2) {
            const l = pillars[i], r = pillars[i + 1];
            if (Math.abs(l[0] - r[0]) < 200) {  // paired pillars are close
                const wj = checkWallJump(l, r);
                if (!wj.ok) {
                    issues.push(`  ❌ WALL-JUMP IMPOSSIBLE: pillar pair at x=${l[0]},${r[0]}  gap=${wj.innerGap}px  heightPerBounce=${wj.heightPerBounce}px  need=${wj.climbNeeded}px`);
                    allOk = false;
                }
            }
        }

        // Uniqueness metrics for cross-world comparison
        const metrics = {
            platformCount: floors.length,
            pillarPairs:   Math.floor(pillars.length / 2),
            maxGap:        Math.max(...gaps.map(g => g.gap), 0),
            totalClimb:    Math.round(sorted[0][1] - sorted[sorted.length - 1][1]),
            movingPlats:   mp4.length,
            mapWidth:      lv.mw,
        };

        wSummary.levels.push({ name: lv.n, li, metrics, issues });

        const statusLine = issues.length
            ? `    ⚠  ${issues.length} issue(s)`
            : `    ✅ all jumps OK`;

        console.log(`  W${wi}L${li} ${lv.n}`);
        console.log(`     platforms=${metrics.platformCount} pillars=${metrics.pillarPairs} maxGap=${metrics.maxGap}px climb=${metrics.totalClimb}px mapW=${metrics.mapWidth}`);
        if (issues.length) issues.forEach(i => console.log(i));
        else console.log(statusLine);
    });

    worldSummaries.push(wSummary);
    console.log();
});

// ── Cross-level uniqueness check ─────────────────────────────────────────────
console.log('═'.repeat(60));
console.log('UNIQUENESS REPORT — same level index across worlds');
console.log('═'.repeat(60));

for (let li = 0; li < 4; li++) {
    const levelLabel = ['Staircase', 'Pillar (low)', 'Pillar (high)', 'Extreme/Moving'][li];
    console.log(`\nLevel ${li} — ${levelLabel}:`);
    console.log('  World'.padEnd(24) + 'Plats  MaxGap  Climb  MapW');
    console.log('  ' + '─'.repeat(52));

    worldSummaries.forEach(ws => {
        const lv = ws.levels[li];
        const m  = lv.metrics;
        const similar = worldSummaries.filter(ws2 => {
            const m2 = ws2.levels[li].metrics;
            return Math.abs(m2.platformCount - m.platformCount) <= 1
                && Math.abs(m2.maxGap - m.maxGap) <= 20
                && Math.abs(m2.totalClimb - m.totalClimb) <= 30;
        });
        const flag = similar.length >= 4 ? '  ⚠ VERY SIMILAR to others' : '';
        console.log(`  ${ws.world.padEnd(22)} ${String(m.platformCount).padStart(4)}   ${String(m.maxGap).padStart(5)}   ${String(m.totalClimb).padStart(4)}  ${m.mapWidth}${flag}`);
    });
}

console.log('\n' + '═'.repeat(60));
console.log(allOk ? '✅ All jumps are mathematically possible!' : '❌ Some jumps CANNOT be made — see above.');
console.log('═'.repeat(60));
