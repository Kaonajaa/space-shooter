// --- 1. ตั้งค่าพื้นฐาน (เน้นตัวแปรที่ใช้ใน Canvas) ---
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

const player = { x: 0, y: 0, w: 40, h: 40, color: "#00f2fe" };
let bullets = [];
let enemies = [];

// --- 2. ระบบปรับขนาดจอ ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = canvas.width / 2 - player.w / 2;
    player.y = canvas.height - 100;
}
window.addEventListener("resize", resize);
resize();

// --- 3. ฟังก์ชันวาดหัวใจ (วาดลงบน Canvas ตรงๆ) ---
function drawPlayerLives() {
    for (let i = 0; i < lives; i++) {
        let hX = player.x + (i * 15) + (player.w / 2) - (lives * 7.5);
        let hY = player.y + player.h + 15;
        
        ctx.fillStyle = "red";
        // วาดรูปหัวใจแบบง่าย (วงกลม 2 วง + สามเหลี่ยม)
        ctx.beginPath();
        ctx.arc(hX - 3, hY, 3, 0, Math.PI * 2);
        ctx.arc(hX + 3, hY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(hX - 6, hY + 1);
        ctx.lineTo(hX, hY + 8);
        ctx.lineTo(hX + 6, hY + 1);
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
            requestAnimationFrame(draw); // เริ่มวาดหลังจากนับถอยหลังเสร็จ
        }
    }, 1000);
}

function draw() {
    if (!gameActive) return; // ถ้าจบเกมให้หยุดวาดทันที ไม่ให้ค้าง
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

    // กระสุน
    bullets.forEach((b, i) => {
        b.y -= 7;
        ctx.fillStyle = "yellow";
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (b.y < 0) bullets.splice(i, 1);
    });

    // ศัตรู
    let spawnRate = 0.04 + (score / 10000);
    if (Math.random() < Math.min(spawnRate, 0.1)) {
        enemies.push({ 
            x: Math.random() * (canvas.width - 40), 
            y: -40, w: 40, h: 40, 
            speed: 4 + (score / 1000) 
        });
    }

    enemies.forEach((en, i) => {
        en.y += en.speed;
        ctx.fillStyle = "red";
        ctx.fillRect(en.x, en.y, en.w, en.h);

        // เช็คชนยาน
        if (!isInvincible && 
            en.x < player.x + player.w && en.x + en.w > player.x &&
            en.y < player.y + player.h && en.y + en.h > player.y) {
            
            enemies.splice(i, 1);
            lives--;
            
            if (lives <= 0) {
                gameActive = false; // หยุดระบบก่อนแจ้งเตือน
                setTimeout(() => { gameOver(); }, 10); 
                return;
            } else {
                isInvincible = true;
                setTimeout(() => { isInvincible = false; }, 1500);
            }
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

    requestAnimationFrame(draw);
}

function gameOver() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("spaceHighScore", highScore);
        if (highScoreElement) highScoreElement.innerText = highScore;
        alert("สถิติใหม่! " + highScore);
    } else {
        alert("Game Over! คะแนน: " + score);
    }
    resetGame();
}

function resetGame() {
    lives = 3;
    score = 0;
    scoreElement.innerText = score;
    enemies = [];
    bullets = [];
    isInvincible = false;
    resize();
    startCountdown();
}

// ระบบยิงและควบคุม (เหมือนเดิม)
setInterval(() => { if (gameActive && !isPaused) shoot(); }, 200);
function shoot() {
    bullets.push({ x: player.x + player.w/2 - 3, y: player.y, w: 6, h: 15 });
}
window.addEventListener("mousemove", (e) => { player.x = e.clientX - player.w/2; });
window.addEventListener("touchmove", (e) => { 
    player.x = e.touches[0].clientX - player.w/2; 
    e.preventDefault(); 
}, {passive: false});

pauseBtn.onclick = () => { isPaused = !isPaused; pauseBtn.innerText = isPaused ? "เล่นต่อ" : "หยุดเกม"; };

startCountdown();
