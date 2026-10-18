/**
 * Wet-brick challenge copy. The safety and eligibility rules below are a DRAFT written for the
 * organisers to review. While `rulesApproved` is false the page labels them as a draft.
 * Set it to true only after the organisers have approved (or edited) them.
 */
export const CHALLENGE = {
  durationSeconds: 60,
  rulesApproved: false,
  steps: [
    "Tell a TERRA UTSAV team member you want to try. They will explain the rules and check you are good to go.",
    "Dry your hands. The team member hands you one wet brick.",
    "Hold it in one hand, the way the team member shows you. Your other hand stays clear of the brick.",
    "The team member starts the official 60-second timer.",
    "Keep holding until the timer ends. The team member confirms whether the attempt counts.",
  ],
  safety: [
    "A TERRA UTSAV team member supervises every attempt from start to finish.",
    "You can stop at any moment. Hand the brick back or set it down; never throw or drop it on purpose.",
    "Attempts take place in a clear area chosen by the organisers, away from people walking past.",
    "Please do not take part if you have a hand, wrist, arm or shoulder injury, or have been told to avoid lifting.",
    "The team member can stop an attempt at any time if it does not look safe.",
  ],
  eligibility: [
    "Who can take part, and how many attempts each person gets, is decided by the organisers on the day.",
    "One person, one brick, one hand at a time.",
    "The team member's decision on whether an attempt counts is final.",
  ],
} as const;
