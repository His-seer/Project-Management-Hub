/**
 * Tour definitions for each page/section of the app.
 * Used with driver.js via the AppTour component.
 */

export type TourStep = {
  element?: string;
  title: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
};

export const TOUR_KEYS = {
  DASHBOARD: 'tour_dashboard_v1',
  PROJECT: 'tour_project_v1',
  LEARNING: 'tour_learning_v1',
  NEW_PROJECT: 'tour_new_project_v1',
} as const;

export type TourKey = (typeof TOUR_KEYS)[keyof typeof TOUR_KEYS];

export function hasTourSeen(key: TourKey): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(key) === 'done';
}

export function markTourSeen(key: TourKey): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, 'done');
}

export function resetAllTours(): void {
  if (typeof window === 'undefined') return;
  Object.values(TOUR_KEYS).forEach((k) => localStorage.removeItem(k));
}

// ── Dashboard tour ──────────────────────────────────────────────────
export const dashboardTourSteps: TourStep[] = [
  {
    title: '👋 Welcome to PM Hub!',
    description:
      'This quick tour will walk you through the key features. You can replay it any time from the Help button in the sidebar.',
    side: 'bottom',
  },
  {
    element: '[data-tour="sidebar"]',
    title: 'Smart Sidebar',
    description:
      'Navigate across all sections. Groups collapse so you only see what you need — PLAN, EXECUTE, MONITOR, and AUTOMATE.',
    side: 'right',
  },
  {
    element: '[data-tour="new-project-btn"]',
    title: 'Create a Project',
    description:
      'Start a new project here. You can describe it in plain English and the AI will fill in the details for you.',
    side: 'bottom',
  },
  {
    element: '[data-tour="projects-list"]',
    title: 'Your Projects',
    description:
      'All your projects live here. Click any project to open its full workspace with tasks, risks, charter, and more.',
    side: 'top',
  },
  {
    element: '[data-tour="notification-btn"]',
    title: 'Proactive Notifications',
    description:
      'The AI monitors your projects and alerts you to risks, overdue tasks, and health issues before they escalate.',
    side: 'left',
  },
  {
    element: '[data-tour="learning-link"]',
    title: 'Learning Hub',
    description:
      'Access free PM resources, watch curated videos, take AI-generated practice quizzes, and track your growth.',
    side: 'right',
  },
];

// ── Project detail tour ─────────────────────────────────────────────
export const projectTourSteps: TourStep[] = [
  {
    title: '📁 Your Project Workspace',
    description:
      'Everything for this project is organised into tabs. Let\'s take a quick look at the key areas.',
    side: 'bottom',
  },
  {
    element: '[data-tour="project-tabs"]',
    title: 'Project Tabs',
    description:
      'Switch between Charter, Tasks, Risks, Stakeholders, Budget, Reports and more — all in one place.',
    side: 'bottom',
  },
  {
    element: '[data-tour="ai-generate-btn"]',
    title: 'AI Assist Buttons',
    description:
      'Every section has an AI button. Click it to auto-generate content — charter vision, risk assessments, stakeholder strategies, and more.',
    side: 'bottom',
  },
  {
    element: '[data-tour="chat-toggle"]',
    title: 'AI Co-Pilot Chat',
    description:
      'Your AI project assistant lives here. Ask it anything — it knows your project data and can add risks, issues, and tasks on your behalf.',
    side: 'left',
  },
  {
    element: '[data-tour="workflow-link"]',
    title: 'Workflow Builder',
    description:
      'Visualise your project workflows with a drag-and-drop canvas — like n8n but built for project management.',
    side: 'right',
  },
];

// ── Learning Hub tour ───────────────────────────────────────────────
export const learningTourSteps: TourStep[] = [
  {
    title: '🎓 Welcome to the Learning Hub',
    description:
      'Level up your PM skills with curated resources, videos, and AI-powered quizzes — all free.',
    side: 'bottom',
  },
  {
    element: '[data-tour="learning-paths"]',
    title: 'Learning Paths',
    description:
      'Structured paths for PMP, CAPM, Agile, and more. Each path links to the best free resources for that certification.',
    side: 'right',
  },
  {
    element: '[data-tour="video-search"]',
    title: 'Video Learning',
    description:
      'Search YouTube for any PM topic and watch videos directly here — no need to leave the platform.',
    side: 'bottom',
  },
  {
    element: '[data-tour="quiz-link"]',
    title: 'Practice Quizzes',
    description:
      'Test yourself with AI-generated quizzes. Choose your topic, difficulty, and number of questions — the AI creates unique questions every time.',
    side: 'bottom',
  },
  {
    element: '[data-tour="ai-recommendations"]',
    title: 'AI Recommendations',
    description:
      'Based on your quiz results, the AI suggests what to study next — personalised to your weak areas.',
    side: 'top',
  },
];

// ── New project tour ────────────────────────────────────────────────
export const newProjectTourSteps: TourStep[] = [
  {
    title: '✨ AI-Powered Project Setup',
    description:
      'Creating a project is fast and smart. Let the AI do the heavy lifting from just a short description.',
    side: 'bottom',
  },
  {
    element: '[data-tour="ai-quickstart"]',
    title: 'AI Quick Start',
    description:
      'Describe your project in a sentence or two — or upload a brief — and the AI fills in all the fields: dates, objectives, scope, team roles, and risks.',
    side: 'bottom',
  },
  {
    element: '[data-tour="wizard-steps"]',
    title: 'Step-by-Step Wizard',
    description:
      'The wizard guides you through each section. Each step also has its own AI assist button if you want to generate just that part.',
    side: 'right',
  },
];
