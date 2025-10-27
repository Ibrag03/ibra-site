// ===== Sito Ibra — script di interazione =====
// Tutto vanilla JS, zero dipendenze.

(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // ---------- UA helpers & viewport utilities ----------
  const UA = navigator.userAgent || navigator.vendor || window.opera;
  const isIOS = /iPad|iPhone|iPod/.test(UA) && !window.MSStream;
  const isAndroid = /android/i.test(UA);
  const isMobile = isIOS || isAndroid;
  const isSafari = /^((?!chrome|android).)*safari/i.test(UA);
  const isChrome = /Chrome\//.test(UA) && !isSafari;

  document.documentElement.classList.toggle('is-safari', isSafari);
  document.documentElement.classList.toggle('is-chrome', isChrome);
  document.documentElement.classList.toggle('is-mobile', isMobile);

  const ensureMetaViewport = (content) => {
    let mv = document.querySelector('meta[name="viewport"]');
    if (!mv) {
      mv = document.createElement('meta');
      mv.setAttribute('name', 'viewport');
      document.head.appendChild(mv);
    }
    mv.setAttribute('content', content);
  };

  const enableDesktopViewport = () => {
    // Simula modalità desktop: larghezza fissa 1280
    ensureMetaViewport('width=1280, user-scalable=no');
    document.documentElement.classList.add('desktop-mode');
    try { localStorage.setItem('desktopMode', 'on'); } catch (_) {}
  };

  const disableDesktopViewport = () => {
    ensureMetaViewport('width=device-width, initial-scale=1, viewport-fit=cover');
    document.documentElement.classList.remove('desktop-mode');
    try { localStorage.setItem('desktopMode', 'off'); } catch (_) {}
  };

  // Attiva modalità desktop su mobile se salvata in precedenza
  try {
    const saved = localStorage.getItem('desktopMode');
    if (isMobile && saved === 'on') enableDesktopViewport();
  } catch (_) {}

  // ---------- Menu mobile / header ----------
  const nav = $(".nav");
  const menuBtn = $(".menu-toggle");

  if (menuBtn && nav) {
    const openNav = () => {
      nav.style.display = "flex";
      // Forza reflow per permettere la transizione
      // eslint-disable-next-line no-unused-expressions
      nav.offsetHeight;
      nav.classList.add("nav--open", "nav--animated");
      menuBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    };
    const closeNav = () => {
      nav.classList.remove("nav--open");
      menuBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      // nascondi dopo animazione
      setTimeout(() => {
        if (!nav.classList.contains("nav--open")) nav.style.display = "none";
      }, 260);
    };

    menuBtn.addEventListener("click", () => {
      const expanded = menuBtn.getAttribute("aria-expanded") === "true";
      expanded ? closeNav() : openNav();
    });

    // Chiudi al click sui link
    $$(".nav-link", nav).forEach((a) =>
      a.addEventListener("click", closeNav)
    );

    // Chiudi con ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("nav--open")) closeNav();
    });
  }

  // ---------- Parallasse badge (GPU friendly + throttled) ----------
  const heroVisual = $(".hero-visual");
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (heroVisual && !prefersReduced) {
    let rafId = null;
    let lastX = 0, lastY = 0;

    const applyParallax = () => {
      rafId = null;
      const rect = heroVisual.getBoundingClientRect();
      const mx = ((lastX - (rect.left + rect.width / 2)) / rect.width) * 2;
      const my = ((lastY - (rect.top + rect.height / 2)) / rect.height) * 2;
      heroVisual.style.setProperty('--mx', mx.toFixed(3));
      heroVisual.style.setProperty('--my', my.toFixed(3));
    };

    const queueParallax = (x, y) => {
      lastX = x; lastY = y;
      if (rafId == null) rafId = requestAnimationFrame(applyParallax);
    };

    heroVisual.addEventListener('mousemove', (e) => queueParallax(e.clientX, e.clientY), { passive: true });
    heroVisual.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (t) queueParallax(t.clientX, t.clientY);
    }, { passive: true });

    heroVisual.addEventListener('mouseleave', () => {
      heroVisual.style.setProperty('--mx', 0);
      heroVisual.style.setProperty('--my', 0);
    });
  }

  // ---------- Smooth scroll per le ancore ----------
  $$("a[href^='#']").forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (id && id.length > 1) {
        const el = $(id);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  });

  // ---------- Real-time clock (EN weekday abbrev + dd/mm/yy, Europe/Rome) ----------
  const dayWd = document.getElementById('cd-day-wd');
  const dayDate = document.getElementById('cd-day-date');
  const hourEl = document.getElementById('cd-hour');
  const minEl = document.getElementById('cd-minute');
  const secEl = document.getElementById('cd-second');

  if (dayWd && dayDate && hourEl && minEl && secEl) {
    const tz = 'Europe/Rome';

    const fmtWd = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      timeZone: tz,
    });
    const fmtDate = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      timeZone: tz,
    });
    const fmtTime = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      timeZone: tz,
    });

    const updateClock = () => {
      const now = new Date();
      dayWd.textContent = fmtWd.format(now).toUpperCase(); // e.g. SUN
      dayDate.textContent = fmtDate.format(now);            // e.g. 26/10/25

      const [h, m, s] = fmtTime.format(now).split(':');
      hourEl.textContent = h; minEl.textContent = m; secEl.textContent = s;
    };

    updateClock();
    setInterval(updateClock, 1000);
  }

  // ---------- Piccole migliorie ----------
  // Focus outline visibile solo da tastiera
  function handleFirstTab(e) {
    if (e.key === "Tab") {
      document.body.classList.add("user-is-tabbing");
      window.removeEventListener("keydown", handleFirstTab);
    }
  }
  window.addEventListener("keydown", handleFirstTab);

  // ---------- Ask user for Desktop Mode on mobile (one-time) ----------
  (function askDesktopOnce() {
    if (!isMobile) return;
    try {
      const saved = localStorage.getItem('desktopMode');
      const asked = localStorage.getItem('desktopAsked');
      if (!asked && (saved !== 'on')) {
        const ok = window.confirm('Per la migliore esperienza, vuoi attivare la modalità Desktop sul telefono?');
        if (ok) enableDesktopViewport();
        localStorage.setItem('desktopAsked', 'yes');
      }
    } catch (_) {}
  })();

  // ---------- Keyboard toggle for desktop mode (debug/helper) ----------
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'd' && (e.ctrlKey || e.metaKey)) {
      const isOn = document.documentElement.classList.contains('desktop-mode');
      if (isOn) disableDesktopViewport(); else enableDesktopViewport();
    }
  });
})();