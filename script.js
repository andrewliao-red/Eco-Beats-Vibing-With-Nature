// =========================
// BACKGROUND SEQUENCE 
// =========================
let springBgFrames = [];
let summerBgFrames = []; 
let winterBgFrames = []; 
let autumnBgFrames = []; 

let totalSpringFrames = 19; 
let totalSummerFrames = 19; 
let totalWinterFrames = 15; 
let totalAutumnFrames = 15; 

let currentBgFrame = 0;
let bgAnimationSpeed = 6;

// =========================
// ECO-BEATS FOUNDATION
// =========================
let particles = [];
let draggedParticle = null;
let activeOrbitCenter = null; // NEW: Tracks the selected, enlarged piece

// =========================
// AUDIO TRACKER & VISUALIZER STATE
// =========================
// We now initialize the Audio object ONCE so the Web Audio API can permanently attach to it
let currentAudio = new Audio(); 
currentAudio.crossOrigin = "anonymous"; // Prevents CORS errors on local servers
let currentPlayingButton = null;

let audioCtx = null;
let analyser = null;
let audioSource = null;
let visualizerCanvas = null;
let visCtx = null;

// =========================
// LIVE CLOCK
// =========================
function updateClock() {
  const clockElement = document.getElementById("live-clock");
  if (clockElement) {
    // toLocaleTimeString natively grabs the user's local time + Timezone (e.g., 11:44:01 PM EDT)
    clockElement.innerText = new Date().toLocaleTimeString('en-US', { timeZoneName: 'short' });
  }
}
// Run it immediately, then update every 1000ms (1 second)
updateClock();
setInterval(updateClock, 1000);

let season = "spring";
let timeOfDay = "morning";
let weather = "clear";

let natureImages = {};

const playlists = {
  dandelion: ["Yes, the Ruth B one",],
  acorn: ["Acorn Acapella", "The Nutcracker's Triumphant Nutcracking", "Deez Nuts", "Nuts and Bolts and PTSD"],
  fungi: ["Cordy-ceptual", "Fungal Vision", "Let's-a-Go", "Ominous Shrooms", "Sporadic Dawn", "Oppenshroomer"],
  grayflower: ["i was never real", "Something's Following Us", "We're Not Alone Here", "What's In That Hospital?"],
  leaf: ["Summer's Breeze", "The Little Things in Life"],
  pinecone: ["Slice of Peace", "Trail of Efforts"],
  pinkflower: ["Floyd's Vibe", "Sakura's Embrace", "Walking Home", "Lively Petals Breezing By"],
  purpleflowers: ["Into the Night Markets", "Mossbytes", "The City that Never Sleeps"],
  rock: ["Peak of Gold", "Under Bedrock"],
  rose: ["Rosas's Tavern", "Acoustic Tango", "Every Dramatic Breakup", "Manbaby", "Sweden"],
  snowflake: ["Nostalgic Winds"],
  whiteflower3: ["Edenic Whispers", "God's Pissed at You"]
};

// =========================
// PRELOAD IMAGES (The Fix + The Features)
// =========================
function preload() {
  const types = ["dandelion", "acorn", "fungi", "grayflower", "leaf", "pinecone", "pinkflower", "purpleflowers", "rock", "rose", "snowflake", "whiteflower3"];
  
  types.forEach(type => {
    natureImages[type] = {}; 
    
    // 1. Safe Default Loading
    let defaultPath = (type === "snowflake") ? `resources/water.png` : `resources/${type}.png`;
    natureImages[type].default = loadImage(defaultPath);
    
    // 2. Safe Winter Variations
    if (["acorn", "dandelion", "fungi", "leaf", "pinecone", "rock", "rose"].includes(type)) {
      natureImages[type].winter = loadImage(`resources/${type}winter.png`);
    }
    if (type === "purpleflowers") {
      natureImages[type].winter = loadImage(`resources/purpleflowerwinter.png`);
    }
    if (type === "leaf") {
      natureImages[type].autumn = loadImage(`resources/autumnleaf.png`);
    }
    if (type === "snowflake") {
      natureImages[type].winter = loadImage(`resources/snowflake.png`);
      natureImages[type].spring = loadImage(`resources/water.png`);
      natureImages[type].summer = loadImage(`resources/water.png`);
      natureImages[type].autumn = loadImage(`resources/water.png`);
    }
  });

  // 3. Background Loading
  for (let i = 0; i < totalSpringFrames; i++) {
    let img = loadImage(`resources/bg1/spring_${i}.png`);
    springBgFrames[i] = img;
    summerBgFrames[i] = img;
  }
  for (let i = 1; i <= totalWinterFrames; i++) {
    let img = loadImage(`resources/bg2/winter_${i}.png`);
    winterBgFrames.push(img);
    autumnBgFrames.push(img);
  }
}

