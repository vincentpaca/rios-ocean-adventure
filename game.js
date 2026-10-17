import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "three/addons/utils/SkeletonUtils.js";

const canvas = document.getElementById("game");
const loadingEl = document.getElementById("loading");
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

const WORLD = { half: 42, floorY: 0, ceilY: 28 };
const MAX_HEARTS = 3;
const INV_KEYS = ["fish", "stick", "stone", "shell", "diamond"];
const MAX_FISH = 10;

const FISH_FILES = [
  "assets/models/fish/fish1.glb",
  "assets/models/fish/fish2.glb",
  "assets/models/fish/fish3.glb",
  "assets/models/fish/coral-grouper.glb",
];

const state = {
  ready: false,
  playing: false,
  time: 0,
  hearts: MAX_HEARTS,
  inv: { fish: 0, stick: 0, stone: 0, shell: 0, diamond: 0 },
  player: {
    x: 0, y: 10, z: 8,
    vx: 0, vy: 0, vz: 0,
    yaw: 0, bob: 0, catchFlash: 0, invuln: 0,
  },
  input: { catch: false, cook: false },
  keys: Object.create(null),
  joy: { active: false, dx: 0, dy: 0, id: null },
  fish: [],
  pickups: [],
  bubbles: [],
  sparkles: [],
  seaweed: [],
  coral: [],
  decor: [],
  cookPot: { x: 6, y: 0, z: -4, cooking: 0, smoke: 0 },
  toastTimer: 0,
  catchCd: 0,
  cookCd: 0,
  cam: { yaw: 0.35, pitch: 0.18, dist: 11 },
};

const assets = {
  fish: [],
  pot: null,
  potLid: null,
  firePit: null,
  coral: null,
  rocks: [],
  wood: null,
  stoneRes: null,
};

/* —— Three.js —— */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x5ad4ef, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x62d8f2);
scene.fog = new THREE.FogExp2(0x4ecae6, 0.022);

const camera = new THREE.PerspectiveCamera(55, 1, 0.2, 200);
camera.position.set(0, 14, 22);

scene.add(new THREE.HemisphereLight(0xe8fbff, 0xf0d9a8, 1.05));
const sun = new THREE.DirectionalLight(0xfff6e0, 0.95);
sun.position.set(18, 40, 12);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9ae8ff, 0.4);
fill.position.set(-20, 8, -10);
scene.add(fill);

const root = new THREE.Group();
scene.add(root);

const mats = {
  sand: new THREE.MeshLambertMaterial({ color: 0xf3d9a0, flatShading: true }),
  sandDark: new THREE.MeshLambertMaterial({ color: 0xe4c078, flatShading: true }),
  rock: new THREE.MeshLambertMaterial({ color: 0x8aa0b4, flatShading: true }),
  rockDeep: new THREE.MeshLambertMaterial({ color: 0x6a8498, flatShading: true }),
  kelp: new THREE.MeshLambertMaterial({ color: 0x3cb88a, flatShading: true }),
  kelpLite: new THREE.MeshLambertMaterial({ color: 0x55d49a, flatShading: true }),
  suit: new THREE.MeshLambertMaterial({ color: 0x2a9cc4, flatShading: true }),
  suitDark: new THREE.MeshLambertMaterial({ color: 0x1e7fa0, flatShading: true }),
  tank: new THREE.MeshLambertMaterial({ color: 0xc45c2a, flatShading: true }),
  helm: new THREE.MeshLambertMaterial({ color: 0xd8f0ff, flatShading: true, transparent: true, opacity: 0.88 }),
  skin: new THREE.MeshLambertMaterial({ color: 0xf5c9a0, flatShading: true }),
  fin: new THREE.MeshLambertMaterial({ color: 0xff8a3d, flatShading: true }),
  shell: new THREE.MeshLambertMaterial({ color: 0xf7b2c8, flatShading: true }),
  diamond: new THREE.MeshLambertMaterial({ color: 0x7ee0ff, flatShading: true, emissive: 0x2a88aa, emissiveIntensity: 0.35 }),
  bubble: new THREE.MeshBasicMaterial({ color: 0xd8f4ff, transparent: true, opacity: 0.35 }),
  spark: new THREE.MeshBasicMaterial({ color: 0xffd166 }),
  ring: new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.55 }),
  fire: new THREE.MeshBasicMaterial({ color: 0xff6b35 }),
  fireHot: new THREE.MeshBasicMaterial({ color: 0xffd166 }),
};

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function dist3(ax, ay, az, bx, by, bz) {
  return Math.hypot(ax - bx, ay - by, az - bz);
}

