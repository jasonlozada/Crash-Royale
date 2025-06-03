import * as THREE from 'three';
import { loadCarModel, setupCarPhysics, handleFalling, wrapWheelInPivot, createTextSprite} from './car.js';
import { createCoordDisplay, createSpeedLabel, 
  updateHUD, initStats, createTitleScreen, 
  showLoadingScreen, updateLoadingProgress, hideLoadingScreen, crownModel, updateCrownPosition
} from './display.js';

// === Title Camera (Centered for Title Screen Only) ===
// === Title Camera: Overview of Arena ===
const titleCamera = new THREE.PerspectiveCamera(
  60,                                 // wider field of view
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);

// Position it high and back to view the arena
titleCamera.position.set(0, 50, 50);  // Adjust Y and Z as needed

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

let gameStarted = false;

createTitleScreen(() => {
  beginGameSetup();
});


let angle = 0;

const stats1 = initStats();
function animateTitleScreen() {
  if (!gameStarted) {
    angle += 0.002; // control rotation speed
    const radius = 100;
    const x = radius * Math.sin(angle);
    const z = radius * Math.cos(angle);
    titleCamera.position.set(x, 60, z);
    titleCamera.lookAt(0, 0, 0);

    requestAnimationFrame(animateTitleScreen);
    stats1.update();
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.setScissorTest(false);
    renderer.render(window.scene, titleCamera);
  }
}

animateTitleScreen();
// === HUD Setup ===
const coordDisplay1 = createCoordDisplay(10);
const coordDisplay2 = createCoordDisplay(window.innerWidth / 2 + 10);

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

  const velocity = body.getLinearVelocity();
  const quaternion = car.quaternion;

  body.setRestitution(1);
  body.setFriction(0.5);
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


  // === Steering Pivots (Visual) ===
  const maxSteerAngle = 0.4;
  const steerLerp = 0.4;
  const steerAngle = state.steeringSmooth * maxSteerAngle;

  if (car.frontLeftPivot)
    car.frontLeftPivot.rotation.y += (steerAngle - car.frontLeftPivot.rotation.y) * steerLerp;
  if (car.frontRightPivot)
    car.frontRightPivot.rotation.y += (steerAngle - car.frontRightPivot.rotation.y) * steerLerp;

  // === Camera Follow ===

  // === Dynamic camera offset (zoomed out if reversing) ===
  const pressingBackward = keys[bw]; // where `bw` is 's' or 'ArrowDown'

  const baseOffset = pressingBackward
    ? new THREE.Vector3(0, 6, 8)  // front cam when pressing reverse
    : new THREE.Vector3(0, 5, -10); // rear cam normally

  // Smooth rotation-based offset
  const targetOffset = baseOffset.applyQuaternion(car.quaternion);
  state.camOffset ??= new THREE.Vector3().copy(targetOffset);
  state.camOffset.lerp(targetOffset, 0.1); // Smooth offset transition

  // === Camera Position ===
  const desiredCamPos = car.position.clone().add(state.camOffset);
  camera.position.lerp(desiredCamPos, 0.1);

  // === Tilt Camera Slightly Down When Reversing ===
  const lookOffset = pressingBackward ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, 0, 0);
  const targetLookAt = car.position.clone().add(lookOffset);
  camera.lookAt(targetLookAt);
}

const loadProgress = { car1: 0, car2: 0 };


function beginGameSetup() {
  showLoadingScreen(); // Show loading screen with bar
  
  waitForArenaInit().then(() => {
    physicsWorld = window.physicsWorld;
    const scene = window.scene;
    
    loadCarModel('models/rover_blue.glb', scene, (model) => {
      car1 = model;
      setupCarPhysics(car1, physicsWorld, { x: 10, y: 0.5, z: 0 });

      const label = createTextSprite('0');
      label.position.set(0, 1, 0);
      car1.add(label);
      car1.userData.scoreLabel = label;

      car1Loaded = true;
      checkCarsReady();

      car1.frontLeftPivot = wrapWheelInPivot(car1.frontLeftWheel);
      car1.frontRightPivot = wrapWheelInPivot(car1.frontRightWheel);
      car1.attach(car1.frontLeftPivot);
      car1.attach(car1.frontRightPivot);
    }),

    loadCarModel('models/rover_red.glb', scene, (model) => {
      car2 = model;
      setupCarPhysics(car2, physicsWorld, { x: 0, y: 0.5, z: 0 });

      const label = createTextSprite('0');
      label.position.set(0, 1, 0);
      car2.add(label);
      car2.userData.scoreLabel = label;

      car2Loaded = true;
      checkCarsReady();

      car2.frontLeftPivot = wrapWheelInPivot(car2.frontLeftWheel);
      car2.frontRightPivot = wrapWheelInPivot(car2.frontRightWheel);
      car2.attach(car2.frontLeftPivot);
      car2.attach(car2.frontRightPivot);
    }, 
      (percent) => {
      loadProgress.car1 = percent;
      loadProgress.car2 = percent;

      updateLoadingProgress((loadProgress.car1 + loadProgress.car2) / 2);

    
    });
  });

  window.towerFloor.material.map = trailTexture;
  window.towerFloor.material.needsUpdate = true;
}

