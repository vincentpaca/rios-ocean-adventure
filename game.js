import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "three/addons/utils/SkeletonUtils.js";

const canvas = document.getElementById("game");
const loadingEl = document.getElementById("loading");
const titleScreen = document.getElementById("title-screen");
const victoryScreen = document.getElementById("victory-screen");
const btnPlay = document.getElementById("btn-play");
const btnAgain = document.getElementById("btn-again");
const hud = document.getElementById("hud");
const heartsEl = document.getElementById("hearts");
const inventoryEl = document.getElementById("inventory");
const weaponRowEl = document.getElementById("weapon-row");
const biomeChip = document.getElementById("biome-chip");
const bossBar = document.getElementById("boss-bar");
const bossFill = document.getElementById("boss-fill");
const toastEl = document.getElementById("toast");
const touchControls = document.getElementById("touch-controls");
const hintEl = document.getElementById("hint");
const btnCatch = document.getElementById("btn-catch");
const btnCook = document.getElementById("btn-cook");
const btnAttack = document.getElementById("btn-attack");
const btnCraft = document.getElementById("btn-craft");
const joystick = document.getElementById("joystick");
const knob = document.getElementById("joystick-knob");

const MAX_HEARTS = 3;
const INV_KEYS = ["fish", "stick", "stone", "shell", "diamond", "arrow", "darrow"];
const MAX_FISH = 8;
const HALF = 38;

const FISH_FILES = [
  "assets/models/fish/fish1.glb",
  "assets/models/fish/fish2.glb",
  "assets/models/fish/fish3.glb",
  "assets/models/fish/coral-grouper.glb",
];

const BIOMES = {
  ocean: {
    id: "ocean",
    name: "Starting ocean",
    land: false,
    fog: 0x4ecae6,
    fogD: 0.02,
    bg: 0x62d8f2,
    clear: 0x5ad4ef,
  },
  flower: {
    id: "flower",
    name: "Flower land",
    land: true,
    fog: 0xffe8f2,
    fogD: 0.012,
    bg: 0xffd6ea,
    clear: 0xffc8e0,
  },
  mountains: {
    id: "mountains",
    name: "Mountains",
    land: true,
    fog: 0xd8ecff,
    fogD: 0.01,
    bg: 0xa8d4ff,
    clear: 0x8ec8ff,
  },
  caves: {
    id: "caves",
    name: "Diamond caves",
    land: false,
    fog: 0x1a2848,
    fogD: 0.035,
    bg: 0x142038,
    clear: 0x101828,
  },
  diamondland: {
    id: "diamondland",
    name: "Diamond land",
    land: false,
    fog: 0xb8f0ff,
    fogD: 0.018,
    bg: 0x7ee0ff,
    clear: 0x5ad4ef,
  },
  midnight: {
    id: "midnight",
    name: "Midnight zone",
    land: false,
    fog: 0x050818,
    fogD: 0.045,
    bg: 0x040612,
    clear: 0x02040c,
  },
  zombie: {
    id: "zombie",
    name: "Zombie chase!",
    land: false,
    fog: 0x2a1840,
    fogD: 0.03,
    bg: 0x3a2060,
    clear: 0x281848,
  },
};

const PORTALS = {
  ocean: [
    { to: "flower", x: HALF - 4, z: 0, label: "🌸" },
    { to: "mountains", x: -HALF + 4, z: 0, label: "⛰" },
    { to: "caves", x: 0, z: HALF - 4, label: "💎" },
    { to: "midnight", x: 0, z: -HALF + 4, label: "🌙" },
  ],
  flower: [{ to: "ocean", x: -HALF + 4, z: 0, label: "🌊" }],
  mountains: [{ to: "ocean", x: HALF - 4, z: 0, label: "🌊" }],
  caves: [
    { to: "ocean", x: 0, z: -HALF + 4, label: "🌊" },
    { to: "diamondland", x: 0, z: HALF - 4, label: "👑" },
  ],
  diamondland: [
    { to: "caves", x: 0, z: -HALF + 4, label: "💎" },
    { to: "zombie", x: HALF - 4, z: 0, label: "🎉", needBoss: true },
  ],
  midnight: [{ to: "ocean", x: 0, z: HALF - 4, label: "🌊" }],
  zombie: [{ to: "ocean", x: 0, z: -HALF + 4, label: "🌊" }],
};

const state = {
  ready: false,
  playing: false,
  time: 0,
  hearts: MAX_HEARTS,
  inv: { fish: 0, stick: 0, stone: 0, shell: 0, diamond: 0, arrow: 0, darrow: 0 },
  weapons: { stick: false, arrows: true },
  weapon: "none", // none | stick | arrow | darrow
  hasTurbo: false,
  turboTimer: 0,
  houseParts: 0,
  houseBuilt: false,
  bossDefeated: false,
  zombieDone: false,
  victory: false,
  biome: "ocean",
  mode: "swim", // swim | walk | drive
  inVan: false,
  player: {
    x: 0, y: 10, z: 8,
    vx: 0, vy: 0, vz: 0,
    yaw: 0, bob: 0, catchFlash: 0, invuln: 0,
  },
  input: { catch: false, cook: false, attack: false, craft: false },
  keys: Object.create(null),
  joy: { active: false, dx: 0, dy: 0, id: null },
  fish: [],
  pickups: [],
  bubbles: [],
  sparkles: [],
  seaweed: [],
  coral: [],
  decor: [],
  portals: [],
  projectiles: [],
  jellies: [],
  squids: [],
  zombies: [],
  flowers: [],
  cookPot: { x: 6, y: 0, z: -4, cooking: 0, smoke: 0 },
  turboOrb: null,
  van: null,
  boss: null,
  house: null,
  toastTimer: 0,
  catchCd: 0,
  cookCd: 0,
  attackCd: 0,
  craftCd: 0,
  portalCd: 0,
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

const camera = new THREE.PerspectiveCamera(55, 1, 0.2, 260);
camera.position.set(0, 14, 22);

const hemi = new THREE.HemisphereLight(0xe8fbff, 0xf0d9a8, 1.05);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff6e0, 0.95);
sun.position.set(18, 40, 12);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9ae8ff, 0.4);
fill.position.set(-20, 8, -10);
scene.add(fill);
const playerGlow = new THREE.PointLight(0xa8f0ff, 0, 18, 2);
scene.add(playerGlow);

const root = new THREE.Group();
scene.add(root);
const biomeRoot = new THREE.Group();
root.add(biomeRoot);

