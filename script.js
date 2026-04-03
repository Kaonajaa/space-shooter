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

// --- ระบบไอเทม (Power-ups) ---
let items = [];
let tripleShotTimer = 0;
let hasShield = false;
const itemTypes = [
    { label: "P", color: "#00ff00" }, // Triple Shot
    { label: "S", color: "#00d9ff" }, // Shield
    { label: "B", color: "#ff8c00" }  // Bomb
];

const player = { 
    x: 0, y: 0, w: 40, h: 40, 
    color: "#00f2fe",
    baseColor: "#00f2fe" 
};

let bullets = [];
let enemies = [];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = canvas.width / 2 - player.w / 2;
    player.y = canvas.height - 150;
}
window.addEventListener("resize", resize);
resize();

// --- 2. ฟังก์ชันวาด UI (หัวใจบนขวา) ---
function drawUI() {
    const margin = 30; 
    const startY = 35;
    for (let i = 0; i < lives; i++) {
        let hX = canvas.width - margin - (i * 25);
        let hY = startY;
        ctx.fillStyle = "#ff4d4d";
        ctx.beginPath();
        ctx.arc(hX - 4, hY, 4, 0, Math.PI * 2);
        ctx.arc(hX + 4, hY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(hX - 8, hY + 1);
        ctx.lineTo(hX, hY + 10);
        ctx.lineTo(hX + 8, hY + 1);
        ctx.fill();
    }
}

function triggerScreenShake() {
    canvas.classList.remove("shake");
    void canvas.offsetWidth; 
    canvas.classList.add("shake");
}

// --- 3. ฟังก์ชันหลักในการวาด ---
function draw() {
    if (!gameActive) return;
    if (isPaused) {
        requestAnimationFrame(draw);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawUI();

    // วาดเกราะ
    if (hasShield) {
        ctx.strokeStyle = "#00d9ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.w/2, player.y + player.h/2, 35, 0, Math.PI*2);
        ctx.stroke();
    }

    // วาดผู้เล่น
    if (!isInvincible || Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.w, player.h);
    }

    // --- จัดการไอเทม ---
    for (let i = items.length - 1; i >= 0; i--) {
        let it = items[i];
        it.y += 2; // ไอเทมตกลงมา
        
        // วาดวงกลมไอเทม
        ctx.fillStyle = it.color;
        ctx.beginPath();
        ctx.arc(it.x, it.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(it.label, it.x, it.y + 5);

        // เช็คเก็บไอเทม
        if (it.x > player.x && it.x < player.x + player.w &&
            it.y > player.y && it.y < player.y + player.h) {
            
            if (it.label === "P") tripleShotTimer = 400;
            if (it.label === "S") hasShield = true;
            if (it.label === "B") { enemies = []; triggerScreenShake(); score += 50; }
            
            items.splice(i, 1);
            continue;
        }
        if (it.y > canvas.height) items.splice(i, 1);
    }

    if (tripleShotTimer > 0) tripleShotTimer--;

    // จัดการกระสุน
    bullets.forEach((b, i) => {
        b.y -= 8;
        if (b.vx) b.x += b.vx;
        ctx.fillStyle = "yellow";
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (b.y < 0 || b.x < 0 || b.x > canvas.width) bullets.splice(i, 1);
    });

    // จัดการศัตรู
    let spawnRate = 0.04 + (score / 15000);
    if (Math.random() < Math.min(spawnRate, 0.15)) {
        enemies.push({ x: Math.random() * (canvas.width - 40), y: -40, w: 40, h: 40, speed: 4 + (score / 1500) });
    }

    enemies.forEach((en, i) => {
        en.y += en.speed;
        ctx.fillStyle = "red";
        ctx.fillRect(en.x, en.y, en.w, en.h);

        // ชนยาน
        if (!isInvincible && en.x < player.x + player.w && en.x + en.w > player.x &&
            en.y < player.y + player.h && en.y + en.h > player.y) {
            
            enemies.splice(i, 1);
            if (hasShield) {
                hasShield = false;
                triggerScreenShake();
            } else {
                lives--;
                triggerScreenShake();
                player.color = "red";
                setTimeout(() => { player.color = player.baseColor; }, 200);
            }

            if (lives <= 0) {
                gameActive = false;
                setTimeout(gameOver, 10);
                return;
            } else {
                isInvincible = true;
                setTimeout(() => { isInvincible = false; }, 1500);
            }
        }

        // กระสุนชนศัตรู
        bullets.forEach((b, bi) => {
            if (b.x < en.x + en.w && b.x + b.w > en.x && b.y < en.y + en.h && b.y + b.h > en.y) {
                
                // --- เพิ่มโอกาสดรอปไอเทมเป็น 30% (เพื่อความชัดเจน) ---
                if (Math.random() < 0.3) {
                    let type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
                    items.push({ x: en.x + 20, y: en.y + 20, label: type.label, color: type.color });
                }

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

// --- 4. ฟังก์ชันเสริม ---
function shoot() {
    if (tripleShotTimer > 0) {
        bullets.push({ x: player.x + player.w/2 - 3, y: player.y, w: 6, h: 15, vx: 0 });
        bullets.push({ x: player.x, y: player.y, w: 6, h: 15, vx: -3 });
        bullets.push({ x: player.x + player.w, y: player.y, w: 6, h: 15, vx: 3 });
    } else {
        bullets.push({ x: player.x + player.w/2 - 3, y: player.y, w: 6, h: 15, vx: 0 });
    }
}

function startCountdown() {
    let count = 3;
    countdownEl.style.display = "flex";
    countdownEl.innerText = count;
    const timer = setInterval(() => {
        count--;
        if (count > 0) { countdownEl.innerText = count; } 
        else {
            clearInterval(timer);
            countdownEl.style.display = "none";
            gameActive = true;
            requestAnimationFrame(draw);
        }
    }, 1000);
}

function gameOver() {
    alert("Game Over! Score: " + score);
    resetGame();
}

function resetGame() {
    lives = 3; score = 0; items = []; enemies = []; bullets = [];
    tripleShotTimer = 0; hasShield = false;
    scoreElement.innerText = score;
    isInvincible = false;
    player.color = player.baseColor;
    resize();
    startCountdown();
}

setInterval(() => { if (gameActive && !isPaused) shoot(); }, 200);
window.addEventListener("mousemove", (e) => { player.x = e.clientX - player.w/2; });
window.addEventListener("touchmove", (e) => { 
    player.x = e.touches[0].clientX - player.w/2; 
    e.preventDefault(); 
}, {passive: false});

pauseBtn.onclick = () => { isPaused = !isPaused; pauseBtn.innerText = isPaused ? "เล่นต่อ" : "หยุดเกม"; };

startCountdown();
