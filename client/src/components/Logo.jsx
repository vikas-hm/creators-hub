const COLORS = {
  dark: { ring: '#2dd4c0', pink: '#ff708e', yellow: '#ffc146', blue: '#6e8cfe' },
  light: { ring: '#109d95', pink: '#ef456a', yellow: '#f5a301', blue: '#3563ff' },
};

export function LogoMark({ size = 32, variant = 'dark' }) {
  const c = COLORS[variant] || COLORS.dark;

  return (
    <svg
      className="logo-mark"
      width={(size * 178) / 184}
      height={size}
      viewBox="-105 -92 178 184"
      aria-hidden="true"
    >
      <path
        d="M 53.7 -64.6 A 84 84 0 1 0 53.7 64.6"
        fill="none"
        stroke={c.ring}
        strokeWidth="12"
      />
      <g stroke={c.ring} strokeWidth="12">
        <line x1="0" y1="0" x2="-85" y2="0" />
        <line x1="0" y1="0" x2="53.7" y2="-64.6" />
        <line x1="0" y1="0" x2="53.7" y2="64.6" />
      </g>
      <circle r="32" fill={c.ring} />
      <circle cx="-85" cy="0" r="19" fill={c.pink} />
      <circle cx="53.7" cy="-64.6" r="19" fill={c.yellow} />
      <circle cx="53.7" cy="64.6" r="19" fill={c.blue} />
    </svg>
  );
}

export default function Logo({ variant = 'dark', size = 30, text = true }) {
  return (
    <span className={'logo logo-' + variant}>
      <LogoMark size={size} variant={variant} />
      {text && (
        <span className="logo-text">
          Creators <span>Hub</span>
        </span>
      )}
    </span>
  );
}