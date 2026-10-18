# Listen Together / Party Sync (`app/src/party`)

This directory implements BitChord's real-time **Listen Together** party feature, allowing multiple users to listen to music simultaneously in perfect synchronization across different devices and browsers.

## Directory Structure & Files

| File | Purpose |
|---|---|
| [listenTogether.ts](file:///d:/BitchordWeb/app/src/party/listenTogether.ts) | Session lifecycle: room creation, joining via invite code, room state persistence across page reloads, and host authority delegation. |
| [partySync.ts](file:///d:/BitchordWeb/app/src/party/partySync.ts) | The synchronization engine: listens for playback state events, calculates timing skew, and performs subtle drift corrections or hard seeks to keep guests aligned with the host. |
| [clock.ts](file:///d:/BitchordWeb/app/src/party/clock.ts) | Network clock synchronization algorithm (NTP-like RTT calculation) compensating for network latency between clients. |
| [invite.ts](file:///d:/BitchordWeb/app/src/party/invite.ts) | Short invite code generator, clipboard sharing link formatting, and code validation. |
| [models.ts](file:///d:/BitchordWeb/app/src/party/models.ts) | Data transfer contracts, message schemas (Play, Pause, Seek, QueueUpdate, Heartbeat), and user participant models. |
| [queueReading.ts](file:///d:/BitchordWeb/app/src/party/queueReading.ts) | Synchronizes the host's play queue with all party participants. |
| [useParty.ts](file:///d:/BitchordWeb/app/src/party/useParty.ts) | Reactive hook exposing party connection status to UI components. |

## How Synchronization Works

1. **Host Authority**: The host controls playback (track changes, pauses, seeks).
2. **Heartbeats**: The host periodically broadcasts its current playback position along with a synchronized timestamp.
3. **Drift Compensation**:
   - Skew < 250ms: Audio plays naturally without interruption.
   - Skew 250ms - 1500ms: Audio playback rate is subtly adjusted by ±5% to seamlessly realign without audible jumps.
   - Skew > 1500ms: Hard seek occurs to immediately snap guest audio to the host's position.

## How to Make Common Changes

### 1. Adjust Drift Correction Thresholds
Open [partySync.ts](file:///d:/BitchordWeb/app/src/party/partySync.ts):
- Look for `SOFT_SYNC_THRESHOLD_MS` and `HARD_SYNC_THRESHOLD_MS` to modify the tolerance before speed adjustments or seeks trigger.

### 2. Customize Invite URLs
Open [invite.ts](file:///d:/BitchordWeb/app/src/party/invite.ts):
- Modifies how `/invite/:code` links are created and copied to the user's clipboard.