function prepGltfRoot(rootObj) {
  rootObj.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = false;
      c.receiveShadow = false;
      if (c.material) {
        const matsArr = Array.isArray(c.material) ? c.material : [c.material];
        for (const m of matsArr) {
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
          m.side = THREE.FrontSide;
        }
      }
    }
  });
  return rootObj;
}

function fitObject(obj, targetSize) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const s = targetSize / maxDim;
  obj.scale.setScalar(s);
  box.setFromObject(obj);
  const center = new THREE.Vector3();
  box.getCenter(center);
  obj.position.sub(center);
  return obj;
}

async function loadAssets() {
  const loader = new GLTFLoader();
  const loadMsg = loadingEl.querySelector(".load-msg");

  loadMsg.textContent = "Loading fish…";
  for (const path of FISH_FILES) {
    const gltf = await loader.loadAsync(path);
    prepGltfRoot(gltf.scene);
    assets.fish.push(gltf);
  }

  loadMsg.textContent = "Loading kitchen…";
  const potG = await loader.loadAsync("assets/models/food/pot-stew.glb");
  prepGltfRoot(potG.scene);
  assets.pot = potG.scene;

  const lidG = await loader.loadAsync("assets/models/food/pot-lid.glb");
  prepGltfRoot(lidG.scene);
  assets.potLid = lidG.scene;

  const fireG = await loader.loadAsync("assets/models/survival/campfire-pit.glb");
  prepGltfRoot(fireG.scene);
  assets.firePit = fireG.scene;

  loadMsg.textContent = "Loading reef…";
  const coralG = await loader.loadAsync("assets/models/coral/coral-reef-set.glb");
  prepGltfRoot(coralG.scene);
  assets.coral = coralG.scene;

  loadMsg.textContent = "Loading rocks…";
  const rockPaths = [
    "assets/models/survival/rock-a.glb",
    "assets/models/survival/rock-b.glb",
    "assets/models/survival/rock-c.glb",
    "assets/models/survival/rock-flat.glb",
    "assets/models/nature/rock_smallF.glb",
    "assets/models/nature/rock_smallD.glb",
    "assets/models/nature/stone_largeA.glb",
    "assets/models/nature/stone_smallFlatC.glb",
  ];
  for (const path of rockPaths) {
    const g = await loader.loadAsync(path);
    prepGltfRoot(g.scene);
    assets.rocks.push(g.scene);
  }

  const woodG = await loader.loadAsync("assets/models/survival/resource-wood.glb");
  prepGltfRoot(woodG.scene);
  assets.wood = woodG.scene;

  const stoneG = await loader.loadAsync("assets/models/survival/resource-stone.glb");
  prepGltfRoot(stoneG.scene);
  assets.stoneRes = stoneG.scene;
}

function makeFloor() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2.4, WORLD.half * 2.4, 8, 8),
    mats.sand
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = WORLD.floorY;
  const pos = floor.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 0.12) * 0.35 + Math.cos(y * 0.1) * 0.25);
  }
  pos.needsUpdate = true;
  floor.geometry.computeVertexNormals();
  root.add(floor);

  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(
      new THREE.DodecahedronGeometry(rand(1.2, 2.4), 0),
      i % 2 ? mats.sandDark : mats.sand
    );
    m.position.set(rand(-WORLD.half + 4, WORLD.half - 4), 0.2, rand(-WORLD.half + 4, WORLD.half - 4));
    m.scale.set(1, rand(0.25, 0.45), 1);
    root.add(m);
  }

  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const r = WORLD.half * 0.92;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(rand(2.5, 5), 0),
      i % 2 ? mats.rock : mats.rockDeep
    );
    rock.position.set(Math.cos(ang) * r, rand(0.5, 2.5), Math.sin(ang) * r);
    rock.scale.set(1, rand(0.8, 1.6), 1);
    root.add(rock);
  }
}

function makePlayerMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.1, 8), mats.suit);
  body.position.y = 0.15;
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), mats.suitDark);
  belly.position.set(0.12, 0.1, 0.18);
  g.add(belly);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.85, 6), mats.tank);
  tank.position.set(0, 0.2, -0.42);
  g.add(tank);
  const helm = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), mats.helm);
  helm.position.set(0, 0.95, 0.05);
  g.add(helm);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 5), mats.skin);
  face.position.set(0, 0.95, 0.18);
  g.add(face);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), new THREE.MeshBasicMaterial({ color: 0x12344a }));
  eye.position.set(0.1, 1.0, 0.38);
  g.add(eye);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 5), mats.suit);
  arm.position.set(0.55, 0.25, 0.15);
  arm.rotation.z = -0.6;
  g.add(arm);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), mats.skin);
  hand.position.set(0.78, 0.05, 0.28);
  g.add(hand);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.55, 5), mats.suitDark);
  legL.position.set(-0.18, -0.7, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.18;
  g.add(legR);
  const finL = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 5), mats.fin);
  finL.position.set(-0.18, -1.15, 0.05);
  finL.rotation.x = Math.PI / 2.2;
  g.add(finL);
  const finR = finL.clone();
  finR.position.x = 0.18;
  g.add(finR);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.04, 6, 16), mats.ring);
  ring.visible = false;
  ring.name = "catchRing";
  g.add(ring);
  g.scale.setScalar(1.15);
  root.add(g);
  return g;
}

function makeCookPot() {
  const g = new THREE.Group();

  if (assets.firePit) {
    const pit = assets.firePit.clone(true);
    fitObject(pit, 2.2);
    pit.position.y = 0;
    g.add(pit);
  }

  if (assets.pot) {
    const pot = assets.pot.clone(true);
    fitObject(pot, 1.6);
    pot.position.y = 0.55;
    g.add(pot);
  }

  if (assets.potLid) {
    const lid = assets.potLid.clone(true);
    fitObject(lid, 1.1);
    lid.position.y = 1.35;
    lid.name = "lid";
    g.add(lid);
  }

  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 5), mats.fire);
  fire.position.set(0, 0.35, 0.55);
  fire.name = "fire";
  g.add(fire);
  const fireHot = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 4), mats.fireHot);
  fireHot.position.set(0, 0.4, 0.55);
  fireHot.name = "fireHot";
  g.add(fireHot);

  const glow = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.05, 4, 20), mats.ring);
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.08;
  glow.visible = false;
  glow.name = "nearGlow";
  g.add(glow);

  g.position.set(state.cookPot.x, state.cookPot.y, state.cookPot.z);
  root.add(g);
  return g;
}

function cloneFishTemplate(templateIndex) {
  const gltf = assets.fish[templateIndex % assets.fish.length];
  const mesh = skeletonClone(gltf.scene);
  prepGltfRoot(mesh);
  // Skinned fish: avoid Box3 fit (bind-pose bounds lie). Quaternius fish ~8u long → ~1.4u.
  const s = rand(0.18, 0.28);
  mesh.scale.setScalar(s);
  mesh.frustumCulled = false;
  mesh.traverse((c) => {
    if (c.isMesh || c.isSkinnedMesh) c.frustumCulled = false;
  });
  const mixer = new THREE.AnimationMixer(mesh);
  let action = null;
  if (gltf.animations && gltf.animations.length) {
    const clip =
      gltf.animations.find((a) => /swim/i.test(a.name)) ||
      gltf.animations[0];
    action = mixer.clipAction(clip);
    action.play();
    action.timeScale = rand(0.85, 1.2);
  }
  root.add(mesh);
  return { mesh, mixer, action };
}

function makePickupMesh(kind) {
  let mesh;
  if (kind === "stick" && assets.wood) {
    mesh = assets.wood.clone(true);
    fitObject(mesh, 0.9);
  } else if (kind === "stone" && assets.stoneRes) {
    mesh = assets.stoneRes.clone(true);
    fitObject(mesh, 0.7);
  } else if (kind === "shell") {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 5, 4), mats.shell);
    mesh.scale.set(1, 0.55, 1.1);
  } else if (kind === "diamond") {
    mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), mats.diamond);
  } else {
    mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), mats.rock);
  }
  root.add(mesh);
  return mesh;
}

function makeSeaweed(x, z, h) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.14, h, 4),
    Math.random() > 0.5 ? mats.kelp : mats.kelpLite
  );
  mesh.position.set(x, h * 0.5, z);
  root.add(mesh);
  return { mesh, h, phase: rand(0, Math.PI * 2), x, z };
}

const bubblePool = [];
const sparkPool = [];

function allocBubble() {
  let m = bubblePool.pop();
  if (!m) {
    m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), mats.bubble);
    root.add(m);
  }
  m.visible = true;
  return m;
}

function freeBubble(m) {
  m.visible = false;
  bubblePool.push(m);
}

function allocSpark(color) {
  let m = sparkPool.pop();
  if (!m) {
    m = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), mats.spark.clone());
    root.add(m);
  }
  m.material.color.set(color || 0xffd166);
  m.visible = true;
  return m;
}

