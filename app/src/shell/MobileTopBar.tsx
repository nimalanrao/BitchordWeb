import { Settings } from 'lucide-react';
import { PrefetchLink, PrefetchNavLink } from '@/components/PrefetchLink';
import { LogoMark } from '@/components/icons/LogoMark';
import { AccountButton } from './AccountButton';

/** Mobile top header: BitChord logo on left, Settings & Account on right (no hamburger menu). */
export function MobileTopBar() {
  return (
    <header className="hidden max-sm:absolute max-sm:inset-x-0 max-sm:top-0 max-sm:z-[calc(var(--z-web-chrome)-2)] max-sm:flex max-sm:h-(--mobile-top-bar-height) max-sm:items-center max-sm:justify-between max-sm:px-4 max-sm:glass-material">
      <PrefetchLink to="/home" className="inline-flex items-center gap-2 type-[700_17px/22px]" aria-label="BitChord, Home">
        <LogoMark size={22} className="text-primary" />
        <span className="font-semibold tracking-tight">BitChord</span>
      </PrefetchLink>
      <div className="flex items-center gap-2">
        <PrefetchNavLink
          to="/settings"
          className="grid size-8 place-items-center rounded-full text-secondary hover:text-primary transition-all active:scale-95"
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={18} strokeWidth={2} />
        </PrefetchNavLink>
        <AccountButton />
      </div>
    </header>
  );
}

