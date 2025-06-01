// display.js
import Stats from 'three/examples/jsm/libs/stats.module.js';


let statsInstance = null;

export function initStats() {
  if (statsInstance) return statsInstance; // prevent duplicates

  statsInstance = new Stats();
  statsInstance.showPanel(0); // 0: FPS

  statsInstance.dom.style.position = 'fixed';
  statsInstance.dom.style.top = '0px';
  statsInstance.dom.style.right = '0px';
  statsInstance.dom.style.left = 'auto';
  statsInstance.dom.style.transform = 'scale(0.6)';
  statsInstance.dom.style.transformOrigin = 'top right';

  document.body.appendChild(statsInstance.dom);
  return statsInstance;
}


export function createCoordDisplay(leftOffset) {
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

export function createSpeedLabel(rightOffset) {
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

export function createScoreLabel(leftOffset) {
  const div = document.createElement('div');
  div.className = 'score-label';
  div.style.position = 'fixed';
  div.style.color = 'white';
  div.style.fontFamily = 'monospace';
  div.style.fontSize = '12px';
  div.style.bottom = '10px';
  div.style.left = `${leftOffset}px`;
  div.style.zIndex = '10';
  document.body.appendChild(div);
  return div;
}

export function updateHUD(car, coordDisplay, speedLabel, scoreLabel) {
  if (!car) return;
  const pos = car.position;
  coordDisplay.textContent = `X: ${pos.x.toFixed(2)}  Y: ${(pos.y - 0.5).toFixed(2)}  Z: ${pos.z.toFixed(2)}`;
  const velocityInKph = car.speed * 3.6;

  const newText1 = `${velocityInKph.toFixed(0)} km/h`
  if (scoreLabel.textContent !== newText1){speedLabel.textContent = newText1}

  const newText2 =`${car.score ?? 0}`
  if (scoreLabel.textContent !== newText2){
    scoreLabel.textContent = newText2;
  }

}