// =========================
// SIDEBAR SELECTORS
// =========================
const sidebar = document.getElementById("sidebar");
const closeSidebar = document.getElementById("close-sidebar");
const natureTitle = document.getElementById("nature-title");
const playlistContainer = document.querySelector(".playlist");
const natureDescription = document.querySelector(".nature-description");

closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("active");
  activeOrbitCenter = null; // Break the orbit
  
  // Optional: Give all the pieces a gentle, randomized push outwards
  // so they gracefully drift apart instead of just stopping in a circle
  particles.forEach(p => {
    p.vx = random(-0.05, 0.05);
    p.vy = random(-0.05, 0.05);
  });
});

// =========================
// CONTROLS
// =========================
document.getElementById("season-select").addEventListener("change", (e) => { 
  season = e.target.value; 
  currentBgFrame = 0; // Prevent array out-of-bounds when switching seasons
});
document.getElementById("time-select").addEventListener("change", (e) => { timeOfDay = e.target.value; });
document.getElementById("weather-select").addEventListener("change", (e) => { weather = e.target.value; });

// =========================
// PARTICLE CLASS (Physics & Interactions Restored)
// =========================
class NatureParticle {
  constructor(type, startX, startY) {
    this.targetScale = 1;
    this.currentScale = 1;
    this.isDragging = false;
    this.type = type;
    this.x = startX;
    this.y = startY;
    this.size = random(90, 160);
    this.vx = random(-0.015, 0.025);
    this.vy = random(-0.015, 0.025);
    this.rotation = random(TWO_PI);
    this.rotationSpeed = random(-0.005, 0.005);

    // NEW: Unique orbit parameters for when they get pulled into a circle
    this.orbitRadius = random(250, 550); 
    this.orbitSpeed = random(0.01, 0.02);
  }

update() {
    if (weather === "storm") {
      this.vx += random(-0.03, 0.03);
      this.vy += random(-0.03, 0.03);
    }
    if (weather === "rain") { this.vy += 0.0015; }

    // --- NEW: ORBIT LOGIC ---
    if (activeOrbitCenter) {
      if (activeOrbitCenter === this) {
        // 1. I am the selected center piece
        this.targetScale = 2.5; // Enlarge dramatically
        
        // Move to left-center of screen to balance the sidebar
        let targetX = width * 0.35; 
        let targetY = height / 2;
        
        this.x = lerp(this.x, targetX, 0.05);
        this.y = lerp(this.y, targetY, 0.05);
        this.vx = 0;
        this.vy = 0;
        
        } else {
          // 2. I am orbiting the center piece
          let dx = this.x - activeOrbitCenter.x;
          let dy = this.y - activeOrbitCenter.y;
          let currentAngle = atan2(dy, dx);
          
          // Decrease angle for counter-clockwise rotation
          currentAngle -= this.orbitSpeed; 
          
          // Smoothly pull into the designated orbital ring
          let currentRadius = dist(this.x, this.y, activeOrbitCenter.x, activeOrbitCenter.y);
          let smoothRadius = lerp(currentRadius, this.orbitRadius, 0.05);
          
          let targetX = activeOrbitCenter.x + cos(currentAngle) * smoothRadius;
          let targetY = activeOrbitCenter.y + sin(currentAngle) * smoothRadius;
          
          // FIXED: Add vx and vy so collisions actually push them off the track momentarily
          this.x = lerp(this.x, targetX, 0.08) + this.vx;
          this.y = lerp(this.y, targetY, 0.08) + this.vy;

          // FIXED: Apply friction so the collision energy dissipates and they get pulled back into orbit
          this.vx *= 0.85;
          this.vy *= 0.85;

          // Keep standard hover behavior for orbiting pieces
          const hoverDistance = dist(mouseX, mouseY, this.x, this.y);
          this.targetScale = hoverDistance < this.size * 0.5 ? 1.25 : 1;
      }
    } else {
      // 3. Normal floating state (when nothing is selected)
      const hoverDistance = dist(mouseX, mouseY, this.x, this.y);
      this.targetScale = hoverDistance < this.size * 0.5 ? 1.25 : 1;

      this.x += this.vx;
      this.y += this.vy;

      // Screen bouncing
      const buffer = this.size * 0.5;
      if (this.x < buffer || this.x > width - buffer) this.vx *= -1;
      if (this.y < buffer || this.y > height - buffer) this.vy *= -1;
    }

    // --- UNIVERSAL LOGIC ---
    this.currentScale = lerp(this.currentScale, this.targetScale, 0.12);
    this.rotation += this.rotationSpeed;

    // Dragging overrides everything
    if (this.isDragging) {
      this.x = lerp(this.x, mouseX, 0.35);
      this.y = lerp(this.y, mouseY, 0.35);
      this.vx = 0;
      this.vy = 0;
    }
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    scale(this.currentScale);
    imageMode(CENTER);
    
    let imgSet = natureImages[this.type];
    let img = imgSet.default;
    
    if (season === "winter" && imgSet.winter) img = imgSet.winter;
    if (season === "autumn" && imgSet.autumn) img = imgSet.autumn;
    if (season === "spring" && imgSet.spring) img = imgSet.spring;
    if (season === "summer" && imgSet.summer) img = imgSet.summer;

    if (img) {
      drawingContext.shadowBlur = 25;
      drawingContext.shadowColor = (this.type === "snowflake") ? "rgba(255,255,255,0.7)" : 
                                   (this.type === "rock") ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.35)";
      image(img, 0, 0, this.size, this.size);
    }
    pop();
  }

  clicked() {
    activeOrbitCenter = this;
    sidebar.classList.add("active");
    const formattedTitle = this.type.charAt(0).toUpperCase() + this.type.slice(1);
    natureTitle.innerText = formattedTitle;
    natureDescription.innerText = `Ambient atmospheric textures inspired by the unique properties of the ${formattedTitle}.`;
    
    playlistContainer.innerHTML = "";
    const songs = playlists[this.type] || [];
    
    songs.forEach(songName => {
      const songDiv = document.createElement("div");
      songDiv.className = "song";
      const titleSpan = document.createElement("span");
      titleSpan.innerText = songName;
      const playBtn = document.createElement("button");
      
      if (currentAudio && !currentAudio.paused && currentAudio.src.includes(encodeURIComponent(songName))) {
        playBtn.innerText = "PAUSE";
        currentPlayingButton = playBtn;
      } else {
        playBtn.innerText = "PLAY";
      }

      playBtn.addEventListener("click", () => { toggleMusic(this.type, songName, playBtn); });
      songDiv.appendChild(titleSpan);
      songDiv.appendChild(playBtn);
      playlistContainer.appendChild(songDiv);
    });
  }
}

