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
let invincibilityTimer = 0;
let shakeTimer = 0;

// ระบบดวงดาว
let stars = [];
function createStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: Math.random() * 2 + 0.5
        });
    }
}

// ไอเทม & บอส
let items = [];
let tripleShotTimer = 0;
let hasShield = false;
let boss = null;
let isBossMode = false;

const itemData = [
    { label: "P", color: "#00ff00" },
    { label: "S", color: "#00d9ff" },
    { label: "B", color: "#ff8c00" }
];

const player = { x: 0, y: 0, w: 40, h: 40, color: "#00f2fe", baseColor: "#00f2fe" };
let bullets = [];
let enemies = [];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = canvas.width / 2 - player.w / 2;
    player.y = canvas.height - 120;
    createStars();
}
window.addEventListener("resize", resize);
resize();

function triggerShake(duration = 10) { shakeTimer = duration; }

function drawUI() {
    const margin = 30; 
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff4d4d";
    for (let i = 0; i < lives; i++) {
        let hX = canvas.width - margin - (i * 25);
        let hY = 35;
        ctx.fillStyle = "#ff4d4d";
        ctx.beginPath(); ctx.arc(hX - 4, hY, 4, 0, Math.PI * 2); ctx.arc(hX + 4, hY, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hX - 8, hY + 1); ctx.lineTo(hX, hY + 10); ctx.lineTo(hX + 8, hY + 1); ctx.fill();
    }
    ctx.shadowBlur = 0;
}