// === Step 3: Wait for Ammo and Scene to Load ===
async function waitForArenaInit() {
  while (!window.Ammo || !window.physicsWorld || !window.scene) {
    await new Promise(res => setTimeout(res, 30));
  }
}

// === Step 4: Check if Both Cars Are Ready ===
function checkCarsReady() {
  if (car1Loaded && car2Loaded) {
    updateLoadingProgress(100); // force full progress bar
    setTimeout(() => {
      hideLoadingScreen();
      gameStarted = true;
      animate(); // start game loop
    }, 500);
  }
}


// For Sand Trail
function isWheelOnGround(wheel) {
  //Adjust threshold as needed
  return wheel.getWorldPosition(new THREE.Vector3()).y < 3 && wheel.getWorldPosition(new THREE.Vector3()).y > -3;
}

function drawWheelTrails(car) {
  if (!car || !car.wheels) return;
  
  car.wheels.forEach(wheel => {
    
  if (!isWheelOnGround(wheel)) return;
    const pos = wheel.getWorldPosition(new THREE.Vector3());
    if (pos.x * pos.x + pos.z * pos.z <= window.radius * window.radius) {
      const [u, v] = window.worldToUV(pos.x, pos.z);
      const cx = Math.floor(u * window.trailCanvasSize);
      const cy = Math.floor(v * window.trailCanvasSize);
      window.trailCtx.beginPath();
      window.trailCtx.arc(cx, cy, 5, 0, 2 * Math.PI);
      window.trailCtx.fillStyle = 'rgba(120, 100, 60, 0.85)'; 
      window.trailCtx.fill();
    }
  });
  window.trailTexture.needsUpdate = true;
}

let trailUpdateFrame = 0;
const TRAIL_UPDATE_INTERVAL = 2; // Update every 2 frames (adjust as needed)

const stats = initStats();

function animate() {
  if (!gameStarted) return;

  
  if (physicsWorld) physicsWorld.stepSimulation(1 / 60, 2);

  updateCar(car1, keys, 'w', 's', 'a', 'd', state1, camera1);
  updateCar(car2, keys, 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', state2, camera2);


  [car1, car2].forEach(car => {
  if (!car) return;
  window.conveyorBelts.forEach(belt => {
    // Simple AABB check (could use more precise math if needed)
    const localPos = car.position.clone().sub(belt.position).applyAxisAngle(new THREE.Vector3(0,1,0), belt.rotation.y);
    if (Math.abs(localPos.x) < 6.5 && Math.abs(localPos.z) < 5 && Math.abs(car.position.y - belt.position.y) < 2) {
      // Apply boost in belt's direction
      if (car.physicsBody) {
        const boost = belt.userData.boostDir.clone().multiplyScalar(100);
        car.physicsBody.activate();
        car.physicsBody.applyCentralImpulse(new Ammo.btVector3(boost.x, 0, boost.z));
      }
    }
  });
});

  updateCrownPosition(car1, car2, scene);


  // Fade out old trails )
  if (trailUpdateFrame % TRAIL_UPDATE_INTERVAL === 0) {
    window.trailCtx.globalAlpha = 0.02;
    fillCanvasWithRepeatedImage(window.trailCtx, window.sandImage, window.trailCanvasSize, 16);
    window.trailCtx.globalAlpha = 1.0;
    // Draw trails for both cars
    drawWheelTrails(car1);
    drawWheelTrails(car2);
  }

    // === Falling Down ===
  handleFalling(car1, car2, { x: 10, y: 2, z: 0 });
  handleFalling(car2, car1, { x: -10, y: 2, z: 0 });

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
  stats.update();


  trailUpdateFrame++;

  requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
  camera1.aspect = window.innerWidth / (2 * window.innerHeight);
  camera2.aspect = window.innerWidth / (2 * window.innerHeight);
  camera1.updateProjectionMatrix();
  camera2.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
