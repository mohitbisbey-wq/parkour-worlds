let _ac = null, _master = null, _stops = [], _wi = -2, _muted = false, _nbuf = null;
const VOL = 0.22;

function _ctx() {
    if (!_ac) {
        _ac = new (window.AudioContext || window.webkitAudioContext)();
        _master = _ac.createGain();
        _master.gain.value = _muted ? 0 : VOL;
        _master.connect(_ac.destination);
        // Resume on first user gesture (browser autoplay policy)
        const resume = () => _ac.resume();
        ['click', 'keydown', 'touchstart'].forEach(ev =>
            document.addEventListener(ev, resume, { once: true })
        );
    }
    _ac.resume().catch(() => {});
    return _ac;
}

// ── Oscillator with attack + decay envelope ───────────────────────────
function _osc(ac, d, freq, t, dur, type, pk, att = 0.008) {
    try {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type; o.frequency.value = freq;
        const r = Math.min(0.05, dur * 0.2);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(pk, t + att);
        if (dur > att + r) g.gain.setValueAtTime(pk * 0.65, t + dur - r);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(d);
        o.start(t); o.stop(t + dur + 0.02);
    } catch (_) {}
}

// ── Kick drum — pitch-bent sine ───────────────────────────────────────
function _kick(ac, d, t, gain = 0.42) {
    try {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(140, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.06);
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        o.connect(g); g.connect(d);
        o.start(t); o.stop(t + 0.18);
    } catch (_) {}
}

// ── Noise burst (snare / hi-hat / splash) — shared buffer ────────────
function _nb(ac) {
    if (_nbuf) return _nbuf;
    const n = ac.sampleRate >> 1;
    _nbuf = ac.createBuffer(1, n, ac.sampleRate);
    const dd = _nbuf.getChannelData(0);
    for (let i = 0; i < n; i++) dd[i] = Math.random() * 2 - 1;
    return _nbuf;
}

function _hit(ac, d, t, hp, dur, pk) {
    try {
        const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = _nb(ac);
        f.type = 'highpass'; f.frequency.value = hp;
        g.gain.setValueAtTime(pk, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f); f.connect(g); g.connect(d);
        s.start(t); s.stop(t + dur + 0.02);
    } catch (_) {}
}

// ── Look-ahead scheduler ──────────────────────────────────────────────
// stepDur: seconds per step; pat: array (0 = rest); fn(value, audioTime)
function _seq(ac, sd, pat, fn) {
    const AH = 0.28;
    let nx = ac.currentTime + 0.06, i = 0;
    const id = setInterval(() => {
        while (nx < ac.currentTime + AH) {
            fn(pat[i % pat.length], nx);
            nx += sd; i++;
        }
    }, 22);
    return () => clearInterval(id);
}

// ── Public API ────────────────────────────────────────────────────────

export function playMusic(wi) {
    if (_wi === wi) return;
    stopMusic(); _wi = wi;
    const ac = _ctx(), d = _master;
    const tracks = [_pirate, _ninja, _west, _ocean, _fire, _practice];
    _stops = wi === -1 ? _menu(ac, d) : (tracks[wi] ? tracks[wi](ac, d) : []);
}

export function stopMusic() {
    _stops.forEach(f => f()); _stops = []; _wi = -2;
}

export function toggleMute() {
    _muted = !_muted;
    if (_master) _master.gain.linearRampToValueAtTime(
        _muted ? 0 : VOL, _ac.currentTime + 0.1
    );
    return _muted;
}

export function isMuted() { return _muted; }

