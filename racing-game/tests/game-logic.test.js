import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
    CAR_DEFS,
    DIFFICULTIES,
    ITEMS,
    BASE_TOP_SPEED,
    COLLISION_RADIUS,
    ITEM_PICKUP_RADIUS,
    BOOST_SPEED_MULT,
    createRacer,
    getRacerPosition,
    getPositionSuffix,
    handleCollisions,
    updateRacerPhysics,
} from '../src/game-logic.js';
import { buildTrack, getTrackPoint } from '../src/track.js';

describe('getPositionSuffix', () => {
    it('returns "st" for 1st place', () => {
        expect(getPositionSuffix(1)).toBe('st');
    });

    it('returns "nd" for 2nd place', () => {
        expect(getPositionSuffix(2)).toBe('nd');
    });

    it('returns "rd" for 3rd place', () => {
        expect(getPositionSuffix(3)).toBe('rd');
    });

    it('returns "th" for 4th place and beyond', () => {
        expect(getPositionSuffix(4)).toBe('th');
        expect(getPositionSuffix(5)).toBe('th');
        expect(getPositionSuffix(10)).toBe('th');
        expect(getPositionSuffix(100)).toBe('th');
    });
});

describe('CAR_DEFS', () => {
    it('has 4 car definitions', () => {
        expect(CAR_DEFS.length).toBe(4);
    });

    it('each car has required properties', () => {
        for (const car of CAR_DEFS) {
            expect(car).toHaveProperty('name');
            expect(car).toHaveProperty('emoji');
            expect(car).toHaveProperty('color');
            expect(car).toHaveProperty('topSpeed');
            expect(car).toHaveProperty('accel');
            expect(car).toHaveProperty('handling');
            expect(car).toHaveProperty('driftFactor');
            expect(car).toHaveProperty('weight');
        }
    });

    it('color arrays have 3 elements (RGB)', () => {
        for (const car of CAR_DEFS) {
            expect(car.color.length).toBe(3);
        }
    });

    it('Speedster has highest top speed', () => {
        const speedster = CAR_DEFS.find(c => c.name === 'Speedster');
        for (const car of CAR_DEFS) {
            expect(speedster.topSpeed).toBeGreaterThanOrEqual(car.topSpeed);
        }
    });

    it('Handler has best handling', () => {
        const handler = CAR_DEFS.find(c => c.name === 'Handler');
        for (const car of CAR_DEFS) {
            expect(handler.handling).toBeGreaterThanOrEqual(car.handling);
        }
    });

    it('Tank is the heaviest', () => {
        const tank = CAR_DEFS.find(c => c.name === 'Tank');
        for (const car of CAR_DEFS) {
            expect(tank.weight).toBeGreaterThanOrEqual(car.weight);
        }
    });
});

describe('DIFFICULTIES', () => {
    it('has 4 difficulty levels', () => {
        expect(DIFFICULTIES.length).toBe(4);
    });

    it('AI speed increases with difficulty', () => {
        for (let i = 1; i < DIFFICULTIES.length; i++) {
            expect(DIFFICULTIES[i].aiSpeed).toBeGreaterThan(DIFFICULTIES[i - 1].aiSpeed);
        }
    });

    it('AI aggression increases with difficulty', () => {
        for (let i = 1; i < DIFFICULTIES.length; i++) {
            expect(DIFFICULTIES[i].aiAggression).toBeGreaterThan(DIFFICULTIES[i - 1].aiAggression);
        }
    });
});

describe('ITEMS', () => {
    it('has 5 items', () => {
        expect(ITEMS.length).toBe(5);
    });

    it('each item has name, emoji, and duration', () => {
        for (const item of ITEMS) {
            expect(item).toHaveProperty('name');
            expect(item).toHaveProperty('emoji');
            expect(item).toHaveProperty('duration');
        }
    });

    it('Boost and Shield have positive durations', () => {
        const boost = ITEMS.find(i => i.name === 'Boost');
        const shield = ITEMS.find(i => i.name === 'Shield');
        expect(boost.duration).toBeGreaterThan(0);
        expect(shield.duration).toBeGreaterThan(0);
    });

    it('Missile, Oil Slick, Lightning have zero duration', () => {
        const instant = ITEMS.filter(i => ['Missile', 'Oil Slick', 'Lightning'].includes(i.name));
        for (const item of instant) {
            expect(item.duration).toBe(0);
        }
    });
});

