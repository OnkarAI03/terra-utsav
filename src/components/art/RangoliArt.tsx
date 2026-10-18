import { cn } from "@/lib/cn";

/** A rangoli medallion: concentric rings of petals and dots in festival colours. Decorative. */
export function RangoliArt({ className }: { className?: string }) {
  const ring = (n: number, r: number, rx: number, ry: number, fill: string, offset = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = (360 / n) * i + offset;
      return <ellipse key={`${r}-${i}`} cx="0" cy={-r} rx={rx} ry={ry} fill={fill} transform={`rotate(${a})`} />;
    });
  const dots = (n: number, r: number, size: number, fill: string, offset = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((360 / n) * i + offset) * (Math.PI / 180);
      return <circle key={`d${r}-${i}`} cx={Math.sin(a) * r} cy={-Math.cos(a) * r} r={size} fill={fill} />;
    });

  return (
    <svg viewBox="-200 -200 400 400" aria-hidden className={cn("pointer-events-none", className)}>
      <circle r="196" fill="none" stroke="#ffc93c" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
      {ring(16, 160, 20, 34, "#e0457b")}
      {ring(16, 160, 12, 22, "#ffc93c", 0)}
      {dots(32, 186, 4, "#fbefdb", 5.6)}
      {ring(12, 112, 18, 36, "#f28c28", 15)}
      {ring(12, 112, 9, 20, "#fff3b0", 15)}
      {dots(24, 138, 3.5, "#1fa5a0")}
      <circle r="84" fill="#1fa5a0" opacity="0.85" />
      {ring(8, 56, 16, 30, "#ffc93c", 22.5)}
      {ring(8, 56, 8, 16, "#e0457b", 22.5)}
      <circle r="26" fill="#931f33" />
      <circle r="14" fill="#ffc93c" />
      {dots(8, 40, 3.5, "#fbefdb", 0)}
    </svg>
  );
}