// =========================
// SETUP (Grid Restored)
// =========================
function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("canvas-container");
  
  const types = ["dandelion", "acorn", "fungi", "grayflower", "leaf", "pinecone", "pinkflower", "purpleflowers", "rock", "rose", "snowflake", "whiteflower3"];
  const totalParticles = types.length * 5;
  const cols = 10;
  const rows = Math.ceil(totalParticles / cols);
  const cellWidth = windowWidth / cols;
  const cellHeight = windowHeight / rows;
  let count = 0;

  for (let type of types) {
    for (let i = 0; i < 5; i++) {
      let col = count % cols;
      let row = Math.floor(count / cols);
      let startX = (col * cellWidth) + (cellWidth / 2) + random(-cellWidth * 0.25, cellWidth * 0.25);
      let startY = (row * cellHeight) + (cellHeight / 2) + random(-cellHeight * 0.25, cellHeight * 0.25);
      particles.push(new NatureParticle(type, startX, startY));
      count++;
    }
  }
}

// =========================
// DRAW (Layers Restored)
// =========================
function draw() {
  drawBackgroundGradient();

  let activeFrames = [];
  let isReflected = false;
  if (season === "spring") activeFrames = springBgFrames;
  else if (season === "summer") { activeFrames = summerBgFrames; isReflected = true; }
  else if (season === "winter") activeFrames = winterBgFrames;
  else if (season === "autumn") { activeFrames = autumnBgFrames; isReflected = true; }

  if (activeFrames.length > 0) {
    if (frameCount % bgAnimationSpeed === 0) currentBgFrame = (currentBgFrame + 1) % activeFrames.length;
    let img = activeFrames[currentBgFrame];
    if (img) drawBackgroundFrame(img, isReflected);
  }

  handleCollisions();

  if (weather === "rain") drawRain();
  if (weather === "snow") drawSnow();
  if (weather === "fog") drawFog();

  for (let p of particles) {
    p.update();
    p.display();
  }
}