const mats = {
  sand: new THREE.MeshLambertMaterial({ color: 0xf3d9a0, flatShading: true }),
  sandDark: new THREE.MeshLambertMaterial({ color: 0xe4c078, flatShading: true }),
  grass: new THREE.MeshLambertMaterial({ color: 0x7ec850, flatShading: true }),
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
  portal: new THREE.MeshBasicMaterial({ color: 0xff9ad5, transparent: true, opacity: 0.55 }),
  flower: new THREE.MeshLambertMaterial({ color: 0xff6aad, flatShading: true }),
  petal: new THREE.MeshLambertMaterial({ color: 0xffd166, flatShading: true }),
  snow: new THREE.MeshLambertMaterial({ color: 0xf4fbff, flatShading: true }),
  cave: new THREE.MeshLambertMaterial({ color: 0x2a3458, flatShading: true }),
  jelly: new THREE.MeshLambertMaterial({ color: 0xff7ae8, flatShading: true, emissive: 0xff40c8, emissiveIntensity: 0.7, transparent: true, opacity: 0.85 }),
  squid: new THREE.MeshLambertMaterial({ color: 0x6affc8, flatShading: true, emissive: 0x20aa80, emissiveIntensity: 0.5 }),
  boss: new THREE.MeshLambertMaterial({ color: 0xff6ad5, flatShading: true }),
  bossEye: new THREE.MeshBasicMaterial({ color: 0xfff36a }),
  zombie: new THREE.MeshLambertMaterial({ color: 0x7dff7a, flatShading: true }),
  van: new THREE.MeshLambertMaterial({ color: 0xffb020, flatShading: true }),
  vanDark: new THREE.MeshLambertMaterial({ color: 0xd4890a, flatShading: true }),
  wood: new THREE.MeshLambertMaterial({ color: 0x8b5a2b, flatShading: true }),
  house: new THREE.MeshLambertMaterial({ color: 0xc48a4a, flatShading: true }),
  turbo: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  arrow: new THREE.MeshBasicMaterial({ color: 0xffd166 }),
  darrow: new THREE.MeshBasicMaterial({ color: 0x7ee0ff }),
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
  assets.pot = prepGltfRoot((await loader.loadAsync("assets/models/food/pot-stew.glb")).scene);
  assets.potLid = prepGltfRoot((await loader.loadAsync("assets/models/food/pot-lid.glb")).scene);
  assets.firePit = prepGltfRoot((await loader.loadAsync("assets/models/survival/campfire-pit.glb")).scene);

  loadMsg.textContent = "Loading reef…";
  assets.coral = prepGltfRoot((await loader.loadAsync("assets/models/coral/coral-reef-set.glb")).scene);

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
    assets.rocks.push(prepGltfRoot((await loader.loadAsync(path)).scene));
  }
  assets.wood = prepGltfRoot((await loader.loadAsync("assets/models/survival/resource-wood.glb")).scene);
  assets.stoneRes = prepGltfRoot((await loader.loadAsync("assets/models/survival/resource-stone.glb")).scene);
}

function clearBiome() {
  while (biomeRoot.children.length) {
    const c = biomeRoot.children[0];
    biomeRoot.remove(c);
  }
  for (const f of state.fish) {
    if (f.mixer) f.mixer.stopAllAction();
    if (f.mesh) root.remove(f.mesh);
  }
  for (const p of state.pickups) if (p.mesh) root.remove(p.mesh);
  for (const s of state.seaweed) if (s.mesh) root.remove(s.mesh);
  for (const c of state.coral) if (c.mesh) root.remove(c.mesh);
  for (const d of state.decor) if (d.mesh) root.remove(d.mesh);
  for (const p of state.portals) if (p.mesh) root.remove(p.mesh);
  for (const j of state.jellies) if (j.mesh) root.remove(j.mesh);
  for (const s of state.squids) if (s.mesh) root.remove(s.mesh);
  for (const z of state.zombies) if (z.mesh) root.remove(z.mesh);
  for (const pr of state.projectiles) if (pr.mesh) root.remove(pr.mesh);
  for (const b of state.bubbles) if (b.mesh) freeBubble(b.mesh);
  for (const s of state.sparkles) if (s.mesh) freeSpark(s.mesh);
  if (state.turboOrb?.mesh) root.remove(state.turboOrb.mesh);
  if (state.van?.mesh) root.remove(state.van.mesh);
  if (state.boss?.mesh) root.remove(state.boss.mesh);
  if (state.house?.mesh) root.remove(state.house.mesh);
  if (potMesh) {
    root.remove(potMesh);
    potMesh = null;
  }

  state.fish = [];
  state.pickups = [];
  state.seaweed = [];
  state.coral = [];
  state.decor = [];
  state.portals = [];
  state.jellies = [];
  state.squids = [];
  state.zombies = [];
  state.projectiles = [];
  state.bubbles = [];
  state.sparkles = [];
  state.flowers = [];
  state.turboOrb = null;
  state.van = null;
  state.boss = null;
  state.house = null;
  state.inVan = false;
  state.mode = "swim";
}

function applyBiomeLook(id) {
  const b = BIOMES[id];
  scene.background.set(b.bg);
  scene.fog.color.set(b.fog);
  scene.fog.density = b.fogD;
  renderer.setClearColor(b.clear, 1);
  hemi.intensity = id === "midnight" ? 0.25 : id === "caves" ? 0.45 : 1.05;
  sun.intensity = id === "midnight" ? 0.15 : id === "caves" ? 0.35 : 0.95;
  playerGlow.intensity = id === "midnight" ? 2.2 : id === "caves" ? 1.1 : 0;
  biomeChip.textContent = b.name;
  bossBar.classList.toggle("hidden", !(id === "diamondland" && state.boss && !state.bossDefeated));
}

function makeFloor(mat, y = 0) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF * 2.4, HALF * 2.4, 8, 8),
    mat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = y;
  const pos = floor.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const yy = pos.getY(i);
    pos.setZ(i, Math.sin(x * 0.12) * 0.25 + Math.cos(yy * 0.1) * 0.18);
  }
  pos.needsUpdate = true;
  floor.geometry.computeVertexNormals();
  biomeRoot.add(floor);
}

function makePortal(def) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.22, 8, 28), mats.portal.clone());
  ring.material.color.setHSL(Math.random(), 0.7, 0.65);
  g.add(ring);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.8, 20),
    new THREE.MeshBasicMaterial({ color: ring.material.color, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
  );
  g.add(disc);
  const y = BIOMES[state.biome].land ? 2.4 : 8;
  g.position.set(def.x, y, def.z);
  root.add(g);
  state.portals.push({ ...def, mesh: g, y });
}

function makeCookPot() {
  const g = new THREE.Group();
  if (assets.firePit) {
    const pit = assets.firePit.clone(true);
    fitObject(pit, 2.2);
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

function makePlayerMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.1, 8), mats.suit);
  body.position.y = 0.15;
  g.add(body);
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
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 5), mats.wood);
  stick.position.set(0.85, 0.35, 0.35);
  stick.rotation.z = -0.9;
  stick.name = "weaponStick";
  stick.visible = false;
  g.add(stick);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.55, 5), mats.suitDark);
  legL.position.set(-0.18, -0.7, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.18;
  g.add(legR);
  const finL = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 5), mats.fin);
  finL.position.set(-0.18, -1.15, 0.05);
  finL.rotation.x = Math.PI / 2.2;
  finL.name = "finL";
  g.add(finL);
  const finR = finL.clone();
  finR.position.x = 0.18;
  finR.name = "finR";
  g.add(finR);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.04, 6, 16), mats.ring);
  ring.visible = false;
  ring.name = "catchRing";
  g.add(ring);
  const trail = new THREE.Group();
  trail.name = "turboTrail";
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 5, 4),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(i / 6, 0.9, 0.6), transparent: true, opacity: 0.7 })
    );
    c.position.set(0, 0, -0.4 - i * 0.35);
    trail.add(c);
  }
  trail.visible = false;
  g.add(trail);
  g.scale.setScalar(1.15);
  root.add(g);
  return g;
}

