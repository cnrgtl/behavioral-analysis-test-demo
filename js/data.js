/**
 * Data collection, localStorage backup, and Power Automate webhook submission.
 */
const DataStore = (() => {
  let _participantId = "";
  let _startTime = "";
  let _stimulusRecords = [];
  let _calibrationAccuracy = null;

  function setParticipantId(id) {
    _participantId = id;
  }

  function getParticipantId() {
    return _participantId;
  }

  function generateParticipantId() {
    // Auto-increment from localStorage
    const lastNum = parseInt(localStorage.getItem("bat_lastParticipantNum") || "0", 10);
    const nextNum = lastNum + 1;
    localStorage.setItem("bat_lastParticipantNum", String(nextNum));
    return "P" + String(nextNum).padStart(3, "0");
  }

  function startSession() {
    _startTime = new Date().toISOString();
    _stimulusRecords = [];
  }

  function setCalibrationAccuracy(accuracy) {
    _calibrationAccuracy = accuracy;
  }

  function addStimulusRecord(record) {
    const full = {
      participantId: _participantId,
      timestamp: new Date().toISOString(),
      phaseIndex: record.phaseIndex,
      phaseName: record.phaseName,
      stimulusIndex: record.stimulusIndex,
      stimulusType: record.stimulusType,
      stimulusContent: record.stimulusContent,
      duration: record.duration,
      timeSpent: Math.round(record.timeSpent * 1000) / 1000,
      skipped: record.skipped || false,
      droppedOut: record.droppedOut || false,
      gazeOnScreenPct: record.gazeOnScreenPct || 0,
      gazeLookAways: record.gazeLookAways || 0,
      avgGazeX: record.avgGazeX || 0,
      avgGazeY: record.avgGazeY || 0
    };
    _stimulusRecords.push(full);
    _saveToLocalStorage();
    return full;
  }

  function getRecords() {
    return _stimulusRecords;
  }

  function buildSessionSummary(completed) {
    const lastRecord = _stimulusRecords[_stimulusRecords.length - 1];
    return {
      participantId: _participantId,
      startTime: _startTime,
      endTime: new Date().toISOString(),
      completed: completed,
      lastPhase: lastRecord ? lastRecord.phaseIndex : 0,
      lastStimulus: lastRecord ? lastRecord.stimulusIndex : 0,
      totalStimuliViewed: _stimulusRecords.length,
      calibrationAccuracy: _calibrationAccuracy != null ? Math.round(_calibrationAccuracy * 100) / 100 : null
    };
  }

  function _saveToLocalStorage() {
    try {
      const data = {
        participantId: _participantId,
        startTime: _startTime,
        records: _stimulusRecords,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem("bat_backup_" + _participantId, JSON.stringify(data));
    } catch (e) {
      console.warn("localStorage save failed:", e);
    }
  }

  async function submitData(completed) {
    const session = buildSessionSummary(completed);
    const payload = {
      session: session,
      records: _stimulusRecords
    };

    // Save final backup
    _saveToLocalStorage();

    // Try Power Automate webhook first (production), then Google Sheets (fallback)
    const webhookUrl = STUDY_CONFIG.webhookUrl;
    const googleUrl = STUDY_CONFIG.googleSheetsUrl;

    if (webhookUrl) {
      // Build CSV strings for Power Automate to save directly to OneDrive
      const webhookPayload = {
        session: session,
        records: _stimulusRecords,
        responsesCsv: _buildResponsesCsv(),
        sessionCsv: _buildSessionCsv(session),
        gazeTrailCsv: _buildGazeTrailCsv()
      };
      const result = await _postToWebhook(webhookUrl, webhookPayload);
      if (result.success) return result;
      console.warn("Power Automate submission failed, trying Google Sheets fallback...");
    }

    if (googleUrl) {
      const result = await _postToGoogleSheets(googleUrl, payload);
      if (result.success) return result;
      console.warn("Google Sheets submission also failed.");
    }

    if (!googleUrl && !webhookUrl) {
      console.warn("No submission URL configured — data saved to localStorage only.");
    }
    return { success: false, reason: "all_failed", data: payload };
  }

  function _buildCsv(headers, rows) {
    const escape = (val) => {
      if (val == null) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    const lines = [headers.join(",")];
    for (const row of rows) {
      lines.push(headers.map(h => escape(row[h])).join(","));
    }
    return lines.join("\n");
  }

  function _buildResponsesCsv() {
    const headers = [
      "participantId", "timestamp", "phaseIndex", "phaseName", "stimulusIndex",
      "stimulusType", "stimulusContent", "duration", "timeSpent", "skipped",
      "partialAvoidance", "partialAvoidanceTime",
      "droppedOut", "gazeOnScreenPct", "gazeLookAways", "avgGazeX", "avgGazeY", "gazeOnExitPct"
    ];
    return _buildCsv(headers, _stimulusRecords);
  }

  function _buildSessionCsv(session) {
    const headers = [
      "participantId", "startTime", "endTime", "completed", "lastPhase",
      "lastStimulus", "totalStimuliViewed", "calibrationAccuracy"
    ];
    return _buildCsv(headers, [session]);
  }

  function _buildGazeTrailCsv() {
    const headers = ["participantId", "phaseIndex", "stimulusIndex", "stimulusContent", "timestamp", "normX", "normY"];
    const rows = [];
    for (const record of _stimulusRecords) {
      if (record.gazeTrail && record.gazeTrail.length > 0) {
        for (const point of record.gazeTrail) {
          rows.push({
            participantId: record.participantId,
            phaseIndex: record.phaseIndex,
            stimulusIndex: record.stimulusIndex,
            stimulusContent: record.stimulusContent,
            timestamp: point.t,
            normX: point.normX,
            normY: point.normY
          });
        }
      }
    }
    return _buildCsv(headers, rows);
  }

  async function _postToGoogleSheets(url, payload) {
    console.log("[BAT] Submitting to Google Sheets...", url);
    console.log("[BAT] Payload:", JSON.stringify(payload).substring(0, 200) + "...");

    try {
      // Google Apps Script web apps accept text/plain POST without preflight.
      // The response is opaque (no-cors) but the script still executes.
      const resp = await fetch(url, {
        method: "POST",
        mode: "no-cors",
        cache: "no-cache",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow"
      });
      console.log("[BAT] Google Sheets fetch completed, response type:", resp.type);
      // With no-cors the response type is "opaque" and status is 0,
      // but the request DID reach the server if no exception was thrown.
      return { success: true, data: payload };
    } catch (err) {
      console.error("[BAT] Google Sheets submission error:", err);
      return { success: false, reason: "network_error", error: err.message, data: payload };
    }
  }

  async function _postToWebhook(url, payload) {
    console.log("[BAT] Submitting to Power Automate...", url);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      console.log("[BAT] Power Automate response:", response.status, response.statusText);
      if (response.ok) {
        return { success: true, data: payload };
      }
      console.error("[BAT] Power Automate error status:", response.status);
      return { success: false, reason: "http_error", status: response.status, data: payload };
    } catch (err) {
      console.error("[BAT] Webhook submission error:", err);
      return { success: false, reason: "network_error", error: err.message, data: payload };
    }
  }

  function exportLocalStorageData() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("bat_backup_")) {
        keys.push(key);
      }
    }
    return keys.map(k => JSON.parse(localStorage.getItem(k)));
  }

  return {
    setParticipantId,
    getParticipantId,
    generateParticipantId,
    startSession,
    setCalibrationAccuracy,
    addStimulusRecord,
    getRecords,
    buildSessionSummary,
    submitData,
    exportLocalStorageData
  };
})();
