/**
 * Self-check for the fixed-step loop:  npm test
 * Stubs rAF/performance so the clock is deterministic.
 */
import assert from 'node:assert/strict';
import { startLoop } from './loop.ts';

type Cb = (t: number) => void;
let pending: Cb | null = null;
let now = 0;

(globalThis as any).performance = { now: () => now };
(globalThis as any).requestAnimationFrame = (cb: Cb) => ((pending = cb), 1);
(globalThis as any).cancelAnimationFrame = () => (pending = null);

/** Advance the fake clock by `ms` and deliver one frame. */
const frame = (ms: number) => {
  now += ms;
  pending?.(now);
};

let updates = 0;
let alpha = -1;
const stop = startLoop(60, () => updates++, (a) => (alpha = a));

// 55ms at 60Hz => 3 whole steps, remainder left for interpolation.
// (Deliberately off a step boundary: 50ms lands near one and float error there
// makes the count 2 or 3 depending on rounding, which tests nothing useful.
// Also kept under the 5-step catch-up cap, which this case is not about.)
frame(55);
assert.equal(updates, 3, `expected 3 updates, got ${updates}`);
assert.ok(alpha >= 0 && alpha < 1, `alpha out of [0,1): ${alpha}`);

// No drift: 120 frames of 16ms = 1.92s of wall time => ~115 steps.
updates = 0;
for (let i = 0; i < 120; i++) frame(16);
assert.ok(Math.abs(updates - 115) <= 1, `drifted: ${updates} updates over 1.92s`);

// A 10s stall must not run 600 updates; catch-up caps at 5.
updates = 0;
frame(10_000);
assert.equal(updates, 5, `stall should cap at 5 updates, got ${updates}`);

// The dropped debt must not resurface on the next frame.
updates = 0;
frame(1);
assert.equal(updates, 0, `debt should be dropped, got ${updates} updates`);

stop();
assert.equal(pending, null, 'stop() should cancel the pending frame');

console.log('loop.test.ts: ok');
