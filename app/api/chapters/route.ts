import { NextRequest, NextResponse } from 'next/server';
import { veniceAI } from '@/lib/venice-ai';
import { NewsItem } from '@/types/course';

// Set max duration to 10 minutes for deployment platforms
export const maxDuration = 600;

export async function POST(request: NextRequest) {
  try {
    // Check if Venice API key is configured
    if (!process.env.VENICE_API_KEY) {
      return NextResponse.json(
        {
          error: 'Venice AI API key not configured',
          details: 'Please set VENICE_API_KEY environment variable in Railway',
        },
        { status: 500 }
      );
    }

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

    // Fetch latest updates/advances in the space
    let latestUpdates: NewsItem[] = [];
    let updatesSummary = '';
    try {
      latestUpdates = await veniceAI.fetchLatestUpdates(
        learningGoal,
        roleContext || learningGoal
      );
      
      // Generate summary of latest updates using Venice AI
      if (latestUpdates.length > 0) {
        try {
          updatesSummary = await veniceAI.generateUpdatesSummary(
            learningGoal,
            latestUpdates
          );
        } catch (error) {
          // Silently continue if summary generation fails
        }
      }
    } catch (error) {
      // Continue without updates - don't fail the whole request
    }

    return NextResponse.json({
      success: true,
      chapter: {
        title: learningGoal,
        content: chapterContent,
        latestNews: latestUpdates,
        updatesSummary: updatesSummary,
        createdAt: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    // Provide error information
    let errorMessage = 'Failed to generate chapter';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    if (error?.response) {
      const status = error.response.status;
      const data = error.response.data;
      errorMessage = `Venice AI API error (${status})`;
      errorDetails = JSON.stringify(data) || error.message;
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

