import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chapterId = decodeURIComponent(params.id);
    const body = await request.json();
    const { chapterData } = body;

    if (!chapterData) {
      return NextResponse.json(
        { error: 'Chapter data is required' },
        { status: 400 }
      );
    }

    // Generate HTML export
    const html = generateChapterHTML(chapterData);

    // Return file
    const filename = `chapter-${chapterId.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error exporting chapter:', error);
    return NextResponse.json(
      {
        error: 'Failed to export chapter',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function generateChapterHTML(chapterData: any): string {
  const { title, content, latestNews, updatesSummary, createdAt } = chapterData;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - AI Pathway 2</title>
  <style>
    ${getChapterStyles()}
  </style>
</head>
<body>
  <div class="chapter-container">
    <div class="chapter-header">
      <div class="brand">AI Pathway 2</div>
      <h1 class="chapter-title">${escapeHtml(title)}</h1>
      <div class="chapter-meta">
        <span>Created: ${new Date(createdAt).toLocaleDateString()}</span>
      </div>
    </div>

    ${renderOpeningScenario(content.opening_scenario)}
    ${renderCoreConcepts(content.core_concepts)}
    ${renderPracticalExercises(content.practical_exercises)}
    ${renderKeyTakeaways(content.key_takeaways)}
    ${renderActionItems(content.action_items)}
    ${latestNews && latestNews.length > 0 ? renderLatestUpdates(latestNews, updatesSummary) : ''}
  </div>
</body>
</html>`;
}

function renderOpeningScenario(scenario: any): string {
  return `
    <section class="section">
      <h2 class="section-title">${escapeHtml(scenario.title)}</h2>
      <div class="scenario-box">
        <div class="scenario-item">
          <h3>Scenario</h3>
          <p>${escapeHtml(scenario.scenario)}</p>
        </div>
        <div class="scenario-item">
          <h3>Challenge</h3>
          <p>${escapeHtml(scenario.challenge)}</p>
        </div>
        <div class="scenario-item highlight">
          <h3>AI Solution</h3>
          <p>${escapeHtml(scenario.ai_solution)}</p>
        </div>
      </div>
    </section>
  `;
}

