import type { BAOutput } from '../schemas/requirement.js';
import type { PMDeliveryPlan } from '../schemas/task.js';
import type { UIUXDesignerOutput } from '../schemas/design-spec.js';
import type { ArchitectureOutput } from '../schemas/architecture.js';
import type { EngineerOutput } from '../schemas/code-artifact.js';
import type { CodeReviewOutput } from '../schemas/code-review.js';
import type { QAOutput } from '../schemas/qa-artifact.js';

export class DeterministicGenerator {
  static generateBAOutput(brief: string, hasClarifications: boolean = false): BAOutput {
    if (hasClarifications) {
      return {
        status: 'needs_clarification',
        clarifications: [
          {
            factKey: 'users.primary_roles',
            question: 'Who will primarily use this system on a daily basis?',
            whyItMatters: 'Determines permission boundaries and role-based interface views.',
            type: 'single_choice',
            options: ['Both customers and staff', 'Internal staff only', 'Customers only'],
            recommendedOption: 'Both customers and staff',
            allowCustom: true,
            impact: 'high',
            required: true,
          },
        ],
        businessObjective: `Deliver autonomous software delivery solution for: ${brief.slice(0, 80)}`,
        targetUsers: ['Store Manager', 'Staff', 'Customer'],
        requirements: [
          {
            code: 'REQ-001',
            title: 'Core Workflow and Account Management',
            type: 'Functional',
            priority: 'High',
            acceptanceCriteria: [
              'User can register, authenticate, and manage profile information.',
              'Role-based access is verified for sensitive actions.',
            ],
          },
        ],
        assumptions: ['Modern web browser environment with RESTful backend integration'],
      };
    }

    return {
      status: 'ready',
      clarifications: [],
      businessObjective: `Deliver autonomous software delivery solution for: ${brief.slice(0, 80)}`,
      targetUsers: ['Store Manager', 'Staff', 'Customer'],
      requirements: [
        {
          code: 'REQ-001',
          title: 'Core Workflow and Account Management',
          type: 'Functional',
          priority: 'High',
          acceptanceCriteria: [
            'User can register, authenticate, and manage profile information.',
            'Role-based access is verified for sensitive actions.',
          ],
        },
        {
          code: 'REQ-002',
          title: 'Primary Operational Dashboard & Scheduling',
          type: 'Functional',
          priority: 'High',
          acceptanceCriteria: [
            'Staff can view real-time status and operational dashboard.',
            'State transitions validate business constraints before persisting.',
          ],
        },
        {
          code: 'REQ-003',
          title: 'Secure Data Persistence & Input Validation',
          type: 'Security',
          priority: 'Critical',
          acceptanceCriteria: [
            'All input parameters are validated against strict type schemas.',
            'Data access queries use parameterized SQL without injection vectors.',
          ],
        },
      ],
      assumptions: ['Modern web browser environment with RESTful backend integration'],
    };
  }

  static generatePMDeliveryPlan(requiresUIUX: boolean = true): PMDeliveryPlan {
    return {
      status: 'ready',
      clarifications: [],
      deliveryStrategy: 'Agile vertical slice with automated verification gates and independent QA verification.',
      milestones: [
        {
          name: 'Milestone 1: Domain Models & Core APIs',
          description: 'Establish database schemas, domain models, and business logic endpoints.',
          targetSprint: 'Sprint 1',
        },
        {
          name: 'Milestone 2: UI Experience & Client Integration',
          description: 'Deliver responsive frontend components and automated end-to-end flows.',
          targetSprint: 'Sprint 2',
        },
      ],
      featurePriorities: [
        {
          requirementCode: 'REQ-001',
          priority: 'Critical',
          rationale: 'Core domain foundation required before downstream workflows execute.',
        },
        {
          requirementCode: 'REQ-002',
          priority: 'High',
          rationale: 'Essential operational visibility and workflow state management.',
        },
      ],
      requiresUIUX,
      riskSummary: [
        {
          risk: 'Data concurrency during peak operational load',
          mitigation: 'Implement database transactions and optimistic concurrency control.',
          impact: 'Medium',
        },
      ],
      tasks: [
        {
          code: 'TASK-001',
          title: 'Implement Core Domain Schema & Data Models',
          description: 'Create PostgreSQL tables and data contracts for core entities.',
          requirementCode: 'REQ-001',
          assignedRole: 'software_engineer',
          priority: 'Critical',
          dependencies: [],
          acceptanceIntent: 'Verify entity schema and CRUD operation integrity.',
        },
        {
          code: 'TASK-002',
          title: 'Implement Operational Workflow Endpoints & Business Logic',
          description: 'Expose REST API endpoints with schema validation and transaction safety.',
          requirementCode: 'REQ-002',
          assignedRole: 'software_engineer',
          priority: 'High',
          dependencies: ['TASK-001'],
          acceptanceIntent: 'Verify endpoint request/response contracts and business rules.',
        },
        {
          code: 'TASK-003',
          title: 'Implement Security Sanitization & Validation Layer',
          description: 'Enforce input sanitization, rate limiting, and defensive parameter handling.',
          requirementCode: 'REQ-003',
          assignedRole: 'software_engineer',
          priority: 'Critical',
          dependencies: ['TASK-001'],
          acceptanceIntent: 'Verify SQL injection and XSS defenses via deterministic test cases.',
        },
      ],
      summary: 'Comprehensive delivery plan structured into sequenced engineering tasks with clear requirement traceability.',
    };
  }

