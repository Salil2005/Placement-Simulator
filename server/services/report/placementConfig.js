// Central config for the Overall Placement Readiness feature.
// Editing weights here is enough — nothing else needs to change.

const DEFAULT_WEIGHTS = {
  dsa: 0.35,
  "core-cs": 0.25,
  "web-dev": 0.20,
  "system-design": 0.10,
  hr: 0.10,
};

const CATEGORY_LABELS = {
  hr: "HR / Behavioral",
  dsa: "DSA",
  "core-cs": "Core CS",
  "web-dev": "Web Development",
  "system-design": "System Design",
};

// Readiness level from the final weighted score.
function readinessLevel(score) {
  if (score >= 95) return "Outstanding Candidate";
  if (score >= 85) return "Placement Ready";
  if (score >= 70) return "Almost Placement Ready";
  if (score >= 55) return "Needs More Practice";
  return "Beginner Level";
}

// Per-category status label (used in the comparison table).
function categoryStatus(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  return "Needs Improvement";
}

// Coarse success predictions from the combined score.
function successBand(score) {
  if (score >= 85) return "Very High";
  if (score >= 70) return "High";
  if (score >= 55) return "Moderate";
  return "Low";
}

function recommendedCompanies(score) {
  if (score >= 85) return ["Product-based", "Service-based", "Startup", "Internship Ready"];
  if (score >= 70) return ["Service-based", "Startup", "Internship Ready"];
  if (score >= 55) return ["Startup", "Internship Ready"];
  return ["Internship Ready"];
}

/**
 * Weighted score with automatic weight normalization over ONLY the completed
 * categories. Incomplete categories are ignored (not scored as zero).
 *
 * @param {Array<{category:string, score:number}>} completed
 * @returns {{ readinessScore:number, categoryScores:Array }}
 */
function computeWeightedScore(completed) {
  const present = completed.filter((c) => DEFAULT_WEIGHTS[c.category] != null);
  const weightSum = present.reduce((sum, c) => sum + DEFAULT_WEIGHTS[c.category], 0);

  if (weightSum === 0) {
    return { readinessScore: 0, categoryScores: [] };
  }

  let readinessScore = 0;
  const categoryScores = present.map((c) => {
    const normalizedWeight = DEFAULT_WEIGHTS[c.category] / weightSum;
    readinessScore += c.score * normalizedWeight;
    return {
      category: c.category,
      score: Math.round(c.score),
      weight: Math.round(normalizedWeight * 100) / 100,
      status: categoryStatus(c.score),
    };
  });

  return { readinessScore: Math.round(readinessScore), categoryScores };
}

module.exports = {
  DEFAULT_WEIGHTS,
  CATEGORY_LABELS,
  readinessLevel,
  categoryStatus,
  successBand,
  recommendedCompanies,
  computeWeightedScore,
};
