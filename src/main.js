import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ============================================================
// CONFIGURATION
// ============================================================

const MODEL_PATH = '/assets/models/rc_f1.glb';

const MAX_SPEED = 10;
const MAX_ACCELERATION = 16;
const MAX_BRAKING = 12;
const STEERING_SPEED = 7;

const TRAIL_POINT_SPACING = 0.08;
const MAX_TRAIL_POINTS = 12000;

const NORMAL_PARTICLE_COUNT = 300;
const LAUNCH_PARTICLE_COUNT = 450;

const LAUNCH_DURATION = 4.5;
const LAUNCH_ACCELERATION = 28;
const LAUNCH_MAX_SPEED = 40;

const INTRO_PROGRESS_DURATION = 5.2;
const CAMERA_CINEMATIC_DURATION = 1.8;
const SHRED_DURATION = 2.7;
const ENDING_FADE_DURATION = 0.85;

// Infinite background settings
const TECH_CELL_SIZE = 8;
const TECH_RADIUS = 5;
const TECH_GENERATION_INTERVAL = 0.18;
const TECH_LINE_HEIGHT = -0.035;

const clock = new THREE.Clock();

// ============================================================
// DOM
// ============================================================

const container = document.getElementById('scene-container');

if (!container) {
	throw new Error('APEX: Missing #scene-container.');
}

const centerMessage = document.querySelector('.center-message');
const launchPrompt = document.querySelector('.launch-prompt');
const signalLost = document.querySelector('.signal-lost');
const loadingElement = document.querySelector('.loading');
const progressPanel = document.getElementById('intro-progress');
const progressFill = document.getElementById('progress-fill');
const progressValue = document.getElementById('progress-value');
const progressLabel = document.getElementById('progress-label');
const welcomeScreen = document.getElementById('welcome-screen');
const welcomeTitle = document.getElementById('welcome-title');

// ============================================================
// SCENE
// ============================================================

const BACKGROUND_COLOR = 0x020304;

const scene = new THREE.Scene();

scene.background = new THREE.Color(BACKGROUND_COLOR);
scene.fog = new THREE.FogExp2(BACKGROUND_COLOR, 0.003);

const camera = new THREE.PerspectiveCamera(
	45,
	window.innerWidth / window.innerHeight,
	0.1,
	2000
);

camera.position.set(0, 7, 13);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
	antialias: true,
	alpha: false,
	powerPreference: 'high-performance'
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

container.appendChild(renderer.domElement);

// ============================================================
// FINAL BLACK SCREEN OVERLAY
// ============================================================

const endingOverlay = document.createElement('div');

endingOverlay.style.position = 'fixed';
endingOverlay.style.inset = '0';
endingOverlay.style.background = '#000';
endingOverlay.style.opacity = '0';
endingOverlay.style.pointerEvents = 'none';
endingOverlay.style.zIndex = '99999';
endingOverlay.style.transition = 'none';

document.body.appendChild(endingOverlay);

// ============================================================
// LIGHTING
// ============================================================

scene.add(new THREE.AmbientLight(0xffffff, 1.5));

const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(5, 10, 6);
scene.add(keyLight);

const blueLight = new THREE.PointLight(0x087dff, 30, 35);
blueLight.position.set(-5, 4, -5);
scene.add(blueLight);

const greenLight = new THREE.PointLight(0x00ff88, 18, 25);
greenLight.position.set(5, 3, 2);
scene.add(greenLight);

const cyanLight = new THREE.PointLight(0x00ccff, 16, 30);
cyanLight.position.set(0, 5, -10);
scene.add(cyanLight);

// ============================================================
// GROUND
// ============================================================

const ground = new THREE.Mesh(
	new THREE.PlaneGeometry(2000, 2000),
	new THREE.MeshBasicMaterial({ color: BACKGROUND_COLOR })
);

ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.08;

scene.add(ground);

// ============================================================
// INFINITE PROCEDURAL TECH BACKGROUND
// ============================================================

const techGroup = new THREE.Group();
scene.add(techGroup);

const techMaterials = [
	new THREE.LineBasicMaterial({
		color: 0x00ff88,
		transparent: true,
		opacity: 0.65,
		depthWrite: false
	}),
	new THREE.LineBasicMaterial({
		color: 0x075bff,
		transparent: true,
		opacity: 0.6,
		depthWrite: false
	}),
	new THREE.LineBasicMaterial({
		color: 0x00ccff,
		transparent: true,
		opacity: 0.6,
		depthWrite: false
	})
];

const nodeMaterials = [
	new THREE.MeshBasicMaterial({ color: 0x00ff88 }),
	new THREE.MeshBasicMaterial({ color: 0x075bff }),
	new THREE.MeshBasicMaterial({ color: 0x00ccff })
];

const techNodeGeometry = new THREE.SphereGeometry(0.045, 8, 8);
const techCells = new Map();

let techGenerationTimer = 0;

function cellKey(x, z) {
	return `${x},${z}`;
}

function randomChoice(array) {
	return array[Math.floor(Math.random() * array.length)];
}

