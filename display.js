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

export function updateHUD(car, coordDisplay, speedLabel) {
  if (!car) return;
  const pos = car.position;
  coordDisplay.textContent = `X: ${pos.x.toFixed(2)}  Y: ${(pos.y - 0.5).toFixed(2)}  Z: ${pos.z.toFixed(2)}`;
  const velocityInKph = car.speed * 3.6;

  const newText1 = `${velocityInKph.toFixed(0)} km/h`
  speedLabel.textContent = newText1

}

export function createTitleScreen(onStartCallback) {
  const titleDiv = document.createElement('div');
  titleDiv.id = 'title-screen';
  titleDiv.style.position = 'fixed';
  titleDiv.style.top = '0';
  titleDiv.style.left = '0';
  titleDiv.style.width = '100vw';
  titleDiv.style.height = '100vh';
  titleDiv.style.background = 'black';
  titleDiv.style.color = 'white';
  titleDiv.style.display = 'flex';
  titleDiv.style.flexDirection = 'column';
  titleDiv.style.justifyContent = 'center';
  titleDiv.style.alignItems = 'center';
  titleDiv.style.zIndex = '1000';

  const title = document.createElement('h1');
  title.innerText = 'Crash Royale';
  title.style.fontSize = '48px';
  title.style.marginBottom = '20px';
  titleDiv.appendChild(title);

  const button = document.createElement('button');
  button.innerText = 'Start Game';
  button.style.padding = '12px 24px';
  button.style.fontSize = '20px';
  button.style.cursor = 'pointer';

  // Optional: Add hover/focus styles
  button.onmouseenter = () => button.style.backgroundColor = '#333';
  button.onmouseleave = () => button.style.backgroundColor = '';

  button.addEventListener('click', () => {
    titleDiv.style.display = 'none';
    onStartCallback(); // Start the game
  });

  titleDiv.appendChild(button);
  document.body.appendChild(titleDiv);
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
  loadingDiv.innerHTML = `<p>Loading...</p>`;

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