function freeSpark(m) {
  m.visible = false;
  sparkPool.push(m);
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  state.toastTimer = 1.6;
}

function clearWorldMeshes() {
  for (const f of state.fish) {
    if (f.mixer) f.mixer.stopAllAction();
    if (f.mesh) root.remove(f.mesh);
  }
  for (const p of state.pickups) {
    if (p.mesh) root.remove(p.mesh);
  }
  for (const s of state.seaweed) {
    if (s.mesh) root.remove(s.mesh);
  }
  for (const c of state.coral) {
    if (c.mesh) root.remove(c.mesh);
  }
  for (const d of state.decor) {
    if (d.mesh) root.remove(d.mesh);
  }
  for (const b of state.bubbles) {
    if (b.mesh) freeBubble(b.mesh);
  }
  for (const s of state.sparkles) {
    if (s.mesh) freeSpark(s.mesh);
  }
  state.fish = [];
  state.pickups = [];
  state.seaweed = [];
  state.coral = [];
  state.decor = [];
  state.bubbles = [];
  state.sparkles = [];
}

function scatterCoralAndRocks() {
  // MiniPoly CC0 coral — native bbox is flat in Y; tip upright then scale
  for (let i = 0; i < 10; i++) {
    const mesh = assets.coral.clone(true);
    // Model grows along +X in the GLB — rotate so it stands as a reef cluster
    mesh.rotation.z = -Math.PI / 2;
    mesh.rotation.y = rand(0, Math.PI * 2);
    const s = rand(0.55, 1.05);
    mesh.scale.setScalar(s);
    const x = rand(-WORLD.half + 6, WORLD.half - 6);
    const z = rand(-WORLD.half + 6, WORLD.half - 6);
    if (Math.hypot(x - state.cookPot.x, z - state.cookPot.z) < 6) continue;
    mesh.position.set(x, 0, z);
    mesh.traverse((c) => {
      if (c.isMesh && c.material && c.material.color) {
        c.material = c.material.clone();
        c.material.color.offsetHSL(rand(-0.06, 0.1), rand(0, 0.12), rand(-0.04, 0.06));
      }
    });
    root.add(mesh);
    state.coral.push({ x, z, h: 4 * s, w: 2.2 * s, mesh });
  }
  // Guaranteed coral near start for first viewport
  for (let i = 0; i < 3; i++) {
    const mesh = assets.coral.clone(true);
    mesh.rotation.z = -Math.PI / 2;
    mesh.rotation.y = i * 1.1;
    mesh.scale.setScalar(0.85);
    const x = -6 + i * 5;
    const z = 14;
    mesh.position.set(x, 0, z);
    root.add(mesh);
    state.coral.push({ x, z, h: 3.5, w: 2, mesh });
  }

  // Kenney rocks / stones scatter
  for (let i = 0; i < 22; i++) {
    const src = assets.rocks[i % assets.rocks.length];
    const mesh = src.clone(true);
    fitObject(mesh, rand(1.0, 2.8));
    const x = rand(-WORLD.half + 4, WORLD.half - 4);
    const z = rand(-WORLD.half + 4, WORLD.half - 4);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = rand(0, Math.PI * 2);
    root.add(mesh);
    state.decor.push({ mesh });
  }
}

