const assert = require('assert');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Interview = require('../models/Interview');
const Question = require('../models/Question');
const Response = require('../models/Response');
const Session = require('../models/Session');
const QuestionBank = require('../models/QuestionBank');
const User = require('../models/User');
const { selectQuestion, ensureQuestionBankSeeded } = require('../services/interview/questionBankService');
const { formatTransparentResponse } = require('../services/interview/interviewEngine');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/placement-simulator';

async function runIntegrationTests() {
  console.log('=== Running Adaptive Interview Integration Tests ===\n');
  await mongoose.connect(MONGO_URI);

  try {
    // 1. Ensure question bank is seeded
    await ensureQuestionBankSeeded();
    const count = await QuestionBank.countDocuments({ active: true });
    assert(count > 0, 'QuestionBank should have documents');
    console.log(`✓ Question bank ready with ${count} active questions.`);

    // 2. Test user and mock interview
    const testUser = await User.findOne() || await User.create({
      name: 'Test Candidate',
      email: `test-${Date.now()}@test.com`,
      passwordHash: 'dummyhash',
    });

    const testInterview = await Interview.create({
      user: testUser._id,
      category: 'dsa',
      role: 'Software Engineer',
      difficulty: 'medium',
      initialAdaptiveScore: 5,
      currentAdaptiveScore: 5,
      questionCount: 5,
    });

    // 3. Question selection at target difficulty (score 5 -> medium)
    const q1 = await selectQuestion(testInterview, 5);
    assert(q1 && q1.text, 'Question 1 should be selected');
    assert.strictEqual(q1.actualDifficulty, 'medium', 'Question 1 should be medium difficulty');
    console.log(`✓ Adaptive question selection at score 5 (medium) succeeded: [${q1.topic}]`);

    // 4. Prevention of repeated questions in same interview
    const createdQ1 = await Question.create({
      interview: testInterview._id,
      bankQuestion: q1._id,
      text: q1.text,
      topic: q1.topic,
      order: 0,
      actualDifficulty: q1.actualDifficulty,
      adaptiveScoreAtSelection: 5,
    });

    const q2 = await selectQuestion(testInterview, 7); // score 7 -> hard
    assert.notStrictEqual(String(q2._id), String(q1._id), 'q2 must not repeat q1');
    assert.strictEqual(q2.actualDifficulty, 'hard', 'Question 2 should be hard difficulty for score 7');
    console.log(`✓ Prevention of repeated questions & adaptive jump to score 7 (hard) succeeded: [${q2.topic}]`);

    // 5. Verify formatTransparentResponse contract
    const mockResponseDoc = {
      _id: new mongoose.Types.ObjectId(),
      interview: testInterview._id,
      question: createdQ1._id,
      answerText: "An array stores elements in contiguous memory while a linked list uses nodes.",
      score: 80,
      answerStatus: "answered",
      evaluation: {
        performanceScore: 8,
        maxPerformanceScore: 10,
        quality: "good",
        correctnessAssessment: "mostly_correct",
        correctness: 85,
        clarity: 80,
        confidence: 75,
        strengths: ["Clear differentiation of memory layout."],
        missingPoints: ["Did not mention access time complexity O(1) vs O(N)."],
        importantConcepts: ["Memory locality", "Random access"],
        explanation: "Solid explanation of core structural distinction.",
        improvementSuggestions: ["Include Big-O lookup complexities."],
        notes: "Good performance overall.",
      },
      adaptiveScoring: {
        scoreBefore: 5,
        scoreChange: 1,
        scoreAfter: 6,
        changeReason: "Good answer with minor omissions (+1 difficulty).",
        nextTargetDifficulty: "medium",
      },
    };

    const formatted = formatTransparentResponse(mockResponseDoc, createdQ1, "medium");

    assert.strictEqual(formatted.question_id, String(createdQ1._id));
    assert.strictEqual(formatted.evaluation.performance_score, 8);
    assert.strictEqual(formatted.evaluation.quality, "good");
    assert.strictEqual(formatted.evaluation.correctness, "mostly_correct");
    assert.strictEqual(formatted.adaptive_scoring.score_before, 5);
    assert.strictEqual(formatted.adaptive_scoring.score_change, 1);
    assert.strictEqual(formatted.adaptive_scoring.score_after, 6);
    assert(Array.isArray(formatted.evaluation.strengths));
    assert(Array.isArray(formatted.evaluation.missing_points));
    console.log('✓ Transparent API contract format validated successfully.');

    // Cleanup test interview
    await Question.deleteMany({ interview: testInterview._id });
    await Interview.deleteOne({ _id: testInterview._id });
    console.log('✓ Cleanup completed.');

    console.log('\nAll Integration tests passed successfully!');
  } catch (err) {
    console.error('Integration test failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runIntegrationTests();