  static generateDesignerOutput(userPrompt?: string): UIUXDesignerOutput {
    const promptLower = (userPrompt || '').toLowerCase();
    const isPortfolioOrAgency =
      promptLower.includes('portfolio') ||
      promptLower.includes('ui/ux') ||
      promptLower.includes('designer') ||
      promptLower.includes('agency') ||
      promptLower.includes('services website') ||
      promptLower.includes('showcase');

    if (isPortfolioOrAgency) {
      return {
        status: 'ready',
        summary: 'World-class UI/UX Designer Portfolio and Services website design specification with high-impact case studies, service tiers, and interactive consultation intake.',
        clarifications: [],
        designSpec: {
          productExperienceSummary: 'Elevated, high-conversion designer portfolio and services studio. Features immersive project showcases, clear service deliverables, social proof, and seamless project intake.',
          uxGoals: [
            'Immediate visual impact and credibility within 3 seconds',
            'Interactive case study exploration with verifiable conversion metrics',
            'Frictionless project inquiry and consultation booking flow',
          ],
          screens: [
            {
              id: 'scr-001',
              name: 'Portfolio Hero & Work Showcase',
              purpose: 'High-impact portfolio showcase presenting core UI/UX capabilities, featured case studies, and instant consultation booking.',
              route: '/',
              primaryUser: 'Prospective Clients & Founders',
              sections: [
                'Sticky Top Navigation with Brand & CTA',
                'Hero Value Proposition with Social Proof Badges',
                'Featured Case Studies Grid with Live Metric Badges',
                'Client Results & Testimonial Carousel',
                'Interactive Consultation Booking Banner',
              ],
              primaryActions: ['Explore Case Studies', 'Schedule Free Consultation', 'View Live Prototypes'],
              wireframeElements: [
                'Interactive Project Cards with Metrics (+140% Conversion)',
                'Client Logo Wall & Trust Chips',
                'High-Contrast Hero Headline with Live Demos',
                'Quick Consultation Intake Drawer',
              ],
            },
            {
              id: 'scr-002',
              name: 'Services & Capabilities Matrix',
              purpose: 'Clear breakdown of design offerings, deliverables, turnaround sprints, and engagement models.',
              route: '/services',
              primaryUser: 'Founders & Product Teams',
              sections: [
                '3-Tier Core Offerings (Product Discovery, Design Systems, Mobile Apps)',
                'Deliverables Matrix with Turnaround Timelines',
                '4-Step Design Sprint Process (Discover, Wireframe, Prototype, Test)',
                'Transparent Scope & Retainer Calculator',
              ],
              primaryActions: ['Select Service Package', 'Request Custom Proposal', 'Download Capabilities Deck'],
              wireframeElements: [
                'Tiered Service Cards with Feature Checklists',
                'Step-by-Step Delivery Timeline',
                'Interactive Scope & Budget Estimator',
              ],
            },
            {
              id: 'scr-003',
              name: 'Case Study Deep-Dive View',
              purpose: 'Detailed presentation of design methodology, wireframes, user testing outcomes, and measurable business impact.',
              route: '/work/:slug',
              primaryUser: 'Prospective Clients',
              sections: [
                'Project Context & Client Problem Statement',
                'UX Research & User Journey Mapping',
                'Interactive Wireframe to High-Fi Comparison',
                'Design System Component Tokens',
                'Business Outcomes (+140% Conversion, $2.4M ARR Impact)',
              ],
              primaryActions: ['Launch Interactive Prototype', 'Next Case Study', 'Book Similar Project'],
              wireframeElements: [
                'Before & After Interactive View Slider',
                'Component Swatch Grid',
                'Key KPI Stat Counters',
              ],
            },
            {
              id: 'scr-004',
              name: 'Project Consultation & Booking',
              purpose: 'Frictionless project intake questionnaire and calendar booking for qualified client inquiries.',
              route: '/contact',
              primaryUser: 'Prospective Clients',
              sections: [
                'Project Scope Questionnaire',
                'Timeline & Budget Range Selector',
                'Direct Calendar Consultation Slot Picker',
                'Client Inquiry Validation Form',
              ],
              primaryActions: ['Submit Project Brief', 'Book Live Video Call', 'Direct Email Inquiry'],
              wireframeElements: [
                'Interactive Pill Selectors for Scope & Budget',
                'Calendar Slot Picker Component',
                'Real-Time Validation Form with Instant Confirmation',
              ],
            },
          ],
          navigation: {
            type: 'Topbar',
            items: [
              { label: 'Work', route: '/', iconName: 'Briefcase' },
              { label: 'Services', route: '/services', iconName: 'Layers' },
              { label: 'About & Process', route: '/about', iconName: 'User' },
              { label: 'Contact', route: '/contact', iconName: 'Mail' },
            ],
          },
          userFlows: [
            {
              name: 'Portfolio Discovery to Consultation Flow',
              steps: ['Explore Featured Case Study', 'Review Service Pricing Tiers', 'Select Budget & Timeline', 'Submit Consultation Request'],
            },
          ],
          designSystem: {
            styleDirection: 'High-End Minimalist Studio Aesthetic',
            colors: {
              primary: '#6366F1',
              secondary: '#EC4899',
              background: '#0B0F19',
              surface: '#111827',
              text: '#F9FAFB',
            },
            typography: {
              headingFont: 'Plus Jakarta Sans, sans-serif',
              bodyFont: 'Inter, sans-serif',
            },
            componentPrinciples: [
              'Generous whitespace and refined typography hierarchy',
              'Subtle glassmorphism surfaces with crisp 1px borders',
              'High-contrast interactive CTA buttons with micro-interactions',
            ],
          },
          responsiveBehavior: 'Responsive fluid desktop & tablet grid with collapsible mobile drawer menu.',
          loadingStates: ['Subtle skeleton shimmer placeholders for case study media cards'],
          emptyStates: ['Clean portfolio empty state with direct invitation to request a custom archive'],
          errorStates: ['Inline form field validation highlights with instant error hints'],
          assumptions: ['Target viewport ranges from 375px mobile to 2560px ultra-wide desktop'],
        },
      };
    }

    return {
      status: 'ready',
      summary: 'Production UI/UX design spec with responsive navigation, state handling, and interactive components.',
      clarifications: [],
      designSpec: {
        productExperienceSummary: 'Clean, intuitive operational workflow with instant feedback and accessible typography.',
        uxGoals: ['Sub-second task completion', 'Clear visual state hierarchy', 'Zero ambiguous interactions'],
        screens: [
          {
            id: 'scr-001',
            name: 'Application Dashboard',
            purpose: 'Provide daily operational overview, status metrics, and quick actions.',
            route: '/dashboard',
            primaryUser: 'Staff & Manager',
            sections: ['Header Navigation', 'Status KPI Summary', 'Active Tasks Table', 'Activity Feed'],
            primaryActions: ['Create Item', 'Update Status', 'Export Summary'],
            wireframeElements: ['KPI Card Grid', 'Filterable Data Table', 'Modal Drawer for New Entries'],
          },
          {
            id: 'scr-002',
            name: 'Details & Management View',
            purpose: 'Allow users to inspect details, configure parameters, and take actions.',
            route: '/manage',
            primaryUser: 'End User',
            sections: ['Item Overview', 'Configuration Panel', 'Activity Timeline'],
            primaryActions: ['Save Changes', 'Execute Action', 'Cancel'],
            wireframeElements: ['Form Controls', 'Timeline List', 'Action Summary Card'],
          },
        ],
        navigation: {
          type: 'Sidebar',
          items: [
            { label: 'Dashboard', route: '/dashboard', iconName: 'LayoutDashboard' },
            { label: 'Management', route: '/manage', iconName: 'Layers' },
            { label: 'Settings', route: '/settings', iconName: 'Settings' },
          ],
        },
        userFlows: [
          {
            name: 'Primary Task Execution Flow',
            steps: ['Open Dashboard', 'Select Item', 'Modify Attributes', 'Save and Confirm'],
          },
        ],
        designSystem: {
          styleDirection: 'Modern Minimalist Clean Light/Dark Theme',
          colors: {
            primary: '#3B82F6',
            secondary: '#10B981',
            background: '#0F172A',
            surface: '#1E293B',
            text: '#F8FAFC',
          },
          typography: {
            headingFont: 'Inter, sans-serif',
            bodyFont: 'Inter, sans-serif',
          },
          componentPrinciples: ['Clear focus rings', 'High contrast ratios', 'Consistent 8px grid spacing'],
        },
        responsiveBehavior: 'Fluid grid with mobile bottom navigation bar and desktop sidebar.',
        loadingStates: ['Skeleton shimmer loaders on KPI cards', 'Spinner on action buttons'],
        emptyStates: ['No items found graphic with direct action button'],
        errorStates: ['Inline banner with actionable retry button and error code details'],
        assumptions: ['Target viewport ranges from 375px mobile to 1920px desktop'],
      },
    };
  }

