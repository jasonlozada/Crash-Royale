import * as THREE from 'three';

<<<<<<< HEAD
// Camera & Renderer
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
=======
// --- Renderer
>>>>>>> dc4d1fca2bf81eca1b9f6e14458c2827165b1083
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

<<<<<<< HEAD
// Car (placeholder cube)
const carGeometry = new THREE.BoxGeometry(2, 1, 4);
const carMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
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
=======
// --- Cameras
const camera1 = new THREE.PerspectiveCamera(75, window.innerWidth / (2 * window.innerHeight), 0.1, 1000);
const camera2 = new THREE.PerspectiveCamera(75, window.innerWidth / (2 * window.innerHeight), 0.1, 1000);

// --- Cars
const carGeometry = new THREE.BoxGeometry(2, 1, 4);
const carMaterial1 = new THREE.MeshPhongMaterial({ color: 0xff0000 });
const carMaterial2 = new THREE.MeshPhongMaterial({ color: 0x0000ff });
>>>>>>> dc4d1fca2bf81eca1b9f6e14458c2827165b1083

const car1 = new THREE.Mesh(carGeometry, carMaterial1);
const car2 = new THREE.Mesh(carGeometry, carMaterial2);

car1.position.set(0, 0.5, 0);
car2.position.set(10, 0.5, 0);

scene.add(car1);
scene.add(car2);

// --- Controls
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// --- Movement variables
const state1 = { speed: 0, dir: 0 };
const state2 = { speed: 0, dir: 0 };
const acceleration = 0.02;
const maxSpeed = 0.5;
const turnSpeed = 0.03;

// --- Animate
function animate() {
  requestAnimationFrame(animate);

<<<<<<< HEAD
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
=======
  updateCar(car1, camera1, keys, 'w', 's', 'a', 'd', state1);
  updateCar(car2, camera2, keys, 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', state2);

  renderer.setScissorTest(true);

  // Left viewport
  renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
  renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight);
  renderer.render(scene, camera1);

  // Right viewport
  renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
  renderer.setScissor(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
  renderer.render(scene, camera2);

  renderer.setScissorTest(false);
}

// --- Update function for each car
function updateCar(car, camera, keys, forwardKey, backwardKey, leftKey, rightKey, state) {
  // Movement input
  if (keys[forwardKey]) state.speed = Math.min(state.speed + acceleration, maxSpeed);
  else if (keys[backwardKey]) state.speed = Math.max(state.speed - acceleration, -maxSpeed);
  else state.speed *= 0.98; // friction

  if (keys[leftKey]) state.dir += turnSpeed;
  if (keys[rightKey]) state.dir -= turnSpeed;

  // Update position
  car.rotation.y = state.dir;
  car.position.x += Math.sin(state.dir) * state.speed;
  car.position.z += Math.cos(state.dir) * state.speed;

  // Camera follow
  const camDistance = 10;
  const camHeight = 5;
  const camOffsetX = Math.sin(state.dir) * -camDistance;
  const camOffsetZ = Math.cos(state.dir) * -camDistance;
  camera.position.x = car.position.x + camOffsetX;
  camera.position.y = car.position.y + camHeight;
  camera.position.z = car.position.z + camOffsetZ;
  camera.lookAt(car.position);

  // Move arena texture to simulate motion
  groundTexture.offset.x = car.position.x * 0.01;
  groundTexture.offset.y = car.position.z * 0.01;
>>>>>>> dc4d1fca2bf81eca1b9f6e14458c2827165b1083
}

animate();

<<<<<<< HEAD
// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
=======
// --- Resize
window.addEventListener('resize', () => {
  camera1.aspect = window.innerWidth / (2 * window.innerHeight);
  camera1.updateProjectionMatrix();
  camera2.aspect = window.innerWidth / (2 * window.innerHeight);
  camera2.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

>>>>>>> dc4d1fca2bf81eca1b9f6e14458c2827165b1083
