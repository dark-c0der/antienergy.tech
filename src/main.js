import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { solarSystemBodies, bodyById, formatRadius } from './data/solarSystem.js';
import { loadJplMoons } from './data/moons.js';
import { exoplanets } from './data/exoplanets.js';
import { positionFor, distanceAu, formatAu } from './ephemeris/engine.js';

const state = { date: new Date('2025-01-01T00:00:00Z'), selectedId: 'earth', category: 'planets', playing: false, speed: 1, scale: 'true', showOrbits: true, showLabels: true };
let moons = [];
const elements = {
  scene: document.getElementById('scene'),
  objectList: document.getElementById('object-list'),
  bodySearch: document.getElementById('body-search'),
  detailName: document.getElementById('detail-name'),
  detailType: document.getElementById('detail-type'),
  detailDescription: document.getElementById('detail-description'),
  detailParent: document.getElementById('detail-parent'),
  detailRadius: document.getElementById('detail-radius'),
  detailDistance: document.getElementById('detail-distance'),
  detailPeriod: document.getElementById('detail-period'),
  detailX: document.getElementById('detail-x'),
  detailY: document.getElementById('detail-y'),
  detailZ: document.getElementById('detail-z'),
  detailSource: document.getElementById('detail-source'),
  detailCoverage: document.getElementById('detail-coverage'),
  simulationDate: document.getElementById('simulation-date'),
  timeSlider: document.getElementById('time-slider'),
  playToggle: document.getElementById('play-toggle'),
  dataStatus: document.getElementById('data-status'),
  scaleIndicator: document.getElementById('scale-indicator'),
  scaleBar: document.getElementById('scale-bar'),
  scaleBarLabel: document.getElementById('scale-bar-label'),
  frameIndicator: document.getElementById('frame-indicator'),
  catalogueGrid: document.getElementById('catalogue-grid'),
  exoplanetGrid: document.getElementById('exoplanet-grid'),
  exoplanetSearch: document.getElementById('exoplanet-search'),
  exoplanetCount: document.getElementById('exoplanet-count'),
  objectCount: document.getElementById('object-count'),
  sceneLoading: document.getElementById('scene-loading'),
  toast: document.getElementById('toast')
};

let scene, camera, renderer, controls;
let sceneResizeObserver;
let followedPosition;
const bodyMeshes = new Map();
const orbitLines = new Map();
const labelSprites = new Map();
const selectionMarkers = new Map();
const axialRotationHours = {
  sun: 648,
  mercury: 1407.6,
  venus: -5832.5,
  earth: 23.934,
  mars: 24.623,
  jupiter: 9.925,
  saturn: 10.656,
  uranus: -17.24,
  neptune: 16.11,
  pluto: 153.3,
};
let previousFrameTime = performance.now();
const textureLoader = new THREE.TextureLoader();
const sunGroup = new THREE.Group();
const textureUrls = {
  sun: 'https://threejs.org/examples/textures/planets/sun.jpg',
  mercury: 'https://threejs.org/examples/textures/planets/mercury.jpg',
  venus: 'https://threejs.org/examples/textures/planets/venus.jpg',
  earth: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
  mars: 'https://threejs.org/examples/textures/planets/mars_1k_color.jpg',
  jupiter: 'https://threejs.org/examples/textures/planets/jupiter.jpg',
  saturn: 'https://threejs.org/examples/textures/planets/saturn.jpg',
  uranus: 'https://threejs.org/examples/textures/planets/uranus.jpg',
  neptune: 'https://threejs.org/examples/textures/planets/neptune.jpg',
  moon: 'https://threejs.org/examples/textures/planets/moon_1024.jpg'
};
const AU_KM = 149597870.7;
const TRUE_SCALE_DIVISOR = 0.5;
const EARTH_RADIUS_KM = 6371;

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);
  camera = new THREE.PerspectiveCamera(45, elements.scene.clientWidth / elements.scene.clientHeight, 0.0000001, 3000);
  camera.position.set(0, 70, 90);
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(elements.scene.clientWidth, elements.scene.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  elements.scene.append(renderer.domElement);
  sceneResizeObserver = new ResizeObserver(resize);
  sceneResizeObserver.observe(elements.scene);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.zoomToCursor = true;
  controls.zoomSpeed = 1;
  controls.rotateSpeed = 0.7;
  controls.panSpeed = 0.7;
  controls.minDistance = 0;
  controls.maxDistance = Infinity;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  controls.addEventListener('change', refreshIdentification);
  scene.add(new THREE.AmbientLight(0x7986a8, 0.55));
  scene.add(new THREE.HemisphereLight(0x9ebcff, 0x080b12, 0.42));
  const light = new THREE.PointLight(0xffdfaa, 4, 0, 1.5); scene.add(light);
  scene.add(sunGroup);
  addStars();
  solarSystemBodies.forEach((body) => addBody(body));
  moons.forEach((body) => addBody(body));
  updateScene();
  elements.sceneLoading?.remove();
  window.addEventListener('resize', resize);
  renderer.domElement.addEventListener('click', onSceneClick);
  renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
  animate();
}

