// ===============================
// Memory Archive — app.js (FULL)
// Map + Chapters + Gallery + Lightbox + Surprise
// Celebrate (confetti + fireworks)
// Birthday letter overlay
// Mini-game (match pairs)
// Daily French (15 words, FR/EN, word of the day)
// ===============================

// ====== Personalization ======
const HER_NAME = "Leila씨";
const herNameEl = document.getElementById("herName");
if (herNameEl) herNameEl.textContent = HER_NAME;

// ====== State ======
let chapters = [];
let active = null;

// Lightbox state
let lightboxOpen = false;
let lightboxIndex = -1;          // index in FULL active media list
let lightboxFiltered = null;     // array of indices (in FULL list) currently displayed in gallery
let lightboxFilteredPos = -1;    // position in lightboxFiltered

// ====== Helpers ======
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isVideo(src) {
  return /\.(mp4|webm|mov)$/i.test(src || "");
}

// Accept ["path.jpg", ...] OR [{src, tag}, ...]
function normalizeMediaList(list) {
  return (list || []).map((item) => {
    if (typeof item === "string") return { src: item, tag: "all" };
    return { src: item.src, tag: item.tag || "all" };
  });
}

// ===============================
// WOW FX: Aurora Burst (subtle colorful overlay)
// ===============================
function wowBurst(x = window.innerWidth / 2, y = window.innerHeight / 2) {
  let fx = document.getElementById("wowFx");
  if (!fx) {
    fx = document.createElement("div");
    fx.id = "wowFx";
    document.body.appendChild(fx);
  }

  fx.classList.add("show");

  // particles
  const n = 28;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("div");
    p.className = "wowParticle";

    const ang = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 220;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist;

    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty("--dx", `${dx}px`);
    p.style.setProperty("--dy", `${dy}px`);

    // pastel but vivid
    p.style.background = `hsla(${Math.floor(Math.random() * 360)}, 90%, 65%, 0.9)`;
    p.style.boxShadow = `0 0 18px hsla(${Math.floor(Math.random() * 360)}, 90%, 65%, 0.55)`;

    fx.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }

  // auto hide
  clearTimeout(fx._t);
  fx._t = setTimeout(() => fx.classList.remove("show"), 650);
}


// ===============================
// ====== Map (Leaflet) ======
// ===============================
const mapEl = document.getElementById("map");
let map = null;

if (mapEl && window.L) {
  map = L.map("map", { zoomControl: true }).setView([37.5665, 126.9780], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    detectRetina: false,
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 2,
  }).addTo(map);
}

function addPins() {
  if (!map) return;

  chapters.forEach((ch) => {
    if (!ch.coords) return;

    const marker = L.marker(ch.coords).addTo(map);
    marker.bindPopup(
      `<b>${ch.title || "Chapter"}</b><br>${ch.subtitle || ""}<br><i>Click to open</i>`
    );
    marker.on("click", () => openChapter(ch.id));
  });
}

// ===============================
// ====== Chapter list ======
// ===============================
function renderChapterList() {
  const list = document.getElementById("chapterList");
  if (!list) return;

  list.innerHTML = "";

  chapters.forEach((ch) => {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `<div class="title">${ch.title || "Chapter"}</div>
                    <div class="sub">${ch.subtitle || ""}</div>`;
    el.addEventListener("click", () => openChapter(ch.id));
    list.appendChild(el);
  });
}

