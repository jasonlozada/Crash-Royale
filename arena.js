import * as THREE from 'three';

// Create scene
const scene = new THREE.Scene();

// Load ground texture
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load('https://threejs.org/examples/textures/checker.png');
groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(100, 100);

const groundMaterial = new THREE.MeshPhongMaterial({ map: groundTexture, side: THREE.DoubleSide });
const groundGeometry = new THREE.PlaneGeometry(500, 500);
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);
const ambient = new THREE.AmbientLight(0x404040);
scene.add(ambient);

// Export scene and groundTexture globally so main.js can access
window.scene = scene;
<<<<<<< HEAD
window.groundTexture = groundTexture;
=======
window.groundTexture = groundTexture;
>>>>>>> dc4d1fca2bf81eca1b9f6e14458c2827165b1083
