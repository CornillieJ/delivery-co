import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { SYSTEM_ORDER } from '../core/systems';

/**
 * Mouse driven orbit camera, straight from the three.js addons.
 *
 * Not a gameplay controller: use it for level previews, main menu dioramas and
 * board games where the player inspects a scene instead of walking in it.
 */
export type OrbitOptions = {
    /** Point the camera orbits around. */
    target?: THREE.Vector3 | Vec3;
    minDistance?: number;
    maxDistance?: number;
    /** Slow automatic spin, good for a menu backdrop. */
    autoRotate?: boolean;
    autoRotateSpeed?: number;
    /** Inertia after releasing the mouse. */
    enableDamping?: boolean;
    dampingFactor?: number;
    minPolarAngle?: number;
    maxPolarAngle?: number;
    enablePan?: boolean;
    /** Pan parallel to the screen instead of across the ground. */
    screenSpacePanning?: boolean;
    /** Ignore input, e.g. while a menu is open. */
    enabled?: boolean;
    /** Distance from the target when the controller starts. */
    distance?: number;
};

export class OrbitController {
    readonly controls: OrbitControls;

    private readonly game: Game;
    private readonly detach: () => void;

    constructor(game: Game, options: OrbitOptions = {}) {
        this.game = game;
        this.controls = new OrbitControls(game.camera, game.canvas);
        guardPointerCapture(game.canvas);
        this.controls.enableDamping = options.enableDamping ?? true;
        this.controls.dampingFactor = options.dampingFactor ?? 0.08;
        this.controls.minDistance = options.minDistance ?? 2;
        this.controls.maxDistance = options.maxDistance ?? 60;
        this.controls.maxPolarAngle = options.maxPolarAngle ?? Math.PI / 2.05;
        if (options.minPolarAngle !== undefined) this.controls.minPolarAngle = options.minPolarAngle;
        this.controls.enablePan = options.enablePan ?? true;
        this.controls.screenSpacePanning = options.screenSpacePanning ?? true;
        this.controls.autoRotate = options.autoRotate ?? false;
        this.controls.autoRotateSpeed = options.autoRotateSpeed ?? 0.6;
        this.controls.enabled = options.enabled ?? true;

        if (options.target) this.controls.target.set(options.target.x, options.target.y, options.target.z);
        if (options.distance !== undefined) {
            const direction = game.camera.position.clone().sub(this.controls.target).normalize();
            game.camera.position.copy(this.controls.target).addScaledVector(direction, options.distance);
        }
        this.controls.update();

        const unregister = game.systems.add({
            name: 'orbit-controls',
            order: SYSTEM_ORDER.CAMERA,
            lateUpdate: () => this.controls.update(),
        });
        this.detach = () => unregister();
    }

    /** Turn the controller on or off, e.g. from a menu. */
    setEnabled(enabled: boolean): void {
        this.controls.enabled = enabled;
        this.game.systems.setEnabled('orbit-controls', enabled);
    }

    /** Move the orbit centre. */
    setTarget(target: THREE.Vector3 | Vec3): void {
        this.controls.target.set(target.x, target.y, target.z);
        this.controls.update();
    }

    /** Frame a point at a given distance, e.g. when a board game loads. */
    focus(target: THREE.Vector3 | Vec3, distance?: number): void {
        this.setTarget(target);
        if (distance === undefined) return;
        const direction = this.game.camera.position.clone().sub(this.controls.target).normalize();
        this.game.camera.position.copy(this.controls.target).addScaledVector(direction, distance);
        this.controls.update();
    }

    dispose(): void {
        this.detach();
        this.controls.dispose();
    }
}

/**
 * OrbitControls captures the pointer on every pointerdown without a guard, and
 * the capture call throws when the browser has already forgotten that pointer:
 * a synthetic event from a test, or a real one whose up fired before the down
 * was processed. Swallowing that one error keeps the drag working.
 */
function guardPointerCapture(element: HTMLElement): void {
    const original = element.setPointerCapture;
    if (!original || (element as unknown as Record<string, unknown>).__captureGuarded) return;
    (element as unknown as Record<string, unknown>).__captureGuarded = true;
    element.setPointerCapture = (pointerId: number): void => {
        try {
            original.call(element, pointerId);
        } catch {
            // Stale pointer: the drag works without the capture.
        }
    };
}
