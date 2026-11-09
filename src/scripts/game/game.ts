import * as THREE from 'three';

import { createGame, startGame } from '../init';
import { addResource, addScene, addTouchControls } from '../kit';
import { BlockBuilder } from '../helpers/build';
import { createLabel } from '../helpers/text';
import { Player } from '../game/player';
import { DeliveryManager } from '../game/delivery';
import { groups, LAYER } from '../physics/layers';
import { VehicleBody } from '../physics/vehicle';
import { VehicleController } from '../controls/vehicle';
import { setupGameFlow, type GameFlow } from '../core/game-state';
import { SYSTEM_ORDER } from '../core/systems';
import { BUILDINGS, DEPOT, SHIFT_ORDERS, TOWN_SIZE, TREES } from '../content/town';

/**
 * Parcel van: a cozy delivery shift.
 *
 * Drive the van from the depot to each address before the timer runs out. The
 * whole game is template blocks: a `VehicleBody` for the van, a parked
 * invisible `Player` so the `DeliveryManager` distance checks read the van's
 * position, a `Resource` for the till, and the flow for the menu and the
 * shift report. The only game code here is the town and the scoring.
 */
export async function boot(): Promise<void> {
    const game = await createGame({ stats: true, exposeDebug: true });
    addScene(game, { preset: 'outdoor-day', groundSize: TOWN_SIZE * 2.6, groundColor: 0x6f7f66 });

    buildTown(game);

    //#region The van and its driver

    // The delivery manager checks distances against `game.player`, so an
    // invisible, frozen player capsule is parked at the van's bumper. The same
    // trick carries the light cycle in the Tron template.
    const player = new Player(game, { position: new THREE.Vector3(DEPOT.x, 0.4, DEPOT.z), object: new THREE.Group() });
    player.frozen = true;
    game.player = player;
    // The parked capsule rides inside the van's chassis; they must not collide.
    player.body.body.collider.setCollisionGroups(groups(LAYER.PLAYER, LAYER.WORLD));

    const van = buildVan();
    for (const wheel of van.wheels) game.scene.add(wheel);
    const vehicle = new VehicleBody(game, {
        position: { x: DEPOT.x, y: 0, z: DEPOT.z - 5 },
        yaw: 0,
        object: van.root,
        engineForce: 2400,
        brakeForce: 80,
        tag: 'van',
    });
    const controls = new VehicleController(game, vehicle, { distance: 8.5, height: 3.6 });

    const wheelSpin = [0, 0, 0, 0];
    game.systems.add({
        name: 'van-carry',
        order: SYSTEM_ORDER.CONTROL - 1,
        update: (delta) => {
            player.body.teleport(vehicle.position);
            for (let index = 0; index < 4; index += 1) {
                const mesh = van.wheels[index];
                const position = vehicle.wheelWorldPosition(index);
                if (!mesh || !position) continue;
                mesh.position.copy(position);
                wheelSpin[index] = (wheelSpin[index] ?? 0) + (vehicle.speed / 0.34) * delta;
                mesh.rotation.set(wheelSpin[index] ?? 0, vehicle.yaw + (index < 2 ? vehicle.wheelSteering(index) : 0), 0, 'YXZ');
            }
        },
    });

    addTouchControls(game, { buttons: [{ action: 'jump', label: '⛔', primary: true, hold: true }] });

    //#endregion The van and its driver

    //#region The shift

    const till = addResource(game, { id: 'money', label: 'Money', initial: 0, format: (v) => `$${v}` });
    const shift = { delivered: 0, expired: 0, startedAt: 0 };

    const deliveries = new DeliveryManager(game, {
        capacity: 3,
        radius: 3.4,
        onDelivered: (_hub, _order, total) => {
            shift.delivered += 1;
            till.set(total);
        },
        onExpired: () => {
            shift.expired += 1;
            game.toasts.push('Customer cancelled', { color: '#ff9a9a' });
        },
        onAllDelivered: () => game.events.emit('level:complete', { id: 'shift' }),
    });

    function queueShift(): void {
        shift.startedAt = game.time.elapsed;
        for (const order of SHIFT_ORDERS) {
            const target = BUILDINGS.find((building) => building.name === order.to);
            if (!target) continue;
            deliveries.addOrder({
                pickup: new THREE.Vector3(DEPOT.x, 0.5, DEPOT.z),
                dropoff: new THREE.Vector3(target.drop[0], 0.5, target.drop[1]),
                reward: order.reward,
                timeLimit: order.time,
                label: `${order.label} → ${order.to}`,
            });
        }
    }

    //#endregion The shift

    //#region HUD and flow

    game.hud.setCombatCountersVisible(false);
    game.hud.setCrosshair(false, false);
    game.systems.add({
        name: 'shift-hud',
        order: SYSTEM_ORDER.UI - 1,
        update: () => {
            game.hud.setStat('speed', `${Math.round(vehicle.speedKmh)} km/h`, 'speed');
            game.hud.setStat('parcels', `${deliveries.carrying}/${deliveries.capacity}`, 'van');
            const left = SHIFT_ORDERS.length - shift.delivered - shift.expired;
            if (left > 0) game.hud.setStat('left', `${left}`, 'left');
        },
    });

    const flow: GameFlow = setupGameFlow(game, {
        title: 'Parcel van',
        subtitle: 'Eight deliveries, one shift',
        autoStart: false,
        pointerLock: false,
        hudWhen: ['playing', 'paused', 'victory'],
        crosshairWhen: [],
        onStart: () => {
            queueShift();
        },
        onRestart: () => {
            deliveries.clear();
            till.set(0);
            shift.delivered = 0;
            shift.expired = 0;
            vehicle.teleport({ x: DEPOT.x, y: 0, z: DEPOT.z - 5 }, 0);
            queueShift();
        },
        onVictory: () => {
            const seconds = game.time.elapsed - shift.startedAt;
            const total = SHIFT_ORDERS.reduce((sum, order) => sum + order.reward, 0);
            game.hud.setObjective(`Shift done: $${till.value()} of $${total}, ${shift.expired} missed, ${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`);
        },
    });

    game.world = { vehicle, controls, deliveries, till, flow };
    startGame(game);
}