function addStars() {
  const positions = new Float32Array(1800 * 3);
  for (let i = 0; i < positions.length; i += 3) {
    const radius = 400 + Math.random() * 800; const theta = Math.random() * Math.PI * 2; const phi = Math.acos(2 * Math.random() - 1);
    positions[i] = radius * Math.sin(phi) * Math.cos(theta); positions[i + 1] = radius * Math.cos(phi); positions[i + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x8fa1c8, size: 0.55, transparent: true, opacity: 0.7 })));
}

function visualRadius(body) {
  if (state.scale === 'true') {
    if (Number.isFinite(body.radiusKm)) return body.radiusKm / AU_KM / TRUE_SCALE_DIVISOR;
    return body.type === 'moon' ? 0.0001 : body.radiusKm / 696340 * 10;
  }
  if (body.type === 'star') return 5.5;
  if (Number.isFinite(body.radiusKm)) return Math.max(body.type === 'moon' ? 0.025 : 0.08, body.radiusKm / EARTH_RADIUS_KM * 0.55);
  return 0.025;
}

function scenePosition(position) {
  const divisor = state.scale === 'true' ? TRUE_SCALE_DIVISOR : 0.38;
  return new THREE.Vector3(position.x / divisor, position.y / divisor, position.z / divisor);
}

function addBody(body) {
  const baseRadius = visualRadius(body);
  const geometry = new THREE.SphereGeometry(baseRadius, body.type === 'star' ? 48 : 32, body.type === 'star' ? 48 : 32);
  const material = new THREE.MeshStandardMaterial({
    color: body.color,
    emissive: body.type === 'star' ? body.color : 0x000000,
    emissiveIntensity: body.type === 'star' ? 0.8 : 0,
    roughness: body.type === 'star' ? 0.7 : 0.9,
    metalness: 0,
    transparent: false,
    opacity: 1,
    alphaTest: 0,
    depthWrite: true,
    depthTest: true
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.bodyId = body.id;
  mesh.userData.baseRadius = baseRadius;
  bodyMeshes.set(body.id, mesh);
  scene.add(mesh);
  applySurfaceMaterial(body, material);
  if (body.type === 'star') sunGroup.add(mesh);
  if (body.id === 'uranus') mesh.rotation.z = THREE.MathUtils.degToRad(82.2);
  if (body.id === 'saturn') addSaturnRings(mesh);
  const orbit = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: body.color, transparent: true, opacity: 0.28 }));
  orbitLines.set(body.id, orbit); scene.add(orbit);
  const label = body.type === 'moon' ? null : makeLabel(body.name, body.id === 'earth' || body.id === 'mars');
  labelSprites.set(body.id, label);
  if (label) scene.add(label);
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(1, 1.18, 32),
    new THREE.MeshBasicMaterial({ color: 0x9fc5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthTest: false })
  );
  marker.visible = false;
  marker.material.color.set(body.id === 'earth' ? 0x6bc7ff : body.id === 'mars' ? 0xff927d : 0x9fc5ff);
  marker.userData.bodyId = body.id;
  selectionMarkers.set(body.id, marker);
  scene.add(marker);
}

