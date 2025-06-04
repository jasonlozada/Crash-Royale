// arena.js — Arena Scene Initialization

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// === Scene Setup ===
const scene = window.scene || new THREE.Scene();
window.scene = scene;

// === Sky and Fog ===
const skyCanvas = document.createElement('canvas');
skyCanvas.width = 16;
skyCanvas.height = 256;
const ctx = skyCanvas.getContext('2d');
const gradient = ctx.createLinearGradient(0, 0, 0, skyCanvas.height);
gradient.addColorStop(0, '#003f7f');
gradient.addColorStop(1, '#E0FFFF');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
const skyTexture = new THREE.CanvasTexture(skyCanvas);
skyTexture.magFilter = THREE.LinearFilter;
skyTexture.minFilter = THREE.LinearFilter;
scene.background = skyTexture;
scene.fog = new THREE.Fog('#c6b295', 50, 850);

// === Lighting ===
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(60, 60, 25);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.bias = -0.001;
Object.assign(dir.shadow.camera, {
  near: 1,
  far: 375,
  left: -240,
  right: 240,
  top: 240,
  bottom: -240
});
dir.shadow.camera.updateProjectionMatrix();
scene.add(dir);
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

// === Texture Loading ===
const loader = new THREE.TextureLoader();
const sandTexture = loader.load('arenaTextures/sandTexture.jpg');
sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping;
sandTexture.repeat.set(8, 8);

const stoneTexture = loader.load('arenaTextures/stoneTexture.jpg');
stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping;
stoneTexture.repeat.set(8, 8);

const desertBase = loader.load('arenaTextures/sandTexture.jpg');
desertBase.wrapS = desertBase.wrapT = THREE.RepeatWrapping;
desertBase.repeat.set(64, 64);

const sandBrick = loader.load('arenaTextures/sandBrick1.jpg');
sandBrick.wrapS = sandBrick.wrapT = THREE.RepeatWrapping;
sandBrick.repeat.set(32, 8);

// === Conveyor Belt Video Texture ===
const conveyorVideo = document.createElement('video');
conveyorVideo.src = 'arenaTextures/conveyorBelt.mp4';
conveyorVideo.loop = true;
conveyorVideo.muted = true;
conveyorVideo.playsInline = true;
conveyorVideo.autoplay = true;
conveyorVideo.crossOrigin = 'anonymous';
conveyorVideo.load();
conveyorVideo.play();

const conveyorTexture = new THREE.VideoTexture(conveyorVideo);
conveyorTexture.wrapS = THREE.RepeatWrapping;
conveyorTexture.wrapT = THREE.RepeatWrapping;
conveyorTexture.repeat.set(1, 1);

// === Trail Canvas ===
const sandImage = new window.Image();
sandImage.src = 'arenaTextures/sandTexture.jpg';
window.sandImage = sandImage;

const trailCanvasSize = 512;
const trailCanvas = document.createElement('canvas');
trailCanvas.width = trailCanvas.height = trailCanvasSize;
const trailCtx = trailCanvas.getContext('2d');

