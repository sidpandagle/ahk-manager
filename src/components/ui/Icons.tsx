// Inline SVG icon set — 16×16 viewport, 1.5px stroke
// Matches the icon set from ui.jsx exactly

import React from "react";

const ico = (
  d: React.ReactNode,
  opts: { size?: number; sw?: number } = {}
) => (
  <svg
    width={opts.size ?? 14}
    height={opts.size ?? 14}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={opts.sw ?? 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

export const Icon = {
  Play: () =>
    ico(<polygon points="4 3 13 8 4 13" fill="currentColor" stroke="none" />),
  Stop: () =>
    ico(
      <rect
        x="3.5"
        y="3.5"
        width="9"
        height="9"
        rx="1"
        fill="currentColor"
        stroke="none"
      />
    ),
  Plus: () =>
    ico(
      <>
        <line x1="8" y1="3" x2="8" y2="13" />
        <line x1="3" y1="8" x2="13" y2="8" />
      </>
    ),
  Trash: () =>
    ico(
      <>
        <path d="M3 4h10" />
        <path d="M5 4V2.5A1 1 0 0 1 6 2h4a1 1 0 0 1 1 1V4" />
        <path d="M4 4l1 9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l1-9" />
      </>
    ),
  Edit: () => ico(<path d="M11 2l3 3-8 8H3v-3l8-8z" />),
  Copy: () =>
    ico(
      <>
        <rect x="4" y="4" width="9" height="9" rx="1.5" />
        <path d="M11 4V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h1" />
      </>
    ),
  Search: () =>
    ico(
      <>
        <circle cx="7" cy="7" r="4" />
        <line x1="10" y1="10" x2="13" y2="13" />
      </>
    ),
  Close: () =>
    ico(
      <>
        <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" />
        <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
      </>
    ),
  Check: () => ico(<polyline points="3 8.5 6.5 12 13 4.5" />),
  Settings: () =>
    ico(
      <>
        <circle cx="8" cy="8" r="1.6" />
        <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
      </>
    ),
  Upload: () =>
    ico(
      <>
        <path d="M8 11V3M5 6l3-3 3 3" />
        <path d="M2.5 11v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" />
      </>
    ),
  Download: () =>
    ico(
      <>
        <path d="M8 3v8M5 8l3 3 3-3" />
        <path d="M2.5 13h11" />
      </>
    ),
  Drag: () =>
    ico(
      <>
        <circle cx="6" cy="4" r="0.6" fill="currentColor" />
        <circle cx="10" cy="4" r="0.6" fill="currentColor" />
        <circle cx="6" cy="8" r="0.6" fill="currentColor" />
        <circle cx="10" cy="8" r="0.6" fill="currentColor" />
        <circle cx="6" cy="12" r="0.6" fill="currentColor" />
        <circle cx="10" cy="12" r="0.6" fill="currentColor" />
      </>
    ),
  Min: () =>
    ico(<line x1="3" y1="8" x2="13" y2="8" />, { sw: 1.2 }),
  Max: () =>
    ico(<rect x="3.5" y="3.5" width="9" height="9" />, { sw: 1.2 }),
  X: () =>
    ico(
      <>
        <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" />
        <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
      </>,
      { sw: 1.2 }
    ),
  Warn: () =>
    ico(
      <>
        <path d="M8 2L1.5 13h13z" />
        <line x1="8" y1="6" x2="8" y2="9" />
        <circle cx="8" cy="11" r="0.6" fill="currentColor" stroke="none" />
      </>
    ),
  Lightning: () =>
    ico(
      <polygon
        points="9 1 3 9 7 9 6 15 13 7 9 7"
        fill="currentColor"
        stroke="none"
      />
    ),
  Folder: () =>
    ico(
      <path d="M2 5a1 1 0 0 1 1-1h3l1 1.5h6a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z" />
    ),
  Code: () =>
    ico(
      <>
        <path d="M5 4l-3 4 3 4M11 4l3 4-3 4" />
      </>
    ),
};

export type IconName = keyof typeof Icon;
