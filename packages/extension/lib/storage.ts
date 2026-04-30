import type { AccountBundle, ProtocolConfig } from './messages';
import { DEFAULT_CONFIG } from './messages';

const BUNDLE_KEY = 'fos:bundle';
const CONFIG_KEY = 'fos:config';

export async function loadBundle(): Promise<AccountBundle | null> {
  const r = await chrome.storage.local.get([BUNDLE_KEY]);
  return (r[BUNDLE_KEY] as AccountBundle | undefined) ?? null;
}

export async function saveBundle(bundle: AccountBundle): Promise<void> {
  await chrome.storage.local.set({ [BUNDLE_KEY]: bundle });
}

export async function clearBundle(): Promise<void> {
  await chrome.storage.local.remove([BUNDLE_KEY]);
}

export async function loadConfig(): Promise<ProtocolConfig> {
  const r = await chrome.storage.local.get([CONFIG_KEY]);
  return (r[CONFIG_KEY] as ProtocolConfig | undefined) ?? DEFAULT_CONFIG;
}

export async function saveConfig(config: ProtocolConfig): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: config });
}
