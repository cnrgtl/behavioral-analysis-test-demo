/**
 * Study configuration for the Behaviour Avoidance Test.
 * Researchers: edit this file to configure phases, stimuli, and the webhook URL.
 */
const STUDY_CONFIG = {
  title: "Behaviour Avoidance Test",
  description: "This study measures behavioural avoidance responses to progressively intense stimuli related to emetophobia.",

  // Duration each stimulus is displayed (seconds)
  stimulusDuration: 30,

  // Power Automate HTTP trigger URL — paste yours here (for UCL production)
  webhookUrl: "",

  // Google Sheets Apps Script web app URL — for testing / temporary use
  googleSheetsUrl: "https://script.google.com/macros/s/AKfycbwDHdh0XbfrlGpd99MumuXL0O4ar6YqLDXcpDJMsU2k5Kn_r_jXQqINGwgpCrQ0RJk/exec",

  // Participant ID mode: "manual" (researcher types it) or "auto" (increments from localStorage)
  participantIdMode: "manual",

  phases: [
    {
      name: "Phase 1 — Mild",
      description: "Low intensity stimuli. Press SPACE to skip, or wait 30 seconds.",
      stimuli: [
        { type: "text",  content: "vomit" },
        { type: "text",  content: "feeling nauseous" },
        { type: "image", src: "stimuli/images/mild_01.jpg" },
        { type: "audio", src: "stimuli/audio/mild_01.mp3" }
      ]
    },
    {
      name: "Phase 2 — Moderate",
      description: "Moderate intensity. Remember, you can stop at any time.",
      stimuli: [
        { type: "image", src: "stimuli/images/mod_01.jpg" },
        { type: "video", src: "stimuli/videos/mod_01.mp4" },
        { type: "audio", src: "stimuli/audio/mod_01.mp3" }
      ]
    },
    {
      name: "Phase 3 — Intense",
      description: "High intensity stimuli.",
      stimuli: [
        { type: "video", src: "stimuli/videos/intense_01.mp4" },
        { type: "image", src: "stimuli/images/intense_01.jpg" }
      ]
    }
  ]
};
