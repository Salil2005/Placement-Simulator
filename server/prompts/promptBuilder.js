const CATEGORY_LABELS = {
    hr: "HR / Behavioral",
    "dsa": "Data Structures & Algorithms",
    "core-cs": "Core Computer Science",
    "web-dev": "Web Development",
    "system-design": "System Design",
};


// ─────────────────────────────────────────────────────────────────────────────
// Shared evaluation rules
// ─────────────────────────────────────────────────────────────────────────────

const EVALUATION_RULES = `
GENERAL EVALUATION RULES:

1. Evaluate ONLY the evidence contained in the candidate's answer.
2. Never assume knowledge that the candidate did not demonstrate.
3. Do not give credit merely because an answer contains technical keywords.
4. Do not penalize concise answers if they completely and correctly answer the question.
5. Penalize incorrect claims, contradictions, irrelevant content, and missing critical concepts.
6. Distinguish between:
   - Correct information
   - Partially correct information
   - Incorrect information
   - Unsupported claims
   - Missing information
7. Do not infer confidence from writing quality alone.
8. Confidence should reflect how confidently and decisively the candidate communicates their answer.
9. Clarity should reflect structure, understandability, relevance, and precision.
10. Correctness should be based primarily on technical accuracy.
11. If the candidate says "I don't know", do not fabricate knowledge on their behalf.
12. Never invent facts, achievements, skills, reasoning, or examples that are not present.
13. Be strict but fair. The goal is realistic placement-interview evaluation.
14. Scores must reflect the actual evidence, not what the candidate may have intended to say.
15. Use the full 0-100 range when justified. Do not automatically give scores around 70-80.
16. A score above 90 should be reserved for an exceptionally strong answer with very few or no meaningful weaknesses.
17. A score below 40 should be used when the answer demonstrates major misunderstanding, severe incompleteness, or inability to answer.
18. Return valid JSON only when JSON is requested.
19. Do not use markdown fences around JSON.
20. Do not add explanations outside the requested JSON.
`;


// ─────────────────────────────────────────────────────────────────────────────
// PLACEMENT SIMULATOR — Individual Answer Evaluation
// ─────────────────────────────────────────────────────────────────────────────

function buildEvaluationPrompt({
    interview,
    question,
    answer
}) {

    const category =
        CATEGORY_LABELS[interview.category] ||
        interview.category ||
        "Technical Interview";


    return [

        `You are an expert interviewer evaluating one candidate answer in a ${category} interview.`,

        `Interview difficulty: ${interview.difficulty || "unknown"}.`,

        `Question:
${question}`,

        `Candidate's answer:
${answer}`,

        EVALUATION_RULES,

        `
SCORING CRITERIA:

CORRECTNESS (0-100):
- 90-100: Fully correct, technically precise, complete, and demonstrates strong understanding.
- 75-89: Mostly correct with only minor omissions or imprecision.
- 50-74: Partially correct; understands the main idea but has meaningful gaps.
- 25-49: Significant misunderstanding or multiple important errors.
- 0-24: Fundamentally incorrect, irrelevant, or no meaningful answer.

CLARITY (0-100):
- 90-100: Extremely clear, structured, concise, precise, and easy to follow.
- 75-89: Clear and understandable with minor organization issues.
- 50-74: Understandable but somewhat vague, disorganized, repetitive, or incomplete.
- 25-49: Difficult to follow or poorly structured.
- 0-24: Essentially unintelligible or does not communicate a usable answer.

CONFIDENCE (0-100):
Evaluate only how confidently the candidate communicates.
- 90-100: Decisive, direct, well-structured, and demonstrates ownership of the explanation.
- 75-89: Generally confident with minor hesitation or uncertainty.
- 50-74: Mixed confidence; some uncertainty or hedging.
- 25-49: Frequent uncertainty, guessing, or lack of conviction.
- 0-24: Extremely uncertain or openly unable to explain the answer.

IMPORTANT:
A technically correct answer can still have a lower confidence or clarity score.
A confident but technically incorrect answer must receive a low correctness score.
Do not let one score automatically determine another score.

NOTES:
Give one concise but highly specific improvement note.
The note must identify the most important thing the candidate should improve.
Avoid generic statements such as "practice more" or "be more clear."
`,

        `Respond with ONLY this valid JSON object:
{
  "correctness": number,
  "clarity": number,
  "confidence": number,
  "notes": string
}`

    ].join("\n\n");
}


