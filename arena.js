import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const scene = window.scene || new THREE.Scene();
window.scene = scene;

// --- Sky
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

// --- Lights
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(60, 60, 25);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.ARENA_RADIUS = 4;
const d = 40;
Object.assign(dir.shadow.camera, {
  near: 1,
  far: 375,
  left: -6 * d,
  right: 6 * d,
  top: 6 * d,
  bottom: -6 * d
});
dir.shadow.camera.updateProjectionMatrix();
scene.add(dir);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// --- Textures
const loader = new THREE.TextureLoader();
const sandTexture = loader.load('arenaTextures/sandTexture.jpg');
sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping;
sandTexture.repeat.set(8, 8);

const stoneTexture = loader.load('arenaTextures/stoneTexture.jpg');
stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping;
stoneTexture.repeat.set(8, 8);

const desertBase = loader.load('arenaTextures/sandTexture.jpg');
desertBase.wrapS = desertBase.wrapT = THREE.RepeatWrapping;
desertBase.repeat.set(32, 32);

const sandBrick = loader.load('arenaTextures/sandBrick1.jpg');
sandBrick.wrapS = sandBrick.wrapT = THREE.RepeatWrapping;
sandBrick.repeat.set(32, 8);

// --- Floor
const ARENA_RADIUS = 35, segs = 64;
const floorGeo = new THREE.CircleGeometry(ARENA_RADIUS, segs);
const floorMat = new THREE.MeshStandardMaterial({
  map: sandTexture,
  color: 0xEED9A2,
  side: THREE.DoubleSide,
  roughness: 1.0,
  metalness: 0.0
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);


// === Ammo.js Physics Initialization ===
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
    
    const ARENA_RADIUS = 35;
    const GROUND_HEIGHT = 0.2;

    // Arena Ground Body
    const groundShape = new Ammo.btBoxShape(
      new Ammo.btVector3(ARENA_RADIUS, GROUND_HEIGHT / 2, ARENA_RADIUS)
    );

    const groundTransform = new Ammo.btTransform();
    groundTransform.setIdentity();
    groundTransform.setOrigin(new Ammo.btVector3(0, -GROUND_HEIGHT / 2, 0)); // y=0 top surface

    const groundMotionState = new Ammo.btDefaultMotionState(groundTransform);
    const groundRbInfo = new Ammo.btRigidBodyConstructionInfo(
      0, groundMotionState, groundShape, new Ammo.btVector3(0, 0, 0)
    );
    const groundBody = new Ammo.btRigidBody(groundRbInfo);
    groundBody.setFriction(1.0);
    physicsWorld.addRigidBody(groundBody);
        console.log("Ammo.js physics world initialized");
      }).catch(err => {
        console.error('Failed to load Ammo.js:', err);
      });
} else {
  console.error('Ammo not loaded. Make sure ammo.js is available globally.');
}

// --- Dunes
const coneGeo = new THREE.ConeGeometry(5, 5, segs);
class Dune extends THREE.Mesh {
  constructor(x, y, z) {
    super(coneGeo, floorMat);
    this.position.set(x, y, z);
    this.receiveShadow = true;
  }
}
scene.add(new Dune(18, 2.6, 5));
scene.add(new Dune(-15, 2.6, -7));

// --- Side Wall
const floorSideMat = new THREE.MeshStandardMaterial({
  map: sandBrick,
  color: 0xEED9A2,
  side: THREE.DoubleSide,
  roughness: 1.0,
  metalness: 0.0
});
const floorSide = new THREE.Mesh(
  new THREE.CylinderGeometry(ARENA_RADIUS + 1, ARENA_RADIUS * 1.25, 120, segs),
  floorSideMat
);
floorSide.receiveShadow = true;
floorSide.position.y = -60.01;
scene.add(floorSide);

// --- Outer Ground
const base = new THREE.Mesh(
  new THREE.PlaneGeometry(5000, 5000, 64, 64),
  new THREE.MeshStandardMaterial({
    map: desertBase,
    color: 0xEED9A2,
    side: THREE.DoubleSide,
    roughness: 1.0,
    metalness: 0.0
  })
);
base.rotation.x = -Math.PI / 2;
base.position.y = -120;
scene.add(base);

// --- Cactus Models
const gltfLoader = new GLTFLoader();
gltfLoader.load('arenaProps/Cactus.glb', (gltf) => {
  const proto = gltf.scene;
  for (let i = 0; i < 40; i++) {
    const cactus = proto.clone(true);
    cactus.position.set((Math.random() * 2 - 1) * 600, -120, (Math.random() * 2 - 1) * 600);
    cactus.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.5 + Math.random() * 1.5;
    cactus.scale.set(scale, scale, scale);
    cactus.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(cactus);
  }
});

// --- Mountains
const mountainGeo = new THREE.ConeGeometry(1, 1, 4);
const mountainMat = new THREE.MeshStandardMaterial({
  color: 0x887766,
  flatShading: true,
  roughness: 1.0,
  metalness: 0.0
});
const mountains = new THREE.InstancedMesh(mountainGeo, mountainMat, 100);
const tmp = new THREE.Object3D();
for (let i = 0; i < 100; i++) {
  const ang = Math.random() * Math.PI * 2;
  const dist = 830 + Math.random() * 20;
  const height = 70 + Math.random() * 70;
  tmp.position.set(Math.cos(ang) * dist, -120 + height / 2, Math.sin(ang) * dist);
  tmp.scale.set(height * 0.6, height, height * 0.6);
  tmp.rotation.y = Math.random() * Math.PI;
  tmp.updateMatrix();
  mountains.setMatrixAt(i, tmp.matrix);
}
scene.add(mountains);

// --- Shadow Configs
floor.receiveShadow = true;
floor.castShadow = false;
floorSide.castShadow = true;
base.receiveShadow = true;
mountains.castShadow = false;
mountains.receiveShadow = false;