//#region Town building

/** Streets, buildings with name boards, the depot and the trees. */
function buildTown(game: Game): void {
    const builder = new BlockBuilder(game);

    // Asphalt: a north-south and an east-west main street, plus a ring road.
    const asphalt = 0x3c4048;
    const road = (x: number, z: number, w: number, d: number): void => {
        builder.box({ position: { x, y: 0.03, z }, size: { x: w, y: 0.06, z: d }, color: asphalt, tag: 'road', physics: 'none' });
    };
    road(0, 0, 8, TOWN_SIZE * 2);
    road(0, 0, TOWN_SIZE * 2, 8);
    const ring = TOWN_SIZE - 8;
    road(0, -ring, TOWN_SIZE * 2, 6);
    road(0, ring, TOWN_SIZE * 2, 6);
    road(-ring, 0, 6, TOWN_SIZE * 2);
    road(ring, 0, 6, TOWN_SIZE * 2);

    for (const building of BUILDINGS) {
        builder.box({
            position: { x: building.x, y: building.h / 2, z: building.z },
            size: { x: building.w, y: building.h, z: building.d },
            color: building.color,
            tag: 'building',
        });
        // A flat roof cap, so blocks read as buildings from the van's height.
        builder.box({
            position: { x: building.x, y: building.h + 0.25, z: building.z },
            size: { x: building.w + 0.6, y: 0.5, z: building.d + 0.6 },
            color: 0x4a4f58,
            tag: 'building',
        });

        const board = createLabel(building.name, { fontSize: 0.6, color: 0xffffff, outlineWidth: 0.05, outlineColor: 0x1c1f26 });
        board.position.set(building.x, building.h + 1.1, building.z);
        game.scene.add(board);
        game.systems.add({
            name: `board-${building.name}`,
            order: SYSTEM_ORDER.EFFECTS,
            lateUpdate: () => board.quaternion.copy(game.camera.quaternion),
        });
    }

    // The depot: a warehouse with a loading dock and a sign.
    builder.box({ position: { x: DEPOT.x, y: 3, z: DEPOT.z + 7 }, size: { x: 16, y: 6, z: 8 }, color: 0x8a6f4d, tag: 'building' });
    builder.box({ position: { x: DEPOT.x, y: 6.35, z: DEPOT.z + 7 }, size: { x: 17, y: 0.7, z: 9 }, color: 0x4a4f58, tag: 'building' });
    const depotSign = createLabel('DEPOT', { fontSize: 0.9, color: 0xffd166, outlineWidth: 0.06, outlineColor: 0x1c1f26 });
    depotSign.position.set(DEPOT.x, 7.8, DEPOT.z + 7);
    game.scene.add(depotSign);
    game.systems.add({
        name: 'board-depot',
        order: SYSTEM_ORDER.EFFECTS,
        lateUpdate: () => depotSign.quaternion.copy(game.camera.quaternion),
    });

    for (const [x, z] of TREES) {
        builder.cylinder(0.24, 1.6, { position: { x, y: 0.8, z }, color: 0x7a5b3f, tag: 'tree' });
        builder.sphere(1.5, { position: { x, y: 2.6, z }, color: 0x4f7a45, tag: 'tree' });
    }
}

//#endregion Town building

//#region The van

/** A grey-box delivery van: a cab, a cargo box and four wheel meshes. */
function buildVan(): { root: THREE.Group; wheels: THREE.Mesh[] } {
    const root = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color: 0xe07b39, roughness: 0.5, metalness: 0.1 });
    const panel = new THREE.MeshStandardMaterial({ color: 0xece8dc, roughness: 0.7 });

    const cargo = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, 1.9), panel);
    cargo.position.set(0, 0.3, 0.55);
    cargo.castShadow = true;
    root.add(cargo);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.85, 1.3), paint);
    cab.position.set(0, 0.08, -1.0);
    cab.castShadow = true;
    root.add(cab);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 0.06), new THREE.MeshStandardMaterial({ color: 0x9fd4e8, roughness: 0.1, metalness: 0.4 }));
    windshield.position.set(0, 0.28, -1.62);
    windshield.rotation.x = 0.25;
    root.add(windshield);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.22, 1.94), paint);
    stripe.position.set(0, 0.34, 0.55);
    root.add(stripe);

    const wheelGeometry = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 14);
    wheelGeometry.rotateZ(Math.PI / 2);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1c1f26, roughness: 0.9 });
    const wheels: THREE.Mesh[] = [];
    for (let index = 0; index < 4; index += 1) {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.castShadow = true;
        wheel.name = `wheel-${index}`;
        wheels.push(wheel);
    }
    return { root, wheels };
}

//#endregion The van
