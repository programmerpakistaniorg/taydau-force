import crypto from 'crypto';
import type {
  DesignProvider,
  DesignProjectResult,
  GeneratedScreenResult,
  DesignSystemResult,
} from './design-provider.js';

export class StitchDesignProvider implements DesignProvider {
  readonly name = 'stitch';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.STITCH_API_KEY || '';
    this.baseUrl = baseUrl || process.env.STITCH_BASE_URL || 'https://stitch.googleapis.com/v1';
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async createProject(projectName: string, description?: string): Promise<DesignProjectResult> {
    if (!this.apiKey) {
      throw new Error('STITCH_API_KEY is not configured');
    }

    try {
      const resp = await fetch(`${this.baseUrl}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          displayName: projectName,
          description: description || 'TayDau Force Autonomous Delivery Project',
        }),
      });

      if (!resp.ok) {
        throw new Error(`Stitch API error ${resp.status}: ${await resp.text()}`);
      }

      const data: any = await resp.json();
      return {
        providerProjectId: data.name || data.id || `stitch-${crypto.randomUUID().slice(0, 8)}`,
        metadata: data,
      };
    } catch (err: any) {
      console.warn(`[StitchDesignProvider] createProject failed (${err.message}). Falling back.`);
      throw err;
    }
  }

  async createDesignSystem(providerProjectId: string, brandSpec: any): Promise<DesignSystemResult> {
    if (!this.apiKey) {
      throw new Error('STITCH_API_KEY is not configured');
    }

    try {
      const resp = await fetch(`${this.baseUrl}/${providerProjectId}/designSystems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          name: `${providerProjectId}-ds`,
          brandSpec,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Stitch API error ${resp.status}: ${await resp.text()}`);
      }

      const data: any = await resp.json();
      return {
        designSystemId: data.name || data.id || `stitch-ds-${crypto.randomUUID().slice(0, 8)}`,
        metadata: data,
      };
    } catch (err: any) {
      console.warn(`[StitchDesignProvider] createDesignSystem failed (${err.message})`);
      throw err;
    }
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
    if (!this.apiKey) {
      throw new Error('STITCH_API_KEY is not configured');
    }

    const deviceType = options?.deviceType || 'DESKTOP';
    const name = options?.screenName || 'Application Screen';
    const purpose = options?.purpose || screenPrompt.slice(0, 100);
    const screenKey = options?.screenKey || `screen-${crypto.randomUUID().slice(0, 8)}`;

    try {
      const resp = await fetch(`${this.baseUrl}/${providerProjectId}:generateScreenFromText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: screenPrompt,
          deviceType: deviceType === 'DESKTOP' ? 'DESKTOP' : 'MOBILE',
          designSystem: options?.designSystemId,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Stitch API error ${resp.status}: ${await resp.text()}`);
      }

      const data: any = await resp.json();
      const screenId = data.screenId || data.id || `stitch-screen-${crypto.randomUUID().slice(0, 8)}`;
      const htmlContent = data.html || data.htmlContent;
      const imageUrl = data.imageUrl || data.screenshotUrl;
      const sha256 = crypto.createHash('sha256').update(htmlContent || imageUrl || screenPrompt, 'utf8').digest('hex');

      return {
        screenId,
        screenKey,
        name,
        title: name,
        purpose,
        imageUrl,
        htmlContent,
        deviceType,
        sha256,
        metadata: {
          provider: 'stitch',
          stitchData: data,
        },
      };
    } catch (err: any) {
      console.warn(`[StitchDesignProvider] generateScreen failed (${err.message})`);
      throw err;
    }
  }

  async editScreen(
    providerProjectId: string,
    screenId: string,
    editPrompt: string,
    options?: { screenKey?: string; screenName?: string; purpose?: string }
  ): Promise<GeneratedScreenResult> {
    if (!this.apiKey) {
      throw new Error('STITCH_API_KEY is not configured');
    }

    const name = options?.screenName || 'Revised Screen';
    const purpose = options?.purpose || editPrompt.slice(0, 100);
    const screenKey = options?.screenKey || screenId;

    try {
      const resp = await fetch(`${this.baseUrl}/${providerProjectId}/screens/${screenId}:edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          editPrompt,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Stitch API error ${resp.status}: ${await resp.text()}`);
      }

      const data: any = await resp.json();
      const newScreenId = data.screenId || data.id || `stitch-screen-rev-${crypto.randomUUID().slice(0, 8)}`;
      const htmlContent = data.html || data.htmlContent;
      const imageUrl = data.imageUrl || data.screenshotUrl;
      const sha256 = crypto.createHash('sha256').update(htmlContent || imageUrl || editPrompt, 'utf8').digest('hex');

      return {
        screenId: newScreenId,
        screenKey,
        name,
        title: name,
        purpose,
        imageUrl,
        htmlContent,
        deviceType: 'DESKTOP',
        sha256,
        metadata: {
          provider: 'stitch',
          previousScreenId: screenId,
          editPrompt,
        },
      };
    } catch (err: any) {
      console.warn(`[StitchDesignProvider] editScreen failed (${err.message})`);
      throw err;
    }
  }

  async generateVariants(
    providerProjectId: string,
    screenId: string,
    count: number = 2
  ): Promise<GeneratedScreenResult[]> {
    if (!this.apiKey) {
      throw new Error('STITCH_API_KEY is not configured');
    }

    try {
      const resp = await fetch(`${this.baseUrl}/${providerProjectId}/screens/${screenId}:generateVariants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          variantCount: Math.min(count, 2),
        }),
      });

      if (!resp.ok) {
        throw new Error(`Stitch API error ${resp.status}: ${await resp.text()}`);
      }

      const data: any = await resp.json();
      const screens: any[] = data.screens || data.variants || [];
      return screens.map((s, idx) => {
        const sId = s.id || `stitch-var-${idx}-${crypto.randomUUID().slice(0, 6)}`;
        const sha256 = crypto.createHash('sha256').update(s.html || s.imageUrl || sId, 'utf8').digest('hex');
        return {
          screenId: sId,
          screenKey: `${screenId}-var-${idx + 1}`,
          name: `Variant ${String.fromCharCode(65 + idx)}`,
          title: `Option ${String.fromCharCode(65 + idx)}`,
          purpose: `Alternative design variant ${idx + 1}`,
          imageUrl: s.imageUrl,
          htmlContent: s.html,
          deviceType: 'DESKTOP',
          sha256,
          metadata: { provider: 'stitch', variantIndex: idx + 1 },
        };
      });
    } catch (err: any) {
      console.warn(`[StitchDesignProvider] generateVariants failed (${err.message})`);
      throw err;
    }
  }
}
