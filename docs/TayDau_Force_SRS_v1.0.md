

# ~~oe~~ 

## **Revision History** 

|**Date**<br>**(dd/mm/yyyy)**|**Version**|**Description**|**Author**|
|---|---|---|---|
|28/08/2026|1.0|Initial SRS baseline for TayDau Force. Includes project scope,<br>functional and non-functional requirements, use cases,<br>architecture, security, methodology and hackathon work plan.|Muhammad Tayyab<br>Attari and TayDau Force<br>Team|



### **Document Status** 

This document is the Version 1.0 requirements baseline for the TayDau Force hackathon project. It defines the target product architecture and identifies which capabilities are mandatory for the hackathon MVP and which capabilities are intended for later expansion. 

2 

## **Table of Contents** 

1. Introduction 

2. Scope of the Project 

3. Overall System Description 

4. Functional Requirements 

5. Non-Functional Requirements 

6. System Architecture and Interfaces 

7. Use Case Diagram 

8. Usage Scenarios 

9. Data, Security and Governance Requirements 

10. Adopted Methodology 

11. Work Plan 

12. Acceptance and Validation Criteria 

13. Constraints, Risks and Out of Scope Items 

Appendix A. Requirements Traceability Summary 

Appendix B. Glossary and Abbreviations 

3 

## **1. Introduction** 

### **1.1 Purpose** 

This Software Requirements Specification defines the requirements for TayDau Force, an autonomous software delivery platform. The system accepts a business or product brief and manages the work needed to turn that brief into a tested, security-checked and traceable software delivery package. The document is written for the project team, hackathon evaluators, mentors, developers, testers and anyone responsible for reviewing the system. 

### **1.2 Product overview** 

TayDau Force is designed to behave like a controlled software delivery organization rather than a single coding assistant. The platform uses specialized AI roles, shared project state, deterministic engineering tools and policy-based controls. A typical project moves through business analysis, rapid prototyping, architecture, team assembly, implementation, code review, QA, security checks, deployment and monitoring. 

The platform does not treat every human job title as a permanent AI agent. A role becomes an agent when independent reasoning, responsibility or approval is needed. Reusable operations are handled as skills or tools, while mandatory controls are implemented as policies. This keeps the system simpler and reduces unnecessary model usage. 

### **1.3 Objectives** 

- Convert a product brief into structured requirements, acceptance criteria and a controlled delivery plan. 

- Assemble the AI roles required for the specific project instead of activating every possible specialist. 

- Keep project state, decisions, tasks, defects and evidence in one shared source of truth. 

- Execute generated code in isolated environments and use Git-based version control for traceability. 

- Use independent QA and security checks before a feature or release is accepted. 

- Control model, token, retry and compute cost through a Cost Governor. 

- Provide a delivery package that includes the working application, source code, technical artifacts, test evidence and release information. 

### **1.4 Intended audience** 

The main audience is the TayDau Force development team. The document can also be used by mentors, evaluators and future contributors to understand what the system must do and how its requirements will be verified. 

### **1.5 Definitions and abbreviations** 

|**Term**|**Definition**|
|---|---|
|ADR|Architecture Decision Record. A short record of a meaningful architecture decision, its reason,<br>alternatives and consequences.|
|AI Agent|A software role that uses an AI model to reason, make bounded decisions and perform authorized<br>tasks.|
|AIOps|Use of automation and AI techniques to assist monitoring, incident analysis and operational<br>response.|
|CI/CD|Continuous Integration and Continuous Delivery or Deployment.|



4 

|**Term**|**Definition**|
|---|---|
|DAST|Dynamic Application Security Testing against a running application.|
|DevSecOps|Development, security and operations practices integrated into one delivery workflow.|
|LLM|Large Language Model used by one or more TayDau Force agents.|
|MVP|Minimum Viable Product for the hackathon build.|
|QA|Quality Assurance.|
|RAD|Rapid Application Development.|
|RBAC|Role-Based Access Control.|
|SAST|Static Application Security Testing against source code or build artifacts.|
|SBOM|Software Bill of Materials containing software components and dependencies.|



## **2. Scope of the Project** 

### **2.1 Scope statement** 

The hackathon version of TayDau Force will demonstrate an end to end workflow for building a controlled web application project. A user provides a product brief. The system structures the requirements, supports rapid validation, plans the project, selects an AI workforce, executes development tasks, runs code and tests in isolated workspaces, performs independent QA and security checks, tracks cost and produces a delivery package. 

The architecture is designed for later expansion into a broader autonomous software delivery ecosystem. The SRS therefore includes several target capabilities that may be simplified in the hackathon MVP. Requirements marked Future are design targets and are not required for the first demonstration. 

### **2.2 In-scope capabilities** 

- Product brief intake and project creation. 

- Business analysis, user stories, business rules and acceptance criteria. 

- Rapid prototype review and human feedback. 

- Architecture planning and Architecture Decision Records. 

- Dynamic selection of core agents and on-demand specialists. 

- Task planning, dependencies, Kanban-style execution states and role permissions. 

- UI/UX, full-stack development, code review, QA and DevOps workflows. 

- Git-based version control and isolated development workspaces. 

- Docker-based code execution for the MVP. 

- Independent testing and requirement traceability. 

- Threat modelling, source scanning, dependency and secret scanning, and security release checks. 

- CI/CD, deployment support, monitoring hooks, backup and recovery policy design. 

- Shared project intelligence, task history, decision logs and audit trail. 