function applySurfaceMaterial(body, material) {
  const textureUrl = textureUrls[body.id] ?? (body.type === 'moon' && body.name === 'Moon' ? textureUrls.moon : null);
  if (!textureUrl) return;
  textureLoader.load(textureUrl, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    material.map = texture;
    material.transparent = false;
    material.opacity = 1;
    material.alphaTest = 0;
    material.depthWrite = true;
    material.depthTest = true;
    if (body.type === 'star') material.emissiveMap = texture;
    material.needsUpdate = true;
  }, undefined, () => {});
}

function addSaturnRings(mesh) {
  const ringGeometry = new THREE.RingGeometry(visualRadius(bodyById.get('saturn')) * 1.35, visualRadius(bodyById.get('saturn')) * 2.25, 96);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xbda879, side: THREE.DoubleSide, transparent: true, opacity: 0.72 });
  const rings = new THREE.Mesh(ringGeometry, ringMaterial);
  rings.rotation.x = Math.PI / 2;
  rings.userData.bodyId = 'saturn-rings';
  mesh.add(rings);
}

function makeLabel(text, emphasis = false) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
  const context = canvas.getContext('2d');
  context.font = `${emphasis ? 700 : 600} 22px Manrope`;
  context.fillStyle = emphasis ? 'rgba(31, 67, 106, 0.94)' : 'rgba(5, 10, 20, 0.82)';
  context.roundRect(4, 8, 248, 46, 12);
  context.fill();
  context.fillStyle = emphasis ? '#ffffff' : '#e6efff';
  context.fillText(text, 14, 40);
  const texture = new THREE.CanvasTexture(canvas); const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(9, 2.25, 1); return sprite;
}

function updateScene() {
  [...solarSystemBodies, ...moons].forEach((body) => {
    const mesh = bodyMeshes.get(body.id); const pos = positionFor(body, state.date); const vector = scenePosition(pos);
    mesh.position.copy(vector);
    mesh.scale.setScalar(visualRadius(body) / mesh.userData.baseRadius);
    const label = labelSprites.get(body.id);
    const radius = visualRadius(body);
    const cameraDistance = camera.position.distanceTo(vector);
    const labelSize = state.scale === 'true' ? Math.max(cameraDistance * 0.02, 0.00000001) : 9;
    if (label) {
      label.scale.set(labelSize * 4, labelSize, 1);
      const labelOffset = new THREE.Vector3(0, radius + labelSize * 0.7, 0);
      const labelLanes = {
        mercury: [-2.6, 2.3],
        venus: [-2.6, 1.1],
        earth: [-2.6, 0],
        mars: [2.6, -1.1],
        jupiter: [2.6, -2.3],
        saturn: [2.6, 1.1],
        uranus: [2.6, 2.3],
        neptune: [2.6, 3.5],
      };
      if (labelLanes[body.id]) {
        labelOffset.x += labelSize * labelLanes[body.id][0];
        labelOffset.y += labelSize * labelLanes[body.id][1];
      }
      label.position.copy(vector).add(labelOffset);
      label.visible = state.showLabels;
    }
    const marker = selectionMarkers.get(body.id);
    marker.position.copy(vector);
    marker.quaternion.copy(camera.quaternion);
    const markerSize = Math.max(radius * 2.4, labelSize * 0.008);
    marker.scale.set(markerSize, markerSize, markerSize);
    marker.visible = body.type === 'planet' || body.id === state.selectedId;
    const line = orbitLines.get(body.id); line.visible = state.showOrbits && body.id !== 'sun'; const points = [];
    for (let index = 0; index <= 96; index += 1) {
      const sample = new Date(state.date.getTime() + (index / 96) * (body.period ?? body.periodDays ?? 365) * 86400000); points.push(scenePosition(positionFor(body, sample)));
    }
    line.geometry.dispose(); line.geometry = new THREE.BufferGeometry().setFromPoints(points);
  });
  const selectedBody = bodyById.get(state.selectedId) ?? moons.find((moon) => moon.id === state.selectedId);
  const followBody = selectedBody?.type === 'moon' ? bodyById.get(selectedBody.parent) : selectedBody;
  const followedMesh = followBody ? bodyMeshes.get(followBody.id) : bodyMeshes.get(state.selectedId);
  if (followedMesh) {
    if (state.playing && followedPosition) {
      const delta = followedMesh.position.clone().sub(followedPosition);
      camera.position.add(delta);
      controls.target.add(delta);
    }
    followedPosition = followedMesh.position.clone();
  }
  updateDetails();
}