// ─────────────────────────────────────────────────────────────────────────────
// PLACEMENT SIMULATOR — Final Interview Report
// ─────────────────────────────────────────────────────────────────────────────

function buildFinalReportPrompt({
    interview,
    transcript,
    responses
}) {

    const category =
        CATEGORY_LABELS[interview.category] ||
        interview.category ||
        "Interview";


    const history =
        (transcript || [])
            .map(
                (t) =>
                    `${String(t.role).toUpperCase()}: ${t.content}`
            )
            .join("\n");


    const scoreSummary =
        (responses || [])
            .map(
                (r, i) =>
                    `Q${i + 1}: correctness=${r.evaluation?.correctness ?? 0}, ` +
                    `clarity=${r.evaluation?.clarity ?? 0}, ` +
                    `confidence=${r.evaluation?.confidence ?? 0}`
            )
            .join("\n");


    return [

        `You are a senior technical interviewer producing the final evaluation for a ${category} mock interview.`,

        `Candidate role: ${interview.role || "Not specified"}.`,

        `Interview difficulty: ${interview.difficulty || "Not specified"}.`,

        `FULL TRANSCRIPT:
${history || "No transcript available."}`,

        `PER-QUESTION SCORES:
${scoreSummary || "No per-question scores available."}`,

        EVALUATION_RULES,

        `
FINAL REPORT RULES:

1. Base the report on the transcript and per-question evaluations.
2. Do not invent evidence.
3. Do not judge the candidate on topics that were never tested.
4. Do not allow one unusually good or bad answer to completely dominate the overall assessment.
5. Identify patterns across multiple answers.
6. Distinguish technical ability from communication ability.
7. Distinguish confidence from correctness.
8. If evidence is insufficient for a particular dimension, give a conservative score rather than inventing evidence.
9. Strengths must be demonstrated by the transcript.
10. Weaknesses must be supported by actual mistakes, omissions, or patterns.
11. Suggestions must directly address the most important weaknesses.
12. quotedMoments must be exact excerpts from the transcript. Never fabricate quotes.
13. Keep quotes short.
14. Do not praise generic behavior unless the transcript provides evidence.
15. Be realistic for a placement interview.
`,

        `
SCORING:

OVERALL:
Represents the candidate's overall interview performance.

TECHNICAL:
Represents technical correctness, depth, reasoning, and understanding demonstrated.

COMMUNICATION:
Represents organization, explanation quality, relevance, and clarity.

CONFIDENCE:
Represents how decisively and confidently the candidate communicated.

PROBLEM SOLVING:
Represents reasoning, decomposition, approach selection, debugging, trade-off analysis, and ability to reach a solution.

CODING:
Evaluate coding ability ONLY if coding/problem-solving questions were actually present.
If coding was not tested, do not fabricate evidence. Use a conservative score based only on available evidence.
`,

        `
SCORE CALIBRATION:

90-100 = Exceptional placement-level performance
80-89 = Strong performance with minor weaknesses
70-79 = Good performance but noticeable gaps
60-69 = Average / borderline performance
40-59 = Weak performance with significant gaps
0-39 = Very weak performance or major misunderstanding
`,

        `Respond with ONLY valid JSON matching exactly this shape:

{
  "overall": number,
  "technical": number,
  "communication": number,
  "confidence": number,
  "problemSolving": number,
  "coding": number,
  "strengths": string[],
  "weaknesses": string[],
  "suggestions": string[],
  "quotedMoments": [
    {
      "speaker": "ai"|"user",
      "quote": string,
      "why": string
    }
  ],
  "summary": string
}`

    ].join("\n\n");
}


