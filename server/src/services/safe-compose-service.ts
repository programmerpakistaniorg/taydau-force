import type { ServiceExecutionSpec, ResourcePolicy } from '../schemas/verification.js';

export interface ComposeValidationResult {
  valid: boolean;
  errors: string[];
  safeExecutionSpecs?: ServiceExecutionSpec[];
}

export class SafeComposeService {
  private static readonly DISALLOWED_PATTERNS = [
    { pattern: /privileged\s*:\s*true/i, message: 'Privileged container mode is strictly forbidden' },
    { pattern: /network_mode\s*:\s*['"]?host['"]?/i, message: 'Host networking mode is strictly forbidden' },
    { pattern: /pid\s*:\s*['"]?host['"]?/i, message: 'Host PID namespace is strictly forbidden' },
    { pattern: /ipc\s*:\s*['"]?host['"]?/i, message: 'Host IPC namespace is strictly forbidden' },
    { pattern: /devices\s*:/i, message: 'Arbitrary device mounts are strictly forbidden' },
    { pattern: /cap_add\s*:/i, message: 'Linux capability additions (cap_add) are strictly forbidden' },
    { pattern: /\/var\/run\/docker\.sock/i, message: 'Docker socket exposure is strictly forbidden' },
    { pattern: /volumes\s*:\s*\n\s*-\s*['"]?(\/|[a-zA-Z]:\\|\/etc|\/usr|\/var)/i, message: 'Host root or system directory volume mounts are forbidden' },
  ];

  /**
   * Validates raw untrusted docker-compose.yml content against security rules.
   */
  static validate(composeContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!composeContent || typeof composeContent !== 'string') {
      return { valid: false, errors: ['Empty or non-string docker-compose content'] };
    }

    for (const rule of this.DISALLOWED_PATTERNS) {
      if (rule.pattern.test(composeContent)) {
        errors.push(rule.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Compiles an approved SafeExecutionPlan from validated application type and manifest.
   */
  static compileExecutionPlan(
    applicationType: string,
    defaultPolicy?: Partial<ResourcePolicy>
  ): ServiceExecutionSpec[] {
    const basePolicy: ResourcePolicy = {
      cpuLimit: defaultPolicy?.cpuLimit || '1.0',
      memoryLimit: defaultPolicy?.memoryLimit || '512m',
      pidsLimit: defaultPolicy?.pidsLimit || 100,
      timeoutMs: defaultPolicy?.timeoutMs || 60000,
      readOnlyRootfs: true,
      dropAllCapabilities: true,
      noNewPrivileges: true,
    };

    const specs: ServiceExecutionSpec[] = [];

    if (applicationType === 'fullstack_web' || applicationType === 'api_service') {
      // Database Service
      specs.push({
        name: 'database',
        serviceType: 'database',
        image: 'postgres:16-alpine',
        internalPort: 5432,
        environment: {
          POSTGRES_DB: 'app_sandbox',
          POSTGRES_USER: 'sandbox_user',
        },
        healthCheckEndpoint: 'pg_isready -U sandbox_user -d app_sandbox',
        dependsOn: [],
        resourcePolicy: {
          ...basePolicy,
          memoryLimit: '256m',
          readOnlyRootfs: false, // Postgres needs minimal writable /var/lib/postgresql/data
        },
      });

      // Backend Service
      specs.push({
        name: 'backend',
        serviceType: 'backend',
        image: 'taydau-sandbox:v1',
        internalPort: 8000,
        environment: {
          DATABASE_URL: 'postgresql://sandbox_user:sandbox_pass@database:5432/app_sandbox',
          APP_ENV: 'test',
          PORT: '8000',
        },
        healthCheckEndpoint: '/health',
        dependsOn: ['database'],
        resourcePolicy: basePolicy,
      });
    }

    if (applicationType === 'fullstack_web' || applicationType === 'frontend_app') {
      // Frontend Service
      specs.push({
        name: 'frontend',
        serviceType: 'frontend',
        image: 'taydau-sandbox:v1',
        internalPort: 3000,
        environment: {
          PORT: '3000',
        },
        healthCheckEndpoint: '/',
        dependsOn: applicationType === 'fullstack_web' ? ['backend'] : [],
        resourcePolicy: basePolicy,
      });
    }

    // Integration Test Runner Service
    specs.push({
      name: 'test_runner',
      serviceType: 'test_runner',
      image: 'taydau-sandbox:v1',
      command: ['pytest', '-q', '--tb=short'],
      environment: {
        BACKEND_URL: 'http://backend:8000',
        FRONTEND_URL: 'http://frontend:3000',
      },
      dependsOn: specs.filter((s) => s.name !== 'test_runner').map((s) => s.name),
      resourcePolicy: basePolicy,
    });

    return specs;
  }
}
