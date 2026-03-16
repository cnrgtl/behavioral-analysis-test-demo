/**
 * WebGazer.js wrapper — collects only numeric gaze coordinates.
 * NO video frames are stored, recorded, or transmitted.
 * Camera frames are processed in-browser and immediately discarded.
 */
const EyeTracking = (() => {
  let _gazeData = [];
  let _collecting = false;
  let _stimulusRect = null;
  let _calibrationPoints = [];
  let _calibrationAccuracy = null;
  let _gazeListener = null;

  // Standard 9-point calibration positions (normalised 0-1)
  const CALIBRATION_POSITIONS = [
    { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.9, y: 0.1 },
    { x: 0.1, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.5 },
    { x: 0.1, y: 0.9 }, { x: 0.5, y: 0.9 }, { x: 0.9, y: 0.9 }
  ];

  const CLICKS_PER_POINT = 5;

  async function init() {
    if (typeof webgazer === "undefined") {
      console.warn("WebGazer.js not loaded — eye tracking disabled");
      return false;
    }

    try {
      // Point MediaPipe face mesh to CDN instead of local files
      webgazer.params.faceMeshSolutionPath = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/";

      webgazer
        .setRegression("ridge")
        .setGazeListener((data, clock) => {
          if (_collecting && data) {
            _gazeData.push({
              x: data.x,
              y: data.y,
              t: performance.now()
            });
          }
        })
        .saveDataAcrossSessions(false);

      await webgazer.begin();

      // Hide WebGazer's default video and overlay elements
      webgazer.showVideoPreview(false).showPredictionPoints(false).showFaceOverlay(false).showFaceFeedbackBox(false);

      // Keep WebGazer's click listeners active during calibration — it trains
      // the regression model from click positions. We only disable mousemove
      // training so that random mouse movements don't add noise.
      if (typeof webgazer.params !== "undefined") {
        webgazer.params.moveTickSize = Infinity; // disable mousemove training
      }

      // WebGazer injects container elements with z-index:99999 that can block clicks.
      // Ensure they don't intercept pointer events.
      const wgIds = [
        "webgazerVideoContainer", "webgazerVideoFeed", "webgazerVideoCanvas",
        "webgazerFaceOverlay", "webgazerFaceFeedbackBox", "webgazerGazeDot"
      ];
      wgIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.style.pointerEvents = "none";
          el.style.display = "none";
        }
      });

      return true;
    } catch (err) {
      console.error("WebGazer init failed:", err);
      return false;
    }
  }

  function getCalibrationPositions() {
    return CALIBRATION_POSITIONS;
  }

  function getClicksPerPoint() {
    return CLICKS_PER_POINT;
  }

  async function runAccuracyCheck(targetX, targetY, durationMs) {
    // Collect gaze for a few seconds while participant looks at a known point
    const samples = [];
    const start = performance.now();

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        try {
          const pred = await webgazer.getCurrentPrediction();
          if (pred && typeof pred.x === "number" && typeof pred.y === "number") {
            samples.push({ x: pred.x, y: pred.y });
          }
        } catch (e) {
          // ignore prediction errors
        }
        if (performance.now() - start > durationMs) {
          clearInterval(interval);
          if (samples.length === 0) {
            resolve(0);
            return;
          }

          // Drop first 40% of samples — warm-up noise while model converges
          const dropCount = Math.floor(samples.length * 0.4);
          const stable = samples.slice(dropCount);

          if (stable.length === 0) {
            resolve(0);
            return;
          }

          // Use median distance (robust against outliers) instead of mean
          const distances = stable.map(s => {
            const dx = s.x - targetX;
            const dy = s.y - targetY;
            return Math.sqrt(dx * dx + dy * dy);
          }).sort((a, b) => a - b);

          const medianDist = distances[Math.floor(distances.length / 2)];

          // Scale relative to screen size. For webcam-based tracking, ~10% of screen
          // diagonal is good precision. Use half the diagonal as the 0% threshold.
          const screenDiag = Math.hypot(window.innerWidth, window.innerHeight);
          const maxDist = screenDiag * 0.5;
          const accuracy = Math.max(0, Math.min(100, (1 - medianDist / maxDist) * 100));
          console.log(`[BAT Calibration] total: ${samples.length}, used: ${stable.length}, medianDist: ${Math.round(medianDist)}px, maxDist: ${Math.round(maxDist)}px, accuracy: ${Math.round(accuracy)}%, target: (${Math.round(targetX)}, ${Math.round(targetY)}), lastSample: (${Math.round(stable[stable.length-1].x)}, ${Math.round(stable[stable.length-1].y)})`);
          _calibrationAccuracy = accuracy;
          resolve(accuracy);
        }
      }, 50);
    });
  }

  function getCalibrationAccuracy() {
    return _calibrationAccuracy;
  }

  function startCollecting(stimulusRect) {
    _gazeData = [];
    _stimulusRect = stimulusRect || { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    _collecting = true;
  }

  function stopCollecting() {
    _collecting = false;
    return computeSummary();
  }

  function getRawGazeTrail() {
    if (_gazeData.length === 0 || !_stimulusRect) return [];
    const rect = _stimulusRect;
    return _gazeData.map(g => ({
      t: Math.round(g.t * 100) / 100,
      normX: Math.round(((g.x - rect.x) / rect.width) * 10000) / 10000,
      normY: Math.round(((g.y - rect.y) / rect.height) * 10000) / 10000
    }));
  }

  function computeSummary() {
    if (_gazeData.length === 0) {
      return {
        gazeOnScreenPct: 0,
        gazeLookAways: 0,
        avgGazeX: 0,
        avgGazeY: 0,
        gazeOnExitPct: 0
      };
    }

    const rect = _stimulusRect;
    let onScreenCount = 0;
    let lookAways = 0;
    let wasOnScreen = true;
    let sumX = 0;
    let sumY = 0;
    let onExitCount = 0;

    // Get Stop Study button bounds
    const exitBtn = document.getElementById("stop-btn");
    const exitRect = exitBtn ? exitBtn.getBoundingClientRect() : null;
    // Add padding around the button to catch nearby glances
    const exitPad = 30;

    for (let i = 0; i < _gazeData.length; i++) {
      const g = _gazeData[i];
      const isOn = g.x >= rect.x && g.x <= rect.x + rect.width &&
                   g.y >= rect.y && g.y <= rect.y + rect.height;

      if (isOn) {
        onScreenCount++;
        sumX += (g.x - rect.x) / rect.width;
        sumY += (g.y - rect.y) / rect.height;
      }

      if (wasOnScreen && !isOn) {
        lookAways++;
      }
      wasOnScreen = isOn;

      // Check if gaze is near the exit button
      if (exitRect) {
        const isOnExit = g.x >= exitRect.x - exitPad && g.x <= exitRect.right + exitPad &&
                         g.y >= exitRect.y - exitPad && g.y <= exitRect.bottom + exitPad;
        if (isOnExit) onExitCount++;
      }
    }

    return {
      gazeOnScreenPct: Math.round((onScreenCount / _gazeData.length) * 10000) / 100,
      gazeLookAways: lookAways,
      avgGazeX: onScreenCount > 0 ? Math.round((sumX / onScreenCount) * 10000) / 10000 : 0,
      avgGazeY: onScreenCount > 0 ? Math.round((sumY / onScreenCount) * 10000) / 10000 : 0,
      gazeOnExitPct: Math.round((onExitCount / _gazeData.length) * 10000) / 100
    };
  }

  function shutdown() {
    _collecting = false;
    _gazeData = [];
    try {
      if (typeof webgazer !== "undefined") {
        webgazer.end();
      }
    } catch (e) {
      console.warn("WebGazer shutdown error:", e);
    }
  }

  function isAvailable() {
    return typeof webgazer !== "undefined";
  }

  return {
    init,
    getCalibrationPositions,
    getClicksPerPoint,
    runAccuracyCheck,
    getCalibrationAccuracy,
    startCollecting,
    stopCollecting,
    getRawGazeTrail,
    shutdown,
    isAvailable
  };
})();
