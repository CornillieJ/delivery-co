import * as THREE from 'three';

import { SYSTEM_ORDER } from '../core/systems';
import { TopDownController, type TopDownOptions } from '../controls/top-down';
import { Weapon, type WeaponOptions } from '../game/weapon';
import { setupActionGame, createAndStart, type ActionGameOptions, type ActionGameWorld } from './action-game';
import type { Player } from '../game/player';

/**
 * Twin stick shooter on top of the top-down template.
 *
 * The character moves with WASD and aims at the mouse, shooting flat along the
 * ground rather than along the camera, which is what makes a top-down shooter
 * feel right. The character always faces where it aims.
 */
export type TwinStickGameOptions = ActionGameOptions & {
    controls?: TopDownOptions;
    weapon?: WeaponOptions | false;
    /** Height the shots leave the player at, in meters above the feet. */
    muzzleHeight?: number;
};

export type TwinStickWorld = ActionGameWorld & {
    controls: TopDownController;
    /** Direction the player is currently aiming, flat on the ground. */
    aimDirection: (out?: THREE.Vector3) => THREE.Vector3;
};

/** Configure an existing game as a twin stick shooter. */
export function setupTwinStickGame(game: Game, options: TwinStickGameOptions = {}): TwinStickWorld {
    const muzzleHeight = options.muzzleHeight ?? 0.9;
    const aimScratch = new THREE.Vector3();

    const world = setupActionGame(
        game,
        (hub: Game, player: Player) =>
            new TopDownController(hub, player, {
                height: 18,
                pitch: -Math.PI / 2.35,
                rotateWithMouse: false,
                jumpEnabled: false,
                // The character turns to face the mouse, not the movement direction.
                faceDirection: false,
                ...options.controls,
            }),
        { ...options, weapon: false },
    );

    const player = world.player;
    const controller = world.controls as TopDownController;

    function aimDirection(out = aimScratch): THREE.Vector3 {
        controller.aimAtScreenPoint(game.input.mouse.ndc, out);
        return out.sub(player.position).setY(0).normalize();
    }

    game.systems.add({
        name: 'twin-stick-aim',
        order: SYSTEM_ORDER.CONTROL + 1,
        update: () => {
            if (player.isDead) return;
            const direction = aimDirection();
            if (direction.lengthSq() < 1e-6) return;
            player.root.rotation.y = Math.atan2(direction.x, direction.z);
        },
    });

    if (options.weapon !== false) {
        world.weapon = new Weapon(game, {
            spread: 0.02,
            automatic: true,
            fireRate: 6,
            damage: 24,
            color: 0xffd166,
            recoil: 0.06,
            onAmmoChange: (magazine, reserve) => game.hud.setAmmo(magazine ?? 0, reserve),
            origin: () => player.position.clone().setY(player.position.y + muzzleHeight),
            direction: () => {
                const point = controller.aimAtScreenPoint(game.input.mouse.ndc, new THREE.Vector3());
                return point.sub(player.position).setY(0).normalize();
            },
            ...options.weapon,
        });
        game.hud.setAmmo(world.weapon.magazine ?? 0, world.weapon.reserve);
    }

    game.world = world;
    if (options.build) void options.build(world);
    return { ...world, controls: controller, aimDirection };
}

/** Create the game, set it up as a twin stick shooter and start it. */
export async function createTwinStickGame(options: TwinStickGameOptions = {}): Promise<{ game: Game; world: TwinStickWorld }> {
    return createAndStart(options.game ?? {}, (game) => setupTwinStickGame(game, options));
}
