'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Brain, BookOpen, TrendingUp, Clock, Zap } from 'lucide-react';

interface GenerationStatus {
  courseId: string;
  status: 'analyzing' | 'planning' | 'generating' | 'enriching' | 'finalizing' | 'completed' | 'error';
  progress: number;
  currentChapter?: number;
  totalChapters?: number;
  error?: string;
  estimatedTimeRemaining?: number;
}

export default function ProgressPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [status, setStatus] = useState<GenerationStatus | null>(null);
  const [error, setError] = useState('');
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    // Update elapsed time every second
    const timeInterval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timeInterval);
  }, [startTime]);

  useEffect(() => {
    if (!courseId) return;

    // Poll for status updates
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/status`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch status');
        }

        setStatus(data.status);

        // If completed, redirect to course viewer
        if (data.status.status === 'completed') {
          setTimeout(() => {
            router.push(`/courses/${courseId}`);
          }, 2000);
        }

        // If error, stop polling
        if (data.status.status === 'error') {
          setError(data.status.error || 'An error occurred');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      }
    };

    // Initial fetch
    pollStatus();

    // Poll every 2 seconds
    const interval = setInterval(pollStatus, 2000);

    return () => clearInterval(interval);
  }, [courseId, router]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusInfo = () => {
    if (!status) {
      return {
        title: 'Initializing...',
        description: 'Setting up your course generation',
        detailedSteps: ['Preparing AI models', 'Initializing course structure'],
        icon: Loader2,
        color: 'slate',
      };
    }

    switch (status.status) {
      case 'analyzing':
        return {
          title: 'Step 1: Analyzing Your Role',
          description: 'Venice Large (Qwen3-235B) is deeply analyzing the job requirements and determining how AI will transform this role',
          detailedSteps: [
            'Processing job description and requirements',
            'Analyzing role responsibilities and tasks',
            'Identifying AI impact areas',
            'Determining critical AI skills needed',
            'Creating role transformation timeline',
          ],
          icon: Brain,
          color: 'slate',
        };
      case 'planning':
        return {
          title: 'Step 2: Planning Your Curriculum',
          description: 'Creating a personalized 5-chapter learning path structured for optimal learning progression',
          detailedSteps: [
            'Designing chapter structure',
            'Sequencing learning objectives',
            'Mapping topics to role requirements',
            'Estimating learning time per chapter',
            'Finalizing course outline',
          ],
          icon: Sparkles,
          color: 'indigo',
        };
      case 'generating':
        return {
          title: `Step 3: Generating Chapter ${status.currentChapter || 1} of ${status.totalChapters || 5}`,
          description: 'GLM 4.6 is creating comprehensive, engaging content with practical exercises and real-world examples',
          detailedSteps: [
            `Writing chapter ${status.currentChapter || 1} content`,
            'Creating opening scenarios',
            'Explaining core concepts with role examples',
            'Designing practical exercises',
            'Compiling key takeaways and action items',
          ],
          icon: BookOpen,
          color: 'indigo',
        };
      case 'enriching':
        return {
          title: `Step 4: Enriching Chapter ${status.currentChapter || 1} with Latest Updates`,
          description: 'Mistral Medium is searching the web for the latest industry developments, tools, and best practices',
          detailedSteps: [
            `Searching for updates related to chapter ${status.currentChapter || 1}`,
            'Finding latest tool releases',
            'Gathering industry best practices',
            'Identifying recent case studies',
            'Compiling relevant news and citations',
          ],
          icon: TrendingUp,
          color: 'indigo',
        };
      case 'finalizing':
        return {
          title: 'Step 5: Finalizing Your Course',
          description: 'Putting the finishing touches on your personalized learning path',
          detailedSteps: [
            'Calculating total course time',
            'Verifying all content is complete',
            'Ensuring quality and consistency',
            'Preparing course for viewing',
            'Final quality check',
          ],
          icon: Sparkles,
          color: 'emerald',
        };
      case 'completed':
        return {
          title: 'Course Ready!',
          description: 'Your personalized AI learning path is complete and ready to explore',
          detailedSteps: [],
          icon: CheckCircle2,
          color: 'emerald',
        };
      case 'error':
        return {
          title: 'Error Occurred',
          description: status.error || 'An error occurred during generation',
          detailedSteps: [],
          icon: AlertCircle,
          color: 'red',
        };
      default:
        return {
          title: 'Processing...',
          description: 'Working on your course',
          detailedSteps: [],
          icon: Loader2,
          color: 'slate',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const progress = status?.progress || 0;

  const getStepStatus = (stepKey: string) => {
    if (!status) return 'pending';
    const steps = ['analyzing', 'planning', 'generating', 'enriching', 'finalizing'];
    const currentIndex = steps.indexOf(status.status);
    const stepIndex = steps.indexOf(stepKey);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-slate-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-slate-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl w-full">
          {/* Main Card */}
          <div className="card">
            {/* Header with Icon */}
            <div className="flex justify-center mb-8">
              <div className={`w-24 h-24 bg-gradient-to-br from-${statusInfo.color}-700 to-${statusInfo.color}-800 rounded-xl flex items-center justify-center shadow-lg`}>
                <StatusIcon className={`w-12 h-12 text-white ${status?.status === 'error' || status?.status === 'completed' ? '' : 'animate-pulse'}`} />
              </div>
            </div>

            {/* Status Title */}
            <h1 className="text-4xl font-bold mb-4 text-center">
              <span className="text-gradient">{statusInfo.title}</span>
            </h1>

            {/* Status Description */}
            <p className="text-xl text-slate-600 mb-8 text-center">
              {statusInfo.description}
            </p>

            {/* Time Information */}
            <div className="flex items-center justify-center gap-6 mb-8 text-sm text-slate-600">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Elapsed: {formatTime(elapsedTime)}</span>
              </div>
              {status?.estimatedTimeRemaining && status.estimatedTimeRemaining > 0 && (
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Est. remaining: ~{status.estimatedTimeRemaining} min</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {status?.status !== 'error' && (
              <div className="mb-8">
                <div className="relative h-6 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-slate-700 to-slate-800 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm font-semibold text-slate-700">
                    {progress}% Complete
                  </span>
                  <span className="text-sm text-slate-500">
                    This may take up to 10 minutes
                  </span>
                </div>
              </div>
            )}

            {/* Detailed Steps */}
            {statusInfo.detailedSteps.length > 0 && (
              <div className="mb-8 bg-slate-50 rounded-lg p-6 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Current Process:</h3>
                <ul className="space-y-2">
                  {statusInfo.detailedSteps.map((step, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        index < statusInfo.detailedSteps.length - 1 
                          ? 'bg-slate-600 text-white' 
                          : 'bg-slate-300 text-slate-600 animate-pulse'
                      }`}>
                        {index < statusInfo.detailedSteps.length - 1 ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                      </div>
                      <span className={`text-sm ${
                        index < statusInfo.detailedSteps.length - 1 
                          ? 'text-slate-600' 
                          : 'text-slate-800 font-medium'
                      }`}>
                        {step}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8 text-left">
                <p className="font-semibold text-red-800 mb-2">Error Details</p>
                <p className="text-red-700">{error}</p>
                <button
                  onClick={() => router.push('/create')}
                  className="mt-4 text-red-600 hover:text-red-700 font-semibold hover:underline"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Progress Steps Overview */}
            {status && status.status !== 'error' && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide text-center">Generation Pipeline</h3>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: 'analyzing', label: 'Analyze', icon: Brain },
                    { key: 'planning', label: 'Plan', icon: Sparkles },
                    { key: 'generating', label: 'Generate', icon: BookOpen },
                    { key: 'enriching', label: 'Enrich', icon: TrendingUp },
                    { key: 'finalizing', label: 'Finalize', icon: CheckCircle2 },
                  ].map((step, index) => {
                    const StepIcon = step.icon;
                    const stepStatus = getStepStatus(step.key);
                    const isCompleted = stepStatus === 'completed';
                    const isActive = stepStatus === 'active';

                    return (
                      <div
                        key={step.key}
                        className={`p-4 rounded-lg transition-all duration-300 border-2 ${
                          isActive
                            ? 'bg-slate-100 border-slate-600 shadow-md'
                            : isCompleted
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <StepIcon
                          className={`w-6 h-6 mx-auto mb-2 ${
                            isActive
                              ? 'text-slate-700 animate-pulse'
                              : isCompleted
                              ? 'text-emerald-600'
                              : 'text-slate-400'
                          }`}
                        />
                        <div className={`text-xs font-semibold text-center ${
                          isActive || isCompleted ? 'text-slate-900' : 'text-slate-500'
                        }`}>
                          {step.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completion Message */}
            {status?.status === 'completed' && (
              <div className="mt-8 p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border-2 border-emerald-200">
                <p className="text-emerald-800 font-semibold mb-2 text-center">
                  🎉 Success! Your course is ready!
                </p>
                <p className="text-emerald-700 text-sm text-center">
                  Redirecting to your personalized learning path...
                </p>
              </div>
            )}
          </div>

          {/* Info Card */}
          {status && status.status !== 'error' && status.status !== 'completed' && (
            <div className="card-glass mt-6 text-center">
              <p className="text-sm font-semibold text-slate-700 mb-2">⏱ Please be patient</p>
              <p className="text-slate-600 text-sm">
                Course generation can take up to 10 minutes. Our AI is creating comprehensive, 
                personalized content tailored specifically to your role. The more detailed your input, 
                the better the result!
              </p>
            </div>
          )}
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

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
