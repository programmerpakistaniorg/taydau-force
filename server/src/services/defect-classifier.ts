import crypto from 'crypto';
import type { SandboxExecutionResult, FailingTestInfo } from './docker-sandbox.js';

export type FailureTaxonomy =
  | 'qa_passed'
  | 'product_defect'
  | 'qa_artifact_error'
  | 'qa_execution_error'
  | 'sandbox_error'
  | 'timeout'
  | 'review_blocker'
  | 'security_blocker'
  | 'infrastructure_error'
  | 'unknown_failure';

export type RoutingTarget = 'engineer' | 'qa_repair' | 'infrastructure_policy' | 'timeout_policy' | 'none';

export interface ClassificationResult {
  taxonomy: FailureTaxonomy;
  routingTarget: RoutingTarget;
  failureSignature: string;
  title: string;
  summary: string;
  evidence: Record<string, any>;
  isBlocking: boolean;
  failingTestName?: string;
  relatedRequirementCode?: string;
}

export class DefectClassifier {
  /**
   * Generates a stable deterministic failure signature hash.
   */
  static generateSignature(
    projectId: string,
    source: string,
    identifier: string,
    normalizedMessage: string,
    requirementCode?: string
  ): string {
    const raw = [
      projectId,
      source.toLowerCase(),
      (requirementCode || 'general').toLowerCase(),
      identifier.trim().toLowerCase(),
      normalizedMessage.replace(/\s+/g, ' ').trim().slice(0, 200).toLowerCase(),
    ].join('::');

    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  /**
   * Layered deterministic classification for Docker sandbox test executions.
   */
  static classifySandboxExecution(
    projectId: string,
    sandboxResult: SandboxExecutionResult,
    isolationError?: string
  ): ClassificationResult {
    // 1. Host wall-clock timeout
    if (sandboxResult.timedOut || sandboxResult.status === 'timeout') {
      const sig = this.generateSignature(projectId, 'sandbox', 'timeout', 'Host wall-clock timeout exceeded');
      return {
        taxonomy: 'timeout',
        routingTarget: 'timeout_policy',
        failureSignature: sig,
        title: 'Sandbox Wall-Clock Timeout',
        summary: `Execution exceeded wall-clock timeout (${sandboxResult.durationMs}ms)`,
        evidence: { durationMs: sandboxResult.durationMs, stdout: sandboxResult.stdout.slice(-1000), stderr: sandboxResult.stderr.slice(-1000) },
        isBlocking: true,
      };
    }

    // 2. Sandbox spawn / container engine failure
    if (sandboxResult.status === 'sandbox_error') {
      const sig = this.generateSignature(projectId, 'sandbox', 'docker_error', sandboxResult.errorMessage || 'Docker engine error');
      return {
        taxonomy: 'sandbox_error',
        routingTarget: 'infrastructure_policy',
        failureSignature: sig,
        title: 'Docker Sandbox Engine Failure',
        summary: sandboxResult.errorMessage || 'Docker container failed to initialize or execute',
        evidence: { errorMessage: sandboxResult.errorMessage, stderr: sandboxResult.stderr },
        isBlocking: true,
      };
    }

    // 3. Test Isolation / Fixture State Leakage
    if (isolationError || (sandboxResult.status === 'qa_error' && sandboxResult.errorMessage?.includes('ISOLATION'))) {
      const details = isolationError || sandboxResult.errorMessage || 'State leakage across tests';
      const sig = this.generateSignature(projectId, 'qa_harness', 'isolation_leakage', details);
      return {
        taxonomy: 'qa_artifact_error',
        routingTarget: 'qa_repair',
        failureSignature: sig,
        title: 'QA Test Isolation Leakage',
        summary: 'Acceptance tests exhibited fixture state contamination or order-dependence',
        evidence: { isolationError: details, stderr: sandboxResult.stderr },
        isBlocking: true,
      };
    }

    // 4. QA Artifact Syntax / Import / Collection Failure
    const combinedLogs = `${sandboxResult.stdout}\n${sandboxResult.stderr}`;
    const hasCollectionError = sandboxResult.exitCode === 4 || sandboxResult.exitCode === 5 ||
      /syntaxerror|importerror|modulenotfounderror|usageerror/i.test(combinedLogs) && (sandboxResult.testsPassed === 0 && sandboxResult.testsFailed === 0);

    if (hasCollectionError || sandboxResult.status === 'qa_error') {
      const firstFailing = sandboxResult.failingTests?.[0];
      const sig = this.generateSignature(
        projectId,
        'qa_artifact',
        firstFailing?.testName || 'collection_error',
        sandboxResult.errorMessage || combinedLogs.slice(0, 200)
      );
      return {
        taxonomy: 'qa_artifact_error',
        routingTarget: 'qa_repair',
        failureSignature: sig,
        title: 'QA Test Artifact Syntax/Import Error',
        summary: 'Generated QA acceptance test suite contains invalid imports, syntax errors, or collection failures',
        evidence: { exitCode: sandboxResult.exitCode, logs: combinedLogs.slice(-2000), failingTests: sandboxResult.failingTests },
        isBlocking: true,
      };
    }

    // 5. Pytest Process Crash / Internal Execution Error
    if (sandboxResult.exitCode !== 0 && sandboxResult.testsPassed === 0 && sandboxResult.testsFailed === 0) {
      const sig = this.generateSignature(projectId, 'qa_runner', 'process_crash', `Exit code ${sandboxResult.exitCode}`);
      return {
        taxonomy: 'qa_execution_error',
        routingTarget: 'infrastructure_policy',
        failureSignature: sig,
        title: 'QA Execution Harness Crash',
        summary: `Pytest process terminated abnormally with exit code ${sandboxResult.exitCode}`,
        evidence: { exitCode: sandboxResult.exitCode, stderr: sandboxResult.stderr },
        isBlocking: true,
      };
    }

    // 6. Valid Assertions Executed and Passed
    if (sandboxResult.exitCode === 0 && sandboxResult.testsPassed > 0 && sandboxResult.testsFailed === 0) {
      const sig = this.generateSignature(projectId, 'qa', 'all_passed', `${sandboxResult.testsPassed} tests passed`);
      return {
        taxonomy: 'qa_passed',
        routingTarget: 'none',
        failureSignature: sig,
        title: 'All Acceptance Tests Passed',
        summary: `Successfully verified ${sandboxResult.testsPassed} acceptance test(s) in isolated sandbox`,
        evidence: { testsPassed: sandboxResult.testsPassed, durationMs: sandboxResult.durationMs },
        isBlocking: false,
      };
    }

    // 7. Product Defect: Acceptance Assertion Failed against Implementation
    if (sandboxResult.testsFailed > 0) {
      const firstFailing = sandboxResult.failingTests?.[0];
      const testName = firstFailing?.testName || 'test_acceptance';
      const failMsg = firstFailing?.failureMessage || 'Assertion failed against production endpoint';
      
      // Extract requirement code if test name mentions it (e.g. test_req_001_...)
      const reqMatch = testName.match(/req_?(\d+)/i) || failMsg.match(/REQ-(\d+)/i);
      const reqCode = reqMatch ? `REQ-${reqMatch[1].padStart(3, '0')}` : undefined;

      const sig = this.generateSignature(projectId, 'product', testName, failMsg, reqCode);
      return {
        taxonomy: 'product_defect',
        routingTarget: 'engineer',
        failureSignature: sig,
        title: `Product Defect: ${testName}`,
        summary: `Implementation failed acceptance test: ${failMsg}`,
        evidence: {
          failingTests: sandboxResult.failingTests,
          testsPassed: sandboxResult.testsPassed,
          testsFailed: sandboxResult.testsFailed,
          exitCode: sandboxResult.exitCode,
          stderr: sandboxResult.stderr,
          stdout: sandboxResult.stdout.slice(-1500),
        },
        isBlocking: true,
        failingTestName: testName,
        relatedRequirementCode: reqCode,
      };
    }

    // 8. Unknown Failure Fallback
    const sig = this.generateSignature(projectId, 'unknown', 'unclassified', combinedLogs.slice(0, 100));
    return {
      taxonomy: 'unknown_failure',
      routingTarget: 'infrastructure_policy',
      failureSignature: sig,
      title: 'Unclassified Sandbox Execution Result',
      summary: 'Sandbox execution returned an ambiguous result without clear assertion or collection markers',
      evidence: { exitCode: sandboxResult.exitCode, stdout: sandboxResult.stdout, stderr: sandboxResult.stderr },
      isBlocking: true,
    };
  }

  /**
   * Classifies Code Reviewer findings.
   */
  static classifyCodeReviewFinding(
    projectId: string,
    finding: { ruleId?: string; category: string; severity: string; description: string; filePath?: string; isBlocking: boolean }
  ): ClassificationResult {
    const isBlocking = finding.isBlocking || finding.severity === 'critical' || finding.severity === 'high';
    const sig = this.generateSignature(
      projectId,
      'code_review',
      finding.ruleId || finding.category,
      finding.description
    );

    return {
      taxonomy: 'review_blocker',
      routingTarget: 'engineer',
      failureSignature: sig,
      title: `Code Review Blocker: ${finding.category}`,
      summary: finding.description,
      evidence: { ...finding },
      isBlocking,
    };
  }

  /**
   * Classifies Deterministic Security Gate findings.
   */
  static classifySecurityFinding(
    projectId: string,
    finding: { rule: string; severity: string; filePath?: string; evidence?: string }
  ): ClassificationResult {
    const sig = this.generateSignature(projectId, 'security_gate', finding.rule, finding.evidence || finding.rule);
    return {
      taxonomy: 'security_blocker',
      routingTarget: 'engineer',
      failureSignature: sig,
      title: `Security Blocker: ${finding.rule}`,
      summary: `Deterministic security gate detected ${finding.severity} rule violation: ${finding.rule} in ${finding.filePath || 'source files'}`,
      evidence: { ...finding },
      isBlocking: true,
    };
  }
}
