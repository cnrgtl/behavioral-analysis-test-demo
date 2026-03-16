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

      // Remove WebGazer's built-in document click/mousemove listeners so that
      // only our explicit recordScreenPosition calls train the model during calibration.
      webgazer.removeMouseEventListeners();

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
      const interval = setInterval(() => {
        // WebGazer's getCurrentPrediction
        const pred = webgazer.getCurrentPrediction();
        if (pred) {
          samples.push({ x: pred.x, y: pred.y });
        }
        if (performance.now() - start > durationMs) {
          clearInterval(interval);
          if (samples.length === 0) {
            resolve(0);
            return;
          }
          // Compute average distance from target
          const avgDist = samples.reduce((sum, s) => {
            const dx = s.x - targetX;
            const dy = s.y - targetY;
            return sum + Math.sqrt(dx * dx + dy * dy);
          }, 0) / samples.length;

          // Convert to accuracy score (0-100).
          // 100px distance = ~50% accuracy, 0 distance = 100%
          const accuracy = Math.max(0, Math.min(100, 100 - (avgDist / 2)));
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

  function computeSummary() {
    if (_gazeData.length === 0) {
      return {
        gazeOnScreenPct: 0,
        gazeLookAways: 0,
        avgGazeX: 0,
        avgGazeY: 0
      };
    }

    const rect = _stimulusRect;
    let onScreenCount = 0;
    let lookAways = 0;
    let wasOnScreen = true;
    let sumX = 0;
    let sumY = 0;

    for (let i = 0; i < _gazeData.length; i++) {
      const g = _gazeData[i];
      const isOn = g.x >= rect.x && g.x <= rect.x + rect.width &&
                   g.y >= rect.y && g.y <= rect.y + rect.height;

      if (isOn) {
        onScreenCount++;
        // Normalise to 0-1 relative to stimulus rect
        sumX += (g.x - rect.x) / rect.width;
        sumY += (g.y - rect.y) / rect.height;
      }

      if (wasOnScreen && !isOn) {
        lookAways++;
      }
      wasOnScreen = isOn;
    }

    return {
      gazeOnScreenPct: Math.round((onScreenCount / _gazeData.length) * 10000) / 100,
      gazeLookAways: lookAways,
      avgGazeX: onScreenCount > 0 ? Math.round((sumX / onScreenCount) * 10000) / 10000 : 0,
      avgGazeY: onScreenCount > 0 ? Math.round((sumY / onScreenCount) * 10000) / 10000 : 0
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
    shutdown,
    isAvailable
  };
})();
