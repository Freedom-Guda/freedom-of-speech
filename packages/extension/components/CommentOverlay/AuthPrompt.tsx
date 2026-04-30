interface Props {
  onCreateAccount: () => void;
  busy?: boolean;
}

export function AuthPrompt({ onCreateAccount, busy }: Props) {
  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-50">
      <h2 className="font-semibold">Sign in to comment</h2>
      <p className="mt-1 text-blue-100/80">
        One device biometric, one DID. No phone numbers, no email, no platform that can ban you.
      </p>
      <button
        type="button"
        onClick={onCreateAccount}
        disabled={busy}
        className="mt-3 inline-flex items-center justify-center rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-400 disabled:opacity-50"
      >
        {busy ? 'Working…' : 'Create account'}
      </button>
    </div>
  );
}
