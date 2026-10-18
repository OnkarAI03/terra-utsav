import { useId } from "react";
import type { MascotVariant } from "@/lib/types";

/**
 * Role outfits drawn over the single locked Koochu Puchu render (public/images/mascot/
 * koochu-idle-cream.webp, 900 x 900). Only clothing and accessories change, so every team member's
 * mascot is unmistakably the same character. Coordinates follow the render's landmarks:
 * headband ornament (430, 205), eyes (390, 380) and (542, 352), neck y ~545, chest (470, 650).
 * Replace with full outfit renders when they are produced (see docs/ASSET_MANIFEST.md).
 */
export function OutfitOverlay({ variant, className }: { variant: MascotVariant; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const shadow = `outfit-shadow-${uid}`;
  const ink = "#3a1f14";

  return (
    <svg viewBox="0 0 900 900" className={className} aria-hidden>
      <defs>
        <filter id={shadow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#2b140d" floodOpacity="0.35" />
        </filter>
        <linearGradient id={`cloth-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b02a3f" />
          <stop offset="1" stopColor="#7a1a2a" />
        </linearGradient>
        <linearGradient id={`white-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e9dfd0" />
        </linearGradient>
        <linearGradient id={`gold-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7d58c" />
          <stop offset="1" stopColor="#c8862e" />
        </linearGradient>
      </defs>
      <g filter={`url(#${shadow})`} strokeLinejoin="round" strokeLinecap="round">
        {variant === "food" && (
          <>
            <g transform="rotate(-6 445 165)">
              <path
                d="M330 168 L336 104 C300 96 290 40 340 30 C356 -6 420 -10 446 18 C470 -10 540 -6 552 34 C600 40 596 98 556 104 L562 168 Z"
                fill={`url(#white-${uid})`}
                stroke={ink}
                strokeWidth="6"
              />
              <path d="M336 140 L558 140" stroke="#d8ccba" strokeWidth="5" />
              <rect x="326" y="148" width="240" height="30" rx="12" fill="#f4ede2" stroke={ink} strokeWidth="6" />
            </g>
            <Neckerchief fill={`url(#cloth-${uid})`} trim={`url(#gold-${uid})`} ink={ink} />
          </>
        )}

        {variant === "operations" && (
          <>
            <path d="M398 538 C410 590 440 630 458 652" stroke="#931f33" strokeWidth="16" fill="none" />
            <path d="M542 532 C530 588 500 628 482 652" stroke="#931f33" strokeWidth="16" fill="none" />
            <rect x="412" y="640" width="116" height="140" rx="14" fill="#fbefdb" stroke={ink} strokeWidth="6" />
            <rect x="412" y="640" width="116" height="36" rx="14" fill="#931f33" stroke={ink} strokeWidth="6" />
            <rect x="460" y="630" width="20" height="22" rx="5" fill="#c9c9c9" stroke={ink} strokeWidth="4" />
            <Paw x={470} y={715} scale={0.62} fill="#931f33" />
            <rect x="432" y="748" width="76" height="9" rx="4" fill="#d6c3a5" />
          </>
        )}

        {variant === "marketing" && (
          <>
            <path d="M392 540 C400 590 420 620 428 640" stroke="#2b2b2f" strokeWidth="12" fill="none" />
            <path d="M548 534 C540 586 520 620 512 640" stroke="#2b2b2f" strokeWidth="12" fill="none" />
            <rect x="388" y="626" width="164" height="104" rx="18" fill="#2f2f35" stroke="#121214" strokeWidth="6" />
            <rect x="404" y="610" width="40" height="20" rx="5" fill="#2f2f35" stroke="#121214" strokeWidth="5" />
            <circle cx="470" cy="678" r="38" fill="#4a4a52" stroke="#121214" strokeWidth="5" />
            <circle cx="470" cy="678" r="24" fill="#3c6f97" />
            <circle cx="461" cy="669" r="8" fill="#ffffff" opacity="0.75" />
            <circle cx="530" cy="644" r="7" fill="#e14b4b" />
          </>
        )}

        {variant === "finance" && (
          <>
            <path d="M470 552 L404 520 L404 586 Z" fill={`url(#cloth-${uid})`} stroke={ink} strokeWidth="6" />
            <path d="M470 552 L536 520 L536 586 Z" fill={`url(#cloth-${uid})`} stroke={ink} strokeWidth="6" />
            <rect x="452" y="534" width="36" height="36" rx="10" fill="#7a1a2a" stroke={ink} strokeWidth="6" />
            <circle cx="420" cy="540" r="5" fill="#f7d58c" />
            <circle cx="420" cy="566" r="5" fill="#f7d58c" />
            <circle cx="520" cy="540" r="5" fill="#f7d58c" />
            <circle cx="520" cy="566" r="5" fill="#f7d58c" />
            <circle cx="520" cy="672" r="34" fill={`url(#gold-${uid})`} stroke={ink} strokeWidth="6" />
            <text x="520" y="688" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="44" fill={ink}>
              ₹
            </text>
          </>
        )}

        {variant === "games" && (
          <>
            <path d="M394 540 C404 610 440 646 470 652 C500 646 536 610 546 540" stroke={`url(#gold-${uid})`} strokeWidth="10" fill="none" />
            <path d="M394 540 C404 610 440 646 470 652 C500 646 536 610 546 540" stroke={ink} strokeWidth="2" fill="none" opacity="0.4" />
            <rect x="430" y="646" width="92" height="44" rx="22" fill="#d9dde3" stroke={ink} strokeWidth="6" />
            <rect x="508" y="652" width="44" height="22" rx="6" fill="#c3c8cf" stroke={ink} strokeWidth="5" />
            <circle cx="456" cy="668" r="12" fill="#9aa1ab" />
            <circle cx="470" cy="652" r="8" fill="none" stroke={ink} strokeWidth="5" />
          </>
        )}

        {variant === "logistics" && (
          <>
            <path d="M318 566 L414 548 L428 796 L330 806 Z" fill="#f0a43a" stroke={ink} strokeWidth="6" />
            <path d="M526 548 L622 566 L612 806 L512 796 Z" fill="#f0a43a" stroke={ink} strokeWidth="6" />
            <path d="M322 690 L420 680 L422 706 L324 716 Z" fill="#eef1f4" opacity="0.95" />
            <path d="M520 680 L618 690 L616 716 L518 706 Z" fill="#eef1f4" opacity="0.95" />
            <path d="M326 740 L424 732 L425 752 L327 760 Z" fill="#eef1f4" opacity="0.8" />
            <path d="M516 732 L614 740 L613 760 L515 752 Z" fill="#eef1f4" opacity="0.8" />
          </>
        )}

        {variant === "design" && (
          <>
            <g transform="rotate(-10 450 150)">
              <ellipse cx="450" cy="150" rx="150" ry="50" fill={`url(#cloth-${uid})`} stroke={ink} strokeWidth="6" />
              <path d="M330 162 C380 186 520 186 570 162" stroke="#5e1220" strokeWidth="6" fill="none" />
              <rect x="440" y="88" width="16" height="22" rx="6" fill="#7a1a2a" stroke={ink} strokeWidth="5" />
            </g>
            <path d="M610 250 L712 104" stroke="#8a5a2b" strokeWidth="14" />
            <path d="M712 104 L736 70" stroke={`url(#gold-${uid})`} strokeWidth="18" />
            <path d="M736 70 L744 58" stroke="#931f33" strokeWidth="12" />
          </>
        )}

        {variant === "mentor" && (
          <>
            <path d="M392 524 L446 542 L424 846 L360 842 Z" fill={`url(#cloth-${uid})`} stroke={ink} strokeWidth="6" />
            <path d="M494 542 L548 524 L580 842 L516 846 Z" fill={`url(#cloth-${uid})`} stroke={ink} strokeWidth="6" />
            <path d="M406 560 L388 830 M432 566 L414 834" stroke="#f7d58c" strokeWidth="4" strokeDasharray="10 10" />
            <path d="M508 566 L528 834 M534 560 L554 830" stroke="#f7d58c" strokeWidth="4" strokeDasharray="10 10" />
            <circle cx="405" cy="700" r="9" fill="#f7d58c" />
            <circle cx="536" cy="700" r="9" fill="#f7d58c" />
            <g fill="rgb(255 255 255 / 0.08)" stroke="#d99a3c" strokeWidth="8">
              <circle cx="390" cy="382" r="56" />
              <circle cx="544" cy="352" r="54" />
            </g>
            <path d="M444 372 Q468 352 492 356" stroke="#d99a3c" strokeWidth="8" fill="none" />
            <path d="M334 376 L296 362 M598 344 L640 330" stroke="#d99a3c" strokeWidth="8" />
          </>
        )}

        {variant === "generic" && <Neckerchief fill={`url(#cloth-${uid})`} trim={`url(#gold-${uid})`} ink={ink} />}
      </g>
    </svg>
  );
}

function Neckerchief({ fill, trim, ink }: { fill: string; trim: string; ink: string }) {
  return (
    <>
      <path d="M382 532 C430 552 510 552 558 528 L478 632 Z" fill={fill} stroke={ink} strokeWidth="6" />
      <path d="M392 540 C436 558 506 558 548 536" stroke={trim} strokeWidth="6" fill="none" />
      <circle cx="472" cy="552" r="17" fill={fill} stroke={ink} strokeWidth="6" />
    </>
  );
}

function Paw({ x, y, scale, fill }: { x: number; y: number; scale: number; fill: string }) {
  return (
    <g transform={`translate(${x - 32 * scale} ${y - 32 * scale}) scale(${scale})`} fill={fill}>
      <ellipse cx="32" cy="42" rx="15" ry="13" />
      <ellipse cx="14" cy="27" rx="6.5" ry="8.5" />
      <ellipse cx="25" cy="16" rx="6.5" ry="9" />
      <ellipse cx="39" cy="16" rx="6.5" ry="9" />
      <ellipse cx="50" cy="27" rx="6.5" ry="8.5" />
    </g>
  );
}

export const VARIANT_LABEL: Record<MascotVariant, string> = {
  food: "Kitchen crew",
  operations: "Operations",
  marketing: "Marketing and media",
  finance: "Finance",
  games: "Games and activities",
  logistics: "Logistics",
  design: "Design and creative",
  mentor: "Mentor",
  generic: "TERRA crew",
};