// ─────────────────────────────────────────────────────────────────────────────
// PLACEMENT SIMULATOR — Overall Placement Readiness
// ─────────────────────────────────────────────────────────────────────────────

function buildPlacementAnalysisPrompt({
    readinessScore,
    readinessLevel,
    categoryReports
}) {

    const perCategory =
        (categoryReports || [])
            .map(
                (c) =>
                    `Category: ${
                        CATEGORY_LABELS[c.category] ||
                        c.category
                    }
Overall: ${c.scores?.overall ?? 0}
Technical: ${c.scores?.technical ?? 0}
Communication: ${c.scores?.communication ?? 0}
Confidence: ${c.scores?.confidence ?? 0}
Problem Solving: ${c.scores?.problemSolving ?? 0}
Coding: ${c.scores?.coding ?? 0}
Strengths: ${
                        (c.strengths || []).join("; ") ||
                        "none"
                    }
Weaknesses: ${
                        (c.weaknesses || []).join("; ") ||
                        "none"
                    }`
            )
            .join("\n\n");


    return [

        `You are a senior placement mentor analyzing a candidate across multiple mock interview categories.`,

        `Placement Readiness Score: ${readinessScore}/100.`,

        `Placement Readiness Level: ${readinessLevel}.`,

        `
CATEGORY WEIGHTS:

DSA: highest weight
Core CS: second highest
Web Development: third
System Design: fourth
HR / Behavioral: lowest technical weight

The exact weighted readiness score supplied above is authoritative.
Do not recalculate it or invent a different score.
`,

        `PER-CATEGORY RESULTS:

${perCategory || "No category data available."}`,

        EVALUATION_RULES,

        `
ANALYSIS RULES:

1. Analyze the candidate holistically.
2. Identify the strongest demonstrated skill.
3. Identify the category that needs the most improvement.
4. Identify skills that appear consistently strong across multiple categories.
5. Identify the highest-impact improvements.
6. Consider BOTH category weight and current score.
7. A weak score in a highly weighted category should generally receive higher improvement priority.
8. However, do not recommend improving DSA solely because it has the highest weight. Use the actual score as evidence.
9. If DSA is significantly weaker than other categories, prioritize it and explicitly explain that its high weight makes improvement particularly impactful.
10. Do not claim placement readiness solely from one strong category.
11. Do not claim lack of readiness solely from one weak category.
12. Consider the overall pattern.
13. Suggestions must be actionable and specific.
14. Avoid generic advice.
15. Do not use em dashes.
`,

        `
Answer these questions:

- What is the strongest skill?
- Which category needs the most improvement?
- Which skills are consistently strong?
- Which skills are consistently weak?
- What should the candidate revise first?
- Is the candidate currently placement ready?
- What would most improve their placement readiness?
`,

        `Respond with ONLY valid JSON matching exactly this shape:

{
  "strengths": string[],
  "weaknesses": string[],
  "consistentSkills": string[],
  "improvementSkills": string[],
  "improvementPriority": string[],
  "careerSummary": string,
  "finalRecommendation": string
}`

    ].join("\n\n");
}


// ─────────────────────────────────────────────────────────────────────────────
// PLACEMENT SIMULATOR — Resume Parsing
// ─────────────────────────────────────────────────────────────────────────────