// ── 0  Pirate Seas — D major shanty, 124 BPM ─────────────────────────
function _pirate(ac, d) {
    const Q = 60 / 124, S = Q / 2, T = Q / 4;
    const [D2, A2, G2] = [73.42, 110.00, 98.00];
    const [D3, A3] = [146.83, 220.00];
    const [D4, E4, Fs4, G4, A4, B4, Cs5, D5] =
        [293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 554.37, 587.33];
    const Z = 0;

    // Bass (quarter notes, 16 steps)
    const bP = [D2,Z,D2,A2, G2,Z,G2,A2, D2,Z,D2,Z, A2,G2,A2,D2];
    const s1 = _seq(ac, Q, bP, (f, t) => f && _osc(ac, d, f, t, Q * .85, 'sine', 0.28));

    // Melody (eighth notes, 32 steps) — shanty ascending/descending phrases
    const mP = [D4,Z,Fs4,A4, B4,A4,G4,Fs4, E4,Z,D4,Z,   A4,Z,Fs4,E4,
                D4,Z,Fs4,A4, B4,Cs5,D5,Z,  A4,G4,Fs4,E4, D4,Z,A3,Z];
    const s2 = _seq(ac, S, mP, (f, t) => f && _osc(ac, d, f, t, S * .65, 'triangle', 0.16, 0.005));

    // Kick (16th notes, 32 steps)
    const kP = [1,0,0,0,0,0,1,0, 1,0,0,0,0,0,0,0, 1,0,0,0,0,0,1,0, 1,0,0,1,0,0,0,0];
    const s3 = _seq(ac, T, kP, (v, t) => v && _kick(ac, d, t));
    // Snare on 2 & 4 (16th, 16 steps)
    const sP = [0,0,0,0,1,0,0,0, 0,0,0,0,1,0,0,0];
    const s4 = _seq(ac, T, sP, (v, t) => v && _hit(ac, d, t, 2200, .07, .20));
    // Hi-hat (16th, 8 steps)
    const hP = [1,0,1,0, 1,0,1,0];
    const s5 = _seq(ac, T, hP, (v, t) => v && _hit(ac, d, t, 7000, .03, .07));

    return [s1, s2, s3, s4, s5];
}

// ── 1  Ninja Dojo — D minor pentatonic, 72 BPM, sparse ───────────────
function _ninja(ac, d) {
    const Q = 60 / 72, S = Q / 2;
    const [D3, F3, G3, A3] = [146.83, 174.61, 196.00, 220.00];
    const [D4, F4, G4, A4, C5, D5] = [293.66, 349.23, 392.00, 440.00, 523.25, 587.33];
    const Z = 0;

    // Plucked melody (eighth notes, 32 steps) — lots of silence
    const mP = [D4,Z,Z,Z, Z,Z,A3,Z,  Z,Z,Z,Z, G3,Z,Z,Z,
                D4,Z,Z,Z, F4,Z,Z,G4, A4,Z,Z,Z, Z,Z,D4,Z];
    const s1 = _seq(ac, S, mP, (f, t) =>
        f && _osc(ac, d, f, t, S * .28, 'triangle', 0.20, 0.002)
    );

    // Low bass drone (quarter notes, 16 steps)
    const bP = [D3,Z,A3,Z, G3,Z,A3,Z, D3,Z,Z,Z, F3,Z,A3,Z];
    const s2 = _seq(ac, Q, bP, (f, t) => f && _osc(ac, d, f, t, Q * .9, 'sine', 0.18));

    // Bell accent — high sparse notes
    const bellP = [Z,Z,Z,Z, Z,Z,Z,Z, D5,Z,Z,Z, Z,Z,Z,Z,
                   Z,Z,Z,Z, Z,Z,Z,Z, A4,Z,Z,Z, C5,Z,Z,Z];
    const s3 = _seq(ac, S, bellP, (f, t) =>
        f && _osc(ac, d, f, t, S * .4, 'sine', 0.10, 0.001)
    );

    // Soft subtle pulse (every 2 beats)
    const pulP = [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];
    const s4 = _seq(ac, Q / 4, pulP, (v, t) => v && _hit(ac, d, t, 3500, .04, .06));

    return [s1, s2, s3, s4];
}

// ── 2  Wild West — E major pentatonic, 92 BPM ────────────────────────
function _west(ac, d) {
    const Q = 60 / 92, S = Q / 2, T = Q / 4;
    const [E2, B2, A2] = [82.41, 123.47, 110.00];
    const [E3, Fs3, Gs3, B3, Cs4] = [164.81, 185.00, 207.65, 246.94, 277.18];
    const [E4, Fs4, Gs4, B4, Cs5] = [329.63, 369.99, 415.30, 493.88, 554.37];
    const Z = 0;

    // Twangy melody (sawtooth + upper harmonic for twang)
    const mP = [E4,Z,Gs4,B4, E4,Z,Gs4,B4, Gs4,Z,Fs4,E4, B3,Z,Cs4,E4,
                E4,Z,Gs4,B4, Cs5,B4,Gs4,E4, Fs4,Z,E4,Cs4, B3,Z,E4,Z];
    const s1 = _seq(ac, S, mP, (f, t) => {
        if (!f) return;
        _osc(ac, d, f,     t, S * .7,  'sawtooth', 0.14, 0.003);
        _osc(ac, d, f * 2, t, S * .15, 'sawtooth', 0.04, 0.002);
    });

    // Bass (quarter notes)
    const bP = [E2,Z,B2,Z, E2,Z,A2,B2, E2,Z,B2,Z, A2,Z,B2,E2];
    const s2 = _seq(ac, Q, bP, (f, t) => f && _osc(ac, d, f, t, Q * .8, 'sine', 0.26));

    // Clip-clop (galloping 16th pattern [1,1,0,1])
    const clipP = [1,1,0,1, 1,1,0,1];
    const s3 = _seq(ac, T, clipP, (v, t) => v && _hit(ac, d, t, 5500, .04, .09));

    // Kick on 1 & 3, snare on 2 & 4
    const kP = [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];
    const sP = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
    const s4 = _seq(ac, T, kP,  (v, t) => v && _kick(ac, d, t, 0.35));
    const s5 = _seq(ac, T, sP,  (v, t) => v && _hit(ac, d, t, 1800, .08, .16));

    return [s1, s2, s3, s4, s5];
}

