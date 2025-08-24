  // -------------------------------
// Lucky Strike v0.3 – Full Wheel + Bugfix
// -------------------------------

const SEGMENTS = [
  { label: "x2", type: "mult", value: 2 },
  { label: "x3", type: "mult", value: 3 },
  { label: "x5", type: "mult", value: 5 },
  { label: "Jackpot", type: "jackpot", value: 10 },
  { label: "Nothing", type: "nothing", value: 0 },
  { label: "Half", type: "loss", value: 0.5 }
];

const WEIGHTS = [0.25, 0.2, 0.15, 0.05, 0.25, 0.1]; // sum=1

let players = [];
let currentPlayerIndex = 0;
let spinning = false;

// DOM Elements
const canvas = document.getElementById("wheel-canvas");
const ctx = canvas.getContext("2d");
const spinBtn = document.querySelector("#spin-btn");
const resultText = document.querySelector("#result-text");
const playersList = document.querySelector("#players-list");
const betInput = document.querySelector("#bet-input");

// -------------------------------
// Draw Wheel
// -------------------------------
function drawWheel() {
  const centerX = canvas.width/2;
  const centerY = canvas.height/2;
  const radius = canvas.width/2 - 10;
  const segmentAngle = 2 * Math.PI / SEGMENTS.length;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  SEGMENTS.forEach((seg, i) => {
    const start = i * segmentAngle;
    const end = start + segmentAngle;

    // Color segments
    ctx.fillStyle = i % 2 === 0 ? "#ffcc00" : "#ff6600";
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, start, end);
    ctx.closePath();
    ctx.fill();

    // Draw label
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(start + segmentAngle/2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#000";
    ctx.font = "bold 16px Arial";
    ctx.fillText(seg.label, radius - 10, 5);
    ctx.restore();
  });
}

// -------------------------------
// Player Rendering
// -------------------------------
function renderPlayers() {
  playersList.innerHTML = "";
  players.forEach(p => {
    const div = document.createElement("div");
    div.classList.add("player-item");
    div.textContent = `${p.name}: ${p.points} pts`;
    div.classList.toggle("active", players.indexOf(p) === currentPlayerIndex);
    playersList.appendChild(div);
  });
}

// -------------------------------
// Utils
// -------------------------------
function randomWeightedIndex(weights) {
  let sum = 0;
  const r = Math.random();
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (r <= sum) return i;
  }
  return weights.length - 1;
}

function setActivePlayer(index) {
  currentPlayerIndex = index;
  renderPlayers();
}

// -------------------------------
// Spin Logic
// -------------------------------
function spinWheel() {
  if (spinning) return;

  const currentPlayer = players[currentPlayerIndex];
  const bet = Number(betInput.value);
  if (!bet || bet <= 0 || bet > currentPlayer.points) {
    alert("Invalid bet!");
    return;
  }

  spinning = true;
  spinBtn.disabled = true;
  resultText.textContent = "Spinning...";

  // Pick outcome
  const index = randomWeightedIndex(WEIGHTS);
  const segment = SEGMENTS[index];

  const segmentAngle = 360 / SEGMENTS.length;
  const spins = 6; // full rotations
  const randomOffset = segmentAngle * Math.random();
  const finalAngle = spins*360 + index*segmentAngle + randomOffset;

  canvas.style.transition = "transform 5s cubic-bezier(0.33,1,0.68,1)";
  canvas.style.transform = `rotate(${finalAngle}deg)`;

  canvas.addEventListener("transitionend", function handler() {
    canvas.removeEventListener("transitionend", handler);
    spinning = false;
    spinBtn.disabled = false;

    // Apply outcome
    let pointsChange = 0;
    switch(segment.type) {
      case "mult":
        pointsChange = bet * segment.value;
        currentPlayer.points += pointsChange;
        resultText.textContent = `${segment.label} (+${pointsChange} pts)`;
        break;
      case "jackpot":
        pointsChange = bet * segment.value;
        currentPlayer.points += pointsChange;
        resultText.textContent = `🎉 Jackpot! (+${pointsChange} pts)`;
        break;
      case "loss":
        pointsChange = Math.floor(bet * segment.value);
        currentPlayer.points -= pointsChange;
        resultText.textContent = `Lost ${pointsChange} pts`;
        break;
      case "nothing":
        resultText.textContent = `Nothing`;
        break;
    }

    // Next player
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    setActivePlayer(currentPlayerIndex);

    // Auto-bot turn
    const nextPlayer = players[currentPlayerIndex];
    if (nextPlayer.bot) setTimeout(botTurn, 1500);
  });
}

// -------------------------------
// Bot Logic
// -------------------------------
function botTurn() {
  if (spinning) return;
  const bot = players[currentPlayerIndex];
  const maxBet = Math.max(1, Math.floor(bot.points * 0.5));
  betInput.value = Math.floor(Math.random() * maxBet) + 1;
  spinWheel();
}

// -------------------------------
// Event Listeners
// -------------------------------
spinBtn.addEventListener("click", spinWheel);

// -------------------------------
// Example Init
// -------------------------------
players = [
  { name: "You", points: 100, bot: false },
  { name: "Bot", points: 100, bot: true }
];

drawWheel();
renderPlayers();
