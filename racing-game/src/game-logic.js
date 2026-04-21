// ---- GAME LOGIC ----

import { clamp } from './math.js';
import { getTrackPoint, getTrackTangent, closestTrackT } from './track.js';

// ---- CONFIGURATION ----
export const CAR_DEFS = [
    { name: 'Speedster', emoji: '\u{1F3CE}', color: [1, 0.3, 0.3], topSpeed: 220, accel: 1.0, handling: 0.7, driftFactor: 0.8, weight: 0.8, desc: 'Fast top speed, light' },
    { name: 'Handler', emoji: '\u{1F699}', color: [0.3, 0.6, 1], topSpeed: 190, accel: 0.85, handling: 1.0, driftFactor: 1.0, weight: 0.9, desc: 'Great handling & drift' },
    { name: 'Tank', emoji: '\u{1F69A}', color: [0.3, 0.9, 0.4], topSpeed: 180, accel: 0.7, handling: 0.6, driftFactor: 0.6, weight: 1.2, desc: 'Heavy, hard to push' },
    { name: 'Balanced', emoji: '\u{1F697}', color: [1, 0.85, 0.2], topSpeed: 200, accel: 0.9, handling: 0.85, driftFactor: 0.9, weight: 1.0, desc: 'Well-rounded racer' },
];

export const DIFFICULTIES = [
    { name: 'Easy', aiSpeed: 0.75, aiHandling: 0.75, aiAggression: 0.3 },
    { name: 'Medium', aiSpeed: 0.88, aiHandling: 0.85, aiAggression: 0.6 },
    { name: 'Hard', aiSpeed: 0.97, aiHandling: 0.95, aiAggression: 0.85 },
    { name: 'Insane', aiSpeed: 1.08, aiHandling: 1.0, aiAggression: 1.0 },
];

export const ITEMS = [
    { name: 'Boost', emoji: '\u{1F680}', duration: 2.0 },
    { name: 'Missile', emoji: '\u{1F4A5}', duration: 0 },
    { name: 'Shield', emoji: '\u{1F6E1}', duration: 4.0 },
    { name: 'Oil Slick', emoji: '\u{1F4A7}', duration: 0 },
    { name: 'Lightning', emoji: '\u26A1', duration: 0 },
];

// ---- PHYSICS CONSTANTS ----
export const BASE_TOP_SPEED = 120;
export const BASE_ACCEL = 80;
export const BRAKE_FORCE = 120;
export const FRICTION_PER_SEC = 0.15;
export const TURN_SPEED = 2.8;
export const DRIFT_TURN_MULT = 1.6;
export const DRIFT_CHARGE_RATE = 1.0;
export const DRIFT_BOOST_SMALL = 1.4;
export const DRIFT_BOOST_BIG = 2.0;
export const DRIFT_BOOST_MEGA = 2.8;
export const DRIFT_LATERAL_FORCE = 0.35;
export const TRACK_HALF_WIDTH = 17;
export const OFF_ROAD_SLOW = 0.55;
export const BOOST_SPEED_MULT = 1.6;
export const COLLISION_RADIUS = 2.5;
export const ITEM_PICKUP_RADIUS = 4;

export function createRacer(trackPoints, carDef, isPlayer, startT, laneOffset) {
    const p = getTrackPoint(trackPoints, startT);
    const tan = getTrackTangent(trackPoints, startT);
    const norm = { x: -tan.z, z: tan.x };
    return {
        x: p.x + norm.x * laneOffset,
        z: p.z + norm.z * laneOffset,
        y: 0.3,
        angle: Math.atan2(tan.x, tan.z),
        speed: 0,
        lateralSpeed: 0,
        carDef: carDef,
        isPlayer: isPlayer,
        drifting: false,
        driftCharge: 0,
        driftDir: 0,
        lap: 0,
        trackT: startT,
        lastTrackT: startT,
        checkpointsPassed: 0,
        item: null,
        shieldTimer: 0,
        boostTimer: 0,
        spinTimer: 0,
        slowTimer: 0,
        finished: false,
        finishTime: 0,
        aiTargetT: startT,
        aiSteerNoise: 0,
        aiNoiseTimer: 0,
        aiItemTimer: 0,
    };
}

export function getRacerPosition(racer, racers) {
    let pos = 1;
    const myProgress = racer.lap + racer.trackT;
    for (const other of racers) {
        if (other === racer) continue;
        const otherProgress = other.lap + other.trackT;
        if (otherProgress > myProgress) pos++;
    }
    return pos;
}

export function getPositionSuffix(pos) {
    if (pos === 1) return 'st';
    if (pos === 2) return 'nd';
    if (pos === 3) return 'rd';
    return 'th';
}

