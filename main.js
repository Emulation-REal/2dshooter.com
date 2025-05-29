const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const modMenu = document.getElementById('modMenu');
const modsContainer = document.getElementById('modsContainer');
const upgradeButtonsContainer = document.getElementById('upgradeButtonsContainer');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuHeader = document.getElementById('menuHeader');

canvas.width = 800;
canvas.height = 600;

// --- Player setup ---
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 20,
  color: '#3498db',
  speed: 4,
  health: 100,
  maxHealth: 100,
  ammo: 10,
  maxAmmo: 10,
  reloadTime: 1000,
  isReloading: false,
  score: 0,
  upgrades: {
    bulletSpeed: 5,
    bulletDamage: 1,
    reloadSpeed: 1000,
    fireRate: 500,
    maxAmmo: 10,
    bulletSize: 5,
    multiShot: 1,
    homing: false,
    pierce: false,
    speed: 4,
  }
};

// --- Mods state ---
const mods = {
  infiniteAmmo: false,
  noReload: false,
  fastReload: false,
  noEnemyDamage: false,
  speedHack: false,
  autoAim: false,
  oneShotKill: false,
  multiShot: false,
  pierceBullets: false,
  homingBullets: false,
  rapidFire: false,
  noRecoil: false,
  noKnockback: false,
  pointMultiplier: false,
  noEnemySpawnDelay: false,
  instantReload: false,
  teleport: false,
  infiniteHealth: false,
  invincibility: false,
};

// --- Game entities ---
const enemies = [];
const bullets = [];

let lastFireTime = 0;
let mousePos = { x: player.x, y: player.y };
let keys = {};

function spawnEnemy() {
  const radius = 15;
  const x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
  const y = Math.random() * canvas.height;
  enemies.push({
    x,
    y,
    radius,
    color: '#e74c3c',
    speed: 1.5,
    health: 3,
    maxHealth: 3,
  });
}

// Spawn enemies every 2 seconds initially
let enemySpawnInterval = 2000;
setInterval(() => {
  if (!mods.noEnemySpawnDelay) {
    spawnEnemy();
  } else {
    // If no delay mod is active, spawn faster
    spawnEnemy();
    spawnEnemy();
  }
}, enemySpawnInterval);

// --- Controls ---
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mousePos.x = e.clientX - rect.left;
  mousePos.y = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
  shootBullet();
});

function shootBullet() {
  if (player.isReloading) return;
  const now = Date.now();
  if (now - lastFireTime < (mods.rapidFire ? player.upgrades.fireRate / 5 : player.upgrades.fireRate)) return;

  if (player.ammo <= 0 && !mods.infiniteAmmo && !mods.noReload) {
    reload();
    return;
  }

  if (!mods.infiniteAmmo) {
    player.ammo--;
  }

  lastFireTime = now;

  // Calculate direction
  const dx = mousePos.x - player.x;
  const dy = mousePos.y - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const dirX = dx / dist;
  const dirY = dy / dist;

  // Multi-shot logic
  const multiShotCount = mods.multiShot ? player.upgrades.multiShot : 1;
  const spreadAngle = 0.3; // radians

  for (let i = 0; i < multiShotCount; i++) {
    // Spread bullets around the direction
    let angleOffset = (i - (multiShotCount - 1) / 2) * spreadAngle;
    let cos = Math.cos(angleOffset);
    let sin = Math.sin(angleOffset);
    const vx = dirX * cos - dirY * sin;
    const vy = dirX * sin + dirY * cos;

    bullets.push({
      x: player.x,
      y: player.y,
      vx: vx * player.upgrades.bulletSpeed,
      vy: vy * player.upgrades.bulletSpeed,
      radius: player.upgrades.bulletSize,
      damage: mods.oneShotKill ? 1000 : player.upgrades.bulletDamage,
      pierce: mods.pierceBullets || player.upgrades.pierce,
      homing: mods.homingBullets || player.upgrades.homing,
      hitEnemies: new Set(),
    });
  }

  if (player.ammo <= 0 && !mods.infiniteAmmo && !mods.noReload) {
    reload();
  }
}

function reload() {
  if (player.isReloading) return;
  player.isReloading = true;
  const reloadDuration = mods.instantReload ? 100 : (mods.fastReload ? player.upgrades.reloadSpeed / 3 : player.upgrades.reloadSpeed);
  setTimeout(() => {
    player.ammo = player.maxAmmo;
    player.isReloading = false;
  }, reloadDuration);
}

