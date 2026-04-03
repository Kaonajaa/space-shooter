// --- 1. ตั้งค่าพื้นฐาน ---
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
let lives = 3;
let isInvincible = false;

// ตัวแปรสำหรับผู้เล่น
const player = { 
    x: 0, y: 0, w: 40, h: 40, 
    color: "#00f2fe",
    baseColor: "#00f2fe" 
};

let bullets = [];
let enemies = [];

// --- 2. ระบบปรับขนาดจอ ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = canvas.width / 2 - player.w / 2;
    player.y = canvas.height - 150;
}
window.addEventListener("resize", resize);
resize();

// --- 3. ฟังก์ชันวาดหัวใจ (วาดแบบสมมาตร) ---
function drawPlayerLives() {
    for (let i = 0; i < lives; i++) {
        let hX = player.x + (i * 22) + (player.w / 2) - (lives * 11);
        let hY = player.y + player.h + 15;
        
        ctx.fillStyle = "#ff4d4d";
        ctx.beginPath();
        // วาดหัวใจโดยใช้เส้นโค้งสมมาตร
        ctx.moveTo(hX, hY + 4);
        ctx.bezierCurveTo(hX, hY, hX - 10, hY, hX - 10, hY + 7);
        ctx.bezierCurveTo(hX - 10, hY + 11, hX, hY + 16, hX, hY + 20); // ปลายล่าง
        ctx.bezierCurveTo(hX, hY + 16, hX + 10, hY + 11, hX + 10, hY + 7);
        ctx.bezierCurveTo(hX + 10, hY, hX, hY, hX, hY + 4);
        ctx.fill();
    }
}

// --- 4. ฟังก์ชันจัดการเกม ---
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
            requestAnimationFrame(draw);
        }
    }, 1000);
}

function draw() {
    if (!gameActive) return;
    if (isPaused) {
        requestAnimationFrame(draw);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // วาดผู้เล่น (กระพริบตอนอมตะ)
    if (!isInvincible || Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.w, player.h);
    }
    
    drawPlayerLives();

    // จัดการกระสุน
    bullets.forEach((b, i) => {
        b.y -= 8;
        ctx.fillStyle = "yellow";
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (b.y < 0) bullets.splice(i, 1);
    });

    // จัดการศัตรู
    let spawnRate = 0.04 + (score / 10000);
    if (Math.random() < Math.min(spawnRate, 0.12)) {
        enemies.push({ 
            x: Math.random() * (canvas.width - 40), 
            y: -40, w: 40, h: 40, 
            speed: 4 + (score / 1200) 
        });
    }

    enemies.forEach((en, i) => {
        en.y += en.speed;
        ctx.fillStyle = "red";
        ctx.fillRect(en.x, en.y, en.w, en.h);

        // --- เช็คชนยาน ---
        if (!isInvincible && 
            en.x < player.x + player.w && en.x + en.w > player.x &&
            en.y < player.y + player.h && en.y + en.h > player.y) {
            
            enemies.splice(i, 1);
            lives--;

            // เอฟเฟกต์โดนดาเมจ: จอสั่น + ตัวแดง
            triggerScreenShake();
            player.color = "red";
            setTimeout(() => { player.color = player.baseColor; }, 200);

            if (lives <= 0) {
                gameActive = false;
                setTimeout(gameOver, 10);
                return;
            } else {
                isInvincible = true;
                setTimeout(() => { isInvincible = false; }, 1500);
            }
        }