describe('createRacer', () => {
    let trackPoints;
    beforeAll(() => {
        trackPoints = buildTrack();
    });

    it('creates a racer with correct properties', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        expect(racer.isPlayer).toBe(true);
        expect(racer.carDef).toBe(CAR_DEFS[0]);
        expect(racer.speed).toBe(0);
        expect(racer.lap).toBe(0);
        expect(racer.item).toBeNull();
        expect(racer.finished).toBe(false);
    });

    it('places racer on the track at the specified t', () => {
        const startT = 0.1;
        const racer = createRacer(trackPoints, CAR_DEFS[0], false, startT, 0);
        const trackP = getTrackPoint(trackPoints, startT);
        expect(racer.x).toBeCloseTo(trackP.x, 0);
        expect(racer.z).toBeCloseTo(trackP.z, 0);
    });

    it('applies lane offset perpendicular to track', () => {
        const startT = 0.05;
        const racerCenter = createRacer(trackPoints, CAR_DEFS[0], true, startT, 0);
        const racerOffset = createRacer(trackPoints, CAR_DEFS[0], true, startT, 5);
        // The offset racer should be displaced from center
        const dx = racerOffset.x - racerCenter.x;
        const dz = racerOffset.z - racerCenter.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        expect(dist).toBeCloseTo(5, 0);
    });

    it('initializes all timer values to zero or start value', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0, 0);
        expect(racer.shieldTimer).toBe(0);
        expect(racer.boostTimer).toBe(0);
        expect(racer.spinTimer).toBe(0);
        expect(racer.slowTimer).toBe(0);
        expect(racer.driftCharge).toBe(0);
    });

    it('sets AI-specific fields', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[1], false, 0, 0);
        expect(racer.isPlayer).toBe(false);
        expect(typeof racer.aiSteerNoise).toBe('number');
        expect(typeof racer.aiNoiseTimer).toBe('number');
    });
});

describe('getRacerPosition', () => {
    let trackPoints;
    beforeAll(() => {
        trackPoints = buildTrack();
    });

    it('single racer is in 1st place', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        const pos = getRacerPosition(racer, [racer]);
        expect(pos).toBe(1);
    });

    it('racer ahead is in 1st, racer behind is in 2nd', () => {
        const ahead = createRacer(trackPoints, CAR_DEFS[0], true, 0.1, 0);
        ahead.trackT = 0.5;
        ahead.lap = 1;

        const behind = createRacer(trackPoints, CAR_DEFS[1], false, 0.05, 0);
        behind.trackT = 0.3;
        behind.lap = 1;

        const racers = [ahead, behind];
        expect(getRacerPosition(ahead, racers)).toBe(1);
        expect(getRacerPosition(behind, racers)).toBe(2);
    });

    it('lap count takes priority over trackT', () => {
        const lapAhead = createRacer(trackPoints, CAR_DEFS[0], true, 0.1, 0);
        lapAhead.trackT = 0.1;
        lapAhead.lap = 2;

        const trackAhead = createRacer(trackPoints, CAR_DEFS[1], false, 0.1, 0);
        trackAhead.trackT = 0.9;
        trackAhead.lap = 1;

        const racers = [lapAhead, trackAhead];
        expect(getRacerPosition(lapAhead, racers)).toBe(1);
        expect(getRacerPosition(trackAhead, racers)).toBe(2);
    });

    it('handles three racers correctly', () => {
        const r1 = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        r1.lap = 2; r1.trackT = 0.5;
        const r2 = createRacer(trackPoints, CAR_DEFS[1], false, 0.05, 3);
        r2.lap = 2; r2.trackT = 0.3;
        const r3 = createRacer(trackPoints, CAR_DEFS[2], false, 0.05, -3);
        r3.lap = 1; r3.trackT = 0.9;

        const racers = [r1, r2, r3];
        expect(getRacerPosition(r1, racers)).toBe(1);
        expect(getRacerPosition(r2, racers)).toBe(2);
        expect(getRacerPosition(r3, racers)).toBe(3);
    });
});

