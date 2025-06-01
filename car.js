import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function loadCarModel(modelPath, scene, onLoadCallback = () => {}) {
  const loader = new GLTFLoader();

  loader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;
      const scale = 4;
      model.scale.set(scale, scale, scale);
      model.position.set(0, 0, 0);

      // Wheel names based on actual model
      const wheelNames = [
        'Wheel_1002',
        'Wheel_4001',
        'Wheel_4002',
        'Wheel_5'
      ];

      model.wheels = wheelNames
        .map(name => model.getObjectByName(name))
        .filter(Boolean);

      // Optional: Fallback if wheelNames are missing from the model
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

      if (scene) scene.add(model);
      onLoadCallback(model);
    },
    undefined,
    (err) => {
      console.error('Failed to load car model:', err);
    }
  );
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

export function setupCarPhysics(car, physicsWorld, position) {
  const Ammo = window.Ammo;

  if (typeof Ammo === 'undefined') {
    console.error('Ammo.js has not been loaded.');
    return;
  }

  // === Create car compound shape ===
  const compoundShape = new Ammo.btCompoundShape();

  // Chassis
  const halfExtents = new Ammo.btVector3(1, 0.5, 2);
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



  // === Create car rigid body ===
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

  physicsWorld.addRigidBody(body);
  car.physicsBody = body;

}


