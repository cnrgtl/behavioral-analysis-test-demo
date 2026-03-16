/**
 * Precision timer using performance.now() for stimulus timing.
 * The visual countdown uses requestAnimationFrame for smooth updates.
 * Actual measurement is decoupled from the visual display.
 */
const Timer = (() => {
  let _startTime = 0;
  let _duration = 0;
  let _rafId = null;
  let _onTick = null;
  let _onComplete = null;
  let _running = false;

  function start(durationSec, onTick, onComplete) {
    _duration = durationSec;
    _onTick = onTick;
    _onComplete = onComplete;
    _startTime = performance.now();
    _running = true;
    _tick();
  }

  function _tick() {
    if (!_running) return;

    const elapsed = (performance.now() - _startTime) / 1000;
    const remaining = Math.max(0, _duration - elapsed);

    if (_onTick) _onTick(remaining, elapsed);

    if (remaining <= 0) {
      _running = false;
      if (_onComplete) _onComplete();
      return;
    }

    _rafId = requestAnimationFrame(_tick);
  }

  function stop() {
    _running = false;
    if (_rafId) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
    const elapsed = (performance.now() - _startTime) / 1000;
    return elapsed;
  }

  function getElapsed() {
    if (!_running) return 0;
    return (performance.now() - _startTime) / 1000;
  }

  function isRunning() {
    return _running;
  }

  return { start, stop, getElapsed, isRunning };
})();