function update() {
  // Player movement
  let speed = player.speed;
  if (mods.speedHack) speed = 10;
  if (mods.infiniteHealth) player.health = player.maxHealth;

  if (keys['w'] || keys['arrowup']) player.y -= speed;
  if (keys['s'] || keys['arrowdown']) player.y += speed;
  if (keys['a'] || keys['arrowleft']) player.x -= speed;
  if (keys['d'] || keys['arrowright']) player.x += speed;

  // Clamp player position inside canvas
  player.x = Math.min(Math.max(player.radius, player.x), canvas.width - player.radius);
  player.y = Math.min(Math.max(player.radius, player.y), canvas.height - player.radius);

  // Teleport mod (clicking on canvas teleports player)
  if (mods.teleport && mousePos) {
    player.x = mousePos.x;
    player.y = mousePos.y;
  }

  // Update bullets
  bullets.forEach((b, index) => {
    if (b.homing) {
      // Homing: find closest enemy
      let closestEnemy = null;
      let closestDist = Infinity;
      enemies.forEach(e => {
        if (b.hitEnemies.has(e)) return; // ignore enemies already hit if piercing
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closestEnemy = e;
        }
      });
      if (closestEnemy) {
        const dx = closestEnemy.x - b.x;
        const dy = closestEnemy.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const homingStrength = 0.2;
        b.vx += (dx / dist) * homingStrength;
        b.vy += (dy / dist) * homingStrength;
        // Normalize velocity to bullet speed
        const velMag = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const speed = player.upgrades.bulletSpeed;
        b.vx = (b.vx / velMag) * speed;
        b.vy = (b.vy / velMag) * speed;
      }
    }

    b.x += b.vx;
    b.y += b.vy;

    // Remove bullets out of bounds
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
      bullets.splice(index, 1);
    }
  });

  // Enemy behavior
  enemies.forEach((e, eIndex) => {
    // Move towards player
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      e.x += (dx / dist) * e.speed;
      e.y += (dy / dist) * e.speed;
    }

    // Check collision with player
    if (!mods.invincibility && dist < e.radius + player.radius) {
      if (!mods.noEnemyDamage) {
        player.health -= 0.3;
        if (player.health < 0) player.health = 0;
      }
    }
  });

  // Bullets hit enemies
  bullets.forEach((b, bIndex) => {
    enemies.forEach((e, eIndex) => {
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < b.radius + e.radius && !b.hitEnemies.has(e)) {
        e.health -= b.damage;
        b.hitEnemies.add(e);
        if (!b.pierce) {
          bullets.splice(bIndex, 1);
        }
        if (e.health <= 0) {
          player.score += mods.pointMultiplier ? 10 : 1;
          enemies.splice(eIndex, 1);
        }
      }
    });
  });

  if (player.health <= 0) {
    alert('Game Over! Your score: ' + player.score);
    // Reset game state
    player.health = player.maxHealth;
    player.score = 0;
    enemies.length = 0;
    bullets.length = 0;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayer();
  drawEnemies();
  drawBullets();
  drawScore();
}

function drawPlayer() {
  // Draw player body
  ctx.beginPath();
  ctx.fillStyle = player.color;
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw ammo count on player
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`Ammo: ${mods.infiniteAmmo ? '∞' : player.ammo}`, player.x, player.y - player.radius - 10);

  // Draw health bar
  const barWidth = 60;
  const barHeight = 6;
  const healthRatio = mods.infiniteHealth ? 1 : player.health / player.maxHealth;
  ctx.fillStyle = '#555';
  ctx.fillRect(player.x - barWidth/2, player.y + player.radius + 8, barWidth, barHeight);
  ctx.fillStyle = healthRatio > 0.5 ? '#0f0' : (healthRatio > 0.2 ? '#fa0' : '#f00');
  ctx.fillRect(player.x - barWidth/2, player.y + player.radius + 8, barWidth * healthRatio, barHeight);
}

function drawEnemies() {
  enemies.forEach(e => {
    ctx.beginPath();
    ctx.fillStyle = e.color;
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();

    // Health bar
    const barWidth = 30;
    const barHeight = 4;
    const healthRatio = e.health / e.maxHealth;
    ctx.fillStyle = '#333';
    ctx.fillRect(e.x - barWidth/2, e.y - e.radius - 10, barWidth, barHeight);
    ctx.fillStyle = '#f00';
    ctx.fillRect(e.x - barWidth/2, e.y - e.radius - 10, barWidth * healthRatio, barHeight);
  });
}

