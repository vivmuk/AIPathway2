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

    // Log request for debugging
    console.log('Generating single chapter:', {
      learningGoal: learningGoal.substring(0, 50),
      hasRoleContext: !!roleContext,
      experienceLevel: experienceLevel || 'intermediate',
    });

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

  } catch (error: any) {
    console.error('Error generating chapter:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to generate chapter';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    if (error?.response) {
      const status = error.response.status;
      const data = error.response.data;
      errorMessage = `Venice AI API error (${status})`;
      errorDetails = JSON.stringify(data) || error.message;
      
      console.error('Venice AI API Error:', {
        status,
        data,
        url: error.config?.url,
        method: error.config?.method,
      });
    } else if (error?.request) {
      errorMessage = 'No response from Venice AI';
      errorDetails = 'Please check your API key and network connection';
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}

