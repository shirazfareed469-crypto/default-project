/* ==========================================================================
   Sohail & Shiraz — ambient background

   Three layers, bottom to top, all on one fixed canvas behind the page:

     1. Fluid gradient mesh  — three huge, very slow, very soft colour clouds.
     2. Drifting lights      — bright glowing orbs that wander the whole page.
     3. Constellation        — particles plus distance-faded links, and the
                               cursor threads itself into the web.

   Because the canvas is position:fixed, all three cover every section at every
   scroll position. Adding <canvas id="bgMesh"> + this script to any other page
   is all it takes to get the same treatment there.

   Palette comes from the stylesheet's --bgm-* tokens (as "r, g, b" triplets),
   so switching themes recolours the layer without touching this file.

   Performance notes
   -----------------
   • Transparent canvas, clearRect once per frame — the page's own gradient is
     left alone and simply shows through.
   • Every gradient in the scene is a pre-rendered sprite blitted with drawImage.
     Nothing is rasterised per frame.
   • Constellation links are grouped into 12 alpha buckets, so a frame costs 12
     stroke() calls instead of one per segment.
   • Distance is only square-rooted for pairs close enough to connect.
   • Allocation-free in the steady state — every array is reused.
   • Static single frame under prefers-reduced-motion, paused on a hidden tab,
     and a reduced budget on Save-Data / low-memory devices.
   ========================================================================== */