function spawnWorld() {
  clearWorldMeshes();

  for (let i = 0; i < MAX_FISH; i++) {
    const { mesh, mixer, action } = cloneFishTemplate(i);
    // First few fish spawn in front of the diver so the school is obvious
    const near = i < 5;
    const f = {
      x: near ? rand(-4, 4) : rand(-WORLD.half + 6, WORLD.half - 6),
      y: near ? rand(7, 12) : rand(3, 16),
      z: near ? rand(8, 16) : rand(-WORLD.half + 6, WORLD.half - 6),
      vx: rand(-2.2, 2.2) || 1.2,
      vy: rand(-0.5, 0.5),
      vz: rand(-2.2, 2.2),
      size: 1.2,
      phase: rand(0, Math.PI * 2),
      caught: false,
      mesh,
      mixer,
      action,
      template: i % assets.fish.length,
    };
    mesh.position.set(f.x, f.y, f.z);
    state.fish.push(f);
  }

  const kinds = [
    ...Array(8).fill("stick"),
    ...Array(7).fill("stone"),
    ...Array(6).fill("shell"),
    ...Array(3).fill("diamond"),
  ];
  for (const kind of kinds) {
    const mesh = makePickupMesh(kind);
    const item = {
      kind,
      x: rand(-WORLD.half + 5, WORLD.half - 5),
      y: rand(1.2, 12),
      z: rand(-WORLD.half + 5, WORLD.half - 5),
      phase: rand(0, Math.PI * 2),
      taken: false,
      mesh,
    };
    mesh.position.set(item.x, item.y, item.z);
    state.pickups.push(item);
  }

  scatterCoralAndRocks();

  for (let i = 0; i < 20; i++) {
    state.seaweed.push(
      makeSeaweed(rand(-WORLD.half + 2, WORLD.half - 2), rand(-WORLD.half + 2, WORLD.half - 2), rand(2.2, 5.5))
    );
  }

  for (let i = 0; i < 32; i++) {
    const mesh = allocBubble();
    const b = {
      x: rand(-WORLD.half, WORLD.half),
      y: rand(1, WORLD.ceilY),
      z: rand(-WORLD.half, WORLD.half),
      r: rand(0.08, 0.22),
      speed: rand(0.8, 2.2),
      wobble: rand(0, Math.PI * 2),
      mesh,
    };
    mesh.scale.setScalar(b.r / 0.12);
    mesh.position.set(b.x, b.y, b.z);
    state.bubbles.push(b);
  }

  state.player.x = 0;
  state.player.y = 10;
  state.player.z = 8;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.vz = 0;
  state.player.yaw = 0;
  state.hearts = MAX_HEARTS;
  state.inv = { fish: 0, stick: 0, stone: 0, shell: 0, diamond: 0 };
  state.cookPot.cooking = 0;
  state.cookPot.smoke = 0;
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
  } else if (kind === "stick") {
    g.strokeStyle = "#8b5a2b";
    g.lineWidth = 3.5;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(-8, 8);
    g.lineTo(8, -8);
    g.stroke();
  } else if (kind === "stone") {
    g.fillStyle = "#8a9aaa";
    g.beginPath();
    g.moveTo(-8, 2);
    g.quadraticCurveTo(-6, -8, 2, -7);
    g.quadraticCurveTo(10, -4, 9, 4);
    g.quadraticCurveTo(2, 10, -8, 2);
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
  } else if (kind === "diamond") {
    g.fillStyle = "#7ee0ff";
    g.beginPath();
    g.moveTo(0, -10);
    g.lineTo(8, -2);
    g.lineTo(0, 10);
    g.lineTo(-8, -2);
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

function startGame() {
  titleScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  touchControls.classList.remove("hidden");
  hintEl.classList.remove("hidden");
  state.playing = true;
  try {
    spawnWorld();
    updateHearts();
    updateInventoryUI();
    showToast("Swim freely!");
  } catch (err) {
    console.error("startGame", err);
    showToast("Swim freely!");
  }
  setTimeout(() => {
    if (state.toastTimer <= 0) hintEl.classList.add("hidden");
  }, 5000);
}

window.__startRio = startGame;

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

btnPlay.addEventListener("click", (e) => {
  e.preventDefault();
  if (!state.playing && state.ready) startGame();
});
btnPlay.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (!state.playing && state.ready) startGame();
});

