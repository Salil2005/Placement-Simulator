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
// PLACEMENT SIMULATOR — AI PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

// ==========================================================
// RESUME PARSING — PART 1 (sent to KEY_1)
// Extracts: skills, languages, frameworks, databases,
//           core CS subjects, certifications.
// ==========================================================

function buildResumeSkillsPrompt({ resumeText }) {
  return `
You are a resume information extraction system focused on technical skills.

Extract ONLY information explicitly present in the resume below.

RESUME:
"""
${resumeText}
"""

RULES:
1. Extract only explicitly stated information. Never infer or assume.
2. Separate categories strictly — a language is NOT a framework, a framework is NOT a database.
3. skills: General technical skills not covered by the other categories (e.g. Git, Docker, REST APIs, CI/CD, Linux, Agile).
4. programmingLanguages: Only programming/scripting languages (e.g. Python, Java, C++, JavaScript, TypeScript, SQL).
5. frameworks: Libraries and frameworks (e.g. React, Node.js, Django, Spring Boot, Express, TensorFlow).
6. databases: Database systems (e.g. MySQL, PostgreSQL, MongoDB, Redis, Firebase).
7. coreCsSubjects: Explicitly mentioned CS fundamentals (e.g. Data Structures, Algorithms, OS, DBMS, Computer Networks, OOP).
8. certifications: Explicitly stated certification names (e.g. AWS Certified Developer, Google Cloud Associate).
9. Return [] for any category with no matching information.
10. Use short standardized labels. No long sentences.
11. Remove duplicates.
12. Return ONLY valid JSON. No markdown, no fences, no explanation.

Return EXACTLY this JSON:
{
  "skills": [],
  "programmingLanguages": [],
  "frameworks": [],
  "databases": [],
  "coreCsSubjects": [],
  "certifications": []
}
`.trim();
}


// ==========================================================
// RESUME PARSING — PART 2 (sent to KEY_2)
// Extracts: projects and experience with full written context.
// ==========================================================

function buildResumeContextPrompt({ resumeText }) {
  return `
You are a resume information extraction system focused on projects and work experience.

Extract ONLY information explicitly present in the resume below.

RESUME:
"""
${resumeText}
"""

RULES:
1. Extract only explicitly stated information. Never infer, summarize, or elaborate.
2. projects: Each entry must include the project name AND the exact context written in the resume
   (technologies used, what was built, key features, outcomes — whatever is explicitly stated).
   Format each project as an object: { "title": "...", "description": "..." }
   where "description" contains the verbatim or near-verbatim context from the resume.
3. experience: Each entry must include the role, company/organization name, and the exact
   responsibilities or achievements explicitly written in the resume.
   Format each entry as an object: { "role": "...", "company": "...", "description": "..." }
4. If a section has no information, return [].
5. Preserve the exact wording from the resume — do not paraphrase or summarize.
6. Do not add technologies that are not explicitly mentioned in that specific project/role.
7. Return ONLY valid JSON. No markdown, no fences, no explanation.

Return EXACTLY this JSON:
{
  "projects": [],
  "experience": []
}
`.trim();
}


// ==========================================================
// RESUME VS INTERVIEW ANALYSIS
// ==========================================================

