# AI Pathway Course Generator - Production Guide

## 📋 Table of Contents
- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [Storage System](#storage-system)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Course Generation Pipeline](#course-generation-pipeline)
- [Deployment Checklist](#deployment-checklist)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

This is a Next.js 15 application that generates personalized AI training courses using the Venice AI API. The system uses file-based storage in development and should be migrated to a database (Redis/PostgreSQL) for production.

### Key Technologies
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **AI Provider**: Venice AI (Qwen3-235B, Mistral-31-24B)
- **Storage**: File-based (dev) → Should be Redis/DB (production)

---

## 🧩 Core Components

### 1. Course Generator (`lib/course-generator.ts`)

**Purpose**: Main orchestrator for course generation pipeline

**Key Methods**:
```typescript
// Create a new course and start generation
async generateCourse(request: CourseGenerationRequest): Promise<string>

// Get course by ID
getCourse(courseId: string): Course | undefined

// Get generation status
getStatus(courseId: string): CourseGenerationStatus | undefined

// Get all courses
getAllCourses(): Course[]
```

**Generation Pipeline**:
1. **Analyze (0-20%)**: Venice AI analyzes job description and creates outline
2. **Plan (20%)**: Outline is processed and chapter list is finalized
3. **Generate (20-80%)**: Content generated for each chapter
4. **Enrich (80-95%)**: Latest industry updates added to chapters
5. **Finalize (95-100%)**: Course metadata calculated and marked complete

**Error Handling**:
- All errors are caught and stored in course status
- Failed courses marked with `status: 'error'` and error details
- Logging at every step with `[CourseGenerator]` prefix

---

### 2. Venice AI Service (`lib/venice-ai.ts`)

**Purpose**: Wrapper for Venice AI API calls

**Key Methods**:
```typescript
// Step 1: Analyze job and create course outline
async analyzeJobAndCreateOutline(
  jobDescription: string,
  internalRole?: string
): Promise<CourseOutline>

// Step 2: Generate detailed chapter content
async generateChapterContent(
  chapter: Chapter,
  roleContext: string
): Promise<ChapterContent>

// Step 3: Fetch latest industry updates
async fetchLatestUpdates(
  chapterTopic: string,
  roleContext: string
): Promise<NewsItem[]>
```

**Models Used**:
- **REASONING**: `qwen3-235b` - For outline and analysis
- **CONTENT**: `mistral-31-24b` - For chapter content generation
- **RESEARCH**: `mistral-31-24b` - For news/research updates

**Features**:
- JSON schema validation for structured outputs
- Retry logic for incomplete responses
- Comprehensive error logging with `[VeniceAI]` prefix
- 10-minute timeout for complex operations

---

### 3. Development Storage (`lib/dev-storage.ts`)

**Purpose**: File-based persistence for development mode

**Features**:
- Atomic writes (temp file + rename) to prevent corruption
- File modification time tracking for cache invalidation
- Force reload capability for multi-process scenarios
- Date object serialization/deserialization

**Storage File**: `.dev-storage.json`

**Structure**:
```typescript
{
  courses: { [courseId: string]: Course },
  statuses: { [courseId: string]: CourseGenerationStatus }
}
```

**⚠️ Production Migration Required**:
Replace with Redis or PostgreSQL for:
- Multi-server deployments
- Better performance
- Data persistence across deployments
- Concurrent access handling

---

## 🗄️ Storage System

### Current Implementation (Development)

**File**: `.dev-storage.json` (excluded from git via `.gitignore`)

**Operations**:
- `getCourse(id, forceReload?)`: Get course by ID
- `setCourse(id, course)`: Save course (atomic write)
- `getStatus(id, forceReload?)`: Get status by ID
- `setStatus(id, status)`: Save status (atomic write)
- `getAllCourses()`: Get all courses
- `getStats()`: Get storage statistics

### Production Migration Strategy

**Option 1: Redis**
```typescript
// lib/production-storage.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const productionStorage = {
  getCourse: async (id: string) => {
    const data = await redis.get(`course:${id}`);
    return data ? JSON.parse(data) : undefined;
  },
  setCourse: async (id: string, course: Course) => {
    await redis.set(`course:${id}`, JSON.stringify(course));
  },
  // ... similar for status
};
```

**Option 2: PostgreSQL**
- Use Prisma or TypeORM
- Store courses and statuses in separate tables
- Index on `id` for fast lookups

---

## 🔌 API Endpoints

### POST `/api/courses`
**Purpose**: Create a new course

**Request Body**:
```typescript
{
  jobDescription?: string;      // At least 20 chars
  internalRole?: string;        // At least 20 chars
  industry?: string;
  experienceLevel?: string;
}
```

**Response** (202 Accepted):
```typescript
{
  success: true,
  courseId: string,
  message: "Course generation started"
}
```

**Validation**:
- Requires either `jobDescription` OR `internalRole` (min 20 chars)
- Checks for Venice API key configuration

---

### GET `/api/courses`
**Purpose**: List all courses

**Response**:
```typescript
{
  courses: Course[]
}
```

---

### GET `/api/courses/[id]`
**Purpose**: Get course details

**Response**:
```typescript
{
  course: Course
}
```

**Error**: 404 if not found

---

### GET `/api/courses/[id]/status`
**Purpose**: Get course generation status

**Response**:
```typescript
{
  status: CourseGenerationStatus
}
```

**Status Types**:
- `analyzing`: Step 1 - Job analysis
- `planning`: Step 2 - Outline creation
- `generating`: Step 3 - Content generation
- `enriching`: Step 4 - News/research updates
- `finalizing`: Step 5 - Finalization
- `completed`: Generation complete
- `error`: Generation failed

**Progress**: 0-100 (or -1 for error)

**Fallback**: If status not found but course exists, creates status from course state

---

## ⚙️ Configuration

### Environment Variables

**Required**:
```bash
VENICE_API_KEY=your_api_key_here
```

**Optional**:
```bash
# Venice API Configuration
VENICE_BASE_URL=https://api.venice.ai/api/v1  # Default
VENICE_MODEL_REASONING=qwen3-235b              # Default
VENICE_MODEL_CONTENT=mistral-31-24b            # Default
VENICE_MODEL_RESEARCH=mistral-31-24b          # Default

# Test Mode (limits to 3 chapters)
TEST_MODE=false  # Set to 'true' for local testing

# Node Environment
NODE_ENV=production  # or development
```

### Config File (`lib/venice-config.ts`)

```typescript
export const VENICE_CONFIG = {
  API_KEY: process.env.VENICE_API_KEY || '',
  BASE_URL: process.env.VENICE_BASE_URL || 'https://api.venice.ai/api/v1',
  MODELS: {
    REASONING: 'qwen3-235b',
    CONTENT: 'mistral-31-24b',
    RESEARCH: 'mistral-31-24b',
  },
  TIMEOUTS: {
    REASONING: 600000,  // 10 minutes
    CONTENT: 600000,
    RESEARCH: 600000,
  },
  TEST_MODE: process.env.TEST_MODE === 'true',
  TEST_MODE_CHAPTERS: 3,
};
```

---

## 🔄 Course Generation Pipeline

### Step 1: Analyze (0-20%)
- **Task**: Venice AI analyzes job description
- **Model**: Qwen3-235B (reasoning model)
- **Output**: Role analysis + 10-chapter outline
- **Progress**: 5% → 20%

**Role Analysis Includes**:
- Current state of the role
- AI impact areas
- Transformation timeline
- Critical skills needed

---

### Step 2: Plan (20%)
- **Task**: Process outline, limit chapters if test mode
- **Progress**: 20%

---

### Step 3: Generate (20-80%)
- **Task**: Generate detailed content for each chapter
- **Model**: Mistral-31-24B (content model)
- **Progress**: 20% → 80% (distributed across chapters)
- **Retry Logic**: Up to 2 retries for incomplete responses

**Chapter Content Includes**:
- Learning objectives
- Detailed explanations
- Practical examples
- Exercises and assessments
- Key takeaways

---

### Step 4: Enrich (80-95%)
- **Task**: Fetch latest industry updates for each chapter
- **Model**: Mistral-31-24B (research model)
- **Progress**: 80% → 95%
- **Non-Critical**: Continues even if news fetch fails

**News Items Include**:
- Latest tool releases
- Industry best practices
- Regulatory updates
- Case studies

---

### Step 5: Finalize (95-100%)
- **Task**: Calculate metadata, mark complete
- **Progress**: 95% → 100%

**Calculations**:
- Total estimated learning time
- Last modified timestamp
- Final status update

---

## 📦 Deployment Checklist

### Pre-Deployment

- [ ] Set `TEST_MODE=false` or remove from env
- [ ] Verify `VENICE_API_KEY` is set
- [ ] Test course creation locally with full 10 chapters
- [ ] Review and update timeout values if needed
- [ ] Set up production storage (Redis/PostgreSQL)
- [ ] Update `maxDuration` in API routes if needed (default: 600s)

### Production Storage Migration

1. **Choose Storage**:
   - Redis: Fast, good for caching
   - PostgreSQL: Persistent, ACID compliant

2. **Create Storage Module**:
   ```typescript
   // lib/production-storage.ts
   // Replace devStorage with production storage
   ```

3. **Update Course Generator**:
   ```typescript
   // lib/course-generator.ts
   // Import production storage instead of dev-storage
   ```

4. **Test Thoroughly**:
   - Create courses
   - Verify persistence
   - Test concurrent access
   - Load test if needed

### Environment Setup

```bash
# Production .env
VENICE_API_KEY=your_production_key
VENICE_BASE_URL=https://api.venice.ai/api/v1
TEST_MODE=false
NODE_ENV=production

# Storage (choose one)
REDIS_URL=redis://your-redis-url
# OR
DATABASE_URL=postgresql://your-db-url
```

### Build & Deploy

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start
```

---

## 🚂 Railway Deployment

### Railway Configuration

Railway automatically detects Next.js applications. However, you need to configure:

1. **Environment Variables** (in Railway dashboard):
   ```
   VENICE_API_KEY=your_venice_api_key_here
   VENICE_BASE_URL=https://api.venice.ai/api/v1
   VENICE_MODEL_REASONING=qwen3-235b
   VENICE_MODEL_CONTENT=mistral-31-24b
   VENICE_MODEL_RESEARCH=mistral-31-24b
   TEST_MODE=false
   NODE_ENV=production
   ```

2. **Build Command**: Railway will automatically detect `npm run build`

3. **Start Command**: Railway will automatically detect `npm start`

4. **Node Version**: Ensure `package.json` specifies Node 18+ (already configured):
   ```json
   "engines": {
     "node": ">=18.0.0"
   }
   ```

### Railway Deployment Steps

1. **Connect Repository**:
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your repository

2. **Configure Environment Variables**:
   - Go to project settings
   - Add all environment variables listed above
   - **Critical**: Set `VENICE_API_KEY` with your actual API key

3. **Deploy**:
   - Railway will automatically build and deploy
   - Monitor build logs for any errors
   - Check deployment logs for runtime errors

4. **Verify Deployment**:
   - Visit your Railway-provided URL
   - Test course creation
   - Check server logs in Railway dashboard

### Railway-Specific Considerations

- **File Storage**: Railway's filesystem is ephemeral. Use Redis or PostgreSQL for production data persistence
- **Request Timeouts**: Railway has default timeouts. Ensure your API routes have appropriate `maxDuration` settings
- **Logging**: Use Railway's built-in logging dashboard to monitor errors
- **Environment Variables**: All env vars must be set in Railway dashboard, not in `.env` files

### Railway Production Checklist

- [ ] All environment variables set in Railway dashboard
- [ ] `VENICE_API_KEY` configured correctly
- [ ] `TEST_MODE=false` or removed
- [ ] Production storage configured (Redis/PostgreSQL recommended)
- [ ] Application deployed and accessible
- [ ] Course generation tested end-to-end
- [ ] Monitoring and logging verified

---

## 🤖 Complete AI Prompts & Schemas

This section contains all the prompts and JSON schemas required to recreate the application's AI behavior.

### System Prompts

Located in `lib/venice-config.ts`:

**REASONING System Prompt**:
```
You are an expert in AI education and workforce transformation. Your task is to:
1. Analyze how GenAI will impact specific roles
2. Identify the most critical AI skills needed
3. Create a logical 10-chapter learning progression
4. Use adult learning principles (start with fundamentals, build complexity, include practical applications)
5. Focus on real-world applicability and immediate value
```

**CONTENT System Prompt**:
```
You are an expert educator specializing in adult learning and AI training.
Apply these pedagogical principles:
- Bloom's Taxonomy progression (Remember → Understand → Apply → Analyze → Evaluate → Create)
- ADDIE model structure (Analysis, Design, Development, Implementation, Evaluation)
- Cognitive Load Theory (chunk information, use schemas, provide examples)
- Active learning through exercises and reflection
- Immediate practical application to work context
- Clear, jargon-free explanations with real-world examples
```

**RESEARCH System Prompt**:
```
You are a research assistant focused on finding the most recent and relevant AI industry updates.
Your goal is to provide:
1. Latest tool releases and platform updates
2. Industry best practices and case studies
3. Regulatory changes or compliance updates
4. Breakthrough techniques or methodologies
5. Real-world implementations and results
Focus on information from the last 2 months and provide source citations.
```

### User Prompts

#### Step 1: Analyze Job and Create Outline

**Prompt Template**:
```
Job Description: {jobDescription}
{internalRole ? `Internal Role/Process: {internalRole}` : ''}

Create a comprehensive {chapterCount}-chapter GenAI course outline that:
- Addresses specific tasks and responsibilities in this role
- Progresses from AI fundamentals to advanced role-specific applications
- Includes practical tools and techniques relevant to daily work
- Considers industry context and compliance requirements

For each chapter provide:
1. Chapter title
2. Learning objectives (3-4)
3. Key topics to cover
4. Estimated learning time in minutes
5. Why this matters for the role
```

**JSON Schema** (strict mode):
```json
{
  "type": "object",
  "properties": {
    "role_analysis": {
      "type": "object",
      "properties": {
        "current_state": { "type": "string" },
        "ai_impact": { "type": "string" },
        "transformation_timeline": { "type": "string" },
        "critical_skills": {
          "type": "array",
          "items": { "type": "string" }
        }
      },
      "required": ["current_state", "ai_impact", "transformation_timeline", "critical_skills"],
      "additionalProperties": false
    },
    "chapters": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "number": { "type": "integer" },
          "title": { "type": "string" },
          "objectives": {
            "type": "array",
            "items": { "type": "string" }
          },
          "topics": {
            "type": "array",
            "items": { "type": "string" }
          },
          "estimated_time_minutes": { "type": "integer" },
          "role_relevance": { "type": "string" }
        },
        "required": ["number", "title", "objectives", "topics", "estimated_time_minutes", "role_relevance"],
        "additionalProperties": false
      }
    }
  },
  "required": ["role_analysis", "chapters"],
  "additionalProperties": false
}
```

**API Parameters**:
- Model: `qwen3-235b` (REASONING)
- Temperature: `0.6`
- Timeout: `600000` (10 minutes)
- Response Format: `json_schema` (strict: true)

---

#### Step 2: Generate Chapter Content

**Prompt Template**:
```
Generate comprehensive content for this chapter teaching HOW TO APPLY AI:

