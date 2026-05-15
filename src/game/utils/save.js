// 11 worlds × 4 levels = 44 save slots (worlds 0-10, indices 0-43)
export const SAVE_SLOTS = 44;

export const done = new Array(SAVE_SLOTS).fill(false);
export const bests = Array.from({ length: SAVE_SLOTS }, () => []);

export function loadSave() {
    try {
        const d = localStorage.getItem('ppd2');
        if (d) {
            const parsed = JSON.parse(d);
            parsed.forEach((v, i) => { if (i < SAVE_SLOTS) done[i] = v; });
        }
    } catch (e) {}
    for (let i = 0; i < SAVE_SLOTS; i++) {
        try {
            const b = localStorage.getItem(`ppb2_${i}`);
            if (b) bests[i] = JSON.parse(b);
        } catch (e) {}
    }
}

export function saveDone() {
    try { localStorage.setItem('ppd2', JSON.stringify([...done])); } catch (e) {}
}

export function saveBest(i) {
    try { localStorage.setItem(`ppb2_${i}`, JSON.stringify(bests[i])); } catch (e) {}
}

export function recTime(li, ms) {
    bests[li].push(ms);
    bests[li].sort((a, b) => a - b);
    if (bests[li].length > 3) bests[li].pop();
    saveBest(li);
    return bests[li].indexOf(ms);
}

export function fmt(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${m ? m + ':' : ''}${String(s).padStart(m ? 2 : 1, '0')}.${String(cs).padStart(2, '0')}`;
}

export const wUnlk = () => true;
export const lUnlk = () => true;
