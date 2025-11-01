import { v4 as uuidv4 } from 'uuid';
import { veniceAI } from './venice-ai';
import { VENICE_CONFIG } from './venice-config';
import { devStorage } from './dev-storage';
import {
  Course,
  CourseGenerationRequest,
  CourseGenerationStatus,
  Chapter
} from '@/types/course';

export class CourseGenerator {
  /**
   * Start course generation process
   */
  async generateCourse(request: CourseGenerationRequest): Promise<string> {
    const courseId = uuidv4();

    console.log(`[CourseGenerator] === CREATING COURSE ${courseId} ===`);

    try {
      // Initialize status
      const initialStatus: CourseGenerationStatus = {
        courseId,
        status: 'analyzing',
        progress: 0,
      };
      devStorage.setStatus(courseId, initialStatus);
      console.log(`[CourseGenerator] ✅ Status initialized`);

      // Initialize course
      const course: Course = {
        id: courseId,
        metadata: {
          jobTitle: this.extractJobTitle(request.jobDescription || request.internalRole || ''),
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

      devStorage.setCourse(courseId, course);
      const stats = devStorage.getStats();
      console.log(`[CourseGenerator] ✅ Course stored. Total: ${stats.courseCount} courses, ${stats.statusCount} statuses`);

      // Verify storage immediately
      const verifyStatus = devStorage.getStatus(courseId);
      const verifyCourse = devStorage.getCourse(courseId);
      if (!verifyStatus || !verifyCourse) {
        throw new Error(`Failed to store course - Status: ${!!verifyStatus}, Course: ${!!verifyCourse}`);
      }
      console.log(`[CourseGenerator] ✅ Verification passed`);

      // Start generation in background (non-blocking)
      this.processCourseGeneration(courseId, request).catch(error => {
        console.error(`[CourseGenerator] ❌ FATAL ERROR in processCourseGeneration:`, error);
        console.error(`[CourseGenerator] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
        this.updateStatus(courseId, 'error', -1, { error: error instanceof Error ? error.message : String(error) });
      });

      console.log(`[CourseGenerator] ✅ Course generation started in background`);
      return courseId;
    } catch (error) {
      console.error(`[CourseGenerator] ❌ ERROR creating course:`, error);
      throw error;
    }
  }

  /**
   * Get course by ID
   */
  getCourse(courseId: string): Course | undefined {
    // Force reload to ensure we have latest data from file
    const course = devStorage.getCourse(courseId, true);
    const stats = devStorage.getStats();
    console.log(`[CourseGenerator] getCourse(${courseId}): ${course ? 'FOUND' : 'NOT FOUND'} (Total courses: ${stats.courseCount})`);
    return course;
  }

  /**
   * Get course generation status
   */
  getStatus(courseId: string): CourseGenerationStatus | undefined {
    // Force reload to ensure we have latest data from file
    const status = devStorage.getStatus(courseId, true);
    const stats = devStorage.getStats();
    console.log(`[CourseGenerator] getStatus(${courseId}): ${status ? 'FOUND' : 'NOT FOUND'} (Total statuses: ${stats.statusCount})`);
    return status;
  }

  /**
   * Main course generation pipeline
   */
  private async processCourseGeneration(
    courseId: string,
    request: CourseGenerationRequest
  ): Promise<void> {
    console.log(`[CourseGenerator] === STARTING GENERATION FOR ${courseId} ===`);
    try {
      let course = devStorage.getCourse(courseId);
      if (!course) {
        throw new Error(`Course ${courseId} not found in storage`);
      }
      console.log(`[CourseGenerator] ✅ Course loaded from storage`);

      // Step 1: Analyze job and create outline (0-20%)
      console.log(`[CourseGenerator] Step 1: Analyzing job description...`);
      console.log(`[CourseGenerator] Input - jobDescription length: ${(request.jobDescription || '').length}, internalRole length: ${(request.internalRole || '').length}`);
      
      this.updateStatus(courseId, 'analyzing', 5, {
        estimatedTimeRemaining: 10,
      });

      let outline;
      try {
        console.log(`[CourseGenerator] Calling Venice AI analyzeJobAndCreateOutline...`);
        outline = await veniceAI.analyzeJobAndCreateOutline(
          request.jobDescription || request.internalRole || '',
          request.internalRole
        );
        console.log(`[CourseGenerator] ✅ Outline received from Venice AI`);
        console.log(`[CourseGenerator] Outline has ${outline.chapters?.length || 0} chapters`);
        console.log(`[CourseGenerator] Role analysis keys: ${Object.keys(outline.role_analysis || {}).join(', ')}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[CourseGenerator] ❌ FAILED to get outline from Venice AI:`, errorMsg);
        console.error(`[CourseGenerator] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
        if (error instanceof Error && error.stack) {
          console.error(`[CourseGenerator] Stack trace:`, error.stack);
        }
        throw new Error(`Failed to analyze job and create outline: ${errorMsg}`);
      }

      course.analysis = outline.role_analysis;
      course.chapters = outline.chapters;
      devStorage.setCourse(courseId, course);

      // In test mode, limit to TEST_MODE_CHAPTERS
      const maxChapters = VENICE_CONFIG.TEST_MODE ? VENICE_CONFIG.TEST_MODE_CHAPTERS : outline.chapters.length;
      const chaptersToProcess = outline.chapters.slice(0, maxChapters);
      course.chapters = chaptersToProcess;
      devStorage.setCourse(courseId, course);
      console.log(`[CourseGenerator] ✅ Processing ${chaptersToProcess.length} chapters (test mode: ${VENICE_CONFIG.TEST_MODE})`);

      this.updateStatus(courseId, 'planning', 20, {
        totalChapters: chaptersToProcess.length,
        estimatedTimeRemaining: 9,
      });

      // Step 2: Generate content for each chapter (20-80%)
      const totalChapters = chaptersToProcess.length;
      console.log(`[CourseGenerator] Step 2: Generating content for ${totalChapters} chapters...`);

      for (let i = 0; i < totalChapters; i++) {
        const chapter = chaptersToProcess[i];
        const progress = 20 + (60 * ((i + 1) / totalChapters));

        console.log(`[CourseGenerator] Generating chapter ${i + 1}/${totalChapters}: ${chapter.title}`);

        this.updateStatus(courseId, 'generating', Math.floor(progress), {
          currentChapter: i + 1,
          totalChapters,
          estimatedTimeRemaining: Math.ceil((totalChapters - i) * 1.5),
        });

        // Generate chapter content with retry logic
        let content;
        let retries = 0;
        const maxRetries = 2;
        
        while (retries <= maxRetries) {
          try {
            content = await veniceAI.generateChapterContent(
              chapter,
              request.jobDescription || request.internalRole || ''
            );
            console.log(`[CourseGenerator] ✅ Chapter ${i + 1} content generated`);
            break;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isIncompleteError = errorMessage.includes('Incomplete') || 
                                     errorMessage.includes('Unexpected end of JSON') ||
                                     errorMessage.includes('missing closing brackets');
            
            if (isIncompleteError && retries < maxRetries) {
              retries++;
              console.log(`[CourseGenerator] ⚠️ Retry ${retries}/${maxRetries} for chapter ${i + 1}`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            } else {
              console.error(`[CourseGenerator] ❌ Failed to generate chapter ${i + 1}:`, errorMessage);
              throw error;
            }
          }
        }

        course = devStorage.getCourse(courseId);
        if (!course) throw new Error(`Course ${courseId} disappeared during generation!`);
        course.chapters[i].content = content;
        devStorage.setCourse(courseId, course);
      }

      console.log(`[CourseGenerator] ✅ All ${totalChapters} chapters generated`);

      // Step 3: Enrich with latest news (80-95%)
      console.log(`[CourseGenerator] Step 3: Enriching with latest updates...`);
      course = devStorage.getCourse(courseId);
      if (!course) throw new Error(`Course ${courseId} disappeared!`);
      
      const chaptersForNews = course.chapters.slice(0, totalChapters);
      this.updateStatus(courseId, 'enriching', 80, {
        estimatedTimeRemaining: Math.ceil(chaptersForNews.length * 0.5),
      });
      
      for (let i = 0; i < chaptersForNews.length; i++) {
        this.updateStatus(courseId, 'enriching', Math.floor(80 + (15 * ((i + 1) / chaptersForNews.length))), {
          currentChapter: i + 1,
          totalChapters: chaptersForNews.length,
          estimatedTimeRemaining: Math.max(1, Math.ceil((chaptersForNews.length - i) * 0.5)),
        });

        try {
          const contextForNews = request.jobDescription || request.internalRole || '';
          const latestNews = await veniceAI.fetchLatestUpdates(chaptersForNews[i].title, contextForNews);
          course = devStorage.getCourse(courseId);
          if (course) {
            course.chapters[i].latestNews = latestNews;
            devStorage.setCourse(courseId, course);
          }
        } catch (error) {
          console.log(`[CourseGenerator] ⚠️ Failed to fetch news for chapter ${i + 1}, continuing...`);
          course = devStorage.getCourse(courseId);
          if (course) {
            course.chapters[i].latestNews = [];
            devStorage.setCourse(courseId, course);
          }
        }
      }

      console.log(`[CourseGenerator] ✅ Enrichment complete`);

      // Step 4: Finalize (95-100%)
      console.log(`[CourseGenerator] Step 4: Finalizing...`);
      course = devStorage.getCourse(courseId);
      if (!course) throw new Error(`Course ${courseId} disappeared during finalization!`);

      this.updateStatus(courseId, 'finalizing', 95);

      course.metadata.estimatedTotalTime = course.chapters.reduce(
        (sum: number, ch: Chapter) => sum + ch.estimated_time_minutes,
        0
      );
      course.metadata.lastModified = new Date();
      course.status = 'completed';
      course.progress = 100;

      devStorage.setCourse(courseId, course);
      this.updateStatus(courseId, 'completed', 100);

      console.log(`[CourseGenerator] ✅✅✅ COURSE GENERATION COMPLETE FOR ${courseId} ✅✅✅`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[CourseGenerator] ❌❌❌ FATAL ERROR in generation pipeline:`, errorMessage);
      console.error(`[CourseGenerator] Error details:`, error instanceof Error ? error.stack : error);
      
      this.updateStatus(courseId, 'error', -1, { error: errorMessage });

      const course = devStorage.getCourse(courseId);
      if (course) {
        course.status = 'error';
        devStorage.setCourse(courseId, course);
      }
      throw error; // Re-throw to be caught by outer handler
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
    const currentStatus = devStorage.getStatus(courseId) || { courseId, status: 'analyzing' as const, progress: 0 };
    const newStatus: CourseGenerationStatus = {
      ...currentStatus,
      courseId,
      status,
      progress,
      ...metadata,
    };
    devStorage.setStatus(courseId, newStatus);
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
    return devStorage.getAllCourses();
  }
}

// Export singleton instance
export const courseGenerator = new CourseGenerator();
