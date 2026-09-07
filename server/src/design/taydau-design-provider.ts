import crypto from 'crypto';
import type {
  DesignProvider,
  DesignProjectResult,
  GeneratedScreenResult,
  DesignSystemResult,
} from './design-provider.js';

export class TayDauDesignProvider implements DesignProvider {
  readonly name = 'taydau_fallback';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async createProject(projectName: string, description?: string): Promise<DesignProjectResult> {
    const hash = crypto.createHash('sha256').update(projectName + (description || '')).digest('hex').slice(0, 16);
    return {
      providerProjectId: `taydau-proj-${hash}`,
      metadata: { projectName, description, provider: 'taydau_fallback' },
    };
  }

  async createDesignSystem(providerProjectId: string, brandSpec: any): Promise<DesignSystemResult> {
    const dsId = `taydau-ds-${crypto.randomUUID().slice(0, 8)}`;
    return {
      designSystemId: dsId,
      metadata: { brandSpec, providerProjectId },
    };
  }

  async generateScreen(
    providerProjectId: string,
    screenPrompt: string,
    options?: {
      screenKey?: string;
      screenName?: string;
      deviceType?: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'AGNOSTIC';
      designSystemId?: string;
      purpose?: string;
      sections?: string[];
      primaryActions?: string[];
      wireframeElements?: string[];
      brandColors?: { primary?: string; secondary?: string; background?: string; surface?: string; text?: string };
      isDegraded?: boolean;
      isDiagnosticOnly?: boolean;
    }
  ): Promise<GeneratedScreenResult> {
    const screenKey = options?.screenKey || `screen-${crypto.randomUUID().slice(0, 8)}`;
    const name = options?.screenName || 'Application Screen';
    const purpose = options?.purpose || screenPrompt.slice(0, 100);
    const deviceType = options?.deviceType || 'DESKTOP';

    const htmlContent = this.renderFallbackHtml(name, purpose, screenPrompt, deviceType, undefined, options);
    const sha256 = crypto.createHash('sha256').update(htmlContent, 'utf8').digest('hex');
    const screenId = `screen-${sha256.slice(0, 12)}`;

    return {
      screenId,
      screenKey,
      name,
      title: name,
      purpose,
      htmlContent,
      deviceType,
      sha256,
      metadata: {
        provider: 'taydau_fallback',
        generatedAt: new Date().toISOString(),
        promptSummary: screenPrompt.slice(0, 200),
        isDegraded: options?.isDegraded ?? false,
        isDiagnosticOnly: options?.isDiagnosticOnly ?? false,
      },
    };
  }

  async editScreen(
    providerProjectId: string,
    screenId: string,
    editPrompt: string,
    options?: {
      screenKey?: string;
      screenName?: string;
      purpose?: string;
      sections?: string[];
      primaryActions?: string[];
      wireframeElements?: string[];
      brandColors?: { primary?: string; secondary?: string; background?: string; surface?: string; text?: string };
    }
  ): Promise<GeneratedScreenResult> {
    const screenKey = options?.screenKey || screenId;
    const name = options?.screenName || 'Revised Screen';
    const purpose = options?.purpose || `Revision: ${editPrompt.slice(0, 80)}`;
    const deviceType = 'DESKTOP';

    const revisedPrompt = `[REVISION: ${editPrompt}] Original Screen: ${name}`;
    const htmlContent = this.renderFallbackHtml(name, purpose, revisedPrompt, deviceType, editPrompt, options);
    const sha256 = crypto.createHash('sha256').update(htmlContent, 'utf8').digest('hex');
    const newScreenId = `screen-rev-${sha256.slice(0, 12)}`;

    return {
      screenId: newScreenId,
      screenKey,
      name,
      title: name,
      purpose,
      htmlContent,
      deviceType,
      sha256,
      metadata: {
        provider: 'taydau_fallback',
        previousScreenId: screenId,
        editPrompt,
        revisedAt: new Date().toISOString(),
      },
    };
  }

  async generateVariants(
    providerProjectId: string,
    screenId: string,
    count: number = 2
  ): Promise<GeneratedScreenResult[]> {
    const variants: GeneratedScreenResult[] = [];
    for (let i = 1; i <= Math.min(count, 2); i++) {
      const styleName = i === 1 ? 'High-Contrast Clean' : 'Modern Soft Slate';
      const prompt = `Variant ${i}: ${styleName} theme layout for ${screenId}`;
      const htmlContent = this.renderFallbackHtml(`Variant ${i} (${styleName})`, `Alternative direction ${i}`, prompt, 'DESKTOP');
      const sha256 = crypto.createHash('sha256').update(htmlContent, 'utf8').digest('hex');
      variants.push({
        screenId: `var-${i}-${sha256.slice(0, 10)}`,
        screenKey: `${screenId}-var-${i}`,
        name: `Option ${String.fromCharCode(64 + i)}: ${styleName}`,
        title: `Option ${String.fromCharCode(64 + i)}`,
        purpose: `Alternative aesthetic: ${styleName}`,
        htmlContent,
        deviceType: 'DESKTOP',
        sha256,
        metadata: { variantIndex: i, styleName },
      });
    }
    return variants;
  }