// ===============================
// ====== Gallery rendering (FILTER BY TAG) ======
// ===============================
function renderGallery(tag = "all") {
  if (!active) return;

  const gallery = document.getElementById("gallery");
  if (!gallery) return;

  gallery.innerHTML = "";

  const full = normalizeMediaList(active.photos);
  const fullIdx = full.map((_, i) => i);

  // choose indices to show (filtered)
  let shownIdx = fullIdx;
  if (tag && tag !== "all") {
    shownIdx = fullIdx.filter((i) => full[i].tag === tag);
  }

  // store for lightbox navigation to follow the *filtered* set
  lightboxFiltered = shownIdx;
  lightboxFilteredPos = -1;

  if (shownIdx.length === 0) {
    gallery.innerHTML = `
      <div style="grid-column:1/-1; color: var(--muted); padding: 8px 2px;">
        No media for this memory yet ✨
      </div>
    `;
    return;
  }

  shownIdx.slice(0, 250).forEach((i) => {
    const m = full[i];
    const wrap = document.createElement("div");
    wrap.className = "thumb";

    if (isVideo(m.src)) {
      wrap.innerHTML = `
        <video muted playsinline preload="metadata"
               style="width:100%; height:100%; object-fit:cover;">
          <source src="${m.src}">
        </video>
      `;
    } else {
      wrap.innerHTML = `<img loading="lazy" src="${m.src}" alt="">`;
    }

    wrap.onclick = () => openMediaAtFilteredIndex(i);
    gallery.appendChild(wrap);
  });
}

// ===============================
// ====== Open chapter ======
// ===============================
function openChapter(id) {
  active = chapters.find((c) => c.id === id);
  if (!active) return;

  // reset lightbox per chapter
  lightboxIndex = -1;
  lightboxFiltered = null;
  lightboxFilteredPos = -1;

  // Header
  const titleEl = document.getElementById("panelTitle");
  const subEl = document.getElementById("panelSubtitle");
  if (titleEl) titleEl.textContent = active.title || "Chapter";
  if (subEl) subEl.textContent = active.subtitle || "";

  // Choices (memories)
  const choices = document.getElementById("choices");
  if (choices) {
    choices.innerHTML = "";

    const btnPrimary = document.createElement("button");
    btnPrimary.className = "choiceBtn primary";
    btnPrimary.textContent = "Choose your memory 🎲";
    btnPrimary.onclick = () => showMemory(); // random
    choices.appendChild(btnPrimary);

    (active.memories || []).forEach((m) => {
      const b = document.createElement("button");
      b.className = "choiceBtn";
      b.textContent = m.label || "Memory";
      b.onclick = () => showMemory(m);
      choices.appendChild(b);
    });
  }

  // Default: show full album
  renderGallery("all");

  // Links
  const links = document.getElementById("chapterLinks");
  if (links) {
    links.innerHTML = "";
    if (active.fullAlbumUrl && String(active.fullAlbumUrl).trim().length > 0) {
      links.innerHTML = `Full album: <a href="${active.fullAlbumUrl}" target="_blank" rel="noopener">open</a>`;
    }
  }

  // Pan map
  if (map && active.coords) {
    map.setView(active.coords, active.zoom || 12, { animate: false });
  }

  // Hide memory box until chosen
  const memoryBox = document.getElementById("memoryBox");
  if (memoryBox) memoryBox.style.display = "none";
}

// ===============================
// ====== Memory box + filter ======
// ===============================
function showMemory(forced) {
  if (!active) return;

  const memoryBox = document.getElementById("memoryBox");
  const memoryText = document.getElementById("memoryText");
  const memoryImg = document.getElementById("memoryImg");
  if (!memoryBox || !memoryText || !memoryImg) return;

  const memories =
    active.memories ||
    [{ label: "Default", text: "Add memories in chapters.json ✨", tag: "all" }];

  const memory = forced || pickRandom(memories);

  const full = normalizeMediaList(active.photos);
  const tag = memory.tag || "all";

  // pick a random IMAGE from the same tag for the memory box (avoid video)
  const candidates = tag === "all" ? full : full.filter((m) => m.tag === tag);
  const onlyImgs = candidates.filter((m) => m.src && !isVideo(m.src));
  const pick = onlyImgs.length ? pickRandom(onlyImgs).src : null;

  memoryText.textContent = memory.text || "";

  if (pick) {
    memoryImg.src = pick;
    memoryImg.style.display = "block";
  } else {
    memoryImg.removeAttribute("src");
    memoryImg.style.display = "none";
  }

  memoryBox.style.display = "block";

  // IMPORTANT: filter gallery according to the memory tag
  renderGallery(tag);
}