function createTechCell(cellX, cellZ) {
	const key = cellKey(cellX, cellZ);

	if (techCells.has(key)) {
		return;
	}

	const cellGroup = new THREE.Group();

	const originX = cellX * TECH_CELL_SIZE;
	const originZ = cellZ * TECH_CELL_SIZE;

	const lineCount = 3 + Math.floor(Math.random() * 5);

	for (let i = 0; i < lineCount; i++) {
		let x = originX + Math.random() * TECH_CELL_SIZE;
		let z = originZ + Math.random() * TECH_CELL_SIZE;

		const points = [
			new THREE.Vector3(x, TECH_LINE_HEIGHT, z)
		];

		const segmentCount = 2 + Math.floor(Math.random() * 4);

		let direction = Math.floor(Math.random() * 4);

		for (let j = 0; j < segmentCount; j++) {
			const length = 0.6 + Math.random() * 2.2;

			if (direction === 0) {
				x += length;
			} else if (direction === 1) {
				x -= length;
			} else if (direction === 2) {
				z += length;
			} else {
				z -= length;
			}

			if (Math.random() < 0.7) {
				direction = Math.floor(Math.random() * 4);
			}

			points.push(new THREE.Vector3(x, TECH_LINE_HEIGHT, z));
		}

		const geometry = new THREE.BufferGeometry().setFromPoints(points);
		const material = randomChoice(techMaterials);

		cellGroup.add(new THREE.Line(geometry, material));

		if (Math.random() < 0.45) {
			const node = new THREE.Mesh(
				techNodeGeometry,
				randomChoice(nodeMaterials)
			);

			node.position.copy(randomChoice(points));
			node.position.y = 0.015;

			cellGroup.add(node);
		}
	}

	techGroup.add(cellGroup);

	techCells.set(key, {
		group: cellGroup,
		x: cellX,
		z: cellZ
	});
}

function clearTechBackground() {
	for (const cell of techCells.values()) {
		techGroup.remove(cell.group);

		cell.group.traverse(object => {
			if (object.isLine) {
				object.geometry.dispose();
			}
		});
	}

	techCells.clear();
}

function updateTechBackground(deltaTime) {
	if (isFinished) {
		return;
	}

	techGenerationTimer += deltaTime;

	if (techGenerationTimer < TECH_GENERATION_INTERVAL) {
		return;
	}

	techGenerationTimer = 0;

	const centerX = Math.floor(carPosition.x / TECH_CELL_SIZE);
	const centerZ = Math.floor(carPosition.z / TECH_CELL_SIZE);

	for (let x = centerX - TECH_RADIUS; x <= centerX + TECH_RADIUS; x++) {
		for (let z = centerZ - TECH_RADIUS; z <= centerZ + TECH_RADIUS; z++) {
			createTechCell(x, z);
		}
	}

	for (const [key, cell] of techCells) {
		const dx = cell.x - centerX;
		const dz = cell.z - centerZ;

		if (
			Math.abs(dx) > TECH_RADIUS + 1 ||
			Math.abs(dz) > TECH_RADIUS + 1
		) {
			techGroup.remove(cell.group);

			cell.group.traverse(object => {
				if (object.isLine) {
					object.geometry.dispose();
				}
			});

			techCells.delete(key);
		}
	}
}

// ============================================================
// CAR STATE
// ============================================================

let car = null;
let carReady = false;

const carVisual = new THREE.Group();
const carPosition = new THREE.Vector3();

const movementDirection = new THREE.Vector3(0, 0, -1);
const launchDirection = new THREE.Vector3();

let carSpeed = 0;
let carAcceleration = 0;

let isLaunching = false;
let isFinished = false;
let launchStarted = false;

let launchElapsed = 0;
let endingElapsed = 0;
let endingPhase = 'none';
let introElapsed = 0;
let shredElapsed = 0;
let introPhase = 'idle';
let carParts = [];
let shardObjects = [];
let cameraStartPosition = new THREE.Vector3();
let cameraStartTarget = new THREE.Vector3();
let cinematicCameraPosition = new THREE.Vector3();
let cinematicCameraTarget = new THREE.Vector3();

// ============================================================
// PATH STATE
// ============================================================

const trailPoints = [];

let trailFollowIndex = 0;
let lastRecordedPoint = null;
let trailNeedsUpdate = true;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const groundPlane = new THREE.Plane(
	new THREE.Vector3(0, 1, 0),
	0
);

// ============================================================
// SCREEN TO WORLD
// ============================================================

function screenToWorld(clientX, clientY) {
	pointer.x = (clientX / window.innerWidth) * 2 - 1;
	pointer.y = -(clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(pointer, camera);

	const intersection = new THREE.Vector3();

	if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
		return intersection;
	}

	return null;
}

// ============================================================
// RECORD CURSOR PATH
// ============================================================

function recordPathPoint(point) {
	if (!point || isLaunching || isFinished) {
		return;
	}

	const newPoint = point.clone();
	newPoint.y = 0;

	if (!lastRecordedPoint) {
		trailPoints.push(newPoint.clone());
		lastRecordedPoint = newPoint.clone();
		trailNeedsUpdate = true;
		return;
	}

	const distance = lastRecordedPoint.distanceTo(newPoint);

	if (distance < TRAIL_POINT_SPACING) {
		return;
	}

	const steps = Math.max(1, Math.ceil(distance / TRAIL_POINT_SPACING));
	const start = lastRecordedPoint.clone();

	for (let i = 1; i <= steps; i++) {
		const pointOnPath = new THREE.Vector3().lerpVectors(
			start,
			newPoint,
			i / steps
		);

		pointOnPath.y = 0;
		trailPoints.push(pointOnPath);
	}

	lastRecordedPoint.copy(newPoint);

	if (trailPoints.length > MAX_TRAIL_POINTS) {
		const excess = trailPoints.length - MAX_TRAIL_POINTS;

		trailPoints.splice(0, excess);

		trailFollowIndex = Math.max(0, trailFollowIndex - excess);
	}

	trailNeedsUpdate = true;
}