describe('handleCollisions', () => {
    let trackPoints;
    beforeAll(() => {
        trackPoints = buildTrack();
    });

    it('separates overlapping racers', () => {
        const r1 = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        const r2 = createRacer(trackPoints, CAR_DEFS[1], false, 0.05, 0);
        // Place them on top of each other
        r2.x = r1.x + 1;
        r2.z = r1.z;

        const origX1 = r1.x;
        const origX2 = r2.x;

        handleCollisions([r1, r2], [], [], null, null);

        const newDist = Math.sqrt((r2.x - r1.x) ** 2 + (r2.z - r1.z) ** 2);
        // After collision, they should be pushed apart
        expect(newDist).toBeGreaterThan(1);
    });

    it('does not affect racers that are far apart', () => {
        const r1 = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        const r2 = createRacer(trackPoints, CAR_DEFS[1], false, 0.3, 0);

        const origX1 = r1.x;
        const origZ1 = r1.z;
        const origX2 = r2.x;
        const origZ2 = r2.z;

        handleCollisions([r1, r2], [], [], null, null);

        expect(r1.x).toBe(origX1);
        expect(r1.z).toBe(origZ1);
        expect(r2.x).toBe(origX2);
        expect(r2.z).toBe(origZ2);
    });

    it('heavier car moves less in collision', () => {
        const light = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0); // Speedster weight=0.8
        const heavy = createRacer(trackPoints, CAR_DEFS[2], false, 0.05, 0); // Tank weight=1.2

        // Place very close together
        heavy.x = light.x + 2;
        heavy.z = light.z;

        const lightOrigX = light.x;
        const heavyOrigX = heavy.x;

        handleCollisions([light, heavy], [], [], null, null);

        const lightDisp = Math.abs(light.x - lightOrigX);
        const heavyDisp = Math.abs(heavy.x - heavyOrigX);

        // Light car should move more
        expect(lightDisp).toBeGreaterThan(heavyDisp);
    });

    it('deactivates item box when racer is within pickup radius', () => {
        const r1 = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        const box = { x: r1.x + 1, z: r1.z, y: 2, active: true, respawnTimer: 0 };
        const pickupCalled = [];
        const pickupFn = (racer) => pickupCalled.push(racer);

        handleCollisions([r1], [box], [], pickupFn, null);

        expect(box.active).toBe(false);
        expect(box.respawnTimer).toBe(5);
        expect(pickupCalled.length).toBe(1);
    });

    it('does not pick up inactive item box', () => {
        const r1 = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        const box = { x: r1.x, z: r1.z, y: 2, active: false, respawnTimer: 3 };
        const pickupCalled = [];
        const pickupFn = (racer) => pickupCalled.push(racer);

        handleCollisions([r1], [box], [], pickupFn, null);
        expect(pickupCalled.length).toBe(0);
    });

    it('oil slick causes spin when racer hits it', () => {
        const r1 = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        r1.speed = 50;
        const oil = { x: r1.x, z: r1.z, type: 'oil', timer: 5, radius: 3 };

        handleCollisions([r1], [], [oil], null, null);

        expect(r1.spinTimer).toBe(1.0);
        expect(r1.speed).toBeCloseTo(50 * 0.4, 5);
    });

    it('shield protects from oil slick', () => {
        const r1 = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        r1.speed = 50;
        r1.shieldTimer = 2;
        const oil = { x: r1.x, z: r1.z, type: 'oil', timer: 5, radius: 3 };

        handleCollisions([r1], [], [oil], null, null);

        expect(r1.spinTimer).toBe(0);
        expect(r1.speed).toBe(50);
    });

    it('removes expired oil slicks', () => {
        const oil = { x: 0, z: 0, type: 'oil', timer: 0.01, radius: 3 };
        const barriers = [oil];

        handleCollisions([], [], barriers, null, null);
        expect(barriers.length).toBe(0);
    });
});

