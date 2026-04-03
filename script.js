// --- 1. ตั้งค่าพื้นฐาน (ประกาศแค่ครั้งเดียว) ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");
const countdownEl = document.getElementById("countdown");
const pauseBtn = document.getElementById("pauseBtn");

let score = 0;
let highScore = localStorage.getItem("spaceHighScore") || 0;
if (highScoreElement) highScoreElement.innerText = highScore;

let gameActive = false;
let isPaused = false;
let animationId;

// ตั้งค่าตัวละคร
const player = { x: 0, y: 0, w: 40, h: 40, color: "#00f2fe" };
let bullets = [];
let enemies = [];

// --- 2. ฟังก์ชันเริ่มเกม ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = canvas.width / 2 - player.w / 2;
    player.y = canvas.height - 100;
}
window.addEventListener("resize", resize);
resize();

function startCountdown() {
    let count = 3;
    countdownEl.style.display = "flex";
    countdownEl.innerText = count;
    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            countdownEl.innerText = count;
        } else {
            clearInterval(timer);
            countdownEl.style.display = "none";
            gameActive = true;
        }
    }, 1000);
}

// --- 3. ระบบการเล่น (Update & Draw) ---
function draw() {
    if (!gameActive || isPaused) {
        animationId = requestAnimationFrame(draw);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // วาดผู้เล่น
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.w, player.h);

    // จัดการกระสุน
    bullets.forEach((b, i) => {
        b.y -= 7;
        ctx.fillStyle = "#ff0055";
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (b.y < 0) bullets.splice(i, 1);
    });

    // จัดการศัตรู
    if (Math.random() < 0.04) {
        enemies.push({ x: Math.random() * (canvas.width - 40), y: -40, w: 40, h: 40 });
    }

    enemies.forEach((en, i) => {
        en.y += 4;
        ctx.fillStyle = "#ffac2d";
        ctx.fillRect(en.x, en.y, en.w, en.h);

        // เช็คชนยาน
        if (en.x < player.x + player.w && en.x + en.w > player.x &&
            en.y < player.y + player.h && en.y + en.h > player.y) {
            gameOver();
        }

        // เช็คกระสุนโดนศัตรู
        bullets.forEach((b, bi) => {
            if (b.x < en.x + en.w && b.x + b.w > en.x &&
                b.y < en.y + en.h && b.y + b.h > en.y) {
                enemies.splice(i, 1);
                bullets.splice(bi, 1);
                score += 10;
                scoreElement.innerText = score;
            }
        });

        if (en.y > canvas.height) enemies.splice(i, 1);
    });

    animationId = requestAnimationFrame(draw);
}

function gameOver() {
    gameActive = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("spaceHighScore", highScore);
        highScoreElement.innerText = highScore;
        alert("New High Score: " + highScore);
    } else {
        alert("Game Over! Score: " + score);
    }
    resetGame();
}

function resetGame() {
    score = 0;
    scoreElement.innerText = score;
    enemies = [];
    bullets = [];
    resize();
    startCountdown();
}

// ระบบยิง
setInterval(() => { if (gameActive && !isPaused) shoot(); }, 200);
function shoot() {
    bullets.push({ x: player.x + player.w/2 - 3, y: player.y, w: 6, h: 15 });
}

// ควบคุม (Mouse/Touch)
window.addEventListener("mousemove", (e) => { player.x = e.clientX - player.w/2; });
window.addEventListener("touchmove", (e) => { 
    player.x = e.touches[0].clientX - player.w/2; 
    e.preventDefault(); 
}, {passive: false});

pauseBtn.onclick = () => { isPaused = !isPaused; pauseBtn.innerText = isPaused ? "เล่นต่อ" : "หยุดเกม"; };

startCountdown();
draw();