Chapter: {chapter.title}
Learning Objectives: {chapter.objectives.join(', ')}
Key Topics: {chapter.topics.join(', ')}
Role Context: {roleContext}

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
- How it applies to the learning goal
```

**JSON Schema** (strict mode):
```json
{
  "type": "object",
  "properties": {
    "opening_scenario": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "scenario": { "type": "string" },
        "challenge": { "type": "string" },
        "ai_solution": { "type": "string" }
      },
      "required": ["title", "scenario", "challenge", "ai_solution"],
      "additionalProperties": false
    },
    "core_concepts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "concept": { "type": "string" },
          "explanation": { "type": "string" },
          "role_example": { "type": "string" },
          "tools_mentioned": {
            "type": ["array", "null"],
            "items": { "type": "string" }
          }
        },
        "required": ["concept", "explanation", "role_example"],
        "additionalProperties": false
      }
    },
    "practical_exercises": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "instructions": { "type": "string" },
          "expected_outcome": { "type": "string" },
          "difficulty": {
            "type": "string",
            "enum": ["beginner", "intermediate", "advanced"]
          }
        },
        "required": ["title", "instructions", "expected_outcome", "difficulty"],
        "additionalProperties": false
      }
    },
    "key_takeaways": {
      "type": "array",
      "items": { "type": "string" }
    },
    "action_items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "task": { "type": "string" },
          "timeline": { "type": "string" }
        },
        "required": ["task", "timeline"],
        "additionalProperties": false
      }
    },
    "ai_concepts_to_learn": {
      "type": ["array", "null"],
      "items": {
        "type": "object",
        "properties": {
          "concept": { "type": "string" },
          "description": { "type": "string" },
          "why_important": { "type": "string" },
          "skill_level": {
            "type": "string",
            "enum": ["beginner", "intermediate", "advanced"]
          },
          "tools_or_platforms": {
            "type": ["array", "null"],
            "items": { "type": "string" }
          }
        },
        "required": ["concept", "description", "why_important", "skill_level"],
        "additionalProperties": false
      }
    }
  },
  "required": ["opening_scenario", "core_concepts", "practical_exercises", "key_takeaways", "action_items"],
  "additionalProperties": false
}
```

**API Parameters**:
- Model: `mistral-31-24b` (CONTENT)
- Temperature: `0.7`
- Max Completion Tokens: `20000`
- Timeout: `600000` (10 minutes)
- Response Format: `json_schema` (strict: true)

---

#### Step 3: Fetch Latest Industry Updates

**Prompt Template**:
```
Search for the latest developments, research, and GenAI applications related to "{chapterTopic}" in the context of {roleContext}.