function cloneFishTemplate(templateIndex) {
  const gltf = assets.fish[templateIndex % assets.fish.length];
  const mesh = skeletonClone(gltf.scene);
  prepGltfRoot(mesh);
  mesh.scale.setScalar(rand(0.18, 0.28));
  mesh.frustumCulled = false;
  mesh.traverse((c) => {
    if (c.isMesh || c.isSkinnedMesh) c.frustumCulled = false;
  });
  const mixer = new THREE.AnimationMixer(mesh);
  let action = null;
  if (gltf.animations?.length) {
    const clip = gltf.animations.find((a) => /swim/i.test(a.name)) || gltf.animations[0];
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
  state.toastTimer = 1.7;
}

function spawnPickups(kinds, yMin, yMax) {
  for (const kind of kinds) {
    const mesh = makePickupMesh(kind);
    const item = {
      kind,
      x: rand(-HALF + 5, HALF - 5),
      y: rand(yMin, yMax),
      z: rand(-HALF + 5, HALF - 5),
      phase: rand(0, Math.PI * 2),
      taken: false,
      mesh,
    };
    mesh.position.set(item.x, item.y, item.z);
    state.pickups.push(item);
  }
}

function spawnFish(count) {
  for (let i = 0; i < count; i++) {
    const { mesh, mixer, action } = cloneFishTemplate(i);
    const near = i < 4;
    const f = {
      x: near ? rand(-4, 4) : rand(-HALF + 6, HALF - 6),
      y: near ? rand(7, 12) : rand(3, 16),
      z: near ? rand(8, 16) : rand(-HALF + 6, HALF - 6),
      vx: rand(-2.2, 2.2) || 1.2,
      vy: rand(-0.5, 0.5),
      vz: rand(-2.2, 2.2),
      phase: rand(0, Math.PI * 2),
      caught: false,
      mesh,
      mixer,
      action,
    };
    mesh.position.set(f.x, f.y, f.z);
    state.fish.push(f);
  }
}

function scatterCoralAndRocks() {
  for (let i = 0; i < 8; i++) {
    const mesh = assets.coral.clone(true);
    mesh.rotation.z = -Math.PI / 2;
    mesh.rotation.y = rand(0, Math.PI * 2);
    const s = rand(0.55, 1.05);
    mesh.scale.setScalar(s);
    const x = rand(-HALF + 6, HALF - 6);
    const z = rand(-HALF + 6, HALF - 6);
    if (Math.hypot(x - state.cookPot.x, z - state.cookPot.z) < 6) continue;
    mesh.position.set(x, 0, z);
    mesh.traverse((c) => {
      if (c.isMesh && c.material?.color) {
        c.material = c.material.clone();
        c.material.color.offsetHSL(rand(-0.06, 0.1), rand(0, 0.12), rand(-0.04, 0.06));
      }
    });
    root.add(mesh);
    state.coral.push({ x, z, h: 4 * s, w: 2.2 * s, mesh });
  }
  for (let i = 0; i < 16; i++) {
    const src = assets.rocks[i % assets.rocks.length];
    const mesh = src.clone(true);
    fitObject(mesh, rand(1.0, 2.8));
    mesh.position.set(rand(-HALF + 4, HALF - 4), 0, rand(-HALF + 4, HALF - 4));
    mesh.rotation.y = rand(0, Math.PI * 2);
    root.add(mesh);
    state.decor.push({ mesh });
  }
}

function makeVan() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 5.2), mats.van);
  body.position.y = 1.1;
  g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 1.1, 1.8), mats.vanDark);
  cab.position.set(0, 1.9, 1.4);
  g.add(cab);
  const win = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.7, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xa8e8ff, transparent: true, opacity: 0.7 })
  );
  win.position.set(0, 2.0, 2.3);
  g.add(win);
  for (const [x, z] of [[-1.2, 1.6], [1.2, 1.6], [-1.2, -1.6], [1.2, -1.6]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 10), mats.rockDeep);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.45, z);
    g.add(w);
  }
  g.position.set(8, 0, -10);
  root.add(g);
  state.van = { x: 8, y: 0, z: -10, yaw: 0, mesh: g };
}

function makeBoss() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(4.5, 0), mats.boss);
  g.add(body);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 5), mats.bossEye);
  eyeL.position.set(-1.4, 1.2, 3.2);
  g.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 1.4;
  g.add(eyeR);
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.25, 6, 16, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xfff36a })
  );
  smile.position.set(0, -0.6, 3.5);
  smile.rotation.x = Math.PI;
  g.add(smile);
  for (let i = 0; i < 5; i++) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8, 5), mats.petal);
    horn.position.set(Math.cos((i / 5) * Math.PI * 2) * 2.2, 4.2, Math.sin((i / 5) * Math.PI * 2) * 2.2);
    g.add(horn);
  }
  g.position.set(0, 10, 12);
  root.add(g);
  state.boss = {
    x: 0, y: 10, z: 12,
    hp: 100, maxHp: 100,
    phase: 0, hitFlash: 0,
    mesh: g,
  };
  bossBar.classList.remove("hidden");
  bossFill.style.width = "100%";
}

function makeHouseSite() {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.2, 0.4, 10), mats.cave);
  pad.position.y = 0.2;
  g.add(pad);
  const ghost = new THREE.Mesh(
    new THREE.BoxGeometry(5, 3.5, 5),
    new THREE.MeshBasicMaterial({ color: 0x7ee0ff, transparent: true, opacity: 0.15, wireframe: true })
  );
  ghost.position.y = 2.2;
  ghost.name = "ghost";
  g.add(ghost);
  g.position.set(-6, 0, -8);
  root.add(g);
  state.house = { x: -6, y: 0, z: -8, mesh: g, built: state.houseBuilt };
  if (state.houseBuilt) completeHouseVisual();
}

function completeHouseVisual() {
  if (!state.house) return;
  const g = state.house.mesh;
  const ghost = g.getObjectByName("ghost");
  if (ghost) ghost.visible = false;
  if (g.getObjectByName("built")) return;
  const built = new THREE.Group();
  built.name = "built";
  const walls = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 5), mats.house);
  walls.position.y = 2;
  built.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.2, 5), mats.wood);
  roof.position.y = 4.5;
  built.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.2), mats.diamond);
  door.position.set(0, 1.2, 2.6);
  built.add(door);
  const lamp = new THREE.PointLight(0xffd166, 1.4, 14);
  lamp.position.set(0, 3.5, 0);
  built.add(lamp);
  g.add(built);
}

function makeTurboOrb() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), mats.turbo);
  g.add(core);
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 5, 4),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(i / 6, 1, 0.55) })
    );
    p.position.set(Math.cos((i / 6) * Math.PI * 2) * 1.3, Math.sin(i) * 0.4, Math.sin((i / 6) * Math.PI * 2) * 1.3);
    g.add(p);
  }
  g.position.set(10, 6, 8);
  root.add(g);
  state.turboOrb = { x: 10, y: 6, z: 8, taken: state.hasTurbo, mesh: g };
  if (state.hasTurbo) g.visible = false;
}

