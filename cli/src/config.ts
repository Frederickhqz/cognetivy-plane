import path from "node:path";
import fs from "node:fs/promises";
import type { StorageConfig } from "./storage-interface.js";

export type SkillSourceConfig =
  | "agent"
  | "agents"
  | "cursor"
  | "factory"
  | "gemini"
  | "openclaw"
  | "opencode"
  | "qwen"
  | "workspace";
export type SkillInstallTargetConfig =
  | "agent"
  | "agents"
  | "cursor"
  | "factory"
  | "gemini"
  | "openclaw"
  | "opencode"
  | "qwen"
  | "workspace";

export interface SkillsConfigBlock {
  sources?: SkillSourceConfig[];
  extraDirs?: string[];
  default_install_target?: SkillInstallTargetConfig;
}

export interface PlaneConfig {
  /** Plane API URL (e.g., http://localhost:8000) */
  apiUrl: string;
  /** Plane API key */
  apiKey: string;
  /** Plane workspace slug */
  workspace: string;
  /** Plane project ID */
  project: string;
}

export interface CognetivyConfig {
  /** Default "by" value for runs/events (e.g. "agent:cursor"). */
  default_by?: string;
  /** Skill discovery and install target config. */
  skills?: SkillsConfigBlock;
  /** Storage backend type: file, plane, or hybrid */
  storage?: 'file' | 'plane' | 'hybrid';
  /** Plane configuration (required if storage is 'plane' or 'hybrid') */
  plane?: PlaneConfig;
  /** Primary storage adapter for hybrid mode */
  primaryAdapter?: 'file' | 'plane';
  /** Auto-sync to Plane on write (default: true for hybrid) */
  syncOnWrite?: boolean;
  [key: string]: unknown;
}

const CONFIG_FILENAME = "config.json";

/**
 * Get user-level config path using env-paths (e.g. ~/.config/cognetivy/config.json).
 */
async function getGlobalConfigPath(): Promise<string> {
  const { default: envPaths } = await import("env-paths");
  const paths = envPaths("cognetivy", { suffix: "" });
  return path.join(paths.config, CONFIG_FILENAME);
}

/**
 * Load global config if it exists. Returns empty object if missing.
 */
export async function loadGlobalConfig(): Promise<CognetivyConfig> {
  try {
    const configPath = await getGlobalConfigPath();
    const raw = await fs.readFile(configPath, "utf-8");
    return JSON.parse(raw) as CognetivyConfig;
  } catch {
    return {};
  }
}

/**
 * Load local workspace config from .cognetivy/config.json if it exists.
 */
export async function loadLocalConfig(cwd: string = process.cwd()): Promise<CognetivyConfig> {
  const path = await import("node:path");
  const localPath = path.default.resolve(cwd, ".cognetivy", CONFIG_FILENAME);
  try {
    const raw = await fs.readFile(localPath, "utf-8");
    return JSON.parse(raw) as CognetivyConfig;
  } catch {
    return {};
  }
}

/**
 * Merged config: local overrides global.
 */
export async function getMergedConfig(cwd: string = process.cwd()): Promise<CognetivyConfig> {
  const [global, local] = await Promise.all([loadGlobalConfig(), loadLocalConfig(cwd)]);
  return { ...global, ...local };
}

/**
 * Get Plane configuration from config or environment variables.
 * Environment variables take precedence:
 * - PLANE_API_URL
 * - PLANE_API_KEY
 * - PLANE_WORKSPACE
 * - PLANE_PROJECT
 */
export function getPlaneConfig(config: CognetivyConfig): PlaneConfig | null {
  const apiUrl = process.env.PLANE_API_URL || config.plane?.apiUrl;
  const apiKey = process.env.PLANE_API_KEY || config.plane?.apiKey;
  const workspace = process.env.PLANE_WORKSPACE || config.plane?.workspace;
  const project = process.env.PLANE_PROJECT || config.plane?.project;
  
  if (!apiUrl || !apiKey || !workspace || !project) {
    return null;
  }
  
  return { apiUrl, apiKey, workspace, project };
}

/**
 * Create storage config from Cognetivy config.
 */
export async function getStorageConfig(config: CognetivyConfig, cwd: string = process.cwd()): Promise<StorageConfig> {
  const storageType = config.storage || 'file';
  const planeConfig = getPlaneConfig(config);
  
  if (storageType === 'file') {
    return { type: 'file', workspaceDir: cwd };
  }
  
  if (storageType === 'plane') {
    if (!planeConfig) {
      throw new Error('Plane configuration required for storage type "plane". Set PLANE_API_URL, PLANE_API_KEY, PLANE_WORKSPACE, PLANE_PROJECT environment variables or plane config.');
    }
    return {
      type: 'plane',
      planeApiUrl: planeConfig.apiUrl,
      planeApiKey: planeConfig.apiKey,
      planeWorkspace: planeConfig.workspace,
      planeProject: planeConfig.project,
    };
  }
  
  if (storageType === 'hybrid') {
    if (!planeConfig) {
      console.warn('Warning: Hybrid storage requested but Plane config not found. Falling back to file storage.');
      return { type: 'file', workspaceDir: cwd };
    }
    return {
      type: 'hybrid',
      workspaceDir: cwd,
      planeApiUrl: planeConfig.apiUrl,
      planeApiKey: planeConfig.apiKey,
      planeWorkspace: planeConfig.workspace,
      planeProject: planeConfig.project,
      primaryAdapter: config.primaryAdapter || 'file',
      syncOnWrite: config.syncOnWrite ?? true,
    };
  }
  
  // Default to file storage
  return { type: 'file', workspaceDir: cwd };
}
