'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowLeft, Loader2, Briefcase, FileText, Zap, Workflow } from 'lucide-react';

type PathType = 'job-description' | 'internal-role' | null;

export default function CreateCoursePage() {
  const router = useRouter();
  const [selectedPath, setSelectedPath] = useState<PathType>(null);
  const [formData, setFormData] = useState({
    jobDescription: '',
    internalRole: '',
    industry: '',
    experienceLevel: 'intermediate',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create course');
      }

      // Redirect to progress page
      router.push(`/courses/${data.courseId}/progress`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
      setIsLoading(false);
    }
  };

  const handlePaste = async (field: 'jobDescription' | 'internalRole') => {
    try {
      const text = await navigator.clipboard.readText();
      setFormData(prev => ({ ...prev, [field]: text }));
    } catch (err) {
      console.error('Failed to read clipboard');
    }
  };

  const isFormValid = () => {
    if (selectedPath === 'job-description') {
      return formData.jobDescription.trim().length >= 20;
    } else if (selectedPath === 'internal-role') {
      return formData.internalRole.trim().length >= 20;
    }
    return false;
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-slate-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-slate-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Back to Home</span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">AI Pathway 2</span>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12 fade-in-up">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                <span className="text-gradient">Create Your AI Learning Path</span>
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Choose how you'd like to create your personalized AI course
              </p>
            </div>

            {/* Path Selection */}
            {!selectedPath && (
              <div className="grid md:grid-cols-2 gap-6 mb-12">
                <button
                  onClick={() => setSelectedPath('job-description')}
                  className="card group hover:shadow-xl transition-all duration-300 text-left p-8"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Briefcase className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Job Description</h3>
                  <p className="text-slate-600 mb-4">
                    Start with a job description and learn how to apply AI to meet those requirements. Perfect for career advancement and skill development.
                  </p>
                  <div className="flex items-center text-slate-700 font-semibold">
                    <span>Get Started</span>
                    <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                  </div>
                </button>

                <button
                  onClick={() => setSelectedPath('internal-role')}
                  className="card group hover:shadow-xl transition-all duration-300 text-left p-8"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Workflow className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Internal Role / Workflow</h3>
                  <p className="text-slate-600 mb-4">
                    Define your internal role or workflow and discover how AI can enhance your specific processes and responsibilities.
                  </p>
                  <div className="flex items-center text-slate-700 font-semibold">
                    <span>Get Started</span>
                    <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                  </div>
                </button>
              </div>
            )}

            {/* Form */}
            {selectedPath && (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Back Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPath(null);
                    setFormData({
                      jobDescription: '',
                      internalRole: '',
                      industry: '',
                      experienceLevel: 'intermediate',
                    });
                    setError('');
                  }}
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-semibold">Choose Different Path</span>
                </button>

                <div className="card">
                  {/* Job Description Path */}
                  {selectedPath === 'job-description' && (
                    <div className="mb-8">
                      <label className="flex items-center text-lg font-semibold mb-4">
                        <Briefcase className="w-5 h-5 mr-2 text-slate-700" />
                        Job Description *
                      </label>
                      <div className="relative">
                        <textarea
                          value={formData.jobDescription}
                          onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                          placeholder="Paste or type the job description here... Include responsibilities, requirements, and key skills. The more detail, the better your course will be!"
                          rows={10}
                          className="textarea-field"
                          required
                          minLength={20}
                        />
                        <button
                          type="button"
                          onClick={() => handlePaste('jobDescription')}
                          className="absolute top-4 right-4 px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                        >
                          Paste from Clipboard
                        </button>
                      </div>
                      <p className="text-sm text-slate-500 mt-2">
                        Minimum 20 characters required
                      </p>
                    </div>
                  )}

                  {/* Internal Role Path */}
                  {selectedPath === 'internal-role' && (
                    <div className="mb-8">
                      <label className="flex items-center text-lg font-semibold mb-4">
                        <Workflow className="w-5 h-5 mr-2 text-slate-700" />
                        Internal Role / Workflow *
                      </label>
                      <div className="relative">
                        <textarea
                          value={formData.internalRole}
                          onChange={(e) => setFormData({ ...formData, internalRole: e.target.value })}
                          placeholder="Describe your internal role, workflow, processes, or responsibilities... Include how you currently work and what you want to improve with AI."
                          rows={10}
                          className="textarea-field"
                          required
                          minLength={20}
                        />
                        <button
                          type="button"
                          onClick={() => handlePaste('internalRole')}
                          className="absolute top-4 right-4 px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                        >
                          Paste from Clipboard
                        </button>
                      </div>
                      <p className="text-sm text-slate-500 mt-2">
                        Minimum 20 characters required
                      </p>
                    </div>
                  )}

                  {/* Additional Options */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-3">
                        Industry (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        placeholder="e.g., Healthcare, Finance, Tech"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-3">
                        Experience Level
                      </label>
                      <select
                        value={formData.experienceLevel}
                        onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                        className="input-field"
                      >
                        <option value="beginner">Beginner - New to AI</option>
                        <option value="intermediate">Intermediate - Some AI knowledge</option>
                        <option value="advanced">Advanced - Experienced with AI</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-red-800">
                    <p className="font-semibold mb-1">Error</p>
                    <p>{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={isLoading || !isFormValid()}
                    className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Creating Your Course...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Generate Course
                      </>
                    )}
                  </button>
                </div>

                {/* Info Cards */}
                <div className="grid md:grid-cols-3 gap-4 mt-8">
                  <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-200">
                    <div className="text-3xl font-bold text-slate-700 mb-2">10</div>
                    <div className="text-sm text-slate-600">Comprehensive Chapters</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-200">
                    <div className="text-3xl font-bold text-slate-700 mb-2">&lt;3</div>
                    <div className="text-sm text-slate-600">Minutes to Generate</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-200">
                    <div className="text-3xl font-bold text-slate-700 mb-2">100%</div>
                    <div className="text-sm text-slate-600">Role-Specific Content</div>
                  </div>
                </div>
              </form>
            )}

            {/* Example Section - Only show for job description path */}
            {selectedPath === 'job-description' && (
              <div className="mt-16 card-glass">
                <h3 className="text-2xl font-bold mb-4">Need an example?</h3>
                <p className="text-slate-600 mb-4">
                  Try this sample job description to see how it works:
                </p>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    jobDescription: `Digital Marketing Manager

We are seeking an experienced Digital Marketing Manager to lead our marketing efforts and drive business growth through strategic campaigns.

Responsibilities:
- Develop and execute comprehensive digital marketing strategies across multiple channels
- Manage social media presence and content creation
- Analyze campaign performance and optimize based on data insights
- Lead a team of marketing specialists and coordinate with external agencies
- Manage marketing budget and ROI tracking
- Stay current with digital marketing trends and emerging technologies

Requirements:
- 5+ years of digital marketing experience
- Strong analytical skills and data-driven decision making
- Experience with marketing automation tools and CRM systems
- Excellent communication and leadership abilities
- Bachelor's degree in Marketing or related field`,
                    industry: 'Technology',
                  })}
                  className="text-slate-700 hover:text-slate-900 font-semibold hover:underline"
                >
                  Use this example →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