function fillCanvasWithRepeatedImage(ctx, img, canvasSize, repeatCount = 16) {
  const tileSize = canvasSize / repeatCount;
  for (let y = 0; y < repeatCount; ++y) {
    for (let x = 0; x < repeatCount; ++x) {
      ctx.drawImage(img, 0, 0, img.width, img.height,
        x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
}
window.fillCanvasWithRepeatedImage = fillCanvasWithRepeatedImage;

if (window.sandImage.complete) {
  fillCanvasWithRepeatedImage(trailCtx, window.sandImage, trailCanvasSize, 4);
} else {
  window.sandImage.onload = () => {
    fillCanvasWithRepeatedImage(trailCtx, window.sandImage, trailCanvasSize, 4);
  };
}

const trailTexture = new THREE.CanvasTexture(trailCanvas);
trailTexture.wrapS = trailTexture.wrapT = THREE.ClampToEdgeWrapping;
trailTexture.needsUpdate = true;

// === UV Mapping Helper ===
const radius = 35;
function worldToUV(x, z) {
  const u = (x / (radius * 2)) + 0.5;
  const v = (z / (radius * 2)) + 0.5;
  return [u, v];
}

// === Arena Floor ===
const towerFloorGeo = new THREE.CircleGeometry(radius, 64);
const towerFloorMat = new THREE.MeshStandardMaterial({
  map: sandTexture,
  color: 0xEED9A2,
  side: THREE.DoubleSide,
  roughness: 1.0,
  metalness: 0.0
});
const towerFloor = new THREE.Mesh(towerFloorGeo, towerFloorMat);
towerFloor.rotation.x = -Math.PI / 2;
towerFloor.position.set(0, 0.5, 0);
towerFloor.receiveShadow = true;
scene.add(towerFloor);

// === Conveyor Belts ===
const conveyorBelts = [];
const conveyorLength = 10;
const conveyorWidth = 5;
const conveyorHeight = 0.2;
const conveyorMat = new THREE.MeshStandardMaterial({
  map: conveyorTexture,
  color: 0xffffff,
  roughness: 0.5,
  metalness: 0.3,
  side: THREE.DoubleSide
});
for (let i = 0; i < 4; i++) {
  const angle = i * Math.PI / 2;
  const r = radius * 0.65;
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;
  const beltGeo = new THREE.BoxGeometry(conveyorLength, conveyorHeight, conveyorWidth);
  const belt = new THREE.Mesh(beltGeo, conveyorMat);
  belt.position.set(x, 0.6, z);
  belt.rotation.y = -angle;
  belt.receiveShadow = true;
  belt.castShadow = true;
  belt.userData.boostDir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
  belt.material.map.rotation = Math.PI / 2;
  belt.material.map.center.set(0.5, 0.5);
  belt.material.needsUpdate = true;
  conveyorBelts.push(belt);
  scene.add(belt);
}

// === Ammo.js Physics World ===
let physicsWorld;

if (typeof window.Ammo === 'function') {
  window.Ammo().then(Ammo => {
    window.Ammo = Ammo;

    const collisionConfig = new Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new Ammo.btCollisionDispatcher(collisionConfig);
    const broadphase = new Ammo.btDbvtBroadphase();
    const solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfig);
    physicsWorld.setGravity(new Ammo.btVector3(0, -9.82, 0));
    window.physicsWorld = physicsWorld;

    // === Tower Base Physics ===
    const towerRadius = radius + 1;
    const towerHeight = 80.0;
    const towerShape = new Ammo.btCylinderShape(new Ammo.btVector3(towerRadius, towerHeight / 2, towerRadius));
    const towerTransform = new Ammo.btTransform();
    towerTransform.setIdentity();
    towerTransform.setOrigin(new Ammo.btVector3(0, -40.0, 0));
    const towerMotionState = new Ammo.btDefaultMotionState(towerTransform);
    const towerRbInfo = new Ammo.btRigidBodyConstructionInfo(0, towerMotionState, towerShape, new Ammo.btVector3(0, 0, 0));
    const towerBody = new Ammo.btRigidBody(towerRbInfo);
    towerBody.setFriction(1.0);
    physicsWorld.addRigidBody(towerBody);

    // === Random Dunes ===
    const duneMat = new THREE.MeshStandardMaterial({ map: sandTexture, color: 0xEED9A2, side: THREE.DoubleSide, roughness: 1.0, metalness: 0.0 });
    const coneGeo = new THREE.ConeGeometry(5, 5, 64);
    const numDunes = 40, duneSpread = 600;
    for (let i = 0; i < numDunes; i++) {
      const x = (Math.random() * 2 - 1) * duneSpread;
      const z = (Math.random() * 2 - 1) * duneSpread;
      if (Math.sqrt(x * x + z * z) < radius + 10) continue;
      const dune = new THREE.Mesh(coneGeo, duneMat);
      dune.position.set(x, -79, z);
      dune.rotation.y = Math.random() * Math.PI * 2;
      const s = 0.7 + Math.random() * 1.2;
      dune.scale.set(s, s, s);
      dune.castShadow = dune.receiveShadow = true;
      scene.add(dune);
    }

    console.log("Ammo.js physics world initialized");
  }).catch(err => console.error('Failed to load Ammo.js:', err));
} else {
  console.error('Ammo not loaded. Make sure ammo.js is available globally.');
}

// === Tower Side Wall ===
const towerSideGeo = new THREE.CylinderGeometry(36, 36, 80.4, 64);
const towerSideMat = new THREE.MeshStandardMaterial({
  map: sandBrick,
  color: 0xEED9A2,
  side: THREE.DoubleSide,
  roughness: 1.0,
  metalness: 0.0
});
const towerSide = new THREE.Mesh(towerSideGeo, towerSideMat);
towerSide.receiveShadow = false;
towerSide.castShadow = true;
towerSide.translateY(-40.01);
scene.add(towerSide);

// === Arena Base Ground ===
const baseGeo = new THREE.PlaneGeometry(5000, 5000, 64, 64);
const baseMat = new THREE.MeshStandardMaterial({
  map: desertBase,
  color: 0xEED9A2,
  side: THREE.DoubleSide,
  roughness: 1.0,
  metalness: 0.0
});
const base = new THREE.Mesh(baseGeo, baseMat);
base.rotation.x = -Math.PI / 2;
base.position.y = -80;
scene.add(base);

// === Load GLB Props (Cactus, Rock, Boulder) ===
const gltfLoader = new GLTFLoader();
function loadProps(path, count, scaleRange, yOffset) {
  gltfLoader.load(path, (gltf) => {
    const proto = gltf.scene;
    for (let i = 0; i < count; i++) {
      const inst = proto.clone(true);
      const x = (Math.random() * 2 - 1) * 600;
      const z = (Math.random() * 2 - 1) * 600;
      inst.position.set(x, yOffset, z);
      inst.rotation.y = Math.random() * Math.PI * 2;
      const s = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);
      inst.scale.set(s, s, s);
      inst.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = child.receiveShadow = true;
        }
      });
      scene.add(inst);
    }
  });
}
loadProps('arenaProps/Cactus.glb', 65, [0.5, 2.0], -82);
loadProps('arenaProps/Rock.glb', 30, [3, 8], -80);
loadProps('arenaProps/Boulder.glb', 20, [10, 30], -80);

