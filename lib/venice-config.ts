export const VENICE_CONFIG = {
  API_KEY: process.env.VENICE_API_KEY || '',
  BASE_URL: process.env.VENICE_BASE_URL || 'https://api.venice.ai/api/v1',
  MODELS: {
    REASONING: process.env.VENICE_MODEL_REASONING || 'qwen3-235b',
    CONTENT: process.env.VENICE_MODEL_CONTENT || 'grok-41-fast',
    RESEARCH: process.env.VENICE_MODEL_RESEARCH || 'grok-41-fast',
  },
  TIMEOUTS: {
    REASONING: 600000,  // 10 minutes - allows for complex analysis
    CONTENT: 600000,    // 10 minutes - allows for comprehensive content generation
    RESEARCH: 600000,   // 10 minutes - allows for thorough web search
  },
  // Test mode: limit to 3 chapters for local testing
  // Set TEST_MODE=true in .env.local to enable test mode
  // In production, TEST_MODE should be false or undefined to generate full 5 chapters
  TEST_MODE: process.env.TEST_MODE === 'true',
  TEST_MODE_CHAPTERS: 3, // Number of chapters to generate in test mode
};

export const VENICE_PROMPTS = {
  SYSTEM_REASONING: `You are an expert in AI education and workforce transformation. Your task is to:
1. Analyze how GenAI will impact specific roles
2. Identify the most critical AI skills needed
3. Create a logical 5-chapter learning progression
4. Use adult learning principles (start with fundamentals, build complexity, include practical applications)
5. Focus on real-world applicability and immediate value`,

  SYSTEM_CONTENT: `You are an expert educator specializing in adult learning and AI training.
Apply these pedagogical principles:
- Bloom's Taxonomy progression (Remember → Understand → Apply → Analyze → Evaluate → Create)
- ADDIE model structure (Analysis, Design, Development, Implementation, Evaluation)
- Cognitive Load Theory (chunk information, use schemas, provide examples)
- Active learning through exercises and reflection
- Immediate practical application to work context
- Clear, jargon-free explanations with real-world examples`,

  SYSTEM_RESEARCH: `You are a research assistant focused on finding the most recent and relevant AI industry updates.
Your goal is to provide:
1. Latest tool releases and platform updates
2. Industry best practices and case studies
3. Regulatory changes or compliance updates
4. Breakthrough techniques or methodologies
5. Real-world implementations and results
Focus on information from the last 2 months and provide source citations.`,
};
