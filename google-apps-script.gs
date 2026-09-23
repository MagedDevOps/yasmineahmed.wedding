/**
 * Paste this into Google Apps Script (Extensions → Apps Script) for your RSVP sheet.
 * Then Deploy → New deployment → Web app:
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the Web App URL into Vercel env: GOOGLE_SCRIPT_URL
 */

var SPREADSHEET_ID = "1xb1Cu1cevuz_DhfHn545KIjaRUCtpB8Fiss8piUjOIw";
var SHEET_NAME = "RSVPs";

function ensureSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["id", "name", "attend", "message", "at"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var action = String(body.action || "create");

    if (action === "list") {
      return json_({ entries: listEntries_() });
    }

    var name = String(body.name || "").trim().slice(0, 80);
    var message = String(body.message || "").trim().slice(0, 500);
    var attend = body.attend === "no" ? "no" : "yes";

    if (!name || !message) {
      return json_({ error: "Name and message are required." }, 400);
    }

    var sheet = ensureSheet_();
    var id = Utilities.getUuid();
    var at = new Date().toISOString();
    sheet.appendRow([id, name, attend, message, at]);

    return json_({
      ok: true,
      entry: { id: id, name: name, attend: attend, message: message, at: at },
    });
  } catch (err) {
    return json_({ error: String(err) }, 500);
  }
}

function doGet() {
  return json_({ entries: listEntries_() });
}

function listEntries_() {
  var sheet = ensureSheet_();
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var entries = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[1]) continue;
    entries.push({
      id: String(row[0] || ""),
      name: String(row[1] || ""),
      attend: String(row[2] || "yes"),
      message: String(row[3] || ""),
      at: String(row[4] || ""),
    });
  }

  entries.sort(function (a, b) {
    return String(b.at).localeCompare(String(a.at));
  });
  return entries;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