function renderObjectList() {
  const query = elements.bodySearch.value.trim().toLowerCase();
  const source = state.category === 'moons' ? moons : solarSystemBodies.filter((body) => state.category === 'dwarf' ? body.type === 'dwarf' : body.type === 'planet');
  const filtered = source.filter((item) => item.name.toLowerCase().includes(query));
  elements.objectList.innerHTML = filtered.map((body) => `<button class="object-row ${body.id === state.selectedId ? 'selected' : ''}" data-id="${body.id}" role="option"><span class="object-swatch" style="--object-color:#${new THREE.Color(body.color ?? 0xbcc7e4).getHexString()}"></span><span><strong>${body.name}</strong><small>${body.type === 'moon' ? `Moon of ${body.parent}` : body.type}</small></span><span class="row-arrow">›</span></button>`).join('') || '<p class="empty-state">No catalogue entries match.</p>';
  elements.objectList.querySelectorAll('[data-id]').forEach((button) => button.addEventListener('click', () => selectBody(button.dataset.id)));
  elements.objectCount.textContent = String(filtered.length);
}

function selectBody(id) {
  state.selectedId = id; const body = bodyById.get(id) ?? moons.find((moon) => moon.id === id); if (!body) return;
  if (body.type === 'moon') state.category = 'moons';
  renderObjectList(); updateDetails(); focusBody(body);
}

function updateDetails() {
  const body = bodyById.get(state.selectedId) ?? moons.find((moon) => moon.id === state.selectedId); if (!body) return;
  const parent = body.parent ? (bodyById.get(body.parent)?.name ?? body.parent) : '—'; const pos = body.type === 'moon' ? positionFor(bodyById.get(body.parent), state.date) : positionFor(body, state.date);
  elements.detailName.textContent = body.name; elements.detailType.textContent = body.type.toUpperCase(); elements.detailDescription.textContent = body.description ?? `${body.name}, a source-catalogued planetary satellite.`;
  elements.detailParent.textContent = parent; elements.detailRadius.textContent = formatRadius(body.radiusKm); elements.detailDistance.textContent = body.type === 'moon' ? `${body.a ? (body.a * 149597870.7).toFixed(0) : '—'} km from ${parent}` : formatAu(distanceAu(pos)); elements.detailPeriod.textContent = body.periodDays ? `${body.periodDays.toLocaleString()} days` : '—';
  elements.detailX.textContent = pos.x.toFixed(4); elements.detailY.textContent = pos.y.toFixed(4); elements.detailZ.textContent = pos.z.toFixed(4); elements.detailSource.textContent = body.source ?? 'JPL Solar System Dynamics'; elements.detailCoverage.textContent = body.type === 'moon' ? `Catalogue designation: ${body.designation}. Ephemeris availability varies by requested date.` : 'J2000-era orbital-element fallback; live Horizons access is attempted where supported.';
}