function renderCoreConcepts(concepts: any[]): string {
  if (!concepts || concepts.length === 0) return '';
  
  return `
    <section class="section">
      <h2 class="section-title">Core Concepts</h2>
      ${concepts.map((concept, index) => `
        <div class="concept-card">
          <h3>${escapeHtml(concept.concept)}</h3>
          <p class="explanation">${escapeHtml(concept.explanation)}</p>
          <div class="role-example">
            <strong>Real-world Example:</strong>
            <p>${escapeHtml(concept.role_example)}</p>
          </div>
          ${concept.tools_mentioned && concept.tools_mentioned.length > 0 ? `
            <div class="tools">
              <strong>Tools Mentioned:</strong>
              ${concept.tools_mentioned.map((tool: string) => 
                `<span class="tool-badge">${escapeHtml(tool)}</span>`
              ).join(' ')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </section>
  `;
}

function renderPracticalExercises(exercises: any[]): string {
  if (!exercises || exercises.length === 0) return '';
  
  return `
    <section class="section">
      <h2 class="section-title">Practical Exercises</h2>
      ${exercises.map((exercise, index) => `
        <div class="exercise-card">
          <div class="exercise-header">
            <h3>${escapeHtml(exercise.title)}</h3>
            <span class="difficulty-badge ${exercise.difficulty}">${exercise.difficulty}</span>
          </div>
          <div class="exercise-content">
            <div>
              <strong>Instructions:</strong>
              <p>${escapeHtml(exercise.instructions)}</p>
            </div>
            <div>
              <strong>Expected Outcome:</strong>
              <p>${escapeHtml(exercise.expected_outcome)}</p>
            </div>
          </div>
        </div>
      `).join('')}
    </section>
  `;
}

function renderKeyTakeaways(takeaways: string[]): string {
  if (!takeaways || takeaways.length === 0) return '';
  
  return `
    <section class="section">
      <h2 class="section-title">Key Takeaways</h2>
      <ul class="takeaways-list">
        ${takeaways.map(takeaway => `
          <li>${escapeHtml(takeaway)}</li>
        `).join('')}
      </ul>
    </section>
  `;
}

function renderActionItems(items: any[]): string {
  if (!items || items.length === 0) return '';
  
  return `
    <section class="section">
      <h2 class="section-title">Action Items</h2>
      <div class="action-items">
        ${items.map((item, index) => `
          <div class="action-item">
            <span class="action-number">${index + 1}</span>
            <div class="action-content">
              <p class="action-task">${escapeHtml(item.task)}</p>
              <p class="action-timeline">Timeline: ${escapeHtml(item.timeline)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderLatestUpdates(news: any[], summary?: string): string {
  return `
    <section class="section">
      <h2 class="section-title">Latest Advances in This Space</h2>
      ${summary ? `
        <div class="summary-box">
          <h3>Summary of Recent Developments</h3>
          <p>${escapeHtml(summary)}</p>
        </div>
      ` : ''}
      <div class="news-items">
        ${news.map((item, index) => `
          <div class="news-item">
            <div class="news-header">
              <h3>${escapeHtml(item.title)}</h3>
              ${item.source ? `<a href="${escapeHtml(item.source)}" target="_blank" class="news-link">Source ↗</a>` : ''}
            </div>
            <p class="news-summary">${escapeHtml(item.summary)}</p>
            ${item.date ? `<p class="news-date">${new Date(item.date).toLocaleDateString()}</p>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function getChapterStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: #f8fafc;
      padding: 20px;
    }
    .chapter-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .chapter-header {
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .brand {
      font-size: 14px;
      font-weight: 600;
      color: #4f46e5;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .chapter-title {
      font-size: 2.5em;
      color: #1e293b;
      margin-bottom: 10px;
    }
    .chapter-meta {
      color: #64748b;
      font-size: 14px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section-title {
      font-size: 1.8em;
      color: #1e293b;
      margin-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
    }
    .scenario-box {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .scenario-item {
      padding: 20px;
      background: #f8fafc;
      border-left: 4px solid #64748b;
      border-radius: 8px;
    }
    .scenario-item.highlight {
      border-left-color: #4f46e5;
      background: #eef2ff;
    }
    .scenario-item h3 {
      color: #1e293b;
      margin-bottom: 10px;
      font-size: 1.2em;
    }
    .concept-card {
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .concept-card h3 {
      color: #4f46e5;
      margin-bottom: 10px;
      font-size: 1.3em;
    }
    .explanation {
      margin-bottom: 15px;
      color: #475569;
    }
    .role-example {
      margin-top: 15px;
      padding: 15px;
      background: white;
      border-left: 3px solid #10b981;
      border-radius: 4px;
    }
    .tools {
      margin-top: 15px;
    }
    .tool-badge {
      display: inline-block;
      padding: 4px 12px;
      background: #e2e8f0;
      border-radius: 12px;
      font-size: 0.85em;
      margin-right: 8px;
      margin-top: 8px;
    }
    .exercise-card {
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .exercise-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .exercise-header h3 {
      color: #1e293b;
    }
    .difficulty-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .difficulty-badge.beginner {
      background: #d1fae5;
      color: #065f46;
    }
    .difficulty-badge.intermediate {
      background: #fef3c7;
      color: #92400e;
    }
    .difficulty-badge.advanced {
      background: #fee2e2;
      color: #991b1b;
    }
    .exercise-content > div {
      margin-bottom: 15px;
    }
    .takeaways-list {
      list-style: none;
      padding-left: 0;
    }
    .takeaways-list li {
      padding: 10px 0 10px 30px;
      position: relative;
    }
    .takeaways-list li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: bold;
      font-size: 1.2em;
    }
    .action-items {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .action-item {
      display: flex;
      gap: 15px;
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .action-number {
      width: 32px;
      height: 32px;
      background: #4f46e5;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
    }
    .action-task {
      font-weight: 600;
      margin-bottom: 5px;
    }
    .action-timeline {
      font-size: 0.9em;
      color: #64748b;
    }
    .summary-box {
      padding: 20px;
      background: #eef2ff;
      border-left: 4px solid #4f46e5;
      border-radius: 8px;
      margin-bottom: 25px;
    }
    .summary-box h3 {
      color: #1e293b;
      margin-bottom: 10px;
    }
    .news-items {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .news-item {
      padding: 15px;
      border-left: 4px solid #4f46e5;
      background: #f8fafc;
      border-radius: 8px;
    }
    .news-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 10px;
    }
    .news-header h3 {
      color: #1e293b;
      font-size: 1.1em;
    }
    .news-link {
      color: #4f46e5;
      text-decoration: none;
      font-size: 0.9em;
    }
    .news-summary {
      color: #475569;
      margin-bottom: 8px;
    }
    .news-date {
      font-size: 0.85em;
      color: #94a3b8;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .chapter-container {
        box-shadow: none;
        padding: 20px;
      }
    }
  `;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

