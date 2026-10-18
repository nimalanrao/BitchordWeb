# Design System & Styling (`app/src/styles`)

This directory houses the foundational CSS design tokens, typography rules, color palettes, and Tailwind CSS v4 configuration for BitChord Web, measured directly from Apple Music's Web client.

## Directory Structure & Files

| File | Purpose |
|---|---|
| [tokens.css](file:///d:/BitchordWeb/app/src/styles/tokens.css) | Core CSS Custom Properties: typography, layout measurements, border radii, z-indices, glassmorphism filters, light/dark color palettes, and dynamic album artwork page tints. |
| [global.css](file:///d:/BitchordWeb/app/src/styles/global.css) | Tailwind CSS v4 entry point (`@layer theme, base, components, utilities;`). Declares custom animations, utility extensions (`glass-material`, `glass-pill`, `type-*`), `@font-face` fonts, and accessibility resets. |

## Design Tokens Summary (`tokens.css`)

### 1. Typography
Tokens follow Apple's exact font shorthand (`<weight> <size>/<line-height> DM Sans`):
- `var(--header-emphasized)`: 700 34px / 40px
- `var(--large-title-emphasized)`: 700 26px / 32px
- `var(--title-1-emphasized)`: 700 22px / 26px
- `var(--title-2-emphasized)`: 700 17px / 22px
- `var(--body)`: 400 13px / 16px
- `var(--callout-emphasized)`: 600 12px / 15px
- `var(--subhead-emphasized)`: 600 11px / 14px

### 2. Layout Measurements
- `--web-navigation-width`: `260px` (desktop sidebar width)
- `--body-gutter`: `25px` on tablets, `40px` on wide screens (`≥1000px`)
- `--player-pill-height`: `56px`
- `--player-bottom-offset`: `20px`
- `--side-panel-width`: `300px`
- `--mobile-top-bar-height`: `52px`

### 3. Glassmorphism Utilities
- `glass-material`: Translucent backdrop blur used by the sidebar and panels (`var(--glassMaterialBackground)` + `backdrop-filter`).
- `glass-pill`: Double pseudo-element pill with outer drop shadow, inner 0.5px stroke, and 2.2x saturation blur.

### 4. Keyframe Animations
- `animate-tab-fade`: Hardware-accelerated 220ms page and tab switching crossfade.
- `animate-menu-in`: Snappy scale + fade for dropdown menus.
- `animate-slide-in`: Smooth drawer slide for side panel.
- `animate-enter`: Elegant zoom-in entrance for full-screen player.

## How to Make Common Changes

### 1. Change Accent / Key Color
Open [tokens.css](file:///d:/BitchordWeb/app/src/styles/tokens.css):
- Light mode: `--keyColor` (line 84, default Apple red `#d60017`).
- Dark mode: `--keyColor` (line 167, default `#fa586a`).

### 2. Customize Page Switch Fade Speed
Open [global.css](file:///d:/BitchordWeb/app/src/styles/global.css):
- Look for `--animate-tab-fade` (line 49):
  ```css
  --animate-tab-fade: tab-fade 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
  ```
- Change `0.22s` to your desired duration.
