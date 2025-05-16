import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function loadCarModel(modelPath, scene, onLoadCallback = () => {}) {
  const loader = new GLTFLoader();

  loader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;

      const scale = 4; // Adjust scale

      model.scale.set(scale, scale, scale);
      model.position.set(0, 0, 0);

      // Extract wheels by name
      const wheelNames = [
        'Wheel_1.002',
        'Wheel_4.001',
        'Wheel_4.002',
        'Wheel_5'
      ];
      model.wheels = wheelNames
        .map(name => model.getObjectByName(name))
        .filter(Boolean); // remove any nulls

      if (scene) scene.add(model);
      onLoadCallback(model);
    },
    undefined,
    (err) => {
      console.error('Failed to load rover.glb:', err);
    }
  );
}

export function wrapWheelInPivot(wheelMesh) {
  const pivot = new THREE.Group();
  
  pivot.position.copy(wheelMesh.getWorldPosition(new THREE.Vector3()));
  scene.attach(pivot);
  wheelMesh.position.set(0, 0, 0);
  pivot.add(wheelMesh);
  return pivot;

}

export function setupCarPhysics(car, world, position = new CANNON.Vec3(0, 0.5, 0)) {
  const chassisBody = new CANNON.Body({
    mass: 100,
    shape: new CANNON.Box(new CANNON.Vec3(1, 0.5, 2)),
    position,
    angularDamping: 0.5,
    linearDamping: 0.1
  });
  world.addBody(chassisBody);
  car.physicsBody = chassisBody;

  const wheelShape = new CANNON.Sphere(0.4);
  car.wheels = [];
  car.wheelMeshes = [];
  car.frontLeftWheel = null;
  car.frontRightWheel = null;

  car.traverse(obj => {
    if (obj.isMesh && obj.name.toLowerCase().includes('wheel')) {
      if (obj.name.toLowerCase().includes('4001')) car.frontLeftWheel = obj;
      else if (obj.name.toLowerCase().includes('5')) car.frontRightWheel = obj;

      car.wheels.push(obj);
      car.wheelMeshes.push(obj);

      const offset = new CANNON.Vec3().copy(obj.position);
      chassisBody.addShape(wheelShape, offset);
    }
  });
}

