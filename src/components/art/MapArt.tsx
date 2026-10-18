/** A playful, clearly illustrative stall map. Not a real location. */
export function MapArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 240" className={className} role="img" aria-label="Illustrated map with a pin marking the TERRA UTSAV stall">
      <defs>
        <clipPath id="map-clip">
          <path d="M14 18 Q20 8 40 10 L288 6 Q310 8 308 30 L312 206 Q310 230 286 230 L36 234 Q12 232 12 210 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#map-clip)">
        <rect width="320" height="240" fill="#efe3c8" />
        <path d="M0 70 C80 60 120 90 200 80 S300 60 320 66" stroke="#fbf3e2" strokeWidth="22" fill="none" />
        <path d="M110 0 C120 70 96 140 120 240" stroke="#fbf3e2" strokeWidth="18" fill="none" />
        <path d="M0 170 C90 160 190 190 320 160" stroke="#fbf3e2" strokeWidth="16" fill="none" />
        <path d="M230 0 C226 80 250 160 236 240" stroke="#fbf3e2" strokeWidth="14" fill="none" />
        <rect x="18" y="92" width="72" height="56" rx="10" fill="#a9c79a" />
        <rect x="140" y="98" width="76" height="50" rx="10" fill="#e6c9a0" />
        <rect x="256" y="92" width="48" height="58" rx="10" fill="#a9c79a" />
        <rect x="24" y="190" width="70" height="40" rx="10" fill="#e6c9a0" />
        <rect x="142" y="196" width="70" height="40" rx="10" fill="#a9c79a" />
        <circle cx="60" cy="38" r="16" fill="#a9c79a" />
        <circle cx="282" cy="200" r="18" fill="#a9c79a" />
        <path d="M150 120 l8 -8 l8 8 l8 -8 l8 8" stroke="#c9a47a" strokeWidth="3" fill="none" />
      </g>
      <path
        d="M14 18 Q20 8 40 10 L288 6 Q310 8 308 30 L312 206 Q310 230 286 230 L36 234 Q12 232 12 210 Z"
        fill="none"
        stroke="#3a1f14"
        strokeWidth="5"
      />
      {/* Pin */}
      <g transform="translate(178 58)">
        <ellipse cx="0" cy="62" rx="16" ry="5" fill="#000" opacity="0.2" />
        <path d="M0 60 C-6 42 -26 30 -26 10 A26 26 0 1 1 26 10 C26 30 6 42 0 60Z" fill="#931f33" stroke="#3a1f14" strokeWidth="3" />
        <circle cx="0" cy="8" r="10" fill="#fbefdb" />
        <g fill="#931f33" transform="translate(-6 1) scale(0.19)">
          <ellipse cx="32" cy="42" rx="15" ry="13" />
          <ellipse cx="14" cy="27" rx="6.5" ry="8.5" />
          <ellipse cx="25" cy="16" rx="6.5" ry="9" />
          <ellipse cx="39" cy="16" rx="6.5" ry="9" />
          <ellipse cx="50" cy="27" rx="6.5" ry="8.5" />
        </g>
      </g>
    </svg>
  );
}