// ── 3  Deep Ocean — F minor ambient, 50 BPM ──────────────────────────
function _ocean(ac, d) {
    const Q = 60 / 50;      // 1.2 s per beat
    const H = Q * 2;        // half note = 2.4 s
    const W4 = Q * 4;       // whole note = 4.8 s
    const [F2, C2, Bb1] = [87.31, 65.41, 58.27];
    const [F3, Ab3, Bb3, C4, Eb4] = [174.61, 207.65, 233.08, 261.63, 311.13];
    const [F4, Ab4, C5]  = [349.23, 415.30, 523.25];
    const Z = 0;

    // Slow melody (half notes, long crossfade) — let notes overlap for richness
    const mP = [F3,Z,C4,Eb4, F3,Ab3,C4,Z, Eb4,C4,Ab3,F3, C4,Z,Ab3,Z];
    const s1 = _seq(ac, H, mP, (f, t) =>
        f && _osc(ac, d, f, t, H * .9, 'sine', 0.18, 0.10)
    );

    // Deep bass (whole notes)
    const bP = [F2, C2, Bb1, C2];
    const s2 = _seq(ac, W4, bP, (f, t) =>
        f && _osc(ac, d, f, t, W4 * .92, 'sine', 0.22, 0.25)
    );

    // Upper shimmer — very slow, fading in and out
    const shimP = [F4,Z,Z,Z, Ab4,Z,Z,Z, C5,Z,Z,Z, Ab4,Z,Z,Z];
    const s3 = _seq(ac, H, shimP, (f, t) =>
        f && _osc(ac, d, f, t, H * 2.0, 'sine', 0.07, 0.5)
    );

    // Occasional bubble pops (noise filtered high)
    const bubP = [0,0,1,0, 0,0,0,1, 0,1,0,0, 0,0,0,1];
    const s4 = _seq(ac, Q / 2, bubP, (v, t) => v && _hit(ac, d, t, 3200, .04, .09));

    return [s1, s2, s3, s4];
}

// ── 4  Fire & Brimstone — E minor driving, 158 BPM ───────────────────
function _fire(ac, d) {
    const Q = 60 / 158, S = Q / 2, T = Q / 4;
    const [E1, B1] = [41.20, 61.74];
    const [E2, G2, A2, B2, D3] = [82.41, 98.00, 110.00, 123.47, 146.83];
    const [E4, G4, A4, B4, D5] = [329.63, 392.00, 440.00, 493.88, 587.33];
    const Z = 0;

    // Driving bass (eighth notes, 16 steps)
    const bP = [E2,E2,G2,Z, E2,Z,A2,D3, E2,E2,G2,Z, E2,Z,B2,Z];
    const s1 = _seq(ac, S, bP, (f, t) => f && _osc(ac, d, f, t, S * .75, 'sawtooth', 0.22, 0.004));

    // Power melody (eighth notes, 32 steps)
    const mP = [E4,Z,G4,A4, Z,G4,E4,Z,  D5,Z,B4,A4, G4,Z,E4,Z,
                E4,Z,G4,A4, B4,A4,G4,E4, D5,Z,B4,G4, A4,Z,E4,Z];
    const s2 = _seq(ac, S, mP, (f, t) => f && _osc(ac, d, f, t, S * .6, 'square', 0.13, 0.003));

    // Kick every beat
    const kP = [1,0,0,0, 1,0,0,0];
    const s3 = _seq(ac, T, kP, (v, t) => v && _kick(ac, d, t, 0.55));

    // Snare accent on 3
    const sP = [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];
    const s4 = _seq(ac, T, sP, (v, t) => v && _hit(ac, d, t, 2000, .09, .28));

    // Open hi-hat on 2
    const hP = [0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0];
    const s5 = _seq(ac, T, hP, (v, t) => v && _hit(ac, d, t, 6000, .12, .14));

    // Sub bass rumble
    const subP = [E1, Z, Z, Z, B1, Z, Z, Z];
    const s6 = _seq(ac, Q, subP, (f, t) => f && _osc(ac, d, f, t, Q * .85, 'sine', 0.18));

    return [s1, s2, s3, s4, s5, s6];
}

