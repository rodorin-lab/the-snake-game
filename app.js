/**
 * 🐍 グラムちゃん・サイバー・スネーク 🦋
 * 全部盛り改造版
 */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 🎨 Canvas設定
canvas.width = 440;
canvas.height = 440;

// 🎮 ゲームパラメータ
let speed = 7;
let tileCount = 20;
let tileSize = canvas.width / tileCount;

// 🐍 蛇の状態
let snake = [{ x: 10, y: 10 }];
let velocity = { x: 0, y: 0 };
let nextVelocity = { x: 0, y: 0 };

// 🍎 餌の位置
let snack = { x: 5, y: 5 };

// 💎 パワーアップアイテム
let powerUp = null;
let powerUpTimer = 0;
let activePowerUp = null;
let activePowerUpTimer = 0;

// 🛡️ シールド
let shieldActive = false;

// ⭐ 無敵
let invincibleActive = false;

// 💰 スコア
let score = 0;
let highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
let level = 1;

// 🎨 エフェクト
let particles = [];
let trail = [];
let screenShake = 0;

// 🎵 効果音
const eatSound = new Audio('eat.wav');
const powerUpSound = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='); // ダミー、後で置き換え

// 🎮 ゲーム状態
let gameOver = false;
let gameStarted = false;
let boss = null;
let bossPhase = false;

// 🎨 カラーパレット（グラムちゃんカラー）
const colors = {
  snakeHead: '#d4a5ff',    // 紫
  snakeBody: '#a88cff',    // 薄紫
  snack: '#ff6b9d',        // ピンクハート
  powerUpStar: '#ffd700',  // 金色
  powerUpCrystal: '#00e5ff', // シアン
  powerUpShield: '#76ff03', // 緑
  background: '#0d001a',
  grid: 'rgba(168, 140, 255, 0.08)',
  text: '#d4a5ff',
  boss: '#ff1744',
};

// 📱 タッチコントロール初期化
function initTouchControls() {
  const touchBtns = document.querySelectorAll('.touch-btn');
  touchBtns.forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const dir = btn.dataset.dir;
      setDirection(dir);
    });
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const dir = btn.dataset.dir;
      setDirection(dir);
    });
  });

  // スワイプ対応
  let touchStartX = 0;
  let touchStartY = 0;
  canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });
  canvas.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(dx > 0 ? 'right' : 'left');
    } else {
      setDirection(dy > 0 ? 'down' : 'up');
    }
  });
}

// 🎯 方向設定
function setDirection(dir) {
  if (!gameStarted) {
    gameStarted = true;
    if (dir === 'up') nextVelocity = { x: 0, y: -1 };
    if (dir === 'down') nextVelocity = { x: 0, y: 1 };
    if (dir === 'left') nextVelocity = { x: -1, y: 0 };
    if (dir === 'right') nextVelocity = { x: 1, y: 0 };
    return;
  }

  if (dir === 'up' && velocity.y !== 1) nextVelocity = { x: 0, y: -1 };
  if (dir === 'down' && velocity.y !== -1) nextVelocity = { x: 0, y: 1 };
  if (dir === 'left' && velocity.x !== 1) nextVelocity = { x: -1, y: 0 };
  if (dir === 'right' && velocity.x !== -1) nextVelocity = { x: 1, y: 0 };
}

// ⌨️ キーボードイベント
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') setDirection('up');
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') setDirection('down');
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') setDirection('left');
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setDirection('right');
  if (e.key === ' ' && gameOver) restartGame();
});

// 🎮 ゲームループ
function playGame() {
  if (gameOver) return;

  velocity = { ...nextVelocity };

  // ボスフェーズ
  if (score >= 100 && !bossPhase) {
    startBossPhase();
  }

  moveSnake();

  // 衝突判定
  if (checkCollision()) {
    if (shieldActive) {
      shieldActive = false;
      updatePowerUpIcons();
      screenShake = 10;
      spawnParticles(snake[0].x * tileSize, snake[0].y * tileSize, colors.powerUpShield, 10);
      return;
    }
    if (invincibleActive) {
      return;
    }
    endGame();
    return;
  }

  // 餌を食べた
  if (snake[0].x === snack.x && snake[0].y === snack.y) {
    eatSnack();
  }

  // パワーアップを食べた
  if (powerUp && snake[0].x === powerUp.x && snake[0].y === powerUp.y) {
    activatePowerUp(powerUp.type);
    powerUp = null;
  }

  // ボスとの衝突
  if (boss) {
    checkBossCollision();
  }

  // パワーアップタイマー
  if (activePowerUpTimer > 0) {
    activePowerUpTimer--;
    if (activePowerUpTimer <= 0) {
      activePowerUp = null;
      invincibleActive = false;
      updatePowerUpIcons();
    }
  }

  // 新しいパワーアップ生成
  powerUpTimer--;
  if (powerUpTimer <= 0 && !powerUp && !boss) {
    spawnPowerUp();
  }

  // ボスAI
  if (boss) {
    updateBoss();
  }

  // エフェクト更新
  updateParticles();
  updateTrail();
  if (screenShake > 0) screenShake--;

  // 描画
  draw();

  setTimeout(playGame, 1000 / speed);
}

