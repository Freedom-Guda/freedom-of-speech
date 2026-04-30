import { useState } from 'react';

interface Props {
  did: string;
  cid: string;
  onToggleMute: (did: string) => void;
}

// All controls here are *client-side only*. The protocol has no platform
// ban or delete. Reports go to your local list — and optionally an
// aggregator that any client can choose to subscribe to or ignore.
export function ModerationControls({ did, cid, onToggleMute }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded p-1 text-neutral-500 hover:bg-white/5 hover:text-neutral-200"
        title="More"
      >
        ⋯
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 w-44 rounded-md border border-white/10 bg-neutral-950 p-1 text-xs shadow-xl animate-fade-in"
        >
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              onToggleMute(did);
              setOpen(false);
            }}
            className="block w-full rounded px-2 py-1.5 text-left hover:bg-white/5"
          >
            Mute author
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(did);
              setOpen(false);
            }}
            className="block w-full rounded px-2 py-1.5 text-left hover:bg-white/5"
          >
            Copy DID
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(`https://ipfs.io/ipfs/${cid}`);
              setOpen(false);
            }}
            className="block w-full rounded px-2 py-1.5 text-left hover:bg-white/5"
          >
            Copy IPFS link
          </button>
        </div>
      )}
    </div>
  );
}