Focus specifically on:
1. How Generative AI (GenAI) is being applied to this topic/field
2. Latest research papers, breakthroughs, or innovations
3. New AI tools, models, or platforms relevant to this area
4. Real-world case studies showing GenAI implementation
5. Industry trends and best practices using AI

If this is a GenAI-specific topic, focus on the latest research, model updates, and applications.

Time frame: Last 3 months (since {twoMonthsAgo.toLocaleDateString()})
Provide 3-5 most relevant updates with source links. Format as structured news items with title, summary, and source URL.
```

**API Parameters**:
- Model: `mistral-31-24b` (RESEARCH)
- Temperature: `0.5`
- Timeout: `600000` (10 minutes)
- Venice Parameters:
  - `enable_web_search: true`
  - `enable_web_scraping: true`
  - `enable_web_citations: true`
  - `include_search_results_in_stream: false`

**Response Parsing**: The response is parsed to extract news items with:
- Title (from markdown headers `#` or `**`)
- Summary (from body text)
- Source URL (from links matching `https?://...`)
- Date (defaults to current date)

---

#### Single Chapter Generation

**Prompt Template**:
```
Create a comprehensive chapter teaching how to APPLY AI to: "{learningGoal}"

{roleContext ? `Role/Work Context: {roleContext}` : ''}
Experience Level: {experienceLevel}

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
- How it applies to the learning goal
```

