/* ==========================================================================
   Sohail & Shiraz — site interactions
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Mobile navigation ---------- */
  var header = document.getElementById("siteHeader");
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("primaryNav");

  function closeNav() {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });

    // Close after tapping a link
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeNav();
    });

    // Close on Escape
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        closeNav();
        toggle.focus();
      }
    });

    // Close when clicking outside
    document.addEventListener("click", function (event) {
      if (!nav.classList.contains("is-open")) return;
      if (!nav.contains(event.target) && !toggle.contains(event.target)) closeNav();
    });

    // Reset when resizing up to desktop
    window.addEventListener("resize", function () {
      if (window.innerWidth > 780) closeNav();
    });
  }

  /* ---------- Header state + reading progress ---------- */
  var progress = document.getElementById("scrollProgress");
  var ticking = false;

  function updateProgress() {
    if (!progress) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = Math.min(100, Math.max(0, pct)) + "%";
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
      updateProgress();
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  var revealItems = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Animation libraries — only present if the CDN delivered them.
  var gsapLib = window.gsap;
  var ScrollTriggerLib = window.ScrollTrigger;
  var MotionLib = window.Motion;
  var useGsap = !!(gsapLib && ScrollTriggerLib && !reduceMotion);

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(function (el) { el.classList.add("is-visible"); });
  } else if (!useGsap) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("is-visible");
        observer.unobserve(el);

        // Stagger the entrance, then drop the delay so hover stays instant.
        var delay = parseFloat(el.style.transitionDelay) || 0;
        window.setTimeout(function () { el.style.transitionDelay = "0ms"; }, delay + 800);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

    revealItems.forEach(function (el) {
      // Stagger siblings within their own group (cards, hero stack, …)
      var group = el.parentElement
        ? Array.prototype.slice.call(el.parentElement.children).filter(function (node) {
            return node.classList && node.classList.contains("reveal");
          })
        : [];
      var position = group.indexOf(el);
      el.style.transitionDelay = (position > 0 ? Math.min(position, 5) * 90 : 0) + "ms";
      observer.observe(el);
    });
  }
  // When GSAP is available the motion layer at the end of this file owns the
  // reveals above instead, and drives them through ScrollTrigger.

  /* ---------- Animated statistics ---------- */
  var counters = document.querySelectorAll(".count");

  function finalValue(el) {
    var to = parseFloat(el.getAttribute("data-to")) || 0;
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    return to.toFixed(decimals) + (el.getAttribute("data-suffix") || "");
  }

  function runCounter(el) {
    var to = parseFloat(el.getAttribute("data-to")) || 0;
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var suffix = el.getAttribute("data-suffix") || "";
    var duration = 1500;
    var start = null;

    window.requestAnimationFrame(function frame(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (to * eased).toFixed(decimals) + suffix;
      if (t < 1) window.requestAnimationFrame(frame);
    });
  }

  if (counters.length) {
    counters.forEach(function (el) { el.textContent = finalValue(el).replace(/^[\d.]+/, "0"); });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      counters.forEach(function (el) { el.textContent = finalValue(el); });
    } else {
      var statsEl = document.querySelector(".stats");
      var statObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          counters.forEach(runCounter);
          statObserver.disconnect();
        });
      }, { threshold: 0.35 });
      if (statsEl) statObserver.observe(statsEl);
      else counters.forEach(runCounter);
    }
  }

  /* ---------- Active section in nav ---------- */
  var sections = ["top", "services", "about", "contact"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  var navLinks = Array.prototype.slice.call(nav ? nav.querySelectorAll("ul a") : []);

  if (sections.length && navLinks.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          var match = link.getAttribute("href") === "#" + entry.target.id;
          link.classList.toggle("is-active", match);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach(function (section) { spy.observe(section); });
  }

  /* ---------- Contact form ---------- */
  var form = document.getElementById("contactForm");
  var status = document.getElementById("formStatus");

  function setError(field, message) {
    var error = form.querySelector('[data-error-for="' + field.id + '"]');
    if (message) {
      field.classList.add("invalid");
      field.setAttribute("aria-invalid", "true");
      if (error) error.textContent = message;
    } else {
      field.classList.remove("invalid");
      field.removeAttribute("aria-invalid");
      if (error) error.textContent = "";
    }
  }

  function validate() {
    var valid = true;
    var name = form.elements.name;
    var email = form.elements.email;
    var message = form.elements.message;

    if (!name.value.trim()) {
      setError(name, "Please tell us your name.");
      valid = false;
    } else {
      setError(name, "");
    }

    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email.value.trim()) {
      setError(email, "Please add an email address.");
      valid = false;
    } else if (!emailPattern.test(email.value.trim())) {
      setError(email, "That email doesn't look right.");
      valid = false;
    } else {
      setError(email, "");
    }

    if (message.value.trim().length < 10) {
      setError(message, "A little more detail helps — at least 10 characters.");
      valid = false;
    } else {
      setError(message, "");
    }

    return valid;
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!validate()) {
        status.textContent = "Please fix the highlighted fields.";
        status.className = "form-status is-error";
        var firstInvalid = form.querySelector(".invalid");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // No backend wired up yet — this is where you'd POST to your endpoint.
      status.textContent = "Thanks! Your message is ready to send — connect a form endpoint to deliver it.";
      status.className = "form-status is-success";
      form.reset();
    });

    // Clear a field's error as soon as the visitor starts fixing it
    ["name", "email", "message"].forEach(function (key) {
      var field = form.elements[key];
      if (!field) return;
      field.addEventListener("input", function () {
        if (field.classList.contains("invalid")) setError(field, "");
      });
    });
  }

  /* ---------- Founder portraits with graceful fallback ---------- */
  var portraits = [
    { id: "photoSohail", candidates: ["sohail.jpg", "photo-sohail.jpg"] },
    { id: "photoShiraz", candidates: ["shiraz.jpg", "photo.jpg"] }
  ];

  portraits.forEach(function (portrait) {
    var figure = document.getElementById(portrait.id);
    if (!figure) return;

    var img = figure.querySelector("img");
    if (!img) return;

    var attempt = 0;
    var settled = false;

    var loadPhoto = function () {
      if (settled) return;

      if (attempt >= portrait.candidates.length) {
        settled = true;
        figure.classList.add("is-missing");
        img.removeAttribute("src");
        return;
      }

      img.src = portrait.candidates[attempt++];
    };

    img.addEventListener("error", loadPhoto);
    img.addEventListener("load", function () { settled = true; });

    // The markup already tried the first path before this script ran.
    if (img.complete && img.naturalWidth === 0) loadPhoto();
  });

  /* ---------- Colour themes ---------- */
  var root = document.documentElement;
  var THEME_KEY = "ss-theme";
  var THEMES = ["blush", "reddish", "yellow", "wine"];
  var DEFAULT_THEME = "blush";
  var themeButtons = Array.prototype.slice.call(document.querySelectorAll(".theme-chip"));

  function knownTheme(name) {
    return THEMES.indexOf(name) !== -1 ? name : DEFAULT_THEME;
  }

  function savedTheme() {
    try {
      var stored = window.localStorage.getItem(THEME_KEY);
      if (stored) return knownTheme(stored);
    } catch (e) { /* storage blocked — fall through */ }
    return knownTheme(root.getAttribute("data-theme"));
  }

  function applyTheme(name, persist) {
    name = knownTheme(name);
    root.setAttribute("data-theme", name);

    themeButtons.forEach(function (button) {
      var active = button.getAttribute("data-theme-value") === name;
      button.setAttribute("aria-pressed", String(active));
    });

    if (persist) {
      try { window.localStorage.setItem(THEME_KEY, name); } catch (e) { /* ignore */ }
    }
  }

  if (themeButtons.length) {
    themeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        applyTheme(button.getAttribute("data-theme-value"), true);
      });
    });

    // Sync the buttons with whatever the head script already applied.
    applyTheme(savedTheme(), false);
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ==========================================================================
     Motion layer — GSAP + ScrollTrigger for scroll work, Motion (the vanilla
     build of Framer Motion) for pointer work. Everything below is additive:
     the site is complete and usable if none of it runs.
     ========================================================================== */

  /* Wrap each word of a line in a mask so it can rise into place. */
  function splitWords(el) {
    if (!el) return [];
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return [];

    var words = text.split(" ");
    var inners = [];
    el.textContent = "";

    words.forEach(function (word, index) {
      var mask = document.createElement("span");
      mask.className = "word";

      var inner = document.createElement("span");
      inner.className = "word-inner";
      inner.textContent = word;

      mask.appendChild(inner);
      el.appendChild(mask);
      if (index < words.length - 1) el.appendChild(document.createTextNode(" "));
      inners.push(inner);
    });

    return inners;
  }

  function initScrollMotion() {
    var gsap = gsapLib;
    var ScrollTrigger = ScrollTriggerLib;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    // Tells the stylesheet GSAP will handle the start states. Applied before
    // the first set() so nothing can flash in the wrong position.
    root.classList.add("gsap-ready");

    var heroItems = [];
    var pageItems = [];
    revealItems.forEach(function (el) {
      (el.closest(".hero") ? heroItems : pageItems).push(el);
    });

    /* ----- Hero intro ---------------------------------------------------- */
    var wordSpans = splitWords(document.querySelector('[data-split="words"]'));
    var heroWipe = document.querySelector(".hero-title [data-wipe]");

    // GSAP parses the stylesheet's translateY(140%) start state into a px y
    // offset, so zero that out too — otherwise the words stay shifted.
    if (wordSpans.length) gsap.set(wordSpans, { yPercent: 140, y: 0 });
    if (heroWipe) gsap.set(heroWipe, { clipPath: "inset(0 0 100% 0)", yPercent: 14 });

    var intro = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: function () {
        // Give transforms back to CSS so hover states keep working.
        gsap.set(".hero .eyebrow, .hero-lede, .hero-actions .btn, .stats, .stats .stat", {
          clearProps: "transform,opacity,visibility"
        });
      }
    });

    intro.from(".hero .eyebrow", { y: 16, autoAlpha: 0, duration: 0.6 }, 0);

    if (wordSpans.length) {
      intro.fromTo(wordSpans,
        { yPercent: 140, y: 0 },
        { yPercent: 0, y: 0, duration: 1, stagger: 0.07 },
        0.1);
    }
    if (heroWipe) {
      intro.to(heroWipe, { clipPath: "inset(0 0 0% 0)", yPercent: 0, duration: 1.05 }, 0.5);
    }

    intro
      .from(".hero-lede", { y: 20, autoAlpha: 0, duration: 0.8 }, 0.7)
      .from(".hero-actions .btn", { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.1 }, 0.85)
      .from(".hero-stage", { y: 36, autoAlpha: 0, duration: 1.1 }, 0.55)
      .from(".stats", { y: 20, autoAlpha: 0, duration: 0.7 }, 0.95)
      .from(".stats .stat", { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.09 }, 1.05)
      .from(".scroll-cue", { autoAlpha: 0, duration: 0.6 }, 1.2);

    /* ----- Scroll reveals ------------------------------------------------ */
    if (pageItems.length) {
      gsap.set(pageItems, { y: 34, autoAlpha: 0 });

      ScrollTrigger.batch(pageItems, {
        start: "top 90%",
        once: true,
        onEnter: function (batch) {
          gsap.to(batch, {
            y: 0,
            autoAlpha: 1,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.08,
            overwrite: true,
            onComplete: function () {
              gsap.set(batch, { clearProps: "transform" });
            }
          });
        }
      });
    }

    /* ----- Section headings wipe up into view ---------------------------- */
    gsap.utils.toArray("h2[data-wipe]").forEach(function (heading) {
      gsap.fromTo(heading,
        { clipPath: "inset(0 0 100% 0)" },
        {
          clipPath: "inset(0 0 0% 0)",
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: heading,
            start: "top 88%",
            once: true,
            onEnter: function () {
              var head = heading.closest(".section-head");
              if (head) head.classList.add("is-visible");
            }
          },
          onComplete: function () {
            // Inline "none" so the stylesheet's start state can't re-clip it.
            heading.style.clipPath = "none";
          }
        });
    });

    /* ----- Parallax ------------------------------------------------------ */
    gsap.utils.toArray(".section-blob").forEach(function (blob) {
      var amount = parseFloat(blob.getAttribute("data-parallax")) || 0.25;
      gsap.fromTo(blob,
        { yPercent: -amount * 40 },
        {
          yPercent: amount * 40,
          ease: "none",
          scrollTrigger: {
            trigger: blob.parentElement || blob,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6
          }
        });
    });

    gsap.to(".hero-orbs", {
      yPercent: 24,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });

    gsap.to(".hero-copy", {
      yPercent: -6,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });

    // opacity only — the glow already owns its transform via a CSS animation
    gsap.to(".hero-glow", {
      opacity: 0.3,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });

    // The hero stage only exists on wide screens, so scope its motion to them.
    var mm = gsap.matchMedia();

    mm.add("(min-width: 901px)", function () {
      gsap.utils.toArray(".hero-stage [data-parallax]").forEach(function (el) {
        var amount = parseFloat(el.getAttribute("data-parallax")) || 0.2;
        gsap.fromTo(el,
          { yPercent: -amount * 40 },
          {
            yPercent: amount * 40,
            ease: "none",
            scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.5 }
          });
      });

      gsap.utils.toArray(".glass-pill").forEach(function (pill, index) {
        gsap.to(pill, {
          y: index % 2 ? 15 : -17,
          duration: 3.4 + index * 0.6,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true
        });
      });
    });

    // Fonts and images land after first paint and shift the page height.
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
  }

  if (useGsap) {
    try {
      initScrollMotion();
    } catch (error) {
      // An animation failure must never leave the page stuck in a start state.
      root.classList.remove("gsap-ready");
      revealItems.forEach(function (el) {
        el.classList.add("is-visible");
        ["opacity", "visibility", "transform", "translate", "rotate", "scale"]
          .forEach(function (prop) { el.style.removeProperty(prop); });
      });
      document.querySelectorAll(".word-inner, [data-wipe]").forEach(function (el) {
        el.style.removeProperty("transform");
        el.style.removeProperty("clip-path");
      });
      if (window.console && console.warn) console.warn("Motion layer skipped:", error);
    }
  }

  /* ----- Pointer interactions (Motion / Framer Motion engine) ------------- */
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var motionReady = !!(MotionLib && typeof MotionLib.animate === "function");

  function springTo(el, values, options) {
    if (!motionReady) return null;
    var animation = MotionLib.animate(el, values, options);
    if (animation && animation.finished) {
      animation.finished.then(function () { el.style.removeProperty("transform"); });
    }
    return animation;
  }

  if (motionReady && !reduceMotion) {
    // Every theme switch gets a small spring, on touch as well as pointer.
    themeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        springTo(button, { scale: [1, 0.93, 1] }, { duration: 0.32, ease: "easeOut" });
      });
    });
  }

  if (motionReady && finePointer && !reduceMotion) {
    /* Service cards: spring tilt with a sheen that follows the cursor */
    document.querySelectorAll("[data-tilt]").forEach(function (card) {
      if (!card.querySelector(".card-glare")) {
        var glare = document.createElement("span");
        glare.className = "card-glare";
        glare.setAttribute("aria-hidden", "true");
        card.insertBefore(glare, card.firstChild);
      }

      var box = null;

      card.addEventListener("pointerenter", function () {
        box = card.getBoundingClientRect();
      });

      card.addEventListener("pointermove", function (event) {
        if (!box) box = card.getBoundingClientRect();
        var px = (event.clientX - box.left) / box.width;
        var py = (event.clientY - box.top) / box.height;

        card.style.setProperty("--glare-x", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--glare-y", (py * 100).toFixed(1) + "%");

        springTo(card, {
          rotateY: (px - 0.5) * 8,
          rotateX: (0.5 - py) * 8,
          y: -6,
          scale: 1.012
        }, { type: "spring", stiffness: 260, damping: 22, mass: 0.6 });
      });

      card.addEventListener("pointerleave", function () {
        box = null;
        springTo(card,
          { rotateY: 0, rotateX: 0, y: 0, scale: 1 },
          { type: "spring", stiffness: 220, damping: 24 });
      });
    });

    /* Buttons: a magnetic pull that springs back on release */
    document.querySelectorAll(".magnet").forEach(function (button) {
      button.addEventListener("pointermove", function (event) {
        var rect = button.getBoundingClientRect();
        springTo(button, {
          x: (event.clientX - (rect.left + rect.width / 2)) * 0.22,
          y: (event.clientY - (rect.top + rect.height / 2)) * 0.34
        }, { type: "spring", stiffness: 300, damping: 18, mass: 0.5 });
      });

      button.addEventListener("pointerleave", function () {
        springTo(button, { x: 0, y: 0 },
          { type: "spring", stiffness: 260, damping: 20, mass: 0.5 });
      });
    });
  }
})();
