/**
 * Google Apps Script — paste this into the script editor of your Google Sheet.
 *
 * SETUP:
 * 1. Open your Google Sheet
 * 2. Extensions > Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Click Deploy > New deployment
 * 5. Type: "Web app"
 * 6. Execute as: "Me"
 * 7. Who has access: "Anyone"
 * 8. Click Deploy, authorise when prompted
 * 9. Copy the Web app URL and paste it into config.js as googleSheetsUrl
 *
 * SHEET SETUP:
 * Create two sheets (tabs) in the spreadsheet:
 *   - "Responses"   (stimulus-level data)
 *   - "Sessions"    (one row per participant session)
 * The script will auto-create headers on first write.
 */

function doPost(e) {
  try {
    // Support both raw JSON body and form-encoded "payload" field
    var raw = e.postData.contents;
    var payload;
    if (e.parameter && e.parameter.payload) {
      payload = JSON.parse(e.parameter.payload);
    } else {
      payload = JSON.parse(raw);
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Write session summary
    if (payload.session) {
      writeSession(ss, payload.session);
    }

    // Write each stimulus response
    if (payload.records && payload.records.length > 0) {
      writeResponses(ss, payload.records);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", rows: (payload.records || []).length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function writeSession(ss, session) {
  var sheet = ss.getSheetByName("Sessions");
  if (!sheet) {
    sheet = ss.insertSheet("Sessions");
  }

  var headers = [
    "participantId", "startTime", "endTime", "completed",
    "lastPhase", "lastStimulus", "totalStimuliViewed", "calibrationAccuracy"
  ];

  // Add headers if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }

  var row = headers.map(function(h) {
    var val = session[h];
    return val !== undefined && val !== null ? val : "";
  });

  sheet.appendRow(row);
}

function writeResponses(ss, records) {
  var sheet = ss.getSheetByName("Responses");
  if (!sheet) {
    sheet = ss.insertSheet("Responses");
  }

  var headers = [
    "participantId", "timestamp", "phaseIndex", "phaseName", "stimulusIndex",
    "stimulusType", "stimulusContent", "duration", "timeSpent", "skipped",
    "partialAvoidance", "partialAvoidanceTime",
    "droppedOut", "gazeOnScreenPct", "gazeLookAways", "avgGazeX", "avgGazeY", "gazeOnExitPct"
  ];

  // Add headers if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }

  // Write all records in one batch for speed
  var rows = records.map(function(record) {
    return headers.map(function(h) {
      var val = record[h];
      return val !== undefined && val !== null ? val : "";
    });
  });

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  }
}

// Test function — run this manually in the script editor to verify it works
function testDoPost() {
  var testPayload = {
    postData: {
      contents: JSON.stringify({
        session: {
          participantId: "TEST_001",
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          completed: true,
          lastPhase: 1,
          lastStimulus: 2,
          totalStimuliViewed: 2,
          calibrationAccuracy: 85.5
        },
        records: [
          {
            participantId: "TEST_001",
            timestamp: new Date().toISOString(),
            phaseIndex: 1,
            phaseName: "Phase 1 — Mild",
            stimulusIndex: 1,
            stimulusType: "text",
            stimulusContent: "vomit",
            duration: 30,
            timeSpent: 12.345,
            skipped: true,
            droppedOut: false,
            gazeOnScreenPct: 92.5,
            gazeLookAways: 2,
            avgGazeX: 0.48,
            avgGazeY: 0.52
          }
        ]
      })
    }
  };

  var result = doPost(testPayload);
  Logger.log(result.getContent());
}