**Uses same JSON schema as Step 2 (Chapter Content)**

---

## 📋 Complete TypeScript Type Definitions

Located in `types/course.ts`:

```typescript
export interface Course {
  id: string;
  userId?: string;
  metadata: CourseMetadata;
  analysis: RoleAnalysis;
  chapters: Chapter[];
  createdAt: Date;
  status: 'processing' | 'completed' | 'error';
  progress?: number;
}

export interface CourseMetadata {
  jobTitle: string;
  jobDescription: string;
  internalRole?: string;
  industry?: string;
  experienceLevel?: string;
  estimatedTotalTime?: number;
  createdAt: Date;
  lastModified: Date;
}

export interface RoleAnalysis {
  current_state: string;
  ai_impact: string;
  transformation_timeline: string;
  critical_skills: string[];
}

export interface Chapter {
  number: number;
  title: string;
  objectives: string[];
  topics: string[];
  estimated_time_minutes: number;
  role_relevance: string;
  content?: ChapterContent;
  latestNews?: NewsItem[];
}

export interface ChapterContent {
  opening_scenario: OpeningScenario;
  core_concepts: CoreConcept[];
  practical_exercises: Exercise[];
  key_takeaways: string[];
  action_items: ActionItem[];
  ai_concepts_to_learn?: AIConcept[];
  additional_resources?: Resource[];
}

export interface AIConcept {
  concept: string;
  description: string;
  why_important: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  tools_or_platforms?: string[];
}

export interface OpeningScenario {
  title: string;
  scenario: string;
  challenge: string;
  ai_solution: string;
}

export interface CoreConcept {
  concept: string;
  explanation: string;
  role_example: string;
  tools_mentioned?: string[];
}

export interface Exercise {
  title: string;
  instructions: string;
  expected_outcome: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface ActionItem {
  task: string;
  timeline: string;
}

export interface Resource {
  title: string;
  type: 'article' | 'video' | 'tool' | 'course' | 'documentation';
  description: string;
  url?: string;
}

export interface NewsItem {
  title: string;
  summary: string;
  source?: string;
  date: string;
  relevance?: string;
}

export interface CourseOutline {
  role_analysis: RoleAnalysis;
  chapters: Chapter[];
}

export interface CourseGenerationRequest {
  jobDescription: string;
  internalRole?: string;
  industry?: string;
  experienceLevel?: string;
}

export interface CourseGenerationStatus {
  courseId: string;
  status: 'analyzing' | 'planning' | 'generating' | 'enriching' | 'finalizing' | 'completed' | 'error';
  progress: number;
  currentChapter?: number;
  totalChapters?: number;
  error?: string;
  estimatedTimeRemaining?: number;
}
```

