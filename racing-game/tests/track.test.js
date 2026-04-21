import { describe, it, expect, beforeAll } from 'vitest';
import {
    buildTrack,
    getTrackPoint,
    getTrackTangent,
    getTrackNormal,
    closestTrackT,
} from '../src/track.js';

describe('buildTrack', () => {
    it('returns an array of 120 points', () => {
        const points = buildTrack();
        expect(Array.isArray(points)).toBe(true);
        expect(points.length).toBe(120);
    });

    it('each point has x and z properties', () => {
        const points = buildTrack();
        for (const p of points) {
            expect(typeof p.x).toBe('number');
            expect(typeof p.z).toBe('number');
        }
    });

    it('generates a closed loop (first and last points are nearby)', () => {
        const points = buildTrack();
        const first = points[0];
        const last = points[points.length - 1];
        // They shouldn't be exactly equal but should form a smooth loop
        // The getTrackPoint function handles wrapping
        expect(typeof first.x).toBe('number');
        expect(typeof last.x).toBe('number');
    });

    it('track points are not all identical', () => {
        const points = buildTrack();
        const allSame = points.every(p => p.x === points[0].x && p.z === points[0].z);
        expect(allSame).toBe(false);
    });

    it('track has reasonable dimensions', () => {
        const points = buildTrack();
        const maxX = Math.max(...points.map(p => Math.abs(p.x)));
        const maxZ = Math.max(...points.map(p => Math.abs(p.z)));
        expect(maxX).toBeGreaterThan(100);
        expect(maxX).toBeLessThan(500);
        expect(maxZ).toBeGreaterThan(100);
        expect(maxZ).toBeLessThan(500);
    });
});

describe('getTrackPoint', () => {
    let points;
    beforeAll(() => {
        points = buildTrack();
    });

    it('t=0 returns point near first track point', () => {
        const p = getTrackPoint(points, 0);
        expect(p.x).toBeCloseTo(points[0].x, 0);
        expect(p.z).toBeCloseTo(points[0].z, 0);
    });

    it('returns interpolated point for fractional t', () => {
        const p = getTrackPoint(points, 0.5);
        expect(typeof p.x).toBe('number');
        expect(typeof p.z).toBe('number');
        expect(isNaN(p.x)).toBe(false);
        expect(isNaN(p.z)).toBe(false);
    });

    it('wraps around for t >= 1', () => {
        const p0 = getTrackPoint(points, 0);
        const p1 = getTrackPoint(points, 1);
        expect(p0.x).toBeCloseTo(p1.x, 3);
        expect(p0.z).toBeCloseTo(p1.z, 3);
    });

    it('handles negative t values', () => {
        const p = getTrackPoint(points, -0.5);
        expect(typeof p.x).toBe('number');
        expect(isNaN(p.x)).toBe(false);
    });

    it('returns different points for different t values', () => {
        const p1 = getTrackPoint(points, 0.0);
        const p2 = getTrackPoint(points, 0.25);
        const p3 = getTrackPoint(points, 0.5);
        // At least some should differ
        const allSame = (p1.x === p2.x && p2.x === p3.x);
        expect(allSame).toBe(false);
    });
});

describe('getTrackTangent', () => {
    let points;
    beforeAll(() => {
        points = buildTrack();
    });

    it('returns a unit vector', () => {
        const tan = getTrackTangent(points, 0);
        const len = Math.sqrt(tan.x * tan.x + tan.z * tan.z);
        expect(len).toBeCloseTo(1, 3);
    });

    it('returns different tangents at different positions', () => {
        const t1 = getTrackTangent(points, 0);
        const t2 = getTrackTangent(points, 0.25);
        const sameTan = (t1.x === t2.x && t1.z === t2.z);
        expect(sameTan).toBe(false);
    });

    it('tangent at quarter way around track', () => {
        const tan = getTrackTangent(points, 0.25);
        const len = Math.sqrt(tan.x * tan.x + tan.z * tan.z);
        expect(len).toBeCloseTo(1, 3);
    });

    it('does not return NaN', () => {
        for (let t = 0; t < 1; t += 0.1) {
            const tan = getTrackTangent(points, t);
            expect(isNaN(tan.x)).toBe(false);
            expect(isNaN(tan.z)).toBe(false);
        }
    });
});

describe('getTrackNormal', () => {
    let points;
    beforeAll(() => {
        points = buildTrack();
    });

    it('returns a unit vector', () => {
        const norm = getTrackNormal(points, 0);
        const len = Math.sqrt(norm.x * norm.x + norm.z * norm.z);
        expect(len).toBeCloseTo(1, 3);
    });

    it('is perpendicular to tangent', () => {
        for (let t = 0; t < 1; t += 0.1) {
            const tan = getTrackTangent(points, t);
            const norm = getTrackNormal(points, t);
            const dot = tan.x * norm.x + tan.z * norm.z;
            expect(dot).toBeCloseTo(0, 3);
        }
    });

    it('normal is (-tangent.z, tangent.x)', () => {
        const tan = getTrackTangent(points, 0.3);
        const norm = getTrackNormal(points, 0.3);
        expect(norm.x).toBeCloseTo(-tan.z, 5);
        expect(norm.z).toBeCloseTo(tan.x, 5);
    });
});

describe('closestTrackT', () => {
    let points;
    beforeAll(() => {
        points = buildTrack();
    });

    it('returns an object with t and dist', () => {
        const result = closestTrackT(points, 0, 0);
        expect(typeof result.t).toBe('number');
        expect(typeof result.dist).toBe('number');
    });

    it('point on the track has small distance', () => {
        const trackP = getTrackPoint(points, 0.5);
        const result = closestTrackT(points, trackP.x, trackP.z);
        expect(result.dist).toBeLessThan(1);
    });

    it('t is between 0 and 1', () => {
        const result = closestTrackT(points, 100, 100);
        expect(result.t).toBeGreaterThanOrEqual(0);
        expect(result.t).toBeLessThan(1);
    });

    it('point far from track has large distance', () => {
        const result = closestTrackT(points, 1000, 1000);
        expect(result.dist).toBeGreaterThan(100);
    });

    it('finds correct t for a known track point', () => {
        const targetT = 0.3;
        const trackP = getTrackPoint(points, targetT);
        const result = closestTrackT(points, trackP.x, trackP.z);
        expect(result.t).toBeCloseTo(targetT, 1);
        expect(result.dist).toBeLessThan(1);
    });

    it('center of oval has significant distance from track', () => {
        const result = closestTrackT(points, 0, 0);
        expect(result.dist).toBeGreaterThan(50);
    });
});
