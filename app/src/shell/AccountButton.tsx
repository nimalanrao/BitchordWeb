import { ArrowUpRight, ChevronsUpDown } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Menu, MenuHeader, MenuItem, MenuSeparator } from '@/components/Menu';
import { useRefreshYtAuth, useSelectChannel, useSetConnected, useYtAuth } from '@/extension/useYtAuth';

import { useGoogleAuth } from '@/state/auth';

const SIGN_IN_URL = 'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://music.youtube.com/';

// The signed-out pill: Apple's red "Sign In" (report §1, .navigation__native-cta).
const pill =
  'self-start rounded-[16px] bg-key px-3.5 py-[5px] type-[600_13px/18px] text-white hover:brightness-[1.08] disabled:opacity-60 cursor-pointer';
const avatar = 'inline-grid flex-none place-items-center rounded-full bg-quinary object-cover type-[600_11px/1] text-secondary';

function Avatar({ src, name, size }: { src: string | null; name: string; size: number }) {
  return src ? (
    <img className={avatar} src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" />
  ) : (
    <span className={avatar} style={{ width: size, height: size }} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * The sidebar's account control (report §1: avatar and name at the bottom,
 * opening the account menu; a red "Sign In" pill when signed out).
 */
export function AccountButton({ collapsed = false }: { collapsed?: boolean } = {}) {
  const status = useYtAuth();
  const select = useSelectChannel();
  const connect = useSetConnected();
  const refresh = useRefreshYtAuth();
  const googleAuth = useGoogleAuth();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);

  const ytAuth = status.state === 'ready' ? status.auth : null;
  const isGoogleSignedIn = googleAuth.signedIn && !!googleAuth.user;
  const isYtSignedIn = !!ytAuth?.signedIn && !!ytAuth?.active;

  if (isGoogleSignedIn && !isYtSignedIn) {
    const user = googleAuth.user!;
    return (
      <>
        <button
          className={
            collapsed
              ? 'grid size-8 place-items-center rounded-nav text-primary hover:bg-quinary aria-expanded:bg-quinary transition-all duration-200 cursor-pointer'
              : 'flex min-w-0 flex-1 items-center gap-2 rounded-nav px-1 py-1.5 text-start type-body-reduced text-primary hover:bg-quinary aria-expanded:bg-quinary transition-all duration-200 cursor-pointer'
          }
          aria-haspopup="menu"
          aria-expanded={anchor !== null}
          title={user.name}
          onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}
        >
          <Avatar src={user.avatarUrl || null} name={user.name} size={24} />
          {!collapsed && <span className="min-w-0 flex-1 truncate">{user.name}</span>}
          {!collapsed && <ChevronsUpDown size={14} strokeWidth={2} className="flex-none text-secondary" />}
        </button>
        {anchor && (
          <Menu anchor={anchor} placement="above-start" onClose={close} label="Google Account">
            <MenuHeader>{user.email || user.name}</MenuHeader>
            <MenuItem
              onSelect={() => {
                close();
                void googleAuth.syncLibrary();
              }}
            >
              {googleAuth.isSyncing ? 'Syncing Library…' : 'Sync Library'}
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              destructive
              onSelect={() => {
                close();
                googleAuth.signOut();
              }}
            >
              Sign Out
            </MenuItem>
          </Menu>
        )}
      </>
    );
  }

  if (status.state !== 'ready') return null;
  const auth = status.auth;

  if (!auth.browserSignedIn) {
    return (
      <a
        className={collapsed ? 'grid size-8 place-items-center rounded-full bg-key text-white text-xs font-bold hover:brightness-110' : pill}
        href={SIGN_IN_URL}
        target="_blank"
        rel="noreferrer"
        title="Sign In"
      >
        {collapsed ? 'In' : 'Sign In'}
      </a>
    );
  }
  if (!auth.connected) {
    return (
      <button
        className={collapsed ? 'grid size-8 place-items-center rounded-full bg-key text-white text-xs font-bold hover:brightness-110' : pill}
        onClick={() => connect.mutate(true)}
        disabled={connect.isPending}
        title="Connect YouTube Music"
      >
        {collapsed ? 'YT' : 'Connect YouTube Music'}
      </button>
    );
  }
  if (!auth.active) {
    // Signed in to the browser, but the account couldn't be read (the reason is on the Extension page).
    return (
      <button
        className={collapsed ? 'grid size-8 place-items-center rounded-full bg-key text-white text-xs font-bold hover:brightness-110' : pill}
        title={auth.problem ?? undefined}
        onClick={() => refresh.mutate()}
        disabled={refresh.isPending}
      >
        {collapsed ? '↻' : refresh.isPending ? 'Reading account…' : 'Retry YouTube Sign-In'}
      </button>
    );
  }
  const active = auth.active;
  const multiple = auth.accounts.flatMap((a) => a.channels).length > 1;

  return (
    <>
      <button
        // Signed in: a 24px avatar and the name, opening the account menu.
        className={
          collapsed
            ? 'grid size-8 place-items-center rounded-nav text-primary hover:bg-quinary aria-expanded:bg-quinary transition-all duration-200'
            : 'flex min-w-0 flex-1 items-center gap-2 rounded-nav px-1 py-1.5 text-start type-body-reduced text-primary hover:bg-quinary aria-expanded:bg-quinary transition-all duration-200'
        }
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        title={active.name}
        onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}
      >
        <Avatar src={active.avatarUrl} name={active.name} size={24} />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{active.name}</span>}
        {!collapsed && multiple && <ChevronsUpDown size={14} strokeWidth={2} className="flex-none text-secondary" />}
      </button>
      {anchor && (
        <Menu anchor={anchor} placement="above-start" onClose={close} label="Account">
          {auth.accounts.map((account) => (
            <div key={account.authUser} role="group" aria-label={account.email ?? account.name}>
              <MenuHeader>{account.email ?? account.name}</MenuHeader>
              {account.channels.map((channel) => (
                <MenuItem
                  key={channel.id}
                  checked={channel.id === active.id}
                  icon={<Avatar src={channel.avatarUrl} name={channel.name} size={20} />}
                  trailing={channel.brand ? 'Brand' : undefined}
                  onSelect={() => {
                    close();
                    if (channel.id !== active.id) select.mutate(channel.id);
                  }}
                >
                  {channel.name}
                </MenuItem>
              ))}
            </div>
          ))}
          <MenuSeparator />
          <MenuItem
            onSelect={() => {
              close();
              window.open(SIGN_IN_URL.replace('ServiceLogin', 'AddSession'), '_blank', 'noreferrer');
            }}
            trailing={<ArrowUpRight size={13} />}
          >
            Add Account
          </MenuItem>
          <MenuItem
            destructive
            onSelect={() => {
              close();
              connect.mutate(false);
            }}
          >
            Disconnect from BitChord+
          </MenuItem>
        </Menu>
      )}
    </>
  );
}
