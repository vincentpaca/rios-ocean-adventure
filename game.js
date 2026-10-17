(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const titleScreen = document.getElementById("title-screen");
  const btnPlay = document.getElementById("btn-play");
  const hud = document.getElementById("hud");
  const heartsEl = document.getElementById("hearts");
  const inventoryEl = document.getElementById("inventory");
  const toastEl = document.getElementById("toast");
  const touchControls = document.getElementById("touch-controls");
  const hintEl = document.getElementById("hint");
  const btnCatch = document.getElementById("btn-catch");
  const btnCook = document.getElementById("btn-cook");
  const joystick = document.getElementById("joystick");
  const knob = document.getElementById("joystick-knob");

  const WORLD_W = 2400;
  const WORLD_H = 1400;
  const MAX_HEARTS = 3;
  const INV_KEYS = ["fish", "stick", "stone", "shell", "diamond"];

  const state = {
    playing: false,
    time: 0,
    hearts: MAX_HEARTS,
    inv: { fish: 0, stick: 0, stone: 0, shell: 0, diamond: 0 },
    player: {
      x: 400,
      y: 500,
      vx: 0,
      vy: 0,
      facing: 1,
      bob: 0,
      catchFlash: 0,
      invuln: 0,
    },
    cam: { x: 0, y: 0 },
    input: { x: 0, y: 0, catch: false, cook: false },
    keys: Object.create(null),
    joy: { active: false, dx: 0, dy: 0, id: null },
    fish: [],
    pickups: [],
    bubbles: [],
    sparkles: [],
    cookPot: { x: 1100, y: 1180, r: 70, cooking: 0, smoke: 0 },
    coral: [],
    seaweed: [],
    toastTimer: 0,
    catchCd: 0,
    cookCd: 0,
    dpr: 1,
    w: 0,
    h: 0,
  };

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.w = window.innerWidth;
    state.h = window.innerHeight;
    canvas.width = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
    canvas.style.width = state.w + "px";
    canvas.style.height = state.h + "px";
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function dist(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.hypot(dx, dy);
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    state.toastTimer = 1.6;
  }

  function spawnWorld() {
    state.fish = [];
    for (let i = 0; i < 14; i++) {
      state.fish.push({
        x: rand(200, WORLD_W - 200),
        y: rand(180, WORLD_H - 280),
        vx: rand(-40, 40) || 30,
        vy: rand(-12, 12),
        size: rand(18, 32),
        hue: rand(0, 1) < 0.45 ? "orange" : rand(0, 1) < 0.5 ? "yellow" : "pink",
        phase: rand(0, Math.PI * 2),
        caught: false,
      });
    }

    state.pickups = [];
    const kinds = [
      ...Array(8).fill("stick"),
      ...Array(7).fill("stone"),
      ...Array(6).fill("shell"),
      ...Array(3).fill("diamond"),
    ];
    for (const kind of kinds) {
      state.pickups.push({
        kind,
        x: rand(120, WORLD_W - 120),
        y: rand(220, WORLD_H - 160),
        phase: rand(0, Math.PI * 2),
        taken: false,
      });
    }

    state.coral = [];
    for (let i = 0; i < 18; i++) {
      state.coral.push({
        x: rand(80, WORLD_W - 80),
        y: WORLD_H - rand(40, 120),
        h: rand(40, 110),
        w: rand(18, 36),
        color: ["#ff6b6b", "#ff9f43", "#f368e0", "#54a0ff"][i % 4],
      });
    }

    state.seaweed = [];
    for (let i = 0; i < 28; i++) {
      state.seaweed.push({
        x: rand(40, WORLD_W - 40),
        y: WORLD_H - 20,
        h: rand(60, 160),
        phase: rand(0, Math.PI * 2),
      });
    }

    state.bubbles = [];
    for (let i = 0; i < 40; i++) {
      state.bubbles.push({
        x: rand(0, WORLD_W),
        y: rand(0, WORLD_H),
        r: rand(2, 7),
        speed: rand(12, 36),
        wobble: rand(0, Math.PI * 2),
      });
    }

    state.sparkles = [];
    state.player.x = 380;
    state.player.y = 480;
    state.player.vx = 0;
    state.player.vy = 0;
    state.hearts = MAX_HEARTS;
    state.inv = { fish: 0, stick: 0, stone: 0, shell: 0, diamond: 0 };
  }

  function updateHearts() {
    heartsEl.innerHTML = "";
    for (let i = 0; i < MAX_HEARTS; i++) {
      const h = document.createElement("div");
      h.className = "heart" + (i < state.hearts ? "" : " empty");
      heartsEl.appendChild(h);
    }
  }

  function drawInvIcon(c, kind) {
    const g = c.getContext("2d");
    g.clearRect(0, 0, 28, 28);
    g.save();
    g.translate(14, 14);
    if (kind === "fish") {
      g.fillStyle = "#ff8a3d";
      g.beginPath();
      g.ellipse(2, 0, 10, 6, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#e86a1a";
      g.beginPath();
      g.moveTo(-10, 0);
      g.lineTo(-16, -5);
      g.lineTo(-16, 5);
      g.closePath();
      g.fill();
      g.fillStyle = "#12344a";
      g.beginPath();
      g.arc(7, -1, 1.5, 0, Math.PI * 2);
      g.fill();
    } else if (kind === "stick") {
      g.strokeStyle = "#8b5a2b";
      g.lineWidth = 3.5;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(-8, 8);
      g.lineTo(8, -8);
      g.stroke();
      g.strokeStyle = "#c48a4a";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(-2, 4);
      g.lineTo(0, 2);
      g.stroke();
    } else if (kind === "stone") {
      g.fillStyle = "#8a9aaa";
      g.beginPath();
      g.moveTo(-8, 2);
      g.quadraticCurveTo(-6, -8, 2, -7);
      g.quadraticCurveTo(10, -4, 9, 4);
      g.quadraticCurveTo(2, 10, -8, 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.25)";
      g.beginPath();
      g.ellipse(-2, -2, 3, 2, -0.4, 0, Math.PI * 2);
      g.fill();
    } else if (kind === "shell") {
      g.fillStyle = "#f7b2c8";
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        g.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
        const a2 = a + Math.PI / 5;
        g.lineTo(Math.cos(a2) * 5, Math.sin(a2) * 5);
      }
      g.closePath();
      g.fill();
      g.fillStyle = "#ffe8f0";
      g.beginPath();
      g.arc(0, 0, 3, 0, Math.PI * 2);
      g.fill();
    } else if (kind === "diamond") {
      g.fillStyle = "#7ee0ff";
      g.beginPath();
      g.moveTo(0, -10);
      g.lineTo(8, -2);
      g.lineTo(0, 10);
      g.lineTo(-8, -2);
      g.closePath();
      g.fill();
      g.fillStyle = "#c9f4ff";
      g.beginPath();
      g.moveTo(0, -10);
      g.lineTo(8, -2);
      g.lineTo(0, -2);
      g.closePath();
      g.fill();
    }
    g.restore();
  }

  function updateInventoryUI() {
    inventoryEl.innerHTML = "";
    for (const key of INV_KEYS) {
      const slot = document.createElement("div");
      slot.className = "inv-slot";
      slot.title = key;
      const c = document.createElement("canvas");
      c.width = 28;
      c.height = 28;
      drawInvIcon(c, key);
      slot.appendChild(c);
      const count = document.createElement("span");
      count.className = "inv-count";
      count.textContent = String(state.inv[key]);
      slot.appendChild(count);
      inventoryEl.appendChild(slot);
    }
  }

  function softRespawn() {
    state.player.x = 380;
    state.player.y = 480;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.invuln = 2;
    state.hearts = MAX_HEARTS;
    updateHearts();
    showToast("Splash! Try again");
  }

  function startGame() {
    spawnWorld();
    updateHearts();
    updateInventoryUI();
    titleScreen.classList.add("hidden");
    hud.classList.remove("hidden");
    touchControls.classList.remove("hidden");
    hintEl.classList.remove("hidden");
    state.playing = true;
    showToast("Swim freely!");
    setTimeout(() => {
      if (state.toastTimer <= 0) hintEl.classList.add("hidden");
    }, 5000);
  }

  /* —— Input —— */
  window.addEventListener("keydown", (e) => {
    state.keys[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === "Space") state.input.catch = true;
    if (e.code === "KeyE") state.input.cook = true;
  });

  window.addEventListener("keyup", (e) => {
    state.keys[e.code] = false;
  });

  function readKeyboardAxis() {
    let x = 0;
    let y = 0;
    if (state.keys.ArrowLeft || state.keys.KeyA) x -= 1;
    if (state.keys.ArrowRight || state.keys.KeyD) x += 1;
    if (state.keys.ArrowUp || state.keys.KeyW) y -= 1;
    if (state.keys.ArrowDown || state.keys.KeyS) y += 1;
    return { x, y };
  }

  function joyPoint(e) {
    const rect = joystick.querySelector(".joystick-base").getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const max = rect.width * 0.35;
    const len = Math.hypot(dx, dy) || 1;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    state.joy.dx = dx / max;
    state.joy.dy = dy / max;
  }

  function joyEnd() {
    state.joy.active = false;
    state.joy.dx = 0;
    state.joy.dy = 0;
    state.joy.id = null;
    knob.style.transform = "translate(-50%, -50%)";
  }

  joystick.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    joystick.setPointerCapture(e.pointerId);
    state.joy.active = true;
    state.joy.id = e.pointerId;
    joyPoint(e);
  });
  joystick.addEventListener("pointermove", (e) => {
    if (!state.joy.active || state.joy.id !== e.pointerId) return;
    joyPoint(e);
  });
  joystick.addEventListener("pointerup", joyEnd);
  joystick.addEventListener("pointercancel", joyEnd);

  btnCatch.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    state.input.catch = true;
    btnCatch.classList.add("pressed");
  });
  btnCatch.addEventListener("pointerup", () => btnCatch.classList.remove("pressed"));
  btnCatch.addEventListener("pointercancel", () => btnCatch.classList.remove("pressed"));

  btnCook.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    state.input.cook = true;
    btnCook.classList.add("pressed");
  });
  btnCook.addEventListener("pointerup", () => btnCook.classList.remove("pressed"));
  btnCook.addEventListener("pointercancel", () => btnCook.classList.remove("pressed"));

  btnPlay.addEventListener("click", startGame);

  /* —— Update —— */
  function tryCatch() {
    const p = state.player;
    let best = null;
    let bestD = 120;
    for (const f of state.fish) {
      if (f.caught) continue;
      const d = dist(p.x, p.y, f.x, f.y);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    if (best) {
      best.caught = true;
      state.inv.fish += 1;
      p.catchFlash = 0.35;
      updateInventoryUI();
      showToast("Fish!");
      for (let i = 0; i < 10; i++) {
        state.sparkles.push({
          x: best.x,
          y: best.y,
          vx: rand(-80, 80),
          vy: rand(-100, -20),
          life: rand(0.4, 0.9),
          color: "#ffd166",
        });
      }
      // Respawn fish elsewhere after a beat
      setTimeout(() => {
        best.caught = false;
        best.x = rand(150, WORLD_W - 150);
        best.y = rand(180, WORLD_H - 280);
      }, 4000);
    }
  }

  function tryCook() {
    const p = state.player;
    const pot = state.cookPot;
    if (dist(p.x, p.y, pot.x, pot.y - 40) > 110) {
      showToast("Swim to the pot!");
      return;
    }
    if (state.inv.fish < 1) {
      showToast("Need a fish!");
      return;
    }
    state.inv.fish -= 1;
    updateInventoryUI();
    pot.cooking = 1.2;
    pot.smoke = 1.5;
    // Always feel rewarded: fill a heart if needed, plus a fun bonus item
    if (state.hearts < MAX_HEARTS) {
      state.hearts = Math.min(MAX_HEARTS, state.hearts + 1);
      updateHearts();
    }
    const bonus = ["shell", "stone", "stick", "diamond"][Math.floor(rand(0, 4))];
    state.inv[bonus] += 1;
    updateInventoryUI();
    showToast("Yum!");
    for (let i = 0; i < 18; i++) {
      state.sparkles.push({
        x: pot.x + rand(-20, 20),
        y: pot.y - 50,
        vx: rand(-60, 60),
        vy: rand(-140, -40),
        life: rand(0.5, 1.1),
        color: i % 2 ? "#ff6b35" : "#ffd166",
      });
    }
  }

  function update(dt) {
    state.time += dt;
    if (state.toastTimer > 0) {
      state.toastTimer -= dt;
      if (state.toastTimer <= 0) toastEl.hidden = true;
    }

    if (!state.playing) return;

    const kb = readKeyboardAxis();
    let ix = state.joy.active ? state.joy.dx : kb.x;
    let iy = state.joy.active ? state.joy.dy : kb.y;
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }

    const p = state.player;
    const accel = 520;
    const maxSpeed = 220;
    const drag = 0.90;

    p.vx += ix * accel * dt;
    p.vy += iy * accel * dt;
    p.vx *= Math.pow(drag, dt * 60);
    p.vy *= Math.pow(drag, dt * 60);

    const spd = Math.hypot(p.vx, p.vy);
    if (spd > maxSpeed) {
      p.vx = (p.vx / spd) * maxSpeed;
      p.vy = (p.vy / spd) * maxSpeed;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = Math.max(40, Math.min(WORLD_W - 40, p.x));
    p.y = Math.max(80, Math.min(WORLD_H - 60, p.y));
    if (Math.abs(p.vx) > 8) p.facing = p.vx > 0 ? 1 : -1;
    p.bob += dt * 4;
    if (p.catchFlash > 0) p.catchFlash -= dt;
    if (p.invuln > 0) p.invuln -= dt;

    // Swim trail bubbles when moving
    if (spd > 40 && Math.random() < dt * 8) {
      state.bubbles.push({
        x: p.x - p.facing * 18,
        y: p.y + rand(-6, 10),
        r: rand(2, 5),
        speed: rand(20, 45),
        wobble: rand(0, Math.PI * 2),
        life: 1.5,
      });
    }

    // Camera
    const marginX = state.w * 0.35;
    const marginY = state.h * 0.35;
    const targetCamX = Math.max(0, Math.min(WORLD_W - state.w, p.x - state.w / 2));
    const targetCamY = Math.max(0, Math.min(WORLD_H - state.h, p.y - state.h / 2));
    state.cam.x += (targetCamX - state.cam.x) * Math.min(1, 6 * dt);
    state.cam.y += (targetCamY - state.cam.y) * Math.min(1, 6 * dt);
    // Keep player roughly in view
    if (p.x - state.cam.x < marginX * 0.4) state.cam.x = p.x - marginX * 0.4;
    if (p.x - state.cam.x > state.w - marginX * 0.4) state.cam.x = p.x - (state.w - marginX * 0.4);
    state.cam.x = Math.max(0, Math.min(Math.max(0, WORLD_W - state.w), state.cam.x));
    state.cam.y = Math.max(0, Math.min(Math.max(0, WORLD_H - state.h), state.cam.y));

    // Fish
    for (const f of state.fish) {
      if (f.caught) continue;
      f.phase += dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt + Math.sin(f.phase * 2) * 8 * dt;
      if (f.x < 80 || f.x > WORLD_W - 80) f.vx *= -1;
      if (f.y < 120 || f.y > WORLD_H - 200) f.vy *= -1;
      if (Math.random() < dt * 0.4) {
        f.vx += rand(-20, 20);
        f.vy += rand(-10, 10);
        const s = Math.hypot(f.vx, f.vy) || 1;
        const cap = 55;
        if (s > cap) {
          f.vx = (f.vx / s) * cap;
          f.vy = (f.vy / s) * cap;
        }
      }
    }

    // Pickups — magnet pull when near, generous grab radius for little hands
    for (const item of state.pickups) {
      if (item.taken) continue;
      item.phase += dt * 2;
      const d = dist(p.x, p.y, item.x, item.y);
      if (d < 110 && d > 1) {
        const pull = Math.min(1, (110 - d) / 110) * 140 * dt;
        item.x += ((p.x - item.x) / d) * pull;
        item.y += ((p.y - item.y) / d) * pull;
      }
      if (d < 78) {
        item.taken = true;
        state.inv[item.kind] += 1;
        updateInventoryUI();
        const labels = { stick: "Stick!", stone: "Stone!", shell: "Shell!", diamond: "Diamond!" };
        showToast(labels[item.kind] || "Got it!");
        for (let i = 0; i < 6; i++) {
          state.sparkles.push({
            x: item.x,
            y: item.y,
            vx: rand(-70, 70),
            vy: rand(-90, -10),
            life: rand(0.3, 0.7),
            color: item.kind === "diamond" ? "#7ee0ff" : "#fff8d0",
          });
        }
        setTimeout(() => {
          item.taken = false;
          item.x = rand(120, WORLD_W - 120);
          item.y = rand(220, WORLD_H - 160);
        }, 6000 + Math.random() * 4000);
      }
    }

    // Bubbles
    for (const b of state.bubbles) {
      b.y -= b.speed * dt;
      b.wobble += dt * 2;
      b.x += Math.sin(b.wobble) * 10 * dt;
      if (b.life != null) {
        b.life -= dt;
        if (b.life <= 0) b.y = -10;
      }
      if (b.y < -20) {
        b.y = WORLD_H + rand(0, 200);
        b.x = rand(0, WORLD_W);
        delete b.life;
      }
    }

    // Sparkles
    for (let i = state.sparkles.length - 1; i >= 0; i--) {
      const s = state.sparkles[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 80 * dt;
      if (s.life <= 0) state.sparkles.splice(i, 1);
    }

    const pot = state.cookPot;
    if (pot.cooking > 0) pot.cooking -= dt;
    if (pot.smoke > 0) pot.smoke -= dt;

    if (state.catchCd > 0) state.catchCd -= dt;
    if (state.cookCd > 0) state.cookCd -= dt;

    if ((state.input.catch || state.keys.Space) && state.catchCd <= 0) {
      tryCatch();
      state.catchCd = 0.35;
      state.input.catch = false;
    } else if (state.input.catch) {
      state.input.catch = false;
    }

    if ((state.input.cook || state.keys.KeyE) && state.cookCd <= 0) {
      tryCook();
      state.cookCd = 0.5;
      state.input.cook = false;
    } else if (state.input.cook) {
      state.input.cook = false;
    }

    // Soft coral bump only — no heart loss (gentle for young players)
    if (p.invuln <= 0) {
      for (const c of state.coral) {
        if (dist(p.x, p.y, c.x, c.y - c.h * 0.4) < c.w * 0.85) {
          p.vx *= -0.4;
          p.vy *= -0.4;
          p.invuln = 0.4;
          break;
        }
      }
    }
  }

  /* —— Draw —— */
  function drawBackground() {
    const cam = state.cam;
    const g = ctx.createLinearGradient(0, -cam.y * 0.15, 0, state.h);
    g.addColorStop(0, "#7ad4ef");
    g.addColorStop(0.25, "#2eb3d1");
    g.addColorStop(0.55, "#1a8fb0");
    g.addColorStop(0.85, "#0d6f8c");
    g.addColorStop(1, "#0a5570");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.w, state.h);

    // Light rays (parallax far)
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 7; i++) {
      const x = ((i * 380 - cam.x * 0.2) % (state.w + 200)) - 100;
      ctx.fillStyle = "#fff8d0";
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 40, 0);
      ctx.lineTo(x + 120, state.h);
      ctx.lineTo(x - 40, state.h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Far hills / reef silhouettes
    ctx.save();
    ctx.translate(-cam.x * 0.25, -cam.y * 0.15);
    ctx.fillStyle = "rgba(10, 70, 95, 0.35)";
    ctx.beginPath();
    ctx.moveTo(0, WORLD_H * 0.55);
    for (let x = 0; x <= WORLD_W; x += 80) {
      const y = WORLD_H * 0.5 + Math.sin(x * 0.008 + 1) * 60 + Math.sin(x * 0.02) * 25;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(WORLD_W, WORLD_H);
    ctx.lineTo(0, WORLD_H);
    ctx.fill();
    ctx.restore();

    // Mid parallax rocks
    ctx.save();
    ctx.translate(-cam.x * 0.55, -cam.y * 0.55);
    ctx.fillStyle = "rgba(20, 90, 110, 0.45)";
    for (let i = 0; i < 12; i++) {
      const x = (i * 210 + 40) % WORLD_W;
      const y = WORLD_H - 180 - (i % 3) * 40;
      ctx.beginPath();
      ctx.ellipse(x, y, 70 + (i % 4) * 15, 40 + (i % 3) * 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSandFloor() {
    const cam = state.cam;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    const floorG = ctx.createLinearGradient(0, WORLD_H - 160, 0, WORLD_H);
    floorG.addColorStop(0, "rgba(240, 217, 168, 0)");
    floorG.addColorStop(0.3, "#e8c98a");
    floorG.addColorStop(1, "#d4b06a");
    ctx.fillStyle = floorG;
    ctx.fillRect(0, WORLD_H - 160, WORLD_W, 160);

    // Ripple marks
    ctx.strokeStyle = "rgba(180, 140, 70, 0.25)";
    ctx.lineWidth = 2;
    for (let x = 0; x < WORLD_W; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, WORLD_H - 40);
      ctx.quadraticCurveTo(x + 20, WORLD_H - 55, x + 40, WORLD_H - 38);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSeaweed() {
    const cam = state.cam;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    for (const s of state.seaweed) {
      const sway = Math.sin(state.time * 1.5 + s.phase) * 18;
      ctx.strokeStyle = "#2d8a6e";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.quadraticCurveTo(s.x + sway, s.y - s.h * 0.5, s.x + sway * 0.4, s.y - s.h);
      ctx.stroke();
      ctx.strokeStyle = "#3da87e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x - 2, s.y);
      ctx.quadraticCurveTo(s.x + sway * 0.8 - 2, s.y - s.h * 0.5, s.x + sway * 0.3 - 2, s.y - s.h);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCoral() {
    const cam = state.cam;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    for (const c of state.coral) {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.moveTo(c.x - c.w * 0.5, c.y);
      ctx.quadraticCurveTo(c.x - c.w, c.y - c.h * 0.5, c.x - c.w * 0.3, c.y - c.h);
      ctx.quadraticCurveTo(c.x, c.y - c.h * 0.7, c.x + c.w * 0.3, c.y - c.h * 0.85);
      ctx.quadraticCurveTo(c.x + c.w, c.y - c.h * 0.4, c.x + c.w * 0.5, c.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.ellipse(c.x - c.w * 0.15, c.y - c.h * 0.5, 4, 10, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCookPot() {
    const cam = state.cam;
    const pot = state.cookPot;
    ctx.save();
    ctx.translate(-cam.x + pot.x, -cam.y + pot.y);

    // Stones under pot
    ctx.fillStyle = "#7a6a55";
    ctx.beginPath();
    ctx.ellipse(-28, 8, 16, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(28, 8, 16, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(0, 14, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fire
    const flicker = Math.sin(state.time * 12) * 3;
    ctx.fillStyle = "#ff6b35";
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.quadraticCurveTo(-8, -28 + flicker, 0, -10);
    ctx.quadraticCurveTo(8, -32 - flicker, 16, 0);
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.quadraticCurveTo(-2, -16 + flicker * 0.5, 0, -6);
    ctx.quadraticCurveTo(4, -18, 8, 0);
    ctx.fill();

    // Pot
    ctx.fillStyle = "#3d5c4a";
    ctx.beginPath();
    ctx.ellipse(0, -8, 36, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2d4a3a";
    ctx.fillRect(-36, -40, 72, 32);
    ctx.beginPath();
    ctx.ellipse(0, -40, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a3028";
    ctx.beginPath();
    ctx.ellipse(0, -40, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Handles
    ctx.strokeStyle = "#5a7a68";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(-36, -24, 10, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(36, -24, 10, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    // Cook steam / smoke
    if (pot.smoke > 0) {
      ctx.globalAlpha = Math.min(1, pot.smoke);
      for (let i = 0; i < 4; i++) {
        const t = state.time * 2 + i;
        ctx.fillStyle = pot.cooking > 0 ? "rgba(255,200,100,0.5)" : "rgba(220,230,240,0.4)";
        ctx.beginPath();
        ctx.arc(-10 + i * 8 + Math.sin(t) * 6, -55 - (1 - pot.smoke) * 40 - i * 8, 8 + i * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Glow ring when near
    const near = dist(state.player.x, state.player.y, pot.x, pot.y - 40) < 110;
    if (near) {
      ctx.globalAlpha = 0.35 + Math.sin(state.time * 5) * 0.15;
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 10, 55, 18, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawFish() {
    const cam = state.cam;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    for (const f of state.fish) {
      if (f.caught) continue;
      const dir = f.vx >= 0 ? 1 : -1;
      ctx.save();
      ctx.translate(f.x, f.y + Math.sin(f.phase * 3) * 4);
      ctx.scale(dir, 1);
      const colors = {
        orange: ["#ff8a3d", "#e86a1a"],
        yellow: ["#ffd166", "#e0a820"],
        pink: ["#ff8fab", "#e06890"],
      };
      const [body, fin] = colors[f.hue];
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 0, f.size, f.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = fin;
      ctx.beginPath();
      ctx.moveTo(-f.size * 0.85, 0);
      ctx.lineTo(-f.size * 1.35, -f.size * 0.4);
      ctx.lineTo(-f.size * 1.35, f.size * 0.4);
      ctx.closePath();
      ctx.fill();
      // fin wiggle
      ctx.beginPath();
      ctx.moveTo(0, -f.size * 0.4);
      ctx.quadraticCurveTo(4, -f.size * 0.9 + Math.sin(f.phase * 8) * 3, f.size * 0.3, -f.size * 0.35);
      ctx.fill();
      ctx.fillStyle = "#12344a";
      ctx.beginPath();
      ctx.arc(f.size * 0.45, -f.size * 0.1, f.size * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPickups() {
    const cam = state.cam;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    for (const item of state.pickups) {
      if (item.taken) continue;
      const bob = Math.sin(item.phase) * 5;
      ctx.save();
      ctx.translate(item.x, item.y + bob);
      if (item.kind === "stick") {
        ctx.strokeStyle = "#8b5a2b";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-12, 10);
        ctx.lineTo(12, -10);
        ctx.stroke();
      } else if (item.kind === "stone") {
        ctx.fillStyle = "#8a9aaa";
        ctx.beginPath();
        ctx.moveTo(-12, 2);
        ctx.quadraticCurveTo(-8, -12, 4, -10);
        ctx.quadraticCurveTo(14, -4, 12, 6);
        ctx.quadraticCurveTo(0, 14, -12, 2);
        ctx.fill();
      } else if (item.kind === "shell") {
        ctx.fillStyle = "#f7b2c8";
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.quadraticCurveTo(-16, 0, -10, -8);
        ctx.quadraticCurveTo(0, -14, 10, -8);
        ctx.quadraticCurveTo(16, 0, 0, 8);
        ctx.fill();
        ctx.strokeStyle = "#e890b0";
        ctx.lineWidth = 1.5;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(0, 6);
          ctx.quadraticCurveTo(i * 8, -2, i * 6, -8);
          ctx.stroke();
        }
      } else if (item.kind === "diamond") {
        const pulse = 1 + Math.sin(item.phase * 2) * 0.08;
        ctx.scale(pulse, pulse);
        ctx.fillStyle = "#7ee0ff";
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(10, -2);
        ctx.lineTo(0, 14);
        ctx.lineTo(-10, -2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#c9f4ff";
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(10, -2);
        ctx.lineTo(0, -2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const cam = state.cam;
    const p = state.player;
    const bob = Math.sin(p.bob) * 4;
    ctx.save();
    ctx.translate(-cam.x + p.x, -cam.y + p.y + bob);
    ctx.scale(p.facing, 1);
    if (p.invuln > 0 && Math.floor(state.time * 10) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Catch flash ring
    if (p.catchFlash > 0) {
      ctx.strokeStyle = `rgba(255, 209, 102, ${p.catchFlash * 2})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 40 + (0.35 - p.catchFlash) * 40, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Legs / fins
    ctx.fillStyle = "#1a6b8c";
    ctx.beginPath();
    ctx.ellipse(-6, 28, 7, 14, -0.2, 0, Math.PI * 2);
    ctx.ellipse(8, 28, 7, 14, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8a3d";
    ctx.beginPath();
    ctx.moveTo(-6, 40);
    ctx.lineTo(-14, 50);
    ctx.lineTo(2, 48);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, 40);
    ctx.lineTo(2, 50);
    ctx.lineTo(18, 48);
    ctx.closePath();
    ctx.fill();

    // Body / suit
    ctx.fillStyle = "#2a9cc4";
    ctx.beginPath();
    ctx.ellipse(0, 8, 18, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e7fa0";
    ctx.beginPath();
    ctx.ellipse(4, 10, 8, 14, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Tank
    ctx.fillStyle = "#c45c2a";
      ctx.beginPath();
      const tx = -22, ty = -4, tw = 12, th = 28, tr = 4;
      ctx.moveTo(tx + tr, ty);
      ctx.arcTo(tx + tw, ty, tx + tw, ty + th, tr);
      ctx.arcTo(tx + tw, ty + th, tx, ty + th, tr);
      ctx.arcTo(tx, ty + th, tx, ty, tr);
      ctx.arcTo(tx, ty, tx + tw, ty, tr);
      ctx.closePath();
      ctx.fill();
    ctx.fillStyle = "#e8f4ff";
    ctx.fillRect(-19, 2, 5, 10);

    // Head / helmet
    ctx.fillStyle = "#d8f0ff";
    ctx.beginPath();
    ctx.arc(2, -18, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a8aa0";
    ctx.lineWidth = 3;
    ctx.stroke();
    // Face
    ctx.fillStyle = "#f5c9a0";
    ctx.beginPath();
    ctx.arc(4, -18, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#12344a";
    ctx.beginPath();
    ctx.arc(7, -20, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#12344a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(6, -15, 3, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Arm
    ctx.fillStyle = "#2a9cc4";
    ctx.beginPath();
    ctx.ellipse(16, 6, 6, 12, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f5c9a0";
    ctx.beginPath();
    ctx.arc(22, 14, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawBubbles() {
    const cam = state.cam;
    ctx.save();
    ctx.translate(-cam.x * 0.85, -cam.y * 0.85);
    for (const b of state.bubbles) {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "rgba(230, 250, 255, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSparkles() {
    const cam = state.cam;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    for (const s of state.sparkles) {
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3 + s.life * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawProximityHints() {
    if (!state.playing) return;
    const p = state.player;
    let nearFish = false;
    for (const f of state.fish) {
      if (!f.caught && dist(p.x, p.y, f.x, f.y) < 120) {
        nearFish = true;
        break;
      }
    }
    // Soft highlight ring on nearest catchable fish
    if (nearFish) {
      let best = null;
      let bestD = 120;
      for (const f of state.fish) {
        if (f.caught) continue;
        const d = dist(p.x, p.y, f.x, f.y);
        if (d < bestD) {
          bestD = d;
          best = f;
        }
      }
      if (best) {
        ctx.save();
        ctx.translate(-state.cam.x + best.x, -state.cam.y + best.y);
        ctx.strokeStyle = `rgba(255, 209, 102, ${0.45 + Math.sin(state.time * 6) * 0.25})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, best.size + 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    btnCatch.disabled = !nearFish && state.inv.fish >= 0;
    // Don't hard-disable catch — kids mash buttons; keep enabled always for discoverability
    btnCatch.disabled = false;
    const nearPot = dist(p.x, p.y, state.cookPot.x, state.cookPot.y - 40) < 110;
    btnCook.style.opacity = nearPot && state.inv.fish > 0 ? "1" : nearPot ? "0.85" : "0.55";
  }

  function render() {
    drawBackground();
    drawSandFloor();
    drawSeaweed();
    drawCoral();
    drawCookPot();
    drawPickups();
    drawFish();
    drawPlayer();
    drawBubbles();
    drawSparkles();
    drawProximityHints();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  // Idle underwater backdrop on title
  spawnWorld();
  state.playing = false;
  window.__RIO = state;
  requestAnimationFrame(frame);

  // Hide hint after first interaction once playing
  ["pointerdown", "keydown"].forEach((ev) => {
    window.addEventListener(
      ev,
      () => {
        if (state.playing) hintEl.classList.add("hidden");
      },
      { once: false }
    );
  });
})();
