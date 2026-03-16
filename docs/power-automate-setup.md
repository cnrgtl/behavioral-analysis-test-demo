# Power Automate Setup — BAT Data to OneDrive

This guide walks you through setting up automatic data saving from the Behaviour Avoidance Test to your UCL OneDrive. No coding required — just click-through setup.

---

## Prerequisites

- UCL Microsoft 365 account (your @ucl.ac.uk login)
- Access to Power Automate (included with UCL M365)

---

## Step 1: Find Power Automate

1. Go to **https://make.powerautomate.com**
2. Sign in with your **UCL credentials** (@ucl.ac.uk)
3. If you've never used it, you may need to accept the terms of service

Alternatively:
- Go to **https://portal.office.com** → click the grid/waffle menu (top-left) → look for **Power Automate**
- If it's not visible, click **"All apps"** → search for **"Power Automate"**

> **Can't find it?** UCL ISD may need to enable it for your account. Contact UCL IT support or ask your department admin.

---

## Step 2: Create the OneDrive Folder

In your OneDrive, create this folder structure:

```
BAT Study/
  Data/
```

Each participant's data will be saved as:
```
BAT Study/
  Data/
    P001_2026-03-16/
      responses.csv
      session.csv
      gaze_trail.csv
    P002_2026-03-16/
      responses.csv
      session.csv
      gaze_trail.csv
```

---

## Step 3: Create the Flow

### 3.1 — Start a new flow

1. In Power Automate, click **"+ Create"** (left sidebar)
2. Choose **"Instant cloud flow"**
3. Name it: `BAT Data Save`
4. Under "Choose how to trigger this flow", select **"When an HTTP request is received"**
5. Click **Create**

### 3.2 — Configure the HTTP trigger

1. Click the **"When an HTTP request is received"** trigger
2. Set **"Who can trigger the flow"** to **"Anyone"**
3. In the **"Request Body JSON Schema"** box, paste this:

```json
{
  "type": "object",
  "properties": {
    "session": {
      "type": "object",
      "properties": {
        "participantId": { "type": "string" },
        "startTime": { "type": "string" },
        "endTime": { "type": "string" },
        "completed": { "type": "boolean" },
        "lastPhase": { "type": "number" },
        "lastStimulus": { "type": "number" },
        "totalStimuliViewed": { "type": "number" },
        "calibrationAccuracy": { "type": "number" }
      }
    },
    "records": {
      "type": "array"
    },
    "gazeTrails": {
      "type": "array"
    },
    "responsesCsv": { "type": "string" },
    "sessionCsv": { "type": "string" },
    "gazeTrailCsv": { "type": "string" }
  }
}
```

4. Click **Save**. An **HTTP POST URL** will appear — **copy this URL**, you'll need it later.

### 3.3 — Add a "Compose" action (build folder name)

1. Click **"+ New step"**
2. Search for **"Compose"** → select **Compose**
3. In **Inputs**, enter this expression (click "Expression" tab):

```
concat(triggerBody()?['session']?['participantId'], '_', formatDateTime(utcNow(), 'yyyy-MM-dd'))
```

4. Rename this step to `FolderName`

### 3.4 — Create the participant folder

1. Click **"+ New step"**
2. Search for **"OneDrive for Business"** → select **"Create folder"**
3. Set:
   - **Folder path**: `/BAT Study/Data`
   - **Name**: select `Outputs` from the `FolderName` step (Dynamic content)

### 3.5 — Save the Responses CSV

1. Click **"+ New step"**
2. Search for **"OneDrive for Business"** → select **"Create file"**
3. Set:
   - **Folder Path**: click the folder icon → navigate to `/BAT Study/Data/` then select the dynamic `FolderName` output. Or type: `/BAT Study/Data/@{outputs('FolderName')}`
   - **File Name**: `responses.csv`
   - **File Content**: select `responsesCsv` from Dynamic content

### 3.6 — Save the Session CSV