// ============================================================
// VISIBLE CURSOR TRAIL
// ============================================================

const trailGroup = new THREE.Group();
scene.add(trailGroup);

const trailMaterial = new THREE.LineBasicMaterial({
	color: 0x00ff88,
	transparent: true,
	opacity: 0.9,
	depthWrite: false
});

const trailGlowMaterial = new THREE.LineBasicMaterial({
	color: 0x007744,
	transparent: true,
	opacity: 0.2,
	depthWrite: false
});

let trailLine = null;
let trailGlowLine = null;

function removeTrailLine(line) {
	if (!line) {
		return;
	}

	trailGroup.remove(line);
	line.geometry.dispose();
}

function clearVisibleTrail() {
	removeTrailLine(trailLine);
	removeTrailLine(trailGlowLine);

	trailLine = null;
	trailGlowLine = null;
	trailGroup.visible = false;
}

function updateTrail() {
	if (!trailNeedsUpdate) {
		return;
	}

	trailNeedsUpdate = false;

	removeTrailLine(trailLine);
	removeTrailLine(trailGlowLine);

	trailLine = null;
	trailGlowLine = null;

	if (isFinished || trailPoints.length < 2) {
		return;
	}

	const remaining = trailPoints.slice(trailFollowIndex);

	if (remaining.length < 2) {
		return;
	}

	const points = remaining.map(point =>
		new THREE.Vector3(point.x, 0.015, point.z)
	);

	trailLine = new THREE.Line(
		new THREE.BufferGeometry().setFromPoints(points),
		trailMaterial
	);

	trailGlowLine = new THREE.Line(
		new THREE.BufferGeometry().setFromPoints(points),
		trailGlowMaterial
	);

	trailGroup.add(trailGlowLine);
	trailGroup.add(trailLine);
}

// ============================================================
// NORMAL WHITE PARTICLES
// ============================================================

const normalParticlePositions = new Float32Array(
	NORMAL_PARTICLE_COUNT * 3
);

const normalParticleVelocities = [];
const normalParticleLifetimes = new Float32Array(NORMAL_PARTICLE_COUNT);

for (let i = 0; i < NORMAL_PARTICLE_COUNT; i++) {
	normalParticlePositions[i * 3 + 1] = -100;
	normalParticleVelocities.push(new THREE.Vector3());
	normalParticleLifetimes[i] = 0;
}

const normalParticleGeometry = new THREE.BufferGeometry();

normalParticleGeometry.setAttribute(
	'position',
	new THREE.BufferAttribute(normalParticlePositions, 3)
);

const normalParticleMaterial = new THREE.PointsMaterial({
	color: 0xffffff,
	size: 0.045,
	transparent: true,
	opacity: 0.9,
	depthWrite: false,
	sizeAttenuation: true,
	blending: THREE.AdditiveBlending
});

const normalParticles = new THREE.Points(
	normalParticleGeometry,
	normalParticleMaterial
);

normalParticles.visible = false;
scene.add(normalParticles);

let normalParticleIndex = 0;
let normalParticleSpawnTimer = 0;

function spawnNormalParticle() {
	if (!carReady) {
		return;
	}

	const backward = movementDirection.clone().negate();

	const spawnPosition = carPosition.clone().add(
		backward.multiplyScalar(0.45 + Math.random() * 0.35)
	);

	spawnPosition.y += 0.12 + Math.random() * 0.2;

	const i = normalParticleIndex;

	normalParticlePositions[i * 3] = spawnPosition.x;
	normalParticlePositions[i * 3 + 1] = spawnPosition.y;
	normalParticlePositions[i * 3 + 2] = spawnPosition.z;

	normalParticleVelocities[i].set(
		(Math.random() - 0.5) * 0.3,
		(Math.random() - 0.5) * 0.25,
		(Math.random() - 0.5) * 0.3
	);

	normalParticleLifetimes[i] = 0.4 + Math.random() * 0.6;

	normalParticleIndex = (normalParticleIndex + 1) % NORMAL_PARTICLE_COUNT;
}

function updateNormalParticles(deltaTime) {
	if (!carReady || isLaunching || isFinished || carSpeed < 0.1) {
		normalParticles.visible = false;
		return;
	}

	normalParticles.visible = true;
	normalParticleSpawnTimer += deltaTime;

	const interval = THREE.MathUtils.lerp(
		0.035,
		0.012,
		Math.min(carSpeed / MAX_SPEED, 1)
	);

	while (normalParticleSpawnTimer >= interval) {
		normalParticleSpawnTimer -= interval;
		spawnNormalParticle();
	}

	for (let i = 0; i < NORMAL_PARTICLE_COUNT; i++) {
		if (normalParticleLifetimes[i] <= 0) {
			continue;
		}

		normalParticleLifetimes[i] -= deltaTime;

		const velocity = normalParticleVelocities[i];

		normalParticlePositions[i * 3] += velocity.x * deltaTime;
		normalParticlePositions[i * 3 + 1] += velocity.y * deltaTime;
		normalParticlePositions[i * 3 + 2] += velocity.z * deltaTime;

		if (normalParticleLifetimes[i] <= 0) {
			normalParticlePositions[i * 3 + 1] = -100;
		}
	}

	normalParticleGeometry.attributes.position.needsUpdate = true;
}

// ============================================================
// LAUNCH FIRE PARTICLES
// ============================================================

const launchParticlePositions = new Float32Array(
	LAUNCH_PARTICLE_COUNT * 3
);

const launchParticleVelocities = [];
const launchParticleLifetimes = new Float32Array(LAUNCH_PARTICLE_COUNT);

