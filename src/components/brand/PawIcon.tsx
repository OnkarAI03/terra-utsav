export function PawIcon({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <g fill="currentColor">
        <ellipse cx="32" cy="42" rx="15" ry="13" />
        <ellipse cx="14" cy="27" rx="6.5" ry="8.5" transform="rotate(-18 14 27)" />
        <ellipse cx="25" cy="16" rx="6.5" ry="9" transform="rotate(-6 25 16)" />
        <ellipse cx="39" cy="16" rx="6.5" ry="9" transform="rotate(6 39 16)" />
        <ellipse cx="50" cy="27" rx="6.5" ry="8.5" transform="rotate(18 50 27)" />
      </g>
    </svg>
  );
}
