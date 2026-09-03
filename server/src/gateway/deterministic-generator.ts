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

  static generateEngineerOutput(userPrompt?: string): EngineerOutput {
    const prompt = (userPrompt || '').toLowerCase();
    const isBlog = prompt.includes('blog') || prompt.includes('article') || prompt.includes('post') || prompt.includes('resource');
    const isPortfolio = prompt.includes('portfolio') || prompt.includes('designer') || prompt.includes('agency') || prompt.includes('service');

    const taskMatches = (userPrompt || '').match(/\bT-\d+\b|\bTASK-\d+\b/g) || ['T-001', 'T-002', 'T-003', 'T-004'];
    const uniqueTasks = Array.from(new Set(taskMatches));
    if (uniqueTasks.length === 0) {
      uniqueTasks.push('T-001', 'T-002', 'T-003', 'T-004');
    }

    const taskCoverage = uniqueTasks.map((tCode) => ({
      taskCode: tCode,
      filePaths: ['requirements.txt', 'app/main.py', 'app/models.py', 'app/database.py'],
    }));

    let modelsContent = '';
    let dbContent = '';
    let mainContent = '';

    if (isBlog) {
      modelsContent = `from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    slug: str = Field(..., min_length=2, max_length=50)

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: str

class PostBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    slug: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10)
    summary: Optional[str] = Field(default="")
    category: str = Field(default="general")
    status: str = Field(default="published")

class PostCreate(PostBase):
    pass

class PostResponse(PostBase):
    id: str
    created_at: datetime
    updated_at: datetime

class ContactInquiryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    message: str = Field(..., min_length=5, max_length=2000)
    honeypot: Optional[str] = None

class ContactInquiryResponse(BaseModel):
    id: str
    status: str = "received"
    message: str = "Inquiry captured successfully"

class HealthCheckResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    database: str = "connected"
`;

      dbContent = `import sqlite3
import os
import uuid
from datetime import datetime

DB_PATH = os.environ.get("SQLITE_DB_PATH", "app.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            content TEXT NOT NULL,
            summary TEXT,
            category TEXT NOT NULL DEFAULT 'general',
            status TEXT NOT NULL DEFAULT 'published',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inquiries (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("INSERT OR IGNORE INTO categories (id, name, slug) VALUES ('cat_1', 'AI Insights', 'ai-insights')")
    cursor.execute("INSERT OR IGNORE INTO categories (id, name, slug) VALUES ('cat_2', 'Machine Learning', 'machine-learning')")
    conn.commit()
    conn.close()

def get_posts(category: str = None, limit: int = 50):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    if category:
        cursor.execute("SELECT id, title, slug, content, summary, category, status, created_at, updated_at FROM posts WHERE category = ? AND status = 'published' ORDER BY created_at DESC LIMIT ?", (category, limit))
    else:
        cursor.execute("SELECT id, title, slug, content, summary, category, status, created_at, updated_at FROM posts WHERE status = 'published' ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "title": r[1], "slug": r[2], "content": r[3], "summary": r[4], "category": r[5], "status": r[6], "created_at": r[7], "updated_at": r[8]} for r in rows]

def create_post(data: dict):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    pid = f"post_{uuid.uuid4().hex[:10]}"
    now = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO posts (id, title, slug, content, summary, category, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (pid, data["title"], data["slug"], data["content"], data.get("summary", ""), data.get("category", "general"), data.get("status", "published"), now, now))
    conn.commit()
    conn.close()
    return {**data, "id": pid, "created_at": now, "updated_at": now}

def save_inquiry(data: dict):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    iid = f"inq_{uuid.uuid4().hex[:10]}"
    cursor.execute("INSERT INTO inquiries (id, name, email, message) VALUES (?, ?, ?, ?)", (iid, data["name"], data["email"], data["message"]))
    conn.commit()
    conn.close()
    return {"id": iid, "status": "received", "message": "Inquiry captured successfully"}
`;

      mainContent = `from fastapi import FastAPI, HTTPException, status, Query, Header
from typing import List, Optional
from app.models import PostCreate, PostResponse, CategoryResponse, ContactInquiryCreate, ContactInquiryResponse, HealthCheckResponse
from app.database import init_db, get_posts, create_post, save_inquiry

app = FastAPI(title="AI & Machine Learning Insights Blog API", version="1.0.0")

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health", response_model=HealthCheckResponse)
def health_check():
    return HealthCheckResponse()

@app.get("/api/posts", response_model=List[PostResponse])
def list_posts(category: Optional[str] = Query(None), limit: int = Query(50, le=100)):
    return get_posts(category=category, limit=limit)

@app.post("/api/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def add_post(post: PostCreate, authorization: Optional[str] = Header(None)):
    # Basic auth check simulation
    return create_post(post.dict())

@app.get("/api/posts/{slug}", response_model=PostResponse)
def get_post_by_slug(slug: str):
    posts = get_posts()
    for p in posts:
        if p["slug"] == slug:
            return p
    raise HTTPException(status_code=404, detail="Post not found")

@app.post("/api/contact", response_model=ContactInquiryResponse, status_code=status.HTTP_201_CREATED)
def submit_contact(payload: ContactInquiryCreate):
    if payload.honeypot:
        raise HTTPException(status_code=400, detail="Spam detected")
    return save_inquiry(payload.dict())

@app.get("/sitemap.xml")
def sitemap():
    return {"status": "ok", "routes": ["/", "/blog", "/categories", "/about", "/contact"]}

@app.get("/")
def root():
    return {"message": "AI & ML Knowledge Base Online", "docs": "/docs"}
`;
    } else {
      // General / Portfolio / SaaS domain
      modelsContent = `from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class ContactInquiryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    service_type: Optional[str] = Field(default="standard")
    project_scope: Optional[str] = Field(default="mvp")
    budget_range: Optional[str] = Field(default="$5k-$10k")
    message: str = Field(..., min_length=5, max_length=2000)
    honeypot: Optional[str] = None

class ContactInquiryResponse(BaseModel):
    id: str
    name: str
    email: str
    status: str = "received"
    created_at: datetime

class ItemCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = ""
    status: str = "active"

class ItemResponse(ItemCreate):
    id: str
    created_at: datetime

class HealthCheckResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    database: str = "connected"
`;

      dbContent = `import sqlite3
import os
import uuid
from datetime import datetime

DB_PATH = os.environ.get("SQLITE_DB_PATH", "app.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inquiries (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            service_type TEXT,
            project_scope TEXT,
            budget_range TEXT,
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'received',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_inquiry(data: dict) -> dict:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    inquiry_id = f"inq_{uuid.uuid4().hex[:10]}"
    now = datetime.utcnow()
    cursor.execute("""
        INSERT INTO inquiries (id, name, email, service_type, project_scope, budget_range, message, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'received', ?)
    """, (inquiry_id, data["name"], data["email"], data.get("service_type", "standard"),
          data.get("project_scope", ""), data.get("budget_range", ""), data["message"], now.isoformat()))
    conn.commit()
    conn.close()
    return {
        "id": inquiry_id,
        "name": data["name"],
        "email": data["email"],
        "status": "received",
        "created_at": now
    }
`;

      mainContent = `from fastapi import FastAPI, HTTPException, status
from app.models import ContactInquiryCreate, ContactInquiryResponse, HealthCheckResponse
from app.database import init_db, save_inquiry

app = FastAPI(title="TayDau Autonomous Service API", version="1.0.0")

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health", response_model=HealthCheckResponse)
def health_check():
    return HealthCheckResponse()

@app.post("/api/inquiries", response_model=ContactInquiryResponse, status_code=status.HTTP_201_CREATED)
def create_inquiry(payload: ContactInquiryCreate):
    if payload.honeypot:
        raise HTTPException(status_code=400, detail="Spam detected")
    try:
        result = save_inquiry(payload.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {"message": "TayDau Autonomous Service Online", "docs": "/docs"}
`;
    }

    return {
      implementationSummary: 'Implemented complete modular FastAPI application with SQLite database persistence, Pydantic validation models, and REST endpoints adhering strictly to architectural constraints.',
      taskCoverage,
      assumptions: [
        'Python 3.11 execution runtime in isolated sandbox container.',
        'SQLite embedded database stored locally in ephemeral workspace.',
      ],
      files: [
        {
          path: 'requirements.txt',
          purpose: 'Pinned production dependencies for FastAPI application runtime.',
          content: 'fastapi==0.110.0\nuvicorn==0.28.0\npydantic==2.6.4\nsqlalchemy==2.0.28\naiosqlite==0.20.0\npytest==8.1.1\nhttpx==0.27.0\n',
          relatedTaskCodes: uniqueTasks,
        },
        {
          path: 'app/models.py',
          purpose: 'Domain data schemas and request/response models with Pydantic v2 validation.',
          content: modelsContent,
          relatedTaskCodes: uniqueTasks,
        },
        {
          path: 'app/database.py',
          purpose: 'SQLite database connection helper and local storage manager.',
          content: dbContent,
          relatedTaskCodes: uniqueTasks,
        },
        {
          path: 'app/main.py',
          purpose: 'FastAPI application entry point registering routes, health check, and error handlers.',
          content: mainContent,
          relatedTaskCodes: uniqueTasks,
        },
      ],
    };
  }

  static generateCodeReviewOutput(userPrompt?: string): CodeReviewOutput {
    const prompt = userPrompt || '';
    const reqMatches = prompt.match(/\bREQ-\d+\b/g) || ['REQ-001', 'REQ-002'];
    const uniqueReqs = Array.from(new Set(reqMatches));

    return {
      summary: 'Code review completed with 0 blocking security or architecture issues. Implementation clean, modular, and adheres to SQLite air-gapped constraints.',
      findings: [
        {
          code: 'CR-001',
          severity: 'low',
          isBlocking: false,
          category: 'Maintainability',
          filePath: 'app/main.py',
          description: 'Consider adding lifespan async context manager for newer FastAPI conventions.',
          recommendation: 'Use FastAPI lifespan event handlers when migrating past v0.110.',
          relatedRequirementCodes: uniqueReqs,
        },
      ],
      architectureCompliance: {
        status: 'pass',
        notes: [
          'Correct separation of data models, SQLite storage helpers, and FastAPI HTTP routing layers.',
          'Pydantic schemas match request and response contracts accurately.',
        ],
      },
      maintainabilityAssessment: 'High maintainability index with clean modular exports and strong type contracts.',
    };
  }

  static generateQAOutput(userPrompt?: string): QAOutput {
    const prompt = userPrompt || '';
    const reqMatches = prompt.match(/\bREQ-\d+\b/g) || ['REQ-001', 'REQ-002', 'REQ-003', 'REQ-004'];
    const uniqueReqs = Array.from(new Set(reqMatches));
    if (uniqueReqs.length === 0) {
      uniqueReqs.push('REQ-001', 'REQ-002');
    }

    const requirementCoverage = uniqueReqs.map((rCode) => ({
      requirementCode: rCode,
      testNames: [
        `test_health_check_endpoint_${rCode.replace('-', '_')}`,
        `test_create_inquiry_valid_payload_${rCode.replace('-', '_')}`,
      ],
    }));

    return {
      testPlanSummary: 'Automated Pytest test suite verifying health check endpoints, Pydantic input validation, and SQLite persistence.',
      testFiles: [
        {
          path: 'tests/test_main.py',
          purpose: 'FastAPI TestClient integration tests verifying health checks, status codes, and input validation.',
          content: `import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"

def test_create_inquiry_success():
    payload = {
        "name": "Sarah Designer",
        "email": "sarah@example.com",
        "service_type": "ui_ux_design",
        "project_scope": "portfolio_redesign",
        "budget_range": "$5k-$10k",
        "message": "We would like to redesign our mobile portfolio and web design system."
    }
    response = client.post("/api/inquiries", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Sarah Designer"
    assert data["email"] == "sarah@example.com"
    assert data["status"] == "received"
    assert "id" in data

def test_create_inquiry_invalid_email():
    payload = {
        "name": "Invalid User",
        "email": "not-an-email",
        "message": "Short message"
    }
    response = client.post("/api/inquiries", json=payload)
    assert response.status_code == 422
`,
          relatedRequirementCodes: uniqueReqs,
        },
      ],
      requirementCoverage,
      assumptions: ['Tests execute inside air-gapped Docker sandbox using pytest and httpx TestClient.'],
    };
  }
}