---

## 📦 Complete Dependencies

From `package.json`:

**Production Dependencies**:
```json
{
  "next": "14.2.13",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "axios": "^1.7.7",
  "uuid": "^10.0.0",
  "bullmq": "^5.13.2",
  "ioredis": "^5.4.1",
  "puppeteer": "^23.4.1",
  "lucide-react": "^0.445.0",
  "zustand": "^5.0.0-rc.2",
  "react-markdown": "^9.0.1",
  "jspdf": "^2.5.2",
  "html2canvas": "^1.4.1"
}
```

**Dev Dependencies**:
```json
{
  "@types/node": "^22.7.4",
  "@types/react": "^18.3.10",
  "@types/react-dom": "^18.3.0",
  "@types/uuid": "^10.0.0",
  "typescript": "^5.6.2",
  "tailwindcss": "^3.4.13",
  "postcss": "^8.4.47",
  "autoprefixer": "^10.4.20",
  "eslint": "^8.57.1",
  "eslint-config-next": "14.2.13"
}
```

**Node Engine Requirement**:
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 🔄 Export Functionality

### Export Service

Located in `lib/export-service.ts`, provides HTML and PDF export capabilities.

**Key Methods**:
- `exportAsHTML(course: Course): Promise<string>` - Generates standalone HTML file
- `exportAsPDF(course: Course): Promise<string>` - Generates PDF-ready HTML (for client-side conversion)

