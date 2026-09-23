const RSVP_KEY = "wedding:rsvps";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Dashboard-Password");
}

function redisConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisCommand(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error("Redis error: " + text);
  }
  return response.json();
}

async function listRsvps() {
  const result = await redisCommand(["LRANGE", RSVP_KEY, 0, -1]);
  const rows = Array.isArray(result.result) ? result.result : [];
  return rows
    .map(function (row) {
      try {
        return JSON.parse(row);
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean)
    .sort(function (a, b) {
      return String(b.at || "").localeCompare(String(a.at || ""));
    });
}

async function addRsvp(entry) {
  await redisCommand(["LPUSH", RSVP_KEY, JSON.stringify(entry)]);
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

  if (!redisConfigured()) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error:
          "RSVP storage is not configured. Add UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, and DASHBOARD_PASSWORD in Vercel env vars.",
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

      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: name,
        message: message,
        attend: attend,
        at: new Date().toISOString(),
      };

      await addRsvp(entry);
      res.statusCode = 201;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, entry: entry }));
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

      const entries = await listRsvps();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify({ entries: entries }));
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
