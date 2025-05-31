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
scene.add(new THREE.AmbientLight(0xffffff, 0.8));




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


// --- towerFloor (Floor of tower)
const radius = 35, segs = 64;
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


// --- Dunes 
const duneHeight = 5, duneRadius = 5, duneSegs = 64;
const coneGeo = new THREE.ConeGeometry(duneRadius, duneHeight, duneSegs);

class dune extends THREE.Mesh{
    dune = new THREE.Mesh(coneGeo, towerFloorMat);
    constructor(x, y, z) {
        super(coneGeo, towerFloorMat);
        this.position.set(x, y, z);
        this.receiveShadow = true;
    }
}
const dune1 = new dune(18, 2.5, 5);   
const dune2 = new dune(-15, 2.5, -7); 
scene.add(dune1);
scene.add(dune2);


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