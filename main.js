(() => {
  // --- Game Setup ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // Player object
  const player = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    radius: 15,
    speed: 3,
    color: 'cyan',
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    reloadTime: 1000,
    reloading: false,
    canShoot: true,
    shootCooldown: 300,
    lastShotTime: 0,
    damage: 10,
    score: 0,
  };

  // Controls
  const keysPressed = {};
  window.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'o') toggleMenu();
    if (e.key.toLowerCase() === 'f') toggleUpgradeShot();
  });
  window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
  });

  // Enemies array
  const enemies = [];
  const ENEMY_RADIUS = 12;
  const ENEMY_COLOR = 'red';
  const ENEMY_SPAWN_INTERVAL = 2000;
  let lastEnemySpawn = 0;

  // Bullets array
  const bullets = [];

  // Mods state
  const mods = {
    infiniteAmmo: false,
    rapidFire: false,
    noRecoil: false,
    oneShotKill: false,
    autoAim: false,
    speedHack: false,
    damageMultiplier: false,
    pointMultiplier: false,
    unlimitedHealth: false,
    noReloadCooldown: false,
    noEnemySpawnDelay: false,
    noEnemyDamage: false,
    noPlayerKnockback: false,
    instantReload: false,
    infiniteStamina: false,
    noRecoilKickback: false,
    fastReload: false,
    noSpread: false,
    multiShot: false,
    homingBullets: false,
    wallPiercing: false,
    noClip: false,
    superJump: false,
    infiniteGrenades: false,
    grenadeExplosions: false,
  };

  // Upgrade shot system
  const upgrades = [
    { name: 'Increase Damage', level: 0, maxLevel: 5, apply: () => player.damage += 2 },
    { name: 'Increase Speed', level: 0, maxLevel: 5, apply: () => player.speed += 0.3 },
    { name: 'Increase Ammo', level: 0, maxLevel: 5, apply: () => { player.maxAmmo += 5; player.ammo += 5; } },
    { name: 'Reduce Reload Time', level: 0, maxLevel: 5, apply: () => player.reloadTime = Math.max(200, player.reloadTime - 150) },
    { name: 'Reduce Shoot Cooldown', level: 0, maxLevel: 5, apply: () => player.shootCooldown = Math.max(50, player.shootCooldown - 40) },
    { name: 'Increase Bullet Speed', level: 0, maxLevel: 5, apply: () => bulletBaseSpeed += 1 },
    { name: 'Increase Bullet Size', level: 0, maxLevel: 5, apply: () => bulletRadius += 1 },
    { name: 'Increase Health', level: 0, maxLevel: 5, apply: () => { player.maxHealth += 10; player.health += 10; } },
    { name: 'Increase Score Multiplier', level: 0, maxLevel: 5, apply: () => pointMultiplierMultiplier += 0.1 },
    { name: 'Reduce Recoil', level: 0, maxLevel: 5, apply: () => recoilAmount = Math.max(0, recoilAmount - 0.5) },
  ];

  // State variables for upgrades & bullets
  let upgradeMenuOpen = false;
  const upgradeButtonsContainer = document.getElementById('upgradeButtonsContainer');

  // Game constants for bullets
  let bulletBaseSpeed = 7;
  let bulletRadius = 5;
  let recoilAmount = 5;
  let pointMultiplierMultiplier = 1;

  // Reference UI elements
  const modMenu = document.getElementById('modMenu');
  const scoreDisplay = document.getElementById('scoreDisplay');

  // --- Draggable Menu ---
  const menuHeader = document.getElementById('menuHeader');
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  menuHeader.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = modMenu.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    menuHeader.style.cursor = 'grabbing';
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
    menuHeader.style.cursor = 'grab';
  });
  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      let newX = e.clientX - dragOffsetX;
      let newY = e.clientY - dragOffsetY;
      // Keep menu inside viewport
      newX = Math.min(window.innerWidth - modMenu.offsetWidth, Math.max(0, newX));
      newY = Math.min(window.innerHeight - modMenu.offsetHeight, Math.max(0, newY));
      modMenu.style.left = newX + 'px';
      modMenu.style.top = newY + 'px';
    }
  });

  // Close button
  document.getElementById('closeMenuBtn').addEventListener('click', () => {
    modMenu.style.display = 'none';
  });

  // Toggle mod menu on "O"
  function toggleMenu() {
    if (modMenu.style.display === 'none' || modMenu.style.display === '') {
      modMenu.style.display = 'block';
      // Reset upgrade menu on open
      if (upgradeMenuOpen) toggleUpgradeShot(false);
    } else {
      modMenu.style.display = 'none';
      if (upgradeMenuOpen) toggleUpgradeShot(false);
    }
  }

  // Toggle upgrade shot menu on "F"
  function toggleUpgradeShot(forceClose = null) {
    if (forceClose === false) {
      upgradeMenuOpen = false;
      upgradeButtonsContainer.innerHTML = '';
      return;
    }
    upgradeMenuOpen = !upgradeMenuOpen;
    if (upgradeMenuOpen) {
      // Show upgrade buttons
      renderUpgradeButtons();
    } else {
      upgradeButtonsContainer.innerHTML = '';
    }
  }

  // Render upgrade buttons dynamically
  function renderUpgradeButtons() {
    upgradeButtonsContainer.innerHTML = '';
    upgrades.forEach((upg, idx) => {
      const btn = document.createElement('button');
      btn.className = 'upgradeBtn';
      btn.textContent = `${upg.name} (${upg.level}/${upg.maxLevel})`;
      btn.disabled = upg.level >= upg.maxLevel;
      btn.onclick = () => {
        if (upg.level < upg.maxLevel) {
          upg.level++;
          upg.apply();
          btn.textContent = `${upg.name} (${upg.level}/${upg.maxLevel})`;
          if (upg.level >= upg.maxLevel) btn.disabled = true;
        }
      };
      upgradeButtonsContainer.appendChild(btn);
    });
  }

  // --- Gameplay Functions ---

  // Spawn enemy at random edge
  function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    switch (side) {
      case 0: // Top
        x = Math.random() * WIDTH;
        y = -ENEMY_RADIUS * 2;
        break;
      case 1: // Bottom
        x = Math.random() * WIDTH;
        y = HEIGHT + ENEMY_RADIUS * 2;
        break;
      case 2: // Left
        x = -ENEMY_RADIUS * 2;
        y = Math.random() * HEIGHT;
        break;
      case 3: // Right
        x = WIDTH + ENEMY_RADIUS * 2;
        y = Math.random() * HEIGHT;
        break;
    }
    enemies.push({
      x,
      y,
      radius: ENEMY_RADIUS,
      color: ENEMY_COLOR,
      speed: 1 + Math.random(),
      health: 10,
      maxHealth: 10,
    });
  }

  // Handle player movement
  function updatePlayer() {
    let speed = player.speed;
    if (mods.speedHack) speed *= 2;

    if (keysPressed['w'] || keysPressed['arrowup']) player.y -= speed;
    if (keysPressed['s'] || keysPressed['arrowdown']) player.y += speed;
    if (keysPressed['a'] || keysPressed['arrowleft']) player.x -= speed;
    if (keysPressed['d'] || keysPressed['arrowright']) player.x += speed;

    // Keep inside canvas
    player.x = Math.min(WIDTH - player.radius, Math.max(player.radius, player.x));
    player.y = Math.min(HEIGHT - player.radius, Math.max(player.radius, player.y));
  }

  // Shoot bullet function
  function shoot() {
    const now = performance.now();
    if (!player.canShoot) return;
    if (now - player.lastShotTime < (mods.rapidFire ? 50 : player.shootCooldown)) return;
    if (player.ammo <= 0 && !mods.infiniteAmmo) return;
    if (player.reloading) return;

    // Ammo consume
    if (!mods.infiniteAmmo) {
      player.ammo--;
      if (player.ammo <= 0) startReload();
    }

    // Shoot direction (towards mouse)
    const dir = getShootDirection();

    // One shot kill or damage multiplier
    const damage = mods.oneShotKill ? 9999 :
      mods.damageMultiplier ? player.damage * 2 : player.damage;

    // Create bullet(s)
    let bulletCount = mods.multiShot ? 3 : 1;

    for (let i = 0; i < bulletCount; i++) {
      // Calculate spread if noSpread mod is false
      let spreadAngle = mods.noSpread ? 0 : (Math.random() - 0.5) * 0.2;
      let angle = Math.atan2(dir.y, dir.x) + spreadAngle;

      bullets.push({
        x: player.x + Math.cos(angle) * player.radius,
        y: player.y + Math.sin(angle) * player.radius,
        dx: Math.cos(angle) * bulletBaseSpeed,
        dy: Math.sin(angle) * bulletBaseSpeed,
        radius: bulletRadius,
        damage,
        homing: mods.homingBullets,
        pierce: mods.wallPiercing,
        target: null,
      });
    }

    // Recoil kickback - push player back unless no recoil
    if (!mods.noRecoil && !mods.noRecoilKickback) {
      player.x -= dir.x * recoilAmount;
      player.y -= dir.y * recoilAmount;
    }

    player.lastShotTime = now;
  }

  // Reloading
  function startReload() {
    if (player.reloading) return;
    player.reloading = true;
    const reloadDelay = mods.instantReload ? 0 : player.reloadTime;
    setTimeout(() => {
      player.ammo = player.maxAmmo;
      player.reloading = false;
    }, reloadDelay);
  }

  // Calculate shooting direction toward mouse
  let mouseX = WIDTH / 2;
  let mouseY = HEIGHT / 2;
  window.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  function getShootDirection() {
    if (mods.autoAim) {
      // Find closest enemy to player and shoot at it
      if (enemies.length === 0) return { x: 1, y: 0 };
      let closest = null;
      let closestDist = Infinity;
      for (const e of enemies) {
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const dist = dx * dx + dy * dy;
        if (dist < closestDist) {
          closestDist = dist;
          closest = e;
        }
      }
      if (!closest) return { x: 1, y: 0 };
      const dx = closest.x - player.x;
      const dy = closest.y - player.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      return { x: dx / len, y: dy / len };
    } else {
      // Direction toward mouse
      const dx = mouseX - player.x;
      const dy = mouseY - player.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: dx / len, y: dy / len };
    }
  }

  // Update bullets
  function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];

      if (b.homing && !b.target) {
        // Find closest enemy for homing bullet
        let closest = null;
        let closestDist = Infinity;
        for (const e of enemies) {
          const dx = e.x - b.x;
          const dy = e.y - b.y;
          const dist = dx * dx + dy * dy;
          if (dist < closestDist) {
            closestDist = dist;
            closest = e;
          }
        }
        b.target = closest;
      }
      if (b.homing && b.target) {
        // Adjust bullet velocity toward target
        const dx = b.target.x - b.x;
        const dy = b.target.y - b.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const homingSpeed = 0.3;
        b.dx += (dx / len) * homingSpeed;
        b.dy += (dy / len) * homingSpeed;
        // Normalize velocity to bulletBaseSpeed
        const speed = Math.sqrt(b.dx * b.dx + b.dy * b.dy);
        b.dx = (b.dx / speed) * bulletBaseSpeed;
        b.dy = (b.dy / speed) * bulletBaseSpeed;
      }

      b.x += b.dx;
      b.y += b.dy;

      // Remove bullets out of bounds
      if (b.x < -50 || b.x > WIDTH + 50 || b.y < -50 || b.y > HEIGHT + 50) {
        bullets.splice(i, 1);
        continue;
      }
    }
  }

  // Check collisions bullet vs enemies
  function handleBulletEnemyCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < b.radius + e.radius) {
          // Hit enemy
          e.health -= b.damage;
          if (!b.pierce) {
            bullets.splice(i, 1);
            break;
          }
        }
      }
    }

    // Remove dead enemies and update score
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.health <= 0) {
        enemies.splice(i, 1);
        // Scoring with multiplier mod
        player.score += 10 * (mods.pointMultiplier ? pointMultiplierMultiplier : 1);
      }
    }
  }

  // Update enemies - move toward player
  function updateEnemies() {
    enemies.forEach(e => {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;
      const speed = e.speed;
      e.x += (dx / dist) * speed;
      e.y += (dy / dist) * speed;

      // Collision with player (damage)
      if (dist < player.radius + e.radius) {
        if (!mods.noEnemyDamage) {
          player.health -= 1;
          if (!mods.noPlayerKnockback) {
            // Knock player back from enemy
            player.x -= (dx / dist) * 10;
            player.y -= (dy / dist) * 10;
          }
        }
      }
    });
  }

  // Draw everything
  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Player
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Player health bar
    ctx.fillStyle = 'gray';
    ctx.fillRect(10, 10, 100, 10);
    ctx.fillStyle = 'lime';
    ctx.fillRect(10, 10, (player.health / player.maxHealth) * 100, 10);

    // Ammo bar
    ctx.fillStyle = 'gray';
    ctx.fillRect(10, 30, 100, 10);
    ctx.fillStyle = 'yellow';
    ctx.fillRect(10, 30, (player.ammo / player.maxAmmo) * 100, 10);

    // Bullets
    bullets.forEach(b => {
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Enemies
    enemies.forEach(e => {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();

      // Enemy health bar
      ctx.fillStyle = 'red';
      ctx.fillRect(e.x - 10, e.y - e.radius - 10, 20, 5);
      ctx.fillStyle = 'lime';
      ctx.fillRect(e.x - 10, e.y - e.radius - 10, (e.health / e.maxHealth) * 20, 5);
    });

    // Score
    scoreDisplay.textContent = `Score: ${player.score}`;

    // Reloading text
    if (player.reloading) {
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.fillText('Reloading...', 10, 70);
    }
  }

  // Game loop
  function gameLoop(time = 0) {
    // Spawn enemies if allowed
    if (!mods.noEnemySpawnDelay && time - lastEnemySpawn > ENEMY_SPAWN_INTERVAL) {
      spawnEnemy();
      lastEnemySpawn = time;
    }

    updatePlayer();
    updateEnemies();
    updateBullets();
    handleBulletEnemyCollisions();

    draw();

    // Auto shoot on mouse down (optional)
    if (mouseDown) shoot();

    // Player death check
    if (player.health <= 0 && !mods.unlimitedHealth) {
      alert('You died! Refresh to restart.');
      return;
    }

    requestAnimationFrame(gameLoop);
  }

  // Mouse control
  let mouseDown = false;
  window.addEventListener('mousedown', () => { mouseDown = true; shoot(); });
  window.addEventListener('mouseup', () => { mouseDown = false; });

  // Initialize mods buttons with real toggles (just an example for infiniteAmmo)
  const modsContainer = document.getElementById('modsContainer');
  modsContainer.innerHTML = '';
  Object.keys(mods).forEach(modKey => {
    const btn = document.createElement('button');
    btn.textContent = modKey;
    btn.className = 'modButton';
    btn.style.margin = '2px';
    btn.style.padding = '4px 8px';
    btn.style.backgroundColor = mods[modKey] ? '#4caf50' : '#ccc';
    btn.style.color = mods[modKey] ? 'white' : 'black';
    btn.onclick = () => {
      mods[modKey] = !mods[modKey];
      btn.style.backgroundColor = mods[modKey] ? '#4caf50' : '#ccc';
      btn.style.color = mods[modKey] ? 'white' : 'black';
    };
    modsContainer.appendChild(btn);
  });

  // Hide menu initially
  modMenu.style.display = 'none';

  // Start game loop
  requestAnimationFrame(gameLoop);
})();
