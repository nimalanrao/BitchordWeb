import { ChevronRight, LogIn, LogOut, RefreshCw, Users } from 'lucide-react';
import { lazy, Suspense, useState, type ComponentType, type ReactNode } from 'react';
import { SiApplemusic, SiGoogle, SiYoutubemusic } from 'react-icons/si';
import { PageHeader } from '@/components/PageHeader';
import { PrefetchLink } from '@/components/PrefetchLink';
import { useParty } from '@/party/useParty';
import { useHistorySettings } from '@/playback/historyReporting';
import { CROSSFADE_CHOICES, usePlayer } from '@/state/player';
import { useGoogleAuth } from '@/state/auth';
import { CustomDropdown } from '@/components/CustomDropdown';
import { AppleMusicToggles, Toggle } from './IntegrationSettings';
import { settingsUi } from './settingsStyles';

const LyricsSettings = lazy(() => import('@/shell/LyricsSettings').then((m) => ({ default: m.LyricsSettings })));

/** An integration's coloured glyph. */
function Glyph({ Icon, color, ink }: { Icon: ComponentType<{ size?: number }>; color: string; ink?: string }) {
  return (
    <span className={settingsUi.integrationIcon} style={{ backgroundColor: color, ...(ink && { color: ink }) }}>
      <Icon size={15} />
    </span>
  );
}

/** A row that opens a page of its own. */
function LinkRow({ to, icon, title, value }: { to: string; icon?: ReactNode; title: string; value?: string | null }) {
  return (
    <PrefetchLink to={to} className={`${icon ? settingsUi.integration : settingsUi.integrationPlain} ${settingsUi.linkRow}`}>
      {icon}
      <span className={settingsUi.integrationName}>{title}</span>
      <span className={settingsUi.value}>
        {value}
        <ChevronRight size={16} />
      </span>
    </PrefetchLink>
  );
}

/**
 * Settings: the account, Listen Together, playback and lyrics.
 */