**Export Features**:
- Complete course content with all chapters
- Table of contents with smooth scrolling
- Styled with inline CSS (standalone)
- Interactive JavaScript for navigation
- Print-optimized styling for PDF

**Export API Endpoint**: `POST /api/courses/[id]/export`

**Request Body**:
```json
{
  "format": "html" | "pdf"
}
```

**Response**: File download with appropriate Content-Type header

---

## 🎨 Frontend UI Components

### Page Routes

1. **Landing Page** (`app/page.tsx`):
   - Hero section
   - Call-to-action buttons
   - Navigation to course creation

2. **Course Creation** (`app/create/page.tsx`):
   - Three creation paths:
     - Job description-based
     - Internal role/workflow-based
     - Single chapter generation
   - Form inputs with validation
   - Loading states and error handling

3. **Course Viewer** (`app/courses/[id]/page.tsx`):
   - Full course display
   - Chapter navigation
   - Export functionality
   - Progress indicators

4. **Progress Tracking** (`app/courses/[id]/progress/page.tsx`):
   - Real-time status updates
   - Progress bar visualization
   - Polling for status changes

5. **Chapter Viewer** (`app/chapters/[id]/page.tsx`):
   - Single chapter display
   - News items
   - AI concepts section

### UI Features

- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Icon library
- **Responsive Design**: Mobile-first approach
- **Loading States**: Spinners and progress indicators
- **Error Handling**: User-friendly error messages
- **Form Validation**: Client-side validation

