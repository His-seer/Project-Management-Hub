/**
 * Curated free PM learning resources — PMP, CAPM, Agile, and general PM growth.
 */

export type ResourceCategory =
  | 'pmp-prep'
  | 'capm-prep'
  | 'agile-scrum'
  | 'pm-fundamentals'
  | 'tools-templates'
  | 'leadership'
  | 'youtube'
  | 'communities';

export interface LearningResource {
  id: string;
  title: string;
  description: string;
  url: string;
  category: ResourceCategory;
  provider: string;
  type: 'course' | 'article' | 'video' | 'book' | 'tool' | 'community' | 'practice-exam' | 'guide';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isFree: boolean;
  tags: string[];
  /** YouTube video ID for embedding (e.g., 'GC7pN8Mjot8') */
  youtubeId?: string;
  /** Duration in minutes for videos */
  durationMinutes?: number;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  icon: string;
  steps: LearningPathStep[];
}

export interface LearningPathStep {
  title: string;
  description: string;
  resourceIds: string[];
  estimatedHours: number;
}

export const CATEGORIES: { id: ResourceCategory; label: string; icon: string; description: string }[] = [
  { id: 'pmp-prep', label: 'PMP Certification', icon: '🏆', description: 'Free resources to prepare for the PMP exam' },
  { id: 'capm-prep', label: 'CAPM Certification', icon: '🎯', description: 'Entry-level PM certification preparation' },
  { id: 'agile-scrum', label: 'Agile & Scrum', icon: '🔄', description: 'Agile methodologies, Scrum, Kanban, SAFe' },
  { id: 'pm-fundamentals', label: 'PM Fundamentals', icon: '📚', description: 'Core project management concepts and frameworks' },
  { id: 'tools-templates', label: 'Tools & Templates', icon: '🛠️', description: 'Free templates, checklists, and planning tools' },
  { id: 'leadership', label: 'Leadership & Soft Skills', icon: '💡', description: 'Communication, stakeholder management, team leadership' },
  { id: 'youtube', label: 'Video Learning', icon: '🎥', description: 'Free YouTube channels and video courses' },
  { id: 'communities', label: 'Communities', icon: '🌐', description: 'Forums, groups, and networks for PMs' },
];

