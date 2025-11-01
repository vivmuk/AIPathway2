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
│   │   │       └── status/
│   │   │           └── route.ts      # GET course status
│   │   └── chapters/
│   │       └── route.ts              # POST generate chapter
│   ├── create/
│   │   └── page.tsx                   # Course creation UI
│   ├── courses/
│   │   └── [id]/
│   │       └── page.tsx               # Course view page
│   └── layout.tsx
├── lib/
│   ├── course-generator.ts           # Main course generator
│   ├── venice-ai.ts                  # Venice AI service wrapper
│   ├── venice-config.ts              # Configuration
│   └── dev-storage.ts                # File-based storage (dev)
├── types/
│   └── course.ts                     # TypeScript types
├── .dev-storage.json                 # Storage file (gitignored)
├── .env.local                       # Environment variables (gitignored)
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