// ===============================
// ====== Lightbox (supports image OR video) ======
// ===============================
function ensureLightboxMediaNodes() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;

  let vid = document.getElementById("lightboxVideo");
  if (!vid) {
    vid = document.createElement("video");
    vid.id = "lightboxVideo";
    vid.controls = true;
    vid.style.display = "none";
    lb.appendChild(vid);
  }
}

function openMediaAtFilteredIndex(fullIndex) {
  if (!active) return;
  const full = normalizeMediaList(active.photos);
  if (fullIndex < 0 || fullIndex >= full.length) return;

  lightboxOpen = true;
  lightboxIndex = fullIndex;

  if (Array.isArray(lightboxFiltered) && lightboxFiltered.length) {
    lightboxFilteredPos = lightboxFiltered.indexOf(fullIndex);
  } else {
    lightboxFiltered = null;
    lightboxFilteredPos = -1;
  }

  openMediaLightbox(full[fullIndex].src);
}

function stepLightbox(delta) {
  if (!lightboxOpen || !active) return;

  const full = normalizeMediaList(active.photos);
  if (!full.length) return;

  if (Array.isArray(lightboxFiltered) && lightboxFiltered.length) {
    if (lightboxFilteredPos === -1) {
      lightboxFilteredPos = lightboxFiltered.indexOf(lightboxIndex);
      if (lightboxFilteredPos === -1) lightboxFilteredPos = 0;
    }
    const n = lightboxFiltered.length;
    lightboxFilteredPos = (lightboxFilteredPos + delta + n) % n;
    lightboxIndex = lightboxFiltered[lightboxFilteredPos];
  } else {
    const n = full.length;
    lightboxIndex = (lightboxIndex + delta + n) % n;
  }

  openMediaLightbox(full[lightboxIndex].src);
}

function openMediaLightbox(src) {
  const lb = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  if (!lb || !img) return;

  ensureLightboxMediaNodes();
  const vid = document.getElementById("lightboxVideo");

  lb.classList.remove("show");

  if (isVideo(src)) {
    img.style.display = "none";
    if (vid) {
      vid.style.display = "block";
      vid.src = src;
      vid.currentTime = 0;
      vid.play().catch(() => {});
    }
  } else {
    if (vid) {
      vid.pause();
      vid.removeAttribute("src");
      vid.load();
      vid.style.display = "none";
    }
    img.style.display = "block";
    img.src = src;
  }

  requestAnimationFrame(() => lb.classList.add("show"));
}

function closeLightbox() {
  const lb = document.getElementById("lightbox");
  const vid = document.getElementById("lightboxVideo");
  const img = document.getElementById("lightboxImg");
  if (!lb) return;

  if (vid) {
    vid.pause();
    vid.removeAttribute("src");
    vid.load();
    vid.style.display = "none";
  }
  if (img) {
    img.removeAttribute("src");
    img.style.display = "block";
  }

  lb.classList.remove("show");
  lightboxOpen = false;
  lightboxFilteredPos = -1;
}

// close on background click
const lbEl = document.getElementById("lightbox");
if (lbEl) {
  lbEl.addEventListener("click", (e) => {
    if (e.target.id !== "lightbox") return;
    closeLightbox();
  });
}

// keyboard navigation
document.addEventListener("keydown", (e) => {
  if (!lightboxOpen) return;

  if (e.key === "Escape") {
    closeLightbox();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    stepLightbox(-1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    stepLightbox(1);
  }
});

// arrow buttons
const prevBtn = document.getElementById("lbPrev");
if (prevBtn) {
  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    stepLightbox(-1);
  });
}
const nextBtn = document.getElementById("lbNext");
if (nextBtn) {
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    stepLightbox(1);
  });
}

