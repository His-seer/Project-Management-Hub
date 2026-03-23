/**
 * PM Quiz Bank — questions for PMP, CAPM, Agile, and PM fundamentals.
 * Questions are tagged by topic, difficulty, and certification so users
 * can configure dynamic quizzes based on their preferences.
 */

export type QuizTopic =
  | 'integration'
  | 'scope'
  | 'schedule'
  | 'cost'
  | 'quality'
  | 'resource'
  | 'communications'
  | 'risk'
  | 'procurement'
  | 'stakeholder'
  | 'agile'
  | 'leadership'
  | 'fundamentals';

export type QuizCert = 'pmp' | 'capm' | 'agile' | 'general';
export type QuizDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: QuizTopic;
  certification: QuizCert;
  difficulty: QuizDifficulty;
}

export interface QuizPreferences {
  topics: QuizTopic[];
  certifications: QuizCert[];
  difficulty: QuizDifficulty[];
  questionCount: number;
  timePerQuestion: number; // seconds
}

export interface QuizAttempt {
  id: string;
  preferences: QuizPreferences;
  questionIds: string[];
  answers: (number | null)[];
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeSpentSeconds: number;
}

export const QUIZ_TOPICS: { id: QuizTopic; label: string; icon: string }[] = [
  { id: 'integration', label: 'Integration Management', icon: '🔗' },
  { id: 'scope', label: 'Scope Management', icon: '📏' },
  { id: 'schedule', label: 'Schedule Management', icon: '📅' },
  { id: 'cost', label: 'Cost Management', icon: '💰' },
  { id: 'quality', label: 'Quality Management', icon: '✅' },
  { id: 'resource', label: 'Resource Management', icon: '👥' },
  { id: 'communications', label: 'Communications Management', icon: '📣' },
  { id: 'risk', label: 'Risk Management', icon: '⚠️' },
  { id: 'procurement', label: 'Procurement Management', icon: '📦' },
  { id: 'stakeholder', label: 'Stakeholder Management', icon: '🤝' },
  { id: 'agile', label: 'Agile & Scrum', icon: '🔄' },
  { id: 'leadership', label: 'Leadership & Teams', icon: '💡' },
  { id: 'fundamentals', label: 'PM Fundamentals', icon: '📚' },
];

export const QUIZ_CERTS: { id: QuizCert; label: string }[] = [
  { id: 'pmp', label: 'PMP' },
  { id: 'capm', label: 'CAPM' },
  { id: 'agile', label: 'Agile/Scrum' },
  { id: 'general', label: 'General PM' },
];

export const DEFAULT_PREFERENCES: QuizPreferences = {
  topics: ['fundamentals', 'scope', 'schedule', 'risk'],
  certifications: ['general'],
  difficulty: ['beginner', 'intermediate'],
  questionCount: 10,
  timePerQuestion: 60,
};

// ─── Question Bank ───