- Budget-aware model routing, token limits, retry limits and usage tracking. 

- Human approval for high-risk actions. 

- A final verified and secure software delivery package. 

5 

### **2.3 Out of scope for the hackathon MVP** 

- Guaranteed support for every programming language, framework, mobile platform and cloud provider. 

- A claim that generated software is bug-free or completely secure. 

- A fully autonomous production operation where destructive actions can occur without human approval. 

- A large-scale multi-cluster Kubernetes platform. Kubernetes is part of the target architecture and can be demonstrated if time permits. 

- Full enterprise AIOps, disaster recovery automation and advanced network administration. 

- Replacing every possible software-house role with a separate permanent agent. 

- Training a custom foundation model as part of the hackathon build. 

### **2.4 Stakeholders and actors** 

|**Actor / Stakeholder**|**Responsibility**|
|---|---|
|Client / Product Owner|Provides the business need, validates scope and prototype, reviews progress, examines<br>evidence and receives the final delivery.|
|Human Reviewer / Approver|Approves high-risk decisions, sensitive actions and release decisions when policy<br>requires human control.|
|System Administrator|Configures platform policies, budgets, model access, integrations and recovery<br>operations.|
|AI Agents|Perform bounded analysis, design, engineering, review, QA, security and operations<br>tasks according to role permissions.|
|External Model Provider|Provides LLM inference through the model gateway.|
|Source Control / Cloud<br>Platform|Provides repository, container, deployment or related infrastructure services.|



### **2.5 Assumptions** 

- The user provides a product brief with enough information to begin analysis or is available to answer clarification questions. 

- External AI model and cloud services are reachable and have valid credentials configured through protected platform settings. 

- The MVP focuses on web applications that can run in a containerized development environment. 

- Human approval is available when the configured risk policy requires it. 

- Security scanners and test tools may vary by technology stack, but the workflow requirement remains the same. 

## **3. Overall System Description** 

### **3.1 Product perspective** 

TayDau Force sits above individual coding models and development tools. The project is the main unit of work. The system stores project requirements, tasks, decisions, code changes, tests, security findings, costs and release state. Agents operate against that shared state through an orchestrator instead of keeping separate uncontrolled conversations. 

6 

|Analysisand<br>Rapid<br>Human<br>Architectureand<br>QAand<br>Releaseand<br>Feedbackand<br>Business<br>Need<br>Requirements<br>Prototype J°<sup>changes</sup>A Validation<br>TeamAssembly<br>CodeReview<br>Security<br>Deploy<br>Monitor<br>NextIteration<br>|
|---|
|i ee<br>newiteration|



|**Concept**|**Meaning**|
|---|---|
|Skill|Reusable capability used by an agent. Example: generate test cases.|
|Tool|Deterministic or executable operation. Example: Git, Docker, Playwright, compiler, scanner.|
|Policy|A mandatory control. Example: developers cannot approve their own work.|



## **4. Functional Requirements** 

Each requirement has a stable identifier. Priority uses Must, Should and Future. Must items form the hackathon baseline unless a technical dependency forces a documented exception. Should items improve the demonstration but can be reduced in scope. Future items belong to the target platform architecture. 

|**ID**|**Requirement**|**Priority**|**Verification**|
|---|---|---|---|
|FR-01|The system shall allow a user to create a project and submit a business or product<br>brief.|Must|Create project and confirm<br>stored brief.|
|FR-02|The system shall create a persistent project workspace and unique project identifier.|Must|Create two projects and<br>confirm separate state.|
|FR-03|The Business Analyst Agent shall convert the brief into structured functional<br>requirements and business rules.|Must|Compare generated<br>requirement set with the<br>submitted brief.|
|FR-04|The system shall identify missing or ambiguous information and request clarification<br>when required.|Must|Submit an incomplete brief<br>and confirm clarification is<br>raised.|
|FR-05|The system shall assign stable identifiers to requirements and acceptance criteria.|Must|Inspect requirement<br>records.|
|FR-06|The Business Analyst Agent shall produce acceptance criteria for implementation<br>requirements.|Must|Inspect acceptance criteria<br>for selected requirements.|
|FR-07|The analysis stage shall capture initial security and privacy requirements when the<br>project contains relevant data or access controls.|Must|Submit an authenticated<br>app brief and inspect<br>security requirements.|
|FR-08|The system shall allow the Client or Reviewer to approve, reject or request changes to<br>the requirement baseline.|Must|Exercise all three review<br>outcomes.|
|FR-09|The system shall support creation of a rapid prototype or interaction model before full<br>implementation.|Should|Generate and display a<br>prototype for a sample<br>project.|
|FR-10|The system shall record prototype feedback and update affected requirements or<br>tasks.|Should|Submit feedback and verify<br>changed project state.|
|FR-11|The Solution Architect Agent shall propose a technology stack, system structure, data<br>model and integration approach.|Must|Inspect architecture output<br>for a sample project.|
|FR-12|The system shall record meaningful architecture decisions as ADRs.|Should|Create an architecture<br>decision and inspect its<br>stored record.|
|FR-13|The Orchestrator shall determine which core agents and specialists are needed for a<br>project.|Must|Compare agent selection<br>for simple and higher-risk<br>project briefs.|
|FR-14|The system shall support dynamic activation of on-demand specialists instead of<br>starting every specialist for every project.|Should|Confirm a specialist is only<br>activated when required.|
|FR-15|The system shall assign role-based permissions to agents and tools.|Must|Attempt an unauthorized<br>action and confirm it is<br>denied.|