(function () {
  "use strict";

  var canvas = document.getElementById("bgMesh");
  if (!canvas) return;

  var ctx = canvas.getContext("2d", { desynchronized: true }) || canvas.getContext("2d");
  if (!ctx) return;

  var TAU = Math.PI * 2;
  var root = document.documentElement;
  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ------------------------------------------------------------- tuning --- */

  var CFG = {
    maxDpr: 1.75,          // cap the backing store; 3x phones are not worth it
    perPx: 1 / 38000,      // constellation particles per CSS pixel of area
    minCount: 22,
    maxCount: 72,
    link: 138,             // px — farthest two particles may be and still connect
    drift: 0.13,           // px per 16.7 ms of idle drift
    pointer: 150,          // px — cursor influence radius
    push: 0.55,            // repulsion strength
    margin: 12,            // px of off-screen slack before wrapping

    lightPerPx: 1 / 130000,
    lightMin: 5,
    lightMax: 12,
    lightDrift: 0.26       // px per 16.7 ms at the slow end
  };

  var LEVELS = 12;
  var buckets = [];
  var LINKS = new Array(LEVELS);
  for (var n = 0; n < LEVELS; n++) {
    buckets.push([]);
    LINKS[n] = "rgba(0, 0, 0, 0)";
  }

  var DOTS = ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"];

  var MESH = [
    { x: 0.20, y: 0.26, r: 0.34, ax: 0.09, ay: 0.07, vx: 0.020, vy: 0.016, ph: 0.0, rgb: "255, 45, 117" },
    { x: 0.80, y: 0.22, r: 0.30, ax: 0.07, ay: 0.09, vx: -0.016, vy: 0.022, ph: 2.1, rgb: "255, 138, 0" },
    { x: 0.56, y: 0.82, r: 0.32, ax: 0.10, ay: 0.06, vx: 0.013, vy: -0.018, ph: 4.2, rgb: "255, 210, 63" }
  ];

  var sprites = [];        // gradient mesh, one per MESH entry
  var glowSprite = null;   // soft halo that follows the cursor
  var halos = [];          // wide, soft part of each light
  var cores = [];          // tight, hot centre of each light
  var strength = 1;        // overall mesh/dot strength
  var lightStrength = 1;   // overall brightness of the drifting lights

  /* ---------------------------------------------------------------- state --- */

  var W = 0, H = 0, dpr = 1, raf = 0, last = 0, clock = 0, scale = 1;
  var particles = [];
  var lights = [];
  var pointer = { x: -1e4, y: -1e4, active: false };
  var running = false;

  /* -------------------------------------------------------------- sprites --- */

  // Every sprite is the same shape, so they share one factory: a radial
  // gradient described by [offset, alpha] stops baked into a small canvas.
  function makeSprite(rgb, stops, size) {
    var sprite = document.createElement("canvas");
    sprite.width = sprite.height = size;

    var g = sprite.getContext("2d");
    var half = size / 2;
    var grad = g.createRadialGradient(half, half, 0, half, half, half);

    for (var i = 0; i < stops.length; i++) {
      grad.addColorStop(stops[i][0], "rgba(" + rgb + ", " + stops[i][1].toFixed(4) + ")");
    }

    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return sprite;
  }

  function softStops(peak) {
    return [[0, peak], [0.45, peak * 0.32], [1, 0]];
  }

  // Relative alphas; the absolute brightness is applied with globalAlpha.
  var HALO_STOPS = [[0, 1], [0.42, 0.30], [1, 0]];
  var CORE_STOPS = [[0, 1], [0.16, 0.58], [0.40, 0.13], [1, 0]];

  /* -------------------------------------------------------------- palette --- */

  function readPalette() {
    var cs = window.getComputedStyle(root);
    var get = function (name, fallback) {
      var value = cs.getPropertyValue(name);
      return (value && value.trim()) || fallback;
    };

    strength = parseFloat(get("--bgm-strength", "1")) || 1;
    lightStrength = parseFloat(get("--bgm-light-strength", "1")) || 1;

    MESH[0].rgb = get("--bgm-m1", "255, 45, 117");
    MESH[1].rgb = get("--bgm-m2", "255, 138, 0");
    MESH[2].rgb = get("--bgm-m3", "255, 210, 63");

    var link = get("--bgm-link", "214, 60, 110");
    var dot = get("--bgm-dot", "219, 39, 105");
    var dot2 = get("--bgm-dot-2", "234, 120, 20");

    // Link alpha climbs across the buckets — bucket 11 is the nearest pair.
    var linkPeak = 0.42 * strength;
    for (var i = 0; i < LEVELS; i++) {
      LINKS[i] = "rgba(" + link + ", " + (linkPeak * (i + 1) / LEVELS).toFixed(3) + ")";
    }

    DOTS[0] = "rgba(" + dot + ", " + (0.9 * strength).toFixed(3) + ")";
    DOTS[1] = "rgba(" + dot2 + ", " + (0.9 * strength).toFixed(3) + ")";

    var meshSprites = [MESH[0].rgb, MESH[1].rgb, MESH[2].rgb];
    for (var m = 0; m < meshSprites.length; m++) {
      sprites[m] = makeSprite(meshSprites[m], softStops(0.30 * strength), 192);
    }

    glowSprite = makeSprite(link, softStops(0.22 * strength), 128);

    var lit = [
      get("--bgm-light-1", "255, 122, 89"),
      get("--bgm-light-2", "255, 214, 102"),
      get("--bgm-light-3", "255, 64, 129")
    ];

    for (var k = 0; k < lit.length; k++) {
      halos[k] = makeSprite(lit[k], HALO_STOPS, 192);
      cores[k] = makeSprite(lit[k], CORE_STOPS, 128);
    }
  }

  /* ------------------------------------------------------------ particles --- */

  function budget() {
    var count = Math.round(W * H * CFG.perPx) * (lowPower() ? 0.6 : 1);
    return clamp(count, CFG.minCount, CFG.maxCount);
  }

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function lowPower() {
    if (navigator.connection && navigator.connection.saveData) return true;
    if (typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4) return true;
    return false;
  }

  function makeParticle() {
    var angle = Math.random() * TAU;
    var speed = (0.4 + Math.random() * 0.6) * CFG.drift;

    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      bx: Math.cos(angle) * speed,   // idle velocity, restored by the spring
      by: Math.sin(angle) * speed,
      r: 0.9 + Math.random() * 1.1,
      tone: Math.random() < 0.7 ? 0 : 1
    };
  }

  function seed() {
    var want = budget();

    while (particles.length > want) particles.pop();
    while (particles.length < want) particles.push(makeParticle());

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.x > W) p.x = Math.random() * W;
      if (p.y > H) p.y = Math.random() * H;
    }
  }

  /* --------------------------------------------------------------- lights --- */

  function makeLight() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      size: 90 + Math.random() * 170,   // radius at scale 1
      dir: Math.random() * TAU,
      speed: CFG.lightDrift * (1 + Math.random() * 1.8),
      turn: 0.25 + Math.random() * 0.45, // how fast the heading wanders
      wob: 0.5 + Math.random() * 0.8,    // idle shimmer
      pulse: 0.35 + Math.random() * 0.45,
      phase: Math.random() * TAU,
      tint: (Math.random() * 3) | 0
    };
  }

  function seedLights() {
    var want = clamp(Math.round(W * H * CFG.lightPerPx) * (lowPower() ? 0.6 : 1),
                     CFG.lightMin, CFG.lightMax);

    while (lights.length > want) lights.pop();
    while (lights.length < want) lights.push(makeLight());

    for (var i = 0; i < lights.length; i++) {
      var l = lights[i];
      if (l.x > W) l.x = Math.random() * W;
      if (l.y > H) l.y = Math.random() * H;
    }
  }

  function updateLights(dt) {
    for (var i = 0; i < lights.length; i++) {
      var l = lights[i];
      var r = l.size * scale;
      var pad = r * 0.6;

      // The heading slowly wanders, so a light floats a curve rather than
      // travelling in a straight line and bouncing off the walls.
      l.dir += Math.sin(clock * l.turn + l.phase) * 0.006 * dt;

      l.x += Math.cos(l.dir) * l.speed * dt + Math.sin(clock * l.wob + l.phase) * 0.4 * dt;
      l.y += Math.sin(l.dir) * l.speed * dt + Math.cos(clock * l.wob * 0.8 + l.phase) * 0.4 * dt;

      // Reflection instead of wrapping: a light is too big for a pop at the
      // edge to go unnoticed, and this keeps the count on screen steady.
      if (l.x < -pad) { l.x = -pad; l.dir = Math.PI - l.dir; }
      else if (l.x > W + pad) { l.x = W + pad; l.dir = Math.PI - l.dir; }

      if (l.y < -pad) { l.y = -pad; l.dir = -l.dir; }
      else if (l.y > H + pad) { l.y = H + pad; l.dir = -l.dir; }
    }
  }

  /* --------------------------------------------------------------- sizing --- */

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width || window.innerWidth));
    H = Math.max(1, Math.round(rect.height || window.innerHeight));
    dpr = Math.min(window.devicePixelRatio || 1, CFG.maxDpr);
    scale = clamp(Math.min(W, H) / 800, 0.55, 1.35);

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // draw in CSS pixels

    seed();
    seedLights();

    // A hidden tab gets no rAF, so leave an honest frame behind.
    if (!running) draw();
  }

  /* ----------------------------------------------------------------- draw --- */

  function draw() {
    var i, j, k;

    ctx.clearRect(0, 0, W, H);

    /* 1. Fluid gradient mesh ---------------------------------------------- */
    var span = Math.max(W, H);
    ctx.globalCompositeOperation = "lighter";

    for (i = 0; i < MESH.length; i++) {
      var b = MESH[i];
      var bx = (b.x + Math.sin(clock * b.vx + b.ph) * b.ax) * W;
      var by = (b.y + Math.cos(clock * b.vy + b.ph) * b.ay) * H;
      var br = b.r * span;
      ctx.drawImage(sprites[i], bx - br, by - br, br * 2, br * 2);
    }

    /* 2. Drifting lights -------------------------------------------------- */
    // Halo first, then a tighter, brighter core at ~1/3 the radius. Layering
    // the two is what reads as a light rather than a blob of colour, and it
    // costs nothing extra because both are pre-rendered.
    for (i = 0; i < lights.length; i++) {
      var l = lights[i];

      var pulse = 0.72 + 0.28 * Math.sin(clock * l.pulse + l.phase);
      var halo = l.size * scale * (1 + 0.07 * Math.sin(clock * l.pulse * 0.63 + l.phase));
      var core = halo * 0.34;

      ctx.globalAlpha = clamp(0.40 * lightStrength * pulse, 0, 1);
      ctx.drawImage(halos[l.tint], l.x - halo, l.y - halo, halo * 2, halo * 2);

      ctx.globalAlpha = clamp(0.95 * lightStrength * pulse, 0, 1);
      ctx.drawImage(cores[l.tint], l.x - core, l.y - core, core * 2, core * 2);
    }

    ctx.globalAlpha = 1;

    /* 3. Constellation links ---------------------------------------------- */
    for (i = 0; i < LEVELS; i++) buckets[i].length = 0;

    var LINK = CFG.link;
    var LINK2 = LINK * LINK;
    var brightest = LEVELS - 1;

    for (i = 0; i < particles.length; i++) {
      var a = particles[i];

      for (j = i + 1; j < particles.length; j++) {
        var o = particles[j];
        var dx = a.x - o.x;
        var dy = a.y - o.y;
        var d2 = dx * dx + dy * dy;

        if (d2 > LINK2) continue;

        // Only pairs that actually connect pay for a square root.
        var level = ((1 - Math.sqrt(d2) / LINK) * LEVELS) | 0;
        buckets[level > brightest ? brightest : level].push(a.x, a.y, o.x, o.y);
      }

      // Thread the cursor into the constellation.
      if (pointer.active) {
        var px = a.x - pointer.x;
        var py = a.y - pointer.y;
        var reach = LINK * 1.3;
        var pd2 = px * px + py * py;
        if (pd2 < reach * reach) buckets[brightest].push(pointer.x, pointer.y, a.x, a.y);
      }
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 1;

    for (i = 0; i < LEVELS; i++) {
      var seg = buckets[i];
      if (!seg.length) continue;
      ctx.strokeStyle = LINKS[i];
      ctx.beginPath();
      for (k = 0; k < seg.length; k += 4) {
        ctx.moveTo(seg[k], seg[k + 1]);
        ctx.lineTo(seg[k + 2], seg[k + 3]);
      }
      ctx.stroke();
    }

    /* 4. Particles — one batched path per tone ---------------------------- */
    for (var tone = 0; tone < DOTS.length; tone++) {
      var any = false;
      ctx.beginPath();
      for (i = 0; i < particles.length; i++) {
        var p = particles[i];
        if (p.tone !== tone) continue;
        ctx.moveTo(p.x + p.r, p.y);
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        any = true;
      }
      if (!any) continue;
      ctx.fillStyle = DOTS[tone];
      ctx.fill();
    }

    if (pointer.active) {
      var g = 130;
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(glowSprite, pointer.x - g, pointer.y - g, g * 2, g * 2);
    }

    ctx.globalCompositeOperation = "source-over";
  }

  /* --------------------------------------------------------------- update --- */

  function update(dt) {
    var active = pointer.active;
    var reach = CFG.pointer;
    var reach2 = reach * reach;
    var margin = CFG.margin;

    updateLights(dt);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      if (active) {
        var dx = p.x - pointer.x;
        var dy = p.y - pointer.y;
        var d2 = dx * dx + dy * dy;

        if (d2 < reach2 && d2 > 0.0001) {
          var d = Math.sqrt(d2);
          var force = (1 - d / reach) * CFG.push * dt;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
      }

      // Friction bleeds the push away, then the idle velocity pulls the
      // particle back — cheaper than re-seeding and it never accumulates.
      p.vx += (p.bx - p.vx) * 0.02 * dt;
      p.vy += (p.by - p.vy) * 0.02 * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Toroidal wrap keeps the density even with no respawn bookkeeping.
      if (p.x < -margin) p.x = W + margin;
      else if (p.x > W + margin) p.x = -margin;

      if (p.y < -margin) p.y = H + margin;
      else if (p.y > H + margin) p.y = -margin;
    }
  }

  /* ---------------------------------------------------------------- loop --- */

  function frame(now) {
    raf = window.requestAnimationFrame(frame);

    // Clamped so a tab waking up cannot fling everything across the screen.
    var dt = last ? Math.min(2.5, (now - last) / 16.6667) : 1;
    last = now;
    clock += dt / 60;

    update(dt);
    draw();
  }

  function start() {
    if (running || reduceQuery.matches || document.hidden) return;
    running = true;
    last = 0;
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    if (!running) return;
    running = false;
    window.cancelAnimationFrame(raf);
    raf = 0;
  }

  /* ------------------------------------------------------------ listeners --- */

  // rAF is paused in a hidden tab, so fall back to a timer rather than
  // dropping the work on the floor.
  function soon(fn) {
    if (document.hidden) window.setTimeout(fn, 0);
    else window.requestAnimationFrame(fn);
  }

  var resizeQueued = false;
  function onResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    soon(function () {
      resizeQueued = false;
      resize();
    });
  }

  function onPointerMove(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }

  function onPointerOut() {
    pointer.active = false;
  }

  function onVisibility() {
    if (document.hidden) stop();
    else start();
  }

  function onMotionChange() {
    if (reduceQuery.matches) {
      stop();
      draw();          // one honest static frame
    } else {
      start();
    }
  }

  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("orientationchange", onResize, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onPointerMove, { passive: true });
  window.addEventListener("pointerleave", onPointerOut, { passive: true });
  window.addEventListener("blur", onPointerOut, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);

  if (reduceQuery.addEventListener) reduceQuery.addEventListener("change", onMotionChange);
  else if (reduceQuery.addListener) reduceQuery.addListener(onMotionChange);

  /* ----------------------------------------------------------- bootstrap --- */

  readPalette();
  resize();
  if (reduceQuery.matches) draw();
  else start();

  window.__bgMesh = {
    refresh: function () {
      readPalette();
      draw();
    },
    destroy: function () {
      stop();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerMove);
      window.removeEventListener("pointerleave", onPointerOut);
      window.removeEventListener("blur", onPointerOut);
      document.removeEventListener("visibilitychange", onVisibility);
      if (reduceQuery.removeEventListener) reduceQuery.removeEventListener("change", onMotionChange);
      else if (reduceQuery.removeListener) reduceQuery.removeListener(onMotionChange);
      particles.length = 0;
      lights.length = 0;
      sprites.length = 0;
    }
  };
})();
