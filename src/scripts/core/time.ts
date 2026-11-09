import * as THREE from 'three';

/**
 * Frame timing.
 *
 * `Time` owns the running clock, the time scale and a fixed-step accumulator.
 * The loop calls `time.advance(rawDelta)` once per frame and then drains
 * `time.stepFixed(...)` so physics always sees identical steps.
 */
export class Time {
    /** Seconds since boot, already scaled by `scale`. */
    elapsed = 0;
    /** Seconds since boot, unaffected by `scale`. */
    realElapsed = 0;
    /** Scaled delta of the last frame in seconds. */
    delta = 0;
    /** Unscaled delta of the last frame in seconds, capped to avoid tunnelling after a tab switch. */
    rawDelta = 0;
    /** Number of completed frames. */
    frame = 0;
    /** Multiplier applied to every delta. Use 0.2 for slow motion, 0 to freeze gameplay. */
    scale = 1;
    /** Hard cap on a single frame delta in seconds. */
    maxDelta = 0.25;

    private accumulator = 0;
    private lastStep = 1 / 60;
    private readonly clock = new THREE.Clock();

    /**
     * Advance the clock by the raw delta reported by the renderer.
     * Call once per frame at the top of the loop.
     */
    advance(rawDelta?: number): number {
        const measured = rawDelta ?? this.clock.getDelta();
        this.rawDelta = Math.min(measured, this.maxDelta);
        this.delta = this.rawDelta * this.scale;
        this.elapsed += this.delta;
        this.realElapsed += this.rawDelta;
        this.frame += 1;
        return this.delta;
    }

    /**
     * Drain the accumulator and invoke `run` once per fixed step.
     * @param step Fixed step size in seconds, e.g. 1/60.
     * @param maxSubSteps Upper bound per frame; extra backlog is dropped.
     * @param run Callback receiving the fixed step size.
     * @returns How many steps ran this frame.
     */
    stepFixed(step: number, maxSubSteps: number, run: (step: number) => void): number {
        this.lastStep = step;
        this.accumulator += this.delta;
        let steps = 0;
        while (this.accumulator >= step && steps < maxSubSteps) {
            run(step);
            this.accumulator -= step;
            steps += 1;
        }
        if (steps === maxSubSteps && this.accumulator >= step) {
            // The machine cannot keep up, drop the backlog instead of growing it forever.
            this.accumulator = 0;
        }
        return steps;
    }

    /** Seconds of unsimulated time left in the accumulator. */
    get fixedRemainder(): number {
        return this.accumulator;
    }

    /**
     * Fraction of the last fixed step still waiting to be simulated, in 0..1.
     * Multiply by a rigid body's velocity to render it interpolated.
     */
    get alpha(): number {
        return this.lastStep > 0 ? Math.min(this.accumulator / this.lastStep, 1) : 0;
    }

    /** Reset the clock and accumulator, e.g. after loading a level. */
    reset(): void {
        this.accumulator = 0;
        this.elapsed = 0;
        this.realElapsed = 0;
        this.delta = 0;
        this.rawDelta = 0;
        this.frame = 0;
        this.clock.getDelta();
    }
}
