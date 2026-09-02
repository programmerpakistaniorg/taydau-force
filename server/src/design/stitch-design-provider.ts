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
  private mcpUrl: string = 'https://stitch.googleapis.com/mcp';
  private restBaseUrl: string = 'https://stitch.googleapis.com/v1';

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.STITCH_API_KEY || '';
    if (baseUrl) {
      this.restBaseUrl = baseUrl;
    }
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  private async callMcpTool(toolName: string, args: Record<string, any>): Promise<any> {
    const res = await fetch(this.mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Stitch MCP HTTP ${res.status}: ${errText}`);
    }

    const data: any = await res.json();
    if (data.error) {
      throw new Error(`Stitch MCP Error [${data.error.code}]: ${data.error.message}`);
    }

    return data.result;
  }

  async createProject(projectName: string, description?: string): Promise<DesignProjectResult> {
    if (!this.apiKey) {
      throw new Error('STITCH_API_KEY is not configured');
    }

    try {
      const result = await this.callMcpTool('create_project', {
        title: projectName,
      });

      let providerProjectId = '';
      if (result?.structuredContent?.name) {
        providerProjectId = result.structuredContent.name.replace('projects/', '');
      } else if (result?.content?.[0]?.text) {
        try {
          const parsed = JSON.parse(result.content[0].text);
          if (parsed.name) {
            providerProjectId = parsed.name.replace('projects/', '');
          }
        } catch {
          // ignore
        }
      }

      if (!providerProjectId) {
        providerProjectId = `stitch-${crypto.randomUUID().slice(0, 8)}`;
      }

      return {
        providerProjectId,
        metadata: result,
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

    const cleanId = providerProjectId.replace('projects/', '');
    try {
      const result = await this.callMcpTool('create_design_system', {
        projectId: cleanId,
        displayName: `${brandSpec?.name || 'TayDau'} Design System`,
        colorMode: brandSpec?.colorMode || 'LIGHT',
        customColor: brandSpec?.colors?.primary || '#1E40AF',
      });

      return {
        designSystemId: result?.structuredContent?.name || `stitch-ds-${crypto.randomUUID().slice(0, 8)}`,
        metadata: result,
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

    const cleanId = providerProjectId.replace('projects/', '');
    const deviceType = options?.deviceType || 'DESKTOP';
    const name = options?.screenName || 'Application Screen';
    const purpose = options?.purpose || screenPrompt.slice(0, 100);
    const screenKey = options?.screenKey || `screen-${crypto.randomUUID().slice(0, 8)}`;

    try {
      console.log(`[StitchDesignProvider] Synthesizing screen '${name}' with Google Stitch for project ${cleanId}...`);

      await this.callMcpTool('generate_screen_from_text', {
        projectId: cleanId,
        prompt: screenPrompt,
        deviceType: deviceType === 'MOBILE' ? 'MOBILE' : 'DESKTOP',
        designSystem: options?.designSystemId,
      });

      // Retrieve generated screen details via Stitch REST API
      const screensRes = await fetch(`${this.restBaseUrl}/projects/${cleanId}/screens`, {
        headers: {
          'X-Goog-Api-Key': this.apiKey,
        },
      });

      let htmlContent = '';
      let imageUrl: string | undefined = undefined;
      let screenId = `stitch-screen-${crypto.randomUUID().slice(0, 8)}`;

      if (screensRes.ok) {
        const screensData: any = await screensRes.json();
        const screensList = screensData.screens || [];
        if (screensList.length > 0) {
          // Latest screen is at the end or matches title
          const matched = screensList.find((s: any) => s.title?.toLowerCase().includes(name.toLowerCase())) || screensList[screensList.length - 1];
          screenId = matched.id || matched.name || screenId;
          imageUrl = matched.screenshot?.downloadUrl;

          if (matched.htmlCode?.downloadUrl) {
            try {
              const htmlResp = await fetch(matched.htmlCode.downloadUrl);
              if (htmlResp.ok) {
                htmlContent = await htmlResp.text();
              }
            } catch (htmlErr) {
              console.warn(`[StitchDesignProvider] Could not download HTML from Stitch URL:`, htmlErr);
            }
          }
        }
      }

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
          providerProjectId: cleanId,
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

    const cleanId = providerProjectId.replace('projects/', '');
    const cleanScreenId = screenId.replace(/^.*screens\//, '');
    const name = options?.screenName || 'Revised Screen';
    const purpose = options?.purpose || editPrompt.slice(0, 100);
    const screenKey = options?.screenKey || screenId;

    try {
      await this.callMcpTool('edit_screens', {
        projectId: cleanId,
        prompt: editPrompt,
        selectedScreenIds: [cleanScreenId],
      });

      const screensRes = await fetch(`${this.restBaseUrl}/projects/${cleanId}/screens`, {
        headers: { 'X-Goog-Api-Key': this.apiKey },
      });

      let htmlContent = '';
      let imageUrl: string | undefined = undefined;
      let newScreenId = cleanScreenId;

      if (screensRes.ok) {
        const screensData: any = await screensRes.json();
        const screensList = screensData.screens || [];
        const latest = screensList[screensList.length - 1];
        if (latest) {
          newScreenId = latest.id || newScreenId;
          imageUrl = latest.screenshot?.downloadUrl;
          if (latest.htmlCode?.downloadUrl) {
            try {
              const htmlResp = await fetch(latest.htmlCode.downloadUrl);
              if (htmlResp.ok) {
                htmlContent = await htmlResp.text();
              }
            } catch {
              // ignore
            }
          }
        }
      }

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

    const cleanId = providerProjectId.replace('projects/', '');
    const cleanScreenId = screenId.replace(/^.*screens\//, '');

    try {
      await this.callMcpTool('generate_variants', {
        projectId: cleanId,
        prompt: 'Alternative visual style and layout variants',
        selectedScreenIds: [cleanScreenId],
        variantOptions: {
          variantCount: Math.min(count, 3),
          creativeRange: 'EXPLORE',
        },
      });

      const screensRes = await fetch(`${this.restBaseUrl}/projects/${cleanId}/screens`, {
        headers: { 'X-Goog-Api-Key': this.apiKey },
      });

      if (!screensRes.ok) return [];

      const screensData: any = await screensRes.json();
      const screensList: any[] = screensData.screens || [];
      const variants = screensList.slice(-count);

      return variants.map((s, idx) => {
        const sId = s.id || `stitch-var-${idx}-${crypto.randomUUID().slice(0, 6)}`;
        const sha256 = crypto.createHash('sha256').update(s.screenshot?.downloadUrl || sId, 'utf8').digest('hex');
        return {
          screenId: sId,
          screenKey: `${cleanScreenId}-var-${idx + 1}`,
          name: s.title || `Variant ${String.fromCharCode(65 + idx)}`,
          title: s.title || `Option ${String.fromCharCode(65 + idx)}`,
          purpose: s.prompt || `Alternative design variant ${idx + 1}`,
          imageUrl: s.screenshot?.downloadUrl,
          htmlContent: '',
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
