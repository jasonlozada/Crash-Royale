import * as THREE from 'three';

function createCar(color, startX = 0, startZ = 0) {
    const carGeometry = new THREE.BoxGeometry(2, 1, 4);
    const carMaterial = new THREE.MeshPhongMaterial({ color: color });
    const car = new THREE.Mesh(carGeometry, carMaterial);
    car.position.set(startX, 0.5, startZ);
  
    // Attach movement state to the car object
    car.speed = 0;
    car.dir = 0;
  
    return car;
  }
  
  export function createManualCar(color = 0xff0000, startX = 0, startZ = 0) {
    const carGroup = new THREE.Group();
  
    // --- Car body
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 1;
    carGroup.add(bodyMesh);
  
    // --- Car roof
    const roofGeometry = new THREE.BoxGeometry(1.5, 0.6, 2);
    const roofMaterial = new THREE.MeshPhongMaterial({ color: color * 0.8 });
    const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
    roofMesh.position.set(0, 1.6, 0);
    carGroup.add(roofMesh);
  
    // --- Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.5, 16);
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
  
    // Store all wheels
    carGroup.wheels = [];
  
    const wheelPositions = [
      [-0.9, 0.4, -1.5], // front left
      [0.9, 0.4, -1.5],  // front right
      [-0.9, 0.4, 1.5],  // back left
      [0.9, 0.4, 1.5],   // back right
    ];
  
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2; // lay horizontally so X-axis rolls
      wheel.position.set(...pos);
      carGroup.add(wheel);
      carGroup.wheels.push(wheel);
    });
  
    carGroup.position.set(startX, 0, startZ);
    carGroup.speed = 0;
    carGroup.dir = 0;
  
    return carGroup;
  }
  
  

  export function createSpeedLabel(initialText = '0') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.font = '48px sans-serif';
    context.fillText(initialText, 10, 64);
  
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
  
    sprite.scale.set(2, 1, 1); // Adjust label size
    sprite.userData.canvas = canvas;
    sprite.userData.context = context;
    sprite.userData.texture = texture;
  
    return sprite;
  }


  // Export function globally so main.js can access
  window.createCar = createCar;