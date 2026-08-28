# **TayDau Force** 

_Autonomous Software Delivery Organization_ 

_Architecture, processes, security, cost model, best practices, differentiation and hackathon implementation guide_ 

Prepared for the Alibaba Cloud AI Hackathon Pakistan 2026 

Version: 1.0 

Date: 25 August 2026 

1 

## **Document purpose** 

TayDau Force is an autonomous software delivery system designed to behave more like a disciplined software organization than a single coding assistant. A client gives the system a product need or project brief. TayDau Force analyzes that need, converts it into requirements, creates a prototype, plans the architecture, assembles the required AI workforce, develops the application, reviews the work, runs quality and security checks, deploys the result, and keeps enough project history to explain how the result was produced. 

The concept started as a small AI development team with a project manager, designer, frontend developer, backend developer and QA tester. During refinement, the scope became broader. A complete delivery system also needs business analysis, architecture, database responsibilities, version control, DevOps, security, backups, monitoring, cost control and operational recovery. TayDau Force handles those responsibilities without creating a separate chatbot for every human job title. It uses a combination of agents, skills, tools and policies. 

This document records the architecture and decisions made for TayDau Force. It also defines what makes the product different from current AI app builders and AI coding tools, what "accountable and verified software" means, how security fits into the lifecycle, how cost should be controlled, and which parts belong in the hackathon MVP versus the longer term platform. 

## **Contents** 

1. Product definition and vision 

2. Problem TayDau Force is trying to solve 

3. Product principles 

4. Architecture overview 

5. Architecture layers in detail 

6. Agent, skill, tool and policy model 

7. AI workforce and responsibilities 

8. Development methodology and process 

9. Quality, verification and accountability 

10. Security and DevSecOps model 

11. Docker, Kubernetes and execution isolation 

12. Project intelligence, memory and context management 

13. Cost model and Cost Governor 

14. Reliability, observability and recovery 

15. Data model and system services 

16. Suggested hackathon technology stack 

17. Comparison with Lovable, Bolt, v0, Cursor and Qoder 

18. TayDau Force differentiators 

19. Hackathon MVP and production roadmap 

20. Success metrics 

21. Risks and design tradeoffs 

22. Judge questions and suggested answers 

23. TayDau Force engineering constitution 

24. References 

2 



