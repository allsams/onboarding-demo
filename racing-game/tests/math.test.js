import { describe, it, expect } from 'vitest';
import {
    mat4Perspective,
    mat4LookAt,
    mat4Multiply,
    mat4Identity,
    mat4Translate,
    mat4RotateY,
    mat4Scale,
    lerp,
    clamp,
} from '../src/math.js';

describe('lerp', () => {
    it('returns a when t=0', () => {
        expect(lerp(10, 20, 0)).toBe(10);
    });

    it('returns b when t=1', () => {
        expect(lerp(10, 20, 1)).toBe(20);
    });

    it('returns midpoint when t=0.5', () => {
        expect(lerp(0, 100, 0.5)).toBe(50);
    });

    it('handles negative values', () => {
        expect(lerp(-10, 10, 0.5)).toBe(0);
    });

    it('extrapolates beyond 0-1 range', () => {
        expect(lerp(0, 10, 2)).toBe(20);
        expect(lerp(0, 10, -1)).toBe(-10);
    });
});

describe('clamp', () => {
    it('returns value when within range', () => {
        expect(clamp(5, 0, 10)).toBe(5);
    });

    it('clamps to minimum', () => {
        expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('clamps to maximum', () => {
        expect(clamp(15, 0, 10)).toBe(10);
    });

    it('handles equal bounds', () => {
        expect(clamp(5, 3, 3)).toBe(3);
    });

    it('handles negative ranges', () => {
        expect(clamp(-50, -10, -1)).toBe(-10);
        expect(clamp(0, -10, -1)).toBe(-1);
    });

    it('returns boundary when value equals boundary', () => {
        expect(clamp(0, 0, 10)).toBe(0);
        expect(clamp(10, 0, 10)).toBe(10);
    });
});

describe('mat4Identity', () => {
    it('returns a 16-element Float32Array', () => {
        const m = mat4Identity();
        expect(m).toBeInstanceOf(Float32Array);
        expect(m.length).toBe(16);
    });

    it('has ones on the diagonal', () => {
        const m = mat4Identity();
        expect(m[0]).toBe(1);
        expect(m[5]).toBe(1);
        expect(m[10]).toBe(1);
        expect(m[15]).toBe(1);
    });

    it('has zeros off the diagonal', () => {
        const m = mat4Identity();
        const offDiagonal = [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14];
        for (const i of offDiagonal) {
            expect(m[i]).toBe(0);
        }
    });
});

describe('mat4Translate', () => {
    it('sets translation in the last column', () => {
        const m = mat4Translate(3, 5, 7);
        expect(m[12]).toBe(3);
        expect(m[13]).toBe(5);
        expect(m[14]).toBe(7);
    });

    it('has identity in the rotation part', () => {
        const m = mat4Translate(1, 2, 3);
        expect(m[0]).toBe(1);
        expect(m[5]).toBe(1);
        expect(m[10]).toBe(1);
        expect(m[15]).toBe(1);
    });

    it('handles zero translation', () => {
        const m = mat4Translate(0, 0, 0);
        const id = mat4Identity();
        for (let i = 0; i < 16; i++) {
            expect(m[i]).toBe(id[i]);
        }
    });
});

describe('mat4Scale', () => {
    it('sets scale on diagonal', () => {
        const m = mat4Scale(2, 3, 4);
        expect(m[0]).toBe(2);
        expect(m[5]).toBe(3);
        expect(m[10]).toBe(4);
        expect(m[15]).toBe(1);
    });

    it('uniform scale of 1 is identity', () => {
        const m = mat4Scale(1, 1, 1);
        const id = mat4Identity();
        for (let i = 0; i < 16; i++) {
            expect(m[i]).toBe(id[i]);
        }
    });
});

describe('mat4RotateY', () => {
    it('angle=0 produces identity', () => {
        const m = mat4RotateY(0);
        const id = mat4Identity();
        for (let i = 0; i < 16; i++) {
            expect(m[i]).toBeCloseTo(id[i], 10);
        }
    });

    it('angle=PI/2 rotates correctly', () => {
        const m = mat4RotateY(Math.PI / 2);
        expect(m[0]).toBeCloseTo(0, 5);   // cos(PI/2)
        expect(m[2]).toBeCloseTo(-1, 5);  // -sin(PI/2)
        expect(m[8]).toBeCloseTo(1, 5);   // sin(PI/2)
        expect(m[10]).toBeCloseTo(0, 5);  // cos(PI/2)
    });

    it('angle=PI produces 180 rotation', () => {
        const m = mat4RotateY(Math.PI);
        expect(m[0]).toBeCloseTo(-1, 5);
        expect(m[10]).toBeCloseTo(-1, 5);
    });

    it('full rotation returns to identity', () => {
        const m = mat4RotateY(Math.PI * 2);
        const id = mat4Identity();
        for (let i = 0; i < 16; i++) {
            expect(m[i]).toBeCloseTo(id[i], 5);
        }
    });
});

describe('mat4Multiply', () => {
    it('identity * identity = identity', () => {
        const id = mat4Identity();
        const result = mat4Multiply(id, id);
        for (let i = 0; i < 16; i++) {
            expect(result[i]).toBeCloseTo(id[i], 10);
        }
    });

    it('identity * A = A', () => {
        const id = mat4Identity();
        const a = mat4Translate(3, 5, 7);
        const result = mat4Multiply(id, a);
        for (let i = 0; i < 16; i++) {
            expect(result[i]).toBeCloseTo(a[i], 5);
        }
    });

    it('A * identity = A', () => {
        const id = mat4Identity();
        const a = mat4Scale(2, 3, 4);
        const result = mat4Multiply(a, id);
        for (let i = 0; i < 16; i++) {
            expect(result[i]).toBeCloseTo(a[i], 5);
        }
    });

    it('scale * translate produces correct result', () => {
        const s = mat4Scale(2, 2, 2);
        const t = mat4Translate(1, 0, 0);
        const result = mat4Multiply(s, t);
        // Scaling a translated matrix: translation doubles
        expect(result[0]).toBe(2);
        expect(result[12]).toBe(2); // translation x scaled by 2
    });
});

describe('mat4Perspective', () => {
    it('returns a 16-element Float32Array', () => {
        const m = mat4Perspective(Math.PI / 4, 1.5, 0.1, 100);
        expect(m).toBeInstanceOf(Float32Array);
        expect(m.length).toBe(16);
    });

    it('has correct structure (zero elements where expected)', () => {
        const m = mat4Perspective(Math.PI / 4, 1.5, 0.1, 100);
        // Off-axis elements should be 0
        expect(m[1]).toBe(0);
        expect(m[2]).toBe(0);
        expect(m[3]).toBe(0);
        expect(m[4]).toBe(0);
        expect(m[6]).toBe(0);
        expect(m[7]).toBe(0);
        expect(m[8]).toBe(0);
        expect(m[9]).toBe(0);
        expect(m[12]).toBe(0);
        expect(m[13]).toBe(0);
        // m[11] should be -1
        expect(m[11]).toBe(-1);
        expect(m[15]).toBe(0);
    });

    it('aspect ratio affects x scaling', () => {
        const narrow = mat4Perspective(Math.PI / 4, 0.5, 0.1, 100);
        const wide = mat4Perspective(Math.PI / 4, 2.0, 0.1, 100);
        // Wider aspect should have smaller x scale
        expect(wide[0]).toBeLessThan(narrow[0]);
    });
});

describe('mat4LookAt', () => {
    it('returns a 16-element Float32Array', () => {
        const m = mat4LookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]);
        expect(m).toBeInstanceOf(Float32Array);
        expect(m.length).toBe(16);
    });

    it('looking along -Z from origin produces expected view', () => {
        const m = mat4LookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]);
        // Z axis of view should point from target to eye (positive Z)
        expect(m[2]).toBeCloseTo(0, 5);  // zx
        expect(m[6]).toBeCloseTo(0, 5);  // zy
        expect(m[10]).toBeCloseTo(1, 5); // zz
    });

    it('eye at origin looking down -Z', () => {
        const m = mat4LookAt([0, 0, 0.001], [0, 0, 0], [0, 1, 0]);
        expect(m).toBeInstanceOf(Float32Array);
        // Should not have NaN
        for (let i = 0; i < 16; i++) {
            expect(isNaN(m[i])).toBe(false);
        }
    });
});