---

## 🔌 Additional API Endpoints

### POST `/api/chapters`

**Purpose**: Generate a single chapter based on learning goal

**Request Body**:
```typescript
{
  learningGoal: string;      // Required, min 10 chars
  roleContext?: string;      // Optional
  experienceLevel?: string;  // Optional: 'beginner' | 'intermediate' | 'advanced'
}
```

**Response**:
```typescript
{
  chapter: ChapterContent
}
```

**Features**:
- Uses same content generation pipeline as full courses
- Faster generation (single chapter)
- Includes AI concepts to learn section
- Supports latest industry updates

### GET `/api/courses/[id]/export`

**Purpose**: Export course as HTML or PDF

**Request Body**:
```typescript
{
  format: 'html' | 'pdf'
}
```

**Response**: File download with appropriate headers

---

## 🐛 Troubleshooting

### Course Gets Stuck at "Analyzing" (5%)

**Symptoms**: Status stays at `analyzing` with 5% progress

**Possible Causes**:
1. Venice AI API call timing out or failing
2. Network connectivity issues
3. Invalid API key

**Debug Steps**:
1. Check server logs for `[VeniceAI]` errors
2. Verify API key is correct
3. Test Venice AI API directly
4. Check network connectivity
5. Review timeout settings

**Solution**:
- Increase timeout in `VENICE_CONFIG.TIMEOUTS.REASONING`
- Verify API key permissions
- Check Venice AI service status

---

### 404 Errors on Status Endpoint

**Symptoms**: `/api/courses/[id]/status` returns 404

**Possible Causes**:
1. Course not persisted to storage
2. Storage file not being read correctly
3. Hot reload clearing in-memory cache

**Debug Steps**:
1. Check `.dev-storage.json` for course existence
2. Review server logs for `[Status API]` messages
3. Verify storage read/write operations

**Solution**:
- Storage now uses force reload on reads
- Status endpoint creates status from course if missing
- Atomic writes prevent corruption

---

### Course Not Persisting

**Symptoms**: Course created but disappears after refresh

**Possible Causes**:
1. Storage write failure
2. File permissions issue
3. Storage file being cleared

**Debug Steps**:
1. Check server logs for `[DevStorage]` errors
2. Verify `.dev-storage.json` file exists
3. Check file permissions
4. Review write error logs

**Solution**:
- Atomic writes prevent partial writes
- Error logging shows write failures
- File modification tracking ensures fresh reads

---

### Generation Fails with "Incomplete Response"

**Symptoms**: Error message about incomplete JSON or missing brackets

**Possible Causes**:
1. Venice AI response cut off mid-generation
2. Network interruption
3. Response too large

