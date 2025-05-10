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
  
  // Export function globally so main.js can access
  window.createCar = createCar;