function drawBackgroundFrame(img, reflected) {
  let rootStyle = getComputedStyle(document.documentElement);
  let finalOpacity = parseFloat(rootStyle.getPropertyValue(`--${season}-opacity`)) * 255 || 150;
  let finalScale = parseFloat(rootStyle.getPropertyValue(`--${season}-scale`)) || 1.0;
  let finalBrightness = parseFloat(rootStyle.getPropertyValue(`--${season}-brightness`)) || 255;

  push();
  tint(finalBrightness, finalOpacity);
  imageMode(CENTER);
  translate(width / 2, height / 2);
  if (reflected) scale(-finalScale, finalScale); 
  else scale(finalScale, finalScale);
  image(img, 0, 0, width, height);
  pop();
}

// =========================
// BACKGROUND GRADIENT (Pulsing Restored)
// =========================
function drawBackgroundGradient() {
  let topColor, bottomColor;
  const pulse1 = sin(frameCount * 0.03) * 0.5 + 0.5;
  const pulse2 = sin(frameCount * 0.02 + 100) * 0.5 + 0.5;

  if (season === "winter") {
    topColor = lerpColor(color(20, 40, 120), color(120, 160, 255), pulse1);
    bottomColor = lerpColor(color(150, 180, 255), color(220, 180, 255), pulse2);
  } else if (season === "summer") {
    topColor = lerpColor(color(60, 170, 255), color(255, 210, 80), pulse1);
    bottomColor = lerpColor(color(255, 170, 100), color(255, 240, 120), pulse2);
  } else if (season === "autumn") {
    topColor = lerpColor(color(130, 50, 20), color(255, 120, 40), pulse1);
    bottomColor = lerpColor(color(255, 150, 60), color(255, 220, 90), pulse2);
  } else {
    topColor = lerpColor(color(100, 220, 180), color(255, 170, 220), pulse1);
    bottomColor = lerpColor(color(180, 255, 220), color(255, 220, 255), pulse2);
  }

  for (let y = 0; y < height; y++) {
    const inter = map(y, 0, height, 0, 1);
    stroke(lerpColor(topColor, bottomColor, inter));
    line(0, y, width, y);
  }
}

// =========================
// WEATHER & COLLISION Restored
// =========================
function drawRain() {
  stroke(180, 220, 255, 120);
  for (let i = 0; i < 200; i++) {
    const x = (frameCount * 15 + i * 77) % width;
    const y = (i * 47 + frameCount * 25) % height;
    line(x, y, x - 8, y + 22);
  }
}

function drawSnow() {
  noStroke(); fill(255, 220);
  for (let i = 0; i < 120; i++) {
    const x = (i * 57 + sin(frameCount * 0.01 + i) * 40) % width;
    const y = (frameCount * 1.5 + i * 41) % height;
    circle(x, y, random(2, 6));
  }
}

function drawFog() {
  noStroke();
  for (let i = 0; i < 8; i++) {
    fill(255, 20);
    ellipse(random(width), random(height), 400, 200);
  }
}

function handleCollisions() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i];
      const b = particles[j];
      if (a.isDragging || b.isDragging) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = sqrt(dx * dx + dy * dy);
      const minDist = (a.size * a.currentScale * 0.35) + (b.size * b.currentScale * 0.35);
      if (distance < minDist) {
        const angle = atan2(dy, dx);
        const ax = (a.x + cos(angle) * minDist - b.x) * 0.015;
        const ay = (a.y + sin(angle) * minDist - b.y) * 0.015;
        a.vx -= ax; a.vy -= ay;
        b.vx += ax; b.vy += ay;
      }
    }
  }
}