**Solution**:
- Retry logic automatically retries up to 2 times
- Check timeout settings
- Review Venice AI API limits

---

## 📝 Key Implementation Details

### Error Handling Strategy

1. **Course Creation**: Errors thrown, caught at API level
2. **Generation Pipeline**: Errors caught, stored in status, course marked `error`
3. **Venice AI Calls**: Detailed error logging, re-thrown for pipeline handling
4. **Storage Operations**: Errors logged and re-thrown

### Logging Strategy

**Prefixes**:
- `[CourseGenerator]`: Course generation pipeline
- `[VeniceAI]`: Venice AI API calls
- `[DevStorage]`: Storage operations
- `[Status API]`: Status endpoint operations
- `[Courses API]`: Courses endpoint operations

**Log Levels**:
- ✅ Success operations
- ⚠️ Warnings/retries
- ❌ Errors

### Type Safety

All components use TypeScript with strict type checking:
- `Course` type from `@/types/course`
- `CourseGenerationRequest` type
- `CourseGenerationStatus` type
- `Chapter` and `ChapterContent` types

---

## 🚀 Future Enhancements

1. **Production Storage**: Migrate to Redis/PostgreSQL
2. **Caching**: Add Redis caching for frequently accessed courses
3. **Queue System**: Use Bull/Agenda for job queuing
4. **Webhooks**: Notify on course completion
5. **Progress Streaming**: SSE for real-time progress updates
6. **Retry Policies**: Exponential backoff for API calls
7. **Rate Limiting**: Protect against abuse
8. **Analytics**: Track course generation metrics
9. **User Authentication**: Add user accounts
10. **Course Sharing**: Public/private course visibility

---

## 📚 File Structure

```
.
├── app/
│   ├── api/
│   │   ├── courses/
│   │   │   ├── route.ts              # POST / GET all courses
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET single course
│   │   │       ├── export/
│   │   │       │   └── route.ts      # POST export course
│   │   │       └── status/
│   │   │           └── route.ts      # GET course status
│   │   └── chapters/
│   │       ├── route.ts              # POST generate chapter
│   │       └── [id]/
│   │           └── export/
│   │               └── route.ts      # POST export chapter
│   ├── chapters/
│   │   └── [id]/
│   │       └── page.tsx              # Single chapter viewer
│   ├── courses/
│   │   └── [id]/
│   │       ├── page.tsx              # Course view page
│   │       └── progress/
│   │           └── page.tsx          # Progress tracking page
│   ├── create/
│   │   └── page.tsx                  # Course creation UI
│   ├── globals.css                   # Global styles
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Landing page
├── lib/
│   ├── course-generator.ts           # Main course generator
│   ├── venice-ai.ts                  # Venice AI service wrapper
│   ├── venice-config.ts              # Configuration & prompts
│   ├── dev-storage.ts                # File-based storage (dev)
│   └── export-service.ts             # HTML/PDF export service
├── types/
│   └── course.ts                     # TypeScript type definitions
├── public/                           # Static assets
├── .dev-storage.json                 # Storage file (gitignored)
├── .env.local                       # Environment variables (gitignored)
├── .gitignore                       # Git ignore rules
├── next.config.js                   # Next.js configuration
├── package.json                     # Dependencies & scripts
├── tailwind.config.js               # Tailwind CSS config
├── tsconfig.json                    # TypeScript config
└── PRODUCTION_GUIDE.md              # This file
```

---

## 🔐 Security Considerations

1. **API Keys**: Never commit API keys to git
2. **Environment Variables**: Use `.env.local` (gitignored)
3. **Input Validation**: Validate all user inputs
4. **Rate Limiting**: Implement in production
5. **Error Messages**: Don't expose sensitive info in errors

---

## 📞 Support

For issues or questions:
1. Check server logs for detailed error messages
2. Review this guide's troubleshooting section
3. Verify environment variables are set correctly
4. Test Venice AI API connectivity independently

---

**Last Updated**: Generated automatically
**Version**: Production-ready with full 10-chapter support

