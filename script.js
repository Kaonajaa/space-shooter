// --- 1. เพิ่มตัวแปรบอส (วางไว้ด้านบนสุด) ---
let boss = null;
let isBossMode = false;

// --- 2. ฟังก์ชันสร้างบอส ---
function spawnBoss() {
    isBossMode = true;
    boss = {
        x: canvas.width / 2 - 50,
        y: -100,
        w: 100,
        h: 80,
        hp: 20, // เลือดบอส ยิง 20 นัดตาย
        maxHp: 20,
        speed: 2,
        direction: 1, // 1 ไปขวา, -1 ไปซ้าย
        shootTimer: 0
    };
}

// --- 3. แก้ไขฟังก์ชัน draw() (เพิ่มส่วนจัดการบอส) ---
function draw() {
    if (!gameActive) return;
    if (isPaused) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
        requestAnimationFrame(draw);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawUI();

    // เช็คคะแนนเพื่อเรียกบอส (ทุกๆ 1,000 คะแนน)
    if (score > 0 && score % 1000 === 0 && !isBossMode && !boss) {
        spawnBoss();
    }

    // --- ส่วนจัดการบอส ---
    if (boss) {
        // บอสเลื่อนลงมาในสนามรบ
        if (boss.y < 50) boss.y += 1;

        // บอสเคลื่อนที่ซ้าย-ขวา
        boss.x += boss.speed * boss.direction;
        if (boss.x <= 0 || boss.x + boss.w >= canvas.width) {
            boss.direction *= -1;
        }

        // วาดตัวบอส (สีม่วงเข้ม)
        ctx.fillStyle = "#8e44ad";
        ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
        
        // วาดเลือดบอส (HP Bar)
        ctx.fillStyle = "gray";
        ctx.fillRect(boss.x, boss.y - 20, boss.w, 10);
        ctx.fillStyle = "red";
        ctx.fillRect(boss.x, boss.y - 20, (boss.hp / boss.maxHp) * boss.w, 10);

        // บอสยิงกระสุนสวนกลับ (สุ่มยิง)
        boss.shootTimer++;
        if (boss.shootTimer > 60) { // ยิงทุกๆ 1 วินาทีโดยประมาณ
            enemies.push({ 
                x: boss.x + boss.w / 2 - 10, 
                y: boss.y + boss.h, 
                w: 20, h: 20, 
                speed: 5,
                isBossBullet: true // มาร์คไว้ว่าเป็นกระสุนบอส
            });
            boss.shootTimer = 0;
        }
    }

    // วาดเกราะ / ผู้เล่น / ไอเทม (ใช้โค้ดเดิมของคุณ)
    if (hasShield) {
        ctx.strokeStyle = "#00d9ff"; ctx.lineWidth = 3; ctx.beginPath();
        ctx.arc(player.x + player.w/2, player.y + player.h/2, 35, 0, Math.PI*2); ctx.stroke();
    }
    if (!isInvincible || Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.fillStyle = player.color; ctx.fillRect(player.x, player.y, player.w, player.h);
    }

    // จัดการไอเทม (โค้ดเดิมของคุณ)
    for (let i = items.length - 1; i >= 0; i--) {
        let it = items[i]; it.y += 2.5;
        ctx.fillStyle = it.color; ctx.beginPath(); ctx.arc(it.x, it.y, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 14px Arial"; ctx.textAlign = "center"; ctx.fillText(it.label, it.x, it.y + 5);
        if (it.x + 15 > player.x && it.x - 15 < player.x + player.w && it.y + 15 > player.y && it.y - 15 < player.y + player.h) {
            if (it.label === "P") tripleShotTimer = 400;
            if (it.label === "S") hasShield = true;
            if (it.label === "B") { enemies = enemies.filter(e => e.isBossBullet); triggerScreenShake(); score += 100; }
            items.splice(i, 1); continue;
        }
        if (it.y > canvas.height) items.splice(i, 1);
    }

    if (tripleShotTimer > 0) tripleShotTimer--;

    // จัดการกระสุนผู้เล่น
    bullets.forEach((b, i) => {
        b.y -= 8; if (b.vx) b.x += b.vx;
        ctx.fillStyle = "yellow"; ctx.fillRect(b.x, b.y, b.w, b.h);

        // เช็คกระสุนชนบอส
        if (boss && b.x < boss.x + boss.w && b.x + b.w > boss.x && b.y < boss.y + boss.h && b.y + b.h > boss.y) {
            boss.hp--;
            bullets.splice(i, 1);
            if (boss.hp <= 0) {
                score += 500;
                boss = null;
                isBossMode = false;
                triggerScreenShake();
                // ดรอปไอเทมรัวๆ ตอนบอสตาย
                for(let j=0; j<3; j++) items.push({x: player.x, y: 0, label: "P", color: "#00ff00"});
            }
        }
        if (b.y < 0 || b.x < 0 || b.x > canvas.width) bullets.splice(i, 1);
    });

    // จัดการศัตรู (และกระสุนบอส)
    if (!isBossMode && Math.random() < 0.05) { // ถ้าไม่ใช่ช่วงสู้บอส ให้ลูกกระจ๊อกเกิดปกติ
        enemies.push({ x: Math.random() * (canvas.width - 40), y: -40, w: 40, h: 40, speed: 3 + (score / 2000) });
    }

    enemies.forEach((en, i) => {
        en.y += en.speed;
        ctx.fillStyle = en.isBossBullet ? "#ff00ff" : "red"; // กระสุนบอสสีชมพูเข้ม
        ctx.fillRect(en.x, en.y, en.w, en.h);

        // ชนยาน
        if (!isInvincible && en.x < player.x + player.w && en.x + en.w > player.x &&
            en.y < player.y + player.h && en.y + en.h > player.y) {
            enemies.splice(i, 1);
            if (hasShield) { hasShield = false; triggerScreenShake(); } 
            else { 
                lives--; triggerScreenShake(); player.color = "red";
                setTimeout(() => { player.color = player.baseColor; }, 200);
            }
            if (lives <= 0) { gameActive = false; setTimeout(gameOver, 10); return; } 
            else { isInvincible = true; setTimeout(() => { isInvincible = false; }, 1500); }
        }

        // กระสุนชนศัตรู (ลูกกระจ๊อก)
        bullets.forEach((b, bi) => {
            if (!en.isBossBullet && b.x < en.x + en.w && b.x + b.w > en.x && b.y < en.y + en.h && b.y + b.h > en.y) {
                if (Math.random() < 0.3) {
                    let type = itemData[Math.floor(Math.random() * itemData.length)];
                    items.push({ x: en.x + 20, y: en.y + 20, label: type.label, color: type.color });
                }
                enemies.splice(i, 1); bullets.splice(bi, 1);
                score += 10; scoreElement.innerText = score;
            }
        });
        if (en.y > canvas.height) enemies.splice(i, 1);
    });

    requestAnimationFrame(draw);
}