function buildResumeParsePrompt({
    resumeText
}) {

    return [

        `You are a highly accurate resume information extraction system.`,

        `Extract structured information from the resume below.`,

        `Resume:
"""
${resumeText}
"""`,

        `
EXTRACTION RULES:

1. Extract ONLY information explicitly present in the resume.
2. Never infer skills from job titles alone.
3. Never infer a technology from a project unless it is explicitly mentioned.
4. Preserve the candidate's actual technologies.
5. Remove duplicates.
6. Use short, standardized labels.
7. Do not add generic skills that are not explicitly stated.
8. Do not confuse libraries, frameworks, languages, databases, tools, and concepts.
9. If a category has no information, return an empty array.
10. Projects should contain project names or concise project descriptions explicitly present.
11. Experience should contain concise role/company/experience entries explicitly present.
12. Certifications should contain actual certification names explicitly present.
`,

        `Respond with ONLY valid JSON matching exactly this shape:

{
  "skills": string[],
  "programmingLanguages": string[],
  "frameworks": string[],
  "databases": string[],
  "coreCsSubjects": string[],
  "projects": string[],
  "experience": string[],
  "certifications": string[]
}`

    ].join("\n\n");
}


// ─────────────────────────────────────────────────────────────────────────────
// PLACEMENT SIMULATOR — Resume vs Interview
// ─────────────────────────────────────────────────────────────────────────────

function buildResumeVsInterviewPrompt({
    resumeProfile,
    categoryReports
}) {

    const claimed = [
        ...(resumeProfile?.skills || []),
        ...(resumeProfile?.programmingLanguages || []),
        ...(resumeProfile?.frameworks || []),
        ...(resumeProfile?.databases || []),
        ...(resumeProfile?.coreCsSubjects || [])
    ];


    const claimedText =
        [...new Set(claimed)].join(", ") ||
        "none listed";


    const perf =
        (categoryReports || [])
            .map(
                (c) =>
                    `${CATEGORY_LABELS[c.category] || c.category}:
Overall=${c.scores?.overall ?? 0},
Technical=${c.scores?.technical ?? 0},
Strengths=${(c.strengths || []).join("; ") || "none"},
Weaknesses=${(c.weaknesses || []).join("; ") || "none"}`
            )
            .join("\n\n");


    return [

        `You are an expert technical recruiter comparing a candidate's resume claims with their demonstrated mock-interview performance.`,

        `SKILLS CLAIMED ON RESUME:
${claimedText}`,

        `INTERVIEW PERFORMANCE:
${perf || "No interview performance available."}`,

        EVALUATION_RULES,

        `
MATCH ANALYSIS RULES:

1. A resume skill is "verified" only when interview evidence strongly supports it.
2. Merely listing a skill on the resume is NOT evidence that it is verified.
3. A low interview score does not necessarily prove the candidate does not know the skill, but it does indicate that the skill was not strongly demonstrated.
4. Do not call a skill unverified merely because it was never tested.
5. Distinguish:
   - Verified: clearly demonstrated.
   - Unverified: claimed but not sufficiently demonstrated.
   - Improvement needed: demonstrated but weak.
   - Missing area: important skill/knowledge area absent from the resume and relevant to the candidate's target role.
6. Do not infer missing skills from unrelated technologies.
7. MatchScore should reflect how strongly interview performance supports the resume claims, not whether the resume itself is good.
8. Be conservative when interview evidence is limited.
9. Suggestions must be actionable.
10. Do not use em dashes.
`,

        `
MATCH SCORE CALIBRATION:

90-100 = Resume claims are strongly supported by interview evidence.
80-89 = Most important claims are supported with minor gaps.
70-79 = Reasonable alignment but several claims lack strong evidence.
50-69 = Significant mismatch between claimed and demonstrated skills.
0-49 = Resume claims are poorly supported by available interview evidence.
`,

        `Respond with ONLY valid JSON matching exactly this shape:

{
  "matchScore": number,
  "verifiedSkills": string[],
  "unverifiedSkills": string[],
  "improvementSkills": string[],
  "missingAreas": string[],
  "suggestions": string[],
  "summary": string
}`

    ].join("\n\n");
}


// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    CATEGORY_LABELS,
    buildEvaluationPrompt,
    buildFinalReportPrompt,
    buildPlacementAnalysisPrompt,
    buildResumeParsePrompt,
    buildResumeVsInterviewPrompt
};