export default function SettingsPage() {
  const party = useParty();
  const autoplay = usePlayer((s) => s.autoplay);
  const crossfadeSec = usePlayer((s) => s.crossfadeSec);
  const playerTheme = usePlayer((s) => s.playerTheme);
  const wesperizedAlignment = usePlayer((s) => s.wesperizedAlignment);
  const dynamicBg = usePlayer((s) => s.dynamicBg);
  const shareHistory = useHistorySettings((s) => s.share);
  const setShareHistory = useHistorySettings((s) => s.setShare);
  const googleAuth = useGoogleAuth();
  const isGoogleSignedIn = googleAuth.signedIn;
  const { setAutoplay, setCrossfade, setPlayerTheme, setWesperizedAlignment, setDynamicBg } = usePlayer.getState();
  const [lyrics, setLyrics] = useState(false);

  return (
    <div className={settingsUi.centered}>
      <PageHeader title="Settings" />
      <div className={settingsUi.body}>
        <h2 className={settingsUi.sectionHeader}>Account & Streaming</h2>
        <section className={settingsUi.group}>
          {/* Google Account Row */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <span className={settingsUi.integrationIcon} style={{ backgroundColor: '#ffffff', color: '#4285F4' }}>
                <SiGoogle size={15} />
              </span>
              <div className="min-w-0">
                <span className="block font-medium truncate">
                  {isGoogleSignedIn ? (googleAuth.user?.name || 'Google Account') : 'Google Account'}
                </span>
                <span className="block text-[12px] text-secondary truncate">
                  {isGoogleSignedIn
                    ? (googleAuth.user?.email || 'Signed in')
                    : 'Sign in to sync your playlists and library'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-none">
              {isGoogleSignedIn ? (
                <>
                  <button
                    onClick={() => void googleAuth.syncLibrary()}
                    disabled={googleAuth.isSyncing}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={googleAuth.isSyncing ? 'animate-spin' : ''} />
                    <span>{googleAuth.isSyncing ? 'Syncing…' : 'Sync Library'}</span>
                  </button>
                  <button
                    onClick={() => googleAuth.signOut()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 text-red-400 px-3 py-1.5 text-xs font-semibold hover:bg-red-500/25 transition-colors cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    const email = window.prompt('Enter your Google Account email (or press OK for quick sign-in):', 'user@gmail.com');
                    if (email !== null) {
                      const name = email.split('@')[0] || 'Google User';
                      googleAuth.signIn({
                        id: `google_${Date.now()}`,
                        name: name.charAt(0).toUpperCase() + name.slice(1),
                        email: email.trim() || 'user@gmail.com',
                      });
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-key px-3.5 py-1.5 text-xs font-semibold text-white hover:brightness-110 transition-all cursor-pointer shadow-md"
                >
                  <LogIn size={13} />
                  <span>Sign In with Google</span>
                </button>
              )}
            </div>
          </div>

          {/* YouTube Music Standalone Indicator */}
          <div className={settingsUi.integration}>
            <Glyph Icon={SiYoutubemusic} color="#ffffff" ink="#ff0033" />
            <span className={settingsUi.integrationName}>YouTube Music</span>
            <span className={settingsUi.value}>Integrated (Standalone Web)</span>
          </div>
        </section>

        {isGoogleSignedIn && (
          <p className={settingsUi.footer}>
            Library synced {googleAuth.lastSynced ? `just now` : 'recently'}. Your playlists and library are live in the sidebar.
          </p>
        )}

        <section className={`${settingsUi.group} mt-3 empty:hidden`}>
          <Toggle
            label="Share Listening Activity to YouTube"
            detail="Songs you play here go to your YouTube Music history and shape its recommendations."
            checked={shareHistory}
            onChange={setShareHistory}
          />
        </section>

        <h2 className={settingsUi.sectionHeader}>Apple Music</h2>
        <section className={settingsUi.group}>
          <div className={settingsUi.integration}>
            <Glyph Icon={SiApplemusic} color="#fa2d48" />
            <span className={settingsUi.integrationName}>Metadata & Art</span>
            <span className={settingsUi.value}>Active</span>
          </div>
          <AppleMusicToggles />
        </section>
        <p className={settingsUi.footer}>From Apple Music’s public pages. No Apple Music account or sign-in needed.</p>

        <h2 className={settingsUi.sectionHeader}>Listen Together</h2>
        <section className={settingsUi.group}>
          <LinkRow
            to="/settings/listen-together"
            icon={<Glyph Icon={Users} color="#fa2d48" />}
            title="Listen Together"
            value={party.code ? `In party ${party.code}` : 'Listen in sync with friends'}
          />
        </section>

        <h2 className={settingsUi.sectionHeader}>Player Theme</h2>
        <section className={settingsUi.group}>
          <div className={settingsUi.controlRow}>
            <div className="min-w-0 flex-1">
              <span className="block font-medium">Player Style</span>
              <span className="block text-[12px] text-secondary">Switch the full-screen now playing visual layout.</span>
            </div>
            <CustomDropdown
              value={playerTheme}
              onChange={setPlayerTheme}
              ariaLabel="Player Theme"
              options={[
                { value: 'cinematic', label: 'Wesperzied' },
                { value: 'mesh', label: 'Classic Live Mesh' },
              ]}
            />
          </div>

          {playerTheme === 'cinematic' && (
            <div className={settingsUi.controlRow}>
              <div className="min-w-0 flex-1">
                <span className="block font-medium">Control Panel Alignment</span>
                <span className="block text-[12px] text-secondary">
                  Align song details and playback controls to the left or center of the album cover.
                </span>
              </div>
              <CustomDropdown
                value={wesperizedAlignment}
                onChange={setWesperizedAlignment}
                ariaLabel="Control Panel Alignment"
                options={[
                  { value: 'left', label: 'Left Side' },
                  { value: 'center', label: 'Centered' },
                ]}
              />
            </div>
          )}

          <Toggle
            label="Dynamic Background"
            detail="Tints all pages with the current song's album cover color."
            checked={dynamicBg}
            onChange={setDynamicBg}
          />
        </section>

        <h2 className={settingsUi.sectionHeader}>Playback</h2>
        <section className={settingsUi.group}>
          <Toggle
            label="AutoPlay"
            detail="When the queue ends, keep playing similar music."
            checked={autoplay}
            onChange={setAutoplay}
          />
          <div className={settingsUi.controlRow}>
            <span>Crossfade</span>
            <CustomDropdown
              value={crossfadeSec}
              onChange={setCrossfade}
              ariaLabel="Crossfade duration"
              options={CROSSFADE_CHOICES.map((seconds) => ({
                value: seconds,
                label: seconds === 0 ? 'Off' : `${seconds} seconds`,
              }))}
            />
          </div>
        </section>

        <h2 className={settingsUi.sectionHeader}>Lyrics</h2>
        <section className={settingsUi.group}>
          <button className={`${settingsUi.integrationPlain} ${settingsUi.linkRow}`} onClick={() => setLyrics(true)}>
            <span className={settingsUi.integrationName}>Lyric Sources</span>
            <span className={settingsUi.value}>
              Order, sources, syllable timing
              <ChevronRight size={16} />
            </span>
          </button>
        </section>
      </div>
      {lyrics && (
        <Suspense fallback={null}>
          <LyricsSettings onClose={() => setLyrics(false)} />
        </Suspense>
      )}
    </div>
  );
}
