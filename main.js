// === Import Libraries ===
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { loadCarModel, setupCarPhysics, wrapWheelInPivot} from './car.js';

// === NOTE: Scene is a global variable provided by arena.js ===

// === Renderer Setup ===

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.shadowMap.enabled = true; //for shadows
renderer.shadowMap.type = THREE.VSMShadowMap; //for shadows (used  PCFSoftShadowMap and added ugly rows on floor)
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// === Camera Setup for Split Screen ===
const camera1 = new THREE.PerspectiveCamera(75, window.innerWidth / (2 * window.innerHeight), 0.1, 1000);
const camera2 = new THREE.PerspectiveCamera(75, window.innerWidth / (2 * window.innerHeight), 0.1, 1000);

// === Physics Debugger ===
const cannonDebugger = CannonDebugger(scene, world, { color: 0x00ff00 });

// === Input Tracking ===
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// === On-Screen Coordinate Displays ===
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

// Speed Label
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
const state1 = { speed: 0, dir: 0, steering: 0, accelTimer: 0};
const state2 = { speed: 0, dir: 0, steering: 0, accelTimer: 0};

// === Load Car Model with Physics ===
let car1 = null;
loadCarModel('models/rover_blue.glb', null, (model) => {
  car1 = model;
  car1.wheelRotationSpeed = 0;
  scene.add(car1);

  setupCarPhysics(car1, world, new CANNON.Vec3(0, 0.5, 0));
  car1.frontLeftPivot = wrapWheelInPivot(car1.frontLeftWheel);
  car1.frontRightPivot = wrapWheelInPivot(car1.frontRightWheel);
  car1.attach(car1.frontLeftPivot);
  car1.attach(car1.frontRightPivot);
});

let car2 = null;
loadCarModel('models/rover_red.glb', null, (model) => {
  console.log("car2 loaded " + model.castShadow);
  car2 = model;
  car2.wheelRotationSpeed = 0;
  scene.add(car2);

  setupCarPhysics(car2, world, new CANNON.Vec3(10, 0.5, 0));
  car2.frontLeftPivot = wrapWheelInPivot(car2.frontLeftWheel);
  car2.frontRightPivot = wrapWheelInPivot(car2.frontRightWheel);
  car2.attach(car2.frontLeftPivot);
  car2.attach(car2.frontRightPivot);
});