// ── 5  Practice — C major 8-bit, 100 BPM ─────────────────────────────
function _practice(ac, d) {
    const Q = 60 / 100, S = Q / 2;
    const [C3, G2, F2] = [130.81, 98.00, 87.31];
    const [C4, D4, E4, F4, G4, A4, B4, C5] =
        [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    const Z = 0;

    // 8-bit melody (square wave, eighth notes, 32 steps)
    const mP = [C4,Z,E4,G4, C5,Z,G4,E4, F4,Z,A4,C5, B4,Z,G4,Z,
                C4,Z,E4,G4, A4,Z,C5,B4, A4,G4,F4,E4, C4,Z,C4,Z];
    const s1 = _seq(ac, S, mP, (f, t) => f && _osc(ac, d, f, t, S * .65, 'square', 0.14, 0.004));

    // Bass (quarter notes)
    const bP = [C3, Z, G2, Z, F2, Z, G2, C3];
    const s2 = _seq(ac, Q, bP, (f, t) => f && _osc(ac, d, f, t, Q * .8, 'sine', 0.20));

    // Simple kick + snare
    const kP = [1,0,0,0, 1,0,0,0];
    const sP = [0,0,1,0, 0,0,1,0];
    const s3 = _seq(ac, Q / 4, kP, (v, t) => v && _kick(ac, d, t, 0.32));
    const s4 = _seq(ac, Q / 4, sP, (v, t) => v && _hit(ac, d, t, 2000, .07, .15));

    return [s1, s2, s3, s4];
}

// ── -1  Main Menu — D major anthem, 100 BPM ──────────────────────────
function _menu(ac, d) {
    const Q = 60 / 100, S = Q / 2;
    const [D2, A2, G2] = [73.42, 110.00, 98.00];
    const [D3, Fs3, G3, A3] = [146.83, 185.00, 196.00, 220.00];
    const [D4, E4, Fs4, G4, A4, B4, Cs5, D5] =
        [293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 554.37, 587.33];
    const Z = 0;

    // Stately melody (triangle, eighth notes, 32 steps)
    const mP = [D4,Z,Fs4,A4, D5,A4,Fs4,D4, E4,Z,G4,B4, A4,Z,Z,Z,
                Fs4,Z,A4,Cs5, D5,Cs5,B4,A4, G4,Z,Fs4,E4, D4,Z,Z,Z];
    const s1 = _seq(ac, S, mP, (f, t) => f && _osc(ac, d, f, t, S * .7, 'triangle', 0.17, 0.008));

    // Bass (quarter notes)
    const bP = [D2,Z,A2,Z, G2,Z,A2,D2];
    const s2 = _seq(ac, Q, bP, (f, t) => f && _osc(ac, d, f, t, Q * .85, 'sine', 0.26));

    // Chord pad — plays root + 5th + major 3rd simultaneously
    const padP = [D3, Z, Z, Z, G3, Z, Z, Z];
    const s3 = _seq(ac, Q, padP, (f, t) => {
        if (!f) return;
        _osc(ac, d, f,        t, Q * 1.9, 'sine', 0.12, 0.15);
        _osc(ac, d, f * 1.5,  t, Q * 1.9, 'sine', 0.08, 0.15);
        _osc(ac, d, f * 1.25, t, Q * 1.9, 'sine', 0.06, 0.15);
    });

    // Gentle beat
    const kP = [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];
    const sP = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
    const s4 = _seq(ac, Q / 4, kP, (v, t) => v && _kick(ac, d, t, 0.30));
    const s5 = _seq(ac, Q / 4, sP, (v, t) => v && _hit(ac, d, t, 2200, .07, .16));

    return [s1, s2, s3, s4, s5];
}
