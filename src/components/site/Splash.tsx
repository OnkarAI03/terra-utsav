const PAWS = [0, 1, 2, 3, 4];

/**
 * The loading card at the start of a visit: the team's splash art (tall on phones, wide on laptops)
 * with its paw bar brought to life, five paws lighting up one by one (about 3 seconds in all).
 * Plain HTML and CSS (`.splash` in globals.css), so it shows before any script runs and leaves by
 * itself. The head script hides it for the rest of the visit and on a tap or Esc, and reduced
 * motion never shows it. Decorative, so screen readers skip it.
 */
export function Splash() {
  return (
    <div id="splash" aria-hidden className="splash">
      <div className="splash-backdrop" />
      <div className="splash-art">
        <picture>
          <source media="(orientation: landscape)" srcSet="/images/splash/splash-wide.webp" width={1672} height={941} />
          <img src="/images/splash/splash-tall.webp" alt="" width={941} height={1672} fetchPriority="high" className="splash-img" />
        </picture>
        {/* Sits exactly over the paw bar printed in the art (positions in globals.css). */}
        <div className="splash-bar">
          {PAWS.map((i) => (
            <span key={i} className="splash-paw" style={{ animationDelay: `${450 + i * 440}ms` }}>
              <svg viewBox="0 0 64 64" className="h-full w-full">
                <g fill="currentColor">
                  <ellipse cx="32" cy="42" rx="15" ry="13" />
                  <ellipse cx="14" cy="27" rx="6.5" ry="8.5" transform="rotate(-18 14 27)" />
                  <ellipse cx="25" cy="16" rx="6.5" ry="9" transform="rotate(-6 25 16)" />
                  <ellipse cx="39" cy="16" rx="6.5" ry="9" transform="rotate(6 39 16)" />
                  <ellipse cx="50" cy="27" rx="6.5" ry="8.5" transform="rotate(18 50 27)" />
                </g>
              </svg>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
