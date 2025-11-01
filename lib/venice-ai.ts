import axios, { AxiosInstance } from 'axios';
import { VENICE_CONFIG, VENICE_PROMPTS } from './venice-config';
import { CourseOutline, ChapterContent, NewsItem, Chapter } from '@/types/course';

export class VeniceAIService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: VENICE_CONFIG.BASE_URL,
      headers: {
        'Authorization': `Bearer ${VENICE_CONFIG.API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Step 1: Analyze job description and create 10-chapter course outline
   */
  async analyzeJobAndCreateOutline(
    jobDescription: string,
    internalRole?: string
  ): Promise<CourseOutline> {
    const userPrompt = `
Job Description: ${jobDescription}
${internalRole ? `Internal Role/Process: ${internalRole}` : ''}

Create a comprehensive 10-chapter GenAI course outline that:
- Addresses specific tasks and responsibilities in this role
- Progresses from AI fundamentals to advanced role-specific applications
- Includes practical tools and techniques relevant to daily work
- Considers industry context and compliance requirements

For each chapter provide:
1. Chapter title
2. Learning objectives (3-4)
3. Key topics to cover
4. Estimated learning time in minutes
5. Why this matters for the role`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: VENICE_CONFIG.MODELS.REASONING,
        messages: [
          { role: 'system', content: VENICE_PROMPTS.SYSTEM_REASONING },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'course_outline',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                role_analysis: {
                  type: 'object',
                  properties: {
                    current_state: { type: 'string' },
                    ai_impact: { type: 'string' },
                    transformation_timeline: { type: 'string' },
                    critical_skills: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                  required: ['current_state', 'ai_impact', 'transformation_timeline', 'critical_skills'],
                  additionalProperties: false,
                },
                chapters: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      number: { type: 'integer' },
                      title: { type: 'string' },
                      objectives: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      topics: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      estimated_time_minutes: { type: 'integer' },
                      role_relevance: { type: 'string' },
                    },
                    required: ['number', 'title', 'objectives', 'topics', 'estimated_time_minutes', 'role_relevance'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['role_analysis', 'chapters'],
              additionalProperties: false,
            },
          },
        },
      }, {
        timeout: VENICE_CONFIG.TIMEOUTS.REASONING,
      });

      const content = response.data.choices[0].message.content;
      return typeof content === 'string' ? JSON.parse(content) : content;
    } catch (error) {
      throw new Error(`Failed to generate course outline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Step 2: Generate detailed chapter content
   */
  async generateChapterContent(
    chapter: Chapter,
    roleContext: string
  ): Promise<ChapterContent> {
    const userPrompt = `
Generate comprehensive content for this chapter teaching HOW TO APPLY AI:

Chapter: ${chapter.title}
Learning Objectives: ${chapter.objectives.join(', ')}
Key Topics: ${chapter.topics.join(', ')}
Role Context: ${roleContext}

CRITICAL: Focus on teaching HOW TO APPLY AI tools and techniques, not just describing concepts.

The content must:
1. Start with an engaging opening scenario showing a real work challenge that can be solved with AI
2. Explain SPECIFIC AI tools, models, or techniques that apply to this situation
3. Show step-by-step HOW to implement AI solutions (not just what they are)
4. Include hands-on exercises where users actually use AI tools
5. Provide specific AI prompts, workflows, or code examples
6. Demonstrate immediate AI applications they can use today

Focus on:
- Which AI tools/models/platforms to use for this chapter topic
- How to set up and configure AI for this use case
- Step-by-step implementation guides with specific examples
- Real AI prompts or code snippets they can copy and use
- How to integrate AI into existing workflows
- Measuring and optimizing AI results

Make it immediately actionable with specific AI tools and techniques.

Additionally, include a comprehensive list of AI concepts, skills, and technologies that someone needs to learn to upskill in this area. For each concept, explain:
- What it is and why it's important
- Skill level required (beginner/intermediate/advanced)
- Specific tools or platforms related to it
- How it applies to the learning goal`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: VENICE_CONFIG.MODELS.CONTENT,
        messages: [
          { role: 'system', content: VENICE_PROMPTS.SYSTEM_CONTENT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_completion_tokens: 20000, // Increased to handle comprehensive chapter content
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'chapter_content',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                opening_scenario: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    scenario: { type: 'string' },
                    challenge: { type: 'string' },
                    ai_solution: { type: 'string' },
                  },
                  required: ['title', 'scenario', 'challenge', 'ai_solution'],
                  additionalProperties: false,
                },
                core_concepts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      concept: { type: 'string' },
                      explanation: { type: 'string' },
                      role_example: { type: 'string' },
                      tools_mentioned: {
                        type: ['array', 'null'],
                        items: { type: 'string' },
                      },
                    },
                    required: ['concept', 'explanation', 'role_example'],
                    additionalProperties: false,
                  },
                },
                practical_exercises: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      instructions: { type: 'string' },
                      expected_outcome: { type: 'string' },
                      difficulty: {
                        type: 'string',
                        enum: ['beginner', 'intermediate', 'advanced'],
                      },
                    },
                    required: ['title', 'instructions', 'expected_outcome', 'difficulty'],
                    additionalProperties: false,
                  },
                },
                key_takeaways: {
                  type: 'array',
                  items: { type: 'string' },
                },
                action_items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      task: { type: 'string' },
                      timeline: { type: 'string' },
                    },
                    required: ['task', 'timeline'],
                    additionalProperties: false,
                  },
                },
                ai_concepts_to_learn: {
                  type: ['array', 'null'],
                  items: {
                    type: 'object',
                    properties: {
                      concept: { type: 'string' },
                      description: { type: 'string' },
                      why_important: { type: 'string' },
                      skill_level: {
                        type: 'string',
                        enum: ['beginner', 'intermediate', 'advanced'],
                      },
                      tools_or_platforms: {
                        type: ['array', 'null'],
                        items: { type: 'string' },
                      },
                    },
                    required: ['concept', 'description', 'why_important', 'skill_level'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['opening_scenario', 'core_concepts', 'practical_exercises', 'key_takeaways', 'action_items'],
              additionalProperties: false,
            },
          },
        },
      }, {
        timeout: VENICE_CONFIG.TIMEOUTS.CONTENT,
      });

      const content = response.data.choices[0].message.content;
      
      // Handle potential parsing errors
      try {
        if (!content || (typeof content === 'string' && content.trim().length === 0)) {
          throw new Error('Empty response from Venice AI');
        }
        
        // Check if JSON appears incomplete (common truncation patterns)
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
        const trimmedContent = contentStr.trim();
        
        // Check for incomplete JSON (missing closing braces)
        const openBraces = (trimmedContent.match(/\{/g) || []).length;
        const closeBraces = (trimmedContent.match(/\}/g) || []).length;
        const openBrackets = (trimmedContent.match(/\[/g) || []).length;
        const closeBrackets = (trimmedContent.match(/\]/g) || []).length;
        
        if (openBraces > closeBraces || openBrackets > closeBrackets) {
          throw new Error(`Incomplete JSON response: missing closing brackets. Open braces: ${openBraces}, Close braces: ${closeBraces}`);
        }
        
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        
        // Handle null values properly (Venice can return null for optional fields)
        if (parsed.ai_concepts_to_learn === null || parsed.ai_concepts_to_learn === undefined) {
          parsed.ai_concepts_to_learn = [];
        }
        
        // Ensure all required fields exist
        if (!parsed.opening_scenario || !parsed.core_concepts || !parsed.practical_exercises || 
            !parsed.key_takeaways || !parsed.action_items) {
          throw new Error('Incomplete response: missing required fields');
        }
        
        return parsed;
      } catch (parseError) {
        const errorMsg = parseError instanceof Error ? parseError.message : 'Invalid JSON';
        const contentPreview = typeof content === 'string' 
          ? content.substring(0, 500) + (content.length > 500 ? '...' : '')
          : 'Non-string content';
        throw new Error(`Failed to parse chapter content: ${errorMsg}. Content preview: ${contentPreview}`);
      }
    } catch (error: any) {
      // Provide detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code outside 2xx
        const status = error.response.status;
        const statusText = error.response.statusText;
        const data = error.response.data;
        
        if (status === 404) {
          throw new Error(`Venice AI endpoint not found (404). Please check your VENICE_BASE_URL configuration. Current: ${VENICE_CONFIG.BASE_URL}/chat/completions`);
        }
        
        throw new Error(`Failed to generate chapter content: ${status} ${statusText} - ${JSON.stringify(data)}`);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error(`No response from Venice AI. Please check your API key and network connection.`);
      } else {
        // Something happened in setting up the request
        throw new Error(`Failed to generate chapter content: ${error.message || 'Unknown error'}`);
      }
    }
  }

  /**
   * Step 3: Fetch latest industry updates for a chapter topic
   */
  async fetchLatestUpdates(
    chapterTopic: string,
    roleContext: string
  ): Promise<NewsItem[]> {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const searchQuery = `
Search for the latest developments, research, and GenAI applications related to "${chapterTopic}" in the context of ${roleContext}.

Focus specifically on:
1. How Generative AI (GenAI) is being applied to this topic/field
2. Latest research papers, breakthroughs, or innovations
3. New AI tools, models, or platforms relevant to this area
4. Real-world case studies showing GenAI implementation
5. Industry trends and best practices using AI

If this is a GenAI-specific topic, focus on the latest research, model updates, and applications.

Time frame: Last 3 months (since ${twoMonthsAgo.toLocaleDateString()})
Provide 3-5 most relevant updates with source links. Format as structured news items with title, summary, and source URL.`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: VENICE_CONFIG.MODELS.RESEARCH,
        messages: [
          { role: 'system', content: VENICE_PROMPTS.SYSTEM_RESEARCH },
          { role: 'user', content: searchQuery },
        ],
        temperature: 0.5,
        venice_parameters: {
          enable_web_search: true,
          enable_web_scraping: true,
          enable_web_citations: true,
          include_search_results_in_stream: false,
        },
      }, {
        timeout: VENICE_CONFIG.TIMEOUTS.RESEARCH,
      });

      const content = response.data.choices[0].message.content;
      return this.parseNewsUpdates(content);
    } catch (error) {
      // Return empty array if updates fail - don't break the flow
      return [];
    }
  }

  /**
   * Generate a single chapter based on what the user wants to learn
   */
  async generateSingleChapter(
    learningGoal: string,
    roleContext?: string,
    experienceLevel: string = 'intermediate'
  ): Promise<ChapterContent> {
    const userPrompt = `
Create a comprehensive chapter teaching how to APPLY AI to: "${learningGoal}"

${roleContext ? `Role/Work Context: ${roleContext}` : ''}
Experience Level: ${experienceLevel}

CRITICAL: Focus on teaching HOW TO APPLY AI tools and techniques, not just describing concepts.

Generate engaging, practical content that:
1. Starts with a real-world scenario showing a challenge that can be solved with AI
2. Explains SPECIFIC AI tools, models, or techniques that apply to this situation
3. Shows step-by-step HOW to implement AI solutions (not just what they are)
4. Includes hands-on exercises where users actually use AI tools
5. Provides specific AI prompts, workflows, or code examples
6. Demonstrates immediate AI applications they can use today

The content must teach practical AI application skills. Focus on:
- Which AI tools/models/platforms to use
- How to set up and configure AI for this use case
- Step-by-step implementation guides
- Real AI prompts or code snippets
- How to integrate AI into existing workflows
- Measuring and optimizing AI results

Make it immediately actionable with specific AI tools and techniques.

Additionally, include a comprehensive list of AI concepts, skills, and technologies that someone needs to learn to upskill in this area. For each concept, explain:
- What it is and why it's important
- Skill level required (beginner/intermediate/advanced)
- Specific tools or platforms related to it
- How it applies to the learning goal`;

    try {
      const requestPayload = {
        model: VENICE_CONFIG.MODELS.CONTENT,
        messages: [
          { role: 'system', content: VENICE_PROMPTS.SYSTEM_CONTENT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_completion_tokens: 20000, // Increased to handle comprehensive chapter content
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'chapter_content',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                opening_scenario: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    scenario: { type: 'string' },
                    challenge: { type: 'string' },
                    ai_solution: { type: 'string' },
                  },
                  required: ['title', 'scenario', 'challenge', 'ai_solution'],
                  additionalProperties: false,
                },
                core_concepts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      concept: { type: 'string' },
                      explanation: { type: 'string' },
                      role_example: { type: 'string' },
                      tools_mentioned: {
                        type: ['array', 'null'],
                        items: { type: 'string' },
                      },
                    },
                    required: ['concept', 'explanation', 'role_example'],
                    additionalProperties: false,
                  },
                },
                practical_exercises: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      instructions: { type: 'string' },
                      expected_outcome: { type: 'string' },
                      difficulty: {
                        type: 'string',
                        enum: ['beginner', 'intermediate', 'advanced'],
                      },
                    },
                    required: ['title', 'instructions', 'expected_outcome', 'difficulty'],
                    additionalProperties: false,
                  },
                },
                key_takeaways: {
                  type: 'array',
                  items: { type: 'string' },
                },
                action_items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      task: { type: 'string' },
                      timeline: { type: 'string' },
                    },
                    required: ['task', 'timeline'],
                    additionalProperties: false,
                  },
                },
                ai_concepts_to_learn: {
                  type: ['array', 'null'],
                  items: {
                    type: 'object',
                    properties: {
                      concept: { type: 'string' },
                      description: { type: 'string' },
                      why_important: { type: 'string' },
                      skill_level: {
                        type: 'string',
                        enum: ['beginner', 'intermediate', 'advanced'],
                      },
                      tools_or_platforms: {
                        type: ['array', 'null'],
                        items: { type: 'string' },
                      },
                    },
                    required: ['concept', 'description', 'why_important', 'skill_level'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['opening_scenario', 'core_concepts', 'practical_exercises', 'key_takeaways', 'action_items'],
              additionalProperties: false,
            },
          },
        },
      };

      const response = await this.client.post('/chat/completions', requestPayload, {
        timeout: VENICE_CONFIG.TIMEOUTS.CONTENT,
      });

      const content = response.data.choices[0].message.content;
      
      // Handle potential parsing errors
      try {
        if (!content || (typeof content === 'string' && content.trim().length === 0)) {
          throw new Error('Empty response from Venice AI');
        }
        
        // Check if JSON appears incomplete (common truncation patterns)
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
        const trimmedContent = contentStr.trim();
        
        // Check for incomplete JSON (missing closing braces)
        const openBraces = (trimmedContent.match(/\{/g) || []).length;
        const closeBraces = (trimmedContent.match(/\}/g) || []).length;
        const openBrackets = (trimmedContent.match(/\[/g) || []).length;
        const closeBrackets = (trimmedContent.match(/\]/g) || []).length;
        
        if (openBraces > closeBraces || openBrackets > closeBrackets) {
          throw new Error(`Incomplete JSON response: missing closing brackets. Open braces: ${openBraces}, Close braces: ${closeBraces}`);
        }
        
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        
        // Handle null values properly (Venice can return null for optional fields)
        if (parsed.ai_concepts_to_learn === null || parsed.ai_concepts_to_learn === undefined) {
          parsed.ai_concepts_to_learn = [];
        }
        
        // Ensure all required fields exist
        if (!parsed.opening_scenario || !parsed.core_concepts || !parsed.practical_exercises || 
            !parsed.key_takeaways || !parsed.action_items) {
          throw new Error('Incomplete response: missing required fields');
        }
        
        return parsed;
      } catch (parseError) {
        const errorMsg = parseError instanceof Error ? parseError.message : 'Invalid JSON';
        const contentPreview = typeof content === 'string' 
          ? content.substring(0, 500) + (content.length > 500 ? '...' : '')
          : 'Non-string content';
        throw new Error(`Failed to parse chapter content: ${errorMsg}. Content preview: ${contentPreview}`);
      }
    } catch (error: any) {
      // Provide detailed error information
      if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        const data = error.response.data;
        
        if (status === 404) {
          throw new Error(`Venice AI endpoint not found (404). Please check your VENICE_BASE_URL configuration. Current: ${VENICE_CONFIG.BASE_URL}/chat/completions`);
        }
        
        throw new Error(`Failed to generate chapter: ${status} ${statusText} - ${JSON.stringify(data)}`);
      } else if (error.request) {
        throw new Error(`No response from Venice AI. Please check your API key and network connection.`);
      } else {
        throw new Error(`Failed to generate chapter: ${error.message || 'Unknown error'}`);
      }
    }
  }

  /**
   * Generate a summary of latest updates using Mistral model with web search
   */
  async generateUpdatesSummary(
    learningGoal: string,
    updates: NewsItem[]
  ): Promise<string> {
    const updatesText = updates.map((update, index) => 
      `${index + 1}. ${update.title}: ${update.summary}${update.source ? ` (Source: ${update.source})` : ''}`
    ).join('\n\n');

    const summaryPrompt = `
Summarize the latest advances and developments related to "${learningGoal}" based on these recent updates:

${updatesText}

Provide a comprehensive summary (2-3 paragraphs) that:
1. Highlights the most significant recent developments, especially GenAI applications
2. Explains how Generative AI is being applied to this field/topic
3. Identifies emerging trends, tools, or research breakthroughs
4. Notes practical implications and how practitioners can leverage these advances

Focus on:
- How GenAI is transforming this area
- Latest research or model updates if this is a GenAI topic
- Practical applications and tools available now
- Trends that will impact the field

Make it concise but informative, focusing on actionable insights and real-world applications.`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: VENICE_CONFIG.MODELS.RESEARCH,
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at synthesizing information and creating clear, actionable summaries. Focus on practical implications and trends.' 
          },
          { role: 'user', content: summaryPrompt },
        ],
        temperature: 0.5,
        max_completion_tokens: 1000,
        venice_parameters: {
          enable_web_search: true,
          enable_web_scraping: true,
          enable_web_citations: false,
        },
      }, {
        timeout: VENICE_CONFIG.TIMEOUTS.RESEARCH,
      });

      const summary = response.data.choices[0].message.content;
      return summary || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Parse news updates from Venice AI response
   */
  private parseNewsUpdates(content: string): NewsItem[] {
    const newsItems: NewsItem[] = [];
    const lines = content.split('\n');

    let currentItem: Partial<NewsItem> | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Detect new item (headers)
      if (trimmedLine.match(/^#{1,3}\s+(.+)/) || trimmedLine.match(/^\*\*(.+)\*\*$/)) {
        if (currentItem && currentItem.title) {
          newsItems.push(currentItem as NewsItem);
        }
        currentItem = {
          title: trimmedLine.replace(/[#*]/g, '').trim(),
          summary: '',
          date: new Date().toISOString(),
        };
      }
      // Extract URL
      else if (currentItem && trimmedLine.match(/https?:\/\/[^\s]+/)) {
        const urlMatch = trimmedLine.match(/https?:\/\/[^\s)]+/);
        if (urlMatch) {
          currentItem.source = urlMatch[0];
        }
      }
      // Add to summary
      else if (currentItem && trimmedLine && !trimmedLine.match(/^[-*]\s*$/)) {
        currentItem.summary += (currentItem.summary ? ' ' : '') + trimmedLine;
      }
    }

    // Add last item
    if (currentItem && currentItem.title) {
      newsItems.push(currentItem as NewsItem);
    }

    return newsItems.slice(0, 5); // Return top 5 most relevant
  }
}

// Export singleton instance
export const veniceAI = new VeniceAIService();
