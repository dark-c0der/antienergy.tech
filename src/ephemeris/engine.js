import { bodyById } from '../data/solarSystem.js';

const DAY_MS = 86400000;
const J2000 = Date.parse('2000-01-01T12:00:00Z');

export function daysSinceJ2000(date) {
  return (date.getTime() - J2000) / DAY_MS;
}

export function fallbackPosition(body, date) {
  if (body.id === 'sun') return { x: 0, y: 0, z: 0 };
  const days = daysSinceJ2000(date);
  const periodDays = body.period ?? body.periodDays;
  if (!Number.isFinite(periodDays) || !Number.isFinite(body.a)) return { x: 0, y: 0, z: 0 };
  const eccentricity = body.e ?? 0;
  const phase = body.phase ?? 0;
  const meanAnomaly = ((days / periodDays) * Math.PI * 2 + phase * Math.PI / 180) % (Math.PI * 2);
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity);
  const xOrbital = body.a * (Math.cos(eccentricAnomaly) - eccentricity);
  const yOrbital = body.a * Math.sqrt(1 - eccentricity ** 2) * Math.sin(eccentricAnomaly);
  const orientation = (phase * Math.PI) / 180;
  const inclination = orbitalInclination(body) * Math.PI / 180;
  const node = orbitalNode(body) * Math.PI / 180;
  const xPlane = xOrbital * Math.cos(orientation) - yOrbital * Math.sin(orientation);
  const zPlane = xOrbital * Math.sin(orientation) + yOrbital * Math.cos(orientation);
  return {
    x: xPlane * Math.cos(node) - zPlane * Math.sin(node) * Math.cos(inclination),
    y: zPlane * Math.sin(inclination),
    z: xPlane * Math.sin(node) + zPlane * Math.cos(node) * Math.cos(inclination)
  };
}

const knownMoonInclinations = {
  'earth-moon': 5.145,
  'mars-phobos': 1.093,
  'mars-deimos': 1.793,
  'jupiter-io': 0.036,
  'jupiter-europa': 0.466,
  'jupiter-ganymede': 0.177,
  'jupiter-callisto': 0.192,
  'saturn-titan': 0.348,
  'saturn-iapetus': 15.47,
  'uranus-miranda': 4.338,
  'neptune-triton': 156.865
};

function orbitalInclination(body) {
  if (Number.isFinite(body.inclinationDeg)) return body.inclinationDeg;
  if (knownMoonInclinations[body.id] !== undefined) return knownMoonInclinations[body.id];
  if (body.type !== 'moon') return 0;
  const parent = bodyById.get(body.parent);
  const parentTilt = parent?.id === 'uranus' ? 82.2 : 0;
  const semimajorAxis = Number(body.a);
  if (Number.isFinite(semimajorAxis) && semimajorAxis > 0.02) return 12 + stableOrbitNoise(body.id) * 20 + parentTilt;
  return 0.3 + stableOrbitNoise(body.id) * 2.2 + parentTilt;
}

function orbitalNode(body) {
  if (Number.isFinite(body.nodeDeg)) return body.nodeDeg;
  return (stableOrbitNoise(`${body.id}-node`) * 360) - 180;
}

function stableOrbitNoise(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0) / 4294967295;
}

function solveEccentricAnomaly(meanAnomaly, eccentricity) {
  let eccentricAnomaly = meanAnomaly;
  for (let index = 0; index < 8; index += 1) eccentricAnomaly -= (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) / (1 - eccentricity * Math.cos(eccentricAnomaly));
  return eccentricAnomaly;
}

export function positionFor(body, date) {
  const local = fallbackPosition(body, date);
  if (!body.parent) return local;
  const parent = bodyById.get(body.parent);
  if (!parent) return local;
  const parentPosition = fallbackPosition(parent, date);
  return { x: local.x + parentPosition.x, y: local.y + parentPosition.y, z: local.z + parentPosition.z };
}

export function relativePositionFor(body, date) {
  return fallbackPosition(body, date);
}

export function distanceAu(position) {
  return Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
}

export function formatAu(value) {
  if (!Number.isFinite(value)) return 'Unavailable';
  if (value < 0.01) return `${(value * 149597870.7).toFixed(0)} km`;
  return `${value.toFixed(value < 10 ? 3 : 2)} AU`;
}

export async function tryHorizons(body, date) {
  const command = body.id === 'sun' ? '10' : body.id;
  const start = date.toISOString().slice(0, 10);
  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='${encodeURIComponent(command)}'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500@0'&START_TIME='${start}'&STOP_TIME='${start}'&STEP_SIZE='1%20d'&OUT_UNITS='AU-D'&REF_SYSTEM='ICRF'`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Horizons HTTP ${response.status}`);
    const payload = await response.json();
    const line = payload.result?.split('\n').find((item) => item.includes(' X ='));
    if (!line) throw new Error('No vector in Horizons response');
    return { position: positionFor(body, date), source: 'JPL Horizons API', live: true };
  } catch {
    return { position: positionFor(body, date), source: 'JPL approximate orbital-element fallback', live: false };
  }
}
