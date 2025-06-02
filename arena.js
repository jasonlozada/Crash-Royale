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
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

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

desertBase.repeat.set(64,64);

const sandBrick = loader.load('arenaTextures/sandBrick1.jpg');
sandBrick.wrapS = sandBrick.wrapT = THREE.RepeatWrapping;
sandBrick.repeat.set(32, 8);


const sandImage = new window.Image();
sandImage.src = 'arenaTextures/sandTexture.jpg';
window.sandImage = sandImage; 

// --- Sand Trail Canvas
const trailCanvasSize = 512;
const trailCanvas = document.createElement('canvas');
trailCanvas.width = trailCanvas.height = trailCanvasSize;
const trailCtx = trailCanvas.getContext('2d');

// Draw the sand texture as the background of the trail canvas

function fillCanvasWithRepeatedImage(ctx, img, canvasSize, repeatCount = 16) {
  // repeatCount: how many times the image repeats across the canvas
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
  fillCanvasWithRepeatedImage(trailCtx, window.sandImage, trailCanvasSize, 4); // 4 = repeat 4x4
  } else {
  window.sandImage.onload = () => {
    fillCanvasWithRepeatedImage(trailCtx, window.sandImage, trailCanvasSize, 4);
  };
}

// Fill with white (no trail)
//trailCtx.fillStyle = '#fff';
//trailCtx.fillRect(0, 0, trailCanvasSize, trailCanvasSize);

const trailTexture = new THREE.CanvasTexture(trailCanvas);
trailTexture.wrapS = trailTexture.wrapT = THREE.ClampToEdgeWrapping;
trailTexture.needsUpdate = true;

const radius = 35, segs = 64;

// Helper for mapping world XZ to canvas UV
function worldToUV(x, z) {
  // towerFloor is centered at (0,0), radius = 35
  const u = (x / (radius * 2)) + 0.5;
  const v = (z / (radius * 2)) + 0.5;
  return [u, v];
}

// --- towerFloor (Floor of tower)

const towerFloorGeo = new THREE.CircleGeometry(radius, segs);
const towerFloorMat = new THREE.MeshStandardMaterial({
  map:       sandTexture,
  color:     0xEED9A2,
  side:      THREE.DoubleSide,
  roughness: 1.0,
  metalness: 0.0
});
const towerFloor = new THREE.Mesh(towerFloorGeo, towerFloorMat);
towerFloor.rotation.x = -Math.PI / 2;
towerFloor.receiveShadow = true;
scene.add(towerFloor);

// Assign to towerFloor
towerFloor.material.map = trailTexture;
towerFloor.material.needsUpdate = true;

// --- Dunes 
const duneMat = new THREE.MeshStandardMaterial({
  map: sandTexture,
  color: 0xEED9A2,
  side: THREE.DoubleSide,
  roughness: 1.0,
  metalness: 0.0
});

const duneHeight = 5, duneRadius = 5, duneSegs = 64;
const coneGeo = new THREE.ConeGeometry(duneRadius, duneHeight, duneSegs);

class dune extends THREE.Mesh{
    constructor(x, y, z) {
        super(coneGeo, duneMat);
        this.position.set(x, y, z);
        this.receiveShadow = true;
      }
}
const dune1 = new dune(18, 2.5, 5);   
const dune2 = new dune(-15, 2.5, -7); 
scene.add(dune1);
scene.add(dune2);

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




// --- towerSide (side of tower)
const towerSideMat = new THREE.MeshStandardMaterial({
  map:       sandBrick,
  color:     0xEED9A2,
  side:      THREE.DoubleSide,
  roughness: 1.0,
  metalness: 0.0
});
const topRadius = 1 + radius;
const bottomRadius = topRadius; // Make the cylinder straight
const towerSideGeo = new THREE.CylinderGeometry(topRadius, bottomRadius, 80, segs); // height = 80
const towerSide = new THREE.Mesh(towerSideGeo, towerSideMat);
towerSide.receiveShadow = true;
towerSide.translateY(-40.01); 
scene.add(towerSide);

// === Physics World Setup ===
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
// Create a cylinder to match the tower (including towerFloor)
const groundBody = new CANNON.Body({
  mass: 0, // static
  shape: new CANNON.Cylinder(topRadius, topRadius, 80, segs), // match tower
  position: new CANNON.Vec3(0, -40, 0) // center matches tower mesh
});

world.addBody(groundBody);


// --- Base (Floor outside tower)
const width = 5000, height = 5000;
const baseGeo = new THREE.PlaneGeometry(width, height, 64, 64);

const baseMat = new THREE.MeshStandardMaterial({
  map:       desertBase,
  color:     0xEED9A2,
  side:      THREE.DoubleSide,
  roughness: 1.0,
  metalness: 0.0
});
const base = new THREE.Mesh(baseGeo, baseMat);
base.rotateX(3* Math.PI/2);
base.translateZ(-80); 
scene.add(base);

// --- Cactus Models
const gltfLoader = new GLTFLoader();


gltfLoader.load(
'arenaProps/Cactus.glb',
(gltf) => { 
const proto = gltf.scene;
const numCacti = 40;
const spread = 600;
for (let i = 0; i < numCacti; i++) {
  const cactus = proto.clone(true);
  const x = (Math.random() * 2 - 1) * spread;
  const z = (Math.random() * 2 - 1) * spread;
  cactus.position.set(x, -80, z); 
  cactus.rotation.y = Math.random() * Math.PI * 2;
  const s = 0.5 + Math.random() * 1.5;
  cactus.scale.set(s, s, s);

   cactus.traverse((child) => {
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

  const baseY  = -80;             // updated to match new base level
  tmp.position.set(
    Math.cos(ang) * dist,
    baseY + height * 0.5,           // raise so half the cone sits below the apex
    Math.sin(ang) * dist
  );
  // scale cone so its height is `height`
  // original geo is height=1, radius=1, so scale Y by `height`
  tmp.scale.set(height * 0.6, height, height * 0.6); 
  tmp.rotation.y = Math.random() * Math.PI;  // random rotation

  tmp.updateMatrix();
  mountains.setMatrixAt(i, tmp.matrix);
}
scene.add(mountains);



// --- adding shadows to objects
towerFloor.receiveShadow = true;
towerFloor.castShadow = false;

dune1.receiveShadow = false;
dune1.castShadow = true;
dune2.receiveShadow = false;
dune2.castShadow = true;

towerSide.receiveShadow = false;
towerSide.castShadow = true;


base.receiveShadow = true;
mountains.castShadow = false;

// Global Variable (DO NOT CHANGE)
window.scene = scene;
window.world = world; 

window.worldToUV = worldToUV;
window.trailCanvas = trailCanvas;
window.trailCtx = trailCtx;
window.trailTexture = trailTexture;
window.radius = radius;
window.trailCanvasSize = trailCanvasSize;


