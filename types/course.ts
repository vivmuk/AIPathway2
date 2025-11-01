export interface Course {
  id: string;
  userId?: string;
  metadata: CourseMetadata;
  analysis: RoleAnalysis;
  chapters: Chapter[];
  createdAt: Date;
  status: 'processing' | 'completed' | 'error';
  progress?: number;
}

export interface CourseMetadata {
  jobTitle: string;
  jobDescription: string;
  internalRole?: string;
  industry?: string;
  experienceLevel?: string;
  estimatedTotalTime?: number;
  createdAt: Date;
  lastModified: Date;
}

export interface RoleAnalysis {
  current_state: string;
  ai_impact: string;
  transformation_timeline: string;
  critical_skills: string[];
}

export interface Chapter {
  number: number;
  title: string;
  objectives: string[];
  topics: string[];
  estimated_time_minutes: number;
  role_relevance: string;
  content?: ChapterContent;
  latestNews?: NewsItem[];
}

export interface ChapterContent {
  opening_scenario: OpeningScenario;
  core_concepts: CoreConcept[];
  practical_exercises: Exercise[];
  key_takeaways: string[];
  action_items: ActionItem[];
  ai_concepts_to_learn?: AIConcept[];
  additional_resources?: Resource[];
}

export interface AIConcept {
  concept: string;
  description: string;
  why_important: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  tools_or_platforms?: string[];
}

export interface OpeningScenario {
  title: string;
  scenario: string;
  challenge: string;
  ai_solution: string;
}

export interface CoreConcept {
  concept: string;
  explanation: string;
  role_example: string;
  tools_mentioned?: string[];
}

export interface Exercise {
  title: string;
  instructions: string;
  expected_outcome: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface ActionItem {
  task: string;
  timeline: string;
}

export interface Resource {
  title: string;
  type: 'article' | 'video' | 'tool' | 'course' | 'documentation';
  description: string;
  url?: string;
}

export interface NewsItem {
  title: string;
  summary: string;
  source?: string;
  date: string;
  relevance?: string;
}

export interface CourseOutline {
  role_analysis: RoleAnalysis;
  chapters: Chapter[];
}

export interface CourseGenerationRequest {
  jobDescription: string;
  internalRole?: string;
  industry?: string;
  experienceLevel?: string;
}

export interface CourseGenerationStatus {
  courseId: string;
  status: 'analyzing' | 'planning' | 'generating' | 'enriching' | 'finalizing' | 'completed' | 'error';
  progress: number;
  currentChapter?: number;
  totalChapters?: number;
  error?: string;
  estimatedTimeRemaining?: number;
}