function makeJelly(x, y, z) {
  const g = new THREE.Group();
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6, 0, Math.PI * 2, 0, Math.PI / 1.5), mats.jelly);
  g.add(bell);
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.02, 1.6, 4),
      new THREE.MeshBasicMaterial({ color: 0xff9af0 })
    );
    t.position.set(Math.cos((i / 5) * Math.PI * 2) * 0.35, -1.1, Math.sin((i / 5) * Math.PI * 2) * 0.35);
    g.add(t);
  }
  g.position.set(x, y, z);
  root.add(g);
  state.jellies.push({ x, y, z, phase: rand(0, 6), mesh: g });
}

function makeSquid(x, y, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(2.2, 6, 7), mats.squid);
  body.rotation.x = Math.PI;
  g.add(body);
  for (let i = 0; i < 6; i++) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.08, 5, 5), mats.squid);
    arm.position.set(Math.cos((i / 6) * Math.PI * 2) * 1.2, -4.2, Math.sin((i / 6) * Math.PI * 2) * 1.2);
    arm.rotation.x = 0.4;
    g.add(arm);
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 5), mats.bossEye);
  eye.position.set(0.7, 0.5, 1.5);
  g.add(eye);
  g.position.set(x, y, z);
  root.add(g);
  state.squids.push({ x, y, z, phase: rand(0, 6), mesh: g });
}

function makeZombie(i) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 1.3, 7), mats.zombie);
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 5), mats.zombie);
  head.position.y = 1.0;
  g.add(head);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 4), new THREE.MeshBasicMaterial({ color: 0xff4466 }));
  eye.position.set(0.15, 1.05, 0.35);
  g.add(eye);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 5), mats.fin);
  fin.position.set(0, -0.9, -0.2);
  fin.rotation.x = Math.PI / 2;
  g.add(fin);
  const x = rand(-20, 20);
  const y = rand(4, 14);
  const z = rand(10, 28);
  g.position.set(x, y, z);
  root.add(g);
  state.zombies.push({
    x, y, z,
    vx: 0, vy: 0, vz: 0,
    hp: 3,
    phase: rand(0, 6),
    mesh: g,
  });
}

function buildBiome(id) {
  clearBiome();
  state.biome = id;
  applyBiomeLook(id);
  const land = BIOMES[id].land;
  state.mode = land ? "walk" : "swim";

  if (id === "ocean") {
    makeFloor(mats.sand);
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(2.5, 5), 0), i % 2 ? mats.rock : mats.rockDeep);
      rock.position.set(Math.cos(ang) * HALF * 0.92, rand(0.5, 2.5), Math.sin(ang) * HALF * 0.92);
      biomeRoot.add(rock);
    }
    state.cookPot = { x: 6, y: 0, z: -4, cooking: 0, smoke: 0 };
    potMesh = makeCookPot();
    spawnFish(MAX_FISH);
    spawnPickups([
      ...Array(7).fill("stick"),
      ...Array(6).fill("stone"),
      ...Array(5).fill("shell"),
      ...Array(2).fill("diamond"),
    ], 1.2, 12);
    scatterCoralAndRocks();
    for (let i = 0; i < 16; i++) {
      state.seaweed.push(makeSeaweed(rand(-HALF + 2, HALF - 2), rand(-HALF + 2, HALF - 2), rand(2.2, 5.5)));
    }
  } else if (id === "flower") {
    makeFloor(mats.grass);
    for (let i = 0; i < 60; i++) {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 4), mats.kelpLite);
      stem.position.y = 0.7;
      g.add(stem);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 5), mats.flower.clone());
      bloom.material = mats.flower.clone();
      bloom.material.color.setHSL(rand(0, 1), 0.75, 0.6);
      bloom.position.y = 1.5;
      g.add(bloom);
      g.position.set(rand(-HALF + 3, HALF - 3), 0, rand(-HALF + 3, HALF - 3));
      biomeRoot.add(g);
      state.flowers.push({ mesh: g, phase: rand(0, 6) });
    }
    spawnPickups([...Array(8).fill("stick"), ...Array(5).fill("shell")], 0.8, 1.6);
    makeVan();
  } else if (id === "mountains") {
    makeFloor(mats.snow);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(rand(4, 9), rand(10, 22), 6), mats.rock);
      m.position.set(rand(-HALF + 6, HALF - 6), rand(5, 10), rand(-HALF + 6, HALF - 6));
      biomeRoot.add(m);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(rand(2, 4), rand(2, 4), 6), mats.snow);
      cap.position.copy(m.position);
      cap.position.y += m.geometry.parameters.height * 0.35;
      biomeRoot.add(cap);
    }
    spawnPickups([...Array(6).fill("stone"), ...Array(4).fill("stick")], 0.8, 2);
    makeVan();
  } else if (id === "caves") {
    makeFloor(mats.cave);
    for (let i = 0; i < 18; i++) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(rand(1, 2.5), rand(1.5, 3), rand(6, 16), 6),
        mats.cave
      );
      pillar.position.set(rand(-HALF + 4, HALF - 4), rand(3, 8), rand(-HALF + 4, HALF - 4));
      biomeRoot.add(pillar);
    }
    for (let i = 0; i < 10; i++) {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(rand(0.6, 1.4), 0), mats.diamond);
      crystal.position.set(rand(-HALF + 5, HALF - 5), rand(2, 10), rand(-HALF + 5, HALF - 5));
      biomeRoot.add(crystal);
      state.decor.push({ mesh: crystal });
    }
    spawnPickups([...Array(10).fill("diamond"), ...Array(4).fill("stick")], 2, 12);
    makeTurboOrb();
    spawnFish(4);
  } else if (id === "diamondland") {
    makeFloor(mats.sand);
    for (let i = 0; i < 20; i++) {
      const d = new THREE.Mesh(new THREE.OctahedronGeometry(rand(0.5, 1.2), 0), mats.diamond);
      d.position.set(rand(-HALF + 4, HALF - 4), rand(1, 8), rand(-HALF + 4, HALF - 4));
      biomeRoot.add(d);
    }
    if (!state.bossDefeated) makeBoss();
    else showToast("Boss beaten! Portal to zombies open");
  } else if (id === "midnight") {
    makeFloor(mats.cave);
    for (let i = 0; i < 14; i++) {
      makeJelly(rand(-HALF + 5, HALF - 5), rand(4, 16), rand(-HALF + 5, HALF - 5));
    }
    makeSquid(-14, 12, -10);
    makeSquid(16, 10, 8);
    makeHouseSite();
    spawnPickups([...Array(5).fill("stick"), ...Array(5).fill("stone"), ...Array(4).fill("shell")], 1, 10);
  } else if (id === "zombie") {
    makeFloor(mats.sandDark);
    for (let i = 0; i < 10; i++) makeZombie(i);
    if (state.zombieDone) showToast("Chase complete!");
  }

  for (const def of PORTALS[id] || []) {
    if (def.needBoss && !state.bossDefeated) continue;
    makePortal(def);
  }

  for (let i = 0; i < (land ? 8 : 28); i++) {
    const mesh = allocBubble();
    const b = {
      x: rand(-HALF, HALF),
      y: rand(1, 22),
      z: rand(-HALF, HALF),
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
  state.player.y = land ? 1.6 : 10;
  state.player.z = land ? 6 : 8;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.vz = 0;
  state.portalCd = 1.2;
  updateWeaponUI();
}

function enterBiome(to) {
  buildBiome(to);
  showToast(BIOMES[to].name + "!");
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
  } else if (kind === "arrow") {
    g.fillStyle = "#ffd166";
    g.beginPath();
    g.moveTo(10, 0);
    g.lineTo(-2, -5);
    g.lineTo(-2, 5);
    g.closePath();
    g.fill();
    g.strokeStyle = "#8b5a2b";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-2, 0);
    g.lineTo(-12, 0);
    g.stroke();
  } else if (kind === "darrow") {
    g.fillStyle = "#7ee0ff";
    g.beginPath();
    g.moveTo(10, 0);
    g.lineTo(-2, -5);
    g.lineTo(-2, 5);
    g.closePath();
    g.fill();
    g.strokeStyle = "#2a88aa";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-2, 0);
    g.lineTo(-12, 0);
    g.stroke();
  }
  g.restore();
}

