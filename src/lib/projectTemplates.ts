/**
 * Pre-built project templates for common project types.
 * Each template pre-fills charter, risks, roles, and milestones.
 */

export interface TemplateRisk {
  title: string;
  description: string;
  probability: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  category: string;
  owner: string;
  mitigationStrategy: string;
}

export interface TemplateStakeholder {
  name: string;
  role: string;
  power: 1 | 2 | 3 | 4 | 5;
  interest: 1 | 2 | 3 | 4 | 5;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  charter: {
    vision: string;
    objectives: string[];
    scope: string;
  };
  risks: TemplateRisk[];
  stakeholders: TemplateStakeholder[];
  suggestedMilestones: string[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'software-launch',
    name: 'Software Product Launch',
    emoji: '🚀',
    description: 'Web app, mobile app, or SaaS product development from planning to release.',
    color: 'indigo',
    charter: {
      vision: 'Deliver a high-quality software product that meets user needs and business objectives on time and within budget.',
      objectives: [
        'Define and validate product requirements with stakeholders',
        'Build and deploy an MVP within the target timeline',
        'Achieve >90% test coverage and zero critical bugs at launch',
        'Onboard beta users and incorporate feedback before GA release',
      ],
      scope: 'Requirements gathering, UX/UI design, backend & frontend development, QA testing, CI/CD pipeline setup, staging & production deployment, user documentation, and post-launch support.',
    },
    risks: [
      { title: 'Scope Creep', description: 'Scope creep from evolving requirements', probability: 4, impact: 4,category: 'Scope', owner: 'Project Manager', mitigationStrategy: 'Strict change control process; MoSCoW prioritization for features' },
      { title: 'Key Resource Loss', description: 'Key developer unavailability', probability: 3, impact: 4,category: 'Resource', owner: 'Engineering Lead', mitigationStrategy: 'Cross-train team members; maintain knowledge documentation' },
      { title: 'API Dependency', description: 'Third-party API dependency failures', probability: 3, impact: 3,category: 'Technical', owner: 'Tech Lead', mitigationStrategy: 'Implement fallback mechanisms; negotiate SLA guarantees' },
      { title: 'Late Security Gaps', description: 'Security vulnerabilities discovered late', probability: 2, impact: 5,category: 'Technical', owner: 'Security Lead', mitigationStrategy: 'Security audits at each sprint; automated SAST/DAST scanning' },
    ],
    stakeholders: [
      { name: 'Product Owner', role: 'Decision Maker', power: 5, interest: 5 },
      { name: 'Engineering Lead', role: 'Technical Lead', power: 4, interest: 5 },
      { name: 'UX Designer', role: 'Design Lead', power: 3, interest: 4 },
      { name: 'QA Lead', role: 'Quality Assurance', power: 3, interest: 4 },
    ],
    suggestedMilestones: ['Requirements Sign-off', 'Design Complete', 'MVP Ready', 'Beta Launch', 'GA Release', 'Post-Launch Review'],
  },
  {
    id: 'marketing-campaign',
    name: 'Marketing Campaign',
    emoji: '📣',
    description: 'Product launch campaign, brand awareness, or lead generation initiative.',
    color: 'pink',
    charter: {
      vision: 'Execute a multi-channel marketing campaign that drives measurable brand awareness, engagement, and lead generation.',
      objectives: [
        'Increase brand awareness by 30% within the campaign period',
        'Generate qualified leads meeting the target conversion rate',
        'Deliver all creative assets on schedule across channels',
        'Track and report campaign ROI against budget benchmarks',
      ],
      scope: 'Campaign strategy & messaging, creative asset production (copy, visual, video), digital advertising (social, search, display), email marketing, landing pages, analytics tracking, A/B testing, and performance reporting.',
    },
    risks: [
      { title: 'Approval Delays', description: 'Creative assets delayed by approval bottlenecks', probability: 4, impact: 3,category: 'Schedule', owner: 'Marketing Manager', mitigationStrategy: 'Set firm approval deadlines; escalation path for delays' },
      { title: 'Budget Overrun', description: 'Budget overrun on paid media', probability: 3, impact: 4,category: 'Cost', owner: 'Media Buyer', mitigationStrategy: 'Daily spend monitoring; automated budget caps per channel' },
      { title: 'Low Engagement', description: 'Low engagement on target audience', probability: 3, impact: 4,category: 'Performance', owner: 'Campaign Lead', mitigationStrategy: 'A/B test messaging early; pivot creative based on first-week data' },
    ],
    stakeholders: [
      { name: 'CMO', role: 'Executive Sponsor', power: 5, interest: 5 },
      { name: 'Campaign Manager', role: 'Project Lead', power: 4, interest: 5 },
      { name: 'Creative Director', role: 'Creative Lead', power: 3, interest: 4 },
      { name: 'Sales Team', role: 'Lead Receivers', power: 3, interest: 4 },
    ],
    suggestedMilestones: ['Strategy Approved', 'Creative Brief Done', 'Assets Produced', 'Campaign Launch', 'Mid-Campaign Review', 'Final Report'],
  },
  {
    id: 'event-planning',
    name: 'Event Planning',
    emoji: '🎪',
    description: 'Conference, workshop, product launch event, or corporate gathering.',
    color: 'amber',
    charter: {
      vision: 'Deliver a seamless, well-organized event that meets attendee expectations and achieves the event objectives within budget.',
      objectives: [
        'Secure venue and vendors within budget by target date',
        'Achieve target attendee registration numbers',
        'Deliver smooth day-of logistics with <5% issue rate',
        'Collect post-event feedback with >80% satisfaction score',
      ],
      scope: 'Venue selection & booking, vendor management (catering, AV, decor), attendee registration & communication, speaker coordination, agenda planning, on-site logistics, photography/videography, and post-event survey & reporting.',
    },
    risks: [
      { title: 'Venue Loss', description: 'Venue cancellation or double-booking', probability: 2, impact: 5,category: 'External', owner: 'Event Coordinator', mitigationStrategy: 'Signed contracts with cancellation clauses; backup venue identified' },
      { title: 'Low Registration', description: 'Low attendee registration', probability: 3, impact: 4,category: 'Performance', owner: 'Marketing Lead', mitigationStrategy: 'Early-bird promotions; multi-channel outreach starting 8 weeks prior' },
      { title: 'Speaker Dropout', description: 'Key speaker cancellation', probability: 3, impact: 3,category: 'Resource', owner: 'Program Manager', mitigationStrategy: 'Backup speakers on standby; recorded content as fallback' },
      { title: 'AV Failure', description: 'Day-of AV/tech failures', probability: 3, impact: 4,category: 'Technical', owner: 'AV Lead', mitigationStrategy: 'Full tech rehearsal 24h prior; spare equipment on-site' },
    ],
    stakeholders: [
      { name: 'Event Director', role: 'Executive Sponsor', power: 5, interest: 5 },
      { name: 'Event Coordinator', role: 'Project Lead', power: 4, interest: 5 },
      { name: 'Venue Manager', role: 'Venue Contact', power: 3, interest: 3 },
      { name: 'Speakers', role: 'Content Providers', power: 3, interest: 4 },
    ],
    suggestedMilestones: ['Venue Confirmed', 'Speakers Finalized', 'Registration Open', 'Agenda Published', 'Event Day', 'Post-Event Report'],
  },
  {
    id: 'infrastructure',
    name: 'IT Infrastructure / Migration',
    emoji: '🏗️',
    description: 'Cloud migration, system upgrade, data center move, or network overhaul.',
    color: 'emerald',
    charter: {
      vision: 'Successfully migrate/upgrade infrastructure with minimal downtime, improved performance, and maintained security posture.',
      objectives: [
        'Complete migration with <2 hours total downtime',
        'Achieve performance benchmarks post-migration',
        'Maintain all security and compliance requirements',
        'Train operations team on new infrastructure before cutover',
      ],
      scope: 'Infrastructure assessment, architecture design, migration planning, data migration, application testing, security hardening, performance testing, cutover execution, rollback planning, documentation, and operations training.',
    },
    risks: [
      { title: 'Data Loss', description: 'Data loss or corruption during migration', probability: 2, impact: 5,category: 'Technical', owner: 'Data Engineer', mitigationStrategy: 'Full backup before migration; checksum validation; staged migration with rollback points' },
      { title: 'Extended Downtime', description: 'Extended downtime beyond maintenance window', probability: 3, impact: 5,category: 'Schedule', owner: 'Infrastructure Lead', mitigationStrategy: 'Detailed cutover runbook; rehearsal in staging environment; pre-approved rollback procedure' },
      { title: 'Legacy Incompatibility', description: 'Incompatibility with legacy applications', probability: 3, impact: 4,category: 'Technical', owner: 'App Team Lead', mitigationStrategy: 'Compatibility testing 2 weeks before cutover; shim layers for legacy APIs' },
      { title: 'Security Gaps', description: 'Security gaps in new environment', probability: 2, impact: 5,category: 'Security', owner: 'Security Engineer', mitigationStrategy: 'Security audit pre/post migration; penetration testing; compliance scan' },
    ],
    stakeholders: [
      { name: 'CTO/IT Director', role: 'Executive Sponsor', power: 5, interest: 5 },
      { name: 'Infrastructure Lead', role: 'Technical Lead', power: 4, interest: 5 },
      { name: 'Security Team', role: 'Compliance & Security', power: 4, interest: 5 },
      { name: 'Operations Team', role: 'Day-2 Support', power: 3, interest: 4 },
    ],
    suggestedMilestones: ['Assessment Complete', 'Architecture Approved', 'Staging Migration Done', 'Security Audit Passed', 'Cutover Rehearsal', 'Production Cutover', 'Hypercare Complete'],
  },
];