export const RESOURCES: LearningResource[] = [
  // ── PMP Prep ──
  {
    id: 'pmi-pmp-overview',
    title: 'PMI PMP Certification Overview',
    description: 'Official PMI page with exam content outline, eligibility requirements, and application process.',
    url: 'https://www.pmi.org/certifications/project-management-pmp',
    category: 'pmp-prep',
    provider: 'PMI',
    type: 'guide',
    difficulty: 'advanced',
    isFree: true,
    tags: ['pmp', 'certification', 'official'],
  },
  {
    id: 'pmp-prepcast-free',
    title: 'PM PrepCast Free PMP Practice Exam',
    description: '120 free PMP practice questions with detailed explanations for each answer.',
    url: 'https://www.project-management-prepcast.com/free/pmp-exam/free-pmp-exam-questions',
    category: 'pmp-prep',
    provider: 'PM PrepCast',
    type: 'practice-exam',
    difficulty: 'advanced',
    isFree: true,
    tags: ['pmp', 'practice-exam', 'questions'],
  },
  {
    id: 'pmbok-guide-summary',
    title: 'PMBOK Guide Summary & Key Concepts',
    description: 'Comprehensive summary of the PMBOK Guide 7th Edition process groups, knowledge areas, and key terms.',
    url: 'https://www.projectmanagement.com/contentPages/wiki.cfm?ID=368897&thisPageURL=/wikis/368897/PMBOK-Guide-7th-Edition',
    category: 'pmp-prep',
    provider: 'ProjectManagement.com',
    type: 'guide',
    difficulty: 'intermediate',
    isFree: true,
    tags: ['pmbok', 'guide', 'knowledge-areas'],
  },
  {
    id: 'ricardo-vargas-pmbok',
    title: 'Ricardo Vargas PMBOK Flow (Video)',
    description: 'Famous visual walkthrough of all PMBOK processes and how they connect — essential for PMP prep.',
    url: 'https://www.youtube.com/watch?v=GC7pN8Mjot8',
    category: 'pmp-prep',
    provider: 'Ricardo Vargas',
    type: 'video',
    difficulty: 'intermediate',
    isFree: true,
    tags: ['pmbok', 'processes', 'visual'],
    youtubeId: 'GC7pN8Mjot8',
    durationMinutes: 25,
  },
  {
    id: 'pmp-exam-tips-edward',
    title: 'Edward PMP Exam Tips (YouTube)',
    description: 'Practical PMP exam strategies, study plans, and concept breakdowns from a PMP-certified instructor.',
    url: 'https://www.youtube.com/@EdwardChannel',
    category: 'pmp-prep',
    provider: 'Edward Channel',
    type: 'video',
    difficulty: 'advanced',
    isFree: true,
    tags: ['pmp', 'exam-tips', 'youtube'],
    youtubeId: 'rRsnS2OYMJI',
    durationMinutes: 45,
  },

  // ── CAPM Prep ──
  {
    id: 'pmi-capm-overview',
    title: 'PMI CAPM Certification Overview',
    description: 'Official CAPM certification page with requirements, exam details, and study resources.',
    url: 'https://www.pmi.org/certifications/certified-associate-capm',
    category: 'capm-prep',
    provider: 'PMI',
    type: 'guide',
    difficulty: 'beginner',
    isFree: true,
    tags: ['capm', 'certification', 'official'],
  },
  {
    id: 'capm-practice-questions',
    title: 'Free CAPM Practice Questions',
    description: 'Collection of free CAPM practice questions organized by knowledge area.',
    url: 'https://www.project-management-prepcast.com/free/capm-exam/free-capm-exam-questions',
    category: 'capm-prep',
    provider: 'PM PrepCast',
    type: 'practice-exam',
    difficulty: 'beginner',
    isFree: true,
    tags: ['capm', 'practice-exam', 'questions'],
  },

  // ── Agile & Scrum ──
  {
    id: 'scrum-guide',
    title: 'The Scrum Guide (Official)',
    description: 'The definitive guide to Scrum by Ken Schwaber and Jeff Sutherland. Essential reading for any PM.',
    url: 'https://scrumguides.org/',
    category: 'agile-scrum',
    provider: 'Scrum.org',
    type: 'guide',
    difficulty: 'beginner',
    isFree: true,
    tags: ['scrum', 'agile', 'official', 'framework'],
  },
  {
    id: 'scrum-org-learning',
    title: 'Scrum.org Open Assessments',
    description: 'Free practice assessments for PSM I, PSPO I, and other Scrum.org certifications.',
    url: 'https://www.scrum.org/open-assessments',
    category: 'agile-scrum',
    provider: 'Scrum.org',
    type: 'practice-exam',
    difficulty: 'intermediate',
    isFree: true,
    tags: ['scrum', 'assessment', 'psm', 'pspo'],
  },
  {
    id: 'agile-manifesto',
    title: 'Agile Manifesto & Principles',
    description: 'The original Agile Manifesto and 12 principles — the foundation of all agile frameworks.',
    url: 'https://agilemanifesto.org/',
    category: 'agile-scrum',
    provider: 'Agile Alliance',
    type: 'guide',
    difficulty: 'beginner',
    isFree: true,
    tags: ['agile', 'manifesto', 'principles'],
  },
  {
    id: 'kanban-guide',
    title: 'Kanban Guide for Beginners',
    description: 'Introduction to Kanban methodology, WIP limits, and flow-based project management.',
    url: 'https://www.atlassian.com/agile/kanban',
    category: 'agile-scrum',
    provider: 'Atlassian',
    type: 'guide',
    difficulty: 'beginner',
    isFree: true,
    tags: ['kanban', 'agile', 'flow'],
  },

  // ── PM Fundamentals ──
  {
    id: 'google-pm-cert',
    title: 'Google Project Management Certificate',
    description: 'Comprehensive 6-course program covering PM fundamentals, Agile, and real-world projects. Free to audit on Coursera.',
    url: 'https://www.coursera.org/professional-certificates/google-project-management',
    category: 'pm-fundamentals',
    provider: 'Google / Coursera',
    type: 'course',
    difficulty: 'beginner',
    isFree: true,
    tags: ['google', 'coursera', 'comprehensive', 'beginner-friendly'],
  },
  {
    id: 'pm-101-uva',
    title: 'UVA Foundations of Project Management',
    description: 'University of Virginia free course covering project lifecycle, scheduling, budgeting, and risk management.',
    url: 'https://www.coursera.org/learn/uva-darden-project-management',
    category: 'pm-fundamentals',
    provider: 'University of Virginia / Coursera',
    type: 'course',
    difficulty: 'beginner',
    isFree: true,
    tags: ['university', 'fundamentals', 'lifecycle'],
  },
  {
    id: 'wrike-pm-guide',
    title: 'The Complete Project Management Guide',
    description: 'Detailed guide covering PM methodologies, tools, processes, and best practices.',
    url: 'https://www.wrike.com/project-management-guide/',
    category: 'pm-fundamentals',
    provider: 'Wrike',
    type: 'guide',
    difficulty: 'beginner',
    isFree: true,
    tags: ['guide', 'comprehensive', 'methodologies'],
  },

  // ── Tools & Templates ──
  {
    id: 'pm-templates-vertex',
    title: 'Free PM Templates Library',
    description: '100+ free project management templates: charters, WBS, RACI, risk registers, status reports, and more.',
    url: 'https://www.vertex42.com/ExcelTemplates/project-management-templates.html',
    category: 'tools-templates',
    provider: 'Vertex42',
    type: 'tool',
    difficulty: 'beginner',
    isFree: true,
    tags: ['templates', 'excel', 'charter', 'wbs', 'raci'],
  },
  {
    id: 'pmi-templates',
    title: 'PMI Practice Guides & Templates',
    description: 'Free practice guides and templates from PMI covering scheduling, risk, earned value, and more.',
    url: 'https://www.projectmanagement.com/Templates/',
    category: 'tools-templates',
    provider: 'ProjectManagement.com',
    type: 'tool',
    difficulty: 'intermediate',
    isFree: true,
    tags: ['templates', 'pmi', 'practice-guides'],
  },

  // ── Leadership ──
  {
    id: 'stakeholder-management-guide',
    title: 'Stakeholder Management Best Practices',
    description: 'Guide to stakeholder identification, analysis, engagement strategies, and communication planning.',
    url: 'https://www.pmi.org/learning/library/stakeholder-management-task-project-success-7736',
    category: 'leadership',
    provider: 'PMI',
    type: 'article',
    difficulty: 'intermediate',
    isFree: true,
    tags: ['stakeholders', 'communication', 'engagement'],
  },
  {
    id: 'conflict-resolution-pm',
    title: 'Conflict Resolution for Project Managers',
    description: 'Practical techniques for managing team conflicts, negotiating with stakeholders, and building consensus.',
    url: 'https://www.pmi.org/learning/library/conflict-resolution-techniques-project-managers-702',
    category: 'leadership',
    provider: 'PMI',
    type: 'article',
    difficulty: 'intermediate',
    isFree: true,
    tags: ['conflict', 'leadership', 'team-management'],
  },

  // ── YouTube Channels ──
  {
    id: 'yt-ricardo-vargas',
    title: 'Ricardo Vargas (YouTube)',
    description: 'World-renowned PM expert. Videos on PMBOK, project leadership, and PM career advice.',
    url: 'https://www.youtube.com/@RicardoVargasEN',
    category: 'youtube',
    provider: 'YouTube',
    type: 'video',
    difficulty: 'intermediate',
    isFree: true,
    tags: ['youtube', 'pmbok', 'leadership'],
  },
  {
    id: 'yt-project-management-videos',
    title: 'Project Management Videos (YouTube)',
    description: 'Short, focused videos on PM concepts, tools, and exam prep. Great for visual learners.',
    url: 'https://www.youtube.com/@projectmanagementvideos',
    category: 'youtube',
    provider: 'YouTube',
    type: 'video',
    difficulty: 'beginner',
    isFree: true,
    tags: ['youtube', 'short-videos', 'concepts'],
  },
  {
    id: 'yt-mike-clayton',
    title: 'OnlinePMCourses — Mike Clayton (YouTube)',
    description: 'Comprehensive PM training videos covering methodologies, tools, and professional development.',
    url: 'https://www.youtube.com/@OnlinePMCourses',
    category: 'youtube',
    provider: 'YouTube',
    type: 'video',
    difficulty: 'beginner',
    isFree: true,
    tags: ['youtube', 'training', 'methodologies'],
  },

  // ── Communities ──
  {
    id: 'reddit-pm',
    title: 'r/projectmanagement (Reddit)',
    description: 'Active Reddit community for PMs to share advice, ask questions, and discuss certifications.',
    url: 'https://www.reddit.com/r/projectmanagement/',
    category: 'communities',
    provider: 'Reddit',
    type: 'community',
    difficulty: 'beginner',
    isFree: true,
    tags: ['reddit', 'community', 'discussion'],
  },
  {
    id: 'pmi-community',
    title: 'PMI Community of Practice',
    description: 'PMI member forums and communities organized by industry, methodology, and region.',
    url: 'https://www.projectmanagement.com/community/',
    category: 'communities',
    provider: 'PMI',
    type: 'community',
    difficulty: 'beginner',
    isFree: true,
    tags: ['pmi', 'community', 'networking'],
  },
  {
    id: 'pm-linkedin-groups',
    title: 'LinkedIn PM Groups',
    description: 'Professional PM groups on LinkedIn: PM Hive, PMBOK, Agile PM, and certification study groups.',
    url: 'https://www.linkedin.com/groups/35313/',
    category: 'communities',
    provider: 'LinkedIn',
    type: 'community',
    difficulty: 'beginner',
    isFree: true,
    tags: ['linkedin', 'networking', 'professional'],
  },
];

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'beginner-pm',
    title: 'New to Project Management',
    description: 'Start from zero and build solid PM foundations in 4 weeks.',
    icon: '🌱',
    steps: [
      {
        title: 'Understand the Basics',
        description: 'Learn what project management is, the lifecycle, and key terminology.',
        resourceIds: ['google-pm-cert', 'wrike-pm-guide'],
        estimatedHours: 10,
      },
      {
        title: 'Learn a Framework',
        description: 'Understand Agile, Scrum, and traditional (Waterfall) approaches.',
        resourceIds: ['scrum-guide', 'agile-manifesto', 'kanban-guide'],
        estimatedHours: 5,
      },
      {
        title: 'Get Hands-On',
        description: 'Use templates to practice creating project artifacts.',
        resourceIds: ['pm-templates-vertex'],
        estimatedHours: 5,
      },
      {
        title: 'Join the Community',
        description: 'Connect with other PMs, ask questions, and learn from experience.',
        resourceIds: ['reddit-pm', 'pmi-community'],
        estimatedHours: 2,
      },
    ],
  },
  {
    id: 'capm-path',
    title: 'CAPM Certification Path',
    description: 'Prepare for and pass the CAPM exam. Great first certification.',
    icon: '🎯',
    steps: [
      {
        title: 'Meet the Requirements',
        description: 'Complete 23 hours of PM education. The Google PM Certificate qualifies.',
        resourceIds: ['google-pm-cert', 'pmi-capm-overview'],
        estimatedHours: 23,
      },
      {
        title: 'Study PMBOK Concepts',
        description: 'Understand the PMBOK Guide knowledge areas and process groups.',
        resourceIds: ['pmbok-guide-summary', 'ricardo-vargas-pmbok'],
        estimatedHours: 20,
      },
      {
        title: 'Practice Exams',
        description: 'Take practice exams to identify weak areas and build exam confidence.',
        resourceIds: ['capm-practice-questions'],
        estimatedHours: 10,
      },
    ],
  },
  {
    id: 'pmp-path',
    title: 'PMP Certification Path',
    description: 'The gold standard PM certification. Requires experience + 35 hours education.',
    icon: '🏆',
    steps: [
      {
        title: 'Verify Eligibility',
        description: 'Ensure you meet PMP prerequisites: 36 months leading projects + 35 hours PM education.',
        resourceIds: ['pmi-pmp-overview'],
        estimatedHours: 1,
      },
      {
        title: 'Master PMBOK & Agile',
        description: 'Study PMBOK processes, Agile Practice Guide, and predictive/hybrid approaches.',
        resourceIds: ['pmbok-guide-summary', 'ricardo-vargas-pmbok', 'scrum-guide'],
        estimatedHours: 40,
      },
      {
        title: 'Watch Expert Content',
        description: 'Learn from PMP-certified instructors and exam strategy experts.',
        resourceIds: ['pmp-exam-tips-edward', 'yt-ricardo-vargas'],
        estimatedHours: 15,
      },
      {
        title: 'Practice, Practice, Practice',
        description: 'Take full-length practice exams. Aim for 80%+ consistently before scheduling.',
        resourceIds: ['pmp-prepcast-free'],
        estimatedHours: 20,
      },
    ],
  },
];