// ===============================
// ====== Surprise button ======
// ===============================
const surpriseBtn = document.getElementById("surpriseBtn");
if (surpriseBtn) {
  surpriseBtn.addEventListener("click", () => {
    if (!chapters.length) return;
    const ch = pickRandom(chapters);
    openChapter(ch.id);
    showMemory();
  });
}

// ===============================
// ====== Celebrate button (confetti + fireworks) ======
// ===============================
(function () {
  const btn = document.getElementById("celebrateBtn");
  if (!btn) return;

  let canvas = document.getElementById("fxCanvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "fxCanvas";
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "99999";
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext("2d");
  let W = 0, H = 0;

  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    W = Math.floor(window.innerWidth * dpr);
    H = Math.floor(window.innerHeight * dpr);
    canvas.width = W;
    canvas.height = H;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  const particles = [];
  const gravity = 0.12;

  function rand(min, max) { return min + Math.random() * (max - min); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  const shapes = ["rect", "circle", "tri"];

  function spawnConfettiBurst(x, y, count = 120) {
    for (let i = 0; i < count; i++) {
      const speed = rand(2.5, 7.5);
      const angle = rand(-Math.PI, 0);
      particles.push({
        kind: "confetti",
        x, y,
        vx: Math.cos(angle) * speed * rand(0.6, 1.2),
        vy: Math.sin(angle) * speed * rand(0.7, 1.4),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.18, 0.18),
        size: rand(4, 10),
        shape: pick(shapes),
        life: rand(70, 130),
        alpha: 1
      });
    }
  }

  function spawnFirework(x) {
    const targetY = rand(window.innerHeight * 0.15, window.innerHeight * 0.35);
    particles.push({
      kind: "rocket",
      x, y: window.innerHeight + 20,
      vx: rand(-0.6, 0.6),
      vy: rand(-10.5, -12.5),
      life: 999,
      targetY
    });
  }

  function explode(x, y) {
    const count = 90;
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(1.0, 5.6);
      particles.push({
        kind: "spark",
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        size: rand(1.2, 2.6),
        life: rand(40, 80),
        alpha: 1
      });
    }
    spawnConfettiBurst(x, y + 40, 70);
  }

  let running = false;

  function draw() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // no particles => stop
    if (!particles.length) {
      running = false;
      return;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      if (p.kind === "rocket") {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += gravity * 0.15;

        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();

        if (p.y <= p.targetY) {
          particles.splice(i, 1);
          explode(p.x, p.y);
          continue;
        }
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += gravity * (p.kind === "spark" ? 0.06 : 1);

        if (p.kind === "confetti") {
          p.rot += p.vr;
          p.vx *= 0.995;
          p.vy *= 0.995;
        } else if (p.kind === "spark") {
          p.vx *= 0.985;
          p.vy *= 0.985;
        }

        p.life -= 1;
        p.alpha = Math.max(0, Math.min(1, p.life / 60));
        if (p.life <= 0 || p.y > window.innerHeight + 80) {
          particles.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = p.alpha;

        if (p.kind === "confetti") {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = `hsl(${Math.floor((p.x + p.y) % 360)}, 85%, 60%)`;

          if (p.shape === "rect") {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          } else if (p.shape === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.35, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(0, -p.size * 0.5);
            ctx.lineTo(p.size * 0.45, p.size * 0.35);
            ctx.lineTo(-p.size * 0.45, p.size * 0.35);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }

        if (p.kind === "spark") {
          ctx.fillStyle = `hsla(${Math.floor((p.x * 2 + p.y) % 360)}, 90%, 65%, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.globalAlpha = 1;

    if (particles.length) {
      requestAnimationFrame(draw);
    } else {
      running = false;
    }
  }

  function celebrate() {
    const centerX = window.innerWidth / 2;
    spawnConfettiBurst(centerX, 40, 140);

    spawnFirework(window.innerWidth * 0.25);
    spawnFirework(window.innerWidth * 0.5);
    spawnFirework(window.innerWidth * 0.75);

    setTimeout(() => spawnConfettiBurst(window.innerWidth * 0.2, 60, 90), 220);
    setTimeout(() => spawnConfettiBurst(window.innerWidth * 0.8, 60, 90), 320);

    if (!running) {
      running = true;
      requestAnimationFrame(draw);
    }
  }

  btn.addEventListener("click", celebrate);
})();

// ===============================
// ===== Birthday letter overlay =====
// ===============================
(function () {
  const letterOverlay = document.getElementById("letterOverlay");
  const openCapsuleBtn = document.getElementById("openCapsuleBtn");

  if (letterOverlay) letterOverlay.style.display = "flex";

  if (openCapsuleBtn && letterOverlay) {
 openCapsuleBtn.addEventListener("click", (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  wowBurst(r.left + r.width / 2, r.top + r.height / 2);

  setTimeout(() => {
    letterOverlay.style.display = "none";
  }, 220);
});
  }
})();

// ===============================
// ===== Mini Game: Match the Memory =====
// ===============================
const MG = {
  icons: ["🗻", "♨️", "🍊", "🧗", "🍜", "🃏"],
  deck: [],
  first: null,
  lock: false,
  moves: 0,
  found: 0,
  totalPairs: 6,
};

function mgShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function mgUpdateStats() {
  const movesEl = document.getElementById("mgMoves");
  const foundEl = document.getElementById("mgFound");
  if (movesEl) movesEl.textContent = `Moves: ${MG.moves}`;
  if (foundEl) foundEl.textContent = `Found: ${MG.found}/${MG.totalPairs}`;
}

function mgSetNote(text) {
  const note = document.getElementById("mgNote");
  if (note) note.textContent = text;
}

function mgRender() {
  const grid = document.getElementById("mgGrid");
  if (!grid) return;
  grid.innerHTML = "";

  MG.deck.forEach((card) => {
    const el = document.createElement("div");
    el.className = "mgCard";
    el.dataset.id = String(card.id);

    const face = document.createElement("div");
    face.className = "mgFace";
    face.textContent = card.icon;
    el.appendChild(face);

    el.addEventListener("click", () => mgFlip(el));
    grid.appendChild(el);
  });
}

function mgBuildDeck() {
  MG.deck = mgShuffle([...MG.icons, ...MG.icons]).map((icon, i) => ({
    id: i,
    icon,
    matched: false,
  }));
  MG.first = null;
  MG.lock = false;
  MG.moves = 0;
  MG.found = 0;
  mgRender();
  mgUpdateStats();
  mgSetNote("Find all pairs to unlock a secret message ✨");
}

function mgReveal(el) { el.classList.add("revealed"); }
function mgHide(el) { el.classList.remove("revealed"); }
function mgMarkMatched(a, b) { a.classList.add("matched"); b.classList.add("matched"); }

function mgFlip(el) {
  if (MG.lock) return;
  if (el.classList.contains("matched")) return;
  if (el.classList.contains("revealed")) return;

  const id = Number(el.dataset.id);
  const card = MG.deck.find((c) => c.id === id);
  if (!card) return;

  mgReveal(el);

  if (!MG.first) {
    MG.first = { el, card };
    return;
  }

  MG.moves += 1;
  mgUpdateStats();

  const second = { el, card };
  MG.lock = true;

  if (MG.first.card.icon === second.card.icon) {
    mgMarkMatched(MG.first.el, second.el);
    MG.found += 1;
    mgUpdateStats();

    MG.first = null;
    MG.lock = false;

    if (MG.found === MG.totalPairs) {
      mgSetNote("Unlocked: Leila씨, you’re officially a core memory 🫶✨");
    } else {
      mgSetNote("Nice. Your brain just did a little dopamine high-five.");
    }
  } else {
    mgSetNote("Not a match. The universe remains chaotic.");
    setTimeout(() => {
      mgHide(MG.first.el);
      mgHide(second.el);
      MG.first = null;
      MG.lock = false;
    }, 650);
  }
}

const mgResetBtn = document.getElementById("mgReset");
if (mgResetBtn) mgResetBtn.addEventListener("click", mgBuildDeck);
mgBuildDeck();

// ===============================
// ===== Daily French (15 words, FR/EN, word of the day) =====
// ===============================
(function dailyFrenchBoot() {
  const DAILY_FRENCH = [
    { fr: "randonnée", en: "hike", ex_fr: "On s’est rencontrés pendant une randonnée.", ex_en: "We met during a hike." },
    { fr: "sommet", en: "summit / peak", ex_fr: "Le sommet valait l’effort.", ex_en: "The summit was worth the effort." },
    { fr: "paysage", en: "scenery / landscape", ex_fr: "Le paysage était incroyable.", ex_en: "The scenery was incredible." },
    { fr: "quartier", en: "neighborhood", ex_fr: "On a exploré un nouveau quartier.", ex_en: "We explored a new neighborhood." },
    { fr: "métro", en: "subway", ex_fr: "On a pris le métro pour rentrer.", ex_en: "We took the subway to go back." },
    { fr: "marché", en: "market", ex_fr: "On a acheté des snacks au marché.", ex_en: "We bought snacks at the market." },
    { fr: "jeu", en: "game", ex_fr: "Nous avons joué à des jeux.", ex_en: "We played games." },
    { fr: "pique-nique", en: "picnic", ex_fr: "On a improvisé un pique-nique.", ex_en: "We improvised a picnic." },
    { fr: "pluie", en: "rain", ex_fr: "La pluie est arrivée d’un coup.", ex_en: "The rain came suddenly." },
    { fr: "coucher de soleil", en: "sunset", ex_fr: "Le coucher de soleil était parfait.", ex_en: "The sunset was perfect." },
    { fr: "photo", en: "photo", ex_fr: "Cette photo me fait sourire.", ex_en: "This photo makes me smile." },
    { fr: "souvenir", en: "memory", ex_fr: "Ce souvenir est précieux.", ex_en: "This memory is precious." },
    { fr: "mandarine", en: "tangerine", ex_fr: "Nous avons cueilli des mandarines.", ex_en: "we picked tangerines." },
    { fr: "la mer", en: "the sea", ex_fr: "On s'est arrêté au bord de mer.", ex_en: "We stopped by the sea." },
    { fr: "retrouvailles", en: "reunion / meeting again", ex_fr: "J’espère nos retrouvailles bientôt.", ex_en: "I hope we meet again soon." }
  ];

  function getUtcDayNumber() {
    const now = new Date();
    const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Math.floor(utcMidnight / 86400000);
  }

  function renderDailyFrench(dayNumber) {
    const wordEl = document.getElementById("dfWord");
    const meaningEl = document.getElementById("dfMeaning");
    const exFrEl = document.getElementById("dfExampleFr");
    const exEnEl = document.getElementById("dfExampleEn");
    const metaEl = document.getElementById("dfMeta");

    if (!wordEl || !meaningEl || !exFrEl || !exEnEl || !metaEl) return;

    const i = dayNumber % DAILY_FRENCH.length;
    const item = DAILY_FRENCH[i];

    wordEl.textContent = item.fr;
    meaningEl.textContent = item.en;
    exFrEl.textContent = item.ex_fr;
    exEnEl.textContent = item.ex_en;

    metaEl.textContent = `French word of the day • ${i + 1} / ${DAILY_FRENCH.length}`;
  }

  function initDailyFrenchSafe() {
    renderDailyFrench(getUtcDayNumber());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDailyFrenchSafe);
  } else {
    initDailyFrenchSafe();
  }
})();

// ===============================
// ====== Init (fetch chapters.json) ======
// ===============================
async function init() {
  try {
    const res = await fetch("assets/data/chapters.json", { cache: "no-store" });
    chapters = await res.json();

    renderChapterList();
    addPins();

 
  } catch (err) {
    console.error("Failed to load chapters.json", err);
  }
}

init();
