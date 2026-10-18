import { ChevronLeft, ChevronRight, ListMusic, Settings } from 'lucide-react';
import { PrefetchLink, PrefetchNavLink } from '@/components/PrefetchLink';
import { LogoMark } from '@/components/icons/LogoMark';
import {
  AlbumsIcon,
  AllPlaylistsIcon,
  ArtistsIcon,
  HomeIcon,
  MadeForYouIcon,
  NewIcon,
  RecentlyAddedIcon,
  SearchIcon,
  SongsIcon,
  type NavIconProps,
} from '@/components/icons/NavIcons';
import { hrefFor } from '@/components/music/links';
import { LIBRARY_SECTIONS, type LibrarySection } from '@/data/music/library';
import { useLibraryPlaylists, useSignedIn } from '@/data/music/queries';
import { useUi } from '@/state/ui';
import { AccountButton } from './AccountButton';

interface NavItem {
  to: string;
  label: string;
  Icon: (props: NavIconProps) => React.ReactNode;
}

const PRIMARY: NavItem[] = [
  { to: '/search', label: 'Search', Icon: SearchIcon },
  { to: '/home', label: 'Home', Icon: HomeIcon },
  { to: '/new', label: 'New', Icon: NewIcon },
];

const LIBRARY_ICONS: Record<Exclude<LibrarySection, 'playlists'>, NavItem['Icon']> = {
  recent: RecentlyAddedIcon,
  artists: ArtistsIcon,
  albums: AlbumsIcon,
  songs: SongsIcon,
  'made-for-you': MadeForYouIcon,
};

const LIBRARY: NavItem[] = (Object.keys(LIBRARY_ICONS) as (keyof typeof LIBRARY_ICONS)[]).map((section) => ({
  to: `/library/${section}`,
  label: LIBRARY_SECTIONS[section].title,
  Icon: LIBRARY_ICONS[section],
}));

// A sidebar row; NavLink sets aria-current on the page's own row.
const item =
  'group flex h-9 items-center gap-2 mb-0.5 p-1 rounded-nav type-body-reduced text-primary hover:bg-quinary aria-[current=page]:bg-nav-selected transition-all duration-200 ease-out active:scale-[0.98] select-none';
const itemCollapsed =
  'group flex size-9 items-center justify-center mb-1 mx-auto rounded-nav text-primary hover:bg-quinary aria-[current=page]:bg-nav-selected transition-all duration-200 ease-out active:scale-[0.98] select-none';
// Apple's glyphs, drawn at 24px (their 24-unit box), which the user preferred to Apple's own 28px.
const icon = 'inline-grid size-6 flex-none place-items-center text-primary group-aria-[current=page]:text-key transition-colors duration-200 ease-out';
const navLabel = 'min-w-0 truncate';
// "Library", "Playlists" (report §1: 12px/15px 600, secondary, padding 4px 8px).
const sectionHeader = 'mt-4 px-2 py-1 type-callout-emphasized text-secondary';
const list = 'flex flex-col';

function NavList({ items, collapsed, onNavigate }: { items: NavItem[]; collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <ul className={list}>
      {items.map(({ to, label, Icon }) => (
        <li key={to}>
          <PrefetchNavLink
            to={to}
            className={collapsed ? itemCollapsed : item}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
          >
            <Icon size={24} className={icon} />
            {!collapsed && <span className={navLabel}>{label}</span>}
          </PrefetchNavLink>
        </li>
      ))}
    </ul>
  );
}

/** Library and Playlists (report §1), once YouTube requests are made as the user. */
function LibraryNav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const playlists = useLibraryPlaylists();
  return (
    <>
      {!collapsed && <h2 className={sectionHeader}>Library</h2>}
      {collapsed && <div className="my-2 mx-auto h-px w-6 bg-white/10" />}
      <NavList items={LIBRARY} collapsed={collapsed} onNavigate={onNavigate} />
      {!collapsed && <h2 className={sectionHeader}>Playlists</h2>}
      {collapsed && <div className="my-2 mx-auto h-px w-6 bg-white/10" />}
      <ul className={list}>
        <li>
          <PrefetchNavLink
            to="/library/playlists"
            className={collapsed ? itemCollapsed : item}
            onClick={onNavigate}
            title={collapsed ? LIBRARY_SECTIONS.playlists.title : undefined}
          >
            <AllPlaylistsIcon size={24} className={icon} />
            {!collapsed && <span className={navLabel}>{LIBRARY_SECTIONS.playlists.title}</span>}
          </PrefetchNavLink>
        </li>
        {playlists.data?.map((playlist) => (
          <li key={playlist.id}>
            <PrefetchNavLink
              to={hrefFor(playlist) ?? '/library/playlists'}
              className={collapsed ? itemCollapsed : item}
              onClick={onNavigate}
              title={collapsed ? playlist.title : undefined}
            >
              <span className={icon}>
                <ListMusic size={17} strokeWidth={1.8} />
              </span>
              {!collapsed && <span className={navLabel}>{playlist.title}</span>}
            </PrefetchNavLink>
          </li>
        ))}
      </ul>
    </>
  );
}

