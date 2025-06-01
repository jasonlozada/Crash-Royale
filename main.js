import * as THREE from 'three';
import { loadCarModel, setupCarPhysics, wrapWheelInPivot } from './car.js';

// === Renderer Setup ===
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// === Camera Setup for Split Screen ===
const camera1 = new THREE.PerspectiveCamera(75, window.innerWidth / (2 * window.innerHeight), 0.1, 1000);
camera1.position.set(0, 5, -10);
const camera2 = new THREE.PerspectiveCamera(75, window.innerWidth / (2 * window.innerHeight), 0.1, 1000);
camera2.position.set(0, 5, -10);

// === Input Tracking ===
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// === HUD Setup ===
function createCoordDisplay(leftOffset) {
  const div = document.createElement('div');
  div.className = 'coord-display';
  div.style.position = 'fixed';
  div.style.color = 'white';
  div.style.fontFamily = 'monospace';
  div.style.fontSize = '8px';
  div.style.top = '10px';
  div.style.left = `${leftOffset}px`;
  div.style.zIndex = '10';
  document.body.appendChild(div);
  return div;
}
const coordDisplay1 = createCoordDisplay(10);
const coordDisplay2 = createCoordDisplay(window.innerWidth / 2 + 10);

function createSpeedLabel(rightOffset) {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.color = 'white';
  div.style.fontFamily = 'monospace';
  div.style.fontSize = '10px';
  div.style.bottom = '10px';
  div.style.right = `${rightOffset}px`;
  div.style.zIndex = '10';
  document.body.appendChild(div);
  return div;
}
const speedLabel1 = createSpeedLabel(window.innerWidth / 2 + 10);
const speedLabel2 = createSpeedLabel(10);

// === State Objects for Car Controls ===
const state1 = { speed: 0, dir: 0, steering: 0, accelTimer: 0,  camOffset: new THREE.Vector3(0, 5, -10)};
const state2 = { speed: 0, dir: 0, steering: 0, accelTimer: 0,  camOffset: new THREE.Vector3(0, 5, -10)};

let physicsWorld;
let car1 = null;
let car2 = null;
let car1Loaded = false;
let car2Loaded = false;

function checkCarsReady() {
  if (car1Loaded && car2Loaded) {
    animate();
  }
}


function updateCar(car, keys, fw, bw, left, right, state, camera) {
  if (!car || !car.physicsBody) return;

  const body = car.physicsBody;

  // === Constants ===
  const wheelRadius = 0.4;
  const maxAccelerationForce = 2500;
  const maxSpeed = 40;
  const steerTorque = 250;
  const steerLerpRate = 0.15;
  const lateralFrictionFactor = 100;
  const ARENA_RADIUS = 35;

  const velocity = body.getLinearVelocity();
  const quaternion = car.quaternion;

  // === Basis Vectors ===
  const forwardVec = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
  const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();

  // === Acceleration Timer & Sign ===
  let accelSign = 0;
  if (keys[fw]) {
    accelSign = 1;
    state.accelTimer = (state.accelTimer || 0) + 1;
  } else if (keys[bw]) {
    accelSign = -1;
    state.accelTimer = (state.accelTimer || 0) + 1;
  } else {
    state.accelTimer = Math.max(0, (state.accelTimer || 0) * 0.9);
  }

  // === Apply Central Force (Forward/Backward) ===
  if (accelSign !== 0) {
    const t = state.accelTimer / 60;
    const accel = maxAccelerationForce * (1 - Math.exp(-2.5 * t));
    const totalForce = accelSign * accel;

    const fx = forwardVec.x * totalForce;
    const fz = forwardVec.z * totalForce;

    const horizontalSpeed = Math.sqrt(velocity.x() ** 2 + velocity.z() ** 2);
    const movingOpposite = accelSign * forwardVec.dot(new THREE.Vector3(velocity.x(), 0, velocity.z())) < 0;

    if (horizontalSpeed < maxSpeed || movingOpposite) {
      const force = new Ammo.btVector3(fx, 0, fz);
      body.activate();
      body.applyCentralForce(force);
    }
  }

  // === Lateral Friction (Prevent Skidding) ===
  const lateralSpeed = rightVec.dot(new THREE.Vector3(velocity.x(), 0, velocity.z()));
  const frictionMag = -lateralSpeed * lateralFrictionFactor;
  const frictionForce = new Ammo.btVector3(rightVec.x * frictionMag, 0, rightVec.z * frictionMag);
  body.applyCentralForce(frictionForce);

  // === Smoothed Steering Input ===
  state.steeringTarget = (keys[left] ? 1 : 0) - (keys[right] ? 1 : 0);
  let turnDirection = state.steeringTarget;
  const velocityVec = new THREE.Vector3(velocity.x(), 0, velocity.z());
  const reversing = forwardVec.dot(velocityVec) < -0.5;

  if(reversing){ turnDirection *= -1;}

  state.steeringSmooth = state.steeringSmooth || 0;
  state.steeringSmooth += (turnDirection - state.steeringSmooth) * steerLerpRate;

  const smoothedTorque = steerTorque * state.steeringSmooth;
  body.applyTorque(new Ammo.btVector3(0, smoothedTorque, 0));

  // === Clamp Angular Velocity (Optional) ===
  const angVel = body.getAngularVelocity();
  const maxAngularSpeed = 3;
  if (Math.abs(angVel.y()) > maxAngularSpeed) {
    angVel.setY(Math.sign(angVel.y()) * maxAngularSpeed);
    body.setAngularVelocity(angVel);
  }

  // === Sync from Physics to Three.js ===
  const transform = new Ammo.btTransform();
  body.getMotionState().getWorldTransform(transform);
  const origin = transform.getOrigin();
  const rotation = transform.getRotation();

  car.position.set(origin.x(), origin.y(), origin.z());
  car.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());

  // === Wheel Rotation (Visual) ===
  const speed = Math.sqrt(velocity.x() ** 2 + velocity.z() ** 2);
  car.speed = speed;
  car.wheelRotationSpeed = speed / (2 * Math.PI * wheelRadius);
  car.wheels?.forEach(w => w.rotation.x -= car.wheelRotationSpeed * 0.1);

  // === Falling Down ===
  const carXZPos = new THREE.Vector2(car.position.x, car.position.z);
  const distFromCenter = carXZPos.length();
  car.hasFallen ??= false;

  if (!car.hasFallen && car.position.length() > ARENA_RADIUS) {
    console.log("fallen");
    car.hasFallen = true;
    car.physicsBody.setAngularVelocity(new Ammo.btVector3(1, 0, 1));  // Optional: spin it
  }

  // === Steering Pivots (Visual) ===
  const maxSteerAngle = 0.4;
  const steerLerp = 0.4;
  const steerAngle = state.steeringSmooth * maxSteerAngle;

  if (car.frontLeftPivot)
    car.frontLeftPivot.rotation.y = (steerAngle - car.frontLeftPivot.rotation.y) * steerLerp;
  if (car.frontRightPivot)
    car.frontRightPivot.rotation.y += (steerAngle - car.frontRightPivot.rotation.y) * steerLerp;

  // === Camera Follow ===

  // === Dynamic camera offset (zoomed out if reversing) ===
  const baseOffset = reversing
    ? new THREE.Vector3(0, 6, 8)     // Front + higher + farther when reversing
    : new THREE.Vector3(0, 5, -10);  // Behind normally

  // Smooth rotation-based offset
  const targetOffset = baseOffset.applyQuaternion(car.quaternion);
  state.camOffset ??= new THREE.Vector3().copy(targetOffset);
  state.camOffset.lerp(targetOffset, 0.1); // Smooth offset transition

  // === Camera Position ===
  const desiredCamPos = car.position.clone().add(state.camOffset);
  camera.position.lerp(desiredCamPos, 0.1);

  // === Tilt Camera Slightly Down When Reversing ===
  const lookOffset = reversing ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, 0, 0);
  const targetLookAt = car.position.clone().add(lookOffset);
  camera.lookAt(targetLookAt);
}




