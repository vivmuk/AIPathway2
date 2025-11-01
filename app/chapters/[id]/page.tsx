'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, BookOpen, Loader2, TrendingUp, ExternalLink } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import ReactMarkdown from 'react-markdown';

interface NewsItem {
  title: string;
  summary: string;
  source?: string;
  date: string;
  relevance?: string;
}

interface ChapterData {
  title: string;
  content: {
    opening_scenario: {
      title: string;
      scenario: string;
      challenge: string;
      ai_solution: string;
    };
    core_concepts: Array<{
      concept: string;
      explanation: string;
      role_example: string;
      tools_mentioned?: string[];
    }>;
    practical_exercises: Array<{
      title: string;
      instructions: string;
      expected_outcome: string;
      difficulty: string;
    }>;
    key_takeaways: string[];
    action_items: Array<{
      task: string;
      timeline: string;
    }>;
  };
  latestNews?: NewsItem[];
  updatesSummary?: string;
  createdAt: string;
}

function SingleChapterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(dataParam));
        setChapterData(decoded);
      } catch (error) {
        console.error('Failed to parse chapter data:', error);
      }
    }
    setLoading(false);
  }, [searchParams]);

  const handleDownload = async () => {
    if (!chapterData) return;
    
    try {
      const chapterId = encodeURIComponent(chapterData.title);
      const response = await fetch(`/api/chapters/${chapterId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterData }),
      });

      if (!response.ok) {
        throw new Error('Failed to export chapter');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chapter-${chapterData.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading chapter:', error);
      alert('Failed to download chapter. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!chapterData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Chapter not found</p>
          <button
            onClick={() => router.push('/create')}
            className="btn-primary"
          >
            Create New Chapter
          </button>
        </div>
      </div>
    );
  }

  const { title, content } = chapterData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/create')}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back to Create</span>
          </button>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold text-gradient">{title}</h1>
              <button
                onClick={() => window.print()}
                className="btn-secondary"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Opening Scenario */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold mb-4 text-slate-800">Opening Scenario</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">{content.opening_scenario.title}</h3>
              <p className="text-slate-600 mb-3">{content.opening_scenario.scenario}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Challenge:</p>
              <p className="text-slate-600 mb-3">{content.opening_scenario.challenge}</p>
              <p className="text-sm font-semibold text-slate-700 mb-2">AI Solution:</p>
              <p className="text-slate-600">{content.opening_scenario.ai_solution}</p>
            </div>
          </div>
        </div>

        {/* Core Concepts */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold mb-4 text-slate-800">Core Concepts</h2>
          <div className="space-y-6">
            {content.core_concepts.map((concept, index) => (
              <div key={index} className="border-l-4 border-slate-600 pl-4">
                <h3 className="text-xl font-semibold text-slate-700 mb-2">{concept.concept}</h3>
                <p className="text-slate-600 mb-3">{concept.explanation}</p>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm font-semibold text-slate-700 mb-1">Real-world Example:</p>
                  <p className="text-slate-600 text-sm">{concept.role_example}</p>
                </div>
                {concept.tools_mentioned && concept.tools_mentioned.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Tools Mentioned:</p>
                    <div className="flex flex-wrap gap-2">
                      {concept.tools_mentioned.map((tool, toolIndex) => (
                        <span key={toolIndex} className="px-3 py-1 bg-slate-200 rounded-full text-sm text-slate-700">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Practical Exercises */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold mb-4 text-slate-800">Practical Exercises</h2>
          <div className="space-y-4">
            {content.practical_exercises.map((exercise, index) => (
              <div key={index} className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-700">{exercise.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    exercise.difficulty === 'beginner' ? 'bg-emerald-100 text-emerald-700' :
                    exercise.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {exercise.difficulty}
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">Instructions:</p>
                    <ReactMarkdown className="text-slate-600 text-sm prose prose-sm max-w-none">
                      {exercise.instructions}
                    </ReactMarkdown>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">Expected Outcome:</p>
                    <p className="text-slate-600 text-sm">{exercise.expected_outcome}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Takeaways */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold mb-4 text-slate-800">Key Takeaways</h2>
          <ul className="space-y-2">
            {content.key_takeaways.map((takeaway, index) => (
              <li key={index} className="flex items-start space-x-3">
                <BookOpen className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                <p className="text-slate-600">{takeaway}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Items */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold mb-4 text-slate-800">Action Items</h2>
          <div className="space-y-3">
            {content.action_items.map((item, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                <span className="w-6 h-6 bg-slate-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-slate-700 font-medium">{item.task}</p>
                  <p className="text-sm text-slate-500 mt-1">Timeline: {item.timeline}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Updates & Advances */}
        {chapterData.latestNews && chapterData.latestNews.length > 0 && (
          <div className="card mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold text-slate-800">Latest Advances in This Space</h2>
            </div>
            
            {/* Summary of Latest Updates */}
            {chapterData.updatesSummary && (
              <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-6 rounded-r-lg">
                <h3 className="font-semibold text-slate-800 mb-2">Summary of Recent Developments</h3>
                <ReactMarkdown className="text-slate-700 prose prose-sm max-w-none">
                  {chapterData.updatesSummary}
                </ReactMarkdown>
              </div>
            )}
            
            <p className="text-slate-600 mb-6 text-sm">
              Recent developments, tools, and breakthroughs related to your learning topic
            </p>
            <div className="space-y-4">
              {chapterData.latestNews.map((news, index) => (
                <div key={index} className="border-l-4 border-indigo-500 pl-4 py-2">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-slate-800">{news.title}</h3>
                    {news.source && (
                      <a
                        href={news.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        <span>Source</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm mb-2">{news.summary}</p>
                  {news.date && (
                    <p className="text-xs text-slate-500">
                      {new Date(news.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Download Button */}
        <div className="flex justify-center mt-6 mb-6">
          <button
            onClick={() => handleDownload()}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Download as HTML</span>
          </button>
        </div>

        {/* Footer CTA */}
        <div className="card mt-6 text-center bg-gradient-to-r from-slate-700 to-slate-800 text-white">
          <h3 className="text-2xl font-bold mb-3">Want to learn more?</h3>
          <p className="mb-4 opacity-90">Generate a full 10-chapter course tailored to your role</p>
          <button
            onClick={() => router.push('/create')}
            className="bg-white text-slate-800 px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
          >
            Create Full Course
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SingleChapterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading chapter...</p>
        </div>
      </div>
    }>
      <SingleChapterContent />
    </Suspense>
  );
}