8 

|**ID**|**Requirement**|**Priority**|**Verification**|
|---|---|---|---|
|FR-16|The system shall access AI models through a model gateway or equivalent abstraction<br>rather than hard-coding all tasks to one model.|Should|Route at least two task<br>categories through<br>configured model classes.|
|FR-17|The Project Manager Agent shall create a backlog with task ownership, priority and<br>dependencies.|Must|Inspect generated project<br>backlog.|
|FR-18|The system shall enforce a Definition of Ready before a task enters active<br>development.|Must|Attempt to start an<br>incomplete task and<br>confirm it is blocked or<br>flagged.|
|FR-19|The Orchestrator shall assign ready tasks to authorized agents.|Must|Observe task assignment<br>and status change.|
|FR-20|Agents shall exchange task information through structured contracts containing task<br>ID, objective, relevant requirements, inputs, constraints and expected output.|Must|Inspect task payload for an<br>executed task.|
|FR-21|Engineering agents shall use isolated branches, worktrees or equivalent workspaces<br>for parallel code changes.|Should|Run two parallel tasks and<br>confirm isolated changes.|
|FR-22|Generated code and shell commands shall execute inside an isolated sandbox rather<br>than directly on the host application process.|Must|Execute build command<br>and confirm containerized<br>workspace.|
|FR-23|The system shall run deterministic build, lint, parser or test tools when those tools can<br>verify a condition directly.|Must|Run build and tests and<br>store the results.|
|FR-24|The system shall record Git commits or equivalent source-control history for<br>engineering changes.|Must|Inspect commit history<br>linked to tasks.|
|FR-25|The Code Review Agent shall review changes before they are eligible for QA when<br>review is required by policy.|Must|Submit a change and<br>confirm review result<br>exists.|
|FR-26|The QA Engineer shall independently verify relevant acceptance criteria and shall not<br>rely only on the developer agent statement.|Must|Compare QA evidence<br>against original acceptance<br>criteria.|
|FR-27|The system shall maintain traceability from requirement to task, implementation,<br>tests, defects and release evidence.|Must|Open one requirement and<br>inspect its linked records.|
|FR-28|A failed QA check shall create or update a defect and return work to an appropriate<br>engineering role.|Must|Force a failed test and<br>verify rework routing.|
|FR-29|The security workflow shall support threat modelling for projects or features that<br>meet configured risk conditions.|Should|Run threat model on an<br>authenticated sample<br>application.|
|FR-30|The system shall support static and dynamic security checks when compatible tools<br>are available for the selected stack.|Should|Run configured SAST or<br>DAST check and record<br>evidence.|
|FR-31|The system shall support dependency and secret scanning before release.|Must|Introduce a test secret or<br>vulnerable dependency<br>pattern and verify detection<br>where tool support exists.|
|FR-32|The release policy shall block release when unresolved findings exceed configured<br>severity thresholds.|Must|Create a release-blocking<br>finding and confirm<br>deployment is blocked.|
|FR-33|The system shall enforce separation of duties so that an implementation role cannot<br>approve its own work.|Must|Attempt self-approval and<br>confirm denial.|
|FR-34|The DevOps workflow shall build a release artifact through a repeatable CI/CD<br>process or an equivalent automated pipeline.|Must|Run pipeline and inspect<br>artifact/result.|
|FR-35|The system shall support deployment to a configured target environment after<br>required approvals pass.|Must|Deploy a test application to<br>the configured<br>environment.|



9 

|**ID**|**Requirement**|**Priority**|**Verification**|
|---|---|---|---|
|FR-36|The system shall record deployment status, health-check results and release<br>information.|Should|Inspect release record after<br>deployment.|
|FR-37|The platform shall support monitoring hooks and collection of basic application or<br>deployment health information.|Should|Trigger monitoring check<br>and inspect status.|
|FR-38|The target architecture shall support backup, restore and safe migration policies for<br>persistent data.|Future|Demonstrate policy<br>definition or a simple<br>backup/restore workflow.|
|FR-39|Shared Project Intelligence shall store project state, decisions, task history, ADRs,<br>defects and audit records.|Must|Inspect project history after<br>an end to end run.|
|FR-40|The Context Resolver shall provide agents only with relevant requirements, files,<br>decisions and dependencies needed for the current task.|Should|Inspect reduced context<br>package for selected tasks.|
|FR-41|The Cost Governor shall record model usage, token usage, retries and available cost<br>information by task and project.|Must|Run tasks and inspect<br>cost/usage records.|
|FR-42|The Cost Governor shall support model routing based on task type, complexity or<br>configured budget rules.|Should|Route a simple task and a<br>harder task through<br>different model classes or<br>policies.|
|FR-43|The system shall enforce bounded retries and escalate repeated failure instead of<br>retrying indefinitely.|Must|Force repeated failure and<br>confirm escalation after<br>configured limit.|
|FR-44|The system shall require human approval for configured high-risk actions such as<br>destructive data operations or production release.|Must|Trigger a high-risk action<br>and confirm approval<br>request.|
|FR-45|The workflow engine shall save checkpoints so a project can resume after an<br>interrupted agent or server execution.|Should|Interrupt a project and<br>resume from the latest safe<br>state.|
|FR-46|The system shall provide a project dashboard showing current phase, tasks, agents,<br>defects, QA status, security status and budget usage.|Must|Inspect dashboard during<br>an active project.|
|FR-47|The system shall generate a delivery package containing the working application,<br>source code and the technical evidence available for the project, including test, QA,<br>security and release records.|Must|Complete a sample project<br>and inspect the package.|
|FR-48|The target delivery package shall support an SBOM when a compatible package<br>inventory process is available.|Future|Generate or attach an<br>SBOM for a supported<br>sample project.|
|FR-49|The System Administrator shall be able to configure agent policies, model access,<br>budgets, approval rules and integration settings.|Should|Update a policy and<br>confirm it affects<br>subsequent execution.|
|FR-50|The system shall maintain an audit trail of important user, agent and tool actions.|Must|Inspect audit records for<br>one complete workflow.|



