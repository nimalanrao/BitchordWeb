import { ArrowRight, KeyRound, Lock, Music2, ShieldAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAccessGate } from '@/state/accessGate';

export function AccessGateModal() {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const grantAccess = useAccessGate((s) => s.grantAccess);

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!keyInput.trim()) {
      setError(true);
      return;
    }
    setIsSubmitting(true);
    const success = grantAccess(keyInput);
    if (!success) {
      setError(true);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-gate-title"
    >
      <div className="relative w-full max-w-[420px] rounded-[24px] bg-neutral-900/90 border border-white/15 p-7 md:p-9 shadow-[0_32px_100px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.25)] ring-1 ring-white/10 text-white flex flex-col items-center text-center overflow-hidden">
        {/* Ambient Top Glow - Pure subtle white/silver glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-48 rounded-full bg-white/10 blur-3xl" />

        {/* Brand Icon - Clean white floating icon */}
        <div className="relative mb-5 flex size-14 items-center justify-center">
          <KeyRound size={38} className="text-white drop-shadow-[0_4px_16px_rgba(255,255,255,0.35)]" strokeWidth={1.8} />
          <div className="absolute bottom-0 right-0 size-5 rounded-full bg-white text-black flex items-center justify-center shadow-lg ring-2 ring-neutral-900">
            <Lock size={11} className="text-black" />
          </div>
        </div>

        {/* Title & Description */}
        <h1 id="access-gate-title" className="text-2xl font-bold tracking-tight text-white">
          BitChord+ Access Key
        </h1>
        <p className="mt-2 text-sm text-white/65 leading-relaxed">
          Please enter your security access key to unlock and enter BitChord+.
        </p>

        {/* Key Form */}
        <form onSubmit={handleSubmit} className="mt-6 w-full flex flex-col gap-3.5">
          <div className="relative w-full">
            <input
              type="password"
              autoFocus
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                if (error) setError(false);
              }}
              placeholder="Enter access key…"
              className={`w-full rounded-full bg-white/[0.07] border px-6 py-3.5 text-sm text-white placeholder-white/40 outline-none transition-all ${
                error
                  ? 'border-red-400 ring-2 ring-red-400/30'
                  : 'border-white/20 focus:border-white/60 focus:ring-2 focus:ring-white/20 hover:border-white/30'
              }`}
            />
          </div>

          {error && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-red-300 animate-shake">
              <ShieldAlert size={14} />
              <span>Invalid access key. Please check and try again.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !keyInput}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold text-black shadow-xl shadow-white/10 hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <span>Unlock BitChord+</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 flex items-center gap-2 text-[11px] text-white/40">
          <Music2 size={12} />
          <span>BitChord+ Music Platform</span>
        </div>
      </div>
    </div>
  );
}
