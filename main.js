import * as THREE from 'three';

// --- Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Cameras
const camera1 = new THREE.PerspectiveCamera(75, window.innerWidth / (2 * window.innerHeight), 0.1, 1000);
const camera2 = new THREE.PerspectiveCamera(75, window.innerWidth / (2 * window.innerHeight), 0.1, 1000);

// --- Cars
const carGeometry = new THREE.BoxGeometry(2, 1, 4);
const carMaterial1 = new THREE.MeshPhongMaterial({ color: 0xff0000 });
const carMaterial2 = new THREE.MeshPhongMaterial({ color: 0x0000ff });

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
  //groundTexture.offset.x = car.position.x * 0.01;
  //groundTexture.offset.y = car.position.z * 0.01;
}

animate();

// --- Resize
window.addEventListener('resize', () => {
  camera1.aspect = window.innerWidth / (2 * window.innerHeight);
  camera1.updateProjectionMatrix();
  camera2.aspect = window.innerWidth / (2 * window.innerHeight);
  camera2.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
