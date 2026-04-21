// ---- TRACK DEFINITION ----

export function buildTrack() {
    const points = [];
    const segments = 120;
    for (let i = 0; i < segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        let x = Math.cos(t) * 280;
        let z = Math.sin(t) * 180;
        x += Math.sin(t * 2) * 40;
        z += Math.cos(t * 2) * 25;
        points.push({ x, z });
    }
    return points;
}

export function getTrackPoint(points, t) {
    const len = points.length;
    const idx = ((t % 1) + 1) % 1 * len;
    const i0 = Math.floor(idx) % len;
    const i1 = (i0 + 1) % len;
    const frac = idx - Math.floor(idx);
    return {
        x: points[i0].x + (points[i1].x - points[i0].x) * frac,
        z: points[i0].z + (points[i1].z - points[i0].z) * frac
    };
}

export function getTrackTangent(points, t) {
    const dt = 0.001;
    const p0 = getTrackPoint(points, t);
    const p1 = getTrackPoint(points, t + dt);
    const dx = p1.x - p0.x;
    const dz = p1.z - p0.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    return { x: dx / len, z: dz / len };
}

export function getTrackNormal(points, t) {
    const tan = getTrackTangent(points, t);
    return { x: -tan.z, z: tan.x };
}

export function closestTrackT(points, px, pz) {
    let bestT = 0;
    let bestDist = Infinity;
    const steps = points.length * 4;
    for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const p = getTrackPoint(points, t);
        const dx = p.x - px;
        const dz = p.z - pz;
        const d = dx * dx + dz * dz;
        if (d < bestDist) {
            bestDist = d;
            bestT = t;
        }
    }
    // Refine with binary search
    for (let j = 0; j < 12; j++) {
        const step = 1.0 / (steps * Math.pow(2, j + 1));
        for (const off of [-step, 0, step]) {
            const t = ((bestT + off) % 1 + 1) % 1;
            const p = getTrackPoint(points, t);
            const dx = p.x - px;
            const dz = p.z - pz;
            const d = dx * dx + dz * dz;
            if (d < bestDist) {
                bestDist = d;
                bestT = t;
            }
        }
    }
    return { t: ((bestT % 1) + 1) % 1, dist: Math.sqrt(bestDist) };
}