/** The left glass sidebar. */
export function Sidebar() {
  const signedIn = useSignedIn();
  const sidebarCollapsed = useUi((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useUi((s) => s.toggleSidebarCollapsed);

  return (
    <>
      <nav
        className="absolute inset-y-0 left-0 z-(--z-web-chrome) flex w-(--web-navigation-width) flex-col glass-material transition-[width] duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] max-sm:hidden"
        aria-label="Main"
      >
        {/* Top Header: Logo with interactive hover toggle button (replaces icon with arrow on hover) */}
        <div
          className={`mt-2 flex h-18 items-center ${
            sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-5'
          }`}
        >
          <div className="relative group/logo flex items-center">
            {/* The Logo / Brand Link */}
            <PrefetchLink
              to="/home"
              className="inline-flex items-center gap-2.5 rounded-[8px] p-1.5 hover:bg-quinary/40 transition-colors duration-200"
              aria-label="BitChord+, Home"
              title={sidebarCollapsed ? 'Expand sidebar (click arrow)' : 'BitChord+, Home'}
            >
              {/* Icon Container: Logo icon by default, smoothly fades to Arrow on hover */}
              <div
                onClick={(e) => {
                  // If user clicks the logo icon/arrow container, toggle sidebar collapse
                  e.preventDefault();
                  e.stopPropagation();
                  toggleSidebarCollapsed();
                }}
                className="relative grid size-7 place-items-center rounded-nav text-primary hover:bg-white/10 active:scale-90 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer select-none"
                role="button"
                tabIndex={0}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar to icons only'}
              >
                {/* Default LogoMark: visible normally, fades out on hover */}
                <div className="absolute inset-0 grid place-items-center transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover/logo:opacity-0 group-hover/logo:scale-75 group-hover/logo:rotate-[-20deg]">
                  <LogoMark size={22} className="text-primary flex-none" />
                </div>

                {/* Arrow Icon: hidden normally, fades and scales in on hover */}
                <div className="absolute inset-0 grid place-items-center opacity-0 scale-75 rotate-12 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover/logo:opacity-100 group-hover/logo:scale-100 group-hover/logo:rotate-0 text-primary">
                  {sidebarCollapsed ? <ChevronRight size={19} strokeWidth={2.2} /> : <ChevronLeft size={19} strokeWidth={2.2} />}
                </div>
              </div>

              {/* BitChord+ wordmark text: smoothly fades out when collapsed */}
              {!sidebarCollapsed && (
                <span className="type-[700_19px/24px] tracking-[-0.01em] transition-opacity duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex items-center">
                  <span>BitChord</span>
                  <span className="text-key ml-0.5 font-bold">+</span>
                </span>
              )}
            </PrefetchLink>
          </div>
        </div>

        {/* Main Navigation List */}
        <div
          className={`min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] ${
            sidebarCollapsed ? 'px-2' : 'pr-3 pl-5'
          }`}
        >
          <NavList items={PRIMARY} collapsed={sidebarCollapsed} />
          {signedIn && <LibraryNav collapsed={sidebarCollapsed} />}
        </div>

        {/* Bottom Section: Account Profile & Settings SIDE BY SIDE */}
        <div
          className={`border-t border-white/5 ${
            sidebarCollapsed
              ? 'flex flex-col items-center gap-2.5 px-2 py-4'
              : 'flex items-center justify-between gap-2 px-4 py-3'
          }`}
        >
          <div className={sidebarCollapsed ? 'flex justify-center' : 'min-w-0 flex-1'}>
            <AccountButton collapsed={sidebarCollapsed} />
          </div>
          <PrefetchNavLink
            to="/settings"
            className="grid size-8 flex-none place-items-center rounded-nav text-secondary hover:bg-quinary hover:text-primary aria-[current=page]:bg-quinary aria-[current=page]:text-primary transition-all duration-200 ease-out active:scale-95"
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={18} strokeWidth={1.9} />
          </PrefetchNavLink>
        </div>
      </nav>
    </>
  );
}
