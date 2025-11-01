import { v4 as uuidv4 } from 'uuid';
import { veniceAI } from './venice-ai';
import {
  Course,
  CourseGenerationRequest,
  CourseGenerationStatus,
  Chapter
} from '@/types/course';

// In-memory storage for MVP (replace with Redis/DB in production)
const coursesStore = new Map<string, Course>();
const statusStore = new Map<string, CourseGenerationStatus>();

export class CourseGenerator {
  /**
   * Start course generation process
   */
  async generateCourse(request: CourseGenerationRequest): Promise<string> {
    const courseId = uuidv4();

    // Initialize status
    statusStore.set(courseId, {
      courseId,
      status: 'analyzing',
      progress: 0,
    });

    // Initialize course
    const course: Course = {
      id: courseId,
      metadata: {
        jobTitle: this.extractJobTitle(request.jobDescription),
        jobDescription: request.jobDescription,
        internalRole: request.internalRole,
        industry: request.industry,
        experienceLevel: request.experienceLevel,
        createdAt: new Date(),
        lastModified: new Date(),
      },
      analysis: {
        current_state: '',
        ai_impact: '',
        transformation_timeline: '',
        critical_skills: [],
      },
      chapters: [],
      createdAt: new Date(),
      status: 'processing',
      progress: 0,
    };

    coursesStore.set(courseId, course);

    // Start generation in background (non-blocking)
    this.processCourseGeneration(courseId, request).catch(error => {
      this.updateStatus(courseId, 'error', -1, { error: error.message });
    });

    return courseId;
  }

  /**
   * Get course by ID
   */
  getCourse(courseId: string): Course | undefined {
    return coursesStore.get(courseId);
  }

  /**
   * Get course generation status
   */
  getStatus(courseId: string): CourseGenerationStatus | undefined {
    return statusStore.get(courseId);
  }

  /**
   * Main course generation pipeline
   */
  private async processCourseGeneration(
    courseId: string,
    request: CourseGenerationRequest
  ): Promise<void> {
    try {
      const course = coursesStore.get(courseId);
      if (!course) throw new Error('Course not found');

      // Step 1: Analyze job and create outline (0-20%)
      this.updateStatus(courseId, 'analyzing', 5, {
        estimatedTimeRemaining: 10, // 10 minutes total estimate
      });

      const outline = await veniceAI.analyzeJobAndCreateOutline(
        request.jobDescription || request.internalRole || '',
        request.internalRole
      );

      course.analysis = outline.role_analysis;
      course.chapters = outline.chapters;
      coursesStore.set(courseId, course);

      this.updateStatus(courseId, 'planning', 20, {
        totalChapters: outline.chapters.length,
        estimatedTimeRemaining: 9, // ~9 minutes remaining
      });

      // Step 2: Generate content for each chapter (20-80%)
      const totalChapters = outline.chapters.length;

      for (let i = 0; i < totalChapters; i++) {
        const chapter = outline.chapters[i];
        const progress = 20 + (60 * ((i + 1) / totalChapters));

        // Estimate: 1-2 minutes per chapter for content generation
        const estimatedMinutesPerChapter = 1.5; // 1.5 minutes per chapter
        const remainingChapters = totalChapters - i;
        this.updateStatus(courseId, 'generating', Math.floor(progress), {
          currentChapter: i + 1,
          totalChapters,
          estimatedTimeRemaining: Math.ceil(remainingChapters * estimatedMinutesPerChapter),
        });

        // Generate chapter content
        const content = await veniceAI.generateChapterContent(
          chapter,
          request.jobDescription || request.internalRole || ''
        );

        course.chapters[i].content = content;
        coursesStore.set(courseId, course);
      }

      // Step 3: Enrich with latest news (80-95%)
      this.updateStatus(courseId, 'enriching', 80, {
        estimatedTimeRemaining: Math.ceil(totalChapters * 0.5), // ~30 seconds per chapter for news, convert to minutes
      });

      for (let i = 0; i < totalChapters; i++) {
        const chapter = course.chapters[i];
        const progress = 80 + (15 * ((i + 1) / totalChapters));
        const remainingChapters = totalChapters - i;

        this.updateStatus(courseId, 'enriching', Math.floor(progress), {
          currentChapter: i + 1,
          totalChapters,
          estimatedTimeRemaining: Math.max(1, Math.ceil(remainingChapters * 0.5)), // At least 1 minute
        });

        // Fetch latest updates (non-critical, so continue on error)
        try {
          const contextForNews = request.jobDescription || request.internalRole || '';
          const latestNews = await veniceAI.fetchLatestUpdates(
            chapter.title,
            contextForNews
          );
          course.chapters[i].latestNews = latestNews;
        } catch (error) {
          // Silently continue on news fetch failure
          course.chapters[i].latestNews = [];
        }

        coursesStore.set(courseId, course);
      }

      // Step 4: Finalize (95-100%)
      this.updateStatus(courseId, 'finalizing', 95);

      // Calculate total estimated time
      course.metadata.estimatedTotalTime = course.chapters.reduce(
        (sum, ch) => sum + ch.estimated_time_minutes,
        0
      );
      course.metadata.lastModified = new Date();
      course.status = 'completed';
      course.progress = 100;

      coursesStore.set(courseId, course);
      this.updateStatus(courseId, 'completed', 100);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateStatus(courseId, 'error', -1, { error: errorMessage });

      const course = coursesStore.get(courseId);
      if (course) {
        course.status = 'error';
        coursesStore.set(courseId, course);
      }
    }
  }

  /**
   * Update generation status
   */
  private updateStatus(
    courseId: string,
    status: CourseGenerationStatus['status'],
    progress: number,
    metadata?: { currentChapter?: number; totalChapters?: number; error?: string; estimatedTimeRemaining?: number }
  ): void {
    const currentStatus = statusStore.get(courseId);
    statusStore.set(courseId, {
      ...currentStatus,
      courseId,
      status,
      progress,
      ...metadata,
    });
  }

  /**
   * Extract job title from description
   */
  private extractJobTitle(description: string): string {
    // Simple extraction - take first line or first 50 chars
    const firstLine = description.split('\n')[0].trim();
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all courses (for listing)
   */
  getAllCourses(): Course[] {
    return Array.from(coursesStore.values());
  }
}

// Export singleton instance
export const courseGenerator = new CourseGenerator();