1. Click **"+ New step"** → **"Create file"** (OneDrive for Business)
2. Set:
   - **Folder Path**: `/BAT Study/Data/@{outputs('FolderName')}`
   - **File Name**: `session.csv`
   - **File Content**: select `sessionCsv` from Dynamic content

### 3.7 — Save the Gaze Trail CSV

1. Click **"+ New step"** → **"Create file"** (OneDrive for Business)
2. Set:
   - **Folder Path**: `/BAT Study/Data/@{outputs('FolderName')}`
   - **File Name**: `gaze_trail.csv`
   - **File Content**: select `gazeTrailCsv` from Dynamic content

### 3.8 — Add a Response action

1. Click **"+ New step"**
2. Search for **"Response"** → select **Response**
3. Set:
   - **Status Code**: `200`
   - **Body**: `{ "status": "ok" }`

### 3.9 — Save the flow

Click **Save** in the top-right.

---

## Step 4: Copy the Webhook URL into the BAT

1. Go back to the trigger step — the **HTTP POST URL** should be visible
2. Copy the full URL (it looks like `https://prod-XX.westeurope.logic.azure.com/workflows/...`)
3. Open `js/config.js` in the BAT project
4. Paste the URL as the `webhookUrl` value:

```js
webhookUrl: "https://prod-XX.westeurope.logic.azure.com/workflows/...",
```

5. Save the file

---

## Step 5: Test It

1. Run the BAT study with a test participant (e.g. ID: `TEST001`)
2. Complete or stop the study
3. Check your OneDrive → `BAT Study/Data/` — you should see a folder like `TEST001_2026-03-16/` containing the three CSV files

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Power Automate not available** | Contact UCL ISD — it may need to be enabled for your account |
| **HTTP URL not appearing** | Make sure you saved the flow after adding the trigger |
| **Files not appearing in OneDrive** | Check the flow's "Run history" in Power Automate for errors |
| **"Folder already exists" error** | This is fine — Power Automate will still save the files |
| **Large gaze trail file** | Normal — can be ~500KB per participant. OneDrive handles this fine |

---

## Data Format Reference

### responses.csv
One row per stimulus viewed:
| Column | Description |
|--------|-------------|
| participantId | Participant identifier |
| timestamp | ISO timestamp |
| phaseIndex | Phase number (1-3) |
| phaseName | Phase label |
| stimulusIndex | Stimulus number within phase |
| stimulusType | text, image, or video |
| stimulusContent | Text content or file path |
| duration | Configured display time (20s) |
| timeSpent | Actual time spent (seconds) |
| skipped | true if confirmed skip |
| partialAvoidance | true if spacebar pressed (dimmed) |
| partialAvoidanceTime | Seconds spent in dimmed mode |
| droppedOut | true if stopped study on this stimulus |
| gazeOnScreenPct | % of gaze samples on stimulus |
| gazeLookAways | Number of times gaze left stimulus |
| avgGazeX | Average gaze X (0-1, normalised to stimulus) |
| avgGazeY | Average gaze Y (0-1, normalised to stimulus) |
| gazeOnExitPct | % of gaze samples near Stop Study button |

### session.csv
One row per session:
| Column | Description |
|--------|-------------|
| participantId | Participant identifier |
| startTime | Session start (ISO) |
| endTime | Session end (ISO) |
| completed | true if all stimuli viewed |
| lastPhase | Last phase reached |
| lastStimulus | Last stimulus viewed |
| totalStimuliViewed | Count of stimuli seen |
| calibrationAccuracy | Eye tracking accuracy % |

### gaze_trail.csv
One row per gaze sample (~20/second):
| Column | Description |
|--------|-------------|
| participantId | Participant identifier |
| phaseIndex | Phase number |
| stimulusIndex | Stimulus number |
| stimulusContent | What was shown |
| timestamp | performance.now() value |
| normX | Gaze X normalised to stimulus (0=left, 1=right) |
| normY | Gaze Y normalised to stimulus (0=top, 1=bottom) |
