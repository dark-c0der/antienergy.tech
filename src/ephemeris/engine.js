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
  return { x: xOrbital * Math.cos(orientation) - yOrbital * Math.sin(orientation), y: 0, z: xOrbital * Math.sin(orientation) + yOrbital * Math.cos(orientation) };
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
