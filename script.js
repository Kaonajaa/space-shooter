// --- 1. ตั้งค่าพื้นฐาน (ประกาศแค่ครั้งเดียว) ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");
const countdownEl = document.getElementById("countdown");
const pauseBtn = document.getElementById("pauseBtn");

let lives = 3; // เริ่มต้นมี 3 ชีวิต
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
        ctx.fillStyle = "#ffff00";
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (b.y < 0) bullets.splice(i, 1);
    });

    // จัดการศัตรู
   // ยิ่งคะแนนเยอะ โอกาสเกิดศัตรูจะเพิ่มขึ้น (สูงสุดที่ 0.1 หรือ 10%)
let spawnRate = 0.04 + (score / 10000); 
if (spawnRate > 0.1) spawnRate = 0.1; 

if (Math.random() < spawnRate) {
    // เพิ่มค่าความเร็ว (speed) เข้าไปใน Object ศัตรูด้วย
    enemies.push({ 
        x: Math.random() * (canvas.width - 40), 
        y: -40, 
        w: 40, 
        h: 40,
        speed: 4 + (score / 500) // ทุกๆ 500 คะแนน จะวิ่งเร็วขึ้น 1 ระดับ
    });
}

    enemies.forEach((en, i) => {
        en.y += en.speed;
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(en.x, en.y, en.w, en.h);

        // เช็คศัตรูชนยาน
if (en.x < player.x + player.w && en.x + en.w > player.x &&
    en.y < player.y + player.h && en.y + en.h > player.y) {
    
    enemies.splice(i, 1); // ลบศัตรูตัวที่ชนออก
    lives -= 1;           // ลดหัวใจ 1 ดวง
    
    // ถ้าหัวใจหมดค่อย Game Over
    if (lives <= 0) {
        gameOver();
    } else {
        // เอฟเฟกต์กระพริบหรือแจ้งเตือนเบาๆ (ถ้าอยากทำเพิ่ม)
        console.log("เหลือหัวใจ: " + lives);
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
// ฟังก์ชันวาดรูปหัวใจตามจำนวน lives ที่เหลือ
function updateLivesUI() {
    let heartIcons = "";
    for (let i = 0; i < lives; i++) {
        heartIcons += "❤️ ";
    }
    if (livesContainer) livesContainer.innerText = heartIcons;
}

// แก้ไขฟังก์ชัน resetGame เดิมให้คืนค่าเลือดด้วย
function resetGame() {
    lives = 3;            // คืนเลือดเป็น 3
    updateLivesUI();      // อัปเดตหน้าจอให้หัวใจกลับมาเต็ม
    score = 0;
    scoreElement.innerText = score;
    enemies = [];
    bullets = [];
    resize();
    startCountdown();
}
