/**
 * View rendering functions for each screen in the BAT study.
 * Each function renders into the #app container.
 */
const Views = (() => {
  const app = () => document.getElementById("app");

  function welcome(onStart) {
    const isManual = STUDY_CONFIG.participantIdMode === "manual";
    app().innerHTML = `
      <div class="screen welcome-screen">
        <h1>${STUDY_CONFIG.title}</h1>
        <p class="description">${STUDY_CONFIG.description}</p>
        ${isManual ? `
          <div class="form-group">
            <label for="participant-id">Participant ID</label>
            <input type="text" id="participant-id" placeholder="e.g. P001" autocomplete="off" />
          </div>
        ` : ""}
        <button id="start-btn" class="btn btn-primary" type="button"${isManual ? " disabled" : ""}>Start Study</button>
      </div>
    `;

    if (isManual) {
      const input = document.getElementById("participant-id");
      const btn = document.getElementById("start-btn");
      input.addEventListener("input", () => {
        btn.disabled = input.value.trim().length === 0;
      });
      btn.addEventListener("click", () => onStart(input.value.trim()));
    } else {
      document.getElementById("start-btn").addEventListener("click", () => onStart(null));
    }
  }

  function consent(onConsent) {
    app().innerHTML = `
      <div class="screen consent-screen">
        <h2>Consent &amp; Webcam Setup</h2>
        <div class="consent-text">
          <p>Before proceeding, please read the following:</p>
          <ul>
            <li>This study involves viewing stimuli that may include disturbing images, videos, audio, and text related to emetophobia (fear of vomiting).</li>
            <li>Your webcam will be used <strong>only for eye tracking</strong> — to estimate where you are looking on the screen.</li>
            <li><strong>No video or images of you are recorded, stored, or transmitted.</strong> The camera feed is processed in your browser in real-time and immediately discarded. Only numeric gaze coordinates (x, y numbers) are collected.</li>
            <li>You may stop the study at any time by pressing the "Stop Study" button.</li>
          </ul>
        </div>

        <div class="webcam-section">
          <p>Please allow webcam access when prompted. A live preview will appear below so you can confirm the camera is working.</p>
          <div id="webcam-preview-container" class="webcam-preview">
            <p class="webcam-placeholder">Webcam preview will appear here...</p>
          </div>
          <button id="enable-webcam-btn" class="btn btn-secondary" type="button">Enable Webcam</button>
        </div>

        <button id="consent-btn" class="btn btn-primary" type="button" disabled>I Consent &amp; Continue</button>
      </div>
    `;

    const enableBtn = document.getElementById("enable-webcam-btn");
    const consentBtn = document.getElementById("consent-btn");
    const previewContainer = document.getElementById("webcam-preview-container");

    enableBtn.addEventListener("click", async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.classList.add("webcam-video");
        previewContainer.innerHTML = "";
        previewContainer.appendChild(video);
        enableBtn.textContent = "Webcam Active";
        enableBtn.disabled = true;
        consentBtn.disabled = false;

        // Store stream so we can stop it later (WebGazer will start its own)
        window._batPreviewStream = stream;
      } catch (err) {
        previewContainer.innerHTML = `<p class="error">Webcam access denied. Please allow camera access and try again.</p>`;
      }
    });

    consentBtn.addEventListener("click", () => {
      // Stop preview stream — WebGazer will request its own
      if (window._batPreviewStream) {
        window._batPreviewStream.getTracks().forEach(t => t.stop());
        delete window._batPreviewStream;
      }
      onConsent();
    });
  }

  function calibration(onComplete) {
    const positions = EyeTracking.getCalibrationPositions();
    const clicksNeeded = EyeTracking.getClicksPerPoint();
    let currentPoint = 0;
    let clickCount = 0;

    // Use a fullscreen layout — the dots are placed absolutely within the viewport
    app().innerHTML = `
      <div class="calibration-screen">
        <div id="calib-header" class="calib-header">
          <h2>Eye Tracking Calibration</h2>
          <p id="calib-instructions">Click on each dot while looking directly at it. Click each dot ${clicksNeeded} times.</p>
          <p id="calib-progress">Point 1 of ${positions.length} &mdash; Clicks: 0 / ${clicksNeeded}</p>
        </div>
        <div id="calib-area" class="calibration-area"></div>
      </div>
    `;

    const area = document.getElementById("calib-area");
    const progress = document.getElementById("calib-progress");
    const instructions = document.getElementById("calib-instructions");

    function showPoint(index) {
      area.innerHTML = "";
      const pos = positions[index];

      // Convert normalised position to pixel position for the dot
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "calib-dot";
      dot.style.left = (pos.x * 100) + "%";
      dot.style.top = (pos.y * 100) + "%";

      // Show click count on the dot
      dot.textContent = "0";

      dot.addEventListener("click", (e) => {
        e.preventDefault();
        clickCount++;

        // Register this click position with WebGazer for training
        const pixelX = pos.x * window.innerWidth;
        const pixelY = pos.y * window.innerHeight;
        if (typeof webgazer !== "undefined" && webgazer.recordScreenPosition) {
          webgazer.recordScreenPosition(pixelX, pixelY, "click");
        }

        // Visual feedback
        dot.textContent = String(clickCount);
        dot.classList.add("calib-dot-clicked");
        setTimeout(() => dot.classList.remove("calib-dot-clicked"), 200);

        progress.textContent = `Point ${currentPoint + 1} of ${positions.length} — Clicks: ${clickCount} / ${clicksNeeded}`;

        if (clickCount >= clicksNeeded) {
          dot.classList.add("calib-dot-done");
          setTimeout(() => {
            currentPoint++;
            clickCount = 0;
            if (currentPoint < positions.length) {
              progress.textContent = `Point ${currentPoint + 1} of ${positions.length} — Clicks: 0 / ${clicksNeeded}`;
              showPoint(currentPoint);
            } else {
              runValidation();
            }
          }, 300);
        }
      });

      area.appendChild(dot);
    }

    function runValidation() {
      area.innerHTML = "";
      instructions.textContent = "Accuracy check: look at the green dot for 3 seconds...";
      progress.textContent = "Measuring...";

      const dot = document.createElement("div");
      dot.className = "calib-dot calib-dot-validation";
      dot.style.left = "50%";
      dot.style.top = "50%";
      area.appendChild(dot);

      const targetX = window.innerWidth / 2;
      const targetY = window.innerHeight / 2;

      setTimeout(async () => {
        const accuracy = await EyeTracking.runAccuracyCheck(targetX, targetY, 3000);
        DataStore.setCalibrationAccuracy(accuracy);

        area.innerHTML = "";
        instructions.textContent = `Calibration complete! Accuracy: ${Math.round(accuracy)}%`;
        progress.textContent = "";

        const btn = document.createElement("button");
        btn.className = "btn btn-primary";
        btn.textContent = "Continue";
        btn.type = "button";
        btn.addEventListener("click", onComplete);
        area.appendChild(btn);
      }, 500);
    }

    showPoint(0);
  }

  function instructions(onBegin) {
    app().innerHTML = `
      <div class="screen instructions-screen">
        <h2>Instructions</h2>
        <div class="instruction-list">
          <p>Here's how the study works:</p>
          <ul>
            <li>You will be shown a series of stimuli (images, videos, audio clips, and text) across several phases.</li>
            <li>Each stimulus will be displayed for <strong>${STUDY_CONFIG.stimulusDuration} seconds</strong>.</li>
            <li>Press <kbd>SPACEBAR</kbd> to move to the next stimulus early if you wish.</li>
            <li>The <strong>"Stop Study"</strong> button is always available if you need to quit.</li>
            <li>Please try to look at the screen throughout — your gaze is being tracked.</li>
          </ul>
          <p>The study will now enter fullscreen mode for minimal distractions.</p>
        </div>
        <button id="begin-btn" class="btn btn-primary" type="button">Begin Study</button>
      </div>
    `;

    document.getElementById("begin-btn").addEventListener("click", onBegin);
  }

  function phaseIntro(phaseIndex, phase, totalPhases, onReady) {
    app().innerHTML = `
      <div class="screen phase-intro-screen">
        <div class="phase-label">Phase ${phaseIndex + 1} of ${totalPhases}</div>
        <h2>${phase.name}</h2>
        <p>${phase.description}</p>
        <button id="ready-btn" class="btn btn-primary" type="button">Ready</button>
      </div>
    `;

    document.getElementById("ready-btn").addEventListener("click", onReady);
  }

  function stimulus(stim, phaseIndex, stimIndex, totalInPhase) {
    let html = `<div class="screen stimulus-screen">`;
    html += `<div class="stimulus-info">Phase ${phaseIndex + 1} &mdash; Stimulus ${stimIndex + 1} of ${totalInPhase}</div>`;
    html += `<div id="stimulus-container" class="stimulus-container">`;

    switch (stim.type) {
      case "text":
        html += `<div class="stimulus-text">${_escapeHtml(stim.content)}</div>`;
        break;
      case "image":
        html += `<img class="stimulus-image" src="${_escapeHtml(stim.src)}" alt="Study stimulus" />`;
        break;
      case "video":
        html += `<video id="stimulus-video" class="stimulus-video" autoplay playsinline><source src="${_escapeHtml(stim.src)}" type="video/mp4"></video>`;
        break;
      case "audio":
        html += `
          <div class="audio-indicator">
            <div class="audio-wave">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <p>Audio playing...</p>
          </div>
          <audio id="stimulus-audio" autoplay><source src="${_escapeHtml(stim.src)}" type="audio/mpeg"></audio>
        `;
        break;
    }

    html += `</div></div>`;
    app().innerHTML = html;

    // Return the stimulus container rect for eye tracking
    const container = document.getElementById("stimulus-container");
    if (container) {
      const rect = container.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }
    return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
  }

  function phaseBreak(phaseIndex, totalPhases, onContinue) {
    app().innerHTML = `
      <div class="screen break-screen">
        <h2>Phase ${phaseIndex + 1} Complete</h2>
        <p>Take a moment to rest if you need to.</p>
        <p>${totalPhases - phaseIndex - 1} phase${totalPhases - phaseIndex - 1 !== 1 ? "s" : ""} remaining.</p>
        <button id="continue-btn" class="btn btn-primary" type="button">Continue to Phase ${phaseIndex + 2}</button>
      </div>
    `;

    document.getElementById("continue-btn").addEventListener("click", onContinue);
  }

  function completion(summary, submitResult) {
    const statusMsg = submitResult.success
      ? `<p class="success-msg">Data submitted successfully.</p>`
      : `<p class="warning-msg">Data could not be submitted automatically (${submitResult.reason || "unknown error"}). A backup has been saved locally.</p>`;

    app().innerHTML = `
      <div class="screen completion-screen">
        <h2>Study Complete</h2>
        <p>Thank you for participating.</p>
        <div class="summary-box">
          <p><strong>Participant:</strong> ${_escapeHtml(summary.participantId)}</p>
          <p><strong>Phases completed:</strong> ${summary.lastPhase} of ${STUDY_CONFIG.phases.length}</p>
          <p><strong>Stimuli viewed:</strong> ${summary.totalStimuliViewed}</p>
        </div>
        ${statusMsg}
        <p class="export-label">Download data:</p>
        <div class="export-buttons">
          <button id="export-responses-csv" class="btn btn-primary" type="button">Responses (.csv)</button>
          <button id="export-session-csv" class="btn btn-primary" type="button">Session Summary (.csv)</button>
          <button id="export-btn" class="btn btn-secondary" type="button">Full Backup (.json)</button>
        </div>
      </div>
    `;

    _bindExportButtons();
  }

  function dropout(summary, submitResult) {
    const statusMsg = submitResult.success
      ? `<p class="success-msg">Your data has been submitted.</p>`
      : `<p class="warning-msg">Data could not be submitted automatically. A backup has been saved locally.</p>`;

    app().innerHTML = `
      <div class="screen dropout-screen">
        <h2>Study Ended Early</h2>
        <p>Thank you for participating. Your partial data has been recorded.</p>
        <div class="summary-box">
          <p><strong>Participant:</strong> ${_escapeHtml(summary.participantId)}</p>
          <p><strong>Last phase reached:</strong> ${summary.lastPhase} of ${STUDY_CONFIG.phases.length}</p>
          <p><strong>Stimuli viewed:</strong> ${summary.totalStimuliViewed}</p>
        </div>
        ${statusMsg}
        <p class="export-label">Download data:</p>
        <div class="export-buttons">
          <button id="export-responses-csv" class="btn btn-primary" type="button">Responses (.csv)</button>
          <button id="export-session-csv" class="btn btn-primary" type="button">Session Summary (.csv)</button>
          <button id="export-btn" class="btn btn-secondary" type="button">Full Backup (.json)</button>
        </div>
      </div>
    `;

    _bindExportButtons();
  }

  function _bindExportButtons() {
    document.getElementById("export-responses-csv").addEventListener("click", _exportResponsesCsv);
    document.getElementById("export-session-csv").addEventListener("click", _exportSessionCsv);
    document.getElementById("export-btn").addEventListener("click", _exportBackupJson);
  }

  function _exportResponsesCsv() {
    const records = DataStore.getRecords();
    if (records.length === 0) {
      alert("No response data to export.");
      return;
    }

    const headers = [
      "participantId", "timestamp", "phaseIndex", "phaseName", "stimulusIndex",
      "stimulusType", "stimulusContent", "duration", "timeSpent", "skipped",
      "droppedOut", "gazeOnScreenPct", "gazeLookAways", "avgGazeX", "avgGazeY"
    ];

    const csv = _toCsv(headers, records);
    _downloadFile(csv, `bat_responses_${DataStore.getParticipantId()}.csv`, "text/csv");
  }

  function _exportSessionCsv() {
    const summary = DataStore.buildSessionSummary(true);
    const headers = [
      "participantId", "startTime", "endTime", "completed", "lastPhase",
      "lastStimulus", "totalStimuliViewed", "calibrationAccuracy"
    ];

    const csv = _toCsv(headers, [summary]);
    _downloadFile(csv, `bat_session_${DataStore.getParticipantId()}.csv`, "text/csv");
  }

  function _exportBackupJson() {
    const data = DataStore.exportLocalStorageData();
    _downloadFile(JSON.stringify(data, null, 2), `bat_backup_${DataStore.getParticipantId()}.json`, "application/json");
  }

  function _toCsv(headers, rows) {
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

  function _downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function _escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    welcome,
    consent,
    calibration,
    instructions,
    phaseIntro,
    stimulus,
    phaseBreak,
    completion,
    dropout
  };
})();