## **5. Non-Functional Requirements** 

|**ID / Category**|**Requirement**|
|---|---|
|NFR-01 Reliability|Project state shall be persisted after important workflow transitions so a restart does not require the project to<br>begin again.|
|NFR-02 Reliability|Repeated operations that can create external side effects should use idempotent or duplicate-safe handling<br>where practical.|
|NFR-03 Security|Generated code shall execute in isolated sandboxes with restricted privileges, resource limits and no<br>unnecessary host access.|



10 

|**ID / Category**|**Requirement**|
|---|---|
|NFR-04 Security|Production secrets and credentials shall not be hard-coded into generated source or stored in normal agent<br>memory.|
|NFR-05 Security|Agent permissions shall follow least privilege and role-based access control.|
|NFR-06 Security|High-risk actions shall require explicit approval according to project policy.|
|NFR-07 Security|The system shall keep an audit record for sensitive actions, approval decisions and release decisions.|
|NFR-08 Privacy|Project context sent to a model shall be limited to the information required for the assigned task where<br>practical.|
|NFR-09 Maintainability|Agent prompts, policies and tool definitions shall be versioned so behavior changes can be traced.|
|NFR-10 Maintainability|The model gateway shall separate agent logic from a specific model provider API where practical.|
|NFR-11 Maintainability|System components shall use clear interfaces for project state, task execution, model access, sandbox<br>execution and evidence storage.|
|NFR-12 Testability|Important workflow decisions shall produce records that can be checked through automated tests or audit<br>inspection.|
|NFR-13 Testability|Deterministic tests shall be preferred over model judgement when a compiler, test runner, parser, scanner or<br>direct API check can provide the answer.|
|NFR-14 Performance|The system shall use asynchronous or background execution for long-running agent, build and test<br>operations so the user interface remains responsive.|
|NFR-15 Performance|Task and model timeouts shall be configurable so a stalled operation does not block a project indefinitely.|
|NFR-16 Scalability|The execution design shall allow project sandboxes to be scheduled independently. Kubernetes or another<br>container orchestrator may be added when concurrent workload requires it.|
|NFR-17 Portability|The MVP shall use containerized execution so project workspaces can run consistently across supported host<br>environments.|
|NFR-18 Usability|The dashboard shall present project phase, task state, failures, approvals and release readiness without<br>requiring the user to inspect raw logs.|
|NFR-19 Usability|Failure messages shall identify the failed task, reason and next required action when the information is<br>available.|
|NFR-20 Accessibility|The user interface should use semantic controls, keyboard-accessible interactions and readable contrast in<br>the implementation selected for the MVP.|
|NFR-21 Observability|The system shall record agent runs, tool calls, duration, errors, retries and available usage information.|
|NFR-22 Cost Efficiency|Agents shall not receive the full project context when a smaller relevant context package is sufficient.|
|NFR-23 Cost Efficiency|The system shall allow lower-cost models to handle simple tasks and escalation to stronger models only<br>when policy allows it.|
|NFR-24 Cost Efficiency|Retries shall have configurable limits to prevent uncontrolled model and compute spending.|
|NFR-25 Recoverability|The platform shall support checkpoints or safe restart points for long-running project workflows.|
|NFR-26 Data Integrity|Requirements, decisions, defects and approvals shall use stable identifiers and shall not be silently<br>overwritten without history.|
|NFR-27 Compatibility|The MVP shall support at least one complete modern web application stack selected by the project team.|
|NFR-28 Documentation|The platform shall preserve enough project information to generate a requirements summary, architecture<br>description, test evidence and release notes.|
|NFR-29 Governance|A completed task or release shall only be marked verified when the evidence required by the configured<br>policy exists.|
|NFR-30 Governance|No engineering implementation role shall be allowed to provide the final approval for its own work.|



11 



