import Stats from 'three/examples/jsm/libs/stats.module.js';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

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

export function updateHUD(car, coordDisplay, speedLabel) {
  if (!car) return;
  const pos = car.position;
  coordDisplay.textContent = `X: ${pos.x.toFixed(2)}  Y: ${(pos.y - 0.5).toFixed(2)}  Z: ${pos.z.toFixed(2)}`;
  const velocityInKph = car.speed * 3.6;

  const newText1 = `${velocityInKph.toFixed(0)} km/h`
  speedLabel.textContent = newText1

}

document.fonts.load('100px "Cinzel"').then(() => {
  ctx.font = `${fontSize}px Cinzel`;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  texture.needsUpdate = true; // update after drawing
});

let titleSprite, promptSprite;

export function createTitleScreen(onStartCallback) {
  const scene = window.scene;

  const aspect = window.innerWidth / window.innerHeight;
  const scaleMultiplier = Math.min(aspect * 1.2, 2.5); // cap it for consistency

  // === Title Text ===
  titleSprite = createTextSprite('Crash Royale', {
    fontSize: 90,
    color: '#FFD700',
    scale: [45 * scaleMultiplier, 15 * scaleMultiplier, 1],
    fontFamily: 'Cinzel',
    shadow: true,
    stroke: true
  });
  titleSprite.position.set(0, 40, 0);
  scene.add(titleSprite);

  // === Prompt Text ===
  promptSprite = createTextSprite('Press Space to Start', {
    fontSize: 50,
    color: '#FFFFFF',
    scale: [25 * scaleMultiplier, 5 * scaleMultiplier, 1],
    fontFamily: 'Cinzel',
    shadow: true
  });
  promptSprite.position.set(0, 25, 0);
  scene.add(promptSprite);

  window.addEventListener('keydown', function startGameOnce(e) {
    if (e.code === 'Space') {
      window.removeEventListener('keydown', startGameOnce);
      fadeOutAndStart(onStartCallback);
    }
  });
}

export function createTextSprite(text, options = {}) {
  const {
    fontSize = 64,
    color = 'white',
    scale = [20, 10, 1],
    fontFamily = 'sans-serif',
    shadow = false,
    stroke = false
  } = options;

  // === Auto-calculate canvas size ===
  const padding = fontSize * 0.5;
  const estimatedWidth = fontSize * text.length * 0.7 + padding;
  const estimatedHeight = fontSize * 1.8 + padding;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(estimatedWidth);
  canvas.height = Math.ceil(estimatedHeight);

  const ctx = canvas.getContext('2d');
  const font = `${fontSize}px "${fontFamily}"`;

  // Load font before drawing
  document.fonts.load(font).then(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    if (shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
      ctx.shadowBlur = 8;
    }

    if (stroke) {
      ctx.strokeStyle = '#5C3B1E';
      ctx.lineWidth = 6;
      ctx.strokeText(text, centerX, centerY);
    }

    ctx.fillStyle = color;
    ctx.fillText(text, centerX, centerY);

    texture.needsUpdate = true;
  });

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(...scale);
  return sprite;
}

function fadeOutAndStart(callback) {
  let opacity = 1;

  function fade() {
    opacity -= 0.03;
    if (opacity <= 0) {
      const scene = window.scene;
      scene.remove(titleSprite);
      scene.remove(promptSprite);
      callback(); // start game setup
      return;
    }
    titleSprite.material.opacity = opacity;
    promptSprite.material.opacity = opacity;
    requestAnimationFrame(fade);
  }

  fade();
}

export function showLoadingScreen() {
  // Outer container
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loading-screen';
  loadingDiv.style = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: black;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    font-family: sans-serif;
    font-size: 20px;
    z-index: 2000;
  `;
  loadingDiv.innerHTML = `<h2>LOADING...</h2>`;

  // Progress bar container
  const barContainer = document.createElement('div');
  barContainer.style = `
    width: 60%;
    height: 20px;
    background: #333;
    border-radius: 10px;
    overflow: hidden;
    margin-top: 20px;
  `;

  // Progress bar inner
  const barFill = document.createElement('div');
  barFill.id = 'progress-bar';
  barFill.style = `
    width: 0%;
    height: 100%;
    background: limegreen;
    transition: width 0.2s ease;
  `;

  barContainer.appendChild(barFill);
  loadingDiv.appendChild(barContainer);
  document.body.appendChild(loadingDiv);
}

export function updateLoadingProgressSmoothly(rawPercent) {
  const clamped = Math.min(100, Math.max(0, rawPercent));
  updateLoadingProgress(clamped);
}

export function updateLoadingProgress(percent) {
  const bar = document.getElementById('progress-bar');
  if (bar) bar.style.width = `${percent}%`;
}

export function hideLoadingScreen() {
  const div = document.getElementById('loading-screen');
  if (div) {
    div.style.transition = 'opacity 0.5s ease';
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 500);
  }
}