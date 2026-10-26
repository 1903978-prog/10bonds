// The owner's 10BONDS mark (a "1" bar and an "0" ring), cropped to its drawing so it sizes to the header.
export default function Logo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="38 24 144 172" className={className} fill="none" aria-hidden="true">
      <rect x="46" y="32" width="22" height="156" rx="8" fill="#13293D" />
      <rect x="94" y="32" width="80" height="156" rx="38" stroke="#13293D" strokeWidth="16" fill="none" />
    </svg>
  );
}