function buildResumeVsInterviewPrompt({
  resumeProfile,
  categoryReports,
}) {

  // --------------------------------------------------------
  // Collect claimed skills
  // --------------------------------------------------------

  const claimed = [
    ...(resumeProfile?.skills || []),
    ...(resumeProfile?.programmingLanguages || []),
    ...(resumeProfile?.frameworks || []),
    ...(resumeProfile?.databases || []),
    ...(resumeProfile?.coreCsSubjects || []),
  ];

  const claimedText =
    [...new Set(
      claimed
        .filter(Boolean)
        .map((skill) => String(skill).trim())
        .filter(Boolean)
    )].join(", ") || "none listed";


  // --------------------------------------------------------
  // Interview performance
  // --------------------------------------------------------

  const perf = (categoryReports || [])
    .map((c) => {
      const label =
        CATEGORY_LABELS[c.category] || c.category;

      const overall =
        c.scores?.overall ?? 0;

      const technical =
        c.scores?.technical ?? 0;

      const strengths =
        (c.strengths || [])
          .slice(0, 5)
          .join("; ") || "none";

      const weaknesses =
        (c.weaknesses || [])
          .slice(0, 5)
          .join("; ") || "none";

      return `${label}:
Overall=${overall}
Technical=${technical}
Strengths=${strengths}
Weaknesses=${weaknesses}`;
    })
    .join("\n\n");


  // --------------------------------------------------------
  // Final prompt
  // --------------------------------------------------------

  return `
You are a technical recruiter evaluating how strongly a candidate's resume claims are supported by their mock-interview performance.

RESUME SKILLS:
${claimedText}

INTERVIEW PERFORMANCE:
${perf || "No interview performance available."}

EVALUATION RULES:

1. Verified:
   The interview evidence clearly demonstrates the skill.

2. Unverified:
   The skill is claimed on the resume but was not sufficiently demonstrated.

3. Improvement needed:
   The candidate demonstrated the skill but showed incorrect, weak, or incomplete knowledge.

4. Missing area:
   An important technical skill relevant to a software engineering role that is absent from the resume.

5. Do not infer skills from unrelated technologies.

6. Do not treat an untested skill as proof that the candidate does not know it.

7. A low score does not automatically mean the skill is absent.

8. MatchScore measures how strongly interview evidence supports the resume claims.

9. Be conservative when evidence is limited.

10. Suggestions must be actionable.

11. Do not list every academic subject as a missing area.

12. Focus missingAreas on important software engineering skills.

13. Do not duplicate skills between arrays unless necessary.

14. Keep each skill array to a maximum of 10 items.

15. Keep suggestions to a maximum of 5 items.

16. Keep the summary below 60 words.

17. Keep suggestions concise.

18. Do not use em dashes.

MATCH SCORE:

90-100:
Resume claims are strongly supported by interview evidence.

80-89:
Most important claims are supported with minor gaps.

70-79:
Reasonable alignment but several claims lack strong evidence.

50-69:
Significant mismatch between claimed and demonstrated skills.

0-49:
Resume claims are poorly supported by available interview evidence.

IMPORTANT OUTPUT RULES:

- Do not explain your reasoning.
- Do not output analysis.
- Do not output markdown.
- Do not use code fences.
- Do not output text before or after the JSON.
- Return ONLY valid JSON.
- Follow the exact schema below.

{
  "matchScore": 0,
  "verifiedSkills": [],
  "unverifiedSkills": [],
  "improvementSkills": [],
  "missingAreas": [],
  "suggestions": [],
  "summary": ""
}
`.trim();
}


// ==========================================================
// ADAPTIVE WEB DEVELOPMENT + SYSTEM DESIGN ROUND PROMPTS
// ==========================================================

function buildAdaptiveResumeParsePrompt({ resumeText }) {
  return `
You are a senior technical screener and systems architect analyzing a candidate's resume for an Adaptive Web Development + System Design Interview.

Extract and structure the projects, skills, and architectural decisions present in the resume.
CRITICAL RULES:
1. Do not invent or fabricate details not present in the resume.
2. If certain architectural details are missing, leave them empty rather than guessing.
3. Clearly distinguish technologies actually used from tangential mentions.

Resume Text:
"""
${resumeText}
"""

Return ONLY a valid JSON object with the following schema:
{
  "projects": [
    {
      "title": "Project Name",
      "description": "Clear 2-3 sentence overview of what the project does and its purpose",
      "technologies": ["React", "Node.js", "MongoDB"],
      "frontendArchitecture": "e.g. React SPA with Redux, component hierarchy, client routing",
      "backendArchitecture": "e.g. Express REST API with MVC pattern and service layer",
      "databases": ["MongoDB", "Redis"],
      "apisAndIntegrations": ["Stripe", "OAuth"],
      "auth": "e.g. JWT with HTTP-only cookies",
      "keyDecisions": "Architectural choices, data flow patterns, or notable trade-offs mentioned",
      "scalabilityAndPerformance": "Caching, indexing, or load handling details if mentioned"
    }
  ],
  "skills": ["REST APIs", "State Management", "System Design"],
  "technologies": ["JavaScript", "TypeScript", "React", "Node.js", "Express", "MongoDB", "PostgreSQL", "Docker"]
}
`.trim();
}

