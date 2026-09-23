function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Dashboard-Password");
}

function scriptConfigured() {
  return Boolean(process.env.GOOGLE_SCRIPT_URL);
}

function scriptBaseUrl() {
  return String(process.env.GOOGLE_SCRIPT_URL || "").replace(/\/$/, "");
}

function looksLikeHtml(text) {
  var t = String(text || "").trim().slice(0, 80).toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html") || t.indexOf("<body") !== -1;
}

async function callScriptPost(payload) {
  var url = scriptBaseUrl();
  // text/plain avoids Apps Script CORS/preflight quirks
  var response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });

  var text = await response.text();
  if (looksLikeHtml(text)) {
    throw new Error(
      "Google returned an HTML page instead of JSON. In Apps Script: Run ensureSheet_ once to authorize, then Deploy → Manage deployments → Edit → set Who has access = Anyone → New version."
    );
  }

  var data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(
      "Google Script returned invalid JSON. First 120 chars: " +
        String(text || "").replace(/\s+/g, " ").slice(0, 120)
    );
  }

  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

async function callScriptList() {
  var url = scriptBaseUrl() + "?action=list";
  var response = await fetch(url, {
    method: "GET",
    redirect: "follow",
  });

  var text = await response.text();
  if (looksLikeHtml(text)) {
    throw new Error(
      "Google returned an HTML page instead of JSON. Redeploy the web app with access = Anyone, and authorize the script by running ensureSheet_ once."
    );
  }

  var data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(
      "Google Script returned invalid JSON. First 120 chars: " +
        String(text || "").replace(/\s+/g, " ").slice(0, 120)
    );
  }

  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }
    var raw = "";
    req.on("data", function (chunk) {
      raw += chunk;
    });
    req.on("end", function () {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!scriptConfigured()) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error:
          "RSVP storage is not configured. Add GOOGLE_SCRIPT_URL and DASHBOARD_PASSWORD in Vercel env vars.",
      })
    );
    return;
  }

  try {
    if (req.method === "POST") {
      var body = await readBody(req);
      var name = String(body.name || "").trim().slice(0, 80);
      var message = String(body.message || "").trim().slice(0, 500);
      var attend = body.attend === "no" ? "no" : "yes";

      if (!name || !message) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Name and message are required." }));
        return;
      }

      var created = await callScriptPost({
        action: "create",
        name: name,
        message: message,
        attend: attend,
      });

      res.statusCode = 201;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, entry: created.entry }));
      return;
    }

    if (req.method === "GET") {
      var passwordHeader = req.headers["x-dashboard-password"] || "";
      var password = passwordHeader;
      try {
        password = decodeURIComponent(passwordHeader);
      } catch (e) {
        password = passwordHeader;
      }
      var expected = process.env.DASHBOARD_PASSWORD || "";
      if (!expected || password !== expected) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      var listed = await callScriptList();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify({ entries: listed.entries || [] }));
      return;
    }

    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: err.message || "Server error" }));
  }
};
