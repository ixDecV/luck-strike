/* ==============================
   State & Constants
============================== */
let username = "";
let points = 100;
let players = [];
let currentPlayerIndex = 0;
let spinning = false;

const SEGMENTS = [
  { label: "x2 Booster", type: "mult", value: 2,  color: "#ff5f6d" },
  { label: "Lose 20%",   type: "lose", value: .2, color: "#37ecba" },
  { label: "Nothing",    type: "none", value: 0,  color: "#5f6dff" },
  { label: "x3 Booster", type: "mult", value: 3,  color: "#ffd166" },
  { label: "JACKPOT x10",type: "mult", value:10,  color: "#e75fff" },
  { label: "Lose 30%",   type: "lose", value: .3, color: "#23a6d5" },
];
const SEG_ANGLE = 360 / SEGMENTS.length;

/* Probabilities (must sum to 1) in the SAME order as SEGMENTS */
const WEIGHTS = [0.25, 0.20, 0.30, 0.18, 0.04, 0.03];

/* ==============================
   DOM
============================== */
const headerUser = document.getElementById("headerUser");

const screenUsername = document.getElementById("screen-username");
const screenMenu     = document.getElementById("screen-menu");
const screenLobby    = document.getElementById("screen-lobby");
const screenGame     = document.getElementById("screen-game");

const usernameInput  = document.getElementById("usernameInput");
const usernameBtn    = document.getElementById("usernameBtn");

const welcomeUser = document.getElementById("welcomeUser");
const playBtn = document.getElementById("playBtn");
const changeUserBtn = document.getElementById("changeUserBtn");
const exitBtn = document.getElementById("exitBtn");

const botBtn = document.getElementById("botBtn");
const playersBtn = document.getElementById("playersBtn");
const playerCount = document.getElementById("playerCount");
const twoPlayersBtn = document.getElementById("twoPlayersBtn");
const fourPlayersBtn = document.getElementById("fourPlayersBtn");
const createLobbyBtn = document.getElementById("createLobbyBtn");
const exitLobbyBtn = document.getElementById("exitLobbyBtn");

const playerListDiv = document.getElementById("playerList");
const pointsDisplay = document.getElementById("points");

const wheel = document.getElementById("wheel");
const betInput = document.getElementById("betInput");
const betBtn = document.getElementById("betBtn");
const resultDiv = document.getElementById("result");

const toastContainer = document.getElementById("toastContainer");

/* ==============================
   Utilities
============================== */
function show(screen) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
}

function toast(msg, type=""){ // type: "", "success", "warn", "error"
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  toastContainer.appendChild(el);
  setTimeout(()=>{ el.style.opacity = "0"; setTimeout(()=>el.remove(), 250); }, 2200);
}

function animatePoints(from, to) {
  const step = Math.sign(to - from);
  let current = from;
  const int = setInterval(()=>{
    if (current === to) { clearInterval(int); return; }
    current += step;
    pointsDisplay.textContent = current;
  }, 15);
}

function weightedChoice(weights) {
  const r = Math.random();
  let acc = 0;
  for (let i=0;i<weights.length;i++){
    acc += weights[i];
    if (r <= acc) return i;
  }
  return weights.length - 1; // fallback
}

function setActivePlayer(idx){
  currentPlayerIndex = idx % players.length;
  renderPlayers();
}

function renderPlayers(){
  playerListDiv.innerHTML = "";
  players.forEach((p, i)=>{
    const row = document.createElement("div");
    row.className = "player" + (i===currentPlayerIndex ? " active" : "");
    const left = document.createElement("div");
    left.textContent = p.name;
    const right = document.createElement("div");
    right.innerHTML = `<span class="badge">${p.points} pts</span>`;
    row.appendChild(left); row.appendChild(right);
    playerListDiv.appendChild(row);
  });
  points = players[ getHumanIndex() ].points;
  pointsDisplay.textContent = points;
}

function getHumanIndex(){
  return players.findIndex(p => !p.bot);
}

/* ==============================
   Sounds (Web Audio API)
============================== */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioCtx();

function tone(freq=440, dur=0.08, type="sine", gain=0.05){
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  g.gain.value = gain;
  osc.connect(g).connect(audioCtx.destination);
  osc.start();
  setTimeout(()=>{ osc.stop(); }, dur*1000);
}

