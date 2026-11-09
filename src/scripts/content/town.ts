/**
 * Parcel van town layout, as data.
 *
 * Streets run on a simple grid. Buildings line the streets, each with an
 * address marker where parcels are dropped off. The depot sits on the south
 * edge, which is where every shift starts. Keeping this as plain data is what
 * lets the game code stay a list of installers.
 */

/** One city block's building, positioned and sized in meters. */
export type BuildingDef = {
    /** Address label shown on the drop off marker. */
    name: string;
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    color: number;
    /** Where the van stops to deliver: a curb spot near the door. */
    drop: [number, number];
};

/** Half the town's extent in meters. */
export const TOWN_SIZE = 64;

/** Street width, curb to curb. */
export const STREET_WIDTH = 7;

/** The depot: every parcel run starts here. */
export const DEPOT = { x: 0, z: 46 } as const;

/** The buildings, in delivery order groups. */
export const BUILDINGS: BuildingDef[] = [
    { name: 'Bakery', x: -22, z: -18, w: 10, d: 8, h: 5, color: 0xd9a05b, drop: [-14, -14] },
    { name: 'Clinic', x: 22, z: -20, w: 9, d: 9, h: 6, color: 0xe8e4da, drop: [14, -16] },
    { name: 'School', x: -24, z: 6, w: 12, d: 7, h: 5, color: 0x9fb2c8, drop: [-14, 4] },
    { name: 'Cafe', x: 24, z: 4, w: 8, d: 8, h: 4, color: 0xb5793f, drop: [14, 2] },
    { name: 'Library', x: -8, z: -26, w: 9, d: 8, h: 6, color: 0x8a93a6, drop: [-6, -14] },
    { name: 'Grocer', x: 10, z: -8, w: 9, d: 7, h: 4, color: 0x6f8f6a, drop: [7, -13] },
    { name: 'Barber', x: -12, z: 22, w: 7, d: 7, h: 4, color: 0xc45bd9, drop: [-8, 14] },
    { name: 'Flats', x: 14, z: 24, w: 11, d: 9, h: 8, color: 0x7d848e, drop: [10, 14] },
];

/** Scattered trees and parked props, purely decorative. */
export const TREES: Array<[number, number]> = [
    [-4, -4], [6, 14], [-18, -6], [28, 16], [-30, 30], [32, -32], [-34, -30], [4, 34], [30, 34], [-6, 38],
];

/** Delivery orders for one shift, in queue order. Times are seconds. */
export const SHIFT_ORDERS: Array<{ to: string; reward: number; time: number; label: string }> = [
    { to: 'Bakery', reward: 20, time: 70, label: 'bread crate' },
    { to: 'Grocer', reward: 25, time: 80, label: 'veg box' },
    { to: 'School', reward: 35, time: 90, label: 'books' },
    { to: 'Cafe', reward: 30, time: 85, label: 'coffee sacks' },
    { to: 'Flats', reward: 40, time: 95, label: 'flat-pack' },
    { to: 'Clinic', reward: 50, time: 100, label: 'medicine' },
    { to: 'Library', reward: 45, time: 100, label: 'returns' },
    { to: 'Barber', reward: 30, time: 90, label: 'towels' },
];