// === Car Movement + Physics/Visual Update ===
function updateCar(car, camera, keys, fw, bw, left, right, state) {
  if (!car || !state) return;
 
  const wheelRadius = 0.4;
  const wheelCircumference = 2 * Math.PI * wheelRadius;
  const maxWheelSpeed = 0.2;
  const maxAcceleration = 0.03;
  const accelerationRate = (timeHeld) => {
    const secondsHeld = timeHeld / 60; // assume 60fps
    return Math.min(Math.log(1 + secondsHeld) * 0.001, maxAcceleration); // logarithmic curve
  }; 
  const rotationToSpeedFactor = 75;
  const steerLerp = 0.2;
  const maxSteerAngle = 0.4;

  // Acceleration logic
  car.wheelRotationSpeed ??= 0;
  if (keys[fw]) {
    state.accelTimer += 1;
    car.wheelRotationSpeed = Math.min(car.wheelRotationSpeed + accelerationRate(state.accelTimer), maxWheelSpeed);
  } else if (keys[bw]) {
    state.accelTimer += 1;
    car.wheelRotationSpeed = Math.max(car.wheelRotationSpeed - accelerationRate(state.accelTimer), -maxWheelSpeed);
  } else {
    state.accelTimer = 0;
    car.wheelRotationSpeed *= 0.96;
    if (Math.abs(car.wheelRotationSpeed) < 0.0005) car.wheelRotationSpeed = 0;
  }

  // === Directional Steering ===
  state.dir ??= 0;
  if (Math.abs(car.wheelRotationSpeed) > 0.001) {
    const speedFactor = Math.abs(car.wheelRotationSpeed / maxWheelSpeed); // 0 to 1
    const turnRate = 0.03 * speedFactor;

    const reversing = car.wheelRotationSpeed < 0;
    const dirMultiplier = reversing ? -1 : 1;

    if (keys[left]) state.dir += turnRate * dirMultiplier;;
    if (keys[right]) state.dir -= turnRate * dirMultiplier;
  }


  // === Visual Wheel Rotation ===
  car.wheels?.forEach(w => w.rotation.x -= car.wheelRotationSpeed);

  // === Steering Pivots ===
  let steerAngle = 0;
  if (keys[left]) steerAngle = maxSteerAngle;
  else if (keys[right]) steerAngle = -maxSteerAngle;

  if (car.frontLeftPivot) car.frontLeftPivot.rotation.y += (steerAngle - car.frontLeftPivot.rotation.y) * steerLerp;
  if (car.frontRightPivot) car.frontRightPivot.rotation.y += (steerAngle - car.frontRightPivot.rotation.y) * steerLerp;

  // === Position and Orientation ===
  const distancePerFrame = car.wheelRotationSpeed * wheelCircumference;
  const velocity = distancePerFrame * rotationToSpeedFactor;

  if (car.physicsBody) {
    const body = car.physicsBody;
    body.velocity.set(Math.sin(state.dir) * velocity, body.velocity.y, Math.cos(state.dir) * velocity);
    body.quaternion.setFromEuler(0, state.dir, 0);
    car.position.copy(body.position);
    car.quaternion.copy(body.quaternion);
  } else {
    car.rotation.y = state.dir;
    car.position.x += Math.sin(state.dir) * velocity;
    car.position.z += Math.cos(state.dir) * velocity;
  }

  // === Camera Following Logic ===
  const camDist = 10, camHeight = 5;
  const offset = new THREE.Vector3(Math.sin(state.dir) * -camDist, camHeight, Math.cos(state.dir) * -camDist);
  camera.position.copy(car.position).add(offset);
  camera.lookAt(car.position);

  // === State Update ===
  car.speed = Math.abs(velocity);
  car.dir = state.dir;
}

// === HUD Update Function ===
function updateHUD(car, coordDisplay, speedLabel) {
  if (!car) return;
  const pos = car.position;
  coordDisplay.textContent = `X: ${pos.x.toFixed(2)}  Y: ${(pos.y - 0.5).toFixed(2)}  Z: ${pos.z.toFixed(2)}`;
  const velocityInMps = car.speed;
  const velocityInKph = velocityInMps * 3.6;
  speedLabel.textContent = `${velocityInKph.toFixed(0)} km/h`;
}

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
const TRAIL_UPDATE_INTERVAL = 2; // Update every 5 frames (adjust as needed)


// === Animation Loop ===
function animate() {
  
  requestAnimationFrame(animate);



  world.step(1 / 60);
  cannonDebugger.update();

  updateCar(car1, camera1, keys, 'w', 's', 'a', 'd', state1);
  updateCar(car2, camera2, keys, 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', state2);


  // Fade out old trails )
  if (trailUpdateFrame % TRAIL_UPDATE_INTERVAL === 0) {
    window.trailCtx.globalAlpha = 0.02;
    fillCanvasWithRepeatedImage(window.trailCtx, window.sandImage, window.trailCanvasSize, 16);
    window.trailCtx.globalAlpha = 1.0;
    // Draw trails for both cars
    drawWheelTrails(car1);
    drawWheelTrails(car2);
  }


  renderer.setScissorTest(true);

  // === Render Left View ===
  renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
  renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight);
  renderer.render(scene, camera1);

  // === Render Right View ===
  renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
  renderer.setScissor(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
  renderer.render(scene, camera2);

  renderer.setScissorTest(false);
  // Coordinate Display 
  updateHUD(car1, coordDisplay1, speedLabel1);
  updateHUD(car2, coordDisplay2, speedLabel2);

  trailUpdateFrame++;
}


animate();

// === Handle Window Resize ===
window.addEventListener('resize', () => {
  camera1.aspect = window.innerWidth / (2 * window.innerHeight);
  camera2.aspect = window.innerWidth / (2 * window.innerHeight);
  camera1.updateProjectionMatrix();
  camera2.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

