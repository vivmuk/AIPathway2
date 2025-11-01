import { NextRequest, NextResponse } from 'next/server';
import { veniceAI } from '@/lib/venice-ai';

// Set max duration to 10 minutes for deployment platforms
export const maxDuration = 600;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { learningGoal, roleContext, experienceLevel } = body;

    // Validate request
    if (!learningGoal || learningGoal.trim().length < 10) {
      return NextResponse.json(
        { error: 'Learning goal must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Generate single chapter
    const chapterContent = await veniceAI.generateSingleChapter(
      learningGoal,
      roleContext,
      experienceLevel || 'intermediate'
    );

    return NextResponse.json({
      success: true,
      chapter: {
        title: learningGoal,
        content: chapterContent,
        createdAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error generating chapter:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate chapter',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

