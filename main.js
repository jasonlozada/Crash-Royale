import * as THREE from 'three';

// main.js

// Camera & Renderer
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Car (placeholder cube)
const carGeometry = new THREE.BoxGeometry(2, 1, 4);
const carMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
const car = new THREE.Mesh(carGeometry, carMaterial);
car.position.y = 0.5;
scene.add(car);  // use scene from arena.js

// Movement variables
let speed = 0;
const acceleration = 0.02;
const maxSpeed = 0.5;
const turnSpeed = 0.03;
let direction = 0;

// Keyboard controls
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

function animate() {
  requestAnimationFrame(animate);

  // Get camera forward and right vectors
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  cameraDirection.y = 0;
  cameraDirection.normalize();

  const rightVector = new THREE.Vector3();
  rightVector.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();

  let moveDirection = new THREE.Vector3();

  if (keys['w']) moveDirection.add(cameraDirection);
  if (keys['s']) moveDirection.sub(cameraDirection);
  if (keys['a']) moveDirection.sub(rightVector);
  if (keys['d']) moveDirection.add(rightVector);

  if (moveDirection.lengthSq() > 0) {
    moveDirection.normalize();
    speed = Math.min(speed + acceleration, maxSpeed);
  } else {
    speed *= 0.98;
  }

  car.position.add(moveDirection.multiplyScalar(speed));

  if (speed > 0.001) {
    car.lookAt(car.position.clone().add(moveDirection));
  }

  const camDistance = 10;
  const camHeight = 5;
  const behindVector = cameraDirection.clone().multiplyScalar(-camDistance);
  camera.position.copy(car.position).add(behindVector).add(new THREE.Vector3(0, camHeight, 0));
  camera.lookAt(car.position);

  // Move ground texture to simulate movement
  groundTexture.offset.x = car.position.x * 0.01;
  groundTexture.offset.y = car.position.z * 0.01;

  renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