<!-- Start of picture text -->
¥<br>TayDau Force 42% Client / Product Owner<br>Autonomous Software Delivery Organization Product Brief / Business Need<br>aise BUSINESS & PRODUCT INTELLIGENCE<br>INTELLIGENCE | @ _ Business Analyst Agent ney Project Manager Agent COST GOVERNOR<br>4) Be, *3 AiSaptaneUser Stori Haris +. TaskProfectDelegati Teckieg Validatedx  Scope {H<br>* Security Requirements + Risk Register }<br>COel, Project State —ee  ws RAPID PROTOTYPRapid Prototype& VAL I DATIONNG Dd a Human Validation=  / Approval ikeenap HHH ofe ‘iliteelouting<br>=| Share Memory gy ARCHITECTURE & WORKFORCE ASSEMBLY = Workforce Assembler / 0VaUser IterationFeedback/ HapH Token Budgets<br>a Solution« Tech Stack Architect Agent (jeandan 2mr®y—_Orchestrator+ Agent Selection QD Nise catean S<br>+* SystemData Model Design >| dynamic |+> +. Role Permisionstine Bpoidennoeic |||<br>° * Architecture Decision Records casio * Risk-Based Approval —o- Optimization<br>(TYUY ; EXECUTIONeeENGINE ¥ = ii anne ———————<br>=9 TaskHistory ey syfFull-Stack Core AgentsQ ; g o ) —(s/o= . = ss ——@ , r A me:<br>=| * ui/ux Engineer Code Review QA DevOps Database Security | | Network AlOps / Mobile /<br>Decision Log Designer Cromend Agent Engineer Engineer cele | Specialist } (pce oa seen 9 Retry Limits<br>(EB _obacklog > (Y) Ready —> InDevelopment —> £2, Code Review -@ ah = —> [BE ReadyforRelease —> FRI Done<br>Sp _ ADR Reposito -<br>Ee set Structured Contracts GB) Least Privilege Git Branching Definition of Ready QO definitionof Done Alp. Usage Tracking<br>ig Audit Trail 5] QUALITY, SECURITY=  & GOVERNANCE | PASS Budget-,<br>~ /|o—» a] cor (2)QiEvidence-Based5 VerificationOlThreat OS&SAST SeparationQi of Duties & COwo)Defect_ DevSecOpsOr.i Readiness2g |® Developersans cannot, | saciesta ||SO judget-Awarecreme<br>(6)rewrtf,PLATFORM, , Seochcens.EnviconmentsDocker  DEVSECOPS & OPERATIONS—_) ae io“e) cnacep sid EA KubernetesOrchestrationContainer= / | PS) Deployment > [A-][A~ Monitoring—aloe———_—& . > SS}oy RastareeBackups Piles& © CostRequirementper Verified<br>ig) Non-Root Containers BY RBAC ig] Safe Migrations @D bservabitty D checkpoint& Resume J<br>VERIFIED & SECURE SOFTWARE DELIVERY PACKAGE<br>Vlozs.|(oxi \fotz)(o.n.it (oe lottit [oeQa jorRele: owsBOM<br>PROCESS[ce Oo e-0--0--® -0--0—- 0-90 -®-- 0-0<br> SUMMARY Client Idea Analysis Prototype Validation Architecture Ase Build Review ve!i Deploy Monitor Iterate<br>BEST PRACTICES BB StructuredContracts Agent g Oneof Source Truth IB@ —_Human-in-the-LoopforHigh Risk be DeterministicTesting Q BoundedRetries ® Budget-AwareIntelligence om TraceabilityEnd-to-End<br><!-- End of picture text -->

|**Layer / Service**|**Purpose**|
|---|---|
|5. Quality, Security and Governance|Independent QA, traceability, threat modelling, scanning, defect handling, release<br>readiness and separation of duties.|
|6. Platform, DevSecOps and Operations|Docker sandboxes, CI/CD, container orchestration when needed, deployment, monitoring,<br>backup and recovery.|
|Shared Project Intelligence|Project state, shared memory, context resolver, task history, decisions, ADR repository and<br>audit trail.|
|Cost Governor|Model routing, budgets, context limits, retry limits, usage tracking and cost per verified<br>requirement.|



### **6.3 External interfaces** 

|**Interface**|**Description**|
|---|---|
|User Interface|Web dashboard for project brief entry, requirement review, prototype review, task status, approvals,<br>QA/security evidence, cost and delivery package.|
|Model Gateway|Internal interface to one or more AI model providers. It should hide provider-specific details from agent<br>logic.|
|Source Control|Git-compatible repository for branches, commits, reviews and traceable code history.|
|Sandbox Runtime|Docker-based execution for generated code, package installation, builds and tests.|
|CI/CD|Automated build, test and release workflow. Implementation may use the repository platform or a<br>dedicated pipeline service.|
|Cloud / Deployment|Configured target environment used to deploy the demo application.|
|Security Tools|Stack-compatible SAST, DAST, dependency and secret scanners.|
|Monitoring|Basic health, logs and operational signals for deployed applications.|



## **7. Use Case Diagram** 

The primary use cases focus on what a client, reviewer or system administrator does with TayDau Force. Internal agent activities are covered by functional requirements and workflow rules rather than treating every internal component as a user actor. 

13 



<!-- Start of picture text -->
TayDau Force<br>Client / Product Owner Cece ge atten ct ><br>Zert<br>><br>Ri<br>System Administrator |<br>Human Reviewer/ Approver |.<br>|<br><!-- End of picture text -->

## **8. Usage Scenarios** 

The following scenarios correspond to the use cases shown in Figure 3. Each scenario records the normal flow, alternatives and conditions that must hold before and after the use case. 

### **UC-01: Submit Product Brief** 

|**Field**|**Description**|
|---|---|
|Use Case Title|Submit Product Brief|
|Use Case ID|UC-01|
|Primary Actor|Client / Product Owner|
|Trigger|The user starts a new software project.|
|Preconditions|The user is authenticated and can create a project.|
|Main Actions|1. User selects New Project. 2. User enters the product or business brief. 3. System creates<br>the project workspace. 4. System stores the brief and starts analysis. 5. System shows the<br>new project status.|
|Alternative Paths|If the brief is incomplete, the system may request clarification before analysis continues.|
|Postconditions|A project record, project identifier and initial brief exist.|
|Exceptions|Model or storage service unavailable; invalid project input; project creation fails.|
|Author|TayDau Force Team|



### **UC-02: Review and Validate Requirements** 

|**Field**|**Description**|
|---|---|
|Use Case Title|Review and Validate Requirements|
|Use Case ID|UC-02|
|Primary Actor|Client / Product Owner; Human Reviewer / Approver|
|Trigger|The analysis stage produces a requirement baseline.|
|Preconditions|A project exists and the Business Analyst Agent has produced requirements.|
|Main Actions|1. System displays requirements, business rules and acceptance criteria. 2. User reviews<br>them. 3. User approves, rejects or requests changes. 4. System records the decision. 5.<br>Approved requirements become the active baseline.|
|Alternative Paths|User may edit or add clarification. The system regenerates affected requirements before<br>another review.|
|Postconditions|Requirements have a recorded review status and stable identifiers.|
|Exceptions|Required information remains unresolved; user lacks approval permission.|
|Author|TayDau Force Team|



### **UC-03: Review Prototype** 

|**Field**||**Description**|
|---|---|---|
|Use Case Title|Review Prototype||



15 

|**Field**|**Description**|
|---|---|
|Use Case ID|UC-03|
|Primary Actor|Client / Product Owner; Human Reviewer / Approver|
|Trigger|A rapid prototype is ready for review.|
|Preconditions|Requirements are sufficiently clear to prepare a prototype.|
|Main Actions|1. System presents the prototype. 2. User reviews main flows. 3. User approves or provides<br>feedback. 4. System records feedback. 5. Affected requirements or tasks are updated.|
|Alternative Paths|User may request another prototype iteration before approval.|
|Postconditions|Prototype status and feedback are stored.|
|Exceptions|Prototype build fails; preview environment unavailable.|
|Author|TayDau Force Team|



### **UC-04: Approve High-Risk Actions** 

|**Field**|**Description**|
|---|---|
|Use Case Title|Approve High-Risk Actions|
|Use Case ID|UC-04|
|Primary Actor|Human Reviewer / Approver|
|Trigger|An action reaches a configured risk threshold.|
|Preconditions|A pending action is marked as requiring human approval.|
|Main Actions|1. System pauses the action. 2. System shows the action, reason, risk and expected effect. 3.<br>Reviewer approves or rejects. 4. System records the decision. 5. Approved action resumes<br>or rejected action is blocked.|
|Alternative Paths|Reviewer may request changes or additional evidence before deciding.|
|Postconditions|A permanent approval record exists and the workflow follows the decision.|
|Exceptions|Approval expires, reviewer lacks permission or underlying task changes after approval.|
|Author|TayDau Force Team|



### **UC-05: Monitor Project Progress** 

|**Field**|**Description**|
|---|---|
|Use Case Title|Monitor Project Progress|
|Use Case ID|UC-05|
|Primary Actor|Client / Product Owner|
|Trigger|The user opens an active project.|
|Preconditions|A project exists.|
|Main Actions|1. System loads project phase, backlog, active agents, task states, defects, QA/security status<br>and budget usage. 2. User filters or opens a task. 3. System displays task history and<br>evidence.|



16 

|**Field**|**Description**|
|---|---|
|Alternative Paths|If no tasks are running, the dashboard shows the current waiting or approval state.|
|Postconditions|No project data is changed unless the user performs a separate action.|
|Exceptions|Project state cannot be loaded; integration data is temporarily unavailable.|
|Author|TayDau Force Team|



### **UC-06: Execute AI Delivery Workflow** 

|**Field**|**Description**|
|---|---|
|Use Case Title|Execute AI Delivery Workflow|
|Use Case ID|UC-06|
|Primary Actor|System / Orchestrator|
|Trigger|A validated project has ready work.|
|Preconditions|Required project state exists, tasks satisfy Definition of Ready and required model/tool<br>access is configured.|
|Main Actions|1. Orchestrator selects the next ready task. 2. Required role and model class are chosen. 3.<br>Context Resolver prepares relevant context. 4. Agent performs authorized work through<br>tools. 5. Results, usage and evidence are stored. 6. Workflow moves to review, QA or the<br>next task.|
|Alternative Paths|Independent tasks may execute in parallel. Failed tasks may retry within policy or escalate.|
|Postconditions|Task state, outputs, source-control records and usage records are updated.|
|Exceptions|Model failure; sandbox failure; tool permission denied; retry limit reached; budget limit<br>reached.|
|Author|TayDau Force Team|



### **UC-07: Review QA and Security Evidence** 

|**Field**|**Description**|
|---|---|
|Use Case Title|Review QA and Security Evidence|
|Use Case ID|UC-07|
|Primary Actor|Client / Product Owner; Human Reviewer / Approver|
|Trigger|A feature or release reaches the verification stage.|
|Preconditions|Implementation and required automated checks have completed.|
|Main Actions|1. System gathers acceptance criteria, test results, review records and security findings. 2.<br>QA verifies the required evidence. 3. Security checks are reviewed where required. 4.<br>System marks pass or creates rework. 5. User can inspect the evidence.|
|Alternative Paths|A failed item creates a defect and routes work back to the responsible role.|
|Postconditions|Verification status is recorded and is traceable to requirements.|
|Exceptions|Required evidence is missing; scanner unavailable; unresolved release-blocking defect<br>exists.|
|Author|TayDau Force Team|



17 

### **UC-08: Manage Budget and Cost Limits** 

|**Field**|**Description**|
|---|---|
|Use Case Title|Manage Budget and Cost Limits|
|Use Case ID|UC-08|
|Primary Actor|Client / Product Owner; System Administrator|
|Trigger|A project is created or budget policy must be changed.|
|Preconditions|User has permission to view or manage cost settings.|
|Main Actions|1. System shows usage and configured limits. 2. Authorized user sets or updates limits and<br>routing policy. 3. Cost Governor applies policy to subsequent work. 4. System records the<br>change.|
|Alternative Paths|System may recommend a cheaper model class or pause work when budget is nearly<br>exhausted.|
|Postconditions|Budget and routing policy are stored and auditable.|
|Exceptions|Invalid budget; user lacks permission; provider cost information unavailable.|
|Author|TayDau Force Team|



### **UC-09: Release and Deploy Application** 

|**Field**|**Description**|
|---|---|
|Use Case Title|Release and Deploy Application|
|Use Case ID|UC-09|
|Primary Actor|Human Reviewer / Approver|
|Trigger|The project reaches release readiness.|
|Preconditions|Required tests, QA, security checks and approvals have passed.|
|Main Actions|1. System confirms release readiness. 2. Reviewer approves deployment if required. 3.<br>CI/CD builds the release. 4. DevOps workflow deploys it. 5. Health checks run. 6. Release<br>record is stored.|
|Alternative Paths|If a release check fails, deployment stops and the system returns the project to rework.|
|Postconditions|A release and deployment record exists with health status.|
|Exceptions|Build failure; deployment target unavailable; health check fails; approval not granted.|
|Author|TayDau Force Team|



### **UC-10: Download Delivery Package** 

|**Field**||**Description**|
|---|---|---|
|Use Case Title|Download Delivery Package||
|Use Case ID|UC-10||
|Primary Actor|Client / Product Owner||



18 

|**Field**|**Description**|
|---|---|
|Trigger|A project or approved release is ready for handover.|
|Preconditions|A project has generated deliverable artifacts.|
|Main Actions|1. User selects Download Delivery Package. 2. System collects available artifacts. 3.<br>System produces or exposes the package. 4. User downloads the package.|
|Alternative Paths|User may download individual artifacts instead of the complete package.|
|Postconditions|The requested project artifacts are available to the user.|
|Exceptions|Artifact missing; packaging failure; user lacks access.|
|Author|TayDau Force Team|



### **UC-11: Configure System and Policies** 

|**Field**|**Description**|
|---|---|
|Use Case Title|Configure System and Policies|
|Use Case ID|UC-11|
|Primary Actor|System Administrator|
|Trigger|An administrator needs to change platform configuration.|
|Preconditions|Administrator is authenticated with configuration permission.|
|Main Actions|1. Administrator opens system settings. 2. Administrator configures model access, role<br>permissions, cost limits, approval rules or integrations. 3. System validates settings. 4.<br>System stores the configuration and audit record.|
|Alternative Paths|A change may be scheduled for future projects only rather than current active projects.|
|Postconditions|Valid configuration becomes active according to policy.|
|Exceptions|Invalid credentials, invalid model configuration, incompatible integration or permission<br>error.|
|Author|TayDau Force Team|



### **UC-12: Resume or Recover Project** 

|**Field**|**Description**|
|---|---|
|Use Case Title|Resume or Recover Project|
|Use Case ID|UC-12|
|Primary Actor|System Administrator|
|Trigger|A project was interrupted or an execution worker failed.|
|Preconditions|Project has persisted state or a safe checkpoint.|
|Main Actions|1. Administrator or recovery service selects the interrupted project. 2. System loads the<br>latest consistent state. 3. Incomplete side effects are checked. 4. Workflow resumes from a<br>safe point or reruns the current task. 5. Recovery is recorded in the audit trail.|
|Alternative Paths|If safe automatic recovery is not possible, the system requests manual review.|
|Postconditions|Project returns to a consistent active or paused state.|



19 

|**Field**|**Description**|
|---|---|
|Exceptions|Checkpoint is unavailable or corrupted; external side effect cannot be safely determined.|
|Author|TayDau Force Team|



## **9. Data, Security and Governance Requirements** 

### **9.1 Core project data** 

|**Entity**|**Minimum Information**|
|---|---|
|Project|Project identity, brief, current phase, status, owner and configuration.|
|Requirement|Requirement ID, text, type, status, source and related acceptance criteria.|
|Task|Task ID, assigned role, dependencies, state, objective, constraints and output references.|
|Agent Run|Role, model, task, context reference, start/end status, tokens, cost and errors.|
|Decision / ADR|Decision, reason, alternatives, consequences, authoring role and status.|
|Code Change|Repository, branch/workspace, commit or patch reference and linked task.|
|Test Evidence|Test name, requirement link, result, logs and execution time.|
|Security Finding|Finding ID, severity, source, affected requirement/component, status and remediation.|
|Defect|Defect ID, source, severity, owner, linked task/requirement and resolution state.|
|Approval|Action, reviewer, decision, timestamp, reason and evidence reference.|
|Release|Version, build, deployment target, approvals, health result and delivery artifacts.|
|Audit Event|Actor, action, object, result and timestamp.|



### **9.2 Security requirements** 

- Security requirements shall be identified during analysis when a project contains authentication, authorization, sensitive data, public APIs or other relevant risks. 

- Threat modelling shall be available before implementation for projects or features classified as higher risk. 

- Generated code shall be checked with deterministic security tools where the stack supports them. The target workflow includes SAST, DAST, dependency scanning and secret scanning. 

- Authentication and authorization tests shall include negative cases, such as an unauthorized user attempting to access another user or administrative function. 

- Sensitive credentials shall be supplied through protected configuration or secret-management mechanisms rather than normal source files or prompts. 

- Release policy shall be able to block deployment when unresolved findings exceed configured severity thresholds. 

- Security findings shall become tracked defects with ownership, status and retest evidence. 

- The delivery package should include a security report and, where supported, an SBOM. 

- The system shall not claim that an application is completely secure. Verification means the configured controls and evidence were completed. 

### **9.3 Governance rules** 

- Developers cannot approve their own work. 

20 



<!-- Start of picture text -->
(ene ) RequirementsAnalysis and PrototypeRapid J° changesA Validation Human ArchitectureTeam Assembly and Code Review SecurityQAand ReleaseDeploy and Monitor NextFeedback Iterationand<br>anew iteration ed<br><!-- End of picture text -->



<!-- Start of picture text -->
TayDau Force Hackathon Work Plan<br>SRS and scope baseline<br>Platform foundation and repository setup<br>BA, PM and orchestration workflow<br>Architecture, workforce and shared project state<br>Execution agents, Git and Docker sandbox<br>QA, security and release controls<br>DevSecOps, cost tracking and deployment flow<br>End-to-end integration and defect fixing<br>Demo, documentation and submission preparation<br>Final submission buffer<br>28 Aug 29 Aug 30 Aug 31 Aug 01 Sep 02 Sep 03 Sep 04 Sep 05 Sep<br>Date<br><!-- End of picture text -->

|**ID**|**Acceptance Criterion**|
|---|---|
|A-04|The system produces an architecture plan and selects a project workforce.|
|A-05|At least one engineering task is executed through a structured agent contract.|
|A-06|Generated code or tests run inside an isolated Docker workspace.|
|A-07|Source-control history links engineering changes to project tasks.|
|A-08|QA verifies at least one requirement independently and a forced failure produces rework.|
|A-09|The workflow records at least one security check or security finding path.|
|A-10|An implementation role cannot approve its own work.|
|A-11|The Cost Governor records model usage and enforces a retry or budget rule.|
|A-12|A high-risk action can pause for human approval.|
|A-13|The project dashboard shows project state, active work and verification status.|
|A-14|An approved sample project can be built and deployed or prepared as a release artifact.|
|A-15|The system produces a delivery package with source and available project evidence.|



## **13. Constraints, Risks and Out of Scope Items** 

### **13.1 Main constraints** 

- The hackathon build window is short, so the MVP must prove the workflow before expanding specialist depth. 

- External model, repository and cloud services depend on available access, quotas and credentials. 

- Security scanners differ by programming language and framework, so the exact tools may change while the security workflow remains the same. 

- Large multi-agent systems can consume significant tokens and compute if routing, context and retries are not controlled. 

- Kubernetes is useful for scale but can consume implementation time that is better spent on the core delivery workflow during the hackathon. 

### **13.2 Main risks and responses** 

|**Risk**|**Response**|
|---|---|
|Agent loop or repeated failure|Bound retries, use error context, escalate model or specialist, then require human review.|
|Conflicting agent decisions|Use one shared project state, stable requirement IDs and ADRs.|
|Unsafe generated code|Use isolated Docker sandboxes, least privilege, resource limits and restricted tools.|
|False completion claim|Require deterministic evidence and independent QA before verification.|
|Security weakness|Start with security requirements, use scans and tests, track findings and block release when<br>policy requires.|
|Cost growth|Use the Cost Governor, reduced context, cheaper models for simple tasks and bounded retries.|
|Parallel code conflicts|Use isolated branches/worktrees and controlled merge/review workflow.|
|Interrupted workflow|Persist state and use checkpoints or safe restart points.|
|Over-complex MVP|Keep specialists dynamic and focus implementation on the core end to end path.|



23 

## **Appendix A. Requirements Traceability Summary** 

|**Requirement Area**|**Functional Requirements**|**Related Use Cases**|
|---|---|---|
|Business Need and Scope|FR-01 to FR-10|UC-01, UC-02, UC-03|
|Architecture and Workforce|FR-11 to FR-16|UC-06|
|Planning and Engineering Execution|FR-17 to FR-25|UC-05, UC-06|
|QA, Security and Governance|FR-26 to FR-33|UC-04, UC-07, UC-09|
|DevSecOps and Operations|FR-34 to FR-38|UC-09, UC-12|
|Shared Intelligence and Context|FR-39 to FR-40|UC-05, UC-06, UC-12|
|Cost and Bounded Autonomy|FR-41 to FR-44|UC-04, UC-08|
|Recovery, Dashboard and Delivery|FR-45 to FR-50|UC-05, UC-10, UC-11, UC-12|



## **Appendix B. Glossary and Abbreviations** 

The definitions in Section 1.5 apply throughout this SRS. Product-specific terms used frequently are listed below for quick reference. 

|**Term**|**Meaning**|
|---|---|
|Cost Governor|Cross-cutting service that records usage and applies model, budget, context and retry policies.|
|Definition of Ready|Minimum information and dependency condition required before a task can enter active<br>development.|
|Definition of Done|Required implementation, test, review, traceability and QA evidence before a task is accepted<br>as complete.|
|Dynamic Workforce Allocation|Selection of only the agents and specialists required by the project.|
|Shared Project Intelligence|Structured project state and history used by agents and users.|
|Structured Agent Contract|Machine-readable task input and output structure used between the Orchestrator and an agent.|
|Verified Software|Software for which the configured requirement, test, QA, security and release evidence has<br>been completed. It does not mean zero defects are guaranteed.|



#### **End of Software Requirements Specification** 

24 