for (let i = 0; i < LAUNCH_PARTICLE_COUNT; i++) {
	launchParticlePositions[i * 3 + 1] = -100;
	launchParticleVelocities.push(new THREE.Vector3());
	launchParticleLifetimes[i] = 0;
}

const launchParticleGeometry = new THREE.BufferGeometry();

launchParticleGeometry.setAttribute(
	'position',
	new THREE.BufferAttribute(launchParticlePositions, 3)
);

const launchParticleMaterial = new THREE.PointsMaterial({
	color: 0xff6a16,
	size: 0.075,
	transparent: true,
	opacity: 0.9,
	depthWrite: false,
	sizeAttenuation: true,
	blending: THREE.AdditiveBlending
});

const launchParticles = new THREE.Points(
	launchParticleGeometry,
	launchParticleMaterial
);

launchParticles.visible = false;
scene.add(launchParticles);

let launchParticleIndex = 0;
let launchParticleSpawnTimer = 0;

function spawnLaunchParticle() {
	const backward = launchDirection.clone().negate();

	const spawnPosition = carPosition.clone().add(
		backward.multiplyScalar(0.4 + Math.random() * 0.25)
	);

	spawnPosition.y += 0.12 + Math.random() * 0.15;

	const i = launchParticleIndex;

	launchParticlePositions[i * 3] = spawnPosition.x;
	launchParticlePositions[i * 3 + 1] = spawnPosition.y;
	launchParticlePositions[i * 3 + 2] = spawnPosition.z;

	const spread = new THREE.Vector3(
		(Math.random() - 0.5) * 1.3,
		(Math.random() - 0.5) * 1.0,
		(Math.random() - 0.5) * 1.3
	);

	launchParticleVelocities[i]
		.copy(backward)
		.multiplyScalar(2 + Math.random() * 6)
		.add(spread);

	launchParticleLifetimes[i] = 0.2 + Math.random() * 0.5;

	launchParticleIndex = (launchParticleIndex + 1) % LAUNCH_PARTICLE_COUNT;
}

function updateLaunchParticles(deltaTime) {
	if (!isLaunching || isFinished) {
		launchParticles.visible = false;
		return;
	}

	launchParticles.visible = true;
	launchParticleSpawnTimer += deltaTime;

	while (launchParticleSpawnTimer >= 0.008) {
		launchParticleSpawnTimer -= 0.008;
		spawnLaunchParticle();
	}

	for (let i = 0; i < LAUNCH_PARTICLE_COUNT; i++) {
		if (launchParticleLifetimes[i] <= 0) {
			continue;
		}

		launchParticleLifetimes[i] -= deltaTime;

		const velocity = launchParticleVelocities[i];

		launchParticlePositions[i * 3] += velocity.x * deltaTime;
		launchParticlePositions[i * 3 + 1] += velocity.y * deltaTime;
		launchParticlePositions[i * 3 + 2] += velocity.z * deltaTime;

		if (launchParticleLifetimes[i] <= 0) {
			launchParticlePositions[i * 3 + 1] = -100;
		}
	}

	launchParticleGeometry.attributes.position.needsUpdate = true;
}

// ============================================================
// ROCKET EXHAUST
// ============================================================

const exhaustGroup = new THREE.Group();
scene.add(exhaustGroup);

const outerFlameMaterial = new THREE.MeshBasicMaterial({
	color: 0xff430f,
	transparent: true,
	opacity: 0.75,
	depthWrite: false,
	blending: THREE.AdditiveBlending,
	side: THREE.DoubleSide
});

const innerFlameMaterial = new THREE.MeshBasicMaterial({
	color: 0xffc15c,
	transparent: true,
	opacity: 0.85,
	depthWrite: false,
	blending: THREE.AdditiveBlending,
	side: THREE.DoubleSide
});

const coreFlameMaterial = new THREE.MeshBasicMaterial({
	color: 0xffffff,
	transparent: true,
	opacity: 0.8,
	depthWrite: false,
	blending: THREE.AdditiveBlending,
	side: THREE.DoubleSide
});

const outerFlame = new THREE.Mesh(
	new THREE.ConeGeometry(0.12, 0.8, 10),
	outerFlameMaterial
);

const innerFlame = new THREE.Mesh(
	new THREE.ConeGeometry(0.075, 0.55, 10),
	innerFlameMaterial
);

const coreFlame = new THREE.Mesh(
	new THREE.ConeGeometry(0.035, 0.32, 8),
	coreFlameMaterial
);

outerFlame.position.y = 0.42;
innerFlame.position.y = 0.28;
coreFlame.position.y = 0.17;

exhaustGroup.add(outerFlame, innerFlame, coreFlame);
exhaustGroup.visible = false;

function updateExhaust() {
	if (!isLaunching || isFinished || !carReady) {
		exhaustGroup.visible = false;
		return;
	}

	exhaustGroup.visible = true;

	const backward = launchDirection.clone().negate();

	exhaustGroup.position.copy(
		carPosition.clone().add(backward.multiplyScalar(0.65))
	);

	exhaustGroup.position.y += 0.12;

	exhaustGroup.quaternion.setFromUnitVectors(
		new THREE.Vector3(0, 1, 0),
		backward
	);

	const flicker = 0.9 + Math.random() * 0.2;
	const launchPower = THREE.MathUtils.clamp(launchElapsed / 0.4, 0, 1);

	const length = (0.8 + launchPower * 0.35) * flicker;
	const width = 0.8 + launchPower * 0.15;

	outerFlame.scale.set(width, length, width);
	innerFlame.scale.set(width * 0.7, length * 0.7, width * 0.7);
	coreFlame.scale.set(width * 0.45, length * 0.5, width * 0.45);

	outerFlame.material.opacity = 0.55 + Math.random() * 0.15;
	innerFlame.material.opacity = 0.7 + Math.random() * 0.15;
	coreFlame.material.opacity = 0.75 + Math.random() * 0.15;
}