function updateInventoryUI() {
  inventoryEl.innerHTML = "";
  for (const key of INV_KEYS) {
    const slot = document.createElement("div");
    slot.className = "inv-slot";
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

function updateWeaponUI() {
  weaponRowEl.innerHTML = "";
  const bits = [];
  if (state.weapons.stick) bits.push(state.weapon === "stick" ? "[Stick]" : "Stick");
  if (state.inv.arrow > 0) bits.push(state.weapon === "arrow" ? `[Arrows ${state.inv.arrow}]` : `Arrows ${state.inv.arrow}`);
  if (state.inv.darrow > 0) bits.push(state.weapon === "darrow" ? `[💎 ${state.inv.darrow}]` : `💎 ${state.inv.darrow}`);
  if (state.hasTurbo) bits.push(state.turboTimer > 0 ? "⚡ TURBO!" : "⚡ Turbo");
  if (state.houseParts > 0 && !state.houseBuilt) bits.push(`🏠 ${state.houseParts}/3`);
  weaponRowEl.textContent = bits.join(" · ") || "Craft sticks for weapons";
  const stick = playerMesh?.getObjectByName("weaponStick");
  if (stick) stick.visible = state.weapon === "stick" && state.weapons.stick;
}

function cycleWeapon() {
  const opts = ["none"];
  if (state.weapons.stick) opts.push("stick");
  if (state.inv.arrow > 0) opts.push("arrow");
  if (state.inv.darrow > 0) opts.push("darrow");
  const i = opts.indexOf(state.weapon);
  state.weapon = opts[(i + 1) % opts.length];
  updateWeaponUI();
  showToast(state.weapon === "none" ? "Hands" : state.weapon === "darrow" ? "Diamond arrows!" : state.weapon === "arrow" ? "Arrows!" : "Stick!");
}

function tryCraft() {
  // Priority: diamond arrows, then arrows, then stick weapon, then house part
  if (state.inv.diamond >= 1 && state.inv.stick >= 1) {
    state.inv.diamond -= 1;
    state.inv.stick -= 1;
    state.inv.darrow += 3;
    if (state.weapon === "none") state.weapon = "darrow";
    showToast("Diamond arrows!");
  } else if (state.inv.stick >= 2 && state.weapons.stick && state.inv.arrow < 20) {
    state.inv.stick -= 2;
    state.inv.arrow += 5;
    if (state.weapon === "none" || state.weapon === "stick") state.weapon = "arrow";
    showToast("Arrows!");
  } else if (state.inv.stick >= 2 && !state.weapons.stick) {
    state.inv.stick -= 2;
    state.weapons.stick = true;
    state.weapon = "stick";
    showToast("Stick weapon!");
  } else if (state.biome === "midnight" && !state.houseBuilt && state.inv.stick >= 2 && state.inv.stone >= 2 && state.inv.shell >= 1) {
    state.inv.stick -= 2;
    state.inv.stone -= 2;
    state.inv.shell -= 1;
    state.houseParts = Math.min(3, state.houseParts + 1);
    showToast(`House part ${state.houseParts}/3!`);
    if (state.houseParts >= 3) {
      state.houseBuilt = true;
      completeHouseVisual();
      showToast("House built!");
      checkVictory();
    }
  } else {
    showToast("Need more sticks!");
  }
  updateInventoryUI();
  updateWeaponUI();
}

function tryAction() {
  const p = state.player;
  const land = BIOMES[state.biome].land;

  if (land && state.van && !state.inVan && dist3(p.x, p.y, p.z, state.van.x, 1, state.van.z) < 4.5) {
    state.inVan = true;
    state.mode = "drive";
    showToast("Van! Drive on land");
    return;
  }
  if (state.inVan) {
    state.inVan = false;
    state.mode = "walk";
    p.x = state.van.x + 3;
    p.z = state.van.z;
    showToast("Hop out");
    return;
  }

  if (state.biome === "ocean" || state.biome === "caves") {
    tryCook();
    return;
  }

  if (state.biome === "midnight" && state.house && dist3(p.x, p.y, p.z, state.house.x, 1.5, state.house.z) < 5) {
    tryCraft();
    return;
  }

  if (state.turboOrb && !state.turboOrb.taken && dist3(p.x, p.y, p.z, state.turboOrb.x, state.turboOrb.y, state.turboOrb.z) < 3.5) {
    state.turboOrb.taken = true;
    state.hasTurbo = true;
    state.turboOrb.mesh.visible = false;
    state.turboTimer = 6;
    showToast("Rainbow turbo!");
    updateWeaponUI();
    return;
  }

  showToast(land ? "Near the van?" : "Swim to pot / turbo / house");
}

function tryCook() {
  const p = state.player;
  const pot = state.cookPot;
  if (!potMesh || dist3(p.x, p.y, p.z, pot.x, pot.y + 1.2, pot.z) > 3.8) {
    showToast("Swim to the pot!");
    return;
  }
  if (state.inv.fish < 1) {
    showToast("Need a fish!");
    return;
  }
  state.inv.fish -= 1;
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
  for (let i = 0; i < 14; i++) {
    const mesh = allocSpark(i % 2 ? 0xff6b35 : 0xffd166);
    state.sparkles.push({
      x: pot.x + rand(-0.4, 0.4), y: pot.y + 1.4, z: pot.z + rand(-0.4, 0.4),
      vx: rand(-2, 2), vy: rand(2, 6), vz: rand(-2, 2),
      life: rand(0.5, 1.1), mesh,
    });
  }
}

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
  if (!best) return;
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
    best.x = rand(-HALF + 6, HALF - 6);
    best.y = rand(3, 16);
    best.z = rand(-HALF + 6, HALF - 6);
    if (best.action) best.action.reset().play();
  }, 4000);
}

