// Provide a working localStorage for vitest's jsdom environment.
// jsdom requires a URL origin to enable localStorage; rather than fight
// vitest's environment option wiring, we install a compliant mock once.
function makeMockStorage() {
    let store = {};
    return {
        getItem:    (k)      => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
        setItem:    (k, v)   => { store[k] = String(v); },
        removeItem: (k)      => { delete store[k]; },
        clear:      ()       => { store = {}; },
        get length()         { return Object.keys(store).length; },
        key:        (i)      => Object.keys(store)[i] ?? null,
    };
}

Object.defineProperty(globalThis, 'localStorage', {
    value:        makeMockStorage(),
    writable:     true,
    configurable: true,
});