// ============================================================
// LOAD CAR MODEL
// ============================================================

const loader = new GLTFLoader();

loader.load(
	MODEL_PATH,

	(gltf) => {
		const model = gltf.scene;

		model.traverse(object => {
			if (object.isMesh) {
				object.castShadow = true;
				object.receiveShadow = true;

				// Clone each material so the cinematic dissolve only affects this car.
				const sourceMaterials = Array.isArray(object.material)
					? object.material
					: [object.material];

				const clonedMaterials = sourceMaterials.map(material => material.clone());
				object.material = Array.isArray(object.material)
					? clonedMaterials
					: clonedMaterials[0];

				carParts.push({
					mesh: object,
					materials: clonedMaterials,
					delay: Math.random() * 0.72,
					baseOpacities: clonedMaterials.map(material => material.opacity)
				});
			}
		});

		const originalBox = new THREE.Box3().setFromObject(model);
		const originalSize = new THREE.Vector3();

		originalBox.getSize(originalSize);

		const largestDimension = Math.max(
			originalSize.x,
			originalSize.y,
			originalSize.z
		);

		if (largestDimension > 0) {
			model.scale.setScalar(2.2 / largestDimension);
		}

		const scaledBox = new THREE.Box3().setFromObject(model);
		const center = new THREE.Vector3();

		scaledBox.getCenter(center);

		model.position.x -= center.x;
		model.position.z -= center.z;
		model.position.y -= scaledBox.min.y;

		// Correct the model's facing direction.
		model.rotation.y = Math.PI;

		carVisual.add(model);
		carVisual.position.set(0, 0, 0);

		scene.add(carVisual);
		car = carVisual;

		carPosition.set(0, 0, 0);
		carReady = true;

		if (loadingElement) {
			loadingElement.style.opacity = '0';

			setTimeout(() => {
				loadingElement.style.display = 'none';
			}, 500);
		}

		if (progressPanel) {
			progressPanel.classList.add('visible');
		}

		console.log('APEX: Car loaded.');
	},

	(xhr) => {
		if (xhr.total > 0 && loadingElement) {
			const progress = Math.round((xhr.loaded / xhr.total) * 100);
			loadingElement.textContent = `LOADING ${progress}%`;
		}
	},

	(error) => {
		console.error('APEX: Car model failed to load.', error);

		if (loadingElement) {
			loadingElement.textContent = 'MODEL LOAD FAILED';
		}
	}
);

// ============================================================
// CURSOR INPUT
// ============================================================

function handlePointerMove(event) {
	if (isLaunching || isFinished) {
		return;
	}

	const worldPoint = screenToWorld(event.clientX, event.clientY);

	if (worldPoint) {
		recordPathPoint(worldPoint);
	}
}

window.addEventListener('pointermove', handlePointerMove);
window.addEventListener('pointerdown', handlePointerMove);

// ============================================================
// PATH HELPERS
// ============================================================

function getLookAheadTarget() {
	if (trailPoints.length === 0) {
		return null;
	}

	trailFollowIndex = THREE.MathUtils.clamp(
		trailFollowIndex,
		0,
		trailPoints.length - 1
	);

	const searchEnd = Math.min(
		trailPoints.length - 1,
		trailFollowIndex + 35
	);

	let closestIndex = trailFollowIndex;
	let closestDistanceSq = Infinity;

	for (let i = trailFollowIndex; i <= searchEnd; i++) {
		const p = trailPoints[i];

		const dx = p.x - carPosition.x;
		const dz = p.z - carPosition.z;
		const distanceSq = dx * dx + dz * dz;

		if (distanceSq < closestDistanceSq) {
			closestDistanceSq = distanceSq;
			closestIndex = i;
		}
	}

	trailFollowIndex = Math.max(trailFollowIndex, closestIndex);

	const lookAheadDistance = THREE.MathUtils.clamp(
		0.35 + carSpeed * 0.12,
		0.4,
		1.6
	);

	let accumulatedDistance = 0;

	for (let i = trailFollowIndex; i < trailPoints.length - 1; i++) {
		accumulatedDistance += trailPoints[i].distanceTo(
			trailPoints[i + 1]
		);

		if (accumulatedDistance >= lookAheadDistance) {
			return {
				point: trailPoints[i + 1],
				index: i + 1
			};
		}
	}

	return {
		point: trailPoints[trailPoints.length - 1],
		index: trailPoints.length - 1
	};
}

function getRemainingPathDistance() {
	if (trailPoints.length === 0) {
		return 0;
	}

	const lastIndex = trailPoints.length - 1;

	if (trailFollowIndex >= lastIndex) {
		return carPosition.distanceTo(trailPoints[lastIndex]);
	}

	let distance = carPosition.distanceTo(trailPoints[trailFollowIndex]);

	for (let i = trailFollowIndex; i < lastIndex; i++) {
		distance += trailPoints[i].distanceTo(trailPoints[i + 1]);
	}

	return distance;
}

// ============================================================
// CAR MOVEMENT
// ============================================================