// =========================
// MOUSE INTERACTION (UI Protection Restored)
// =========================
function mousePressed(event) {
  const isClickOnUI = event.target.closest('#top-bar') || event.target.closest('#sidebar') || event.target.closest('#player-bar');
  if (isClickOnUI) return;

  for (let p of particles) {
    const d = dist(mouseX, mouseY, p.x, p.y);
    if (d < p.size * 0.5) {
      p.clicked();
      draggedParticle = p;
      p.isDragging = true;
      break;
    }
  }
}

function mouseReleased() {
  if (draggedParticle) { draggedParticle.isDragging = false; draggedParticle = null; }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// =========================
// MUSIC PLAYER LOGIC & VISUALIZER
// =========================
const masterPlayBtn = document.getElementById('master-play-pause');
const timeline = document.getElementById('timeline');
const currentTimeText = document.getElementById('current-time');
const durationText = document.getElementById('total-duration');
const volumeSlider = document.getElementById('volume-slider');
const barTitle = document.getElementById('current-song-title');
const barType = document.getElementById('current-nature-type');

volumeSlider.addEventListener('input', (e) => {
  currentAudio.volume = e.target.value;
});

timeline.addEventListener('input', () => {
  currentAudio.currentTime = currentAudio.duration * (timeline.value / 100);
});

masterPlayBtn.addEventListener('click', () => {
  if (!currentAudio.src) return;
  
  if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
  }

  if (currentAudio.paused) { 
    currentAudio.play(); 
    masterPlayBtn.innerText = "PAUSE"; 
  } else { 
    currentAudio.pause(); 
    masterPlayBtn.innerText = "PLAY"; 
  }
});

function toggleMusic(type, songName, btnElement) {
  const filePath = `resources/music/${type}/${songName}.mp3`;

  // If clicking the same song, just play/pause
  if (currentAudio.src.includes(encodeURIComponent(songName))) {
    if (currentAudio.paused) currentAudio.play(); 
    else currentAudio.pause();
    return;
  }

  // --- WEB AUDIO API SETUP (Runs only once on the first song click) ---
  if (!audioCtx) {
    // Browsers require user interaction before creating audio contexts
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256; // Controls how many audio bands we get
    
    audioSource = audioCtx.createMediaElementSource(currentAudio);
    audioSource.connect(analyser);
    analyser.connect(audioCtx.destination);

    visualizerCanvas = document.getElementById('audio-visualizer');
    visCtx = visualizerCanvas.getContext('2d');
    
    drawVisualizer(); // Start the visualizer loop
  }

  // Always make sure the context is running
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  // Load and play the new song
  currentAudio.src = filePath;
  currentAudio.volume = volumeSlider.value;
  currentAudio.play();

  // Update UI Text
  barTitle.innerText = songName;
  barType.innerText = type;

  // Sync timelines and master button
  currentAudio.ontimeupdate = () => {
    timeline.value = (currentAudio.currentTime / currentAudio.duration) * 100 || 0;
    currentTimeText.innerText = formatTime(currentAudio.currentTime);
    durationText.innerText = formatTime(currentAudio.duration);
  };

  currentAudio.onplay = () => masterPlayBtn.innerText = "PAUSE";
  currentAudio.onpause = () => masterPlayBtn.innerText = "PLAY";
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// =========================
// VISUALIZER RENDER LOOP
// =========================
function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  
  if (!visCtx || !analyser) return;

  // Sync canvas internal resolution to the actual display size
  if (visualizerCanvas.width !== windowWidth) {
      visualizerCanvas.width = windowWidth;
      visualizerCanvas.height = 150; 
  }

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  visCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

  // Calculate bar width based on the full screen width
  const barWidth = (visualizerCanvas.width / bufferLength) * 2.5;
  let barHeight;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    // scale the height based on the new 150px height
    barHeight = (dataArray[i] / 255) * visualizerCanvas.height; 

    // Gradient-like effect: higher bars are more opaque
    let alpha = map(dataArray[i], 0, 255, 0.1, 0.6);
    visCtx.fillStyle = `rgba(255, 50, 255, ${alpha})`;
    
    // Draw the bar
    visCtx.fillRect(x, visualizerCanvas.height - barHeight, barWidth - 1, barHeight);

    x += barWidth;
  }
}

// Helper function for the alpha mapping
function map(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}