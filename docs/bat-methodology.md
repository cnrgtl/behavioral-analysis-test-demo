# Behaviour Avoidance Test (BAT) — Methodology & Design

## Overview

The Behaviour Avoidance Test is a web-based tool designed to measure behavioural avoidance responses to progressively intense emetophobia-related stimuli. It combines stimulus presentation with webcam-based eye tracking to capture both overt avoidance behaviours (skipping, dropping out) and covert avoidance patterns (gaze aversion, fixation on exit controls).

The test is self-contained, runs entirely in the browser, and can be administered remotely without researcher supervision.

---

## Stimuli Selection & Categorisation

### Source material

Stimuli were sourced from the BIA Journey clinical content library, which provides graded exposure materials for emetophobia treatment. Approximately 200 stimuli were reviewed in total:

- **~139 images** (photographs, cartoons, emojis, illustrations, GIFs)
- **~59 videos** (movie clips, cartoons, talk shows, real footage)
- **~27 text items** (words, phrases, sentences, descriptive passages)

### Categorisation process

Each stimulus was independently categorised into one of three severity levels:

| Level | Criteria | Examples |
|-------|----------|---------|
| **Phase 1 — Mild** | Cartoon/illustrated, abstract, indirect references, emojis, single words | Nauseated face emoji, cartoon character turning green, the word "Puke" |
| **Phase 2 — Moderate** | Realistic but indirect. Real people looking unwell, suggestive postures, environmental cues | Person hunched over toilet, someone covering mouth, woman experiencing car sickness |
| **Phase 3 — Intense** | Explicit/graphic. Visible vomiting, real footage, vivid sensory descriptions | Football player vomiting on field (live TV footage), chain-reaction vomiting scene, "He was gargling his own vomit" |

**Image categorisation** was performed by reviewing each image individually and assessing the directness, realism, and graphic nature of the emetophobia-related content.

**Video categorisation** used frame extraction (10 evenly-spaced thumbnails per video) to assess visual content. Videos where the emetophobia relevance was purely verbal (e.g. stand-up comedy, talk show anecdotes) were noted as lower severity than those with visual depictions.

**Text categorisation** was based on specificity and vividness — single words (mild) through descriptive sentences (moderate) to graphic sensory descriptions (intense).

### Final stimulus selection

12 stimuli were selected for the test — 4 per phase, with mixed media types within each phase to test avoidance across different modalities:

| # | Phase | Type | Stimulus |
|---|-------|------|----------|
| 1 | Mild | Text | "Puke" |
| 2 | Mild | Image | Vomiting face emoji (high-res) |
| 3 | Mild | Image | Cartoon character looking green/sick |
| 4 | Mild | Video | The Simpsons — family food poisoning scene |
| 5 | Moderate | Text | "I know I am going to throw up" |
| 6 | Moderate | Image | Man covering mouth, looking nauseous |
| 7 | Moderate | Video | Woman experiencing car sickness |
| 8 | Moderate | Image | Person slumped next to toilet |
| 9 | Intense | Text | "He was gargling his own vomit" |
| 10 | Intense | Image | Woman projectile vomiting (movie scene) |
| 11 | Intense | Video | Football player vomiting on field (looped) |
| 12 | Intense | Video | Chain-reaction vomiting outside hospital ER |

### Design rationale

- **Mixed media within each phase** ensures avoidance is tested across modalities — text, images, and video produce different engagement patterns
- **Progressive within and between phases** — each phase starts with its least intense type (text) and ends with the most confronting (video/image)
- **12 stimuli** provides sufficient data points to identify dropout thresholds without causing participant fatigue
- **Videos shorter than 20 seconds are looped** to maintain continuous exposure for the full duration

---

## Test Structure

### Timing

| Component | Duration |
|-----------|----------|
| Stimulus display | 20 seconds |
| Fixation cross between stimuli | 3 seconds |
| Total stimulus time | ~4 minutes |
| Fixation crosses | ~36 seconds |
| Phase transitions | ~15 seconds (participant-paced) |
| **Approximate total** | **~5 minutes** |

### Flow

```
Welcome → Consent & Webcam → Eye Tracking Calibration → Instructions
  → Phase 1 (4 stimuli) → Phase Break
  → Phase 2 (4 stimuli) → Phase Break
  → Phase 3 (4 stimuli) → Study Complete
```

Each stimulus follows this sequence:

```
[Fixation cross +] → [Stimulus displayed] → [Fixation cross +] → [Next stimulus]
      3 seconds            20 seconds              3 seconds
```

### Fixation cross

A `+` symbol is displayed centrally between each stimulus for 3 seconds. This serves two purposes:

1. **Gaze reset** — returns the participant's eyes to the centre of the screen before the next stimulus appears, providing a consistent starting gaze position
2. **Baseline reference** — gaze data during fixation can be compared against gaze during stimulus to isolate avoidance-specific gaze behaviour

### Stimulus duration rationale

20 seconds per stimulus was chosen because it is:
- Long enough to capture genuine avoidance behaviour (a participant who can't tolerate the stimulus will act within this window)
- Short enough that remaining does not feel like an endurance test, which would confound avoidance data with general fatigue

---

## Avoidance Measurement

The test captures four distinct levels of avoidance behaviour, forming a gradient from mild discomfort to full withdrawal:

### 1. Gaze aversion (covert avoidance)

Measured via webcam-based eye tracking. The system records:

- **gazeOnScreenPct** — percentage of gaze samples that fell within the stimulus boundaries. A participant averting their eyes will show a lower percentage.
- **gazeLookAways** — number of times the gaze left the stimulus area and returned. Frequent look-aways suggest difficulty maintaining attention on the stimulus.
- **avgGazeX / avgGazeY** — average gaze position normalised to the stimulus (0,0 = top-left, 1,1 = bottom-right). Allows analysis of whether participants fixated on the most confronting region of an image or avoided it.
- **gazeOnExitPct** — percentage of gaze samples that fell near the "Stop Study" button. A participant who repeatedly looks at the exit button is considering withdrawal even if they don't act on it.

### 2. Partial avoidance ("hand over face")

When a participant presses the spacebar during stimulus display:

- The stimulus is **dimmed** with a 75% dark overlay
- The text "Press spacebar to skip" appears
- The stimulus continues playing underneath the overlay
- The timer continues running

This mimics the common behaviour of watching something uncomfortable through partially covered eyes. The participant can:
- **Press spacebar again** to confirm a full skip
- **Press Escape** to remove the overlay and return to full viewing
- **Wait for the timer to expire** — the stimulus ends naturally while dimmed

Recorded as:
- **partialAvoidance** (true/false) — whether the participant triggered the dim overlay
- **partialAvoidanceTime** (seconds) — how long the stimulus was viewed in dimmed mode

### 3. Skip (overt avoidance)

A two-press spacebar sequence confirms a skip:
1. First press dims the stimulus (partial avoidance)
2. Second press confirms the skip

This two-step design prevents accidental skips and separates "considered avoiding" from "committed to avoiding." After a confirmed skip, a recovery screen displays for 20 seconds ("Next stimulus shown in X seconds") before the next stimulus.

Recorded as:
- **skipped** (true/false)
- **timeSpent** (seconds) — how long the participant viewed the stimulus before skipping

### 4. Dropout (full withdrawal)

The "Stop Study" button is always visible during stimulus display. Clicking it triggers a confirmation dialog. If confirmed, the study ends and all data collected to that point is saved.

Recorded as:
- **droppedOut** (true/false) — which stimulus triggered the withdrawal

### No visible timer

The stimulus display screen contains no countdown, progress indicator, or phase label. This design decision ensures:
- The participant's gaze is not drawn to peripheral UI elements
- Time pressure does not confound avoidance behaviour
- The only visual on screen is the stimulus itself

---

## Eye Tracking

### Technology

The test uses WebGazer.js, an open-source webcam-based eye tracking library that runs entirely in the browser. It uses:

- MediaPipe Face Mesh for facial landmark detection
- Ridge regression for gaze prediction

No video or images of the participant are recorded, stored, or transmitted. The camera feed is processed in real-time and immediately discarded. Only numeric gaze coordinates (x, y pixel positions) are collected.

### Calibration

A 9-point calibration procedure is conducted before the study begins:

1. The participant clicks on 9 dots positioned in a 3x3 grid across the screen
2. Each dot requires 5 clicks while the participant looks directly at it
3. A visual progress ring fills around each dot to indicate completion
4. After calibration, a validation dot appears at the centre of the screen for 3 seconds
5. The system measures gaze accuracy against the known dot position

Accuracy is scored as a percentage:
- **80%+** — Excellent
- **60-79%** — Good (usable for the study)
- **Below 60%** — Poor (recalibration option offered)

The accuracy score is recorded in the session data and can be used to filter or weight results in analysis.

### Gaze trail data

In addition to summary statistics, the raw gaze trail is captured for each stimulus — every gaze sample with:

- **timestamp** — seconds since stimulus onset (0.00 = stimulus appeared)
- **normX** — horizontal gaze position normalised to the stimulus (0 = left edge, 1 = right edge)
- **normY** — vertical gaze position normalised to the stimulus (0 = top edge, 1 = bottom edge)

At approximately 20 samples per second over 20 seconds, this provides ~400 data points per stimulus. This data enables:

- **Heatmap generation** — visualising where on each stimulus the participant focused
- **Region of interest (ROI) analysis** — defining areas of an image (e.g. "person's head" vs "wall") and calculating time-in-region
- **Gaze path analysis** — tracking whether participants started on the confronting region and moved away, or avoided it entirely from the outset
- **Temporal analysis** — how gaze patterns change over the 20-second exposure

---

## Data Collection

### What is captured per stimulus

| Field | Description |
|-------|-------------|
| participantId | Auto-generated identifier (PARTICIPANT_01, 02, etc.) |
| timestamp | ISO timestamp of when the stimulus was viewed |
| phaseIndex | Phase number (1-3) |
| phaseName | Phase label (e.g. "Phase 1 — Mild") |
| stimulusIndex | Stimulus number within the phase (1-4) |
| stimulusType | text, image, or video |
| stimulusContent | The text content or media file path |
| duration | Configured display time (20 seconds) |
| timeSpent | Actual time the participant viewed the stimulus |
| skipped | Whether the participant confirmed a skip |
| partialAvoidance | Whether the participant triggered the dim overlay |
| partialAvoidanceTime | Seconds spent viewing through the dim overlay |
| droppedOut | Whether the participant stopped the study on this stimulus |
| gazeOnScreenPct | Percentage of gaze samples on the stimulus |
| gazeLookAways | Number of times gaze left and returned to the stimulus |
| avgGazeX | Average horizontal gaze position (0-1) |
| avgGazeY | Average vertical gaze position (0-1) |
| gazeOnExitPct | Percentage of gaze samples near the Stop Study button |

### What is captured per session

| Field | Description |
|-------|-------------|
| participantId | Participant identifier |
| startTime | Session start (ISO timestamp) |
| endTime | Session end (ISO timestamp) |
| completed | Whether all 12 stimuli were viewed |
| lastPhase | Last phase reached (1-3) |
| lastStimulus | Last stimulus viewed |
| totalStimuliViewed | Total count of stimuli seen |
| calibrationAccuracy | Eye tracking calibration accuracy percentage |

### Data storage

Data is automatically submitted to Laura's UCL OneDrive via a Microsoft Power Automate webhook. Three CSV files are created per participant:

1. **responses.csv** — one row per stimulus with all behavioural and gaze metrics
2. **session.csv** — one row session summary
3. **gaze_trail.csv** — raw gaze coordinates (~400 rows per stimulus)

A Google Sheets backup is used as a fallback if the primary submission fails. Local CSV downloads are also available on the completion screen.

### Participant identification

Participant IDs are auto-generated and incrementing (PARTICIPANT_01, PARTICIPANT_02, etc.) using browser localStorage. This means:

- IDs are unique per device/browser
- No personally identifiable information is collected
- The counter resets if localStorage is cleared

---

## Technical Requirements

### For participants

- A computer with a webcam (laptop webcam is sufficient)
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Stable internet connection (for submitting results)
- The test does not work on mobile devices or tablets (eye tracking requires a fixed webcam position)

### For researchers

- Access to Laura's UCL OneDrive to retrieve data
- The test URL can be shared directly with participants — no software installation required

---

## Ethical Considerations in Design

- **Informed consent** is obtained before the study begins, with clear disclosure of webcam usage and data collection
- **No video recording** — the webcam feed is processed in-browser and immediately discarded
- **Voluntary withdrawal** — the Stop Study button is always visible and accessible
- **Graded exposure** — stimuli are presented in order of increasing intensity, giving participants the opportunity to withdraw before encountering the most graphic content
- **Recovery period** — a 20-second pause is provided after any skipped stimulus
- **Two-step skip** — prevents accidental exits while ensuring participants can always disengage
- **Data minimisation** — only behavioural metrics and gaze coordinates are collected; no personal data, IP addresses, or device identifiers are stored
