import { NextRequest, NextResponse } from 'next/server';
import { courseGenerator } from '@/lib/course-generator';
import { CourseGenerationRequest } from '@/types/course';

// Set max duration to 10 minutes for deployment platforms
export const maxDuration = 600;

export async function POST(request: NextRequest) {
  try {
    // Check if Venice API key is configured
    if (!process.env.VENICE_API_KEY) {
      console.error('VENICE_API_KEY is not set in environment variables');
      return NextResponse.json(
        {
          error: 'Venice AI API key not configured',
          details: 'Please set VENICE_API_KEY environment variable in Railway',
        },
        { status: 500 }
      );
    }

    const body: CourseGenerationRequest = await request.json();

    // Validate request - must have either jobDescription or internalRole
    const hasJobDescription = body.jobDescription && body.jobDescription.trim().length >= 20;
    const hasInternalRole = body.internalRole && body.internalRole.trim().length >= 20;
    
    if (!hasJobDescription && !hasInternalRole) {
      return NextResponse.json(
        { error: 'Either job description or internal role/workflow must be provided with at least 20 characters' },
        { status: 400 }
      );
    }

    // Start course generation
    const courseId = await courseGenerator.generateCourse(body);

    return NextResponse.json({
      success: true,
      courseId,
      message: 'Course generation started',
    }, { status: 202 });

  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      {
        error: 'Failed to start course generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const courses = courseGenerator.getAllCourses();
    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
