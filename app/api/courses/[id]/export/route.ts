import { NextRequest, NextResponse } from 'next/server';
import { courseGenerator } from '@/lib/course-generator';
import { exportService } from '@/lib/export-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both sync and async params (Next.js 15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const courseId = resolvedParams.id;
    const { format } = await request.json();

    // Validate format
    if (!['html', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Use "html" or "pdf"' },
        { status: 400 }
      );
    }

    // Get course
    const course = courseGenerator.getCourse(courseId);
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    if (course.status !== 'completed') {
      return NextResponse.json(
        { error: 'Course generation is not complete yet' },
        { status: 400 }
      );
    }

    // Export course
    let content: string;
    let contentType: string;
    let filename: string;

    if (format === 'html') {
      content = await exportService.exportAsHTML(course);
      contentType = 'text/html';
      filename = `course-${courseId}.html`;
    } else {
      content = await exportService.exportAsPDF(course);
      contentType = 'text/html'; // For now, return HTML (client can convert to PDF)
      filename = `course-${courseId}-pdf.html`;
    }

    // Return file
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error exporting course:', error);
    return NextResponse.json(
      {
        error: 'Failed to export course',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
