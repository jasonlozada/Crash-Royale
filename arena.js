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
dir.shadow.bias = -0.001;
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
towerFloor.position.set(0, 0.5, 0);
towerFloor.receiveShadow = true;
scene.add(towerFloor);

// Assign to towerFloor
towerFloor.material.map = sandTexture;
towerFloor.material.needsUpdate = true;


// --- Conveyor Belts (Boosters) ---
const conveyorBelts = [];
const conveyorLength = 10;
const conveyorWidth = 5;
const conveyorHeight = 0.2;
const conveyorMat = new THREE.MeshStandardMaterial({
  map: conveyorTexture,
  color: 0xffffff, // keep white to preserve GIF colors
  roughness: 0.5,
  metalness: 0.3,
  side: THREE.DoubleSide
});
// Place 4 belts at 90-degree intervals around the towerFloor edge
for (let i = 0; i < 4; i++) {
  const angle = i * Math.PI / 2;
  const r = radius * 0.65; // slightly inside the edge
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;
  const beltGeo = new THREE.BoxGeometry(conveyorLength, conveyorHeight, conveyorWidth);
  const belt = new THREE.Mesh(beltGeo, conveyorMat);
  belt.position.set(x, 0.6, z); // 0.6 to sit just above towerFloor
  belt.rotation.y = -angle;
  belt.receiveShadow = true;
  belt.castShadow = true;
  belt.userData.boostDir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
  conveyorBelts.push(belt);
  scene.add(belt);
  belt.material.map.rotation = Math.PI / 2; // Rotate 90 degrees
belt.material.map.center.set(0.5, 0.5);   // Rotate around center
belt.material.needsUpdate = true;
}



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

/*class dune extends THREE.Mesh{
    constructor(x, y, z) {
        super(coneGeo, duneMat);
        this.position.set(x, y, z);
        this.receiveShadow = true;
      }
}
const dune1 = new dune(18, 2.5, 5);   
const dune2 = new dune(-15, 2.5, -7); 
scene.add(dune1);
scene.add(dune2);*/

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
    const towerRadius = ARENA_RADIUS + 1;
    const towerHeight = 80.0;      // matches CylinderGeometry height

    const towerShape = new Ammo.btCylinderShape(
      new Ammo.btVector3(towerRadius, towerHeight / 2, towerRadius)
    );

    const towerTransform = new Ammo.btTransform();
    towerTransform.setIdentity();
    towerTransform.setOrigin(new Ammo.btVector3(0, -40.0, 0)); // center of cylinder

    const towerMotionState = new Ammo.btDefaultMotionState(towerTransform);
    const towerMass = 0; // static
    const towerInertia = new Ammo.btVector3(0, 0, 0);

    const towerRbInfo = new Ammo.btRigidBodyConstructionInfo(
      towerMass, towerMotionState, towerShape, towerInertia
    );
    const towerBody = new Ammo.btRigidBody(towerRbInfo);
    towerBody.setFriction(1.0);
    physicsWorld.addRigidBody(towerBody);
    
    const duneMat = new THREE.MeshStandardMaterial({
      map: sandTexture,
      color: 0xEED9A2,
      side: THREE.DoubleSide,
      roughness: 1.0,
      metalness: 0.0
    });
    const duneHeight = 5, duneRadius = 5, duneSegs = 64;
    const coneGeo = new THREE.ConeGeometry(duneRadius, duneHeight, duneSegs);
    
    const numDunes = 40;
    const duneSpread = 600;
    for (let i = 0; i < numDunes; i++) {
      const x = (Math.random() * 2 - 1) * duneSpread;
      const z = (Math.random() * 2 - 1) * duneSpread;
      // Place dunes on the base, not on the tower floor
      if (Math.sqrt(x * x + z * z) < radius + 10) continue; // skip if too close to tower
      const y = -79; // match base level
      const dune = new THREE.Mesh(coneGeo, duneMat);
      dune.position.set(x, y, z);
      dune.rotation.y = Math.random() * Math.PI * 2;
      const s = 0.7 + Math.random() * 1.2;
      dune.scale.set(s, s, s);
      dune.castShadow = true;
      dune.receiveShadow = true;
      scene.add(dune);
    }

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
const towerSideGeo = new THREE.CylinderGeometry(topRadius, bottomRadius, 80.4, segs); // height = 80
const towerSide = new THREE.Mesh(towerSideGeo, towerSideMat);
towerSide.receiveShadow = true;
towerSide.translateY(-40.01); 
scene.add(towerSide);

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
base.rotation.x = - Math.PI / 2; // or Math.PI / 2, depending on your up direction
base.position.z = 0;
base.position.y = -80;
scene.add(base);

// --- Cactus Models
const gltfLoader = new GLTFLoader();


gltfLoader.load(
'arenaProps/Cactus.glb',
(gltf) => { 
const proto = gltf.scene;
const numCacti = 65;
const spread = 600;
for (let i = 0; i < numCacti; i++) {
  const cactus = proto.clone(true);
  const x = (Math.random() * 2 - 1) * spread;
  const z = (Math.random() * 2 - 1) * spread;
  cactus.position.set(x, -82, z); 
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



gltfLoader.load(
  'arenaProps/Rock.glb',
  (gltf) => {
    const proto = gltf.scene;
    const numRocks = 30; // Adjust as desired
    const spread = 600;
    for (let i = 0; i < numRocks; i++) {
      const rock = proto.clone(true);
      const x = (Math.random() * 2 - 1) * spread;
      const z = (Math.random() * 2 - 1) * spread;
      rock.position.set(x, -80, z);
      rock.rotation.y = Math.random() * Math.PI * 2;
      // Random scale for height/size
      const s = 3 + Math.random() * 5; // wider range for rocks
      rock.scale.set(s, 3 + Math.random() * 5, s); // randomize Y for height
      rock.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(rock);
    }
  }
);


gltfLoader.load(
  'arenaProps/Boulder.glb',
  (gltf) => {
    const proto = gltf.scene;
    const numBoulders = 20; // Adjust as desired
    const spread = 600;
    for (let i = 0; i < numBoulders; i++) {
      const boulder = proto.clone(true);
      const x = (Math.random() * 2 - 1) * spread;
      const z = (Math.random() * 2 - 1) * spread;
      boulder.position.set(x, -80, z);
      boulder.rotation.y = Math.random() * Math.PI * 2;
      // Random scale for height/size
      const s = 10 + Math.random() * 20; // wider range for rocks
      boulder.scale.set(s, 10 + Math.random() * 20, s); // randomize Y for height
      boulder.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(boulder);
    }
  }
);

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
for (let i = 0; i < 150; i++) {
  const ang = Math.random() * Math.PI * 2;
  const dist = 830 + Math.random() * 100; // distance from center, range from 830 to 930
  const height = 45 + Math.random() * 100; // height range from 45 to 145

  const baseY  = -80;             // updated to match new base level
  tmp.position.set(
    Math.cos(ang) * dist,
    baseY + height * 0.5,         
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

towerSide.receiveShadow = false;
towerSide.castShadow = true;


base.receiveShadow = true;
mountains.castShadow = false;

// Global Variable (DO NOT CHANGE)
window.scene = scene;

window.worldToUV = worldToUV;
window.trailCanvas = trailCanvas;
window.trailCtx = trailCtx;
window.trailTexture = trailTexture;
window.radius = radius;
window.trailCanvasSize = trailCanvasSize;
window.towerFloor = towerFloor;
window.conveyorBelts = conveyorBelts;


