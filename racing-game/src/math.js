// ---- MATH HELPERS ----

export function mat4Perspective(fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, 2 * far * near * nf, 0
    ]);
}

export function mat4LookAt(eye, center, up) {
    let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
    let len = Math.sqrt(zx * zx + zy * zy + zz * zz);
    zx /= len; zy /= len; zz /= len;
    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    len = Math.sqrt(xx * xx + xy * xy + xz * xz);
    xx /= len; xy /= len; xz /= len;
    let yx = zy * xz - zz * xy;
    let yy = zz * xx - zx * xz;
    let yz = zx * xy - zy * xx;
    return new Float32Array([
        xx, yx, zx, 0,
        xy, yy, zy, 0,
        xz, yz, zz, 0,
        -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
        -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
        -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
        1
    ]);
}

export function mat4Multiply(a, b) {
    const r = new Float32Array(16);
    for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
            r[i * 4 + j] = 0;
            for (let k = 0; k < 4; k++)
                r[i * 4 + j] += a[k * 4 + j] * b[i * 4 + k];
        }
    return r;
}

export function mat4Identity() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
}

export function mat4Translate(tx, ty, tz) {
    const m = mat4Identity();
    m[12] = tx; m[13] = ty; m[14] = tz;
    return m;
}

export function mat4RotateY(angle) {
    const m = mat4Identity();
    const c = Math.cos(angle), s = Math.sin(angle);
    m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
    return m;
}

export function mat4Scale(sx, sy, sz) {
    const m = mat4Identity();
    m[0] = sx; m[5] = sy; m[10] = sz;
    return m;
}

export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
