(function () {
  const STORAGE_KEY = "ya-dashboard-password";
  const loginView = document.getElementById("loginView");
  const boardView = document.getElementById("boardView");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const passwordInput = document.getElementById("password");
  const logoutBtn = document.getElementById("logoutBtn");
  const rsvpBody = document.getElementById("rsvpBody");
  const liveBadge = document.getElementById("liveBadge");

  let password = sessionStorage.getItem(STORAGE_KEY) || "";
  let timer = null;

  function showError(msg) {
    loginError.hidden = false;
    loginError.textContent = msg;
  }

  function clearError() {
    loginError.hidden = true;
    loginError.textContent = "";
  }

  function formatWhen(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (e) {
      return iso || "—";
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render(entries) {
    const total = entries.length;
    const yes = entries.filter(function (e) { return e.attend === "yes"; }).length;
    const no = total - yes;

    document.querySelector('[data-stat="total"]').textContent = String(total);
    document.querySelector('[data-stat="yes"]').textContent = String(yes);
    document.querySelector('[data-stat="no"]').textContent = String(no);

    if (!entries.length) {
      rsvpBody.innerHTML = '<tr class="dash-empty"><td colspan="4">No RSVPs yet — waiting for guests…</td></tr>';
      return;
    }

    rsvpBody.innerHTML = entries
      .map(function (entry) {
        const attending = entry.attend === "yes";
        return (
          "<tr>" +
          "<td><strong>" + escapeHtml(entry.name) + "</strong></td>" +
          '<td><span class="dash-pill ' + (attending ? "dash-pill--yes" : "dash-pill--no") + '">' +
          (attending ? "Attending" : "Can't attend") +
          "</span></td>" +
          "<td>" + escapeHtml(entry.message) + "</td>" +
          '<td class="dash-time">' + escapeHtml(formatWhen(entry.at)) + "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  async function fetchRsvps() {
    const res = await fetch("/api/rsvp", {
      headers: {
        // encodeURIComponent keeps header ASCII-safe (Arabic passwords, etc.)
        "X-Dashboard-Password": encodeURIComponent(password),
      },
      cache: "no-store",
    });

    if (res.status === 401) {
      throw new Error("Wrong password");
    }
    if (!res.ok) {
      const data = await res.json().catch(function () { return {}; });
      throw new Error(data.error || "Could not load RSVPs");
    }

    const data = await res.json();
    return Array.isArray(data.entries) ? data.entries : [];
  }

  function startPolling() {
    stopPolling();
    timer = setInterval(async function () {
      try {
        const entries = await fetchRsvps();
        render(entries);
        liveBadge.textContent = "Live";
      } catch (err) {
        liveBadge.textContent = "Retrying";
      }
    }, 3000);
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  async function openBoard() {
    clearError();
    const entries = await fetchRsvps();
    sessionStorage.setItem(STORAGE_KEY, password);
    loginView.hidden = true;
    boardView.hidden = false;
    render(entries);
    startPolling();
  }

  function lockBoard() {
    stopPolling();
    password = "";
    sessionStorage.removeItem(STORAGE_KEY);
    boardView.hidden = true;
    loginView.hidden = false;
    passwordInput.value = "";
    passwordInput.focus();
  }

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    password = passwordInput.value;
    loginForm.querySelector("button").disabled = true;
    try {
      await openBoard();
    } catch (err) {
      showError(err.message || "Wrong password");
      password = "";
      sessionStorage.removeItem(STORAGE_KEY);
    } finally {
      loginForm.querySelector("button").disabled = false;
    }
  });

  logoutBtn.addEventListener("click", lockBoard);

  if (password) {
    openBoard().catch(function () {
      lockBoard();
    });
  }
})();
