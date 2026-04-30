interface Props {
  count: number;
  onClick: () => void;
  open: boolean;
}

export function FloatingButton({ count, onClick, open }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={
        open ? 'Close Freedom of Speech comments' : `Open Freedom of Speech comments (${count})`
      }
      className="fixed bottom-5 right-5 z-[2147483646] flex h-12 items-center gap-2 rounded-full bg-neutral-900 px-4 text-sm font-medium text-white shadow-2xl ring-1 ring-white/10 transition hover:scale-[1.03] hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      <span aria-hidden className="text-lg leading-none">💬</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