function buildAdaptiveEvaluationPrompt({
  projectContext,
  question,
  questionCategory,
  difficulty,
  answer,
  currentAdaptiveScore,
}) {
  const selectedProj = projectContext?.projects?.find(
    (p) => p.title === projectContext.selectedProject
  ) || projectContext?.projects?.[0] || { title: "Candidate Project", description: "Project under discussion" };

  return `
You are an expert technical interviewer and systems architect evaluating a candidate's response in an Adaptive Web Development + System Design interview.

ROUND CONTEXT:
- Category: ${questionCategory || "Web Development / System Design"}
- Target Difficulty: ${difficulty || "medium"}
- Current Candidate Adaptive Score: ${currentAdaptiveScore} (0.00-1.00 normalized)
- Selected Project: ${selectedProj.title}
- Verified Project Description: ${selectedProj.description || "N/A"}
- Project Tech Stack: ${(selectedProj.technologies || []).join(", ") || "N/A"}
- Frontend Architecture: ${selectedProj.frontendArchitecture || "N/A"}
- Backend Architecture: ${selectedProj.backendArchitecture || "N/A"}
- Databases: ${(selectedProj.databases || []).join(", ") || "N/A"}
- Key Decisions: ${selectedProj.keyDecisions || "N/A"}

QUESTION ASKED:
"""
${question}
"""

CANDIDATE'S ANSWER:
"""
${answer}
"""

EVALUATION SPECIFICATION:
1. Evaluate against the actual question and candidate's verified project context.
2. Do not reward answers solely for length, buzzwords, or superficial keyword matching.
3. Penalize technical inaccuracies, hand-waving, misconceptions, or claims contradicted by project realities.
4. If the candidate answers "I don't know", reflect this accurately without inventing knowledge.
5. Score across these 7 dimensions (each 0 to 100):
   - technicalCorrectness (0-100)
   - conceptualUnderstanding (0-100)
   - projectRelevance (0-100)
   - depthOfExplanation (0-100)
   - architecturalReasoning (0-100)
   - practicalImplementation (0-100)
   - tradeoffAnalysis (0-100)
6. Calculate an overall normalized answerScore between 0.00 and 1.00 (e.g., 0.78).

Return ONLY a valid JSON object matching this exact schema:
{
  "answerScore": 0.75,
  "dimensionScores": {
    "technicalCorrectness": 75,
    "conceptualUnderstanding": 80,
    "projectRelevance": 80,
    "depthOfExplanation": 70,
    "architecturalReasoning": 75,
    "practicalImplementation": 75,
    "tradeoffAnalysis": 70
  },
  "strengths": [
    "Specific strong point in their explanation"
  ],
  "missingConcepts": [
    "Important architectural or implementation concept omitted"
  ],
  "technicalInaccuracies": [
    "Any incorrect claims made, or empty array if none"
  ],
  "rationale": "Concise 2-3 sentence evaluation rationale summarizing demonstrated competence.",
  "recommendedFollowUps": [
    "Specific follow-up topic or concept that should be explored next"
  ]
}
`.trim();
}

function buildAdaptiveQuestionPrompt({
  projectContext,
  previousQuestions,
  latestAnswer,
  latestEvaluation,
  adaptiveScore,
  remainingSeconds,
  targetCategory,
  competencyLevel,
}) {
  const selectedProj = projectContext?.projects?.find(
    (p) => p.title === projectContext.selectedProject
  ) || projectContext?.projects?.[0] || { title: "Candidate Project", description: "Project under discussion" };

  const historySummary = (previousQuestions || [])
    .map(
      (pq, i) =>
        `Q${i + 1} [${pq.questionCategory || "General"}]: "${pq.text}"\nAnswer snippet: "${(pq.answerText || "").slice(0, 150)}..."`
    )
    .join("\n\n");

  return `
You are a senior principal engineer conducting an Adaptive Web Development + System Design interview.

PROJECT CONTEXT:
- Project Name: ${selectedProj.title}
- Description: ${selectedProj.description}
- Technologies: ${(selectedProj.technologies || []).join(", ")}
- Frontend Architecture: ${selectedProj.frontendArchitecture || "N/A"}
- Backend Architecture: ${selectedProj.backendArchitecture || "N/A"}
- Databases: ${(selectedProj.databases || []).join(", ") || "N/A"}
- Key Decisions: ${selectedProj.keyDecisions || "N/A"}

CANDIDATE ADAPTIVE STATE:
- Current Adaptive Score: ${adaptiveScore.toFixed(3)} (0.00-1.00)
- Candidate Competency Level: ${competencyLevel}
- Target Next Category: ${targetCategory} (Web Development or System Design)
- Remaining Interview Time: ${Math.round(remainingSeconds)} seconds

LATEST EVALUATION SUMMARY:
- Last Answer Score: ${latestEvaluation?.answerScore ?? "N/A"}
- Strengths: ${(latestEvaluation?.strengths || []).join("; ") || "None"}
- Missing Concepts: ${(latestEvaluation?.missingConcepts || []).join("; ") || "None"}
- Technical Inaccuracies: ${(latestEvaluation?.technicalInaccuracies || []).join("; ") || "None"}
- Recommended Follow-ups: ${(latestEvaluation?.recommendedFollowUps || []).join("; ") || "None"}

PREVIOUS QUESTIONS ASKED:
${historySummary || "None"}

ADAPTIVE QUESTION RULES:
1. Question MUST be strictly relevant to the verified project (${selectedProj.title}).
2. Do NOT repeat or rephrase previously asked questions.
3. Do NOT ask generic DSA, HR, or general trivia questions.
4. Do NOT assume unverified technologies (e.g. do not assume Redis exists unless in project stack, though you may ask if caching could be introduced as a proposed improvement).
5. If the candidate had missing concepts or technical inaccuracies in the previous answer, prefer a targeted follow-up or clarification before advancing difficulty.
6. Match difficulty to competency level (${competencyLevel}):
   - Foundational (0.00-0.24): Basic project understanding, simple component responsibilities, simple data flow.
   - Developing (0.25-0.44): Implementation details, API contracts, state management, database interactions.
   - Intermediate (0.45-0.64): Architecture trade-offs, request lifecycle, error handling, data consistency.
   - Advanced (0.65-0.79): Scalability bottlenecks, caching strategies, resilience, security boundaries.
   - Expert (0.80-1.00): Complex trade-offs, failure modes, distributed system constraints, scaling bottlenecks.

Return ONLY a valid JSON object matching this schema:
{
  "questionCategory": "${targetCategory}",
  "difficulty": "${competencyLevel.toLowerCase()}",
  "questionText": "The exact question text to ask the candidate.",
  "targetCompetencyLevel": "${competencyLevel}",
  "projectReference": "${selectedProj.title}",
  "rationale": "Why this question was chosen based on the candidate's previous response and adaptive score."
}
`.trim();
}