<!-- Start of picture text -->
¥<br>TayDau Force 42% = Client / Product Owner<br>Autonomous Software Delivery Organization Product Brief / Business Need<br>BUSINESS & PRODUCT INTELLIGENCE<br>=INTELLIGENCE @ Business Analyst Agent ae Project Manager Agent COST GOVERNOR<br>¢&Ge. O-----<> a +**. AicapesnceRequirementsBusinessUser Stori RulesCihada > (=):= +©*. TaskPlanningPrioritiaationProjectDelegati Tracking — Validated: iy) Scope Ha 9)<br>* Security Requirements + Risk Register :<br>(iFD Project State é ESsass ‘ ws RAPID PROTOTYPINGRapid Prototype & VALIDATION mm ps Human Validationa  / Approval el eais Hi afe sai‘outingol<br>Iteration / :<br>Shared Memory e— ARCHITECTURE & WORKFORCE ASSEMBLY WorkforceifAssembler/ | eee Res =3 Token Budgets<br>> ( Solution Architect Agent ) eae ry Orchestrator mo sickace > &<br>| a ** TechSystem StackDesign +> Dynamicdav +> a. ** AgentRole Permissions Selection Prouadir naweyx |<br>8 * Data Model Workforce * Task Routing Agnostic —<br>° + Architecture Decision Records * Risk-Based Approval —o Optimization<br>| Context Resolver + Integration Design | Allocation * State Machine LLM Access o— Context,<br>| —— — — — a — — : — SS<br>| Noyae Task History i — =EXECUTION= a, CoreENGINEAgents SS: =a ; .  Onn~ee i. a —<br>= &0 \{ Full-Stack<> ; Q ; ; Y oe S— © @ ) - imi<br>BE ass UI/UX Engineer Code Review QA DevOps Database Security Network AlOps / Mobile/<br>Decision Log Designer (FrontendBackend) / Agent Engineer Engineer Specialist 3) Specialist d\ Specialist _ MonitoringSpecialist SpecialistML : QO Retry Limits—<br>(Backlog —> [Y) Ready —> In Development —> {2 Code Review —>[@] aA —> [BE Ready forRelease —> PRI Done<br>Sp ADR Reposito —,<br>B ‘epository Structured Contracts A Least Privilege v Git Branching Definition of Ready (2) Definition of Done als Usage Tracking<br>Audit Trail . ' Budget-A\<br>9 boy QUALITY, SECURITY & GOVERNANCE PASS<br>N ma nl yey BSB) RequirementTraceability © ModelingTheat 7) SASTDas &Qelie& i ManagementDefect OFen B. ® Developersoon cannot | Defect / (#) udget-AwareEscalation<br>= e a. aa. - ———e =— ———— Readiness isi<br>Q Evidence-Based Verification QB Separation<br>DSN of Duties CO dDevSecOps Rework<br>6 | _ PLATFORM, DEVSECOPS & OPERATIONS _ eee|  ee; : - ‘ GC SRequir ment e<br>wv seatpomesDocker - eye) Pipstine.ci/cD |7 | 3 KubernetContain r e s / |> GD Deployment > A,[A~ Monitoring"Hope & me soSs RestoreBackups Pokicies&<br>Environments Orchestration )<br>g Non-Root Containers al RBAC ig) Safe Migrations .©) Observability o Checkpoint & Resume<br>VERIFIED & SECURE SOFTWARE DELIVERY PACKAGE<br>YO ome; om OMe On. OL, Ot, OMA OttRele | OuseS80M<br>“=m oe -0-0--6- 60-0 0-0-0 - 00<br>PROCESS SUMMARY Client Idea Analysis Prototype Validation Architecture Pc Build Review Pa3 Deploy Monitor Iterate<br>BEST PRACTICES B StructuredContracts Agent = Oneof Source Truth r@(3) —_Human-in-the-Loopfor High Risk <a DeterministicTesting s) BoundedRetries & Budget-AwareIntelligence oY TraceabilityEnd-to-End<br><!-- End of picture text -->

## **1. Product definition and vision** 

TayDau Force is a governed multi-agent software delivery platform. Its goal is to accept a business or product requirement and manage the work needed to turn that requirement into tested, security-checked and traceable software. 

The long term vision is simple to describe: 

_A client should be able to brief TayDau Force in the same way that the client would brief a software company. The system should decide what work is required, which AI roles are needed, how the work should be divided, what evidence is required before approval, and when the project is ready for release._ 

The product is therefore broader than a code generator. Code generation is one part of the execution engine. TayDau Force also includes requirements, planning, architecture, role assignment, quality control, security checks, deployment, monitoring, cost management and project governance. 

### **1.1 Working product statement** 

TayDau Force is an autonomous software delivery organization that uses specialized AI roles, shared project intelligence, deterministic engineering tools and policy-based controls to take a project from business need to a verified and secure software delivery package. 

### **1.2 Short pitch** 

A user provides one product brief. TayDau Force analyzes it, builds the right AI team, develops the software, independently checks the work, applies security and release controls, and delivers the application with evidence showing what was built and how it was verified. 

### **1.3 What TayDau Force is not** 

TayDau Force should not be presented as five chat windows with different system prompts. That would only simulate job titles. The platform should manage a real project state, task dependencies, role permissions, code workspaces, test results, defects, approvals, costs and deployment status. 

It is also not necessary to claim that TayDau Force can replace every software company on day one. The hackathon version should prove the model on a controlled class of web applications. The broader software organization is the product direction. 

## **2. Problem TayDau Force is trying to solve** 

AI coding products have reduced the time needed to create software. A user can now describe an application, generate code, modify a repository, run commands, test a user interface and deploy software with AI assistance. This has changed the bottleneck. 

The harder question is no longer only "Can AI write this code?" The harder questions are: 

- Did the system correctly understand the business requirement? 

- Can each requirement be traced to implementation and tests? 

- Who or what is allowed to approve a change? 

- Did an independent process verify the feature? 

- Did the system check common security risks? 

- Can a failed task be retried without losing control of cost? 

- Can the project recover after an interrupted run? 

- Can the user see why the system considers the project ready? 

- Can the software move safely from development to deployment and monitoring? 

TayDau Force treats these as first-class product concerns. 

## **3. Product principles** 

The architecture is based on a small set of rules. These rules are more important than the number of agents in the system. 

4 

### **3.1 Model capabilities, not employee titles** 

A human software company may employ a DBA, release manager, network administrator, DevOps engineer, security engineer, QA engineer and backup administrator. TayDau Force should not automatically create one permanent AI agent for every title. 

An agent should exist when the work needs independent reasoning, responsibility, authority or validation. Reusable operations should become skills or tools. Mandatory controls should become policies. 

For example, Git is a tool and workflow mechanism. Backups are mainly an infrastructure policy. Database design may be handled by the software engineer on a small project and delegated to a database specialist on a complex project. 

### **3.2 One project, one source of truth** 

Agents should not keep separate and conflicting versions of the requirements. A central project knowledge model stores requirements, acceptance criteria, architecture decisions, tasks, API contracts, defects, tests, costs and deployment records. 

### **3.3 Independent verification** 

An agent that writes a feature should not be able to certify that the same feature is correct. Automated tools and independent review roles should provide separate evidence. 

### **3.4 Least privilege** 

Each role receives only the tools, files and actions required for its responsibilities. A designer does not need production database access. A QA role does not need permission to silently rewrite production code. A development agent should not receive unrestricted cloud credentials. 

### **3.5 Deterministic tools before model judgement** 

If a compiler, parser, test runner, linter, scanner or API call can answer a question reliably, TayDau Force should use that tool instead of asking an LLM to guess. 

### **3.6 Bounded autonomy** 

Agents should have token limits, retry limits, execution time limits, compute limits and financial limits. Repeated failure should trigger escalation instead of an infinite loop. 

### **3.7 Security is part of delivery** 

Security should start during requirements and architecture. It should not appear as a final checklist after the application is already built. 

### **3.8 Cost is an engineering constraint** 

A multi-agent system can waste money quickly if every role receives a premium model, the full repository and unlimited retries. TayDau Force includes a Cost Governor so that cost is visible and controlled at the project, task and agent-run level. 

## **4. Architecture overview** 

The reference architecture contains six main delivery layers, two cross-cutting control systems, and one final delivery package. 

The main flow is: 

1. Business and Product Intelligence 

2. Rapid Prototyping and Validation 

3. Architecture and Workforce Assembly 

4. Execution Engine 

5. Quality, Security and Governance 

6. Platform, DevSecOps and Operations 

5 

Two systems operate across the whole lifecycle: 

- Shared Project Intelligence keeps project state, memory, context, task history, decisions and audit information. 

- Cost Governor controls model routing, token budgets, compute limits, retries and usage. 

- The final result is a Verified and Secure Software Delivery Package. 

### **4.1 End-to-end process summary** 

Client Idea -> Analysis -> Prototype -> Validation -> Architecture -> Team Assembly -> Build -> Review -> QA and Security -> Deploy -> Monitor -> Iterate 

This is intentionally iterative. Monitoring, user feedback or a failed quality check can move work back to an earlier state. The project does not move forward only because an agent says that its task is finished. 

## **5. Architecture layers in detail** 

### **5.1 Layer 1: Business and Product Intelligence** 

This layer converts a vague client need into work that engineers can act on. 

The Business Analyst Agent is responsible for requirements, business rules, user stories, acceptance criteria and initial security requirements. It should identify gaps and contradictions instead of immediately turning every sentence into a coding task. 

The Project Manager Agent is responsible for planning, prioritization, dependencies, delegation, project tracking and the risk register. The PM owns the project flow but does not write or approve engineering work simply because it has managerial authority. 

The output of this layer is a validated scope. At minimum it should contain: 

- project objective 

- user types 

- functional requirements 

- non-functional requirements 

- security requirements 

- business rules 

- acceptance criteria 

- known constraints 

- initial risk register 

- assumptions that require user confirmation 

A requirement should receive a stable identifier such as REQ-017. Acceptance criteria can use related identifiers such as AC-017.1 and AC-017.2. These identifiers follow the feature through the rest of the lifecycle. 

### **5.2 Layer 2: Rapid Prototyping and Validation** 

TayDau Force uses a Rapid Application Development style loop for early validation. The system produces a quick prototype or interaction model before committing to the full implementation. 

The prototype is shown to the client or product owner. Feedback may change requirements, design, workflow or scope. Once the important assumptions are validated, the project moves to architecture. 

This stage reduces a common AI coding failure: generating a technically complete feature that solves the wrong problem. 

The prototype does not need to be production code. Its purpose is to validate understanding quickly. 

### **5.3 Layer 3: Architecture and Workforce Assembly** 

The Solution Architect Agent defines the proposed tech stack, system boundaries, data model, API approach, integration design and architecture decisions. 

Meaningful decisions should be recorded as Architecture Decision Records. An ADR explains the decision, the reason, alternatives considered, consequences and current status. This helps prevent later agents from casually reversing an earlier architectural choice because they received different context. 

6 

The Workforce Assembler or Orchestrator analyzes the project and activates the required capabilities. It considers project complexity, stack, security risk, data needs, deployment needs and specialist requirements. 

Example workforce decision: 

|**Capability**|**Required for a medium SaaS project**|
|---|---|
|Business Analyst|Yes|
|Project Manager|Yes|
|Solution Architect|Yes|
|UI/UX Designer|Yes|
|Full-Stack Engineer|Yes|
|QA Engineer|Yes|
|DevOps Engineer|Yes|
|Database Specialist|If schema or performance complexity justifies it|
|Security Specialist|Required when risk or sensitive data justifies it|
|Network Specialist|Only when infrastructure needs it|
|Mobile or ML Specialist|Only if the product requires those capabilities|



The Orchestrator also assigns role permissions, selects the model class, routes tasks and tracks the project state machine. 

#### **Model Gateway** 

TayDau Force should use a model gateway instead of coupling the platform directly to one provider. The gateway exposes a standard internal interface while allowing different models to serve different tasks. 

A simple requirement-formatting task can use a low-cost model. A difficult architecture decision can use a stronger reasoning model. A complex coding task can use a coding-focused model. This design also makes the platform more resilient if prices, limits or available models change. 

### **5.4 Layer 4: Execution Engine** 

The Execution Engine is where design, coding, code review, QA preparation and DevOps work happen. 

The core workflow uses Kanban-style states: 

Backlog -> Ready -> In Development -> Code Review -> QA -> Ready for Release -> Done 

Each state has entrance and exit criteria. A task should not enter development until it satisfies the Definition of Ready. It should not reach Done until it satisfies the Definition of Done. 

#### **Definition of Ready** 

A task should normally have: 

- a requirement or approved technical objective 

- acceptance criteria 

- dependencies resolved or documented 

- required inputs and contracts 

- expected output 

- assigned role 

#### **Definition of Done** 

A completed engineering task should normally have: 

- implementation completed 

- relevant automated tests 

- code review result 

- documentation when required 

- requirement traceability updated 

- QA evidence when the task requires QA 

7 

- no unresolved release-blocking issue 

#### **Parallel work** 

Independent tasks can run in parallel. Frontend and backend work may proceed at the same time if their API contract is stable. Parallel work should use isolated Git branches, worktrees or workspaces so that agents do not overwrite each other's changes. 

### **5.5 Layer 5: Quality, Security and Governance** 

This layer decides whether work can move toward release. It contains independent QA, requirement traceability, threat modelling, security scanners, defect management and release readiness. 

The central policy is simple: 

_Developers cannot approve their own work._ 

A developer can report that a task is implemented. Completion is accepted only when the required evidence exists. The layer can produce two outcomes: 

- PASS: the project or feature meets the required quality and security conditions and can move forward. 

- Defect/Rework: a defect is created and routed back to the appropriate role. 

The system should record why a task failed, which evidence produced the failure, who owns the repair, and what must be rerun after the fix. 

### **5.6 Layer 6: Platform, DevSecOps and Operations** 

The operations layer turns source code into a running and observable application. 

The reference flow is: 

Docker Sandbox -> CI/CD Pipeline -> Kubernetes or Container Orchestration -> Deployment -> Monitoring and AIOps -> Backups and Restore Policies 

For the hackathon, Docker and a simple CI/CD flow are more important than a full Kubernetes platform. Kubernetes becomes useful when TayDau Force needs to schedule and isolate many concurrent workloads across machines. 

The operations layer also owns safe deployment, rollback, environment configuration, monitoring, logs, health checks, backup policies and recovery processes. 

### **5.7 Shared Project Intelligence** 

Shared Project Intelligence is the memory and state layer used by all roles. It contains: 

- Project State 

- Shared Memory 

- Context Resolver 

- Task History 

- Decision Log 

- ADR Repository 

- Audit Trail 

This is not a single unstructured transcript. The system should keep structured records that agents can query. 

### **5.8 Cost Governor** 

The Cost Governor watches AI and infrastructure usage across the platform. It should track: 

- model routing 

- input and output tokens 

- context size 

- compute use 

- retry count 

- elapsed execution time 

- storage and network use where relevant 

- cost per task 

8 

- cost per verified requirement 

- total project cost 

When a task is repeatedly failing, the Cost Governor can permit a controlled escalation to a stronger model. It can also stop wasteful loops and request human review. 

## **6. Agent, skill, tool and policy model** 

TayDau Force should separate four concepts that are often mixed together in multi-agent demos. 

|**Concept**|**Meaning**|**Example**|
|---|---|---|
|Agent|Independent reasoning, responsibility and<br>authority|QA Engineer|
|Skill|Reusable capability an agent can perform|Generate test cases|
|Tool|Executable operation or system|Git, Docker, Playwright, terminal|
|Policy|Rule that the workflow must enforce|No release with a critical security finding|



### **6.1 Why this matters** 

If every action becomes an agent, the system becomes difficult to coordinate and expensive to run. A dedicated "Backup Agent" is usually unnecessary. Backup scheduling and retention are policies executed through infrastructure tools. A "Version Control Agent" is also unnecessary in most cases. Git actions belong to the development and review workflow. 

A specialist agent is appropriate when the project needs separate reasoning or independent judgement. Security and database work are good examples when the project is complex or high risk. 

## **7. AI workforce and responsibilities** 

### **7.1 Business Analyst Agent** 

Main responsibilities: 

- understand the business need 

- extract functional and non-functional requirements 

- identify business rules 

- write user stories when useful 

- define acceptance criteria 

- identify missing information 

- add initial security requirements 

- maintain requirement traceability 

The BA does not decide implementation details unless the business requirement requires them. 

### **7.2 Project Manager Agent** 

Main responsibilities: 

- create and maintain the project plan 

- prioritize work 

- manage dependencies 

- assign tasks to roles 

- track blockers 

- manage risk register 

- manage human approval points 

- coordinate retries and escalation 

- report project status 

The PM should not directly edit application code as part of normal workflow. 

9 

### **7.3 Solution Architect Agent** 

Main responsibilities: 

- select or recommend the stack 

- define service boundaries 

- design data flow and integration 

- define API contracts 

- design the data model 

- record ADRs 

- consider performance, reliability and security constraints 

### **7.4 UI/UX Designer Agent** 

Main responsibilities: 

- user flows 

- information architecture 

- wireframes or component specifications 

- design system 

- accessibility requirements 

- responsive behavior 

- visual review of the running application 

The designer should not receive unnecessary production infrastructure privileges. 

### **7.5 Full-Stack Engineer** 

A small project can use one Full-Stack Engineer role. The role can split into Frontend and Backend specialists when project size or concurrency justifies it. 

Responsibilities include: 

- implement application features 

- follow architecture and coding standards 

- create or update tests 

- use Git branches or isolated workspaces 

- report changed files and known risks 

- respect API and data contracts 

### **7.6 Code Review Agent** 

The reviewer checks code changes independently. It looks for defects, architecture violations, maintainability problems, security concerns and unnecessary complexity. 

Review is a separate activity from implementation. A project can require review before merging a change into the integration branch. 

### **7.7 QA Engineer** 

The QA role verifies behavior against requirements and acceptance criteria. It can use unit, integration, API, browser and end-to-end testing tools. 

QA should be able to create defects and reject work. It should not silently fix a failed implementation and then approve the same work under the same role. 

### **7.8 DevOps Engineer** 

The DevOps role handles build, packaging, CI/CD, environment setup, containerization, deployment, rollback and operational health. 

In TayDau Force this role should follow DevSecOps practices, which means security checks are part of the pipeline instead of a separate final activity. 

### **7.9 On-demand specialists** 

On-demand roles can include: 

10 

- Database Specialist 

- Security Specialist 

- Network Specialist 

- AIOps or Monitoring Specialist 

- Mobile Specialist 

- ML Specialist 

A project does not pay the reasoning and context cost of these agents unless their capabilities are required. 

## **8. Development methodology and process** 

TayDau Force should not claim to use "Scrum" only because Scrum is well known. A fixed two-week sprint and a daily stand-up make sense for many human teams, but they do not map cleanly to agents that can complete tasks in minutes. 

The proposed methodology combines Agile principles, Rapid Application Development, Kanban task flow and DevSecOps. 

### **8.1 Agile principles** 

Agile contributes the basic behavior: 

- work iteratively 

- accept changing requirements when justified 

- keep the product owner involved 

- deliver working increments 

- use feedback to change the next iteration 

### **8.2 Rapid Application Development** 

RAD is useful because TayDau Force can create prototypes quickly. The process is: 

Business Need -> Analysis -> Rapid Prototype -> User Validation -> Architecture -> Construction -> Verification -> Deployment -> Feedback 

The prototype shortens the distance between an idea and user feedback. The user can reject a wrong direction before the system spends time implementing the complete application. 

### **8.3 Kanban execution** 

Kanban provides the internal task flow. Agents take work only when its dependencies and Definition of Ready are satisfied. 

Typical states: 

Backlog -> Ready -> In Development -> Code Review -> QA -> Ready for Release -> Done 

Work in progress limits can be added later to stop the system from creating more parallel tasks than the runtime, budget or integration process can handle safely. 

### **8.4 DevSecOps** 

DevSecOps connects development, security and operations. Security tests, dependency checks, container checks and deployment controls run inside the delivery pipeline. 

### **8.5 Detailed 12-step project process** 

|**Step**|**Activity**|**Main output**|**Exit condition**|
|---|---|---|---|
|1|Client Idea|Product brief|Basic objective captured|
|2|Analysis|Requirements and acceptance<br>criteria|Scope is understandable|
|3|Prototype|Rapid prototype|Core flow can be reviewed|
|4|Validation|User feedback and approval|Major assumptions accepted|



11 

|**Step**|**Activity**|**Main output**|**Exit condition**|
|---|---|---|---|
|5|Architecture|Stack, data model, ADRs,<br>contracts|Architecture approved for build|
|6|Team Assembly|Required agents and specialists|Roles and permissions assigned|
|7|Build|Source code and tests|Development tasks implemented|
|8|Review|Review findings|Required review issues resolved|
|9|QA and Security|Test and security evidence|Release criteria satisfied|
|10|Deploy|Running release|Deployment health check passes|
|11|Monitor|Logs, metrics and incident<br>signals|Application is observable|
|12|Iterate|New requirements or fixes|Next RAD cycle begins when<br>needed|



## **9. Quality, verification and accountability** 

### **9.1 What accountable software means** 

Accountability means TayDau Force can show who or what performed each important action and why the project moved from one state to another. 

A user should be able to trace: 

Requirement -> Task -> Assigned Role -> Code Change -> Review -> Test -> Defect/Fix -> Approval -> Release 

For AI agents, "who" means the agent identity, role, prompt or configuration version, model, tool calls and execution record. Accountability does not require pretending that an AI agent has human legal responsibility. It means the software process has an audit trail instead of an unexplained final answer. 

### **9.2 What verified software means** 

Verified software means the system does not mark work complete only because the implementation agent reports success. Evidence must show that the defined acceptance criteria were checked. 

Example: 

REQ-007: A manager can assign a lead to a salesperson. 

A verified record may show: 

- frontend implementation completed 

- backend assignment endpoint completed 

- authorization check passed 

- database update test passed 

- browser workflow passed 

- QA approved acceptance criteria 

Only then is REQ-007 marked verified. 

This does not mean the software is guaranteed to contain zero defects. Verification means completion is evidencebased rather than trust-based. 

### **9.3 Requirement traceability** 

Each requirement should connect to: 

- acceptance criteria 

- design or architecture decision where relevant 

- implementation task 

- changed code or artifact 

- tests 

- defects 

- QA result 

12 

- security result where relevant 

- release version 

Traceability is one of the strongest differences between a prompt-driven coding experience and a managed delivery process. 

### **9.4 Quality gates** 

A release can use rules such as: 

- required build passes 

- required tests pass 

- no blocker QA defects remain 

- required code review is complete 

- critical security findings are zero 

- high security findings meet the project policy 

- required human approval is recorded 

- deployment plan and rollback information exist 

## **10. Security and DevSecOps model** 

TayDau Force should make a careful claim about security. It should not say that other AI coding tools produce insecure software or that TayDau Force can guarantee perfect security. Current products already include security controls, scanners, sandboxing and approval systems in different forms. 

The defensible claim is: 

_TayDau Force treats security assurance as a required delivery outcome. Security requirements, security testing, findings and release decisions are tied into the same project workflow as requirements, coding and QA._ 

NIST's Secure Software Development Framework recommends integrating secure development practices into the software lifecycle instead of treating security as a separate final task [6]. The OWASP Top 10:2025 includes Broken Access Control, Security Misconfiguration, Software Supply Chain Failures, Cryptographic Failures, Injection, Insecure Design and Authentication Failures among the main web application risks [7]. 

### **10.1 Security by design** 

Security begins in Layer 1 with security requirements and continues through architecture, development, testing and operations. 

The process is: 

Security Requirements -> Threat Modelling -> Secure Architecture -> Development Checks -> Security Testing -> Security Release Decision -> Monitoring 

### **10.2 Threat modelling** 

For projects that require it, the Security Specialist identifies: 

- sensitive assets 

- user roles and trust boundaries 

- exposed APIs and entry points 

- likely abuse cases 

- authentication and authorization risks 

- data protection requirements 

- external dependencies 

- operational threats 

The output becomes security requirements and test cases instead of a report that is disconnected from development. 

### **10.3 Automated security evidence** 

TayDau Force can integrate several types of tooling: 

13 

|**Check**|**Purpose**|
|---|---|
|SAST|Analyze source code for security weaknesses|
|DAST|Test the running application from the outside|
|SCA|Find vulnerable or unsupported dependencies|
|Secret Scan|Detect committed keys, tokens and credentials|
|Container Scan|Inspect container image vulnerabilities and configuration|
|IaC Scan|Check infrastructure configuration when Infrastructure as Code is<br>used|
|SBOM|Record the software components included in a release|



The Security Specialist should interpret the evidence where judgement is needed. Deterministic scanners should do the mechanical scanning. 

### **10.4 Authentication and authorization testing** 

TayDau Force should test both successful use and forbidden use. 

For example, an admin feature is not verified only because an administrator can open it. Tests should also check that a normal user cannot access the endpoint, an unauthenticated user is rejected, and one user cannot access another user's protected record when ownership rules apply. 

Broken Access Control remains A01 in OWASP Top 10:2025 [7]. This makes authorization testing a useful default for applications with multiple user roles. 

### **10.5 Security severity and release policy** 

Findings can use severity levels such as Critical, High, Medium and Low. 

A simple policy might be: 

- Critical: release blocked 

- High: release blocked unless an approved exception policy explicitly allows it 

- Medium: review required, with documented treatment 

- Low: may release if accepted by policy and recorded 

The exact thresholds should be project-configurable. TayDau Force should not hard-code one policy for every application. 

### **10.6 Security defects are normal project defects** 

A security finding should become a traceable defect with severity, evidence, affected requirement, owner and retest status. 

Example: 

SEC-017 

Severity: High 

Issue: Normal user can access another user's invoice by changing the identifier. 

Affected requirement: REQ-029 

Assigned role: Backend Engineer 

Release blocking: Yes 

After the fix, the relevant security test runs again before the issue closes. 

### **10.7 Secure software supply chain** 

AI agents can add packages quickly, which makes dependency control important. TayDau Force should track package versions, scan dependencies, avoid untrusted sources, protect branches, keep secrets out of source control and produce an SBOM for mature delivery workflows. 

14 

OWASP Top 10:2025 lists Software Supply Chain Failures as A03 and specifically points to dependency tracking, change management, separation of duties, repository security, CI/CD security and SBOM tooling as relevant concerns [7]. 

## **11. Docker, Kubernetes and execution isolation** 

### **11.1 Why Docker belongs in the architecture** 

TayDau Force allows agents to generate code, install packages, run builds and execute tests. Running that work directly on the host increases the blast radius of a bad command, a vulnerable package or malicious generated code. 

Each project should run inside an isolated workspace. Docker is a practical starting point because it provides separate namespaces and control groups for processes and resources. Docker's own security guidance discusses namespaces, cgroups, daemon exposure and Linux capabilities as important parts of container security [8]. 

A basic flow is: 

Agent -> Tool Gateway -> Permission Check -> Sandbox Manager -> Docker Container -> Command Result 

### **11.2 Container hardening** 

The platform should aim for: 

- non-root processes 

- CPU and memory limits 

- execution timeouts 

- limited disk use 

- restricted network access when possible 

- no unnecessary host mounts 

- no privileged containers 

- no host Docker socket inside untrusted project containers 

- minimal Linux capabilities 

- temporary or disposable environments 

- controlled secret injection 

Docker isolation is useful, but it should not be described as a perfect security boundary by itself. 

### **11.3 Where Kubernetes fits** 

Kubernetes is not necessary only because the product uses AI agents. It becomes useful when TayDau Force has many isolated project workloads, needs scheduling across machines, needs autoscaling, or requires centralized container policy. 

A production path may use Kubernetes for: 

- pod scheduling 

- resource quotas 

- namespaces 

- service accounts 

- RBAC 

- health checks 

- scaling 

- network policies 

- secret integration 

- workload restart and recovery 

Kubernetes recommends non-root workloads, disabling privilege escalation, avoiding privileged containers, dropping unnecessary capabilities and using resource requests and limits [9]. 

15 

### **11.4 Hackathon position** 

For the hackathon, the practical target is Docker plus Docker Compose or a small managed deployment. Kubernetes should be shown in the production architecture and implemented only if the core TayDau workflow is already reliable. 

This is an important tradeoff. A working multi-agent delivery loop is more valuable than a half-configured Kubernetes cluster. 

## **12. Project intelligence, memory and context management** 

### **12.1 One source of truth** 

Project intelligence should be structured rather than stored only in chat history. 

Suggested categories: 

- requirements 

- acceptance criteria 

- architecture decisions 

- design artifacts 

- tasks and dependencies 

- API contracts 

- data model 

- agent runs 

- changed files and commits 

- defects 

- test results 

- security findings 

- approvals 

- deployment records 

- costs 

### **12.2 Context Resolver** 

The Context Resolver decides what information an agent needs for a task. 

A backend agent implementing TASK-041 should receive the relevant requirement, acceptance criteria, API contract, related source files and architecture decision. It does not need every design discussion, every previous log line or the complete repository in the prompt. 

This improves cost, speed and accuracy. 

### **12.3 Prompt and agent versioning** 

Agent instructions should be versioned like code. 

Examples: 

- business-analyst-v1.2 

- qa-agent-v1.4 

- security-specialist-v1.1 

The execution log should record which agent configuration handled a task. If performance changes after a prompt update, the team can evaluate the change instead of guessing. 

### **12.4 Architecture Decision Records** 

An ADR can contain: 

- decision identifier 

- context 

- chosen approach 

- alternatives 

- reason 

16 

- consequences 

- status 

This gives later agents stable architecture memory. 

## **13. Cost model and Cost Governor** 

A serious TayDau Force design needs a unit economics model. Multi-agent systems can become expensive when every role uses a high-cost model, receives excessive context and retries repeatedly. 

### **13.1 Main cost categories** 

Project Cost = AI Inference + Execution Compute + Storage + Network + Deployment Infrastructure + External APIs 

The largest variable during development may be AI inference and sandbox compute, depending on project type. 

### **13.2 Dynamic model routing** 

The Cost Governor should choose the lowest-cost model class that is expected to complete the task reliably. 

|**Task type**|**Suggested model class**|
|---|---|
|Requirement formatting, classification, summaries|Low-cost fast model|
|Routine code edits and boilerplate|Low-cost coding model|
|Complex implementation|Strong coding model|
|Architecture and difficult reasoning|Strong reasoning model|
|Repeated failure|Controlled escalation|
|Critical final review|Strong review model if policy requires it|



This avoids assigning the equivalent of a senior architect to rename a button. 

### **13.3 Current Alibaba Model Studio pricing reference** 

Alibaba Cloud Model Studio prices vary by model, deployment region and context length. As of 25 August 2026, the official pricing page lists Qwen Flash at USD 0.022 per million input tokens and USD 0.216 per million output tokens for the <=128K tier in the listed global/Beijing pricing, while qwen3-coder-flash is listed at USD 0.144 per million input tokens and USD 0.574 per million output tokens for the <=32K tier in the listed regions [10]. 

These prices are reference points, not a fixed TayDau Force price. The platform should read current provider pricing and calculate actual usage rather than hard-code assumptions. 

### **13.4 Illustrative inference calculation** 

A hypothetical workload using 5 million qwen3-coder-flash input tokens and 1 million output tokens in the first pricing tier would cost: 

5 x USD 0.144 + 1 x USD 0.574 = USD 1.294 

A separate hypothetical Qwen Flash workload using 20 million input tokens and 2 million output tokens in its first tier would cost: 

20 x USD 0.022 + 2 x USD 0.216 = USD 0.872 

Combined inference cost in this narrow example would be USD 2.166 before compute, storage, network or external services. This is only an illustration of why routing and context size matter. A real project may use different models, context tiers and volumes. 

### **13.5 Cost reduction rules** 

TayDau Force should use several controls together: 

- activate only the agents the project needs 

- route simple tasks to cheaper models 

- send only relevant context 

- use context caching when the provider supports it and it is cost-effective 

17 

- use deterministic tools instead of LLM calls for deterministic questions 

- keep retries bounded 

- escalate only after evidence of failure 

- stop idle project compute 

- reuse stable project summaries and structured memory 

- measure cost per task and per verified requirement 

### **13.6 Cost per verified requirement** 

A useful product metric is: 

Cost per Verified Requirement = Total Project Delivery Cost / Number of Verified Requirements 

This connects technical cost to actual delivered value. A cheap agent loop that produces unverified code is not necessarily more efficient than a slightly more expensive workflow that closes requirements correctly. 

### **13.7 Budget states** 

A project can use budget thresholds such as: 

|**Budget state**|**Example behavior**|
|---|---|
|Normal|Standard routing|
|Warning|Prefer lower-cost models and reduce optional work|
|High|Restrict expensive retries and require justification|
|Exhausted|Stop non-critical AI work and request additional budget or human<br>decision|



Alibaba Function Compute also supports pay-as-you-go billing where charges apply to consumed resources and no charges apply when no resources are consumed [11]. This may be useful for event-driven control-plane work, while longer development sandboxes remain container workloads. 

## **14. Reliability, observability and recovery** 

### **14.1 Bounded retries** 

A failed task should not run forever. 

Suggested policy: 

Attempt 1 -> Retry with error evidence -> Retry with refined context or stronger specialist -> Human review or blocked state 

The Cost Governor can decide whether an escalation fits the remaining budget. 

### **14.2 Checkpoint and resume** 

Long-running projects need durable checkpoints. If the service restarts after 62 tasks, it should not begin again at Task 1. 

Store task state, agent run state, workspace reference, commits, artifacts and pending approvals so that work can resume safely. 

### **14.3 Idempotent operations** 

Operations with side effects should be designed so a retry does not create accidental duplicates. This matters for database creation, cloud resources, deployments, Git operations and external APIs. 

### **14.4 Observability** 

Every important run should record: 

- project ID 

- task ID 

- agent and role 

18 

- agent configuration version 

- model 

- tool calls 

- input and output token usage 

- duration 

- cost 

- status 

- errors 

- retry count 

- artifacts produced 

A project dashboard can then answer why a task is slow, expensive, failing or blocked. 

### **14.5 AIOps** 

AIOps belongs mainly after deployment. Monitoring can detect changes in errors, latency, resource use or application health. TayDau Force can create an incident, collect relevant logs and route the problem to DevOps, Backend or another specialist. 

AIOps should start as a limited monitoring and incident workflow in the MVP. Full automated remediation can come later because production actions carry higher risk. 

## **15. Data model and system services** 

The following conceptual entities support the architecture. 

|**Entity**|**Purpose**|
|---|---|
|projects|Project identity, status, budget, owner and lifecycle state|
|requirements|Functional, non-functional and security requirements|
|acceptance_criteria|Verifiable conditions linked to requirements|
|agents|Agent definitions and configuration versions|
|roles|Permissions and responsibilities|
|project_agents|Agents activated for a project|
|tasks|Work items, owners, states and outputs|
|task_dependencies|Dependency graph between tasks|
|agent_runs|Individual executions, models, tokens, cost and result|
|artifacts|Designs, documents, reports and generated files|
|code_changes|Branch, commit, files and task linkage|
|tests|Test definitions and links to requirements|
|test_runs|Test evidence and results|
|defects|QA and engineering defects|
|security_findings|Security evidence, severity and remediation state|
|approvals|Human or authorized role approvals|
|decisions|General decision log|
|adrs|Architecture Decision Records|
|deployments|Environment, version, status and rollback data|
|cost_events|Token, compute and external-service cost records|
|audit_logs|Immutable or tamper-resistant action history|
|checkpoints|Resume points for long-running workflows|



### **15.1 Main system services** 

A practical service architecture can include: 

19 

##### 1. Web Application 

- project brief input 

- project dashboard 

- agent activity 

- task board 

- approvals 

- reports 

2. API / Control Plane 

- authentication 

- project APIs 

- task and artifact APIs 

- approval APIs 

3. Orchestrator 

- state machine 

- dependency scheduler 

- workforce assembly 

- task routing 

- retry and escalation logic 

4. Model Gateway 

- provider abstraction 

- model selection 

- usage reporting 

5. Context Resolver 

- retrieves only relevant project context 

6. Tool Gateway 

- Git 

- file operations 

- terminal 

- browser 

- scanners 

- cloud APIs 

7. Workspace Manager 

- Docker sandbox creation 

- resource limits 

- cleanup 

8. Quality and Security Engine 

- test execution 

- QA evidence 

- SAST/DAST/SCA/secret scans 

- release policies 

9. Cost Governor 

- token and compute budgets 

- usage aggregation 

- model escalation rules 

10. Observability and Audit 

- logs 

- metrics 

- traces 

- audit trail 

## **16. Suggested hackathon technology stack** 

This is a recommended implementation stack, not a requirement of the product architecture. 

20 

|**Layer**|**Suggested hackathon technology**|
|---|---|
|Frontend|Next.js, TypeScript, Tailwind CSS|
|Backend / Orchestrator|FastAPI with Python, or Node.js if the team prefers one language|
|Database|PostgreSQL|
|AI|Alibaba Cloud Model Studio with Qwen models|
|Model interface|Internal Model Gateway with OpenAI-compatible abstraction where<br>practical|
|Real-time updates|Server-Sent Events or WebSocket|
|Project sandbox|Docker|
|Local multi-service setup|Docker Compose|
|Version control|Git|
|Browser testing|Playwright|
|Unit/integration tests|Framework appropriate to the generated stack|
|Security|SAST, dependency scan, secret scan, selected DAST for web apps|
|Artifact storage|Alibaba Object Storage Service where needed|
|Deployment|Alibaba Cloud services suitable for the workload|
|Scale-out option|ACK / Kubernetes after MVP|



Alibaba's ACK Serverless Basic clusters are positioned for development, testing and lightweight workloads, with cloud service fees as the main billing component [12]. This can be evaluated later if Kubernetes is needed during or after the hackathon. 

## **17. Comparison with existing AI development products** 

This section is intentionally conservative. TayDau Force should not build its pitch around features that competitors already provide. 

As of 25 August 2026, Lovable, Bolt, v0, Cursor and Qoder all provide substantial AI-assisted software development capabilities. The comparison below focuses on product emphasis rather than claiming that one product is incapable of a feature. 

|**Product**|**Current product emphasis**|**Important overlap with**<br>**TayDau Force**|**TayDau Force focus**|
|---|---|---|---|
|Lovable|Prompt-driven full-stack<br>product building, planning,<br>browser testing, deployment,<br>security scans and audit logs|Planning, autonomous work,<br>testing, full-stack delivery,<br>security controls|Formal organizational workflow,<br>role authority, requirement-to-<br>release traceability, independent<br>delivery evidence, cost<br>governance|
|Bolt|Browser-based AI app building,<br>full-stack generation, built-in<br>cloud, deployment, model<br>routing and context<br>management|Full-stack build, deployment,<br>model routing, version history|Project-level delivery<br>governance, dynamic workforce,<br>independent QA/security<br>decisions, operations and<br>traceability|
|v0|AI agent for UI and full-stack<br>apps, browser use, terminal<br>commands, isolated sandbox and<br>Vercel deployment|Full-stack generation, agent<br>tools, testing/debugging,<br>sandboxing, deployment|Business-to-release workflow,<br>role separation, security release<br>process, dynamic specialist<br>activation, project economics|
|Cursor|Developer-centered coding<br>agent, repository understanding,<br>terminal, browser, code review,<br>security review and developer<br>workflow integrations|Planning, code changes, tests,<br>browser validation, review and<br>security capabilities|Client/project-oriented software<br>organization rather than an IDE-<br>centered developer assistant|



21 

|**Product**|**Current product emphasis**|**Important overlap with**<br>**TayDau Force**|**TayDau Force focus**|
|---|---|---|---|
|Qoder|Agentic IDE and cloud agent<br>runtime; Experts Mode<br>coordinates Lead, Full-Stack, QA,<br>Code Review and other specialist<br>roles|Closest overlap: multi-agent<br>planning, engineering, QA,<br>review and parallel work|Broader business and delivery<br>lifecycle, formal role<br>permissions, security-by-design,<br>project traceability, Cost<br>Governor, operations and<br>verified delivery package|



Lovable currently describes end-to-end app building, autonomous planning and browser testing, and its work product also advertises security scans and audit logs [1][2]. Bolt describes full-stack app generation, built-in deployment and automatic model routing [3]. v0 describes full-stack app generation and agentic browser, terminal, error-fixing and isolated sandbox capabilities [4]. Cursor provides planning, code editing, terminal, browser and dedicated review features inside a developer-oriented coding environment [5]. Qoder Experts Mode already uses a Lead Agent, Full-Stack Engineer, QA, Code Reviewer, UI Operator and Debug Engineer for coordinated engineering work [13]. 

### **17.1 The Qoder challenge** 

Qoder Experts Mode is the most important comparison because it overlaps directly with the original TayDau Force idea of a project lead plus specialized engineering agents. 

TayDau Force should therefore avoid this claim: 

"We are different because we have a project manager, developer and QA agents." 

That is not enough. 

The stronger claim is: 

_TayDau Force treats the software project and its delivery governance as the product. It adds business analysis, structured requirements, role authority, requirement-to-release traceability, independent quality and security evidence, cost governance, deployment and operational feedback around the agent workforce._ 

Qoder can also be useful technology for TayDau Force. Qoder Cloud Agents provides managed agent runtimes, environments and sessions, while the Qoder Agent SDK exposes planning, tools, permissions, context and session management for embedded agents [14][15]. The team should evaluate hackathon access before deciding whether Qoder is only a development tool or part of the TayDau implementation. 

## **18. TayDau Force differentiators** 

Individual features are copyable. TayDau Force should not claim that no competitor can implement similar controls. The differentiation is the combined product abstraction and the workflow that the system enforces. 

### **18.1 Software delivery organization as the abstraction** 

Lovable, Bolt and v0 make it easy to go from a prompt to an application. Cursor and Qoder provide strong engineering agents. TayDau Force is designed around the project organization itself: requirements, roles, authority, work state, verification, security, cost and delivery. 

A useful positioning line is: 

_Lovable, Bolt and v0 automate much of app building. Cursor and Qoder automate engineering workflows. TayDau Force is designed to automate governed and accountable software delivery._ 

### **18.2 Dynamic AI workforce assembly** 

The system analyzes the project and activates only the roles it needs. A simple CRUD application may use a compact team. A data-heavy application may add a Database Specialist. A system handling sensitive information may require the Security Specialist and stricter approval policy. 

22 

### **18.3 Role permissions and separation of duties** 

Agents have allowed actions. The developer is not allowed to mark its own implementation as independently verified. High-risk deployment actions can require explicit human approval. 

### **18.4 Requirement-to-release traceability** 

A requirement keeps its identity through planning, implementation, tests, defects and release. This gives the client an answer to "How do you know this feature was delivered?" 

### **18.5 Evidence-based completion** 

A task does not become Done only because an LLM says "completed." Builds, tests, security scans, review results and approvals provide evidence. 

### **18.6 Security as a delivery outcome** 

Security requirements and security findings are part of the same project graph as normal requirements and defects. Security can block release according to policy. 

### **18.7 Cost Governor** 

TayDau Force treats the cost of reasoning and execution as part of system design. It can route models, reduce context, activate agents dynamically and stop uncontrolled retry loops. 

### **18.8 Full lifecycle through operations** 

The system does not stop at source code. It includes CI/CD, deployment, monitoring, backups, incident signals and the next iteration. 

### **18.9 Provider-agnostic model gateway** 

TayDau Force should be able to change models by task and over time. Alibaba Qwen can be the primary hackathon model family without hard-coding the architecture to one model forever. 

## **19. Hackathon MVP and production roadmap** 

The architecture describes the target system. The hackathon version should prove the central idea without trying to implement every enterprise feature. 

### **19.1 Must-have MVP** 

The recommended MVP includes: 

- project brief input 

- Business Analyst requirement generation 

- Project Manager task planning 

- Solution Architect output 

- dynamic activation of a small agent team 

- UI/UX or design specification 

- Full-Stack Engineer execution 

- Git-tracked code changes 

- Docker project sandbox 

- deterministic build and tests 

- Code Review 

- independent QA 

- basic security checks 

- requirement traceability 

- defect and rework loop 

- human approval for selected high-risk actions 

- cost and token tracking 

- final delivery report 

23 

### **19.2 Strong demo scenario** 

Use one fixed application that is complex enough to show real workflow but small enough to complete reliably. An example is a sales CRM, inventory system or student expense management application. 

The demo should visibly show: 

1. Client gives the brief. 

2. BA produces requirements and acceptance criteria. 

3. User sees a prototype or design plan and approves it. 

4. Architect defines the technical approach. 

5. TayDau Force assembles the team. 

6. Engineering agents implement tasks. 

7. Tests run inside the sandbox. 

8. QA rejects at least one deliberately failing requirement. 

9. A defect routes back to development. 

10. Security check provides evidence. 

11. Fixed work passes review. 

12. Deployment succeeds. 

13. Final report shows requirement status, QA, security and cost. 

A controlled failure and repair loop will explain TayDau Force better than showing ten agents all saying "working." 

### **19.3 Post-hackathon roadmap** 

Later phases can add: 

- Kubernetes scheduling for concurrent workloads 

- full multi-tenant isolation 

- expanded DevSecOps scanners 

- complete SBOM and provenance pipeline 

- enterprise SSO and policy administration 

- advanced database specialists 

- network and infrastructure specialists 

- AIOps incident investigation 

- automated rollback policies 

- richer benchmark suite for agent evaluation 

- cross-project organizational knowledge 

- usage-based pricing and customer budget controls 

## **20. Success metrics** 

TayDau Force needs measurable outcomes. Useful metrics include: 

|**Metric**|**Meaning**|
|---|---|
|Requirement coverage|Percentage of approved requirements linked to implementation|
|Verified requirement rate|Percentage of requirements that passed required evidence|
|First-pass QA rate|Work accepted by QA without rework|
|Defects per verified requirement|Quality signal normalized to delivered scope|
|Security findings by severity|Security posture at release|
|Cost per verified requirement|Economic efficiency|
|Time per verified requirement|Delivery speed|
|Agent retry rate|Reliability of agent execution|
|Escalation rate|How often human or stronger-model help is needed|
|Deployment success rate|Reliability of release process|
|Mean recovery time|Time to recover from failed workflow or deployment|



24 

|**Metric**|**Meaning**|
|---|---|
|Traceability completeness|Percentage of requirements with complete evidence chain|



For the hackathon, a small dashboard showing time, tokens, cost, passed tests, failed tests, defects and verified requirements will make the architecture easier to understand. 

## **21. Risks and design tradeoffs** 

### **21.1 Too many agents** 

More agents do not automatically improve quality. They add model calls, context transfer, coordination failures and cost. Use the smallest workforce that can preserve the required separation of duties and expertise. 

### **21.2 Agent disagreement** 

Two agents may make conflicting decisions. Stable requirements, ADRs, role authority and an Orchestrator reduce this risk. Human approval should resolve high-impact ambiguity. 

### **21.3 False confidence from tests** 

Passing tests only prove what the tests covered. QA should derive tests from requirements and risk, and the system should be careful not to call software "bug-free" or "fully secure." 

### **21.4 Security scanner noise** 

Automated scanners can produce false positives and miss business-logic flaws. Security evidence therefore combines tools with risk-based reasoning and human review for high-risk cases. 

### **21.5 Container security** 

Docker reduces exposure but is not a complete sandbox against every threat. Production isolation should use strict privileges, resource limits, controlled networks and stronger runtime controls where needed. 

### **21.6 Kubernetes complexity** 

Kubernetes can solve scaling and orchestration problems, but it also adds operational complexity. Do not adopt it before the workload needs it. 

### **21.7 Cost growth** 

Large contexts, long agent loops and premium models can destroy the economics. The Cost Governor is required, not optional, for a production system. 

### **21.8 Vendor dependence** 

The hackathon naturally uses Alibaba technologies, but the internal model gateway should keep TayDau Force portable enough to change or combine models later. 

## **22. Judge questions and suggested answers** 

### **22.1 "How is TayDau Force different from Lovable, Bolt or v0?"** 

Those products already do substantial full-stack generation, iteration and deployment. TayDau Force is focused on the managed delivery process around the code. A requirement becomes acceptance criteria, assigned tasks, implementation, independent QA and security evidence, and a release record. TayDau Force also models role permissions, cost and operational state as part of the project. 

### **22.2 "Isn't this just Qoder Experts Mode?"** 

Qoder Experts Mode is a close comparison and already proves that multiple specialized agents can coordinate engineering work. TayDau Force is designed one level above the coding team. It starts with business analysis and requirements, assembles the workforce based on the project, enforces role permissions and separation of duties, 

25 

tracks requirements through release, applies security and cost policies, and continues through deployment and operations. Qoder may also be used as part of the implementation if the hackathon access supports that architecture. 

### **22.3 "What do you mean by accountable software?"** 

Accountable means the platform can show which agent or human performed an action, which task and requirement it belonged to, what changed, what tools were used, and why the project was allowed to move forward. 

### **22.4 "What do you mean by verified software?"** 

Verified means the software is not considered complete only because the developer agent says it is complete. The required acceptance criteria must have evidence from tests, review, QA and security checks according to project policy. 

### **22.5 "Does verified mean bug-free?"** 

No. Verification gives evidence against defined requirements and tests. It reduces unsupported confidence, but it does not guarantee that every possible defect has been found. 

### **22.6 "How do you know AI-generated software is secure?"** 

TayDau Force does not assume generated code is secure. Security starts with requirements and threat modelling, then uses deterministic scans and security tests. Findings become project defects. Critical findings can block release. High-risk actions can require human approval. The platform produces security evidence, not a promise of perfect security. 

### **22.7 "Why use multiple agents instead of one strong model?"** 

Different roles provide separate context, permissions and independent judgement. The main reason for multiple agents is not to imitate an office. It is to separate responsibilities where independence matters and to activate specialist expertise only when the project requires it. Simple tasks can still use one agent. 

### **22.8 "Why use Docker?"** 

Agents execute generated code and commands. Docker gives each project a controlled environment with separate process and resource boundaries, which is safer and more reproducible than running every project directly on the TayDau host. 

### **22.9 "Why Kubernetes?"** 

Kubernetes is a scale-out tool, not a hackathon requirement. It becomes useful when TayDau Force needs to schedule many concurrent sandboxed workloads, enforce resource policies and recover containers across infrastructure. 

### **22.10 "Why RAD instead of Scrum?"** 

TayDau Force uses Agile principles but RAD fits AI-speed development better because the system can prototype and iterate quickly. Kanban manages continuous agent tasks, and DevSecOps handles the build, security, deployment and monitoring flow. A fixed human sprint calendar is not needed for every AI task. 

### **22.11 "Won't a multi-agent system be expensive?"** 

It can be expensive if every role uses the strongest model with full repository context and unlimited retries. TayDau Force activates only required specialists, routes tasks to suitable model classes, minimizes context, uses deterministic tools for deterministic checks, bounds retries, stops idle compute and tracks cost per task and verified requirement. 

### **22.12 "Can one agent perform multiple roles?"** 

Yes, when the project is small and the responsibilities do not require independent approval. For example, one FullStack Engineer can handle frontend and backend. TayDau Force splits roles when project complexity, parallelism, security or separation of duties requires it. 

26 

### **22.13 "What happens when an agent repeatedly fails?"** 

The workflow retries with the failure evidence, then may refine context, route the task to a specialist or stronger model, and finally escalate to a human or blocked state. Retries are bounded by policy and budget. 

### **22.14 "What if the model provider changes?"** 

The Model Gateway separates TayDau Force roles from the model provider. Models can be selected by task, cost and quality without rewriting the project workflow. 

## **23. TayDau Force engineering constitution** 

The following rules should guide implementation decisions. 

1. Every project has one structured source of truth. 

2. Requirements must be testable before they are treated as ready for development. 

3. Agents receive the minimum context and permissions they need. 

4. An implementation role cannot independently approve its own work. 

5. Deterministic tools are preferred for deterministic checks. 

6. Code changes are version controlled and linked to tasks. 

7. Generated code runs in controlled sandboxes, not directly on the host. 

8. Security requirements and evidence are part of the normal delivery lifecycle. 

9. Critical actions use risk-based human approval. 

10. Retries, tokens, compute and project budgets are bounded. 

11. Agent prompts and configurations are versioned and observable. 

12. Every important action leaves an audit record. 

13. Workflows are resumable after interruption. 

14. Architecture decisions are recorded and reused. 

15. Projects activate only the agents and specialists they need. 

16. Deployment requires defined quality and security evidence. 

17. Monitoring and user feedback can reopen the delivery cycle. 

18. TayDau Force reports uncertainty and limitations instead of claiming guaranteed correctness or security. 

## **24. References** 

[1] Lovable. "Build more. Manage less." Current Lovable product capabilities, including planning and browser testing. https://lovable.dev/a-smarter-lovable 

[2] Lovable. "Build the software that runs your business." Security scans, audit logs and enterprise governance claims. https://lovable.dev/for-work 

[3] Bolt. Official product page and AI app builder documentation. Full-stack generation, model routing, deployment and built-in cloud capabilities. https://bolt.new/ and https://bolt.new/use-cases/ai-app-builder 

[4] v0. Official documentation. Full-stack apps and agentic features including browser, terminal, sandbox and deployment workflows. https://api2.v0.dev/docs and https://api2.v0.dev/docs/agentic-features 

[5] Cursor. Official documentation. Agent, Plan Mode, terminal, browser and Agent Review. https://cursor.com/docs and https://prod.cursor.com/docs/agent/overview 

[6] National Institute of Standards and Technology. Secure Software Development Framework (SSDF) Version 1.1, NIST SP 800-218. https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-218.pdf 

[7] OWASP Foundation. OWASP Top 10:2025. https://owasp.org/Top10/2025/ 

[8] Docker. Docker Engine security documentation. https://docs.docker.com/engine/security/ 

[9] Kubernetes. Application Security Checklist. https://kubernetes.io/docs/concepts/security/applicationsecurity-checklist/ 

[10] Alibaba Cloud. Model Studio model pricing. https://www.alibabacloud.com/help/en/model-studio/modelpricing 

27 

[11] Alibaba Cloud. Function Compute billing overview and pay-as-you-go model. https://www.alibabacloud.com/help/en/functioncompute/billing-overview-of-fc 

[12] Alibaba Cloud. ACK Serverless cluster billing. https://www.alibabacloud.com/help/en/ack/serverlesskubernetes/product-overview/ack-serverless-cluster-billing-instructions 

[13] Qoder. Experts Mode documentation. Multi-agent Lead Agent, Full-Stack Engineer, QA, Code Reviewer, UI Operator and Debug Engineer roles. https://docs.qoder.com/user-guide/quest/experts-mode 

[14] Qoder. Cloud Agents overview. Managed runtime with Agent, Environment and Session concepts. https://docs.qoder.com/cloud-agents/overview 

[15] Qoder. Agent SDK overview. Embedded agent runtime with tools, permissions, context and session management. https://docs.qoder.com/cli/sdk/overview 

## **Appendix A. Example structured agent contract** 

A structured task contract reduces ambiguity between agents. The following is an example, not a fixed schema. Input: 

```
{
  "task_id": "TASK-021",
  "requirement_ids": ["REQ-004", "REQ-007"],
  "objective": "Implement user authentication",
  "acceptance_criteria": [
    "Valid credentials create an authenticated session",
    "Invalid credentials return an authorization error",
    "Password data is never returned from the API"
  ],
  "dependencies": ["TASK-016"],
  "allowed_paths": [
    "/api/auth/**",
    "/services/auth/**"
  ]
}
```

Output: 

```
{
  "task_id": "TASK-021",
  "status": "completed",
  "changed_files": [],
  "tests": [],
  "risks": [],
  "notes": []
}
```

The Orchestrator validates the contract before routing it. The agent receives only the permissions and context needed for the task. 

## **Appendix B. Example requirement trace** 

REQ-007: Manager can assign a lead to a salesperson. 

Trace: 

REQ-007 

- -> AC-007.1 Manager can select a salesperson 

- -> AC-007.2 Lead ownership is stored 

- -> AC-007.3 Unauthorized users cannot assign leads 

- -> TASK-031 Frontend assignment interface 

- -> TASK-032 Backend assignment endpoint 

- -> TEST-041 Authorized assignment succeeds 

- -> TEST-042 Unauthorized assignment is rejected 

28 

- -> QA-017 Browser workflow verified 

- -> SEC-009 Authorization evidence verified 

- -> RELEASE-003 Included 

Status: Verified 

## **Appendix C. Example release checklist** 

A production release can require: 

- all required requirements are implemented or explicitly deferred 

- required acceptance criteria passed 

- build completed successfully 

- required unit and integration tests passed 

- browser or end-to-end tests passed where applicable 

- code review completed 

- no blocker defects remain 

- security release policy passed 

- dependency and secret scans completed 

- backup or rollback plan exists for risky migrations 

- deployment configuration is version controlled 

- monitoring and health checks are configured 

- required human approval is recorded 

- release notes and delivery evidence are generated 

29 

