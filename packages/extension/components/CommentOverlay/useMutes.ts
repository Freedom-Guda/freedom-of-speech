import { useEffect, useState } from 'react';

const STORAGE_KEY = 'fos:mutes';

async function readMutes(): Promise<Set<string>> {
  const r = await chrome.storage.local.get([STORAGE_KEY]);
  const list = (r[STORAGE_KEY] as string[] | undefined) ?? [];
  return new Set(list);
}

async function writeMutes(set: Set<string>) {
  await chrome.storage.local.set({ [STORAGE_KEY]: [...set] });
}

export function useMutes() {
  const [mutes, setMutes] = useState<Set<string>>(new Set());

  useEffect(() => {
    void readMutes().then(setMutes);
  }, []);

  return {
    mutes,
    isMuted: (did: string) => mutes.has(did),
    toggleMute: async (did: string) => {
      const next = new Set(mutes);
      if (next.has(did)) next.delete(did);
      else next.add(did);
      setMutes(next);
      await writeMutes(next);
    },
  };
}