  static generateArchitectureOutput(): ArchitectureOutput {
    return {
      techStack: {
        language: 'TypeScript',
        framework: 'Node.js Express / React',
        testFramework: 'Vitest / Supertest',
        database: 'PostgreSQL 16',
        dataValidation: 'Zod',
      },
      fileStructure: [
        'app/src/index.ts',
        'app/src/config.ts',
        'app/src/db/schema.sql',
        'app/src/services/booking-service.ts',
        'app/src/routes/bookings.ts',
        'app/tests/booking.test.ts',
      ],
      implementationSpec: `Technical Architecture & Component Specification
1. Database Layer: Normalized PostgreSQL schema with UUID primary keys and foreign key constraints.
2. Business Layer: Service layer pattern isolating business validation rules from HTTP transport logic.
3. HTTP Layer: RESTful JSON endpoints with Zod schema validation middleware.
4. Security: Parameterized queries, CORS protection, helmet headers, and strict error sanitization.
5. Testing: Automated integration tests verifying API contracts, edge cases, and deterministic error responses.`,
      decisions: [
        {
          code: 'ADR-001',
          title: 'Adopt PostgreSQL for ACID Transaction Integrity',
          status: 'Accepted',
          context: 'System requires reliable concurrent booking and state persistence with zero data loss.',
          decision: 'Use PostgreSQL with connection pooling and schema migrations.',
          consequences: 'Enables transactional consistency, reliable index performance, and clear schema lineage.',
        },
        {
          code: 'ADR-002',
          title: 'Enforce Zod Schema Validation on All Inbound Payloads',
          status: 'Accepted',
          context: 'Prevent invalid client data from reaching domain services.',
          decision: 'Validate all HTTP bodies and parameters with Zod before processing.',
          consequences: 'Eliminates unhandled type exceptions and ensures predictable API responses.',
        },
      ],
    };
  }

