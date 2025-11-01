'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Sparkles, ArrowLeft, ArrowRight, Download, BookOpen, Clock, Target,
  CheckCircle2, Lightbulb, TrendingUp, ExternalLink, ChevronDown, ChevronUp, Menu, X
} from 'lucide-react';
import { Course, Chapter, ChapterContent } from '@/types/course';

export default function CourseViewerPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['objectives']));

  useEffect(() => {
    if (!courseId) return;

    const fetchCourse = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch course');
        }

        setCourse(data.course);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course');
        setIsLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  const handleExport = async (format: 'html' | 'pdf') => {
    try {
      const response = await fetch(`/api/courses/${courseId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `course-${courseId}.${format === 'pdf' ? 'html' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed. Please try again.');
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-xl text-gray-600">Loading your course...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card max-w-md text-center">
          <p className="text-xl font-semibold text-red-600 mb-4">Error</p>
          <p className="text-gray-600 mb-6">{error || 'Course not found'}</p>
          <button onClick={() => router.push('/')} className="btn-primary">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Safety checks
  if (!course || !course.chapters || course.chapters.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Course not found or has no chapters yet.</p>
        </div>
      </div>
    );
  }

  const currentChapter = course.chapters[currentChapterIndex];
  const totalChapters = course.chapters.length;

  // Ensure currentChapter exists
  if (!currentChapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Chapter not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors lg:hidden"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-semibold hidden sm:inline">Home</span>
              </button>
              <div className="h-8 w-px bg-gray-300 hidden sm:block"></div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gradient hidden md:inline">GenAI Course</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleExport('html')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-semibold"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">HTML</span>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all text-sm font-semibold"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-[73px] left-0 h-[calc(100vh-73px)] bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300 z-40 ${
            isSidebarOpen ? 'w-80' : 'w-0 lg:w-0'
          }`}
        >
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Course Progress
              </h3>
              <div className="flex items-center space-x-3">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${((currentChapterIndex + 1) / totalChapters) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-600">
                  {currentChapterIndex + 1}/{totalChapters}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {course.chapters.map((chapter, index) => (
                <button
                  key={chapter.number}
                  onClick={() => setCurrentChapterIndex(index)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    index === currentChapterIndex
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className={`text-xs font-semibold ${
                      index === currentChapterIndex ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      Chapter {chapter.number}
                    </span>
                    {index < currentChapterIndex && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div className={`font-semibold text-sm mb-1 ${
                    index === currentChapterIndex ? 'text-gray-900' : 'text-gray-700'
                  }`}>
                    {chapter.title}
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    {chapter.estimated_time_minutes} min
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-73px)]">
          <div className="container mx-auto px-6 py-8 max-w-5xl">
            {/* Chapter Header */}
            <div className="card mb-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-semibold mb-4">
                    Chapter {currentChapter.number || currentChapterIndex + 1} of {totalChapters}
                  </div>
                  <h1 className="text-4xl font-bold mb-4">{currentChapter.title || 'Untitled Chapter'}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-gray-600">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{currentChapter.estimated_time_minutes || 0} minutes</span>
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="w-4 h-4 mr-2" />
                      <span>{(currentChapter.objectives || []).length} objectives</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Learning Objectives */}
              <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-100">
                <button
                  onClick={() => toggleSection('objectives')}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <h3 className="text-lg font-bold text-blue-900 flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Learning Objectives
                  </h3>
                  {expandedSections.has('objectives') ? (
                    <ChevronUp className="w-5 h-5 text-blue-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-blue-600" />
                  )}
                </button>
                {expandedSections.has('objectives') && (
                  <ul className="space-y-2">
                    {currentChapter.objectives.map((obj, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle2 className="w-5 h-5 mr-3 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{obj}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Chapter Content */}
            {currentChapter.content && (
              <>
                {/* Opening Scenario */}
                <div className="card mb-8">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-purple-100">
                    <h3 className="text-2xl font-bold mb-4 text-purple-900">
                      {currentChapter.content.opening_scenario.title}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-purple-800 mb-2">Scenario</h4>
                        <p className="text-gray-700">{currentChapter.content.opening_scenario.scenario}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-purple-800 mb-2">Challenge</h4>
                        <p className="text-gray-700">{currentChapter.content.opening_scenario.challenge}</p>
                      </div>
                      <div className="bg-white rounded-xl p-6">
                        <h4 className="font-semibold text-green-700 mb-2 flex items-center">
                          <Lightbulb className="w-5 h-5 mr-2" />
                          AI Solution
                        </h4>
                        <p className="text-gray-700">{currentChapter.content.opening_scenario.ai_solution}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Core Concepts */}
                <div className="card mb-8">
                  <h3 className="text-2xl font-bold mb-6">Core Concepts</h3>
                  <div className="space-y-6">
                    {currentChapter.content.core_concepts.map((concept, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-100">
                        <h4 className="text-xl font-bold mb-3">{concept.concept}</h4>
                        <p className="text-gray-700 mb-4">{concept.explanation}</p>
                        <div className="bg-white rounded-xl p-4 mb-4">
                          <h5 className="font-semibold text-blue-700 mb-2">In Your Role:</h5>
                          <p className="text-gray-700">{concept.role_example}</p>
                        </div>
                        {concept.tools_mentioned && concept.tools_mentioned.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {concept.tools_mentioned.map((tool, toolIdx) => (
                              <span
                                key={toolIdx}
                                className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold"
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Practical Exercises */}
                <div className="card mb-8">
                  <h3 className="text-2xl font-bold mb-6">Practical Exercises</h3>
                  <div className="space-y-6">
                    {currentChapter.content.practical_exercises.map((exercise, idx) => (
                      <div
                        key={idx}
                        className={`rounded-2xl p-6 border-2 ${
                          exercise.difficulty === 'beginner'
                            ? 'bg-green-50 border-green-200'
                            : exercise.difficulty === 'intermediate'
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="text-xl font-bold">{exercise.title}</h4>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                              exercise.difficulty === 'beginner'
                                ? 'bg-green-200 text-green-800'
                                : exercise.difficulty === 'intermediate'
                                ? 'bg-yellow-200 text-yellow-800'
                                : 'bg-red-200 text-red-800'
                            }`}
                          >
                            {exercise.difficulty}
                          </span>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold mb-2">Instructions:</h5>
                            <p className="text-gray-700">{exercise.instructions}</p>
                          </div>
                          <div>
                            <h5 className="font-semibold mb-2">Expected Outcome:</h5>
                            <p className="text-gray-700">{exercise.expected_outcome}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Latest News */}
                {currentChapter.latestNews && currentChapter.latestNews.length > 0 && (
                  <div className="card mb-8">
                    <h3 className="text-2xl font-bold mb-6 flex items-center">
                      <TrendingUp className="w-6 h-6 mr-2 text-pink-600" />
                      Latest Industry Updates
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {currentChapter.latestNews.map((news, idx) => (
                        <div key={idx} className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 border-2 border-pink-100">
                          <h4 className="font-bold mb-2">{news.title}</h4>
                          <p className="text-sm text-gray-700 mb-3">{news.summary}</p>
                          {news.source && (
                            <a
                              href={news.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm font-semibold text-pink-600 hover:text-pink-700"
                            >
                              Read more <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Takeaways */}
                <div className="card mb-8">
                  <h3 className="text-2xl font-bold mb-6">Key Takeaways</h3>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-100">
                    <ul className="space-y-3">
                      {currentChapter.content.key_takeaways.map((takeaway, idx) => (
                        <li key={idx} className="flex items-start">
                          <CheckCircle2 className="w-5 h-5 mr-3 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 font-medium">{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Items */}
                <div className="card mb-8">
                  <h3 className="text-2xl font-bold mb-6">Your Action Items</h3>
                  <div className="space-y-3">
                    {currentChapter.content.action_items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-100">
                        <span className="text-gray-700 font-medium">{item.task}</span>
                        <span className="text-blue-600 font-semibold text-sm">{item.timeline}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setCurrentChapterIndex(Math.max(0, currentChapterIndex - 1))}
                disabled={currentChapterIndex === 0}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Previous
              </button>
              <button
                onClick={() => setCurrentChapterIndex(Math.min(totalChapters - 1, currentChapterIndex + 1))}
                disabled={currentChapterIndex === totalChapters - 1}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