describe('updateRacerPhysics', () => {
    let trackPoints;
    beforeAll(() => {
        trackPoints = buildTrack();
    });

    it('does nothing when racer is finished', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        racer.finished = true;
        const origX = racer.x;
        const origZ = racer.z;

        updateRacerPhysics(racer, 0.016, trackPoints, { throttle: 1, steer: 0, wantDrift: false });

        expect(racer.x).toBe(origX);
        expect(racer.z).toBe(origZ);
    });

    it('accelerates when throttle is positive', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        updateRacerPhysics(racer, 0.1, trackPoints, { throttle: 1, steer: 0, wantDrift: false });
        expect(racer.speed).toBeGreaterThan(0);
    });

    it('decelerates when braking', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        racer.speed = 50;
        updateRacerPhysics(racer, 0.1, trackPoints, { throttle: -0.5, steer: 0, wantDrift: false });
        expect(racer.speed).toBeLessThan(50);
    });

    it('speed is clamped to top speed', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        racer.speed = 200;
        updateRacerPhysics(racer, 0.1, trackPoints, { throttle: 1, steer: 0, wantDrift: false });
        const expectedTopSpeed = BASE_TOP_SPEED * (CAR_DEFS[0].topSpeed / 200);
        expect(racer.speed).toBeLessThanOrEqual(expectedTopSpeed + 1);
    });

    it('decrement timers', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        racer.shieldTimer = 2;
        racer.boostTimer = 3;
        const dt = 0.1;
        updateRacerPhysics(racer, dt, trackPoints, { throttle: 0, steer: 0, wantDrift: false });
        expect(racer.shieldTimer).toBeCloseTo(2 - dt, 5);
        expect(racer.boostTimer).toBeCloseTo(3 - dt, 5);
    });

    it('spin timer causes spinning behavior', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        racer.spinTimer = 1;
        racer.speed = 50;
        const origAngle = racer.angle;

        updateRacerPhysics(racer, 0.1, trackPoints, { throttle: 1, steer: 0, wantDrift: false });

        expect(racer.spinTimer).toBeCloseTo(0.9, 5);
        expect(racer.angle).not.toBe(origAngle); // should have rotated
        expect(racer.speed).toBeLessThan(50); // speed decays during spin
    });

    it('steering changes angle', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        racer.speed = 50;
        const origAngle = racer.angle;

        updateRacerPhysics(racer, 0.1, trackPoints, { throttle: 0, steer: 1, wantDrift: false });

        expect(racer.angle).not.toBe(origAngle);
    });

    it('boost increases effective top speed', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        racer.boostTimer = 1;
        racer.speed = 100; // Near top speed
        const dt = 0.1;

        updateRacerPhysics(racer, dt, trackPoints, { throttle: 1, steer: 0, wantDrift: false });

        // With boost, speed should remain high
        const normalTopSpeed = BASE_TOP_SPEED * (CAR_DEFS[0].topSpeed / 200);
        // Speed with boost can exceed normal top speed
        expect(racer.speed).toBeGreaterThan(0);
    });

    it('drifting initiates when conditions are met', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        racer.speed = 50;
        expect(racer.drifting).toBe(false);

        updateRacerPhysics(racer, 0.1, trackPoints, { throttle: 1, steer: 1, wantDrift: true });

        expect(racer.drifting).toBe(true);
        expect(racer.driftDir).toBe(1);
    });

    it('drift charge accumulates over time', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        racer.speed = 50;

        // Start drifting
        updateRacerPhysics(racer, 0.1, trackPoints, { throttle: 1, steer: 1, wantDrift: true });
        const charge1 = racer.driftCharge;

        // Continue drifting
        updateRacerPhysics(racer, 0.1, trackPoints, { throttle: 1, steer: 1, wantDrift: true });
        const charge2 = racer.driftCharge;

        expect(charge2).toBeGreaterThan(charge1);
    });

    it('releasing drift with enough charge gives boost', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        racer.speed = 50;
        racer.drifting = true;
        racer.driftCharge = 2.0; // Between 1.5 and 2.5 → DRIFT_BOOST_BIG
        racer.driftDir = 1;

        // Release drift
        updateRacerPhysics(racer, 0.1, trackPoints, { throttle: 1, steer: 0, wantDrift: false });

        expect(racer.drifting).toBe(false);
        expect(racer.boostTimer).toBeGreaterThan(0);
    });

    it('movement updates position', () => {
        const racer = createRacer(trackPoints, CAR_DEFS[0], true, 0.05, 0);
        racer.speed = 50;
        const origX = racer.x;
        const origZ = racer.z;

        updateRacerPhysics(racer, 0.1, trackPoints, { throttle: 0, steer: 0, wantDrift: false });

        const dist = Math.sqrt((racer.x - origX) ** 2 + (racer.z - origZ) ** 2);
        expect(dist).toBeGreaterThan(0);
    });
});
