function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Dashboard-Password");
}

function scriptConfigured() {
  return Boolean(process.env.GOOGLE_SCRIPT_URL);
}

async function callScript(payload) {
  const url = process.env.GOOGLE_SCRIPT_URL;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error("Google Script returned invalid JSON. Redeploy the web app and check the URL.");
  }

  if (!response.ok || data.error) {
    throw new Error(data.error || "Google Script request failed");
  }
  return data;
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }
    let raw = "";
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
          "RSVP storage is not configured. Add GOOGLE_SCRIPT_URL and DASHBOARD_PASSWORD in Vercel env vars (free Google Sheet).",
      })
    );
    return;
  }

  try {
    if (req.method === "POST") {
      const body = await readBody(req);
      const name = String(body.name || "").trim().slice(0, 80);
      const message = String(body.message || "").trim().slice(0, 500);
      const attend = body.attend === "no" ? "no" : "yes";

      if (!name || !message) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Name and message are required." }));
        return;
      }

      const data = await callScript({
        action: "create",
        name: name,
        message: message,
        attend: attend,
      });

      res.statusCode = 201;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, entry: data.entry }));
      return;
    }

    if (req.method === "GET") {
      const password = req.headers["x-dashboard-password"] || "";
      const expected = process.env.DASHBOARD_PASSWORD || "";
      if (!expected || password !== expected) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      const data = await callScript({ action: "list" });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify({ entries: data.entries || [] }));
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