function spawnProjectile(kind) {
  const p = state.player;
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.7, 5),
    kind === "darrow" ? mats.darrow : mats.arrow
  );
  mesh.rotation.x = Math.PI / 2;
  root.add(mesh);
  const speed = kind === "darrow" ? 28 : 22;
  const pr = {
    kind,
    x: p.x, y: p.y + 0.4, z: p.z,
    vx: Math.sin(p.yaw) * speed,
    vy: 0,
    vz: Math.cos(p.yaw) * speed,
    life: 1.4,
    dmg: kind === "darrow" ? 18 : 10,
    mesh,
  };
  mesh.position.set(pr.x, pr.y, pr.z);
  mesh.rotation.y = p.yaw;
  state.projectiles.push(pr);
}

function tryAttack() {
  const p = state.player;
  if (state.weapon === "arrow" && state.inv.arrow > 0) {
    state.inv.arrow -= 1;
    spawnProjectile("arrow");
    updateInventoryUI();
    updateWeaponUI();
    showToast("Whoosh!");
    return;
  }
  if (state.weapon === "darrow" && state.inv.darrow > 0) {
    state.inv.darrow -= 1;
    spawnProjectile("darrow");
    updateInventoryUI();
    updateWeaponUI();
    showToast("Sparkle shot!");
    return;
  }
  if (state.weapon === "stick" && state.weapons.stick) {
    p.catchFlash = 0.25;
    const reach = 4.2;
    let hit = false;
    if (state.boss && !state.bossDefeated) {
      const b = state.boss;
      if (dist3(p.x, p.y, p.z, b.x, b.y, b.z) < reach + 3) {
        damageBoss(12);
        hit = true;
      }
    }
    for (const z of state.zombies) {
      if (z.hp <= 0) continue;
      if (dist3(p.x, p.y, p.z, z.x, z.y, z.z) < reach) {
        z.hp -= 1;
        hit = true;
        burst(z.x, z.y, z.z, 0x7dff7a);
        if (z.hp <= 0) {
          z.mesh.visible = false;
        }
      }
    }
    showToast(hit ? "Bonk!" : "Swing!");
    checkZombiesCleared();
    return;
  }
  showToast("Craft a weapon!");
}

function damageBoss(amount) {
  if (!state.boss || state.bossDefeated) return;
  state.boss.hp = Math.max(0, state.boss.hp - amount);
  state.boss.hitFlash = 0.25;
  bossFill.style.width = `${(state.boss.hp / state.boss.maxHp) * 100}%`;
  burst(state.boss.x, state.boss.y, state.boss.z, 0xff6ad5);
  if (state.boss.hp <= 0) {
    state.bossDefeated = true;
    state.boss.mesh.visible = false;
    bossBar.classList.add("hidden");
    showToast("Boss down! Portal unlocked");
    // open zombie portal
    makePortal({ to: "zombie", x: HALF - 4, z: 0, label: "🎉" });
    checkVictory();
  }
}

function burst(x, y, z, color) {
  for (let i = 0; i < 8; i++) {
    const mesh = allocSpark(color);
    state.sparkles.push({
      x, y, z,
      vx: rand(-4, 4), vy: rand(1, 6), vz: rand(-4, 4),
      life: rand(0.3, 0.8), mesh,
    });
  }
}

function checkZombiesCleared() {
  if (state.biome !== "zombie" || state.zombieDone) return;
  if (state.zombies.every((z) => z.hp <= 0)) {
    state.zombieDone = true;
    showToast("Dooper dooper win!");
    checkVictory();
  }
}

function checkVictory() {
  if (state.victory) return;
  if (state.bossDefeated && state.zombieDone && state.hasTurbo && state.houseBuilt) {
    state.victory = true;
    setTimeout(() => {
      victoryScreen.classList.remove("hidden");
      hud.classList.add("hidden");
      touchControls.classList.add("hidden");
    }, 900);
  }
}

function softHurt(amount = 1) {
  const p = state.player;
  if (p.invuln > 0) return;
  state.hearts = Math.max(0, state.hearts - amount);
  updateHearts();
  p.invuln = 1.1;
  if (state.hearts <= 0) {
    showToast("Soft respawn!");
    state.hearts = MAX_HEARTS;
    updateHearts();
    p.x = 0;
    p.y = BIOMES[state.biome].land ? 1.6 : 10;
    p.z = 6;
    p.vx = p.vy = p.vz = 0;
  }
}

function startGame() {
  titleScreen.classList.add("hidden");
  victoryScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  touchControls.classList.remove("hidden");
  hintEl.classList.remove("hidden");
  state.playing = true;
  state.victory = false;
  state.hearts = MAX_HEARTS;
  state.inv = { fish: 0, stick: 0, stone: 0, shell: 0, diamond: 0, arrow: 0, darrow: 0 };
  state.weapons = { stick: false, arrows: true };
  state.weapon = "none";
  state.hasTurbo = false;
  state.turboTimer = 0;
  state.houseParts = 0;
  state.houseBuilt = false;
  state.bossDefeated = false;
  state.zombieDone = false;
  buildBiome("ocean");
  updateHearts();
  updateInventoryUI();
  updateWeaponUI();
  showToast("Explore the portals!");
  setTimeout(() => {
    if (state.toastTimer <= 0) hintEl.classList.add("hidden");
  }, 5500);
}

window.__startRio = startGame;

window.addEventListener("keydown", (e) => {
  state.keys[e.code] = true;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  if (e.code === "Space") state.input.catch = true;
  if (e.code === "KeyE") state.input.cook = true;
  if (e.code === "KeyF") state.input.attack = true;
  if (e.code === "KeyC") state.input.craft = true;
  if (e.code === "KeyQ") cycleWeapon();
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

function bindBtn(btn, key) {
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    state.input[key] = true;
    btn.classList.add("pressed");
  });
  btn.addEventListener("pointerup", () => btn.classList.remove("pressed"));
  btn.addEventListener("pointercancel", () => btn.classList.remove("pressed"));
}
bindBtn(btnCatch, "catch");
bindBtn(btnCook, "cook");
bindBtn(btnAttack, "attack");
bindBtn(btnCraft, "craft");

btnPlay.addEventListener("click", (e) => {
  e.preventDefault();
  if (!state.playing && state.ready) startGame();
});
btnPlay.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (!state.playing && state.ready) startGame();
});
btnAgain.addEventListener("click", (e) => {
  e.preventDefault();
  startGame();
});

function updateCamera(dt) {
  const p = state.player;
  const desiredYaw = p.yaw + Math.PI;
  state.cam.yaw += (desiredYaw - state.cam.yaw) * Math.min(1, 2.8 * dt);
  const dist = state.playing ? (state.inVan ? 12 : 9.5) : 14;
  const pitch = state.playing ? 0.2 : 0.12;
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
  camera.lookAt(p.x + Math.sin(p.yaw) * 4.5, lookY + 0.2, p.z + Math.cos(p.yaw) * 4.5);
}

