import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function loadCarModel(modelPath, scene, onLoadCallback = () => {}, onProgress = null) {
  const loader = new GLTFLoader();

  loader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;
      const scale = 4;
      model.scale.set(scale, scale, scale);
      model.position.set(0, 0, 0);

      const wheelNames = [
        'Wheel_1002',
        'Wheel_4001',
        'Wheel_4002',
        'Wheel_5'
      ];

      model.wheels = wheelNames
        .map(name => model.getObjectByName(name))
        .filter(Boolean);

      if (!model.wheels || model.wheels.length === 0) {
        model.wheels = [];
        model.traverse(obj => {
          if (obj.isMesh && obj.name.toLowerCase().includes('wheel')) {
            model.wheels.push(obj);
          }
        });
      }

      model.frontLeftWheel = model.wheels.find(w => w.name.includes('4001'));
      model.frontRightWheel = model.wheels.find(w => w.name.includes('5'));

      model.traverse(obj => {
      if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true; 
    }
  });

      if (scene) scene.add(model);
      onLoadCallback(model);
    },
     (xhr) => {
      if (xhr.lengthComputable && typeof onProgress === 'function') {
        const percent = (xhr.loaded / xhr.total) * 100;
        onProgress(percent);
      }
    },
    (err) => {
      console.error('Failed to load car model:', err);
    }
  );
}

export function setupCarPhysics(car, physicsWorld, position) {
  const Ammo = window.Ammo;

  if (typeof Ammo === 'undefined') {
    console.error('Ammo.js has not been loaded.');
    return;
  }

  const compoundShape = new Ammo.btCompoundShape();

  // Chassis
  const halfExtents = new Ammo.btVector3(1.25, 0.5, 2);
  const chassisShape = new Ammo.btBoxShape(halfExtents);
  const chassisTransform = new Ammo.btTransform();
  chassisTransform.setIdentity();
  chassisTransform.setOrigin(new Ammo.btVector3(0, 0, 0));
  compoundShape.addChildShape(chassisTransform, chassisShape);

  car.wheels = [];
  car.wheelMeshes = [];

  car.traverse(obj => {
    if (obj.isMesh && obj.name.toLowerCase().includes('wheel')) {
      car.wheels.push(obj);
      car.wheelMeshes.push(obj);
      obj.initialPosition = obj.position.clone();
    }
  });

  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
  const motionState = new Ammo.btDefaultMotionState(transform);
  const mass = 100;
  const localInertia = new Ammo.btVector3(0, 0, 0);
  compoundShape.calculateLocalInertia(mass, localInertia);

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, compoundShape, localInertia);
  const body = new Ammo.btRigidBody(rbInfo);
  body.setDamping(0.1, 0.5);
  body.setRestitution(3); // default is 1, increase number for more bounce

  physicsWorld.addRigidBody(body);
  car.physicsBody = body;

}

export function wrapWheelInPivot(wheelMesh) {
  if (!wheelMesh) {
    console.warn('wrapWheelInPivot called with undefined wheelMesh');
    return null;
  }

  const pivot = new THREE.Group();
  pivot.position.copy(wheelMesh.getWorldPosition(new THREE.Vector3()));

  if (typeof window.scene !== 'undefined') {
    window.scene.attach(pivot);
  } else {
    console.error('No scene found in global scope');
  }

  wheelMesh.position.set(0, 0, 0);
  pivot.add(wheelMesh);
  return pivot;
}

export function handleFalling(car, opponent, resetPosition = { x: 0, y: 2, z: 0 }) {
  const fallThreshold = -10;

  if (!car.hasFallen && car.position.y < fallThreshold) {
    // Mark car as fallen and give opponent a point
    car.hasFallen = true;
    opponent.userData.score = (opponent.userData.score || 0) + 1;
    updateCarScoreLabel(opponent, opponent.userData.score)
    if (typeof window.updateScoreUI === 'function') {
      window.updateScoreUI();
    }
  }

  if (car.hasFallen && car.position.y < fallThreshold) {
   
    // Stop motion
    car.physicsBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
    car.physicsBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));

    // Reset position
    const resetTransform = new Ammo.btTransform();
    resetTransform.setIdentity();
    resetTransform.setOrigin(new Ammo.btVector3(
      resetPosition.x, resetPosition.y, resetPosition.z
    ));
    car.physicsBody.setWorldTransform(resetTransform);

    // Sync visuals
    car.position.set(resetPosition.x, resetPosition.y, resetPosition.z);

    // Clear fall status for future checks
    car.hasFallen = false;
  }

}

export function createTextSprite(message, color = 'white') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  context.font = '24px monospace';
  context.fillStyle = color;
  context.textAlign = 'center';
  context.fillText(message, canvas.width / 2, 80);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);

  sprite.scale.set(2, 1, 1); // Size of the label
  return sprite;
}

export function updateCarScoreLabel(car, newScore) {
  const sprite = car.userData.scoreLabel;
  if (!sprite) return;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  context.font = '24px monospace';
  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(`${newScore}`, canvas.width / 2, canvas.height / 2);

  const newTexture = new THREE.CanvasTexture(canvas);
  sprite.material.map.dispose(); // dispose old texture
  sprite.material.map = newTexture;
  sprite.material.needsUpdate = true;
}

