import type {
  DesignProvider,
  DesignProjectResult,
  GeneratedScreenResult,
  DesignSystemResult,
} from './design-provider.js';
import { StitchDesignProvider } from './stitch-design-provider.js';
import { TayDauDesignProvider } from './taydau-design-provider.js';

export class DesignGateway {
  private primaryProvider: DesignProvider;
  private fallbackProvider: DesignProvider;
  private activeProviderName: string = 'taydau_fallback';

  constructor(stitchApiKey?: string, stitchBaseUrl?: string) {
    this.primaryProvider = new StitchDesignProvider(stitchApiKey, stitchBaseUrl);
    this.fallbackProvider = new TayDauDesignProvider();
  }

  async getActiveProvider(): Promise<DesignProvider> {
    try {
      const stitchAvailable = await this.primaryProvider.isAvailable();
      if (stitchAvailable) {
        this.activeProviderName = 'stitch';
        return this.primaryProvider;
      }
    } catch (err) {
      // ignore check error
    }
    this.activeProviderName = 'taydau_fallback';
    return this.fallbackProvider;
  }

  getActiveProviderName(): string {
    return this.activeProviderName;
  }

  async createProject(projectName: string, description?: string): Promise<DesignProjectResult & { provider: string }> {
    const provider = await this.getActiveProvider();
    try {
      const res = await provider.createProject(projectName, description);
      return { ...res, provider: provider.name };
    } catch (err: any) {
      console.warn(`[DesignGateway] Primary provider '${provider.name}' failed to create project. Falling back to TayDau internal renderer.`);
      const fallbackRes = await this.fallbackProvider.createProject(projectName, description);
      this.activeProviderName = 'taydau_fallback';
      return { ...fallbackRes, provider: this.fallbackProvider.name };
    }
  }

  async createDesignSystem(providerProjectId: string, brandSpec: any): Promise<DesignSystemResult & { provider: string }> {
    const provider = await this.getActiveProvider();
    try {
      if (provider.createDesignSystem) {
        const res = await provider.createDesignSystem(providerProjectId, brandSpec);
        return { ...res, provider: provider.name };
      }
    } catch (err) {
      console.warn(`[DesignGateway] createDesignSystem failed on ${provider.name}. Falling back.`);
    }

    const fallbackRes = await this.fallbackProvider.createDesignSystem!(providerProjectId, brandSpec);
    return { ...fallbackRes, provider: this.fallbackProvider.name };
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
  ): Promise<GeneratedScreenResult & { provider: string }> {
    const provider = await this.getActiveProvider();
    try {
      const res = await provider.generateScreen(providerProjectId, screenPrompt, options);
      return { ...res, provider: provider.name };
    } catch (err: any) {
      console.warn(`[DesignGateway] generateScreen failed on ${provider.name} (${err.message}). Using TayDau fallback renderer.`);
      const fallbackRes = await this.fallbackProvider.generateScreen(providerProjectId, screenPrompt, options);
      return { ...fallbackRes, provider: this.fallbackProvider.name };
    }
  }

  async editScreen(
    providerProjectId: string,
    screenId: string,
    editPrompt: string,
    options?: { screenKey?: string; screenName?: string; purpose?: string }
  ): Promise<GeneratedScreenResult & { provider: string }> {
    const provider = await this.getActiveProvider();
    try {
      if (provider.editScreen) {
        const res = await provider.editScreen(providerProjectId, screenId, editPrompt, options);
        return { ...res, provider: provider.name };
      }
    } catch (err: any) {
      console.warn(`[DesignGateway] editScreen failed on ${provider.name} (${err.message}). Using fallback edit.`);
    }

    const fallbackRes = await this.fallbackProvider.editScreen!(providerProjectId, screenId, editPrompt, options);
    return { ...fallbackRes, provider: this.fallbackProvider.name };
  }

  async generateVariants(
    providerProjectId: string,
    screenId: string,
    count: number = 2
  ): Promise<Array<GeneratedScreenResult & { provider: string }>> {
    const provider = await this.getActiveProvider();
    try {
      if (provider.generateVariants) {
        const res = await provider.generateVariants(providerProjectId, screenId, count);
        return res.map(r => ({ ...r, provider: provider.name }));
      }
    } catch (err: any) {
      console.warn(`[DesignGateway] generateVariants failed on ${provider.name}. Using fallback.`);
    }

    const fallbackRes = await this.fallbackProvider.generateVariants!(providerProjectId, screenId, count);
    return fallbackRes.map(r => ({ ...r, provider: this.fallbackProvider.name }));
  }
}

export const designGateway = new DesignGateway();
