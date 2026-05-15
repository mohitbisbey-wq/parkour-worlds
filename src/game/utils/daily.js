/**
 * Deterministic daily level picker.
 * Given a day number (Math.floor(Date.now()/86400000)), returns { wi, li }
 * where wi is world index (0-7) and li is level index (0-3).
 * Uses the same hash as parkour-worlds.html.
 */
export function dailyHash(day) {
    let s = (day ^ 0xdeadbeef) >>> 0;
    s = (Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0);
    s = ((s ^ (s >>> 16)) >>> 0) % 32; // >>> 0 keeps unsigned before modulo
    return { wi: Math.floor(s / 4), li: s % 4 };
}
