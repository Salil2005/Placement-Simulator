const {
  MOCK_PROVIDER_LATENCY_MS,
  MOCK_PROVIDER_SIMULATE_ERROR,
} = require("../../config/env");

/**
 * Mock AI Provider (Optional 3rd Provider)
 *
 * Implements the standard provider interface:
 *   complete(messages) -> Promise<string>
 *
 * Strictly used only in explicit test/mock mode or when configured.
 * Never silently replaces production providers without explicit configuration.
 */
class MockProvider {
  constructor(options = {}) {
    this.name = "mock";
    this.latencyMs = options.latencyMs ?? MOCK_PROVIDER_LATENCY_MS ?? 50;
    this.simulateError = options.simulateError ?? MOCK_PROVIDER_SIMULATE_ERROR ?? false;
    this.callCount = 0;
  }

  async complete(messages) {
    this.callCount++;

    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }

    if (this.simulateError) {
      const err = new Error("MockProvider simulated error [RATE_LIMIT or SERVICE_UNAVAILABLE]");
      err.statusCode = 429;
      throw err;
    }

    const lastMessage = messages[messages.length - 1]?.content || "";

    // Identify intent from prompt content
    if (lastMessage.includes("parseResume") || lastMessage.includes("EXTRACT AND STRUCTURE THE CANDIDATE'S RESUME")) {
      return JSON.stringify({
        projects: [
          {
            title: "E-Commerce Microservices Platform",
            description: "High throughput distributed order processing platform with inventory tracking and real-time alerts.",
            technologies: ["Node.js", "Express", "React", "PostgreSQL", "Redis", "Kafka"],
            frontendArchitecture: "React with Redux Toolkit, SSR, Tailwind CSS",
            backendArchitecture: "Node.js REST microservices with Redis caching and Kafka event streams",
            databases: ["PostgreSQL", "Redis"],
            apisAndIntegrations: ["Stripe API", "SendGrid"],
            auth: "JWT with HTTP-only refresh cookies and RBAC",
            keyDecisions: "Adopted event-driven architecture with Kafka for asynchronous order decoupling and Redis for cart session caching",
            scalabilityAndPerformance: "Optimized database indexes and added read replicas to sustain 5,000 req/sec",
            source: "resume",
          },
        ],
        skills: ["System Design", "Microservices", "REST APIs", "Event-Driven Architecture", "Caching"],
        programmingLanguages: ["JavaScript", "TypeScript", "SQL"],
        frameworks: ["React", "Express", "Node.js"],
        databases: ["PostgreSQL", "Redis"],
        coreCsSubjects: ["DBMS", "Operating Systems", "Computer Networks"],
        certifications: ["AWS Certified Developer"],
      });
    }

    if (lastMessage.includes("EVALUATE CANDIDATE ANSWER") || lastMessage.includes("answerScore")) {
      return JSON.stringify({
        answerScore: 0.8,
        dimensionScores: {
          technicalCorrectness: 85,
          conceptualUnderstanding: 80,
          projectRelevance: 85,
          depthOfExplanation: 75,
          architecturalReasoning: 80,
          practicalImplementation: 80,
          tradeoffAnalysis: 75,
        },
        strengths: [
          "Demonstrated solid grasp of asynchronous event handling with Kafka",
          "Clearly articulated reasons for caching shopping cart data in Redis",
        ],
        missingConcepts: [
          "Did not elaborate on cache invalidation strategy when inventory levels change abruptly",
        ],
        technicalInaccuracies: [],
        rationale: "Strong technical explanation showing authentic project ownership and clear data flow awareness.",
        recommendedFollowUps: [
          "Investigate cache stampede prevention during flash sales",
          "Discuss database transaction isolation levels for inventory deduction",
        ],
      });
    }

    if (lastMessage.includes("GENERATE NEXT INTERVIEW QUESTION")) {
      return JSON.stringify({
        questionCategory: "Web Development",
        difficulty: "medium",
        questionText:
          "In your E-Commerce Microservices Platform, how did you handle state synchronization and loading states on the React frontend when orders transition from pending to confirmed via Kafka events?",
        targetCompetencyLevel: "Intermediate",
        rationale: "Examines API communication, reactive UI state updates, and backend-to-frontend synchronization.",
      });
    }

    if (lastMessage.includes("GENERATE FINAL ADAPTIVE INTERVIEW REPORT")) {
      return JSON.stringify({
        overall: 82,
        technical: 84,
        communication: 80,
        confidence: 82,
        problemSolving: 85,
        coding: 0,
        webDevelopment: 84,
        systemDesign: 80,
        conceptualUnderstanding: 82,
        technicalCorrectness: 85,
        projectOwnership: 88,
        architecturalReasoning: 80,
        strengths: [
          "Deep familiarity with frontend state management and API integration",
          "Practical understanding of microservices communication patterns",
        ],
        weaknesses: [
          "Could be more precise regarding distributed transaction rollbacks",
        ],
        knowledgeGaps: [
          "Saga pattern implementation specifics during payment timeout",
        ],
        misconceptions: [],
        areasForImprovement: [
          "Practice articulating trade-offs between eventual consistency and 2-phase commit",
        ],
        suggestions: [
          "Deep dive into distributed tracing (e.g. OpenTelemetry) for microservices debugging",
        ],
        summary: "Candidate displayed impressive ownership of their full-stack project with solid architecture trade-off justification.",
        interviewerSummary: "Recommended hire for Mid-level Full Stack / Backend role.",
      });
    }

    // Default fallback structured JSON
    return JSON.stringify({
      status: "ok",
      provider: "mock",
      message: "Mock response generated successfully",
    });
  }
}

const mockProviderInstance = new MockProvider();

module.exports = {
  complete: (messages) => mockProviderInstance.complete(messages),
  name: "mock",
  MockProvider,
};
