// netIdentity.js
// 멀티 준비용 'IP처럼 보이는' 안정적인 라벨 생성 (실제 IP는 브라우저에서 직접 얻기 어려움)

const LS_KEY = 'diceland_client_id_v1';

function rand32() {
    const c = globalThis.crypto;
    if (c?.getRandomValues) {
        const a = new Uint32Array(1);
        c.getRandomValues(a);
        return a[0] >>> 0;
    }
    return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

export function getClientId() {
    try {
        let v = localStorage.getItem(LS_KEY);
        if (!v) {
            v = String(rand32());
            localStorage.setItem(LS_KEY, v);
        }
        return v;
    } catch {
        return String(rand32());
    }
}

export function getClientIpLike() {
    const id = Number(getClientId()) >>> 0;
    const x = id & 0xff;
    const y = (id >>> 8) & 0xff;
    const z = (id >>> 16) & 0xff;
    return `10.${x}.${y}.${z}`;
}

function hash32(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function getIpLikeFromId(id) {
    const v = hash32(String(id || '0'));
    const x = v & 0xff;
    const y = (v >>> 8) & 0xff;
    const z = (v >>> 16) & 0xff;
    return `10.${x}.${y}.${z}`;
}