function draw() {
    if (!gameActive) return;

    if (isPaused) {
        const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width);
        grad.addColorStop(0, "rgba(0, 0, 0, 0.4)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0.8)");
        ctx.fillStyle = "rgba(0, 242, 254, 0.1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.shadowBlur = 20; ctx.shadowColor = "#00f2fe";
        ctx.fillStyle = "white"; ctx.font = "bold 60px Arial"; ctx.textAlign = "center";
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
        ctx.shadowBlur = 0;
        requestAnimationFrame(draw);
        return;
    }

    ctx.save();
    if (shakeTimer > 0) {
        ctx.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
        shakeTimer--;
    }

    ctx.clearRect(-20, -20, canvas.width + 40, canvas.height + 40);

    // วาดดาว
    ctx.fillStyle = "white";
    stars.forEach(star => {
        ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
        star.y += star.speed;
        if (star.y > canvas.height) { star.y = 0; star.x = Math.random() * canvas.width; }
    });

    drawUI();

    // บอส
    if (score > 0 && score % 1000 === 0 && !isBossMode && !boss) {
        isBossMode = true;
        boss = { x: canvas.width/2 - 50, y: -100, w: 100, h: 80, hp: 25, maxHp: 25, speed: 2, direction: 1, shootTimer: 0 };
    }

    if (boss) {
        if (boss.y < 50) boss.y += 1;
        boss.x += boss.speed * boss.direction;
        if (boss.x <= 0 || boss.x + boss.w >= canvas.width) boss.direction *= -1;
        ctx.shadowBlur = 15; ctx.shadowColor = "#8e44ad";
        ctx.fillStyle = "#8e44ad"; ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "red"; ctx.fillRect(boss.x, boss.y - 20, (boss.hp / boss.maxHp) * boss.w, 8);
        boss.shootTimer++;
        if (boss.shootTimer > 50) {
            enemies.push({ x: boss.x + boss.w/2 - 10, y: boss.y + boss.h, w: 20, h: 20, speed: 5, isBossBullet: true });
            boss.shootTimer = 0;
        }
    }

    // ผู้เล่น
    if (hasShield) {
        ctx.shadowBlur = 15; ctx.shadowColor = "#00d9ff";
        ctx.strokeStyle = "#00d9ff"; ctx.lineWidth = 3; ctx.beginPath();
        ctx.arc(player.x + player.w/2, player.y + player.h/2, 35, 0, Math.PI*2); ctx.stroke();
        ctx.shadowBlur = 0;
    }
    if (invincibilityTimer > 0) {
        invincibilityTimer--; isInvincible = true;
        if (Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.3;
    } else { isInvincible = false; ctx.globalAlpha = 1.0; }

    ctx.fillStyle = player.color; ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.globalAlpha = 1.0;

    // ไอเทมเรืองแสง
    for (let i = items.length - 1; i >= 0; i--) {
        let it = items[i]; it.y += 2.5;
        ctx.save();
        ctx.shadowBlur = 20; ctx.shadowColor = it.color;
        ctx.fillStyle = it.color; ctx.beginPath(); ctx.arc(it.x, it.y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();

        ctx.fillStyle = "white"; ctx.font = "bold 12px Arial"; ctx.textAlign = "center"; ctx.fillText(it.label, it.x, it.y + 4);
        if (it.x + 12 > player.x && it.x - 12 < player.x + player.w && it.y + 12 > player.y && it.y - 12 < player.y + player.h) {
            if (it.label === "P") tripleShotTimer = 500;
            if (it.label === "S") hasShield = true;
            if (it.label === "B") { triggerShake(25); enemies = enemies.filter(e => e.isBossBullet); score += 100; }
            items.splice(i, 1);
        }
    }

    // กระสุน
    bullets.forEach((b, i) => {
        b.y -= 10; if (b.vx) b.x += b.vx;
        ctx.fillStyle = "yellow"; ctx.fillRect(b.x, b.y, b.w, b.h);
        if (boss && b.x < boss.x + boss.w && b.x + b.w > boss.x && b.y < boss.y + boss.h && b.y + b.h > boss.y) {
            boss.hp--; bullets.splice(i, 1);
            if (boss.hp <= 0) { triggerShake(35); score += 500; boss = null; isBossMode = false; }
        }
        if (b.y < 0) bullets.splice(i, 1);
    });

    // ศัตรู
    if (!isBossMode && Math.random() < 0.06) {
        enemies.push({ x: Math.random() * (canvas.width - 40), y: -40, w: 40, h: 40, speed: 3.5 + (score/3000) });
    }

    enemies.forEach((en, i) => {
        en.y += en.speed;
        ctx.fillStyle = en.isBossBullet ? "#ff00ff" : "red";
        ctx.fillRect(en.x, en.y, en.w, en.h);

        if (!isInvincible && en.x < player.x + player.w && en.x + en.w > player.x && en.y < player.y + player.h && en.y + en.h > player.y) {
            enemies.splice(i, 1);
            triggerShake(15);
            if (hasShield) { hasShield = false; invincibilityTimer = 60; } 
            else { lives--; invincibilityTimer = 120; player.color = "red"; setTimeout(() => player.color = player.baseColor, 200); }
            if (lives <= 0) { gameActive = false; setTimeout(() => { alert("GameOver! Score: " + score); resetGame(); }, 10); return; }
        }

        bullets.forEach((b, bi) => {
            if (!en.isBossBullet && b.x < en.x + en.w && b.x + b.w > en.x && b.y < en.y + en.h && b.y + b.h > en.y) {
                if (Math.random() < 0.25) {
                    let drop = itemData[Math.floor(Math.random() * itemData.length)];
                    items.push({ x: en.x + 20, y: en.y + 20, label: drop.label, color: drop.color });
                }
                enemies.splice(i, 1); bullets.splice(bi, 1);
                score += 10; scoreElement.innerText = score;
            }
        });
        if (en.y > canvas.height) enemies.splice(i, 1);
    });

    ctx.restore();
    requestAnimationFrame(draw);
}

function shoot() {
    if (tripleShotTimer > 0) {
        bullets.push({ x: player.x + player.w/2 - 3, y: player.y, w: 6, h: 15, vx: 0 });
        bullets.push({ x: player.x, y: player.y, w: 6, h: 15, vx: -3 });
        bullets.push({ x: player.x + player.w, y: player.y, w: 6, h: 15, vx: 3 });
    } else {
        bullets.push({ x: player.x + player.w/2 - 3, y: player.y, w: 6, h: 15, vx: 0 });
    }
}

function resetGame() {
    lives = 3; score = 0; items = []; enemies = []; bullets = []; boss = null; isBossMode = false;
    tripleShotTimer = 0; hasShield = false; invincibilityTimer = 0;
    scoreElement.innerText = score; resize(); startCountdown();
}

function startCountdown() {
    let count = 3; countdownEl.style.display = "flex"; countdownEl.innerText = count;
    const timer = setInterval(() => {
        count--;
        if (count > 0) countdownEl.innerText = count;
        else { clearInterval(timer); countdownEl.style.display = "none"; gameActive = true; requestAnimationFrame(draw); }
    }, 1000);
}

setInterval(() => { if (gameActive && !isPaused) shoot(); }, 180);
window.addEventListener("mousemove", (e) => { player.x = e.clientX - player.w/2; });
window.addEventListener("touchmove", (e) => { player.x = e.touches[0].clientX - player.w/2; e.preventDefault(); }, {passive: false});

pauseBtn.onclick = () => { isPaused = !isPaused; pauseBtn.innerText = isPaused ? "เล่นต่อ" : "หยุดเกม"; };
startCountdown();