function updateHUD(car, coordDisplay, speedLabel) {
  if (!car) return;
  const pos = car.position;
  coordDisplay.textContent = `X: ${pos.x.toFixed(2)}  Y: ${(pos.y - 0.5).toFixed(2)}  Z: ${pos.z.toFixed(2)}`;
  const velocityInKph = car.speed * 3.6;
  speedLabel.textContent = `${velocityInKph.toFixed(0)} km/h`;
}


// === Wait for Ammo and scene setup from arena.js
async function waitForArenaInit() {
  while (!window.Ammo || !window.physicsWorld || !window.scene) {
    await new Promise(res => setTimeout(res, 30));
  }
}

waitForArenaInit().then(() => {
  physicsWorld = window.physicsWorld;
  const scene = window.scene;

  loadCarModel('models/rover_blue.glb', scene, (model) => {
    car1 = model;
    car1.wheelRotationSpeed = 0;
    setupCarPhysics(car1, physicsWorld, { x: 10, y: 0.5, z: 0 });
    car1Loaded = true;
    checkCarsReady();
    car1.frontLeftPivot = wrapWheelInPivot(car1.frontLeftWheel);
    car1.frontRightPivot = wrapWheelInPivot(car1.frontRightWheel);
    car1.attach(car1.frontLeftPivot);
    car1.attach(car1.frontRightPivot);
    // console.log(car2.physicsBody)
  });

  loadCarModel('models/rover_red.glb', scene, (model) => {
    car2 = model;
    car2.wheelRotationSpeed = 0;
    setupCarPhysics(car2, physicsWorld, { x: 0, y: 0.5, z: 0 });
    car2Loaded = true;
    checkCarsReady();
    car2.frontLeftPivot = wrapWheelInPivot(car2.frontLeftWheel);
    car2.frontRightPivot = wrapWheelInPivot(car2.frontRightWheel);
    car2.attach(car2.frontLeftPivot);
    car2.attach(car2.frontRightPivot);

    // console.log(car2.physicsBody)
  });
});

function animate() {
  
  requestAnimationFrame(animate);
  if (physicsWorld) physicsWorld.stepSimulation(1 / 60, 10);


  updateCar(car1, keys, 'w', 's', 'a', 'd', state1, camera1);
  updateCar(car2, keys, 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', state2, camera2);

  renderer.setScissorTest(true);

  renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
  renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight);

  renderer.render(window.scene, camera1);

  renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
  renderer.setScissor(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);

  renderer.render(window.scene, camera2);

  renderer.setScissorTest(false);

  updateHUD(car1, coordDisplay1, speedLabel1);
  updateHUD(car2, coordDisplay2, speedLabel2);

}

window.addEventListener('resize', () => {
  camera1.aspect = window.innerWidth / (2 * window.innerHeight);
  camera2.aspect = window.innerWidth / (2 * window.innerHeight);
  camera1.updateProjectionMatrix();
  camera2.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