export function handleCollisions(racers, itemBoxes, barriers, pickupItemFn, spawnParticleFn) {
    for (let i = 0; i < racers.length; i++) {
        for (let j = i + 1; j < racers.length; j++) {
            const a = racers[i], b = racers[j];
            const dx = b.x - a.x;
            const dz = b.z - a.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < COLLISION_RADIUS * 2 && dist > 0) {
                const overlap = COLLISION_RADIUS * 2 - dist;
                const nx = dx / dist, nz = dz / dist;
                const massA = a.carDef.weight;
                const massB = b.carDef.weight;
                const totalMass = massA + massB;

                a.x -= nx * overlap * (massB / totalMass);
                a.z -= nz * overlap * (massB / totalMass);
                b.x += nx * overlap * (massA / totalMass);
                b.z += nz * overlap * (massA / totalMass);

                const relSpeed = (a.speed - b.speed) * 0.3;
                a.speed -= relSpeed * (massB / totalMass);
                b.speed += relSpeed * (massA / totalMass);
            }
        }
    }

    // Item box pickups
    for (const racer of racers) {
        for (const box of itemBoxes) {
            if (!box.active) continue;
            const dx = box.x - racer.x;
            const dz = box.z - racer.z;
            if (dx * dx + dz * dz < ITEM_PICKUP_RADIUS * ITEM_PICKUP_RADIUS) {
                box.active = false;
                box.respawnTimer = 5;
                if (pickupItemFn) pickupItemFn(racer);
            }
        }
    }

    // Oil slick hazards
    for (let i = barriers.length - 1; i >= 0; i--) {
        const b = barriers[i];
        if (b.type !== 'oil') continue;
        b.timer -= 1 / 60;
        if (b.timer <= 0) { barriers.splice(i, 1); continue; }
        for (const racer of racers) {
            if (racer.spinTimer > 0 || racer.shieldTimer > 0) continue;
            const dx = b.x - racer.x;
            const dz = b.z - racer.z;
            if (dx * dx + dz * dz < b.radius * b.radius) {
                racer.spinTimer = 1.0;
                racer.speed *= 0.4;
            }
        }
    }
}

export function updateRacerPhysics(racer, dt, trackPoints, { throttle, steer, wantDrift }) {
    if (racer.finished) return;

    // Timers
    if (racer.shieldTimer > 0) racer.shieldTimer -= dt;
    if (racer.boostTimer > 0) racer.boostTimer -= dt;
    if (racer.spinTimer > 0) {
        racer.spinTimer -= dt;
        racer.angle += 8 * dt;
        racer.speed *= 0.95;
        return;
    }
    if (racer.slowTimer > 0) {
        racer.slowTimer -= dt;
    }

    const def = racer.carDef;
    const topSpeed = BASE_TOP_SPEED * (def.topSpeed / 200);
    const accel = BASE_ACCEL * def.accel;
    const handling = TURN_SPEED * def.handling;

    // Speed
    let effectiveTopSpeed = topSpeed;
    if (racer.boostTimer > 0) effectiveTopSpeed *= BOOST_SPEED_MULT;
    if (racer.slowTimer > 0) effectiveTopSpeed *= 0.5;

    const trackInfo = closestTrackT(trackPoints, racer.x, racer.z);
    racer.trackT = trackInfo.t;
    const isOffRoad = trackInfo.dist > TRACK_HALF_WIDTH;
    if (isOffRoad) effectiveTopSpeed *= OFF_ROAD_SLOW;

    if (throttle > 0) {
        racer.speed += accel * throttle * dt;
    } else if (throttle < 0) {
        racer.speed += BRAKE_FORCE * throttle * dt;
    }
    racer.speed *= (1.0 - FRICTION_PER_SEC * dt);
    racer.speed = clamp(racer.speed, -20, effectiveTopSpeed);

    // Steering
    const speedFactor = clamp(Math.abs(racer.speed) / 30, 0.3, 1);
    let turnRate = handling * speedFactor;

    // Drift
    if (wantDrift && Math.abs(racer.speed) > 20 && Math.abs(steer) > 0.1) {
        if (!racer.drifting) {
            racer.drifting = true;
            racer.driftDir = steer > 0 ? 1 : -1;
            racer.driftCharge = 0;
        }
        turnRate *= DRIFT_TURN_MULT * def.driftFactor;
        racer.driftCharge += DRIFT_CHARGE_RATE * dt;
        racer.lateralSpeed = racer.driftDir * DRIFT_LATERAL_FORCE * racer.speed;
    } else {
        if (racer.drifting) {
            let boostAmount = 0;
            if (racer.driftCharge >= 2.5) boostAmount = DRIFT_BOOST_MEGA;
            else if (racer.driftCharge >= 1.5) boostAmount = DRIFT_BOOST_BIG;
            else if (racer.driftCharge >= 0.5) boostAmount = DRIFT_BOOST_SMALL;

            if (boostAmount > 0) {
                racer.boostTimer = boostAmount * 0.5;
            }
            racer.drifting = false;
            racer.driftCharge = 0;
        }
        racer.lateralSpeed *= 0.9;
    }

    racer.angle += steer * turnRate * dt;

    // Movement
    const moveX = Math.sin(racer.angle) * racer.speed * dt;
    const moveZ = Math.cos(racer.angle) * racer.speed * dt;
    const latX = Math.cos(racer.angle) * racer.lateralSpeed * dt;
    const latZ = -Math.sin(racer.angle) * racer.lateralSpeed * dt;

    racer.x += moveX + latX;
    racer.z += moveZ + latZ;
}