function updateFish(dt) {
  for (const f of state.fish) {
    if (f.caught) continue;
    if (f.mixer) f.mixer.update(dt);
    f.phase += dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt + Math.sin(f.phase * 2) * 0.4 * dt;
    f.z += f.vz * dt;
    if (f.x < -HALF + 4 || f.x > HALF - 4) f.vx *= -1;
    if (f.y < 2 || f.y > 20) f.vy *= -1;
    if (f.z < -HALF + 4 || f.z > HALF - 4) f.vz *= -1;
    if (Math.random() < dt * 0.4) {
      f.vx += rand(-1, 1);
      f.vz += rand(-1, 1);
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
    if (b.y > 24) {
      if (b.life != null) {
        freeBubble(b.mesh);
        state.bubbles.splice(i, 1);
      } else {
        b.y = 0.5;
        b.x = rand(-HALF, HALF);
        b.z = rand(-HALF, HALF);
      }
    }
  }
}

function updateMeshes(dt) {
  const p = state.player;
  const bob = Math.sin(p.bob) * 0.08;
  if (state.inVan && state.van) {
    playerMesh.visible = false;
    state.van.mesh.position.set(state.van.x, 0, state.van.z);
    state.van.mesh.rotation.y = state.van.yaw;
  } else {
    playerMesh.visible = !(p.invuln > 0 && Math.floor(state.time * 10) % 2 === 0);
    playerMesh.position.set(p.x, p.y + bob, p.z);
    playerMesh.rotation.y = p.yaw;
    playerMesh.rotation.x = THREE.MathUtils.clamp(-p.vy * 0.06, -0.35, 0.35);
  }

  const trail = playerMesh.getObjectByName("turboTrail");
  if (trail) {
    trail.visible = state.turboTimer > 0;
    if (trail.visible) {
      trail.children.forEach((c, i) => {
        c.material.opacity = 0.35 + Math.sin(state.time * 10 + i) * 0.25;
        c.position.z = -0.4 - i * 0.35 - (state.time * 2 % 0.3);
      });
    }
  }

  const ring = playerMesh.getObjectByName("catchRing");
  if (ring) {
    ring.visible = p.catchFlash > 0;
    if (ring.visible) {
      const t = 1 - p.catchFlash / 0.35;
      ring.scale.setScalar(1 + t * 0.8);
      ring.material.opacity = Math.max(0, p.catchFlash * 2);
    }
  }

  for (const f of state.fish) {
    if (f.caught) continue;
    f.mesh.position.set(f.x, f.y + Math.sin(f.phase * 3) * 0.12, f.z);
    f.mesh.rotation.y = Math.atan2(f.vx, f.vz);
  }
  for (const item of state.pickups) {
    if (item.taken) continue;
    item.mesh.position.set(item.x, item.y + Math.sin(item.phase) * 0.2, item.z);
    item.mesh.rotation.y += dt * (item.kind === "diamond" ? 2.2 : 1.2);
  }
  for (const b of state.bubbles) b.mesh.position.set(b.x, b.y, b.z);
  for (const s of state.sparkles) {
    s.mesh.position.set(s.x, s.y, s.z);
    s.mesh.material.opacity = Math.max(0, s.life);
  }
  for (const portal of state.portals) {
    portal.mesh.rotation.y += dt * 1.5;
    portal.mesh.position.y = portal.y + Math.sin(state.time * 2 + portal.x) * 0.25;
  }
  for (const j of state.jellies) {
    j.phase += dt;
    j.y += Math.sin(j.phase) * 0.4 * dt;
    j.mesh.position.set(j.x, j.y, j.z);
    j.mesh.scale.y = 1 + Math.sin(j.phase * 2) * 0.1;
  }
  for (const s of state.squids) {
    s.phase += dt * 0.5;
    s.mesh.position.set(s.x + Math.sin(s.phase) * 2, s.y + Math.sin(s.phase * 0.7), s.z);
    s.mesh.rotation.y = s.phase;
  }
  if (state.boss && !state.bossDefeated) {
    const b = state.boss;
    b.phase += dt;
    b.x = Math.sin(b.phase * 0.6) * 8;
    b.y = 10 + Math.sin(b.phase * 1.2) * 1.5;
    b.z = 12 + Math.cos(b.phase * 0.5) * 4;
    b.mesh.position.set(b.x, b.y, b.z);
    b.mesh.rotation.y = b.phase * 0.4;
    if (b.hitFlash > 0) {
      b.hitFlash -= dt;
      b.mesh.scale.setScalar(1 + b.hitFlash);
    } else b.mesh.scale.setScalar(1);
  }
  if (state.turboOrb && !state.turboOrb.taken) {
    state.turboOrb.mesh.rotation.y += dt * 2;
    state.turboOrb.mesh.position.y = state.turboOrb.y + Math.sin(state.time * 3) * 0.4;
  }
   for (const z of state.zombies) {
    if (z.hp <= 0) continue;
    z.mesh.position.set(z.x, z.y, z.z);
    z.mesh.rotation.y = Math.atan2(z.vx, z.vz || 0.01);
  }
  for (const pr of state.projectiles) {
    pr.mesh.position.set(pr.x, pr.y, pr.z);
    pr.mesh.rotation.y = Math.atan2(pr.vx, pr.vz);
  }
  if (potMesh) {
    const fire = potMesh.getObjectByName("fire");
    const fireHot = potMesh.getObjectByName("fireHot");
    if (fire) {
      fire.scale.y = 1 + Math.sin(state.time * 12) * 0.15;
      fire.rotation.y += dt * 3;
    }
    if (fireHot) fireHot.scale.y = 1 + Math.sin(state.time * 14 + 1) * 0.2;
  }
  playerGlow.position.set(p.x, p.y + 0.5, p.z);
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
  const land = BIOMES[state.biome].land;
  const turbo = state.turboTimer > 0;
  if (turbo) state.turboTimer -= dt;

  let accel = land ? (state.inVan ? 28 : 22) : 18;
  let maxSpeed = land ? (state.inVan ? 16 : 9) : 9.5;
  if (turbo) {
    accel *= 2.4;
    maxSpeed *= 2.6;
  }
  const drag = state.inVan ? 0.92 : 0.9;

  const camYaw = state.cam.yaw + Math.PI;
  const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
  const up = new THREE.Vector3(0, 1, 0);
  const wish = new THREE.Vector3();
  wish.addScaledVector(right, ix);
  if (land || state.inVan) {
    wish.addScaledVector(forward, -iy);
    wish.y = 0;
  } else {
    wish.addScaledVector(forward, -iy * 0.75);
    wish.addScaledVector(up, -iy * 0.85);
  }
  if (wish.lengthSq() > 1) wish.normalize();

  if (state.inVan && state.van) {
    state.van.yaw = Math.atan2(wish.x || Math.sin(state.van.yaw), wish.z || Math.cos(state.van.yaw));
    if (wish.lengthSq() > 0.01) {
      p.vx += wish.x * accel * dt;
      p.vz += wish.z * accel * dt;
    }
    p.vx *= Math.pow(drag, dt * 60);
    p.vz *= Math.pow(drag, dt * 60);
    p.vy = 0;
    const spd = Math.hypot(p.vx, p.vz);
    if (spd > maxSpeed) {
      p.vx = (p.vx / spd) * maxSpeed;
      p.vz = (p.vz / spd) * maxSpeed;
    }
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.y = 1.6;
    state.van.x = p.x;
    state.van.z = p.z;
    state.van.yaw = Math.hypot(p.vx, p.vz) > 0.4 ? Math.atan2(p.vx, p.vz) : state.van.yaw;
    p.yaw = state.van.yaw;
  } else {
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
    if (land) {
      p.y = 1.6;
      p.vy = 0;
    } else {
      p.y = Math.max(1.4, Math.min(22, p.y));
    }
    if (Math.hypot(p.vx, p.vz) > 0.4) p.yaw = Math.atan2(p.vx, p.vz);
  }

  p.x = Math.max(-HALF + 2, Math.min(HALF - 2, p.x));
  p.z = Math.max(-HALF + 2, Math.min(HALF - 2, p.z));
  p.bob += dt * 4;
  if (p.catchFlash > 0) p.catchFlash -= dt;
  if (p.invuln > 0) p.invuln -= dt;
  if (state.portalCd > 0) state.portalCd -= dt;

  if (!land && Math.hypot(p.vx, p.vy, p.vz) > 2 && Math.random() < dt * 7) {
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
      burst(item.x, item.y, item.z, item.kind === "diamond" ? 0x7ee0ff : 0xfff8d0);
      setTimeout(() => {
        item.taken = false;
        item.mesh.visible = true;
        item.x = rand(-HALF + 5, HALF - 5);
        item.y = land ? rand(0.8, 1.6) : rand(1.2, 12);
        item.z = rand(-HALF + 5, HALF - 5);
      }, 6000 + Math.random() * 4000);
    }
  }

  if (state.turboOrb && !state.turboOrb.taken) {
    if (dist3(p.x, p.y, p.z, state.turboOrb.x, state.turboOrb.y, state.turboOrb.z) < 2.8) {
      state.turboOrb.taken = true;
      state.hasTurbo = true;
      state.turboOrb.mesh.visible = false;
      state.turboTimer = 8;
      showToast("Rainbow turbo!");
      updateWeaponUI();
    }
  }

  if (state.portalCd <= 0 && !state.inVan) {
    for (const portal of state.portals) {
      if (dist3(p.x, p.y, p.z, portal.x, portal.y, portal.z) < 3.2) {
        enterBiome(portal.to);
        break;
      }
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

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const pr = state.projectiles[i];
    pr.life -= dt;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.z += pr.vz * dt;
    let dead = pr.life <= 0;
    if (state.boss && !state.bossDefeated && dist3(pr.x, pr.y, pr.z, state.boss.x, state.boss.y, state.boss.z) < 5) {
      damageBoss(pr.dmg);
      dead = true;
    }
    for (const z of state.zombies) {
      if (z.hp <= 0) continue;
      if (dist3(pr.x, pr.y, pr.z, z.x, z.y, z.z) < 2.2) {
        z.hp -= pr.kind === "darrow" ? 3 : 2;
        burst(z.x, z.y, z.z, 0x7dff7a);
        if (z.hp <= 0) z.mesh.visible = false;
        dead = true;
      }
    }
    if (dead) {
      root.remove(pr.mesh);
      state.projectiles.splice(i, 1);
    }
  }
  checkZombiesCleared();

  // Silly ultra-fast zombies
  if (state.biome === "zombie") {
    for (const z of state.zombies) {
      if (z.hp <= 0) continue;
      const dx = p.x - z.x;
      const dy = p.y - z.y;
      const dz = p.z - z.z;
      const d = Math.hypot(dx, dy, dz) || 1;
      const spd = state.hasTurbo && state.turboTimer > 0 ? 11 : 16;
      z.vx = (dx / d) * spd;
      z.vy = (dy / d) * spd * 0.6;
      z.vz = (dz / d) * spd;
      z.x += z.vx * dt;
      z.y += z.vy * dt;
      z.z += z.vz * dt;
      if (d < 2.2) softHurt(1);
    }
  }

  if (state.boss && !state.bossDefeated) {
    const b = state.boss;
    if (dist3(p.x, p.y, p.z, b.x, b.y, b.z) < 5.5) softHurt(1);
  }

  const pot = state.cookPot;
  if (pot.cooking > 0) pot.cooking -= dt;
  if (pot.smoke > 0) pot.smoke -= dt;

  if (state.catchCd > 0) state.catchCd -= dt;
  if (state.cookCd > 0) state.cookCd -= dt;
  if (state.attackCd > 0) state.attackCd -= dt;
  if (state.craftCd > 0) state.craftCd -= dt;

  if ((state.input.catch || state.keys.Space) && state.catchCd <= 0) {
    tryCatch();
    state.catchCd = 0.35;
    state.input.catch = false;
  } else if (state.input.catch) state.input.catch = false;

  if ((state.input.cook || state.keys.KeyE) && state.cookCd <= 0) {
    tryAction();
    state.cookCd = 0.45;
    state.input.cook = false;
  } else if (state.input.cook) state.input.cook = false;

  if ((state.input.attack || state.keys.KeyF) && state.attackCd <= 0) {
    tryAttack();
    state.attackCd = 0.35;
    state.input.attack = false;
  } else if (state.input.attack) state.input.attack = false;

  if ((state.input.craft || state.keys.KeyC) && state.craftCd <= 0) {
    tryCraft();
    state.craftCd = 0.4;
    state.input.craft = false;
  } else if (state.input.craft) state.input.craft = false;

  if (p.invuln <= 0) {
    for (const c of state.coral) {
      if (dist3(p.x, p.y, p.z, c.x, c.h * 0.4, c.z) < Math.max(1.2, c.w)) {
        p.vx *= -0.4;
        p.vy *= -0.4;
        p.vz *= -0.4;
        p.invuln = 0.35;
        break;
      }
    }
  }

  if (potMesh) {
    const nearPot = dist3(p.x, p.y, p.z, pot.x, pot.y + 1.2, pot.z) < 3.8;
    btnCook.style.opacity = nearPot && state.inv.fish > 0 ? "1" : "0.7";
    const glow = potMesh.getObjectByName("nearGlow");
    if (glow) glow.visible = nearPot;
  } else {
    btnCook.style.opacity = "0.75";
  }

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
let potMesh = null;

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (state.ready) update(dt);
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

  playerMesh = makePlayerMesh();
  buildBiome("ocean");
  updateHearts();
  updateInventoryUI();
  updateWeaponUI();
  state.ready = true;
  state.playing = false;
  window.__RIO = state;

  loadingEl.classList.add("hidden");
  titleScreen.classList.remove("hidden");

  if (/[?&]play=1\b/.test(location.search)) startGame();
  if (/[?&]biome=(\w+)/.test(location.search)) {
    const m = location.search.match(/[?&]biome=(\w+)/);
    if (m && BIOMES[m[1]]) {
      if (!state.playing) startGame();
      enterBiome(m[1]);
    }
  }
}

boot();

["pointerdown", "keydown"].forEach((ev) => {
  window.addEventListener(ev, () => {
    if (state.playing) hintEl.classList.add("hidden");
  });
});
