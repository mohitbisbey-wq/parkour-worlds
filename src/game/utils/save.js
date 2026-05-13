export const done = new Array(21).fill(false);
export const bests = Array.from({ length: 21 }, () => []);

export function loadSave() {
    try {
        const d = localStorage.getItem('ppd2');
        if (d) {
            const parsed = JSON.parse(d);
            parsed.forEach((v, i) => { done[i] = v; });
        }
    } catch (e) {}
    for (let i = 0; i < 21; i++) {
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
