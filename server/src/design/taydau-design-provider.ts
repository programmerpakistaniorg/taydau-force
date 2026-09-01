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
    }
  ): Promise<GeneratedScreenResult> {
    const screenKey = options?.screenKey || `screen-${crypto.randomUUID().slice(0, 8)}`;
    const name = options?.screenName || 'Application Screen';
    const purpose = options?.purpose || screenPrompt.slice(0, 100);
    const deviceType = options?.deviceType || 'DESKTOP';

    const htmlContent = this.renderFallbackHtml(name, purpose, screenPrompt, deviceType);
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
      },
    };
  }

  async editScreen(
    providerProjectId: string,
    screenId: string,
    editPrompt: string,
    options?: { screenKey?: string; screenName?: string; purpose?: string }
  ): Promise<GeneratedScreenResult> {
    const screenKey = options?.screenKey || screenId;
    const name = options?.screenName || 'Revised Screen';
    const purpose = options?.purpose || `Revision: ${editPrompt.slice(0, 80)}`;
    const deviceType = 'DESKTOP';

    const revisedPrompt = `[REVISION: ${editPrompt}] Original Screen: ${name}`;
    const htmlContent = this.renderFallbackHtml(name, purpose, revisedPrompt, deviceType, editPrompt);
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
      const styleName = i === 1 ? 'High-Contrast Minimalist' : 'Modern Soft Slate';
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

  private renderFallbackHtml(
    name: string,
    purpose: string,
    prompt: string,
    deviceType: string,
    revisionNote?: string
  ): string {
    const revisionBlock = revisionNote ? `<div style="padding: 16px 28px 0;"><div style="background: #fef3c7; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 8px; font-size: 0.85rem; color: #92400e;"><strong>Applied Client Feedback:</strong> ${revisionNote}</div></div>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - TayDau Design Preview</title>
  <style>
    :root {
      --primary: #1e40af;
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --badge-bg: #eff6ff;
      --badge-text: #1e40af;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text-main); line-height: 1.5; padding: 24px; }
    .container { max-width: 1100px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { padding: 20px 28px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; display: flex; align-items: center; justify-content: space-between; }
    .header h1 { font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .badge { font-size: 0.75rem; background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.2); }
    .meta-bar { background: #f1f5f9; padding: 12px 28px; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--text-muted); display: flex; gap: 20px; }
    .body-content { padding: 28px; display: grid; grid-template-columns: 240px 1fr; gap: 28px; }
    .sidebar { border-right: 1px solid var(--border); padding-right: 20px; }
    .nav-item { padding: 10px 14px; border-radius: 8px; margin-bottom: 6px; font-size: 0.9rem; font-weight: 500; color: var(--text-muted); cursor: pointer; }
    .nav-item.active { background: var(--badge-bg); color: var(--badge-text); font-weight: 600; }
    .main-grid { display: grid; gap: 20px; }
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
    .kpi-card { background: var(--bg); border: 1px solid var(--border); padding: 18px; border-radius: 12px; }
    .kpi-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); }
    .kpi-val { font-size: 1.5rem; font-weight: 700; color: var(--text-main); margin-top: 4px; }
    .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .panel-title { font-size: 1rem; font-weight: 600; }
    .btn-primary { background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; }
    .table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
    .table th { background: #f8fafc; padding: 10px 14px; font-weight: 600; border-bottom: 1px solid var(--border); }
    .table td { padding: 12px 14px; border-bottom: 1px solid var(--border); }
    .status-pill { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; background: #ecfdf5; color: #047857; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><span>🎨</span> ${name}</h1>
      <span class="badge">${deviceType} Visual Wireframe</span>
    </div>
    <div class="meta-bar">
      <div><strong>Purpose:</strong> ${purpose}</div>
    </div>
    ${revisionBlock}
    <div class="body-content">
      <div class="sidebar">
        <div class="nav-item active">${name}</div>
        <div class="nav-item">Service Management</div>
        <div class="nav-item">Calendar & Bookings</div>
        <div class="nav-item">Customer Portal</div>
        <div class="nav-item">Settings & Profile</div>
      </div>
      <div class="main-grid">
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-title">Active Bookings</div>
            <div class="kpi-val">14</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Available Slots</div>
            <div class="kpi-val">8</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Daily Utilization</div>
            <div class="kpi-val">86%</div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">Today's Active Bookings & Bay Allocation</div>
            <button class="btn-primary">+ New Booking</button>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Customer / Vehicle</th>
                <th>Service Package</th>
                <th>Time Slot</th>
                <th>Bay #</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Sarah Johnson</strong><br><span style="color:#64748b;font-size:0.75rem;">Toyota RAV4 (ABC-1234)</span></td>
                <td>Premium Full Detailing</td>
                <td>09:00 AM - 11:30 AM</td>
                <td>Bay 1</td>
                <td><span class="status-pill">In Progress</span></td>
              </tr>
              <tr>
                <td><strong>Michael Chang</strong><br><span style="color:#64748b;font-size:0.75rem;">Tesla Model 3 (EV-8821)</span></td>
                <td>Interior Deep Clean</td>
                <td>11:30 AM - 01:00 PM</td>
                <td>Bay 2</td>
                <td><span class="status-pill" style="background:#eff6ff;color:#1d4ed8;">Confirmed</span></td>
              </tr>
              <tr>
                <td><strong>David Smith</strong><br><span style="color:#64748b;font-size:0.75rem;">BMW M3 (SPD-9921)</span></td>
                <td>Ceramic Coating & Polish</td>
                <td>02:00 PM - 05:00 PM</td>
                <td>Bay 3</td>
                <td><span class="status-pill" style="background:#f8fafc;color:#475569;">Scheduled</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