// 🐍 蛇を動かす
function moveSnake() {
  const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };
  snake.unshift(head);

  // 餌を食べてない場合はしっぽを消す
  if (head.x !== snack.x || head.y !== snack.y) {
    if (!powerUp || head.x !== powerUp.x || head.y !== powerUp.y) {
      snake.pop();
    }
  }

  // トレイル追加
  trail.unshift({ x: head.x, y: head.y, life: 10 });
}

// 💥 衝突判定
function checkCollision() {
  const head = snake[0];

  // 壁との衝突
  if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
    return true;
  }

  // 自分の体との衝突
  for (let i = 1; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      return true;
    }
  }

  return false;
}

// 🍎 餌を食べる
function eatSnack() {
  score += invincibleActive ? 20 : 10;
  if (activePowerUp === 'double') score += 10;

  level = Math.floor(score / 50) + 1;
  speed = 7 + level * 0.5;

  eatSound.currentTime = 0;
  eatSound.play().catch(() => {});

  // パーティクル爆発
  spawnParticles(
    snack.x * tileSize + tileSize / 2,
    snack.y * tileSize + tileSize / 2,
    colors.snack,
    20
  );

  screenShake = 5;

  spawnSnack();

  // ボスにダメージ
  if (boss) {
    boss.hp--;
    if (boss.hp <= 0) {
      defeatBoss();
    }
  }

  updateUI();
}

// 🍎 餌を生成
function spawnSnack() {
  do {
    snack = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };
  } while (isOccupied(snack.x, snack.y));
}

// 💎 パワーアップ生成
function spawnPowerUp() {
  const types = ['star', 'crystal', 'shield'];
  const type = types[Math.floor(Math.random() * types.length)];

  do {
    powerUp = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
      type: type,
      life: 300, // 5秒で消える
    };
  } while (isOccupied(powerUp.x, powerUp.y));

  powerUpTimer = 600; // 次のパワーアップまで10秒
}

// ⚡ パワーアップ発動
function activatePowerUp(type) {
  activePowerUp = type;
  activePowerUpTimer = 300; // 5秒間有効

  powerUpSound.currentTime = 0;
  powerUpSound.play().catch(() => {});

  if (type === 'star') {
    invincibleActive = true;
  } else if (type === 'crystal') {
    // スコア2倍はeatSnackで処理
  } else if (type === 'shield') {
    shieldActive = true;
  }

  // パーティクル
  spawnParticles(
    powerUp.x * tileSize + tileSize / 2,
    powerUp.y * tileSize + tileSize / 2,
    type === 'star' ? colors.powerUpStar :
    type === 'crystal' ? colors.powerUpCrystal : colors.powerUpShield,
    30
  );

  updatePowerUpIcons();
}

// 👾 ボスフェーズ開始
function startBossPhase() {
  bossPhase = true;
  boss = {
    x: tileCount / 2,
    y: tileCount / 2,
    size: 3,
    hp: 10,
    maxHp: 10,
    direction: { x: 1, y: 0 },
    moveTimer: 0,
  };
  screenShake = 20;
}

// 👾 ボス更新
function updateBoss() {
  boss.moveTimer--;
  if (boss.moveTimer <= 0) {
    boss.moveTimer = 20;
    // 蛇を追いかける
    const head = snake[0];
    const dx = head.x - boss.x;
    const dy = head.y - boss.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      boss.direction = { x: Math.sign(dx), y: 0 };
    } else {
      boss.direction = { x: 0, y: Math.sign(dy) };
    }

    boss.x += boss.direction.x;
    boss.y += boss.direction.y;

    // 壁で反射
    if (boss.x < 0 || boss.x >= tileCount) boss.direction.x *= -1;
    if (boss.y < 0 || boss.y >= tileCount) boss.direction.y *= -1;
  }
}