  static generateEngineerOutput(): EngineerOutput {
    return {
      implementationSummary: 'Implemented complete modular service, REST router, and schema migrations adhering strictly to architecture decisions.',
      taskCoverage: [
        {
          taskCode: 'TASK-001',
          filePaths: ['app/src/db/schema.sql', 'app/src/services/booking-service.ts'],
        },
        {
          taskCode: 'TASK-002',
          filePaths: ['app/src/routes/bookings.ts', 'app/src/index.ts'],
        },
        {
          taskCode: 'TASK-003',
          filePaths: ['app/src/middleware/validate.ts', 'app/src/config.ts'],
        },
      ],
      assumptions: [
        'Database connection pool configured via environment variables.',
        'JSON body parser enabled on Express app.',
      ],
      files: [
        {
          path: 'app/src/services/booking-service.ts',
          purpose: 'Domain service handling booking creation, availability checking, and state updates.',
          content: `export interface Booking {
  id: string;
  customerName: string;
  serviceType: string;
  scheduledAt: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

export class BookingService {
  private bookings: Map<string, Booking> = new Map();

  async createBooking(data: Omit<Booking, 'id' | 'status'>): Promise<Booking> {
    const id = 'bk_' + Math.random().toString(36).substring(2, 9);
    const booking: Booking = { ...data, id, status: 'pending' };
    this.bookings.set(id, booking);
    return booking;
  }

  async getBooking(id: string): Promise<Booking | null> {
    return this.bookings.get(id) ?? null;
  }

  async listBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }
}`,
          relatedTaskCodes: ['TASK-001', 'TASK-002'],
        },
        {
          path: 'app/src/routes/bookings.ts',
          purpose: 'REST controller routing booking HTTP requests to the domain service.',
          content: `import { Router } from 'express';
import { BookingService } from '../services/booking-service.js';

export function createBookingRouter(service: BookingService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    try {
      const { customerName, serviceType, scheduledAt } = req.body;
      if (!customerName || !serviceType || !scheduledAt) {
        return res.status(400).json({ error: 'Missing required booking fields' });
      }
      const booking = await service.createBooking({ customerName, serviceType, scheduledAt });
      return res.status(201).json(booking);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to create booking' });
    }
  });

  router.get('/', async (_req, res) => {
    const list = await service.listBookings();
    return res.json({ data: list });
  });

  return router;
}`,
          relatedTaskCodes: ['TASK-002'],
        },
      ],
    };
  }

