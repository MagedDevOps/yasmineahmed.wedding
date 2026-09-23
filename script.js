/* Customize couple details here */
const CONFIG = {
  weddingDate: "2026-10-08T21:00:00+03:00",
  couple: "Yasmine & Ahmed",
  // Paste your Google Form link here (Send → </> Embed → copy src, or use the share link)
  // Example: "https://docs.google.com/forms/d/e/XXXX/viewform?embedded=true"
  googleFormUrl: "",
};

/* —— Clean routes (/rsvp, /venue, …) —— */
(function () {
  const aliases = {
    rspv: "rsvp",
    when: "countdown",
  };

  function sectionFromPath() {
    const raw = (location.pathname || "/")
      .replace(/\/+$/, "")
      .replace(/^\//, "")
      .toLowerCase();
    if (!raw || raw === "index.html") return null;
    const id = aliases[raw] || raw;
    return document.getElementById(id) ? id : null;
  }

  const sectionId = sectionFromPath();
  if (sectionId) {
    window.__pendingSection = sectionId;
  }

  if (location.hash === "#rsvp" || location.hash === "#rspv") {
    window.__pendingSection = "rsvp";
  }

  window.__scrollToDeepLink = function () {
    const id = window.__pendingSection || sectionFromPath();
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    setTimeout(function () {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };
})();

/* —— Gate / elegant envelope —— */
(function () {
  const gate = document.getElementById("gate");
  const openBtn = document.getElementById("openInvite");
  const envelope = document.getElementById("envelope");
  const letter = gate && gate.querySelector(".envelope__letter");
  const audio = document.getElementById("bgMusic");
  const musicToggle = document.getElementById("musicToggle");
  if (!gate || !openBtn || !envelope) return;

  document.body.classList.add("locked");
  let opening = false;

  function setMusicUI(playing) {
    if (!musicToggle) return;
    musicToggle.hidden = false;
    musicToggle.setAttribute("aria-label", playing ? "Mute music" : "Play music");
    musicToggle.classList.toggle("is-muted", !playing);
    const onIcon = musicToggle.querySelector(".music__icon--on");
    const offIcon = musicToggle.querySelector(".music__icon--off");
    if (onIcon) onIcon.hidden = !playing;
    if (offIcon) offIcon.hidden = playing;
  }

  function startMusic() {
    if (!audio) return;
    audio.volume = 0.55;
    const play = audio.play();
    if (play && typeof play.then === "function") {
      play
        .then(function () {
          setMusicUI(true);
        })
        .catch(function () {
          setMusicUI(false);
        });
    } else {
      setMusicUI(!audio.paused);
    }
  }

  function finish() {
    gate.classList.add("is-gone");
    document.body.classList.remove("locked");
    document.body.classList.add("opened");
    setTimeout(function () {
      if (gate.parentNode) gate.remove();
      if (typeof window.__scrollToDeepLink === "function") {
        window.__scrollToDeepLink();
      }
    }, 1400);
  }

  openBtn.addEventListener("click", function () {
    if (opening) return;
    opening = true;
    openBtn.disabled = true;

    startMusic();

    envelope.classList.add("is-opening");
    gate.classList.add("is-opening");
    if (letter) letter.setAttribute("aria-hidden", "false");

    setTimeout(function () {
      envelope.classList.add("is-revealed");
      gate.classList.add("is-revealed");
    }, 2800);

    setTimeout(finish, 5600);
  });

  if (musicToggle && audio) {
    musicToggle.addEventListener("click", function () {
      if (audio.paused) {
        audio.play().then(function () {
          setMusicUI(true);
        }).catch(function () {});
      } else {
        audio.pause();
        setMusicUI(false);
      }
    });
  }

  // Deep links like /rsvp skip the envelope and jump to the section
  const deepSection = window.__pendingSection;
  if (deepSection) {
    opening = true;
    openBtn.disabled = true;
    finish();
  }
})();

/* —— Sticky nav —— */
(function () {
  const nav = document.getElementById("nav");
  if (!nav) return;

  function onScroll() {
    nav.classList.toggle("is-solid", window.scrollY > 48);
  }

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();

/* —— Mobile drawer —— */
(function () {
  const burger = document.getElementById("burger");
  const drawer = document.getElementById("drawer");
  if (!burger || !drawer) return;

  function close() {
    drawer.hidden = true;
    burger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("locked");
  }

  function open() {
    drawer.hidden = false;
    burger.setAttribute("aria-expanded", "true");
    document.body.classList.add("locked");
  }

  burger.addEventListener("click", function () {
    if (drawer.hidden) open();
    else close();
  });

  drawer.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", close);
  });
})();

/* —— Countdown —— */
(function () {
  const target = new Date(CONFIG.weddingDate).getTime();
  const els = {
    days: document.querySelector('[data-k="days"]'),
    hours: document.querySelector('[data-k="hours"]'),
    minutes: document.querySelector('[data-k="minutes"]'),
    seconds: document.querySelector('[data-k="seconds"]'),
  };

  if (!els.days) return;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tick() {
    const diff = Math.max(0, target - Date.now());
    els.days.textContent = pad(Math.floor(diff / 86400000));
    els.hours.textContent = pad(Math.floor((diff / 3600000) % 24));
    els.minutes.textContent = pad(Math.floor((diff / 60000) % 60));
    els.seconds.textContent = pad(Math.floor((diff / 1000) % 60));
  }

  tick();
  setInterval(tick, 1000);
})();

/* —— In-view reveals —— */
(function () {
  const nodes = document.querySelectorAll(".inview");
  if (!nodes.length) return;

  const io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  nodes.forEach(function (el) {
    io.observe(el);
  });
})();

/* —— RSVP via Google Form (replies go to your Google Sheet) —— */
(function () {
  const formUrl = (CONFIG.googleFormUrl || "").trim();
  const frame = document.getElementById("googleFormFrame");
  const link = document.getElementById("googleFormLink");
  const embed = document.getElementById("rsvpEmbed");
  const legacyForm = document.getElementById("wishForm");

  if (!formUrl) {
    if (embed) {
      embed.innerHTML =
        '<p class="rsvp-setup">RSVP form will appear here once the Google Form link is added.</p>';
    }
    if (legacyForm) legacyForm.hidden = true;
    return;
  }

  const embedUrl = formUrl.includes("embedded=true")
    ? formUrl
    : formUrl.replace(/\/viewform.*/, "/viewform?embedded=true");

  if (frame) frame.src = embedUrl;
  if (link) {
    link.href = formUrl.replace("?embedded=true", "").replace("&embedded=true", "");
  }
  if (legacyForm) legacyForm.hidden = true;
})();

/* —— Smooth scroll for same-page anchors (nav already uses href) —— */
document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener("click", function (e) {
    const id = this.getAttribute("href");
    if (!id || id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const offset = 72;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top, behavior: "smooth" });
  });
});
