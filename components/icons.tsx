type P = { size?: number };
const svg = (size: number, d: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

export const IconLive = ({ size = 20 }: P) =>
  svg(size, <><circle cx="12" cy="12" r="3" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" /></>);
export const IconPlus = ({ size = 20 }: P) => svg(size, <path d="M12 5v14M5 12h14" />);
export const IconBell = ({ size = 20 }: P) =>
  svg(size, <><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>);
export const IconBall = ({ size = 18 }: P) =>
  svg(size, <><circle cx="12" cy="12" r="9" /><path d="m12 7 4 3-1.5 4.5h-5L8 10z" /><path d="M12 3v4M21 10.5l-5-.5M18 19l-3.5-4.5M6 19l3.5-4.5M3 10.5l5-.5" /></>);
export const IconFlag = ({ size = 18 }: P) => svg(size, <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>);
export const IconTrophy = ({ size = 18 }: P) =>
  svg(size, <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8" /></>);
export const IconX = ({ size = 18 }: P) => svg(size, <path d="M6 6l12 12M18 6 6 18" />);
export const IconTrash = ({ size = 16 }: P) => svg(size, <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />);

/** Marca de TIMBA: una ficha/ala en V carmesí. */
export const Logo = ({ size = 40 }: P) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-label="TIMBA">
    <defs>
      <linearGradient id="lg" x1="0" x2="1">
        <stop offset="0" stopColor="#ff2b57" />
        <stop offset="1" stopColor="#b80c30" />
      </linearGradient>
    </defs>
    <path d="M3 10h34l-4 6H24l-4 16-4-16H7z" fill="url(#lg)" />
    <path d="M14 10l6 9 6-9" fill="none" stroke="#060607" strokeWidth="2.2" />
  </svg>
);