export const QUESTIONS: QuizQuestion[] = [
  // ── PM Fundamentals ──
  {
    id: 'f1', question: 'What is the primary purpose of a project charter?',
    options: ['To define the project budget', 'To formally authorize the project and give the PM authority', 'To create the WBS', 'To identify all stakeholders'],
    correctIndex: 1, explanation: 'The project charter formally authorizes the existence of a project and provides the PM with authority to apply organizational resources.',
    topic: 'fundamentals', certification: 'general', difficulty: 'beginner',
  },
  {
    id: 'f2', question: 'Which process group is typically the longest in duration?',
    options: ['Initiating', 'Planning', 'Executing', 'Monitoring & Controlling'],
    correctIndex: 2, explanation: 'Executing is where the actual project work is performed, making it typically the longest phase and consuming the most resources.',
    topic: 'fundamentals', certification: 'capm', difficulty: 'beginner',
  },
  {
    id: 'f3', question: 'What is a milestone in project management?',
    options: ['A task with a long duration', 'A significant point or event with zero duration', 'A deliverable sent to the client', 'A type of project constraint'],
    correctIndex: 1, explanation: 'A milestone is a significant event with zero duration that marks an important achievement or decision point in the project.',
    topic: 'fundamentals', certification: 'general', difficulty: 'beginner',
  },
  {
    id: 'f4', question: 'What is the triple constraint in project management?',
    options: ['Time, Cost, Quality', 'Scope, Schedule, Cost', 'People, Process, Technology', 'Plan, Execute, Monitor'],
    correctIndex: 1, explanation: 'The triple constraint (also called the iron triangle) consists of Scope, Schedule, and Cost. Changes to one affect the others.',
    topic: 'fundamentals', certification: 'general', difficulty: 'beginner',
  },
  {
    id: 'f5', question: 'What is the difference between a project and operations?',
    options: ['Projects are larger than operations', 'Projects are temporary with unique deliverables; operations are ongoing and repetitive', 'Operations have bigger budgets', 'There is no difference'],
    correctIndex: 1, explanation: 'Projects are temporary endeavors with a defined beginning and end, producing unique results. Operations are ongoing, repetitive activities.',
    topic: 'fundamentals', certification: 'capm', difficulty: 'beginner',
  },

  // ── Scope Management ──
  {
    id: 's1', question: 'What is the primary purpose of a Work Breakdown Structure (WBS)?',
    options: ['To assign resources to tasks', 'To decompose project scope into manageable work packages', 'To create the project schedule', 'To track project costs'],
    correctIndex: 1, explanation: 'The WBS breaks down the total scope into smaller, manageable components (work packages), making it easier to plan, estimate, and manage.',
    topic: 'scope', certification: 'pmp', difficulty: 'intermediate',
  },
  {
    id: 's2', question: 'What is scope creep?',
    options: ['Reducing project scope to save costs', 'Uncontrolled changes or growth in project scope', 'A technique for defining requirements', 'Scope changes approved by the change control board'],
    correctIndex: 1, explanation: 'Scope creep is the uncontrolled expansion of project scope without adjustments to time, cost, and resources. It occurs when changes are not properly managed.',
    topic: 'scope', certification: 'general', difficulty: 'beginner',
  },
  {
    id: 's3', question: 'What document defines what is included AND excluded from the project?',
    options: ['Project charter', 'Project scope statement', 'WBS dictionary', 'Requirements traceability matrix'],
    correctIndex: 1, explanation: 'The project scope statement describes the project scope, major deliverables, assumptions, constraints, and explicitly states what is out of scope.',
    topic: 'scope', certification: 'pmp', difficulty: 'intermediate',
  },

  // ── Schedule Management ──
  {
    id: 'sc1', question: 'What is the critical path in a project schedule?',
    options: ['The path with the most resources', 'The longest path through the network that determines the minimum project duration', 'The path with the highest risk', 'The path the project manager focuses on'],
    correctIndex: 1, explanation: 'The critical path is the longest sequence of dependent activities. Any delay on this path directly delays the project finish date.',
    topic: 'schedule', certification: 'pmp', difficulty: 'intermediate',
  },
  {
    id: 'sc2', question: 'What is float (slack) in scheduling?',
    options: ['Extra budget for contingencies', 'The amount of time an activity can be delayed without delaying the project', 'Buffer time added to all tasks', 'Time reserved for team meetings'],
    correctIndex: 1, explanation: 'Float (or slack) is the amount of time an activity can be delayed without affecting the project end date. Critical path activities have zero float.',
    topic: 'schedule', certification: 'pmp', difficulty: 'intermediate',
  },
  {
    id: 'sc3', question: 'What is crashing in schedule management?',
    options: ['Canceling the project', 'Adding resources to compress the schedule at increased cost', 'Removing tasks from the critical path', 'Working overtime without approval'],
    correctIndex: 1, explanation: 'Crashing involves adding resources (usually at extra cost) to critical path activities to reduce the overall project duration.',
    topic: 'schedule', certification: 'pmp', difficulty: 'advanced',
  },

  // ── Cost Management ──
  {
    id: 'c1', question: 'What does EVM (Earned Value Management) measure?',
    options: ['Team productivity only', 'Project performance against scope, schedule, and cost baselines', 'Customer satisfaction', 'Resource utilization rates'],
    correctIndex: 1, explanation: 'EVM integrates scope, schedule, and cost data to assess project performance and progress in an objective manner.',
    topic: 'cost', certification: 'pmp', difficulty: 'advanced',
  },
  {
    id: 'c2', question: 'If CPI (Cost Performance Index) is 0.8, what does this mean?',
    options: ['The project is 80% complete', 'For every $1 spent, only $0.80 of value is earned (over budget)', 'The project is 20% under budget', 'The team is 80% efficient'],
    correctIndex: 1, explanation: 'CPI = EV/AC. A CPI of 0.8 means for every dollar spent, you are only getting 80 cents of planned value — the project is over budget.',
    topic: 'cost', certification: 'pmp', difficulty: 'advanced',
  },

  // ── Risk Management ──
  {
    id: 'r1', question: 'What is the difference between a risk and an issue?',
    options: ['There is no difference', 'A risk is uncertain; an issue has already occurred', 'An issue is less important than a risk', 'Risks only affect schedule; issues affect cost'],
    correctIndex: 1, explanation: 'A risk is an uncertain event that may occur. An issue is a risk that has materialized — it is currently happening and needs resolution.',
    topic: 'risk', certification: 'general', difficulty: 'beginner',
  },
  {
    id: 'r2', question: 'What are the four main risk response strategies for negative risks (threats)?',
    options: ['Accept, Reject, Defer, Cancel', 'Avoid, Transfer, Mitigate, Accept', 'Plan, Monitor, Control, Close', 'Identify, Analyze, Plan, Implement'],
    correctIndex: 1, explanation: 'The four threat response strategies are: Avoid (eliminate), Transfer (shift to third party), Mitigate (reduce probability/impact), Accept (acknowledge and prepare).',
    topic: 'risk', certification: 'pmp', difficulty: 'intermediate',
  },
  {
    id: 'r3', question: 'What is a risk owner?',
    options: ['The person who caused the risk', 'The project sponsor', 'The person responsible for monitoring and implementing risk responses', 'The stakeholder most affected by the risk'],
    correctIndex: 2, explanation: 'A risk owner is the person assigned to watch for triggers and execute the risk response plan when needed. Every identified risk should have an owner.',
    topic: 'risk', certification: 'pmp', difficulty: 'intermediate',
  },
  {
    id: 'r4', question: 'What is a risk register?',
    options: ['A financial ledger for risk costs', 'A document listing all identified risks, their analysis, and planned responses', 'A list of team members assigned to risk management', 'A register of past project failures'],
    correctIndex: 1, explanation: 'The risk register is a living document that records all identified risks, their probability, impact, severity, owners, and mitigation strategies.',
    topic: 'risk', certification: 'general', difficulty: 'beginner',
  },

  // ── Stakeholder Management ──
  {
    id: 'st1', question: 'In a power/interest grid, stakeholders with HIGH power and HIGH interest should be:',
    options: ['Monitored', 'Kept informed', 'Kept satisfied', 'Managed closely'],
    correctIndex: 3, explanation: 'High power + high interest stakeholders have the most influence and engagement. They should be managed closely with regular, proactive communication.',
    topic: 'stakeholder', certification: 'pmp', difficulty: 'intermediate',
  },
  {
    id: 'st2', question: 'Who is typically the project sponsor?',
    options: ['The project manager', 'A senior executive who provides resources and support for the project', 'The most experienced team member', 'The customer'],
    correctIndex: 1, explanation: 'The project sponsor is a senior leader who champions the project, provides funding, removes organizational barriers, and makes key decisions.',
    topic: 'stakeholder', certification: 'general', difficulty: 'beginner',
  },

  // ── Agile & Scrum ──
  {
    id: 'a1', question: 'What is the recommended size of a Scrum team?',
    options: ['3-5 people', '10 or fewer people', '15-20 people', 'No size limit'],
    correctIndex: 1, explanation: 'The Scrum Guide recommends 10 or fewer people. Smaller teams communicate better and are more productive.',
    topic: 'agile', certification: 'agile', difficulty: 'beginner',
  },
  {
    id: 'a2', question: 'What is the purpose of a Sprint Retrospective?',
    options: ['To demonstrate completed work to stakeholders', 'To plan the next sprint', 'To inspect how the sprint went and identify improvements', 'To update the product backlog'],
    correctIndex: 2, explanation: 'The Sprint Retrospective is for the team to reflect on the sprint — what went well, what could be improved, and commit to actionable improvements.',
    topic: 'agile', certification: 'agile', difficulty: 'beginner',
  },
  {
    id: 'a3', question: 'Who is responsible for maximizing the value of the product in Scrum?',
    options: ['The Scrum Master', 'The Development Team', 'The Product Owner', 'The Project Manager'],
    correctIndex: 2, explanation: 'The Product Owner is responsible for maximizing value by managing the Product Backlog — ordering items, ensuring clarity, and making priority decisions.',
    topic: 'agile', certification: 'agile', difficulty: 'beginner',
  },
  {
    id: 'a4', question: 'What is a Sprint in Scrum?',
    options: ['A meeting to discuss progress', 'A time-boxed iteration (usually 1-4 weeks) where a potentially releasable increment is created', 'A final phase of testing', 'A report sent to stakeholders'],
    correctIndex: 1, explanation: 'A Sprint is a time-boxed period (typically 2 weeks) during which the team creates a done, usable, potentially releasable product increment.',
    topic: 'agile', certification: 'agile', difficulty: 'beginner',
  },
  {
    id: 'a5', question: 'What is velocity in Agile?',
    options: ['How fast the team codes', 'The amount of work a team completes in a sprint, measured in story points', 'The project deadline', 'The speed of deployments'],
    correctIndex: 1, explanation: 'Velocity is the total story points completed per sprint. It helps with forecasting and sprint planning — but should not be used to compare teams.',
    topic: 'agile', certification: 'agile', difficulty: 'intermediate',
  },

  // ── Leadership ──
  {
    id: 'l1', question: 'What is servant leadership in the context of project management?',
    options: ['Leading by giving orders', 'A style focused on serving the team — removing obstacles, coaching, and empowering', 'Delegating all decisions to the team', 'Only leading when problems arise'],
    correctIndex: 1, explanation: 'Servant leadership focuses on the growth and well-being of the team. The leader removes impediments, coaches, facilitates, and empowers rather than directing.',
    topic: 'leadership', certification: 'pmp', difficulty: 'intermediate',
  },
  {
    id: 'l2', question: 'Which conflict resolution technique finds a solution that satisfies all parties?',
    options: ['Forcing', 'Avoiding', 'Compromising', 'Collaborating'],
    correctIndex: 3, explanation: 'Collaborating (problem-solving) seeks a win-win solution. It requires open dialogue and is the most effective long-term strategy for team conflicts.',
    topic: 'leadership', certification: 'pmp', difficulty: 'intermediate',
  },

  // ── Quality Management ──
  {
    id: 'q1', question: 'What is the difference between Quality Assurance and Quality Control?',
    options: ['They are the same thing', 'QA is preventive (process-focused); QC is detective (product-focused)', 'QA is for software; QC is for manufacturing', 'QC is done first, then QA'],
    correctIndex: 1, explanation: 'Quality Assurance focuses on the process (preventing defects). Quality Control focuses on the product (detecting defects). QA is proactive; QC is reactive.',
    topic: 'quality', certification: 'pmp', difficulty: 'intermediate',
  },

  // ── Communications ──
  {
    id: 'cm1', question: 'How many communication channels exist in a team of 10 people?',
    options: ['10', '20', '45', '90'],
    correctIndex: 2, explanation: 'Communication channels = n(n-1)/2. For 10 people: 10(9)/2 = 45 channels. This is why communication becomes harder as teams grow.',
    topic: 'communications', certification: 'pmp', difficulty: 'intermediate',
  },

  // ── Procurement ──
  {
    id: 'p1', question: 'What type of contract transfers the MOST risk to the seller?',
    options: ['Time & Materials (T&M)', 'Cost Plus Fixed Fee (CPFF)', 'Fixed Price (FFP)', 'Cost Plus Incentive Fee (CPIF)'],
    correctIndex: 2, explanation: 'Firm Fixed Price (FFP) puts the most risk on the seller — they must deliver at the agreed price regardless of actual costs.',
    topic: 'procurement', certification: 'pmp', difficulty: 'advanced',
  },

  // ── Integration Management ──
  {
    id: 'i1', question: 'What is the primary output of the Develop Project Charter process?',
    options: ['Project management plan', 'Project charter', 'Stakeholder register', 'WBS'],
    correctIndex: 1, explanation: 'The project charter is the primary output. It formally authorizes the project, names the PM, and defines high-level scope, objectives, and constraints.',
    topic: 'integration', certification: 'capm', difficulty: 'beginner',
  },
  {
    id: 'i2', question: 'What is Integrated Change Control?',
    options: ['A way to prevent all changes', 'A process to review, approve, and manage changes across the entire project', 'A tool for tracking code changes', 'A meeting held weekly'],
    correctIndex: 1, explanation: 'Integrated Change Control ensures all changes are reviewed holistically — assessing impact on scope, schedule, cost, quality, and other areas before approval.',
    topic: 'integration', certification: 'pmp', difficulty: 'intermediate',
  },

  // ── Resource Management ──
  {
    id: 're1', question: 'What is resource leveling?',
    options: ['Firing underperforming team members', 'Adjusting the schedule to resolve resource over-allocation', 'Adding more resources to the project', 'Training team members on new skills'],
    correctIndex: 1, explanation: 'Resource leveling adjusts the schedule (potentially extending it) to resolve situations where resources are over-allocated or assigned beyond capacity.',
    topic: 'resource', certification: 'pmp', difficulty: 'advanced',
  },
];

/**
 * Filter questions based on user preferences and return a randomized set.
 */
export function generateQuiz(preferences: QuizPreferences): QuizQuestion[] {
  let pool = QUESTIONS.filter((q) => {
    if (preferences.topics.length > 0 && !preferences.topics.includes(q.topic)) return false;
    if (preferences.certifications.length > 0 && !preferences.certifications.includes(q.certification)) return false;
    if (preferences.difficulty.length > 0 && !preferences.difficulty.includes(q.difficulty)) return false;
    return true;
  });

  // Shuffle
  pool = pool.sort(() => Math.random() - 0.5);

  // Return requested count
  return pool.slice(0, Math.min(preferences.questionCount, pool.length));
}
