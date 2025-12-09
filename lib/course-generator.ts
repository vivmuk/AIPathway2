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

      // Step 2: Generate content for each chapter concurrently (20-80%)
      const totalChapters = chaptersToProcess.length;
      console.log(`[CourseGenerator] Step 2: Generating content for ${totalChapters} chapters concurrently...`);

      this.updateStatus(courseId, 'generating', 20, {
        totalChapters,
        estimatedTimeRemaining: Math.ceil(totalChapters * 1.5),
      });

      // Helper function to generate a single chapter with retry logic
      const generateChapterWithRetry = async (chapter: Chapter, index: number, roleContext: string): Promise<{ index: number; content: any }> => {
        let retries = 0;
        const maxRetries = 2;
        
        while (retries <= maxRetries) {
          try {
            console.log(`[CourseGenerator] Generating chapter ${index + 1}/${totalChapters}: ${chapter.title}`);
            const content = await veniceAI.generateChapterContent(chapter, roleContext);
            console.log(`[CourseGenerator] ✅ Chapter ${index + 1} content generated`);
            return { index, content };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isIncompleteError = errorMessage.includes('Incomplete') || 
                                     errorMessage.includes('Unexpected end of JSON') ||
                                     errorMessage.includes('missing closing brackets');
            
            if (isIncompleteError && retries < maxRetries) {
              retries++;
              console.log(`[CourseGenerator] ⚠️ Retry ${retries}/${maxRetries} for chapter ${index + 1}`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            } else {
              console.error(`[CourseGenerator] ❌ Failed to generate chapter ${index + 1}:`, errorMessage);
              throw error;
            }
          }
        }
        throw new Error('Max retries exceeded');
      };

      // Generate all chapters concurrently
      const roleContext = request.jobDescription || request.internalRole || '';
      const chapterPromises = chaptersToProcess.map((chapter, index) => 
        generateChapterWithRetry(chapter, index, roleContext)
      );

      // Wait for all chapters to complete, updating progress as they finish
      const results = await Promise.all(chapterPromises);

      // Update course with all generated content
      course = devStorage.getCourse(courseId);
      if (!course) throw new Error(`Course ${courseId} disappeared during generation!`);

      // Sort results by index to maintain chapter order
      results.sort((a, b) => a.index - b.index);
      
      // Assign content to chapters
      results.forEach(({ index, content }) => {
        course!.chapters[index].content = content;
      });

      devStorage.setCourse(courseId, course);
      this.updateStatus(courseId, 'generating', 80, {
        totalChapters,
        estimatedTimeRemaining: 2,
      });

      console.log(`[CourseGenerator] ✅ All ${totalChapters} chapters generated concurrently`);

      // Step 3: Enrich with latest news concurrently (80-95%)
      console.log(`[CourseGenerator] Step 3: Enriching with latest updates concurrently...`);
      course = devStorage.getCourse(courseId);
      if (!course) throw new Error(`Course ${courseId} disappeared!`);
      
      const chaptersForNews = course.chapters.slice(0, totalChapters);
      this.updateStatus(courseId, 'enriching', 80, {
        estimatedTimeRemaining: Math.ceil(chaptersForNews.length * 0.5),
      });

      // Fetch news for all chapters concurrently
      const contextForNews = request.jobDescription || request.internalRole || '';
      const newsPromises = chaptersForNews.map(async (chapter, index) => {
        try {
          console.log(`[CourseGenerator] Fetching news for chapter ${index + 1}: ${chapter.title}`);
          const latestNews = await veniceAI.fetchLatestUpdates(chapter.title, contextForNews);
          return { index, news: latestNews };
        } catch (error) {
          console.log(`[CourseGenerator] ⚠️ Failed to fetch news for chapter ${index + 1}, using empty array...`);
          return { index, news: [] };
        }
      });

      // Wait for all news fetches to complete
      const newsResults = await Promise.all(newsPromises);

      // Update course with all news items
      course = devStorage.getCourse(courseId);
      if (!course) throw new Error(`Course ${courseId} disappeared!`);

      newsResults.forEach(({ index, news }) => {
        course!.chapters[index].latestNews = news;
      });

      devStorage.setCourse(courseId, course);
      this.updateStatus(courseId, 'enriching', 95, {
        estimatedTimeRemaining: 1,
      });

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