function drawBullets() {
  bullets.forEach(b => {
    ctx.beginPath();
    ctx.fillStyle = mods.oneShotKill ? '#ff0' : '#0ff';
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawScore() {
  scoreDisplay.textContent = `Score: ${player.score}`;
}

// --- Mod Menu logic ---

const modList = [
  { id: 'infiniteAmmo', name: 'Infinite Ammo' },
  { id: 'noReload', name: 'No Reload' },
  { id: 'fastReload', name: 'Fast Reload' },
  { id: 'noEnemyDamage', name: 'No Enemy Damage' },
  { id: 'speedHack', name: 'Speed Hack' },
  { id: 'autoAim', name: 'Auto Aim' },
  { id: 'oneShotKill', name: 'One Shot Kill' },
  { id: 'multiShot', name: 'Multi Shot' },
  { id: 'pierceBullets', name: 'Pierce Bullets' },
  { id: 'homingBullets', name: 'Homing Bullets' },
  { id: 'rapidFire', name: 'Rapid Fire' },
  { id: 'noRecoil', name: 'No Recoil' },
  { id: 'noKnockback', name: 'No Knockback' },
  { id: 'pointMultiplier', name: 'Point Multiplier' },
  { id: 'noEnemySpawnDelay', name: 'No Enemy Spawn Delay' },
  { id: 'instantReload', name: 'Instant Reload' },
  { id: 'teleport', name: 'Teleport (click)' },
  { id: 'infiniteHealth', name: 'Infinite Health' },
  { id: 'invincibility', name: 'Invincibility' },
];

function buildModMenu() {
  modsContainer.innerHTML = '';
  modList.forEach(mod => {
    const btn = document.createElement('button');
    btn.classList.add('modButton');
    btn.textContent = mod.name;
    btn.dataset.modId = mod.id;
    if (mods[mod.id]) btn.classList.add('active');
    btn.addEventListener('click', () => {
      mods[mod.id] = !mods[mod.id];
      btn.classList.toggle('active');
      // Special effects on toggle:
      if (mod.id === 'infiniteAmmo') {
        if (mods.infiniteAmmo) player.ammo = 9999;
        else player.ammo = player.maxAmmo;
      }
    });
    modsContainer.appendChild(btn);
  });

  // Upgrade buttons
  upgradeButtonsContainer.innerHTML = '';
  const upgrades = [
    { id: 'bulletSpeed', name: 'Bullet Speed' },
    { id: 'bulletDamage', name: 'Bullet Damage' },
    { id: 'reloadSpeed', name: 'Reload Speed' },
    { id: 'fireRate', name: 'Fire Rate' },
    { id: 'maxAmmo', name: 'Max Ammo' },
    { id: 'bulletSize', name: 'Bullet Size' },
    { id: 'multiShot', name: 'Multi Shot Count' },
    { id: 'speed', name: 'Player Speed' },
  ];
  upgrades.forEach(upg => {
    const btn = document.createElement('button');
    btn.classList.add('modButton');
    btn.textContent = `${upg.name}: ${player.upgrades[upg.id]}`;
    btn.addEventListener('click', () => {
      player.upgrades[upg.id]++;
      if (upg.id === 'maxAmmo') player.maxAmmo = player.upgrades.maxAmmo;
      if (upg.id === 'speed') player.speed = player.upgrades.speed;
      if (upg.id === 'multiShot') player.upgrades.multiShot = player.upgrades.multiShot;
      btn.textContent = `${upg.name}: ${player.upgrades[upg.id]}`;
    });
    upgradeButtonsContainer.appendChild(btn);
  });
}

closeMenuBtn.addEventListener('click', () => {
  modMenu.style.display = 'none';
});

menuHeader.addEventListener('mousedown', dragMouseDown);

function dragMouseDown(e) {
  e.preventDefault();
  let pos3 = e.clientX;
  let pos4 = e.clientY;

  function dragMouseMove(e) {
    e.preventDefault();
    const pos1 = pos3 - e.clientX;
    const pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    modMenu.style.top = (modMenu.offsetTop - pos2) + "px";
    modMenu.style.left = (modMenu.offsetLeft - pos1) + "px";
  }

  function closeDrag() {
    document.removeEventListener('mouseup', closeDrag);
    document.removeEventListener('mousemove', dragMouseMove);
  }

  document.addEventListener('mouseup', closeDrag);
  document.addEventListener('mousemove', dragMouseMove);
}

// Show mod menu with 'M' key
window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'm') {
    modMenu.style.display = 'block';
    buildModMenu();
  }
});

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