// 💥 ボス衝突判定
function checkBossCollision() {
  const head = snake[0];
  for (let bx = -1; bx <= 1; bx++) {
    for (let by = -1; by <= 1; by++) {
      if (head.x === Math.floor(boss.x) + bx && head.y === Math.floor(boss.y) + by) {
        if (invincibleActive) {
          boss.hp--;
          if (boss.hp <= 0) defeatBoss();
          return;
        }
        if (shieldActive) {
          shieldActive = false;
          updatePowerUpIcons();
          screenShake = 15;
          return;
        }
        endGame();
        return;
      }
    }
  }
}

// 🎉 ボス撃破
function defeatBoss() {
  boss = null;
  score += 500;
  screenShake = 30;
  spawnParticles(canvas.width / 2, canvas.height / 2, colors.boss, 50);
  updateUI();
}

// 📦 座標が占有されているか
function isOccupied(x, y) {
  for (let part of snake) {
    if (part.x === x && part.y === y) return true;
  }
  if (boss) {
    for (let bx = -1; bx <= 1; bx++) {
      for (let by = -1; by <= 1; by++) {
        if (Math.floor(boss.x) + bx === x && Math.floor(boss.y) + by === y) return true;
      }
    }
  }
  return false;
}

// ✨ パーティクル生成
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 30,
      maxLife: 30,
      color: color,
      size: Math.random() * 4 + 2,
    });
  }
}

// ✨ パーティクル更新
function updateParticles() {
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    return p.life > 0;
  });
}

// 🌟 トレイル更新
function updateTrail() {
  trail = trail.filter(t => {
    t.life--;
    return t.life > 0;
  });
}

