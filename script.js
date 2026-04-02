const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const countdownEl = document.getElementById("countdown");
const pauseBtn = document.getElementById("pauseBtn");

canvas.width = 400;
canvas.height = 600;

let score = 0;
let gameActive = false;
let isPaused = false;
let isCountingDown = false;
let bullets = [];
let enemies = [];
let lastShot = 0;
const keys = {}; // เก็บสถานะการกดปุ่มคีย์บอร์ด

const player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 100,
  w: 40,
  h: 40,
  speed: 7, // ความเร็วเคลื่อนที่บนคอม
  color: "#00f2fe"
};

// --- 1. ระบบควบคุม (Keyboard สำหรับคอม) ---
window.addEventListener("keydown", e => {
  keys[e.code] = true;
  if (e.code === "KeyP") togglePause();
});
window.addEventListener("keyup", e => keys[e.code] = false);

// --- 2. ระบบควบคุม (Touch สำหรับมือถือ) ---
canvas.addEventListener("touchmove", (e) => {
  if (!gameActive || isPaused) return;
  let touch = e.touches[0];
  let rect = canvas.getBoundingClientRect();
  let scaleX = canvas.width / rect.width;
  let newX = (touch.clientX - rect.left) * scaleX - player.w / 2;
  
  if (newX > 0 && newX < canvas.width - player.w) {
    player.x = newX;
  }
  e.preventDefault();
}, {passive: false});

// --- 3. ฟังก์ชันระบบเกม ---
function shoot() {
  bullets.push({ x: player.x + player.w/2 - 3, y: player.y, w: 6, h: 15 });
}

function togglePause() {
  if (isCountingDown) return;
  isPaused = !isPaused;
  pauseBtn.innerText = isPaused ? "เล่นต่อ" : "หยุดเกม";
}

function startCountdown() {
  let count = 3;
  isCountingDown = true;
  gameActive = false;
  countdownEl.style.display = "block";
  countdownEl.innerText = count;
  const timer = setInterval(() => {
    count--;
    if (count > 0) countdownEl.innerText = count;
    else {
      clearInterval(timer);
      countdownEl.innerText = "GO!";
      setTimeout(() => { 
        countdownEl.style.display = "none"; 
        isCountingDown = false; 
        gameActive = true; 
      }, 500);
    }
  }, 1000);
}

function update() {
  if (!gameActive || isPaused) return;

  // ควบคุมด้วยคีย์บอร์ด (คอม)
  if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed;
  if (keys["ArrowRight"] && player.x < canvas.width - player.w) player.x += player.speed;

  // ยิงอัตโนมัติ (ทั้งคอมและมือถือ)
  if (Date.now() - lastShot > 200) {
    shoot();
    lastShot = Date.now();
  }

  // เคลื่อนที่กระสุน
  bullets.forEach((b, i) => {
    b.y -= 10;
    if (b.y < 0) bullets.splice(i, 1);
  });

  // สุ่มศัตรู
  if (Math.random() < 0.04) {
    enemies.push({ x: Math.random() * (canvas.width - 35), y: -40, w: 35, h: 35 });
  }

  enemies.forEach((en, ei) => {
    en.y += 4;
    
    // ตรวจชน: กระสุนชนศัตรู
    bullets.forEach((b, bi) => {
      if (b.x < en.x + en.w && b.x + b.w > en.x && b.y < en.y + en.h && b.y + b.h > en.y) {
        enemies.splice(ei, 1);
        bullets.splice(bi, 1);
        score += 10;
        scoreElement.innerText = score;
      }
    });

    // ตรวจชน: ศัตรูชนยาน
    if (player.x < en.x + en.w && player.x + player.w > en.x && player.y < en.y + en.h && player.y + player.h > en.y) {
      gameActive = false;
      setTimeout(() => {
        alert("ยานระเบิด! คะแนน: " + score);
        resetGame();
      }, 10);
    }
    if (en.y > canvas.height) enemies.splice(ei, 1);
  });
}

function resetGame() {
  score = 0; scoreElement.innerText = score;
  player.x = canvas.width / 2 - 20;
  bullets = []; enemies = [];
  startCountdown();
}

pauseBtn.addEventListener("click", togglePause);

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // วาดผู้เล่น
  ctx.fillStyle = player.color;
  ctx.shadowBlur = 15; ctx.shadowColor = player.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);
  
  // วาดกระสุน
  ctx.fillStyle = "yellow"; ctx.shadowColor = "yellow";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
  
  // วาดศัตรู
  ctx.fillStyle = "#ff4b2b"; ctx.shadowColor = "#ff4b2b";
  enemies.forEach(en => ctx.fillRect(en.x, en.y, en.w, en.h));

  if (isPaused) {
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = "#00f2fe"; ctx.font = "24px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("หยุดเกมชั่วคราว", canvas.width/2, canvas.height/2);
  }

  ctx.shadowBlur = 0;
  update();
  requestAnimationFrame(draw);
}

startCountdown();
draw();