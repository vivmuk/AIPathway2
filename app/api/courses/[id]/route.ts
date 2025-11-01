import { NextRequest, NextResponse } from 'next/server';
import { courseGenerator } from '@/lib/course-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both sync and async params (Next.js 15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const courseId = resolvedParams.id;
    const course = courseGenerator.getCourse(courseId);

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ course });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}
