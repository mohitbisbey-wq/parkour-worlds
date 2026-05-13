let AC;
try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}

['keydown', 'click'].forEach(ev => window.addEventListener(ev, () => {
    if (AC && AC.state === 'suspended') AC.resume();
}, { once: true }));

export function sfx(type) {
    if (!AC) return;
    const t = AC.currentTime;
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.connect(g);
    g.connect(AC.destination);
    switch (type) {
        case 'jump':
            o.type = 'square';
            o.frequency.setValueAtTime(300, t);
            o.frequency.linearRampToValueAtTime(480, t + 0.08);
            g.gain.setValueAtTime(0.06, t);
            g.gain.linearRampToValueAtTime(0, t + 0.1);
            o.start(t); o.stop(t + 0.1); break;
        case 'coin':
            o.type = 'sine';
            o.frequency.setValueAtTime(880, t);
            o.frequency.linearRampToValueAtTime(1400, t + 0.05);
            g.gain.setValueAtTime(0.07, t);
            g.gain.linearRampToValueAtTime(0, t + 0.07);
            o.start(t); o.stop(t + 0.07); break;
        case 'die':
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(300, t);
            o.frequency.linearRampToValueAtTime(60, t + 0.35);
            g.gain.setValueAtTime(0.09, t);
            g.gain.linearRampToValueAtTime(0, t + 0.38);
            o.start(t); o.stop(t + 0.38); break;
        case 'checkpoint':
            o.type = 'sine';
            o.frequency.setValueAtTime(440, t);
            o.frequency.setValueAtTime(660, t + 0.13);
            g.gain.setValueAtTime(0.06, t);
            g.gain.setValueAtTime(0.06, t + 0.13);
            g.gain.linearRampToValueAtTime(0, t + 0.28);
            o.start(t); o.stop(t + 0.28); break;
        case 'complete':
            o.type = 'sine';
            o.frequency.setValueAtTime(440, t);
            o.frequency.setValueAtTime(550, t + 0.1);
            o.frequency.setValueAtTime(660, t + 0.2);
            o.frequency.setValueAtTime(880, t + 0.32);
            g.gain.setValueAtTime(0.08, t);
            g.gain.linearRampToValueAtTime(0, t + 0.52);
            o.start(t); o.stop(t + 0.52); break;
    }
}