function buildAdaptiveFinalReportPrompt({
  interview,
  projectContext,
  responses,
}) {
  const selectedProj = projectContext?.projects?.find(
    (p) => p.title === projectContext.selectedProject
  ) || projectContext?.projects?.[0] || { title: "Candidate Project" };

  const qaHistory = responses
    .map((r, i) => {
      const q = r.question || {};
      const evalData = r.evaluation || {};
      return `Q${i + 1} [${q.questionCategory || "General"}]: "${q.text || ""}"
Answer: "${r.answerText || ""}"
Score: ${r.answerScore ?? (r.score ? r.score / 100 : 0)}
Strengths: ${(evalData.strengths || []).join("; ")}
Missing: ${(evalData.missingConcepts || []).join("; ")}
Inaccuracies: ${(evalData.technicalInaccuracies || []).join("; ")}
Rationale: ${evalData.rationale || evalData.notes || ""}`;
    })
    .join("\n\n---\n\n");

  return `
You are the Lead Technical Interviewer and Hiring Committee Chair compiling the Final Comprehensive Evaluation Report for an Adaptive Web Development + System Design Interview.

INTERVIEW OVERVIEW:
- Role: ${interview.role || "Software Engineer"}
- Project(s) Discussed: ${selectedProj.title}
- Initial Adaptive Score: ${interview.initialAdaptiveScore ?? 0.5}
- Final Adaptive Score: ${interview.currentAdaptiveScore ?? 0.5}
- Total Questions Evaluated: ${responses.length}

COMPLETE INTERVIEW TRANSCRIPT & EVALUATIONS:
${qaHistory}

REPORT REQUIREMENTS:
Generate a rigorous, evidence-based assessment. Every score must be between 0 and 100 based strictly on demonstrated performance.
Include:
1. Overall score and category scores: webDevelopment, systemDesign, conceptualUnderstanding, technicalCorrectness, projectOwnership, architecturalReasoning.
2. Concrete key strengths directly observed from answers.
3. Specific weaknesses and knowledge gaps.
4. Explicit technical misconceptions or incorrect assumptions identified during the session.
5. Actionable improvement recommendations.
6. Professional interviewer summary for hiring committees.

Return ONLY a valid JSON object matching this schema:
{
  "overall": 80,
  "technical": 82,
  "communication": 78,
  "confidence": 80,
  "problemSolving": 82,
  "coding": 0,
  "webDevelopment": 82,
  "systemDesign": 80,
  "conceptualUnderstanding": 84,
  "technicalCorrectness": 82,
  "projectOwnership": 85,
  "architecturalReasoning": 78,
  "strengths": [
    "Observed strength 1",
    "Observed strength 2"
  ],
  "weaknesses": [
    "Observed weakness 1"
  ],
  "knowledgeGaps": [
    "Specific missing concept 1"
  ],
  "misconceptions": [
    "Specific misconception identified, or empty array if none"
  ],
  "areasForImprovement": [
    "Actionable area to improve 1"
  ],
  "suggestions": [
    "Actionable suggestion 1"
  ],
  "summary": "2-3 sentence executive summary of performance.",
  "interviewerSummary": "Hiring committee recommendation and holistic technical summary."
}
`.trim();
}

// ==========================================================
// EXPORT
// ==========================================================

module.exports = {
  buildEvaluationPrompt,
  buildFinalReportPrompt,
  buildPlacementAnalysisPrompt,
  buildResumeSkillsPrompt,
  buildResumeContextPrompt,
  buildResumeVsInterviewPrompt,
  buildAdaptiveResumeParsePrompt,
  buildAdaptiveEvaluationPrompt,
  buildAdaptiveQuestionPrompt,
  buildAdaptiveFinalReportPrompt,
};