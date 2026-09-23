(function () {
  // Change this password anytime (only you should know it)
  var DASHBOARD_PASSWORD = "yasmineahmed2026";

  // Your RSVP Google Sheet
  var SHEET_URL =
    "https://docs.google.com/spreadsheets/d/1xb1Cu1cevuz_DhfHn545KIjaRUCtpB8Fiss8piUjOIw/edit";

  var loginForm = document.getElementById("loginForm");
  var loginError = document.getElementById("loginError");
  var passwordInput = document.getElementById("password");

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (passwordInput.value === DASHBOARD_PASSWORD) {
      window.location.href = SHEET_URL;
      return;
    }
    loginError.hidden = false;
    loginError.textContent = "Wrong password";
    passwordInput.value = "";
    passwordInput.focus();
  });
})();
