/**
 * Adaptive Scoring & Evaluation Logic
 * 
 * Score-to-Difficulty Mapping:
 * - 1-3: Easy
 * - 4-6: Medium
 * - 7-9: Hard
 *
 * Initial Adaptive Score:
 * - Easy: 3
 * - Medium: 5
 * - Hard: 7
 *
 * Score change rules based on answer quality:
 * - "excellent": +2
 * - "good": +1
 * - "average": 0
 * - "weak": -1
 * - "incorrect" / "unanswered": -2
 */

const QUALITY_SCORE_CHANGES = {
  excellent: 2,
  good: 1,
  average: 0,
  weak: -1,
  incorrect: -2,
  unanswered: -2,
};

function getInitialAdaptiveScore(difficulty) {
  switch ((difficulty || "").toLowerCase()) {
    case "easy":
      return 3;
    case "hard":
      return 7;
    case "medium":
    default:
      return 5;
  }
}

function mapScoreToDifficulty(score) {
  const clamped = Math.max(1, Math.min(10, Math.round(score)));
  if (clamped <= 3) return "easy";
  if (clamped <= 6) return "medium";
  return "hard";
}

function clampScore(score) {
  return Math.max(1, Math.min(10, Math.round(score)));
}

/**
 * Validates and computes the adaptive score transition.
 * Ensures the score change is between -2 and +2 and strictly clamped to [1, 9].
 */
function computeAdaptiveTransition({ currentScore, quality, isUnanswered = false }) {
  const scoreBefore = clampScore(currentScore ?? 5);

  let effectiveQuality = quality;
  if (isUnanswered) {
    effectiveQuality = "unanswered";
  }

  let delta = QUALITY_SCORE_CHANGES[effectiveQuality];
  if (typeof delta !== "number") {
    // Fallback if an unknown quality string was supplied
    delta = 0;
    effectiveQuality = "average";
  }

  // Double safeguard: delta never exceeds +/-2
  delta = Math.max(-2, Math.min(2, delta));

  const scoreAfter = clampScore(scoreBefore + delta);
  const actualChange = scoreAfter - scoreBefore;
  const nextTargetDifficulty = mapScoreToDifficulty(scoreAfter);

  let changeReason = "";
  switch (effectiveQuality) {
    case "excellent":
      changeReason = "Excellent answer demonstrating thorough correctness, precision, and depth (+2 difficulty).";
      break;
    case "good":
      changeReason = "Good answer that addressed the core concepts with minor omissions (+1 difficulty).";
      break;
    case "average":
      changeReason = "Partially correct or average response with noticeable gaps (difficulty unchanged).";
      break;
    case "weak":
      changeReason = "Weak or mostly incorrect answer demonstrating misunderstanding (-1 difficulty).";
      break;
    case "unanswered":
      changeReason = "Question was left unanswered before timeout (-2 difficulty).";
      break;
    case "incorrect":
    default:
      changeReason = "Fundamentally incorrect or irrelevant answer (-2 difficulty).";
      break;
  }

  return {
    scoreBefore,
    scoreChange: actualChange,
    scoreAfter,
    changeReason,
    nextTargetDifficulty,
    quality: effectiveQuality,
  };
}

module.exports = {
  getInitialAdaptiveScore,
  mapScoreToDifficulty,
  clampScore,
  computeAdaptiveTransition,
  QUALITY_SCORE_CHANGES,
};
