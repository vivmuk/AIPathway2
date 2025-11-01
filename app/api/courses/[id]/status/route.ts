import { NextRequest, NextResponse } from 'next/server';
import { courseGenerator } from '@/lib/course-generator';
import { CourseGenerationStatus } from '@/types/course';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both sync and async params (Next.js 15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const courseId = resolvedParams.id;
    
    console.log(`[Status API] === Fetching status for course: ${courseId} ===`);
    
    // Force reload storage to ensure we have latest data
    const status = courseGenerator.getStatus(courseId);
    const course = courseGenerator.getCourse(courseId);

    console.log(`[Status API] Status found: ${status ? 'YES' : 'NO'}`);
    console.log(`[Status API] Course found: ${course ? 'YES' : 'NO'}`);
    
    if (status) {
      console.log(`[Status API] Returning status: ${status.status} (${status.progress}%)`);
      return NextResponse.json({ status });
    }

    // If no status but course exists, create status from course
    if (course) {
      console.log(`[Status API] Course exists but no status record, creating from course state`);
      
      // Determine status value first, then apply type assertion
      let statusValue: 'completed' | 'error' | 'analyzing' = 'analyzing';
      if (course.status === 'completed') {
        statusValue = 'completed';
      } else if (course.status === 'error') {
        statusValue = 'error';
      } else if (course.status === 'processing') {
        statusValue = 'analyzing';
      }
      
      const initialStatus: CourseGenerationStatus = {
        courseId,
        status: statusValue,
        progress: course.progress || 0,
      };
      console.log(`[Status API] Created initial status: ${initialStatus.status} (${initialStatus.progress}%)`);
      return NextResponse.json({ status: initialStatus });
    }
    
    console.log(`[Status API] ❌ Course not found for ID: ${courseId}`);
    console.log(`[Status API] Checking storage stats...`);
    const allCourses = courseGenerator.getAllCourses();
    console.log(`[Status API] Total courses in storage: ${allCourses.length}`);
    if (allCourses.length > 0) {
      console.log(`[Status API] Available course IDs: ${allCourses.map(c => c.id).slice(0, 5).join(', ')}`);
    }
    
    return NextResponse.json(
      { error: 'Course not found' },
      { status: 404 }
    );

  } catch (error) {
    console.error(`[Status API] ❌ ERROR:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch status', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
