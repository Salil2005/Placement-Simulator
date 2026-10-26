const assert = require('assert');
const {
  getInitialAdaptiveScore,
  mapScoreToDifficulty,
  clampScore,
  computeAdaptiveTransition,
  QUALITY_SCORE_CHANGES,
} = require('../services/interview/adaptiveService');

console.log('=== Running Adaptive Engine Unit Tests ===\n');

// 1. Initial adaptive scores of 3, 5, and 7
assert.strictEqual(getInitialAdaptiveScore('easy'), 3, 'Easy difficulty should map to 3');
assert.strictEqual(getInitialAdaptiveScore('medium'), 5, 'Medium difficulty should map to 5');
assert.strictEqual(getInitialAdaptiveScore('hard'), 7, 'Hard difficulty should map to 7');
assert.strictEqual(getInitialAdaptiveScore('unknown'), 5, 'Fallback should map to 5');
console.log('✓ Initial adaptive scores (3, 5, 7) passed.');

// 2. Score to difficulty mapping:
// 1-3: Easy, 4-6: Medium, 7-9: Hard
assert.strictEqual(mapScoreToDifficulty(1), 'easy');
assert.strictEqual(mapScoreToDifficulty(2), 'easy');
assert.strictEqual(mapScoreToDifficulty(3), 'easy');
assert.strictEqual(mapScoreToDifficulty(4), 'medium');
assert.strictEqual(mapScoreToDifficulty(5), 'medium');
assert.strictEqual(mapScoreToDifficulty(6), 'medium');
assert.strictEqual(mapScoreToDifficulty(7), 'hard');
assert.strictEqual(mapScoreToDifficulty(8), 'hard');
assert.strictEqual(mapScoreToDifficulty(9), 'hard');
console.log('✓ Score-to-difficulty boundary mapping (1-3: easy, 4-6: medium, 7-9: hard) passed.');

// 3. Score quality rubric transitions:
// excellent: +2, good: +1, average: 0, weak: -1, incorrect/unanswered: -2
const t1 = computeAdaptiveTransition({ currentScore: 5, quality: 'excellent' });
assert.strictEqual(t1.scoreChange, 2);
assert.strictEqual(t1.scoreAfter, 7);
assert.strictEqual(t1.nextTargetDifficulty, 'hard');

const t2 = computeAdaptiveTransition({ currentScore: 5, quality: 'good' });
assert.strictEqual(t2.scoreChange, 1);
assert.strictEqual(t2.scoreAfter, 6);
assert.strictEqual(t2.nextTargetDifficulty, 'medium');

const t3 = computeAdaptiveTransition({ currentScore: 5, quality: 'average' });
assert.strictEqual(t3.scoreChange, 0);
assert.strictEqual(t3.scoreAfter, 5);
assert.strictEqual(t3.nextTargetDifficulty, 'medium');

const t4 = computeAdaptiveTransition({ currentScore: 5, quality: 'weak' });
assert.strictEqual(t4.scoreChange, -1);
assert.strictEqual(t4.scoreAfter, 4);
assert.strictEqual(t4.nextTargetDifficulty, 'medium');

const t5 = computeAdaptiveTransition({ currentScore: 5, quality: 'incorrect' });
assert.strictEqual(t5.scoreChange, -2);
assert.strictEqual(t5.scoreAfter, 3);
assert.strictEqual(t5.nextTargetDifficulty, 'easy');

const t6 = computeAdaptiveTransition({ currentScore: 5, isUnanswered: true });
assert.strictEqual(t6.scoreChange, -2);
assert.strictEqual(t6.scoreAfter, 3);
assert.strictEqual(t6.quality, 'unanswered');
console.log('✓ Quality score changes (+2, +1, 0, -1, -2, unanswered) passed.');

// 4. Clamping boundaries: Score must never drop below 1 or exceed 10
const tCeiling = computeAdaptiveTransition({ currentScore: 9, quality: 'excellent' });
assert.strictEqual(tCeiling.scoreAfter, 10, 'Clamped to 10 maximum');
assert.strictEqual(tCeiling.scoreChange, 1, 'Actual change reflects clamp');

const tFloor = computeAdaptiveTransition({ currentScore: 2, quality: 'incorrect' });
assert.strictEqual(tFloor.scoreAfter, 1, 'Clamped to 1 minimum');
assert.strictEqual(tFloor.scoreChange, -1, 'Actual change reflects clamp');
console.log('✓ Clamping boundaries [1, 10] passed.');

console.log('\nAll Adaptive Engine unit tests completed successfully!');
