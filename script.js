/* Customize couple details here */
const CONFIG = {
  weddingDate: "2026-10-05T21:00:00+03:00",
  couple: "Yasmine & Ahmed",
};

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

/* —— Wish / RSVP form (local demo) —— */
(function () {
  const form = document.getElementById("wishForm");
  const status = document.getElementById("wishStatus");
  if (!form || !status) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = form.wishName.value.trim();
    const message = form.wishMessage.value.trim();
    const attend = form.attend.value;

    if (!name || !message) {
      status.textContent = "Please share your name and a short message.";
      return;
    }

    status.textContent = "Sending your wish…";

    // Demo persistence — swap for your API endpoint when ready
    try {
      const wishes = JSON.parse(localStorage.getItem("wedding-wishes") || "[]");
      wishes.push({
        name: name,
        message: message,
        attend: attend,
        at: new Date().toISOString(),
      });
      localStorage.setItem("wedding-wishes", JSON.stringify(wishes));

      form.reset();
      form.querySelector('input[name="attend"][value="yes"]').checked = true;
      status.textContent =
        attend === "yes"
          ? "Thank you — we can’t wait to celebrate with you."
          : "Thank you for your love — we’ll feel it from afar.";
    } catch (err) {
      status.textContent = "Something went wrong. Please try again.";
    }
  });
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