function updateCar(deltaTime) {
	if (!carReady || !car || isFinished) {
		return;
	}

	if (isLaunching) {
		launchElapsed += deltaTime;

		const previousSpeed = carSpeed;

		carSpeed = Math.min(
			LAUNCH_MAX_SPEED,
			carSpeed + LAUNCH_ACCELERATION * deltaTime
		);

		carAcceleration = (
			carSpeed - previousSpeed
		) / Math.max(deltaTime, 0.0001);

		carPosition.addScaledVector(
			launchDirection,
			carSpeed * deltaTime
		);

		car.position.x = carPosition.x;
		car.position.z = carPosition.z;

		car.rotation.y = Math.atan2(
			launchDirection.x,
			launchDirection.z
		);

		if (launchElapsed >= LAUNCH_DURATION) {
			finishLaunch();
		}

		return;
	}

	if (trailPoints.length === 0) {
		const previousSpeed = carSpeed;

		carSpeed = Math.max(
			0,
			carSpeed - MAX_BRAKING * deltaTime
		);

		carAcceleration = (
			carSpeed - previousSpeed
		) / Math.max(deltaTime, 0.0001);

		return;
	}

	const lastIndex = trailPoints.length - 1;
	const endpoint = trailPoints[lastIndex];

	const endpointDistance = Math.hypot(
		endpoint.x - carPosition.x,
		endpoint.z - carPosition.z
	);

	if (
		trailFollowIndex >= lastIndex &&
		endpointDistance < 0.22
	) {
		carPosition.x = endpoint.x;
		carPosition.z = endpoint.z;

		car.position.x = endpoint.x;
		car.position.z = endpoint.z;

		const previousSpeed = carSpeed;

		carSpeed = Math.max(
			0,
			carSpeed - MAX_BRAKING * deltaTime
		);

		carAcceleration = (
			carSpeed - previousSpeed
		) / Math.max(deltaTime, 0.0001);

		trailNeedsUpdate = true;

		return;
	}

	const targetData = getLookAheadTarget();

	if (!targetData) {
		return;
	}

	const target = targetData.point;

	const desiredDirection = new THREE.Vector3(
		target.x - carPosition.x,
		0,
		target.z - carPosition.z
	);

	const targetDistance = desiredDirection.length();

	if (targetDistance > 0.001) {
		desiredDirection.normalize();

		const blend = 1 - Math.exp(
			-STEERING_SPEED * deltaTime
		);

		const blended = movementDirection.clone().lerp(
			desiredDirection,
			blend
		);

		if (blended.lengthSq() > 0.0001) {
			movementDirection.copy(blended.normalize());
		} else {
			movementDirection.copy(desiredDirection);
		}
	}

	movementDirection.y = 0;

	if (movementDirection.lengthSq() > 0.0001) {
		movementDirection.normalize();
	}

	const remainingDistance = getRemainingPathDistance();
	const stoppingBuffer = 0.2;

	const availableDistance = Math.max(
		0,
		remainingDistance - stoppingBuffer
	);

	const safeSpeed = Math.sqrt(
		2 * MAX_BRAKING * availableDistance
	);

	const desiredSpeed = Math.min(
		MAX_SPEED,
		safeSpeed
	);

	const previousSpeed = carSpeed;

	if (carSpeed < desiredSpeed) {
		carSpeed = Math.min(
			desiredSpeed,
			carSpeed + MAX_ACCELERATION * deltaTime
		);
	} else {
		carSpeed = Math.max(
			desiredSpeed,
			carSpeed - MAX_BRAKING * deltaTime
		);
	}

	carAcceleration = (
		carSpeed - previousSpeed
	) / Math.max(deltaTime, 0.0001);

	carPosition.addScaledVector(
		movementDirection,
		carSpeed * deltaTime
	);

	car.position.x = carPosition.x;
	car.position.z = carPosition.z;

	car.rotation.y = Math.atan2(
		movementDirection.x,
		movementDirection.z
	);

	while (trailFollowIndex < lastIndex) {
		const p = trailPoints[trailFollowIndex];

		const distance = Math.hypot(
			p.x - carPosition.x,
			p.z - carPosition.z
		);

		if (distance < 0.3) {
			trailFollowIndex++;
		} else {
			break;
		}
	}

	if (trailFollowIndex > 100) {
		trailPoints.splice(0, trailFollowIndex);
		trailFollowIndex = 0;
	}

	trailNeedsUpdate = true;
}

// ============================================================
// CINEMATIC INTRO, SHREDDER EFFECT, AND WELCOME REVEAL
// ============================================================

function startLaunch() {
	if (!carReady || !car || launchStarted || isFinished) {
		return;
	}

	launchStarted = true;
	isLaunching = true;
	launchElapsed = 0;
	introElapsed = 0;
	shredElapsed = 0;
	introPhase = 'camera';

	launchDirection.copy(movementDirection);
	launchDirection.y = 0;
	if (launchDirection.lengthSq() < 0.0001) {
		launchDirection.set(0, 0, -1);
	}
	launchDirection.normalize();

	carSpeed = 0;
	carAcceleration = 0;
	normalParticles.visible = false;
	launchParticles.visible = false;
	exhaustGroup.visible = false;
	clearVisibleTrail();

	cameraStartPosition.copy(camera.position);
	cameraStartTarget.copy(carPosition);
	cameraStartTarget.y += 0.3;

	const sideDirection = new THREE.Vector3(
		launchDirection.z,
		0,
		-launchDirection.x
	).normalize();

	// A low, close side-on composition: the body of the car becomes the subject.
	cinematicCameraPosition.copy(carPosition)
		.addScaledVector(sideDirection, 2.65)
		.addScaledVector(launchDirection, 0.18);
	cinematicCameraPosition.y += 0.68;

	cinematicCameraTarget.copy(carPosition);
	cinematicCameraTarget.y += 0.34;

	if (centerMessage) centerMessage.style.display = 'none';
	if (launchPrompt) launchPrompt.style.display = 'none';
	document.body.classList.add('launched');

	if (progressPanel) progressPanel.classList.add('visible');
	if (progressFill) progressFill.style.width = '0%';
	if (progressValue) progressValue.textContent = '0%';
	if (progressLabel) progressLabel.textContent = 'INITIALIZING EXPERIENCE';

	console.log('APEX: Cinematic intro started.');
}

