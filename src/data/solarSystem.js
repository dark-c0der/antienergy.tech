// Published mean orbital elements (J2000-era) used as a transparent fallback
// when a live Horizons state vector is unavailable. Distances are AU, periods days.
export const solarSystemBodies = [
  { id: 'sun', name: 'Sun', type: 'star', parent: null, radiusKm: 696340, periodDays: null, color: 0xffc96b, description: 'The star at the centre of our planetary system.', a: 0, e: 0, period: 1, phase: 0, source: 'NASA/JPL Solar System Dynamics' },
  { id: 'mercury', name: 'Mercury', type: 'planet', parent: 'sun', radiusKm: 2439.7, periodDays: 87.969, color: 0xb9a998, a: 0.3871, e: 0.2056, period: 87.969, phase: 174, description: 'The innermost planet and the smallest of the eight.', source: 'JPL approximate orbital elements' },
  { id: 'venus', name: 'Venus', type: 'planet', parent: 'sun', radiusKm: 6051.8, periodDays: 224.701, color: 0xd7a66a, a: 0.7233, e: 0.0068, period: 224.701, phase: 50, description: 'A cloud-shrouded terrestrial world with a dense atmosphere.', source: 'JPL approximate orbital elements' },
  { id: 'earth', name: 'Earth', type: 'planet', parent: 'sun', radiusKm: 6371, periodDays: 365.256, color: 0x5e9fca, a: 1, e: 0.0167, period: 365.256, phase: 100, description: 'Our home world, shown relative to the Sun.', source: 'JPL approximate orbital elements' },
  { id: 'mars', name: 'Mars', type: 'planet', parent: 'sun', radiusKm: 3389.5, periodDays: 686.98, color: 0xb9674a, a: 1.5237, e: 0.0934, period: 686.98, phase: 250, description: 'The red planet, home to the largest known volcano in the Solar System.', source: 'JPL approximate orbital elements' },
  { id: 'jupiter', name: 'Jupiter', type: 'planet', parent: 'sun', radiusKm: 69911, periodDays: 4332.59, color: 0xd0a579, a: 5.2028, e: 0.0489, period: 4332.59, phase: 30, description: 'The largest planet, with a powerful magnetosphere and many moons.', source: 'JPL approximate orbital elements' },
  { id: 'saturn', name: 'Saturn', type: 'planet', parent: 'sun', radiusKm: 58232, periodDays: 10759.22, color: 0xd9bf8c, a: 9.5388, e: 0.0565, period: 10759.22, phase: 190, description: 'A gas giant surrounded by a complex, bright ring system.', source: 'JPL approximate orbital elements' },
  { id: 'uranus', name: 'Uranus', type: 'planet', parent: 'sun', radiusKm: 25362, periodDays: 30688.5, color: 0x8bc4c4, a: 19.1914, e: 0.0463, period: 30688.5, phase: 280, description: 'An ice giant rotating on its side.', source: 'JPL approximate orbital elements' },
  { id: 'neptune', name: 'Neptune', type: 'planet', parent: 'sun', radiusKm: 24622, periodDays: 60182, color: 0x5378c9, a: 30.0611, e: 0.0086, period: 60182, phase: 310, description: 'The farthest recognized planet in the Solar System.', source: 'JPL approximate orbital elements' },
  { id: 'pluto', name: 'Pluto', type: 'dwarf', parent: 'sun', radiusKm: 1188.3, periodDays: 90560, color: 0xa99179, a: 39.482, e: 0.2488, period: 90560, phase: 20, description: 'A dwarf planet in the Kuiper Belt.', source: 'JPL Small-Body Database / approximate elements' },
  { id: 'ceres', name: 'Ceres', type: 'dwarf', parent: 'sun', radiusKm: 469.7, periodDays: 1680, color: 0x8e8a84, a: 2.7675, e: 0.0758, period: 1680, phase: 140, description: 'The largest object in the asteroid belt and a dwarf planet.', source: 'JPL Small-Body Database / approximate elements' }
];

export const bodyById = new Map(solarSystemBodies.map((body) => [body.id, body]));

export function formatRadius(km) {
  if (!km) return 'Unavailable';
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: km < 10000 ? 1 : 0 }).format(km)} km`;
}