  /**
   * Renders dynamic, neutral semantic wireframe HTML strictly bound to current-project metadata.
   * Eliminates all hardcoded domain templates, static portfolios, or fabricated marketing claims.
   */
  private renderFallbackHtml(
    name: string,
    purpose: string,
    prompt: string,
    deviceType: string,
    revisionNote?: string,
    options?: {
      sections?: string[];
      primaryActions?: string[];
      wireframeElements?: string[];
      brandColors?: { primary?: string; secondary?: string; background?: string; surface?: string; text?: string };
      isDegraded?: boolean;
      isDiagnosticOnly?: boolean;
    }
  ): string {
    const primaryColor = options?.brandColors?.primary || '#2563EB';
    const secondaryColor = options?.brandColors?.secondary || '#0D9488';
    const bgColor = options?.brandColors?.background || '#F8FAFC';
    const surfaceColor = options?.brandColors?.surface || '#FFFFFF';
    const textColor = options?.brandColors?.text || '#0F172A';

    const revisionBlock = revisionNote
      ? `<div style="padding: 12px 24px;"><div style="background: #FEF3C7; border: 1px solid #FDE68A; padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; color: #92400E; font-weight: 500;"><strong>⚡ Applied Client Feedback:</strong> ${escapeHtml(revisionNote)}</div></div>`
      : '';

    const degradedBlock = options?.isDiagnosticOnly
      ? `<div style="background: #FEE2E2; border-bottom: 1px solid #FCA5A5; padding: 10px 24px; font-size: 0.82rem; color: #991B1B; font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
          <span>⚠️ NON-CANONICAL DIAGNOSTIC PLACEHOLDER (Status: needs_attention, Approvable: false)</span>
          <span style="background: #EF4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem;">DIAGNOSTIC ONLY</span>
        </div>`
      : (options?.isDegraded
        ? `<div style="background: #EFF6FF; border-bottom: 1px solid #BFDBFE; padding: 8px 24px; font-size: 0.8rem; color: #1E40AF; font-weight: 500;">
            <span>ℹ️ Local Structural Fallback Rendered (Deterministic Wireframe Engine)</span>
          </div>`
        : '');

    // Extract dynamic sections
    const rawSections = (options?.sections && options.sections.length > 0)
      ? options.sections
      : extractSectionsFromPrompt(prompt);

    const rawActions = (options?.primaryActions && options.primaryActions.length > 0)
      ? options.primaryActions
      : ['Confirm Action', 'View Details'];

    const rawElements = (options?.wireframeElements && options.wireframeElements.length > 0)
      ? options.wireframeElements
      : [];

    const sectionsHtml = rawSections.map((sec, idx) => `
      <div class="section-card">
        <div class="section-header">
          <span class="section-num">${idx + 1}</span>
          <h3 class="section-title">${escapeHtml(sec)}</h3>
        </div>
        <div class="section-body">
          <p class="section-desc">Interactive component module for <strong>${escapeHtml(sec)}</strong>.</p>
          <div class="element-chips">
            ${rawElements.map(el => `<span class="chip">${escapeHtml(el)}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('\n');

    const actionsHtml = rawActions.map((act, idx) => `
      <button class="${idx === 0 ? 'btn-primary' : 'btn-secondary'}">${escapeHtml(act)}</button>
    `).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(name)} - Wireframe Specification</title>
  <style>
    :root {
      --primary: ${primaryColor};
      --secondary: ${secondaryColor};
      --bg: ${bgColor};
      --surface: ${surfaceColor};
      --text-main: ${textColor};
      --text-muted: #64748B;
      --border: #E2E8F0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text-main); line-height: 1.5; padding: 20px; min-height: 100dvh; }
    .screen-container { max-width: 1100px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04); }
    .nav-bar { padding: 16px 24px; background: #0F172A; color: white; display: flex; align-items: center; justify-content: space-between; }
    .brand-title { font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .device-badge { font-size: 0.75rem; background: rgba(255,255,255,0.15); padding: 3px 8px; border-radius: 6px; }
    .hero-banner { padding: 28px 24px; border-bottom: 1px solid var(--border); background: #F8FAFC; }
    .screen-heading { font-size: 1.5rem; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.02em; }
    .screen-purpose { font-size: 0.95rem; color: var(--text-muted); max-width: 800px; }
    .content-grid { padding: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; }
    .section-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px; transition: border-color 0.2s; }
    .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .section-num { width: 24px; height: 24px; border-radius: 6px; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; }
    .section-title { font-size: 1.05rem; font-weight: 700; }
    .section-desc { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; }
    .element-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { font-size: 0.75rem; background: #F1F5F9; border: 1px solid #E2E8F0; padding: 3px 8px; border-radius: 6px; color: #475569; }
    .action-bar { padding: 18px 24px; border-top: 1px solid var(--border); background: #F8FAFC; display: flex; gap: 12px; justify-content: flex-end; }
    .btn-primary { background: var(--primary); color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer; }
    .btn-secondary { background: white; color: var(--text-main); border: 1px solid var(--border); padding: 8px 18px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer; }
  </style>
</head>
<body>
  <div class="screen-container">
    ${degradedBlock}
    <div class="nav-bar">
      <div class="brand-title">
        <span>✦</span>
        <span>${escapeHtml(name)}</span>
      </div>
      <span class="device-badge">${escapeHtml(deviceType)}</span>
    </div>
    ${revisionBlock}
    <div class="hero-banner">
      <h1 class="screen-heading">${escapeHtml(name)}</h1>
      <p class="screen-purpose">${escapeHtml(purpose)}</p>
    </div>
    <div class="content-grid">
      ${sectionsHtml}
    </div>
    <div class="action-bar">
      ${actionsHtml}
    </div>
  </div>
</body>
</html>`;
  }
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function extractSectionsFromPrompt(prompt: string): string[] {
  const sections: string[] = [];
  const match = prompt.match(/Key Sections:\s*([^.]+)/i);
  if (match && match[1]) {
    const list = match[1].split(',').map(s => s.trim()).filter(Boolean);
    if (list.length > 0) return list;
  }
  return ['Overview & Status Summary', 'Core Operational Workspace', 'Action & History Panel'];
}
