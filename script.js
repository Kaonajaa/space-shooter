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
let screenShakeTime = 0; // เวลาที่เหลือในการสั่น
const screenShakeIntensity = 10; // ความแรงของการสั่น

const player = { x: 0, y: 0, w: 40, h: 40, color: "#00f2fe" };
let bullets = [];
let enemies = [];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = canvas.width / 2 - player.w / 2;
    player.y = canvas.height - 150; // ปรับให้สูงขึ้นนิดนึงจะได้เห็นหัวใจชัดๆ
}
window.addEventListener("resize", resize);
resize();

// --- ฟังก์ชันวาดหัวใจใต้ปีกยาน ---
// --- แก้ไขฟังก์ชัน drawPlayerLives ---
function drawPlayerLives() {
    for (let i = 0; i < lives; i++) {
        // คำนวณตำแหน่งให้กลาง
        let hX = player.x + (i * 20) + (player.w / 2) - (lives * 10);
        let hY = player.y + player.h + 10;
        
        ctx.fillStyle = "#ff4d4d"; // สีแดงหัวใจ
        ctx.beginPath();
        
        // --- โค้ดใหม่: วาดรูปหัวใจที่สมมาตร ---
        ctx.moveTo(hX, hY + 12); // ปลายแหลมล่าง
        
        // ฝั่งซ้าย
        ctx.bezierCurveTo(hX - 6, hY + 7, hX - 8, hY + 2, hX, hY);
        // ฝั่งขวา
        ctx.bezierCurveTo(hX + 8, hY + 2, hX + 6, hY + 7, hX, hY + 12);
        
        ctx.fill();
    }
}
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
    
    // เรียกวาดหัวใจ
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

        // เช็คชนยาน
        // --- แก้ไขในฟังก์ชัน draw ตรงส่วนเช็คชนยาน ---
if (!isInvincible && 
    en.x < player.x + player.w && en.x + en.w > player.x &&
    en.y < player.y + player.h && en.y + en.h > player.y) {
    
    enemies.splice(i, 1);
    lives--;
    
    // --- เพิ่มเอฟเฟกต์ที่นี่ ---
    canvas.style.animation = "shake 0.3s"; // สั่งสั่นทาง CSS
    player.color = "red"; // เปลี่ยนยานเป็นสีแดง
    // คืนสีเดิมหลัง 0.15 วินาที
    setTimeout(() => { player.color = "#00f2fe"; }, 1500); 

    // --- ส่วนที่เหลือคงเดิม ---
    if (lives <= 0) {
        gameActive = false;
        setTimeout(gameOver, 10);
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
        alert("ทำลายสถิติ! " + highScore);
    } else {
        alert("จบเกม! คะแนนของคุณ: " + score);
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