// === Distant Mountains ===
const mountainGeo = new THREE.ConeGeometry(1, 1, 4);
const mountainMat = new THREE.MeshStandardMaterial({
  color: 0x887766,
  flatShading: true,
  roughness: 1.0,
  metalness: 0.0
});
const mountains = new THREE.InstancedMesh(mountainGeo, mountainMat, 125);
const tmp = new THREE.Object3D();
for (let i = 0; i < 150; i++) {
  const ang = Math.random() * Math.PI * 2;
  const dist = 830 + Math.random() * 100;
  const height = 45 + Math.random() * 100;
  tmp.position.set(
    Math.cos(ang) * dist,
    -80 + height * 0.5,
    Math.sin(ang) * dist
  );
  tmp.scale.set(height * 0.6, height, height * 0.6);
  tmp.rotation.y = Math.random() * Math.PI;
  tmp.updateMatrix();
  mountains.setMatrixAt(i, tmp.matrix);
}
scene.add(mountains);

// === Final Shadow Config ===
towerFloor.receiveShadow = true;
towerSide.castShadow = true;
base.receiveShadow = true;

// === Global Arena Exports ===
window.scene = scene;
window.worldToUV = worldToUV;
window.trailCanvas = trailCanvas;
window.trailCtx = trailCtx;
window.trailTexture = trailTexture;
window.radius = radius;
window.trailCanvasSize = trailCanvasSize;
window.towerFloor = towerFloor;
window.conveyorBelts = conveyorBelts;