function focusBody(body) {
  if (!body) return;
  const mesh = bodyMeshes.get(body.id) ?? bodyMeshes.get(body.parent); if (!mesh) return;
  const parentBody = body.type === 'moon' ? bodyById.get(body.parent) : body;
  const parentMesh = parentBody ? bodyMeshes.get(parentBody.id) : mesh;
  const center = parentMesh?.position.clone() ?? mesh.position.clone();
  const localBodies = body.type === 'star' ? [] : [...moons].filter((moon) => moon.parent === parentBody?.id);
  const localPositions = localBodies.map((moon) => bodyMeshes.get(moon.id)?.position).filter(Boolean);
  const localExtent = localPositions.reduce((extent, position) => Math.max(extent, position.distanceTo(center)), 0);
  const radiusExtent = Math.max(visualRadius(parentBody ?? body), visualRadius(body));
  const framingExtent = Math.max(localExtent, radiusExtent * 8, 0.00000002);
  controls.target.copy(center);
  const distance = Math.max(framingExtent * 2.2, 0.00000008);
  const viewDirection = center.clone().normalize();
  if (viewDirection.lengthSq() < 0.000001) viewDirection.set(0, 0.55, 1);
  else viewDirection.y = viewDirection.y >= 0 ? Math.max(viewDirection.y, 0.55) : Math.min(viewDirection.y, -0.55);
  viewDirection.normalize();
  camera.position.copy(center).sub(viewDirection.multiplyScalar(distance));
  camera.near = Math.max(distance / 10000000, 0.000000000001);
  camera.far = 3000;
  camera.updateProjectionMatrix();
  controls.minDistance = 0;
  controls.maxDistance = Infinity;
  controls.update();
  followedPosition = (parentMesh ?? mesh).position.clone();
  refreshIdentification();
}

function onSceneClick(event) {
  const rect = renderer.domElement.getBoundingClientRect(); const pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects([...bodyMeshes.values()])[0]; if (hit?.object.userData.bodyId) selectBody(hit.object.userData.bodyId);
}

