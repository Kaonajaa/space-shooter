// --- 1. ตั้งค่าพื้นฐานและตัวแปรเกม ---
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

// ระบบไอเทม
let items = [];
let tripleShotTimer = 0;
let hasShield = false;
const itemType = {
    P: { color: "#00ff00", label: "P" }, // Triple Shot
    S: { color: "#00d9ff", label: "S" }, // Shield
    B: { color: "#ff8c00", label: "B" }  // Bomb
};

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

// --- 3. ฟังก์ชันวาด UI (หัวใจบนขวา) ---
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

// --- 4. ระบบจอสั่น ---
function triggerScreenShake() {
    canvas.classList.remove("shake");
    void canvas.offsetWidth; 
    canvas.classList.add("shake");
}

// --- 5. ฟังก์ชันหลักในการวาดเกม ---
function draw() {
    if (!gameActive) return;
    if (isPaused) {
        requestAnimationFrame(draw);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawUI();

    // วาดเกราะถ้ามี Shield
    if (hasShield) {
        ctx.strokeStyle = "#00d9ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.w/2, player.y + player.h/2, 35, 0, Math.PI*2);
        ctx.stroke();
    }

    // วาดผู้เล่น (กระพริบตอนอมตะ)
    if (!isInvincible || Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.w, player.h);
    }

    // จัดการไอเทม (Power-ups)
    items.forEach((item, index) => {
        item.y += 2;
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 15, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(item.label, item.x, item.y + 5);

        if (item.x > player.x && item.x < player.x + player.w &&
            item.y > player.y && item.y < player.y + player.h) {
            if (item.label === "P") tripleShotTimer = 400; 
            if (item.label === "S") hasShield = true;
            if (item.label === "B") { enemies = []; triggerScreenShake(); score += 50; scoreElement.innerText = score; }
            items.splice(index, 1);
        }
        if (item.y > canvas.height) items.splice(index, 1);
    });

    if (tripleShotTimer > 0) tripleShotTimer--;

    // จัดการกระสุน
    bullets.forEach((b, i) => {
        b.y -= 8;
        if(b.vx) b.x += b.vx;
        ctx.fillStyle = "yellow";
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (b.y < 0 || b.x < 0 || b.x > canvas.width) bullets.splice(i, 1);
    });

    // จัดการศัตรู
    let spawnRate = 0.04 + (score / 15000);