function spinTick(){ tone(900, 0.03, "square", 0.03); }
function winSound(){ tone(620, .12, "triangle", .06); setTimeout(()=>tone(880,.12,"triangle",.06), 120); }
function loseSound(){ tone(200, .15, "sawtooth", .05); }
function jackpotSound(){
  [660,880,1047,1320].forEach((f,i)=> setTimeout(()=>tone(f,.12,"triangle",.08), i*120));
}

/* ==============================
   Confetti
============================== */
function confettiBurst(ms=2400){
  const canvas = document.getElementById("confetti-canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = innerWidth; canvas.height = innerHeight;
  const N = 160;
  const flakes = Array.from({length:N},()=>({
    x: Math.random()*canvas.width,
    y: -Math.random()*canvas.height,
    r: Math.random()*6+3,
    vy: Math.random()*2+2,
    vx: (Math.random()-0.5)*2,
    rot: Math.random()*360
  }));
  let raf;
  const t0 = performance.now();
  (function loop(t){
    const dt = t - (loop.tPrev||t); loop.tPrev = t;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    flakes.forEach(f=>{
      f.y += f.vy; f.x += f.vx; f.rot += 6;
      if (f.y > canvas.height) { f.y = -10; f.x = Math.random()*canvas.width; }
      ctx.save();
      ctx.translate(f.x,f.y);
      ctx.rotate(f.rot*Math.PI/180);
      ctx.fillStyle = `hsl(${(f.x/4)%360},100%,55%)`;
      ctx.fillRect(-f.r/2,-f.r/2,f.r,f.r);
      ctx.restore();
    });
    if (t - t0 < ms) { raf = requestAnimationFrame(loop); }
    else { cancelAnimationFrame(raf); ctx.clearRect(0,0,canvas.width,canvas.height); }
  })(t0);
}

/* ==============================
   Username / Menu
============================== */
usernameBtn.addEventListener("click", ()=>{
  const name = usernameInput.value.trim();
  if (!name){ toast("Please enter a username.","warn"); return; }
  username = name;
  headerUser.textContent = name;
  welcomeUser.textContent = `Welcome, ${name}!`;
  toast(`Hello ${name}!`, "success");
  show(screenMenu);
});

changeUserBtn.addEventListener("click", ()=> show(screenUsername));
playBtn.addEventListener("click", ()=> show(screenLobby));
exitBtn.addEventListener("click", ()=> {
  toast("Thanks for playing!");
  show(screenUsername);
  usernameInput.value = "";
  headerUser.textContent = "Guest";
});

/* ==============================
   Lobby
============================== */
let pendingPlayers = [];
let chosenMode = "bot"; // "bot" | "players"
let totalPlayers = 2;

botBtn.addEventListener("click", ()=>{
  chosenMode = "bot";
  pendingPlayers = [{name: username, points: 100, bot:false}, {name:"Bot", points:100, bot:true}];
  totalPlayers = 2;
  createLobbyBtn.disabled = false;
  playerCount.classList.add("hidden");
  toast("Solo vs Bot selected.","success");
});

playersBtn.addEventListener("click", ()=>{
  chosenMode = "players";
  playerCount.classList.remove("hidden");
  createLobbyBtn.disabled = true;
});

twoPlayersBtn.addEventListener("click", ()=>{
  totalPlayers = 2;
  pendingPlayers = [{name: username, points:100, bot:false}, {name:"Player2", points:100, bot:false}];
  createLobbyBtn.disabled = false;
  toast("2 players selected.","success");
});
fourPlayersBtn.addEventListener("click", ()=>{
  totalPlayers = 4;
  pendingPlayers = [
    {name: username, points:100, bot:false},
    {name:"Player2", points:100, bot:false},
    {name:"Player3", points:100, bot:false},
    {name:"Player4", points:100, bot:false},
  ];
  createLobbyBtn.disabled = false;
  toast("4 players selected.","success");
});

exitLobbyBtn.addEventListener("click", ()=> show(screenMenu));

createLobbyBtn.addEventListener("click", ()=>{
  players = JSON.parse(JSON.stringify(pendingPlayers));
  currentPlayerIndex = Math.floor(Math.random()*players.length);
  toast(`${players[currentPlayerIndex].name} goes first!`, "success");
  renderPlayers();
  resultDiv.textContent = "";
  betInput.value = "";
  show(screenGame);
  // If bot starts, auto play
  if (players[currentPlayerIndex].bot) setTimeout(botTurn, 900);
});

/* ==============================
   Wheel Logic
============================== */
function angleForSegment(idx){
  // Center angle for segment index (0 at 0deg, clockwise)
  const center = idx * SEG_ANGLE + SEG_ANGLE/2; // degrees from 0 (right)
  // We want that center to be at top (90deg). If wheel rotates by R, the visual angle = (center + R).
  // So set R = 90 - center (mod 360). Add several extra spins for flair.
  const base = (90 - center);
  const spins = 6 + Math.floor(Math.random()*3); // 6..8 full spins
  return spins*360 + base;
}

function spinToOutcome(idx, onDone){
  if (spinning) return;
  spinning = true;
  betBtn.disabled = true;
  let tickTimer;

  // ticking sound during spin (accelerate then decelerate)
  let tickInterval = 90;
  function startTicks(){
    tickTimer = setInterval(()=>{ spinTick(); }, tickInterval);
    // accelerate
    setTimeout(()=> { clearInterval(tickTimer); tickInterval = 50; startTicks(); }, 500);
    setTimeout(()=> { clearInterval(tickTimer); tickInterval = 70; startTicks(); }, 2000);
    setTimeout(()=> { clearInterval(tickTimer); tickInterval = 110; startTicks(); }, 3500);
  }
  startTicks();

  // rotate
  const angle = angleForSegment(idx);
  wheel.style.transform = `rotate(${angle}deg)`;

  setTimeout(()=>{
    clearInterval(tickTimer);
    spinning = false;
    betBtn.disabled = false;
    onDone?.();
  }, 5000);
}

function applyOutcome(playerIdx, bet, seg){
  const p = players[playerIdx];
  let delta = 0;
  if (seg.type === "mult"){
    delta = Math.floor(bet * seg.value);
    p.points += delta;
    resultDiv.innerHTML = `🎉 <span style="color:var(--gold)">${seg.label}</span>! +${delta} pts`;
    winSound();
    if (seg.value >= 10){ jackpotSound(); confettiBurst(); }
  } else if (seg.type === "lose"){
    delta = -Math.floor(bet * seg.value);
    p.points += delta;
    resultDiv.innerHTML = `😬 ${seg.label}: ${delta} pts`;
    loseSound();
  } else {
    resultDiv.textContent = `😐 Nothing happened…`;
  }

  // If human changed, animate number in side panel
  if (!p.bot && p.name === username){
    const old = points;
    points = p.points;
    animatePoints(old, points);
  } else {
    renderPlayers();
  }
}

function endTurn(){
  setActivePlayer(currentPlayerIndex+1);
  const active = players[currentPlayerIndex];
  if (active.bot) setTimeout(botTurn, 800);
}

function humanTurn(){
  const idx = getHumanIndex();
  if (currentPlayerIndex !== idx){
    toast("It’s not your turn.", "warn");
    return;
  }
  const bet = parseInt(betInput.value || "0", 10);
  if (!bet || bet <= 0) return toast("Enter a valid bet.", "warn");
  if (bet > players[idx].points) return toast("Bet exceeds your points.", "error");

  const segIndex = weightedChoice(WEIGHTS);
  spinToOutcome(segIndex, ()=>{
    applyOutcome(idx, bet, SEGMENTS[segIndex]);
    renderPlayers();
    endTurn();
  });
}

function botTurn(){
  const idx = currentPlayerIndex; // bot index
  const bot = players[idx];
  const maxBet = Math.max(5, Math.floor(bot.points * 0.15));
  const bet = Math.max(1, Math.min(bot.points, Math.floor(Math.random()*maxBet)+1));
  resultDiv.textContent = `🤖 Bot bets ${bet} pts…`;

  const segIndex = weightedChoice(WEIGHTS);
  spinToOutcome(segIndex, ()=>{
    applyOutcome(idx, bet, SEGMENTS[segIndex]);
    renderPlayers();
    endTurn();
  });
}

/* ==============================
   Events
============================== */
betBtn.addEventListener("click", humanTurn);

/* safeguard: prevent page gestures from blocking audio on iOS */
document.body.addEventListener("touchstart", ()=>{ if (audioCtx.state === "suspended") audioCtx.resume(); }, {passive:true});
document.body.addEventListener("click", ()=>{ if (audioCtx.state === "suspended") audioCtx.resume(); }, {passive:true});