  static generateCodeReviewOutput(): CodeReviewOutput {
    return {
      summary: 'Code review completed with 0 blocking security or architecture issues. Implementation clean and modular.',
      findings: [
        {
          code: 'CR-001',
          severity: 'low',
          isBlocking: false,
          category: 'Maintainability',
          filePath: 'app/src/routes/bookings.ts',
          description: 'Consider adding JSDoc comments to public controller methods for enhanced team readability.',
          recommendation: 'Add standardized JSDoc annotations describing query params and responses.',
          relatedRequirementCodes: ['REQ-001'],
        },
      ],
      architectureCompliance: {
        status: 'pass',
        notes: [
          'Correct separation of domain service and HTTP routing layers.',
          'TypeScript interfaces match schema contracts accurately.',
        ],
      },
      maintainabilityAssessment: 'High maintainability index with clean modular exports and strong type contracts.',
    };
  }

  static generateQAOutput(): QAOutput {
    return {
      testPlanSummary: 'Automated test suite verifying functional booking creation, input validation, and boundary conditions.',
      testFiles: [
        {
          path: 'app/tests/booking.test.ts',
          purpose: 'Integration tests for booking service and REST endpoints.',
          content: `import { describe, it, expect } from 'vitest';
import { BookingService } from '../src/services/booking-service.js';

describe('BookingService', () => {
  it('creates and retrieves a booking successfully', async () => {
    const service = new BookingService();
    const created = await service.createBooking({
      customerName: 'Alice Smith',
      serviceType: 'Oil Change',
      scheduledAt: '2026-09-01T10:00:00Z',
    });
    expect(created.id).toBeDefined();
    expect(created.status).toBe('pending');

    const fetched = await service.getBooking(created.id);
    expect(fetched).toEqual(created);
  });

  it('lists multiple bookings correctly', async () => {
    const service = new BookingService();
    await service.createBooking({ customerName: 'Bob', serviceType: 'Brake Check', scheduledAt: '2026-09-01T11:00:00Z' });
    const list = await service.listBookings();
    expect(list.length).toBe(1);
  });
});`,
          relatedRequirementCodes: ['REQ-001', 'REQ-002'],
        },
      ],
      requirementCoverage: [
        {
          requirementCode: 'REQ-001',
          testNames: ['creates and retrieves a booking successfully'],
        },
        {
          requirementCode: 'REQ-002',
          testNames: ['lists multiple bookings correctly'],
        },
      ],
      assumptions: ['Tests run in isolated Vitest runtime environment'],
    };
  }
}
