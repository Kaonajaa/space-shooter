const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");
const countdownEl = document.getElementById("countdown");
const pauseBtn = document.getElementById("pauseBtn");

let score = 0;
let highScore = localStorage.getItem("spaceHighScore") || 0;
if (highScoreElement) highScoreElement.innerText = highScore;

// [แก้ไข 1] ตัวแปรเพิ่มเติมสำหรับ Manual Fire System
let lastFireTime = 0;           // เก็บเวลาการยิงครั้งล่าสุด
const FIRE_COOLDOWN = 150;      // หน่วงเวลากว่าง 150 มิลลิวินาที (ปรับได้ 150-200)

// ✓ Object สำหรับเก็บ Sprite Images
const sprites = {
    player: null,
    enemy: null,
    boss: null,
    bullet: null,
    items: {}
};

// ✓ ฟังก์ชันโหลด Sprites จาก URL
function loadSprites() {
    // สามารถใช้ URL ภายนอกหรือ Base64 DataURL
    // Example: sprites.player = new Image();
    // sprites.player.src = "https://example.com/player.png";
    
    console.log("🎨 Sprites system loaded (Ready for image imports)");
}

// เรียก loadSprites() ที่เริ่มต้นเกม
loadSprites();

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

    if (gameActive && !isPaused) {
    if (tripleShotTimer > 0) {
        tripleShotTimer--;
    }
}

    if (isPaused) {
        // หน้า Pause สีฟ้าใส (0.05) และแถบดำด้านบนกัน UI กลืน
        ctx.fillStyle = "rgba(0, 242, 254, 0.05)"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const topGrad = ctx.createLinearGradient(0, 0, 0, 100);
        topGrad.addColorStop(0, "rgba(0, 0, 0, 0.7)");
        topGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, canvas.width, 100);

        ctx.save();
        ctx.shadowBlur = 20; ctx.shadowColor = "#00f2fe";
        ctx.fillStyle = "white"; ctx.font = "bold 60px Arial"; ctx.textAlign = "center";
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
        ctx.restore();
        
        requestAnimationFrame(draw);
        return;
    }

    ctx.save();
    if (shakeTimer > 0) {
        ctx.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
        shakeTimer--;
    }

    ctx.clearRect(-20, -20, canvas.width + 40, canvas.height + 40);

    // วาดดวงดาว
    ctx.fillStyle = "white";
    stars.forEach(star => {
        ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
        star.y += star.speed;
        if (star.y > canvas.height) { star.y = 0; star.x = Math.random() * canvas.width; }
    });

    drawUI();

    // ระบบบอส (อัปเกรด HP 80 และ Phase 2)
    if (score > 0 && score % 1000 === 0 && !isBossMode && !boss) {
        isBossMode = true;
        boss = { x: canvas.width/2 - 50, y: -100, w: 100, h: 80, hp: 80, maxHp: 80, speed: 2, direction: 1, shootTimer: 0, isAngry: false };
    }

    if (boss) {
        if (boss.y < 50) boss.y += 1;
        if (boss.hp < boss.maxHp / 2) { boss.isAngry = true; boss.speed = 4; }
        boss.x += boss.speed * boss.direction;
        if (boss.x <= 0 || boss.x + boss.w >= canvas.width) boss.direction *= -1;
        drawBoss(boss);
        ctx.fillStyle = "red"; ctx.fillRect(boss.x, boss.y - 20, (boss.hp / boss.maxHp) * boss.w, 8);
        
        boss.shootTimer++;
        let fireRate = boss.isAngry ? 25 : 50;
        if (boss.shootTimer > fireRate) {
            enemies.push({ x: boss.x, y: boss.y + boss.h, w: 20, h: 20, speed: 6, isBossBullet: true });
            enemies.push({ x: boss.x + boss.w - 20, y: boss.y + boss.h, w: 20, h: 20, speed: 6, isBossBullet: true });
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

    drawPlayer();
    ctx.globalAlpha = 1.0;

    // ไอเทมเรืองแสง (Drop Rate 15%)
    for (let i = items.length - 1; i >= 0; i--) {
        let it = items[i]; it.y += 2.5;
        drawItem(it);
        
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
        drawBullet(b);
        if (boss && b.x < boss.x + boss.w && b.x + b.w > boss.x && b.y < boss.y + boss.h && b.y + b.h > boss.y) {
            boss.hp--; bullets.splice(i, 1);
            if (boss.hp <= 0) { triggerShake(40); score += 500; boss = null; isBossMode = false; }
        }
        if (b.y < 0) bullets.splice(i, 1);
    });

    // ศัตรู
    if (!isBossMode && Math.random() < 0.06) {
        enemies.push({ x: Math.random() * (canvas.width - 40), y: -40, w: 40, h: 40, speed: 3.5 + (score/3000) });
    }

    enemies.forEach((en, i) => {
        en.y += en.speed;
        drawEnemy(en);
        if (!isInvincible && en.x < player.x + player.w && en.x + en.w > player.x && en.y < player.y + player.h && en.y + en.h > player.y) {
            enemies.splice(i, 1);
            triggerShake(15);
            if (hasShield) { hasShield = false; invincibilityTimer = 60; } 
            else { lives--; invincibilityTimer = 120; player.color = "red"; setTimeout(() => player.color = player.baseColor, 200); }
            if (lives <= 0) { gameActive = false; setTimeout(() => { alert("GameOver! Score: " + score); resetGame(); }, 10); return; }
        }

        bullets.forEach((b, bi) => {
            if (!en.isBossBullet && b.x < en.x + en.w && b.x + b.w > en.x && b.y < en.y + en.h && b.y + b.h > en.y) {
                // DROP RATE 15% ตรงนี้
                if (Math.random() < 0.15) {
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
// [แก้ไข 2] ฟังก์ชันวาดผู้เล่นแบบ 3D/Gradient
function drawPlayer() {
    // ✓ ถ้ามี Sprite ให้ใช้รูป ถ้าไม่มีให้วาด Gradient
    if (sprites.player && sprites.player.complete) {
        ctx.drawImage(sprites.player, player.x, player.y, player.w, player.h);
    } else {
        // ✓ วาดยานแบบ 3D Gradient (ถ้ายังไม่มีรูป)
        const shipGrad = ctx.createLinearGradient(
            player.x, player.y,
            player.x, player.y + player.h
        );
        shipGrad.addColorStop(0, "#00ffff");
        shipGrad.addColorStop(0.5, player.color);
        shipGrad.addColorStop(1, "#004d7f");
        
        ctx.fillStyle = shipGrad;
        ctx.fillRect(player.x, player.y, player.w, player.h);
        
        // ✓ เพิ่มขอบวง Highlight
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x, player.y, player.w, player.h);
    }
}

// ─────────────────────────────────────────────────────────────

// [แก้ไข 3] ฟังก์ชันวาดศัตรูแบบ 3D/Gradient
function drawEnemy(en) {
    // ✓ ถ้ามี Sprite ให้ใช้รูป ถ้าไม่มีให้วาด Gradient
    if (sprites.enemy && sprites.enemy.complete) {
        ctx.drawImage(sprites.enemy, en.x, en.y, en.w, en.h);
    } else {
        let enemyGrad;
        
        // ✓ กระสุนบอสมีสีต่างกัน
        if (en.isBossBullet) {
            enemyGrad = ctx.createLinearGradient(en.x, en.y, en.x, en.y + en.h);
            enemyGrad.addColorStop(0, "#ff00ff");
            enemyGrad.addColorStop(1, "#8b008b");
            ctx.fillStyle = enemyGrad;
        } else {
            enemyGrad = ctx.createLinearGradient(en.x, en.y, en.x, en.y + en.h);
            enemyGrad.addColorStop(0, "#ff3333");
            enemyGrad.addColorStop(1, "#8b0000");
            ctx.fillStyle = enemyGrad;
        }
        
        ctx.fillRect(en.x, en.y, en.w, en.h);
        
        // ✓ เพิ่มขอบวง Highlight สีตรงข้าม
        ctx.strokeStyle = en.isBossBullet ? "#ff77ff" : "#ff9999";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(en.x, en.y, en.w, en.h);
    }
}

// ─────────────────────────────────────────────────────────────

// [แก้ไข 4] ฟังก์ชันวาดกระสุนแบบ Gradient
function drawBullet(b) {
    // ✓ ถ้ามี Sprite ให้ใช้รูป ถ้าไม่มีให้วาด Gradient
    if (sprites.bullet && sprites.bullet.complete) {
        ctx.drawImage(sprites.bullet, b.x, b.y, b.w, b.h);
    } else {
        const bulletGrad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        bulletGrad.addColorStop(0, "#ffff99");
        bulletGrad.addColorStop(1, "#ffaa00");
        
        ctx.fillStyle = bulletGrad;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        
        // ✓ เพิ่ม Glow Effect
        ctx.shadowColor = "#ffaa00";
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
        ctx.shadowBlur = 0;
    }
}

// ─────────────────────────────────────────────────────────────

// [แก้ไข 5] ฟังก์ชันวาดไอเทมแบบ 3D/Glow
function drawItem(it) {
    // ✓ ถ้ามี Sprite สำหรับไอเทม ให้ใช้รูป
    if (sprites.items[it.label] && sprites.items[it.label].complete) {
        ctx.drawImage(sprites.items[it.label], it.x - 12, it.y - 12, 24, 24);
    } else {
        ctx.save();
        
        // ✓ วาดไอเทมแบบ 3D Sphere Effect
        const itemGrad = ctx.createRadialGradient(
            it.x - 5, it.y - 5, 0,
            it.x, it.y, 12
        );
        itemGrad.addColorStop(0, it.color);
        itemGrad.addColorStop(0.7, it.color);
        itemGrad.addColorStop(1, "rgba(0, 0, 0, 0.5)");
        
        ctx.shadowBlur = 25;
        ctx.shadowColor = it.color;
        ctx.fillStyle = itemGrad;
        ctx.beginPath();
        ctx.arc(it.x, it.y, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // ✓ เพิ่มขอบสีขาว
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // ✓ วาดตัวหนังสือ Label
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(it.label, it.x, it.y);
        
        ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────

// [แก้ไข 6] ฟังก์ชันวาดบอสแบบ 3D/Gradient
function drawBoss(boss) {
    if (sprites.boss && sprites.boss.complete) {
        ctx.drawImage(sprites.boss, boss.x, boss.y, boss.w, boss.h);
    } else {
        // ✓ วาดบอสแบบ Gradient
        const bossGrad = ctx.createLinearGradient(
            boss.x, boss.y,
            boss.x, boss.y + boss.h
        );
        
        if (boss.isAngry) {
            bossGrad.addColorStop(0, "#ff6633");
            bossGrad.addColorStop(1, "#990000");
            ctx.shadowColor = "#ff4500";
        } else {
            bossGrad.addColorStop(0, "#aa44dd");
            bossGrad.addColorStop(1, "#4a0080");
            ctx.shadowColor = "#8e44ad";
        }
        
        ctx.shadowBlur = boss.isAngry ? 30 : 15;
        ctx.fillStyle = bossGrad;
        ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
        
        // ✓ เพิ่มขอบ Highlight
        ctx.strokeStyle = boss.isAngry ? "#ffaa33" : "#dd88ff";
        ctx.lineWidth = 3;
        ctx.strokeRect(boss.x, boss.y, boss.w, boss.h);
        
        ctx.shadowBlur = 0;
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

window.addEventListener("mousemove", (e) => { player.x = e.clientX - player.w/2; });
window.addEventListener("touchmove", (e) => { player.x = e.touches[0].clientX - player.w/2; e.preventDefault(); }, {passive: false});

pauseBtn.onclick = () => { isPaused = !isPaused; pauseBtn.innerText = isPaused ? "เล่นต่อ" : "หยุดเกม"; };
startCountdown();
// ฟังก์ชันสำหรับเช็กว่ากดยิงได้หรือยัง (ติด Cooldown ไหม)
function attemptFire() {
    const currentTime = Date.now();
    
    // ถ้าเวลาปัจจุบัน หักลบ กับเวลายิงล่าสุด แล้วเกิน 150ms แปลว่ายิงได้
    if (currentTime - lastFireTime >= FIRE_COOLDOWN) {
        shoot();                    // สั่งให้ยานยิงกระสุน (ใช้ฟังก์ชันเดิมของเกม)
        lastFireTime = currentTime; // บันทึกเวลายิงล่าสุดไว้
    }
}

// ระบบดักจับการกดปุ่มบนคีย์บอร์ด (เมื่อคอมพิวเตอร์ส่งค่าปุ่ม Spacebar มา)
window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        e.preventDefault();  // ป้องกันหน้าจอมันเลื่อนลงเวลาโยก Spacebar
        
        // ถ้าเกมกำลังเล่นอยู่และไม่ได้กด Pause ให้สั่งยิง
        if (gameActive && !isPaused) {
            attemptFire();
        }
    }
});

// แถม: ระบบคลิกเมาส์ที่หน้าจอเพื่อให้ยังยิงได้เหมือนเดิม
canvas.addEventListener("click", () => {
    if (gameActive && !isPaused) {
        attemptFire();
    }
});
