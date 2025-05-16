import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
const scene = window.scene || new THREE.Scene();

// --- Sky
// Create a vertical gradient canvas
const skyCanvas = document.createElement('canvas');
skyCanvas.width  = 16;
skyCanvas.height = 256;
const ctx = skyCanvas.getContext('2d');
// Define the gradient (0 = top, 1 = bottom)
const gradient = ctx.createLinearGradient(0, 0, 0, skyCanvas.height);
gradient.addColorStop(0, '#003f7f');   // deep blue at top
gradient.addColorStop(1, '#E0FFFF');   // light blue at horizon
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
// Turn it into a Three.js texture
const skyTexture = new THREE.CanvasTexture(skyCanvas);
skyTexture.magFilter = THREE.LinearFilter;  // smoothen upscaling
skyTexture.minFilter = THREE.LinearFilter;
// Apply as scene’s background
scene.background = skyTexture;
scene.fog = new THREE.Fog('#c6b295', 50, 850 );




// --- Lights and Shadow
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(60, 60, 25);

dir.castShadow = true;

dir.shadow.mapSize.width = 2048;
dir.shadow.mapSize.height = 2048;

dir.shadow.radius = 4;

const d = 40;
dir.shadow.camera.near = 1;
dir.shadow.camera.far = 375;
dir.shadow.camera.left = 6*-d;
dir.shadow.camera.right= 6*d;
dir.shadow.camera.top = 6*d;
dir.shadow.camera.bottom = 6*-d;

dir.shadow.camera.updateProjectionMatrix();

scene.add(dir);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));




// --- Texture load
const loader      = new THREE.TextureLoader();
const sandTexture = loader.load('arenaTextures/sandTexture.jpg');
sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping;
sandTexture.repeat.set(8, 8);
const stoneTexture = loader.load('arenaTextures/stoneTexture.jpg');
stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping;
stoneTexture.repeat.set(8,8);
const desertBase = loader.load('arenaTextures/sandTexture.jpg');
desertBase.wrapS = desertBase.wrapT = THREE.RepeatWrapping;
desertBase.repeat.set(32,32);
const sandBrick = loader.load('arenaTextures/sandBrick1.jpg');
sandBrick.wrapS = sandBrick.wrapT = THREE.RepeatWrapping;
sandBrick.repeat.set(32,8);


// --- Floor (Floor of arena)
const radius = 35, segs = 64;
const floorGeo = new THREE.CircleGeometry(radius, segs);
const floorMat = new THREE.MeshStandardMaterial({
  map:       sandTexture,
  color:     0xEED9A2,
  side:      THREE.DoubleSide,
  roughness: 1.0,
  metalness: 0.0
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// === Physics World Setup ===
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
// Create a thin cylinder to approximate the arena's circular floor
const groundBody = new CANNON.Body({
  mass: 0, // static
  shape: new CANNON.Cylinder(radius, radius, 238.21, 64),
  position: new CANNON.Vec3(0, -119.1, 0)
});

world.addBody(groundBody);


// --- Dunes 
const duneHeight = 5, duneRadius = 5, duneSegs = 64;
const coneGeo = new THREE.ConeGeometry(duneRadius, duneHeight, duneSegs);

class dune extends THREE.Mesh{
    dune = new THREE.Mesh(coneGeo, floorMat);
    constructor(x, y, z) {
        super(coneGeo, floorMat);
        this.position.set(x, y, z);
        this.receiveShadow = true;
    }
}
const dune1 = new dune(18, 2.6, 5);
const dune2 = new dune(-15, 2.6, -7);
scene.add(dune1);
scene.add(dune2);


// --- floorSide (side of Pillar)
const floorSideMat = new THREE.MeshStandardMaterial({
  map:       sandBrick,
  color:     0xEED9A2,
  side:      THREE.DoubleSide,
  roughness: 1.0,
  metalness: 0.0
});
const topRadius = 1 + radius;
const bottomRadius = radius * 1.25;
const cylinderGeo = new THREE.CylinderGeometry(topRadius, bottomRadius, 120, segs);
const floorSide = new THREE.Mesh(cylinderGeo, floorSideMat);
floorSide.receiveShadow = true;
floorSide.translateY(-60.01);
scene.add(floorSide);


// --- Base (Floor outside arena)
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
base.translateZ(-120);
scene.add(base);


// --- Cactus model
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
  cactus.position.set(x, -120, z);
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



// --- Distant Mountains
const mountainCount = 100;
const innerRadius   = 830;    
const outerRadius   = 850;    

const mountainGeo = new THREE.ConeGeometry(1, 1, 4);
const mountainMat = new THREE.MeshStandardMaterial({
  color: 0x887766,
  flatShading: true,
  roughness: 1.0,
  metalness: 0.0
});
// one InstancedMesh to draw them all at once
const mountains = new THREE.InstancedMesh(mountainGeo, mountainMat, mountainCount);
const tmp       = new THREE.Object3D();
for (let i = 0; i < mountainCount; i++) {
  // random angle and radius
  const ang  = Math.random() * Math.PI * 2;
  const dist = innerRadius + Math.random() * (outerRadius - innerRadius);

  // random height between 70 and 140 units
  const height = 70 + Math.random() * 70;
  const baseY  = -120;             // same Y as your base plane
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
floor.receiveShadow = true;
floor.castShadow = false;

dune1.receiveShadow = false;
dune1.castShadow = true;
dune2.receiveShadow = false;
dune2.castShadow = true;

floorSide.receiveShadow = false;
floorSide.castShadow = true;

base.receiveShadow = true;
base.castShadow = false;

mountains.receiveShadow = false;
mountains.castShadow = false;

// Global Variable (DO NOT CHANGE)
window.scene = scene;
window.world = world; 

// add to car.js 
/*
car1.castShadow    = true;
car1.receiveShadow = true;
car2.castShadow    = true;
car2.receiveShadow = true;
*/





/*
// --- This is a helper to check out the shadowbox thing
import { CameraHelper, BoxGeometry, MeshLambertMaterial, Mesh } from 'three';

// 1) Visualize the shadow camera frustum
const helper = new CameraHelper(dir.shadow.camera);
scene.add(helper);

// 2) Add a simple box above the floor to cast a clear shadow
const testBox = new Mesh(
  new BoxGeometry(2, 2, 2),
  new MeshLambertMaterial({ color: 0xff0000 })
);
testBox.position.set(0, 1, 0);
testBox.castShadow = true;
testBox.receiveShadow = false;
scene.add(testBox); 
*/