// 🎨 描画
function draw() {
  // 画面クリア
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 画面シェイク
  ctx.save();
  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake * 0.5;
    const shakeY = (Math.random() - 0.5) * screenShake * 0.5;
    ctx.translate(shakeX, shakeY);
  }

  // グリッド描画
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= tileCount; i++) {
    ctx.beginPath();
    ctx.moveTo(i * tileSize, 0);
    ctx.lineTo(i * tileSize, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * tileSize);
    ctx.lineTo(canvas.width, i * tileSize);
    ctx.stroke();
  }

  // トレイル描画
  trail.forEach(t => {
    const alpha = t.life / 10;
    ctx.fillStyle = `rgba(212, 165, 255, ${alpha * 0.3})`;
    ctx.beginPath();
    ctx.arc(
      t.x * tileSize + tileSize / 2,
      t.y * tileSize + tileSize / 2,
      tileSize / 2 * alpha,
      0,
      Math.PI * 2
    );
    ctx.fill();
  });

  // 🐍 蛇描画
  snake.forEach((part, index) => {
    const isHead = index === 0;
    const isInvincible = invincibleActive && Math.floor(Date.now() / 100) % 2 === 0;

    // 発光エフェクト
    if (isHead || (isInvincible && index % 2 === 0)) {
      ctx.shadowColor = isInvincible ? colors.powerUpStar : colors.snakeHead;
      ctx.shadowBlur = 20;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = isHead ? colors.snakeHead : colors.snakeBody;

    // グラムちゃん風の円形描画
    ctx.beginPath();
    ctx.arc(
      part.x * tileSize + tileSize / 2,
      part.y * tileSize + tileSize / 2,
      tileSize / 2 - 1,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // 目（ヘッドのみ）
    if (isHead) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(
        part.x * tileSize + tileSize / 2 - 3,
        part.y * tileSize + tileSize / 2 - 2,
        2, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        part.x * tileSize + tileSize / 2 + 3,
        part.y * tileSize + tileSize / 2 - 2,
        2, 0, Math.PI * 2
      );
      ctx.fill();
    }
  });

  ctx.shadowBlur = 0;

  // 🍎 餌描画（ハート型）
  ctx.fillStyle = colors.snack;
  ctx.shadowColor = colors.snack;
  ctx.shadowBlur = 15;
  drawHeart(
    snack.x * tileSize + tileSize / 2,
    snack.y * tileSize + tileSize / 2,
    tileSize / 2
  );
  ctx.shadowBlur = 0;

  // 💎 パワーアップ描画
  if (powerUp) {
    const color =
      powerUp.type === 'star' ? colors.powerUpStar :
      powerUp.type === 'crystal' ? colors.powerUpCrystal : colors.powerUpShield;

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;

    const px = powerUp.x * tileSize + tileSize / 2;
    const py = powerUp.y * tileSize + tileSize / 2;
    const pulse = Math.sin(Date.now() / 200) * 3;

    ctx.beginPath();
    ctx.arc(px, py, tileSize / 2 - 1 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // アイコン
    ctx.fillStyle = '#000';
    ctx.font = `${tileSize * 0.6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      powerUp.type === 'star' ? '⭐' :
      powerUp.type === 'crystal' ? '💎' : '🛡️',
      px, py
    );

    ctx.shadowBlur = 0;
    powerUp.life--;
    if (powerUp.life <= 0) powerUp = null;
  }

  // 👾 ボス描画
  if (boss) {
    ctx.fillStyle = colors.boss;
    ctx.shadowColor = colors.boss;
    ctx.shadowBlur = 30;

    for (let bx = -1; bx <= 1; bx++) {
      for (let by = -1; by <= 1; by++) {
        ctx.beginPath();
        ctx.arc(
          (Math.floor(boss.x) + bx) * tileSize + tileSize / 2,
          (Math.floor(boss.y) + by) * tileSize + tileSize / 2,
          tileSize / 2,
          0, Math.PI * 2
        );
        ctx.fill();
      }
    }

    // HPバー
    const barWidth = tileSize * 3;
    const barHeight = 6;
    const barX = canvas.width / 2 - barWidth / 2;
    const barY = 10;

    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = colors.boss;
    ctx.fillRect(barX, barY, barWidth * (boss.hp / boss.maxHp), barHeight);

    ctx.shadowBlur = 0;
  }

  // ✨ パーティクル描画
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  ctx.restore();

  // ゲームオーバー表示
  if (gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = colors.text;
    ctx.font = 'bold 40px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = colors.text;
    ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);

    ctx.font = '20px "Courier New", monospace';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('Press SPACE to Restart', canvas.width / 2, canvas.height / 2 + 40);
    ctx.shadowBlur = 0;
  }

  // スタート前表示
  if (!gameStarted) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = colors.text;
    ctx.font = 'bold 30px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = colors.text;
    ctx.shadowBlur = 20;
    ctx.fillText('🐍 グラムちゃん・スネーク 🦋', canvas.width / 2, canvas.height / 2 - 30);

    ctx.font = '18px "Courier New", monospace';
    ctx.fillText('Press Arrow Key or Tap', canvas.width / 2, canvas.height / 2 + 20);
    ctx.shadowBlur = 0;
  }
}

// ❤️ ハート描画
function drawHeart(x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y + size / 4);
  ctx.bezierCurveTo(x, y, x - size, y, x - size, y + size / 4);
  ctx.bezierCurveTo(x - size, y + size / 2, x, y + size * 3 / 4, x, y + size);
  ctx.bezierCurveTo(x, y + size * 3 / 4, x + size, y + size / 2, x + size, y + size / 4);
  ctx.bezierCurveTo(x + size, y, x, y, x, y + size / 4);
  ctx.fill();
}

// 💀 ゲームオーバー
function endGame() {
  gameOver = true;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('snakeHighScore', highScore);
  }
  updateUI();
}

// 🔄 リスタート
function restartGame() {
  snake = [{ x: 10, y: 10 }];
  velocity = { x: 0, y: 0 };
  nextVelocity = { x: 0, y: 0 };
  snack = { x: 5, y: 5 };
  powerUp = null;
  powerUpTimer = 0;
  activePowerUp = null;
  activePowerUpTimer = 0;
  shieldActive = false;
  invincibleActive = false;
  score = 0;
  level = 1;
  speed = 7;
  gameOver = false;
  gameStarted = false;
  boss = null;
  bossPhase = false;
  particles = [];
  trail = [];
  screenShake = 0;

  updateUI();
  updatePowerUpIcons();
  playGame();
}

// 📊 UI更新
function updateUI() {
  document.getElementById('scoreDisplay').textContent = score;
  document.getElementById('highDisplay').textContent = highScore;
  document.getElementById('levelDisplay').textContent = level;
  document.getElementById('lengthDisplay').textContent = snake.length;
}

// 💜 パワーアップアイコン更新
function updatePowerUpIcons() {
  document.getElementById('invincibleIcon').classList.toggle('active', invincibleActive);
  document.getElementById('doubleIcon').classList.toggle('active', activePowerUp === 'double');
  document.getElementById('shieldIcon').classList.toggle('active', shieldActive);
}

// 🎮 ゲーム開始
initTouchControls();
updateUI();
updatePowerUpIcons();
playGame();
