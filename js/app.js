/**
 * Main app controller — state management, view routing, keyboard handling,
 * stimulus progression, preloading, fullscreen, and stop-study flow.
 */
const App = (() => {
  // ── State ──────────────────────────────────────────────────────────────
  let _currentPhase = 0;
  let _currentStimulus = 0;
  let _studyActive = false;
  let _spacebarEnabled = false;
  let _dimmed = false;
  let _dimmedAt = null;
  let _preloadedElements = [];
  let _recoveryInterval = null;
  let _fixationTimeout = null;

  // ── DOM refs ───────────────────────────────────────────────────────────
  const stopBtn       = () => document.getElementById("stop-btn");
  const countdownEl   = () => document.getElementById("countdown");
  const modalOverlay  = () => document.getElementById("modal-overlay");
  const modalCancel   = () => document.getElementById("modal-cancel");
  const modalConfirm  = () => document.getElementById("modal-confirm");

  // ── Initialisation ─────────────────────────────────────────────────────
  function init() {
    _bindGlobalKeys();
    _bindStopButton();
    Views.welcome(_onWelcomeStart);
  }

  // ── View transitions ──────────────────────────────────────────────────

  function _onWelcomeStart(participantId) {
    if (participantId) {
      DataStore.setParticipantId(participantId);
    } else {
      DataStore.setParticipantId(DataStore.generateParticipantId());
    }
    Views.consent(_onConsent);
  }

  async function _onConsent() {
    // Initialise WebGazer (it will request its own camera stream)
    const ok = await EyeTracking.init();
    if (!ok && EyeTracking.isAvailable()) {
      console.warn("Eye tracking init failed — continuing without gaze data.");
    }
    Views.calibration(_onCalibrationComplete);
  }

  function _onCalibrationComplete() {
    Views.instructions(_onBeginStudy);
  }

  async function _onBeginStudy() {
    DataStore.startSession();
    _studyActive = true;
    _currentPhase = 0;
    _currentStimulus = 0;
    _showStopBtn(true);
    _startPhase();
  }

  // ── Phase / Stimulus flow ─────────────────────────────────────────────

  function _startPhase() {
    const phases = STUDY_CONFIG.phases;
    if (_currentPhase >= phases.length) {
      _endStudy(true);
      return;
    }
    _currentStimulus = 0;
    const phase = phases[_currentPhase];
    _preloadPhaseStimuli(phase);
    Views.phaseIntro(_currentPhase, phase, phases.length, _startNextStimulus);
  }

  function _startNextStimulus() {
    const phase = STUDY_CONFIG.phases[_currentPhase];
    if (_currentStimulus >= phase.stimuli.length) {
      // Phase complete
      if (_currentPhase < STUDY_CONFIG.phases.length - 1) {
        Views.phaseBreak(_currentPhase, STUDY_CONFIG.phases.length, () => {
          _currentPhase++;
          _startPhase();
        });
      } else {
        _endStudy(true);
      }
      return;
    }

    // Show fixation cross before stimulus
    _showCountdown(false);
    _fixationTimeout = Views.fixation(STUDY_CONFIG.fixationDuration, _presentStimulus);
  }

  function _presentStimulus() {
    _fixationTimeout = null;
    _dimmed = false;
    _dimmedAt = null;

    const phase = STUDY_CONFIG.phases[_currentPhase];
    const stim = phase.stimuli[_currentStimulus];
    const rect = Views.stimulus(stim, _currentPhase, _currentStimulus, phase.stimuli.length);

    // No countdown shown — clean stimulus view
    _showCountdown(false);
    _spacebarEnabled = true;

    // Start eye-tracking collection
    EyeTracking.startCollecting(rect);

    // Start precision timer
    Timer.start(
      STUDY_CONFIG.stimulusDuration,
      () => {},  // no visible countdown
      () => _onStimulusEnd(false)  // timer expired naturally
    );
  }

  function _onStimulusEnd(skipped, droppedOut) {
    if (!_studyActive && !droppedOut) return;

    _spacebarEnabled = false;
    const timeSpent = Timer.stop();
    _showCountdown(false);

    // Calculate partial avoidance time
    const partialAvoidanceTime = _dimmedAt
      ? Math.round((performance.now() - _dimmedAt) / 1000 * 1000) / 1000
      : 0;
    const partialAvoidance = _dimmedAt != null;

    // Reset dim state
    _dimmed = false;
    _dimmedAt = null;
    Views.showDimOverlay(false);

    // Grab raw gaze trail before stopping (stopCollecting clears data)
    const gazeTrail = EyeTracking.getRawGazeTrail();

    // Stop gaze collection and get summary
    const gaze = EyeTracking.stopCollecting();

    // Stop any playing media
    _stopMedia();

    // Build record
    const phase = STUDY_CONFIG.phases[_currentPhase];
    const stim = phase.stimuli[_currentStimulus];

    DataStore.addStimulusRecord({
      phaseIndex: _currentPhase + 1,
      phaseName: phase.name,
      stimulusIndex: _currentStimulus + 1,
      stimulusType: stim.type,
      stimulusContent: stim.type === "text" ? stim.content : (stim.src || ""),
      duration: STUDY_CONFIG.stimulusDuration,
      timeSpent: timeSpent,
      skipped: skipped,
      partialAvoidance: partialAvoidance,
      partialAvoidanceTime: partialAvoidanceTime,
      droppedOut: droppedOut || false,
      gazeOnScreenPct: gaze.gazeOnScreenPct,
      gazeLookAways: gaze.gazeLookAways,
      avgGazeX: gaze.avgGazeX,
      avgGazeY: gaze.avgGazeY,
      gazeOnExitPct: gaze.gazeOnExitPct,
      gazeTrail: gazeTrail
    });

    if (droppedOut) return; // dropout flow handles what's next

    _currentStimulus++;

    if (skipped) {
      // Show recovery screen for 20 seconds before next stimulus
      _showCountdown(false);
      _recoveryInterval = Views.recovery(STUDY_CONFIG.stimulusDuration, () => {
        _recoveryInterval = null;
        _startNextStimulus();
      });
    } else {
      _startNextStimulus();
    }
  }

  // ── End study ─────────────────────────────────────────────────────────

  async function _endStudy(completed) {
    _studyActive = false;
    _spacebarEnabled = false;
    _showStopBtn(false);
    _showCountdown(false);

    // Shut down eye tracking
    EyeTracking.shutdown();

    // Submit data
    const result = await DataStore.submitData(completed);
    const summary = DataStore.buildSessionSummary(completed);

    if (completed) {
      Views.completion(summary, result);
    } else {
      Views.dropout(summary, result);
    }
  }

  // ── Stop Study flow ───────────────────────────────────────────────────

  function _bindStopButton() {
    stopBtn().addEventListener("click", _showStopModal);
    modalCancel().addEventListener("click", _hideStopModal);
    modalConfirm().addEventListener("click", _confirmStop);
  }

  function _showStopModal() {
    modalOverlay().classList.remove("hidden");
  }

  function _hideStopModal() {
    modalOverlay().classList.add("hidden");
  }

  function _confirmStop() {
    _hideStopModal();

    // Clear recovery interval if active
    if (_recoveryInterval) {
      clearInterval(_recoveryInterval);
      _recoveryInterval = null;
    }

    // Clear fixation timeout if active
    if (_fixationTimeout) {
      clearTimeout(_fixationTimeout);
      _fixationTimeout = null;
    }

    // If timer is running, end current stimulus as dropped out
    if (Timer.isRunning()) {
      _onStimulusEnd(false, true);
    }

    _endStudy(false);
  }

  // ── Keyboard handling ─────────────────────────────────────────────────

  let _lastSpaceTime = 0;

  function _bindGlobalKeys() {
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && _spacebarEnabled) {
        e.preventDefault();

        // Debounce (300ms)
        const now = performance.now();
        if (now - _lastSpaceTime < 300) return;
        _lastSpaceTime = now;

        if (!_dimmed) {
          // First press — dim the stimulus, show skip prompt
          _dimmed = true;
          _dimmedAt = performance.now();
          Views.showDimOverlay(true);
        } else {
          // Second press — confirm skip
          Views.showDimOverlay(false);
          _onStimulusEnd(true);
        }
      }

      if (e.code === "Escape" && _spacebarEnabled && _dimmed) {
        e.preventDefault();
        // Un-dim — participant changed their mind
        _dimmed = false;
        Views.showDimOverlay(false);
        // Keep _dimmedAt set so we still record that partial avoidance happened
      }
    });
  }

  // ── UI helpers ────────────────────────────────────────────────────────

  function _showStopBtn(visible) {
    const btn = stopBtn();
    if (btn) btn.classList.toggle("hidden", !visible);
  }

  function _showCountdown(visible) {
    const el = countdownEl();
    if (el) el.classList.toggle("hidden", !visible);
  }

  function _stopMedia() {
    const video = document.getElementById("stimulus-video");
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    const audio = document.getElementById("stimulus-audio");
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  }

  // ── Preloading ────────────────────────────────────────────────────────

  function _preloadPhaseStimuli(phase) {
    // Clean up previous preloads
    _preloadedElements = [];

    phase.stimuli.forEach((stim) => {
      if (stim.type === "image") {
        const img = new Image();
        img.src = stim.src;
        _preloadedElements.push(img);
      } else if (stim.type === "video") {
        const vid = document.createElement("video");
        vid.preload = "auto";
        vid.src = stim.src;
        _preloadedElements.push(vid);
      } else if (stim.type === "audio") {
        const aud = new Audio();
        aud.preload = "auto";
        aud.src = stim.src;
        _preloadedElements.push(aud);
      }
    });
  }

  // ── Public API ────────────────────────────────────────────────────────
  return { init };
})();

// ── Boot ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", App.init);
