import { z } from 'zod';

export interface DesignProjectResult {
  providerProjectId: string;
  metadata?: Record<string, any>;
}

export interface GeneratedScreenResult {
  screenId: string;
  screenKey: string;
  name: string;
  title: string;
  purpose: string;
  imageUrl?: string;
  htmlContent?: string;
  htmlUrl?: string;
  deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'AGNOSTIC';
  sha256: string;
  metadata?: Record<string, any>;
}

export interface DesignSystemResult {
  designSystemId: string;
  metadata?: Record<string, any>;
}

export interface DesignProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  createProject(projectName: string, description?: string): Promise<DesignProjectResult>;
  createDesignSystem?(providerProjectId: string, brandSpec: any): Promise<DesignSystemResult>;
  generateScreen(
    providerProjectId: string,
    screenPrompt: string,
    options?: {
      screenKey?: string;
      screenName?: string;
      deviceType?: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'AGNOSTIC';
      designSystemId?: string;
      purpose?: string;
    }
  ): Promise<GeneratedScreenResult>;
  editScreen?(
    providerProjectId: string,
    screenId: string,
    editPrompt: string,
    options?: { screenKey?: string; screenName?: string; purpose?: string }
  ): Promise<GeneratedScreenResult>;
  generateVariants?(
    providerProjectId: string,
    screenId: string,
    count?: number
  ): Promise<GeneratedScreenResult[]>;
  getHtml?(providerProjectId: string, screenId: string): Promise<string | undefined>;
  getImage?(providerProjectId: string, screenId: string): Promise<string | undefined>;
}
