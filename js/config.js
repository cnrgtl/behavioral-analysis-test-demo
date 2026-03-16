/**
 * Study configuration for the Behaviour Avoidance Test.
 * Researchers: edit this file to configure phases, stimuli, and the webhook URL.
 */
const STUDY_CONFIG = {
  title: "Behaviour Avoidance Test",
  description: "This study measures behavioural avoidance responses to progressively intense stimuli related to emetophobia.",

  // Duration each stimulus is displayed (seconds)
  stimulusDuration: 20,

  // Duration of fixation cross between stimuli (seconds)
  fixationDuration: 3,

  // Power Automate HTTP trigger URL — paste yours here (for UCL production)
  webhookUrl: "",

  // Google Sheets Apps Script web app URL — for testing / temporary use
  googleSheetsUrl: "https://script.google.com/macros/s/AKfycbwDHdh0XbfrlGpd99MumuXL0O4ar6YqLDXcpDJMsU2k5Kn_r_jXQqINGwgpCrQ0RJk/exec",

  // Participant ID mode: "manual" (researcher types it) or "auto" (increments from localStorage)
  participantIdMode: "manual",

  phases: [
    {
      name: "Phase 1 — Mild",
      description: "Low intensity stimuli. Each stimulus is shown for 20 seconds.",
      stimuli: [
        { type: "text",  content: "Puke" },
        { type: "image", src: "stimuli/images/phase1_emoji_vomit.jpg" },
        { type: "image", src: "stimuli/images/phase1_cartoon_sick.png" },
        { type: "video", src: "stimuli/videos/phase1_simpsons_sick.mp4" }
      ]
    },
    {
      name: "Phase 2 — Moderate",
      description: "Moderate intensity. Remember, you can stop at any time.",
      stimuli: [
        { type: "text",  content: "I know I am going to throw up" },
        { type: "image", src: "stimuli/images/phase2_covering_mouth.jpg" },
        { type: "video", src: "stimuli/videos/phase2_carsick.mp4" },
        { type: "image", src: "stimuli/images/phase2_person_toilet.jpg" }
      ]
    },
    {
      name: "Phase 3 — Intense",
      description: "High intensity stimuli.",
      stimuli: [
        { type: "text",  content: "He was gargling his own vomit" },
        { type: "image", src: "stimuli/images/phase3_vomit_explicit.png" },
        { type: "video", src: "stimuli/videos/phase3_football_vomit.mp4" },
        { type: "video", src: "stimuli/videos/phase3_chain_reaction.mp4" }
      ]
    }
  ]
};