function createShards() {
	for (const shard of shardObjects) {
		scene.remove(shard.mesh);
		shard.mesh.geometry.dispose();
		shard.mesh.material.dispose();
	}
	shardObjects = [];

	const bounds = new THREE.Box3().setFromObject(car);
	const size = new THREE.Vector3();
	const center = new THREE.Vector3();
	bounds.getSize(size);
	bounds.getCenter(center);

	const palette = [];
	for (const part of carParts) {
		for (const material of part.materials) {
			if (material.color) palette.push(material.color.clone());
		}
	}
	if (palette.length === 0) palette.push(new THREE.Color(0x9ca9a4));

	const shardCount = 145;
	for (let i = 0; i < shardCount; i++) {
		const width = 0.025 + Math.random() * 0.075;
		const height = 0.018 + Math.random() * 0.06;
		const depth = 0.02 + Math.random() * 0.09;
		const geometry = new THREE.BoxGeometry(width, height, depth);
		const color = palette[Math.floor(Math.random() * palette.length)].clone();
		const material = new THREE.MeshStandardMaterial({
			color,
			emissive: color,
			emissiveIntensity: 0.12,
			metalness: 0.55,
			roughness: 0.35,
			transparent: true,
			opacity: 0,
			depthWrite: false
		});
		const mesh = new THREE.Mesh(geometry, material);
		const start = new THREE.Vector3(
			bounds.min.x + Math.random() * Math.max(size.x, 0.01),
			bounds.min.y + Math.random() * Math.max(size.y, 0.01),
			bounds.min.z + Math.random() * Math.max(size.z, 0.01)
		);
		mesh.position.copy(start);
		mesh.visible = true;
		scene.add(mesh);

		const outward = start.clone().sub(center);
		if (outward.lengthSq() < 0.001) outward.set(Math.random() - 0.5, Math.random(), Math.random() - 0.5);
		outward.normalize();
		outward.add(new THREE.Vector3(
			(Math.random() - 0.5) * 1.3,
			Math.random() * 1.2,
			(Math.random() - 0.5) * 1.3
		)).normalize();

		shardObjects.push({
			mesh,
			start,
			velocity: outward.multiplyScalar(0.7 + Math.random() * 2.4),
			rotation: new THREE.Vector3(
				(Math.random() - 0.5) * 7,
				(Math.random() - 0.5) * 7,
				(Math.random() - 0.5) * 7
			),
			delay: Math.random() * 1.15,
			phase: Math.random() * Math.PI * 2
		});
	}
}

function beginShred() {
	introPhase = 'shred';
	shredElapsed = 0;
	isLaunching = false;
	if (progressLabel) progressLabel.textContent = 'DISASSEMBLING / 3D OBJECT';
	createShards();
	console.log('APEX: Starting mesh-by-mesh disassembly.');
}

function revealWelcome() {
	introPhase = 'welcome';
	car.visible = false;
	techGroup.visible = false;
	trailGroup.visible = false;
	ground.visible = false;
	normalParticles.visible = false;
	launchParticles.visible = false;
	exhaustGroup.visible = false;
	scene.background = new THREE.Color(0x000000);
	scene.fog = null;
	document.body.classList.add('ended');

	if (progressPanel) progressPanel.classList.remove('visible');
	if (welcomeScreen) welcomeScreen.classList.add('visible');
	if (welcomeTitle) {
		welcomeTitle.replaceChildren();
		const title = 'WELCOME TO THE CREATORS DEN';
		const letters = Array.from(title);
		letters.forEach((character, index) => {
			const span = document.createElement('span');
			span.className = character === ' ' ? 'welcome-letter space' : 'welcome-letter';
			span.textContent = character === ' ' ? '\u00a0' : character;
			welcomeTitle.appendChild(span);
			window.setTimeout(() => span.classList.add('revealed'), 90 + index * 58);
		});
	}

	introPhase = 'complete';
	isFinished = true;
	console.log("APEX: Welcome to the Creator's Den.");
}

