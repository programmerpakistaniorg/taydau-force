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
    const revisionBlock = revisionNote
      ? `<div style="padding: 16px 28px 0;"><div style="background: #fef3c7; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 10px; font-size: 0.85rem; color: #92400e; font-weight: 500;"><strong>⚡ Applied Client Feedback:</strong> ${revisionNote}</div></div>`
      : '';

    const lower = (name + ' ' + purpose + ' ' + prompt).toLowerCase();
    const isPortfolio =
      lower.includes('portfolio') ||
      lower.includes('ui/ux') ||
      lower.includes('designer') ||
      lower.includes('services') ||
      lower.includes('showcase') ||
      lower.includes('case study');

    if (isPortfolio) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - UI/UX Portfolio & Design Services</title>
  <style>
    :root {
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --secondary: #ec4899;
      --bg: #0b0f19;
      --surface: #111827;
      --surface-hover: #1f2937;
      --border: #1f2937;
      --text-main: #f9fafb;
      --text-muted: #9ca3af;
      --accent-glow: rgba(99, 102, 241, 0.15);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text-main); line-height: 1.6; padding: 24px; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    
    /* Topbar Navigation */
    .nav { padding: 18px 32px; background: rgba(17, 24, 39, 0.95); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; backdrop-filter: blur(12px); }
    .brand { display: flex; items-center; gap: 10px; font-weight: 800; font-size: 1.15rem; letter-spacing: -0.02em; }
    .brand-icon { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
    .nav-links { display: flex; gap: 24px; align-items: center; font-size: 0.88rem; font-weight: 600; color: var(--text-muted); }
    .nav-links a { color: inherit; text-decoration: none; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: var(--text-main); }
    .btn-cta { background: linear-gradient(135deg, var(--primary), var(--primary-hover)); color: white; border: none; padding: 9px 20px; border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35); transition: transform 0.15s, box-shadow 0.15s; }
    .btn-cta:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5); }

    /* Hero Section */
    .hero { padding: 48px 32px 40px; text-align: center; border-bottom: 1px solid var(--border); background: radial-gradient(circle at 50% 0%, var(--accent-glow) 0%, transparent 70%); }
    .pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px; border-radius: 9999px; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.25); color: #818cf8; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px; }
    .hero h1 { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1.15; max-width: 800px; margin: 0 auto 16px; }
    .hero h1 span { background: linear-gradient(135deg, #a5b4fc, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 1.05rem; color: var(--text-muted); max-width: 640px; margin: 0 auto 28px; }
    .hero-actions { display: flex; justify-content: center; gap: 14px; }
    .btn-secondary { background: var(--surface-hover); color: var(--text-main); border: 1px solid var(--border); padding: 9px 20px; border-radius: 10px; font-weight: 600; font-size: 0.85rem; cursor: pointer; }

    /* Work Showcase Grid */
    .section-wrap { padding: 36px 32px; }
    .section-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
    .section-title { font-size: 1.35rem; font-weight: 800; letter-spacing: -0.02em; }
    .section-subtitle { font-size: 0.88rem; color: var(--text-muted); margin-top: 4px; }
    .portfolio-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
    .project-card { background: rgba(31, 41, 55, 0.4); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; transition: transform 0.2s, border-color 0.2s; }
    .project-card:hover { transform: translateY(-3px); border-color: rgba(99, 102, 241, 0.4); }
    .card-thumb { height: 180px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); display: flex; align-items: center; justify-content: center; position: relative; }
    .card-thumb-2 { background: linear-gradient(135deg, #831843 0%, #9d174d 50%, #be185d 100%); }
    .card-thumb-3 { background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%); }
    .metric-badge { position: absolute; bottom: 12px; right: 12px; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; color: #34d399; }
    .card-body { padding: 20px; }
    .card-tags { display: flex; gap: 8px; margin-bottom: 10px; }
    .tag { font-size: 0.72rem; padding: 3px 8px; border-radius: 6px; background: rgba(255,255,255,0.06); color: var(--text-muted); font-weight: 600; }
    .card-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 6px; }
    .card-desc { font-size: 0.85rem; color: var(--text-muted); line-height: 1.45; }

    /* Services Matrix */
    .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin-top: 16px; }
    .service-card { background: rgba(17, 24, 39, 0.8); border: 1px solid var(--border); border-radius: 14px; padding: 24px; }
    .service-icon { font-size: 1.8rem; margin-bottom: 14px; display: inline-block; }
    .service-title { font-size: 1.05rem; font-weight: 700; margin-bottom: 8px; }
    .service-desc { font-size: 0.84rem; color: var(--text-muted); margin-bottom: 16px; line-height: 1.45; }
    .service-list { list-style: none; font-size: 0.8rem; color: #d1d5db; }
    .service-list li { margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .check { color: #34d399; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <header class="nav">
      <div class="brand">
        <div class="brand-icon">✦</div>
        <span>SOFIA STUDIO</span>
      </div>
      <nav class="nav-links">
        <a href="#work" class="active">Selected Work</a>
        <a href="#services">Services</a>
        <a href="#process">Design Process</a>
        <a href="#about">About</a>
      </nav>
      <button class="btn-cta">Start a Project →</button>
    </header>

    ${revisionBlock}

    <section class="hero">
      <div class="pill">✦ UI/UX & Product Design Specialist</div>
      <h1>Crafting High-Converting <span>Digital Experiences</span> & Design Systems</h1>
      <p>Helping innovative tech founders and fast-growing businesses turn complex workflows into intuitive, world-class digital products.</p>
      <div class="hero-actions">
        <button class="btn-cta">Explore Featured Case Studies</button>
        <button class="btn-secondary">Book 15-Min Discovery Call</button>
      </div>
    </section>

    <section class="section-wrap" id="work">
      <div class="section-header">
        <div>
          <h2 class="section-title">Featured Client Case Studies</h2>
          <p class="section-subtitle">Verified business outcomes through human-centered product design</p>
        </div>
        <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">Showing 3 of 12 Projects</span>
      </div>

      <div class="portfolio-grid">
        <div class="project-card">
          <div class="card-thumb">
            <span style="font-size: 2.5rem;">📊</span>
            <div class="metric-badge">+142% Signups</div>
          </div>
          <div class="card-body">
            <div class="card-tags">
              <span class="tag">FinTech SaaS</span>
              <span class="tag">Design System</span>
            </div>
            <h3 class="card-title">Apex Wealth Management</h3>
            <p class="card-desc">Redesigned complex multi-asset investment portfolio dashboards with instant execution and clean data hierarchy.</p>
          </div>
        </div>

        <div class="project-card">
          <div class="card-thumb card-thumb-2">
            <span style="font-size: 2.5rem;">⚡</span>
            <div class="metric-badge">4.9 ★ Rating</div>
          </div>
          <div class="card-body">
            <div class="card-tags">
              <span class="tag">Mobile App</span>
              <span class="tag">iOS & Android</span>
            </div>
            <h3 class="card-title">HyperFlow Task Orchestrator</h3>
            <p class="card-desc">Zero-friction team collaboration tool engineered for engineering leads and remote product squads.</p>
          </div>
        </div>

        <div class="project-card">
          <div class="card-thumb card-thumb-3">
            <span style="font-size: 2.5rem;">🛍️</span>
            <div class="metric-badge">$3.2M Added GMV</div>
          </div>
          <div class="card-body">
            <div class="card-tags">
              <span class="tag">E-Commerce</span>
              <span class="tag">Conversion CRO</span>
            </div>
            <h3 class="card-title">Lumina Luxury Goods</h3>
            <p class="card-desc">End-to-end checkout redesign and interactive product configurator maximizing average order values.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section-wrap" id="services" style="background: rgba(15, 23, 42, 0.4); border-top: 1px solid var(--border);">
      <div class="section-header">
        <div>
          <h2 class="section-title">Core Services & Capabilities</h2>
          <p class="section-subtitle">Dedicated sprint-based design partnerships from prototype to production</p>
        </div>
      </div>

      <div class="services-grid">
        <div class="service-card">
          <div class="service-icon">🎨</div>
          <h3 class="service-title">UI/UX Product Design</h3>
          <p class="service-desc">Complete user research, wireframing, high-fidelity mockups, and interactive clickable prototypes.</p>
          <ul class="service-list">
            <li><span class="check">✓</span> User Flow & Architecture Mapping</li>
            <li><span class="check">✓</span> Figma Component Libraries</li>
            <li><span class="check">✓</span> 2-Week Sprint Turnarounds</li>
          </ul>
        </div>

        <div class="service-card">
          <div class="service-icon">🧩</div>
          <h3 class="service-title">Design Systems & Tokens</h3>
          <p class="service-desc">Scalable, accessible design tokens and component kits that keep engineering and product teams perfectly aligned.</p>
          <ul class="service-list">
            <li><span class="check">✓</span> WCAG 2.1 AA Accessibility</li>
            <li><span class="check">✓</span> Tailwind & CSS Token Specs</li>
            <li><span class="check">✓</span> Interactive Component Storybooks</li>
          </ul>
        </div>

        <div class="service-card">
          <div class="service-icon">🚀</div>
          <h3 class="service-title">Conversion & Growth CRO</h3>
          <p class="service-desc">Data-backed UI redesigns targeting key conversion bottlenecks, onboarding funnels, and checkout flows.</p>
          <ul class="service-list">
            <li><span class="check">✓</span> Funnel Drop-off Analysis</li>
            <li><span class="check">✓</span> High-Velocity A/B Test Variants</li>
            <li><span class="check">✓</span> Measurable ROI Lift Guarantees</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</body>
</html>`;
    }

    // Default clean modern UI preview
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - TayDau Design Preview</title>
  <style>
    :root {
      --primary: #2563eb;
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text-main: #0f172a;
      --text-muted: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text-main); line-height: 1.5; padding: 24px; }
    .container { max-width: 1100px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { padding: 20px 28px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; display: flex; align-items: center; justify-content: space-between; }
    .header h1 { font-size: 1.25rem; font-weight: 700; }
    .badge { font-size: 0.75rem; background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 9999px; }
    .meta-bar { background: #f1f5f9; padding: 12px 28px; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--text-muted); }
    .body-content { padding: 28px; }
    .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px; }
    .btn-primary { background: var(--primary); color: white; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${name}</h1>
      <span class="badge">${deviceType} Preview</span>
    </div>
    <div class="meta-bar">
      <div><strong>Purpose:</strong> ${purpose}</div>
    </div>
    ${revisionBlock}
    <div class="body-content">
      <div class="panel">
        <h2 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px;">${name}</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">${purpose}</p>
        <button class="btn-primary">Explore Screen Elements</button>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
