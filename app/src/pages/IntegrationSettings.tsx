import { useAppleAccess } from '@/data/apple/artistArt';
import { useAppleSettings } from '@/data/apple/motionArt';
import { useHostAccess } from '@/extension/useHostAccess';
import { settingsUi } from './settingsStyles';

/** A row switch with its title and detail. */
export function Toggle({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={settingsUi.controlRow}>
      <span className={settingsUi.rowText}>
        <span>{label}</span>
        {detail && <span className={settingsUi.rowDetail}>{detail}</span>}
      </span>
      <input
        type="checkbox"
        className={settingsUi.switch}
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
    </label>
  );
}

/** Allowed, or an Allow button that opens the permission prompt. */
function HostAccessValue({ access, request }: ReturnType<typeof useHostAccess>) {
  const text = { checking: 'Checking…', unavailable: 'Active', granted: 'Allowed', needed: 'Not allowed' }[access];
  return (
    <span className={settingsUi.value}>
      <span>{text}</span>
      {access === 'needed' && (
        <button className={settingsUi.inlineButton} onClick={request}>
          Allow
        </button>
      )}
    </span>
  );
}

/** The Apple Music section's access row: one grant covers artist art and animated artwork. */
export function AppleMusicIntegration() {
  return <HostAccessValue {...useAppleAccess()} />;
}

/** The Apple Music section's switches. Neither needs an Apple Music account. */
export function AppleMusicToggles() {
  const { artistArt, motion, setArtistArt, setMotion } = useAppleSettings();
  return (
    <>
      <Toggle
        label="Artist Art"
        detail="Artist pages take Apple Music’s photo, logo and colour."
        checked={artistArt}
        onChange={setArtistArt}
      />
      <Toggle
        label="Animated Artwork"
        detail="Apple Music’s moving covers in the full-screen player and on album pages. Not on metered connections or with reduced motion."
        checked={motion}
        onChange={setMotion}
      />
    </>
  );
}