function updateCinematic(deltaTime) {
	if (introPhase === 'camera' || introPhase === 'progress') {
		introElapsed += deltaTime;
		const progress = THREE.MathUtils.clamp(introElapsed / INTRO_PROGRESS_DURATION, 0, 1);
		const cameraProgress = THREE.MathUtils.clamp(introElapsed / CAMERA_CINEMATIC_DURATION, 0, 1);
		const easedCamera = cameraProgress * cameraProgress * (3 - 2 * cameraProgress);

		camera.position.lerpVectors(cameraStartPosition, cinematicCameraPosition, easedCamera);
		cameraTarget.lerpVectors(cameraStartTarget, cinematicCameraTarget, easedCamera);
		camera.lookAt(cameraTarget);
		camera.fov = THREE.MathUtils.lerp(45, 24, easedCamera);
		camera.updateProjectionMatrix();

		if (progressFill) progressFill.style.width = `${(progress * 100).toFixed(2)}%`;
		if (progressValue) progressValue.textContent = `${Math.round(progress * 100)}%`;
		if (progressLabel && introPhase === 'camera') progressLabel.textContent = 'ESTABLISHING CREATOR ACCESS';
		introPhase = 'progress';

		if (progress >= 1) {
			if (progressFill) progressFill.style.width = '100%';
			if (progressValue) progressValue.textContent = '100%';
			beginShred();
		}
		return;
	}

	if (introPhase === 'shred') {
		shredElapsed += deltaTime;
		const overall = THREE.MathUtils.clamp(shredElapsed / SHRED_DURATION, 0, 1);

		for (const part of carParts) {
			const local = THREE.MathUtils.clamp((shredElapsed - part.delay) / Math.max(0.1, SHRED_DURATION - part.delay * 0.35), 0, 1);
			const opacityFactor = 1 - local;
			for (let i = 0; i < part.materials.length; i++) {
				const material = part.materials[i];
				material.transparent = true;
				material.depthWrite = false;
				material.opacity = part.baseOpacities[i] * opacityFactor;
				material.needsUpdate = true;
			}
		}

		for (const shard of shardObjects) {
			const local = THREE.MathUtils.clamp((shredElapsed - shard.delay) / Math.max(0.15, SHRED_DURATION - shard.delay), 0, 1);
			const eased = local * local * (3 - 2 * local);
			shard.mesh.position.copy(shard.start).addScaledVector(shard.velocity, eased * 2.15);
			shard.mesh.rotation.x = shard.rotation.x * eased;
			shard.mesh.rotation.y = shard.rotation.y * eased;
			shard.mesh.rotation.z = shard.rotation.z * eased;
			shard.mesh.material.opacity = Math.sin(local * Math.PI) * 0.95;
			const scale = Math.max(0.001, 1 - eased * 0.88);
			shard.mesh.scale.setScalar(scale);
		}

		if (overall >= 1) {
			car.visible = false;
			for (const shard of shardObjects) shard.mesh.visible = false;
			introPhase = 'blackout';
			endingElapsed = 0;
			endingOverlay.style.transition = `opacity ${ENDING_FADE_DURATION}s ease`;
			endingOverlay.style.opacity = '1';
		}
		return;
	}

	if (introPhase === 'blackout') {
		endingElapsed += deltaTime;
		if (endingElapsed >= ENDING_FADE_DURATION + 0.08) {
			revealWelcome();
		}
	}
}

window.addEventListener('keydown', event => {
	if (event.code !== 'Space') return;
	if (event.repeat) return;
	event.preventDefault();
	startLaunch();
});

// ============================================================
// CAMERA
// ============================================================

const cameraOffset = new THREE.Vector3(0, 7, 13);
const cameraTarget = new THREE.Vector3();

function updateCamera(deltaTime) {
	if (!carReady || !car || isFinished) {
		return;
	}

	const desiredPosition = carPosition.clone().add(cameraOffset);

	if (isLaunching) {
		// Stay behind the car during launch.
		desiredPosition.add(
			launchDirection.clone().multiplyScalar(-2)
		);

		desiredPosition.y += 1;

		const launchProgress = THREE.MathUtils.clamp(
			launchElapsed / LAUNCH_DURATION,
			0,
			1
		);

		camera.fov = THREE.MathUtils.lerp(
			45,
			58,
			launchProgress
		);

		camera.updateProjectionMatrix();
	} else {
		camera.fov = THREE.MathUtils.damp(
			camera.fov,
			45,
			3,
			deltaTime
		);

		camera.updateProjectionMatrix();
	}

	const smoothing = 1 - Math.exp(-2.2 * deltaTime);

	camera.position.lerp(
		desiredPosition,
		smoothing
	);

	cameraTarget.copy(carPosition);
	cameraTarget.y += 0.3;

	camera.lookAt(cameraTarget);
}

// ============================================================
// ANIMATION LOOP
// ============================================================

function animate() {
	requestAnimationFrame(animate);

	const deltaTime = Math.min(
		clock.getDelta(),
		0.04
	);

	if (!launchStarted) {
		updateCar(deltaTime);
		updateTechBackground(deltaTime);
		updateNormalParticles(deltaTime);
		updateTrail();
		updateCamera(deltaTime);
	} else {
		updateCinematic(deltaTime);
	}

	renderer.render(scene, camera);
}

animate();

// ============================================================
// RESIZE
// ============================================================

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(
		window.innerWidth,
		window.innerHeight
	);

	renderer.setPixelRatio(
		Math.min(window.devicePixelRatio, 2)
	);
});

// ============================================================
// CLEANUP
// ============================================================

window.addEventListener('beforeunload', () => {
	renderer.dispose();

	for (const shard of shardObjects) {
		shard.mesh.geometry.dispose();
		shard.mesh.material.dispose();
	}

	carParts.forEach(part => part.materials.forEach(material => material.dispose()));

	normalParticleGeometry.dispose();
	normalParticleMaterial.dispose();

	launchParticleGeometry.dispose();
	launchParticleMaterial.dispose();

	trailMaterial.dispose();
	trailGlowMaterial.dispose();

	outerFlame.geometry.dispose();
	innerFlame.geometry.dispose();
	coreFlame.geometry.dispose();

	outerFlameMaterial.dispose();
	innerFlameMaterial.dispose();
	coreFlameMaterial.dispose();

	ground.geometry.dispose();
	ground.material.dispose();

	techMaterials.forEach(material => material.dispose());
	nodeMaterials.forEach(material => material.dispose());

	techNodeGeometry.dispose();
});
