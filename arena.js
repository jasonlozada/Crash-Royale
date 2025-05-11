import * as THREE from 'three';

const scene = window.scene || new THREE.Scene();
window.scene = scene;

scene.background = new THREE.Color(0x87CEEB);
// --- Lights
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(10, 20, 10);
scene.add(dir);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// --- Texture load
const loader      = new THREE.TextureLoader();
const sandTexture = loader.load('arenaTextures/sandTexture.jpg');
sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping;
sandTexture.repeat.set(8, 8);

// --- Floor
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
const dune1 = new dune(18, 2.5, 5);
const dune2 = new dune(-15, 2.5, -7);

scene.add(dune1);
scene.add(dune2);

// --- 