function tryCatch() {
  const p = state.player;
  let best = null;
  let bestD = 5.5;
  for (const f of state.fish) {
    if (f.caught) continue;
    const d = dist3(p.x, p.y, p.z, f.x, f.y, f.z);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  if (best) {
    best.caught = true;
    best.mesh.visible = false;
    if (best.mixer) best.mixer.stopAllAction();
    state.inv.fish += 1;
    p.catchFlash = 0.35;
    updateInventoryUI();
    showToast("Fish!");
    for (let i = 0; i < 10; i++) {
      const mesh = allocSpark(0xffd166);
      state.sparkles.push({
        x: best.x, y: best.y, z: best.z,
        vx: rand(-3, 3), vy: rand(1, 5), vz: rand(-3, 3),
        life: rand(0.4, 0.9), mesh,
      });
    }
    setTimeout(() => {
      best.caught = false;
      best.mesh.visible = true;
      best.x = rand(-WORLD.half + 6, WORLD.half - 6);
      best.y = rand(3, 16);
      best.z = rand(-WORLD.half + 6, WORLD.half - 6);
      if (best.action) best.action.reset().play();
    }, 4000);
  }
}

function tryCook() {
  const p = state.player;
  const pot = state.cookPot;
  if (dist3(p.x, p.y, p.z, pot.x, pot.y + 1.2, pot.z) > 3.8) {
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
  if (state.hearts < MAX_HEARTS) {
    state.hearts = Math.min(MAX_HEARTS, state.hearts + 1);
    updateHearts();
  }
  const bonus = ["shell", "stone", "stick", "diamond"][Math.floor(rand(0, 4))];
  state.inv[bonus] += 1;
  updateInventoryUI();
  showToast("Yum!");
  for (let i = 0; i < 16; i++) {
    const mesh = allocSpark(i % 2 ? 0xff6b35 : 0xffd166);
    state.sparkles.push({
      x: pot.x + rand(-0.4, 0.4),
      y: pot.y + 1.4,
      z: pot.z + rand(-0.4, 0.4),
      vx: rand(-2, 2), vy: rand(2, 6), vz: rand(-2, 2),
      life: rand(0.5, 1.1), mesh,
    });
  }
}

function updateCamera(dt) {
  const p = state.player;
  const desiredYaw = p.yaw + Math.PI;
  state.cam.yaw += (desiredYaw - state.cam.yaw) * Math.min(1, 2.8 * dt);
  const dist = state.playing ? 9.5 : 14;
  const pitch = state.playing ? 0.18 : 0.12;
  state.cam.dist += (dist - state.cam.dist) * Math.min(1, 2 * dt);
  state.cam.pitch += (pitch - state.cam.pitch) * Math.min(1, 2 * dt);
  const lookY = state.playing ? p.y + 0.4 : 10;
  const horiz = Math.cos(state.cam.pitch) * state.cam.dist;
  const target = new THREE.Vector3(
    p.x + Math.sin(state.cam.yaw) * horiz,
    lookY + 2.2 + Math.sin(state.cam.pitch) * state.cam.dist * 0.35,
    p.z + Math.cos(state.cam.yaw) * horiz
  );
  camera.position.lerp(target, Math.min(1, 4.5 * dt));
  const ahead = 4.5;
  camera.lookAt(
    p.x + Math.sin(p.yaw) * ahead,
    lookY + 0.2,
    p.z + Math.cos(p.yaw) * ahead
  );
}

function updateFish(dt) {
  for (const f of state.fish) {
    if (f.caught) continue;
    if (f.mixer) f.mixer.update(dt);
    f.phase += dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt + Math.sin(f.phase * 2) * 0.4 * dt;
    f.z += f.vz * dt;
    if (f.x < -WORLD.half + 4 || f.x > WORLD.half - 4) f.vx *= -1;
    if (f.y < 2 || f.y > WORLD.ceilY - 2) f.vy *= -1;
    if (f.z < -WORLD.half + 4 || f.z > WORLD.half - 4) f.vz *= -1;
    if (Math.random() < dt * 0.4) {
      f.vx += rand(-1, 1);
      f.vy += rand(-0.4, 0.4);
      f.vz += rand(-1, 1);
      const s = Math.hypot(f.vx, f.vy, f.vz) || 1;
      const cap = 3.2;
      if (s > cap) {
        f.vx = (f.vx / s) * cap;
        f.vy = (f.vy / s) * cap;
        f.vz = (f.vz / s) * cap;
      }
    }
  }
}

function updateBubbles(dt) {
  for (let i = state.bubbles.length - 1; i >= 0; i--) {
    const b = state.bubbles[i];
    b.y += b.speed * dt;
    b.wobble += dt * 2;
    b.x += Math.sin(b.wobble) * 0.4 * dt;
    if (b.life != null) {
      b.life -= dt;
      if (b.life <= 0) {
        freeBubble(b.mesh);
        state.bubbles.splice(i, 1);
        continue;
      }
    }
    if (b.y > WORLD.ceilY + 2) {
      if (b.life != null) {
        freeBubble(b.mesh);
        state.bubbles.splice(i, 1);
      } else {
        b.y = 0.5;
        b.x = rand(-WORLD.half, WORLD.half);
        b.z = rand(-WORLD.half, WORLD.half);
      }
    }
  }
}

function updateMeshes(dt) {
  const p = state.player;
  const bob = Math.sin(p.bob) * 0.08;
  playerMesh.position.set(p.x, p.y + bob, p.z);
  playerMesh.rotation.y = p.yaw;
  playerMesh.rotation.x = THREE.MathUtils.clamp(-p.vy * 0.06, -0.35, 0.35);
  playerMesh.rotation.z = THREE.MathUtils.clamp(-p.vx * 0.04, -0.25, 0.25);
  playerMesh.visible = !(p.invuln > 0 && Math.floor(state.time * 10) % 2 === 0);

  const ring = playerMesh.getObjectByName("catchRing");
  if (ring) {
    ring.visible = p.catchFlash > 0;
    if (ring.visible) {
      const t = 1 - p.catchFlash / 0.35;
      ring.scale.setScalar(1 + t * 0.8);
      ring.material.opacity = p.catchFlash * 2;
    }
  }

  for (const f of state.fish) {
    if (f.caught) continue;
    f.mesh.position.set(f.x, f.y + Math.sin(f.phase * 3) * 0.12, f.z);
    f.mesh.rotation.y = Math.atan2(f.vx, f.vz);
  }

  for (const item of state.pickups) {
    if (item.taken) continue;
    const bobY = Math.sin(item.phase) * 0.2;
    item.mesh.position.set(item.x, item.y + bobY, item.z);
    item.mesh.rotation.y += dt * (item.kind === "diamond" ? 2.2 : 1.2);
    if (item.kind === "diamond") {
      const pulse = 1 + Math.sin(item.phase * 2) * 0.08;
      item.mesh.scale.setScalar(pulse);
    }
  }

  for (const b of state.bubbles) b.mesh.position.set(b.x, b.y, b.z);
  for (const s of state.sparkles) {
    s.mesh.position.set(s.x, s.y, s.z);
    s.mesh.rotation.y += dt * 4;
    s.mesh.material.opacity = Math.max(0, s.life);
  }

  const fire = potMesh.getObjectByName("fire");
  const fireHot = potMesh.getObjectByName("fireHot");
  if (fire) {
    fire.scale.y = 1 + Math.sin(state.time * 12) * 0.15;
    fire.rotation.y += dt * 3;
  }
  if (fireHot) fireHot.scale.y = 1 + Math.sin(state.time * 14 + 1) * 0.2;
}

function update(dt) {
  state.time += dt;
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) toastEl.hidden = true;
  }

  for (const s of state.seaweed) {
    const sway = Math.sin(state.time * 1.4 + s.phase) * 0.35;
    s.mesh.rotation.z = sway;
    s.mesh.position.x = s.x + Math.sin(state.time * 1.2 + s.phase) * 0.15;
  }

  if (!state.playing) {
    state.player.yaw = state.time * 0.15;
    state.player.x = Math.sin(state.time * 0.2) * 3;
    state.player.z = 6 + Math.cos(state.time * 0.18) * 2;
    state.player.y = 9 + Math.sin(state.time * 0.7) * 0.6;
    state.player.bob += dt * 3;
    updateFish(dt);
    updateBubbles(dt);
    updateMeshes(dt);
    updateCamera(dt);
    return;
  }

  const kb = readKeyboardAxis();
  let ix = state.joy.active ? state.joy.dx : kb.x;
  let iy = state.joy.active ? state.joy.dy : kb.y;
  const len = Math.hypot(ix, iy);
  if (len > 1) {
    ix /= len;
    iy /= len;
  }

  const p = state.player;
  const accel = 18;
  const maxSpeed = 9.5;
  const drag = 0.9;

  const camYaw = state.cam.yaw + Math.PI;
  const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
  const up = new THREE.Vector3(0, 1, 0);
  const wish = new THREE.Vector3();
  wish.addScaledVector(right, ix);
  wish.addScaledVector(forward, -iy * 0.75);
  wish.addScaledVector(up, -iy * 0.85);
  if (wish.lengthSq() > 1) wish.normalize();

  p.vx += wish.x * accel * dt;
  p.vy += wish.y * accel * dt;
  p.vz += wish.z * accel * dt;

  p.vx *= Math.pow(drag, dt * 60);
  p.vy *= Math.pow(drag, dt * 60);
  p.vz *= Math.pow(drag, dt * 60);

  const spd = Math.hypot(p.vx, p.vy, p.vz);
  if (spd > maxSpeed) {
    const s = maxSpeed / spd;
    p.vx *= s;
    p.vy *= s;
    p.vz *= s;
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.z += p.vz * dt;
  p.x = Math.max(-WORLD.half + 2, Math.min(WORLD.half - 2, p.x));
  p.y = Math.max(1.4, Math.min(WORLD.ceilY - 1, p.y));
  p.z = Math.max(-WORLD.half + 2, Math.min(WORLD.half - 2, p.z));

  if (Math.hypot(p.vx, p.vz) > 0.4) p.yaw = Math.atan2(p.vx, p.vz);
  p.bob += dt * 4;
  if (p.catchFlash > 0) p.catchFlash -= dt;
  if (p.invuln > 0) p.invuln -= dt;

  if (spd > 2 && Math.random() < dt * 7) {
    const mesh = allocBubble();
    const b = {
      x: p.x - Math.sin(p.yaw) * 0.6,
      y: p.y + rand(-0.2, 0.3),
      z: p.z - Math.cos(p.yaw) * 0.6,
      r: rand(0.08, 0.16),
      speed: rand(1.2, 2.5),
      wobble: rand(0, Math.PI * 2),
      life: 1.4,
      mesh,
    };
    mesh.scale.setScalar(b.r / 0.12);
    mesh.position.set(b.x, b.y, b.z);
    state.bubbles.push(b);
  }

  updateFish(dt);

  for (const item of state.pickups) {
    if (item.taken) continue;
    item.phase += dt * 2;
    const d = dist3(p.x, p.y, p.z, item.x, item.y, item.z);
    if (d < 3.2 && d > 0.01) {
      const pull = Math.min(1, (3.2 - d) / 3.2) * 5 * dt;
      item.x += ((p.x - item.x) / d) * pull;
      item.y += ((p.y - item.y) / d) * pull;
      item.z += ((p.z - item.z) / d) * pull;
    }
    if (d < 2.0) {
      item.taken = true;
      item.mesh.visible = false;
      state.inv[item.kind] += 1;
      updateInventoryUI();
      const labels = { stick: "Stick!", stone: "Stone!", shell: "Shell!", diamond: "Diamond!" };
      showToast(labels[item.kind] || "Got it!");
      for (let i = 0; i < 6; i++) {
        const mesh = allocSpark(item.kind === "diamond" ? 0x7ee0ff : 0xfff8d0);
        state.sparkles.push({
          x: item.x, y: item.y, z: item.z,
          vx: rand(-2, 2), vy: rand(1, 4), vz: rand(-2, 2),
          life: rand(0.3, 0.7), mesh,
        });
      }
      setTimeout(() => {
        item.taken = false;
        item.mesh.visible = true;
        item.x = rand(-WORLD.half + 5, WORLD.half - 5);
        item.y = rand(1.2, 12);
        item.z = rand(-WORLD.half + 5, WORLD.half - 5);
      }, 6000 + Math.random() * 4000);
    }
  }

  updateBubbles(dt);

  for (let i = state.sparkles.length - 1; i >= 0; i--) {
    const s = state.sparkles[i];
    s.life -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.z += s.vz * dt;
    s.vy -= 2 * dt;
    if (s.life <= 0) {
      freeSpark(s.mesh);
      state.sparkles.splice(i, 1);
    }
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

  if (p.invuln <= 0) {
    for (const c of state.coral) {
      if (dist3(p.x, p.y, p.z, c.x, c.h * 0.4, c.z) < Math.max(1.2, c.w)) {
        p.vx *= -0.4;
        p.vy *= -0.4;
        p.vz *= -0.4;
        p.invuln = 0.4;
        break;
      }
    }
  }

  let bestD = 5.5;
  for (const f of state.fish) {
    if (f.caught) continue;
    const d = dist3(p.x, p.y, p.z, f.x, f.y, f.z);
    if (d < bestD) bestD = d;
  }
  const nearPot = dist3(p.x, p.y, p.z, pot.x, pot.y + 1.2, pot.z) < 3.8;
  btnCook.style.opacity = nearPot && state.inv.fish > 0 ? "1" : nearPot ? "0.85" : "0.55";
  const glow = potMesh.getObjectByName("nearGlow");
  if (glow) glow.visible = nearPot;

  updateMeshes(dt);
  updateCamera(dt);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

let last = performance.now();
let playerMesh;
let potMesh;

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (state.ready) {
    update(dt);
    scene.fog.density = 0.016 + Math.sin(state.time * 0.6) * 0.002;
    const bg = 0.08 + Math.sin(state.time * 0.35) * 0.02;
    scene.background.setRGB(0.28 + bg, 0.78 + bg * 0.4, 0.9);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

async function boot() {
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);

  try {
    await loadAssets();
  } catch (err) {
    console.error("Asset load failed", err);
    loadingEl.querySelector(".load-msg").textContent = "Could not load assets";
    return;
  }

  makeFloor();
  playerMesh = makePlayerMesh();
  potMesh = makeCookPot();
  spawnWorld();
  updateHearts();
  updateInventoryUI();
  state.ready = true;
  state.playing = false;
  window.__RIO = state;

  loadingEl.classList.add("hidden");
  titleScreen.classList.remove("hidden");

  if (/[?&]play=1\b/.test(location.search)) {
    startGame();
  }
}

boot();

["pointerdown", "keydown"].forEach((ev) => {
  window.addEventListener(ev, () => {
    if (state.playing) hintEl.classList.add("hidden");
  });
});