function resize() {
  if (!renderer) return;
  const width = Math.max(1, Math.round(elements.scene.clientWidth));
  const height = Math.max(1, Math.round(elements.scene.clientHeight));
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
function refreshIdentification() {
  [...solarSystemBodies, ...moons].forEach((body) => {
    const mesh = bodyMeshes.get(body.id);
    const label = labelSprites.get(body.id);
    const marker = selectionMarkers.get(body.id);
    if (!mesh || !label || !marker) return;
    const radius = visualRadius(body);
    const cameraDistance = camera.position.distanceTo(mesh.position);
    const labelSize = state.scale === 'true' ? Math.max(cameraDistance * 0.02, 0.00000001) : 9;
    label.scale.set(labelSize * 4, labelSize, 1);
    const labelOffset = new THREE.Vector3(0, radius + labelSize * 0.7, 0);
    const labelLanes = {
      mercury: [-2.6, 2.3],
      venus: [-2.6, 1.1],
      earth: [-2.6, 0],
      mars: [2.6, -1.1],
      jupiter: [2.6, -2.3],
      saturn: [2.6, 1.1],
      uranus: [2.6, 2.3],
      neptune: [2.6, 3.5],
    };
    if (labelLanes[body.id]) {
      labelOffset.x += labelSize * labelLanes[body.id][0];
      labelOffset.y += labelSize * labelLanes[body.id][1];
    }
    label.position.copy(mesh.position).add(labelOffset);
    label.visible = state.showLabels && (body.type !== 'moon' || body.id === state.selectedId);
    marker.position.copy(mesh.position);
    marker.quaternion.copy(camera.quaternion);
    const markerSize = Math.max(radius * 2.4, labelSize * 0.008);
    marker.scale.set(markerSize, markerSize, markerSize);
    marker.visible = body.type === 'planet' || body.id === state.selectedId;
  });
}
function updateCameraRange() {
  if (!camera || !controls) return;
  const distance = camera.position.distanceTo(controls.target);
  controls.rotateSpeed = 0.7;
  controls.panSpeed = THREE.MathUtils.clamp(distance / 18, 0.08, 0.7);
  const near = Math.max(distance / 10000000, 0.000000000001);
  const far = Math.max(distance * 100, 3000);
  if (Math.abs(camera.near - near) > near * 0.01 || Math.abs(camera.far - far) > far * 0.01) {
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
  }
}
function updateScaleBar() {
  if (!camera || !controls || !elements.scaleBar || !elements.scaleBarLabel) return;
  const distance = camera.position.distanceTo(controls.target);
  const divisor = state.scale === 'true' ? TRUE_SCALE_DIVISOR : 0.38;
  const targetAu = Math.max(distance * divisor * 0.22, 0.000000001);
  const exponent = Math.floor(Math.log10(targetAu));
  const base = targetAu / (10 ** exponent);
  const nice = base >= 5 ? 5 : base >= 2 ? 2 : 1;
  const scaleAu = nice * (10 ** exponent);
  const width = THREE.MathUtils.clamp((scaleAu / (distance * divisor)) * 360, 42, 150);
  elements.scaleBar.style.width = `${width}px`;
  elements.scaleBarLabel.textContent = `${scaleAu >= 0.01 ? scaleAu.toFixed(scaleAu < 1 ? 3 : 1).replace(/\.?0+$/, '') : scaleAu.toExponential(1)} AU`;
}
function spinBodies(deltaSeconds) {
  [...solarSystemBodies, ...moons].forEach((body) => {
    const mesh = bodyMeshes.get(body.id);
    if (!mesh) return;
    const periodHours = axialRotationHours[body.id] ?? Math.max(8, Math.min(96, Math.abs(body.periodDays ?? 24) * 24));
    const direction = Math.sign(periodHours) || 1;
    const periodSeconds = Math.max(Math.abs(periodHours) * 3600, 1);
    mesh.rotation.y += direction * (Math.PI * 2 / periodSeconds) * deltaSeconds * 2400;
  });
}
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const deltaSeconds = Math.min((now - previousFrameTime) / 1000, 0.1);
  previousFrameTime = now;
  spinBodies(deltaSeconds);
  if (state.playing) { state.date = new Date(state.date.getTime() + state.speed * deltaSeconds * 86400000); syncClock(); updateScene(); }
  controls?.update(); updateCameraRange(); updateScaleBar(); renderer?.render(scene, camera);
}
function syncClock() { elements.simulationDate.textContent = state.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase() + ' · ' + state.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'; elements.timeSlider.value = String(Math.round((state.date.getTime() - Date.parse('2025-01-01T00:00:00Z')) / 86400000)); }
function showToast(message) { elements.toast.textContent = message; elements.toast.classList.add('visible'); setTimeout(() => elements.toast.classList.remove('visible'), 3600); }

function renderCatalogue() {
  const all = [...solarSystemBodies, ...moons]; elements.catalogueGrid.innerHTML = all.map((body) => `<article class="catalogue-card"><div class="catalogue-card-top"><span class="object-swatch large" style="--object-color:#${new THREE.Color(body.color ?? 0xbcc7e4).getHexString()}"></span><span class="type-badge">${body.type}</span></div><h2>${body.name}</h2><p>${body.description ?? `Satellite of ${bodyById.get(body.parent)?.name ?? body.parent}.`}</p><dl><div><dt>Radius</dt><dd>${formatRadius(body.radiusKm)}</dd></div><div><dt>Period</dt><dd>${body.periodDays ? `${body.periodDays} d` : '—'}</dd></div></dl><button class="card-link" data-id="${body.id}">Inspect in explorer ↗</button></article>`).join(''); elements.catalogueGrid.querySelectorAll('[data-id]').forEach((button) => button.addEventListener('click', () => { switchView('explorer'); selectBody(button.dataset.id); }));
}

function renderExoplanets() {
  const query = elements.exoplanetSearch.value.trim().toLowerCase(); const result = exoplanets.filter((planet) => `${planet.name} ${planet.host}`.toLowerCase().includes(query)); elements.exoplanetCount.textContent = `${result.length} of ${exoplanets.length} sample entries`; elements.exoplanetGrid.innerHTML = result.map((planet) => `<article class="exo-card"><div class="exo-card-top"><span class="exo-orbit">✦</span><span class="type-badge confirmed">${planet.status}</span></div><h2>${planet.name}</h2><p>Host star · ${planet.host}</p><div class="exo-stats"><span><small>Period</small><strong>${planet.period} d</strong></span><span><small>Radius</small><strong>${planet.radius ? `${planet.radius} R⊕` : 'Unavailable'}</strong></span><span><small>Mass</small><strong>${planet.mass ? `${planet.mass} M⊕` : 'Unavailable'}</strong></span><span><small>Distance</small><strong>${planet.distance} pc</strong></span></div><footer><span>${planet.method}</span><span>${planet.discovery}</span></footer></article>`).join('') || '<p class="empty-state">No exoplanets match this search.</p>';
}

function switchView(view) { document.querySelectorAll('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${view}`)); document.querySelectorAll('.nav-button').forEach((button) => button.classList.toggle('active', button.dataset.view === view)); }

function bindUi() {
  document.querySelectorAll('.nav-button').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
  document.querySelectorAll('.object-tab').forEach((button) => button.addEventListener('click', () => { state.category = button.dataset.category; document.querySelectorAll('.object-tab').forEach((tab) => tab.classList.toggle('active', tab === button)); renderObjectList(); }));
  elements.bodySearch.addEventListener('input', renderObjectList); elements.exoplanetSearch.addEventListener('input', renderExoplanets);
  elements.playToggle.addEventListener('click', () => { state.playing = !state.playing; elements.playToggle.textContent = state.playing ? 'Ⅱ' : '▶'; elements.playToggle.classList.toggle('playing', state.playing); });
  document.getElementById('step-back').addEventListener('click', () => { state.date = new Date(state.date.getTime() - 86400000); syncClock(); updateScene(); }); document.getElementById('step-forward').addEventListener('click', () => { state.date = new Date(state.date.getTime() + 86400000); syncClock(); updateScene(); });
  document.getElementById('jump-now').addEventListener('click', () => { state.date = new Date(); syncClock(); updateScene(); showToast('Simulation clock set to the current UTC date.'); });
  elements.timeSlider.addEventListener('input', () => { state.date = new Date(Date.parse('2025-01-01T00:00:00Z') + Number(elements.timeSlider.value) * 86400000); syncClock(); updateScene(); });
  document.getElementById('speed-select').addEventListener('change', (event) => { state.speed = Number(event.target.value); }); document.getElementById('orbit-toggle').addEventListener('change', (event) => { state.showOrbits = event.target.checked; updateScene(); }); document.getElementById('label-toggle').addEventListener('change', (event) => { state.showLabels = event.target.checked; updateScene(); });
  document.getElementById('scale-select').addEventListener('change', (event) => { state.scale = event.target.value; elements.scaleIndicator.textContent = state.scale === 'true' ? 'TRUE SCALE' : 'EXPLORATION SCALE'; updateScene(); });
  document.getElementById('reset-camera').addEventListener('click', () => {
    camera.position.set(0, 70, 90);
    camera.near = 0.0000001;
    camera.far = 3000;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.minDistance = 0;
    controls.maxDistance = Infinity;
    controls.update();
    refreshIdentification();
  });
  document.getElementById('focus-selected').addEventListener('click', () => focusBody(bodyById.get(state.selectedId) ?? moons.find((moon) => moon.id === state.selectedId)));
  document.getElementById('open-moon-view').addEventListener('click', () => showToast('Local-system view is available for catalogue-supported moons; select a moon to inspect its parent system.'));
}

async function start() {
  elements.dataStatus.textContent = 'Loading JPL satellite catalogue';
  moons = await loadJplMoons();
  initScene();
  bindUi();
  renderObjectList();
  renderCatalogue();
  renderExoplanets();
  syncClock();
  elements.dataStatus.textContent = `${moons.length} bundled records · JPL snapshot`;
  setTimeout(() => showToast(`${moons.length} bundled JPL satellite records loaded. JPL's current summary lists 461 planetary satellites including Earth's Moon; this bundled snapshot is not a live count.`), 900);
}

start();
