const base = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function NavHome() {
  return (
    <svg {...base}>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M5.5 9.8V18a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9.8" />
      <circle className="dot dot-pink" cx="12" cy="14.6" r="2.3" stroke="none" />
    </svg>
  );
}

export function NavSearch() {
  return (
    <svg {...base}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.2 15.2 19 19" />
      <circle className="dot dot-yellow" cx="19.6" cy="19.6" r="2.2" stroke="none" />
    </svg>
  );
}

export function NavReels() {
  return (
    <svg {...base}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="4.5" />
      <path d="M3.5 9.5h17" />
      <path className="dot dot-blue" d="M10.4 12.4v4.4l3.8-2.2z" stroke="none" />
    </svg>
  );
}

export function NavChat() {
  return (
    <svg {...base}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z" />
      <circle className="dot dot-pink" cx="8.6" cy="10.5" r="1.3" stroke="none" />
      <circle className="dot dot-yellow" cx="12" cy="10.5" r="1.3" stroke="none" />
      <circle className="dot dot-blue" cx="15.4" cy="10.5" r="1.3" stroke="none" />
    </svg>
  );
}

export function NavTrophy() {
  return (
    <svg {...base}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5.5a1 1 0 0 0-1 1v.5A3.5 3.5 0 0 0 8 11" />
      <path d="M16 6h2.5a1 1 0 0 1 1 1v.5A3.5 3.5 0 0 1 16 11" />
      <path d="M12 13v4M8.5 20h7M10 17h4" />
      <circle className="dot dot-yellow" cx="12" cy="8" r="1.7" stroke="none" />
    </svg>
  );
}

export function NavBell() {
  return (
    <svg {...base}>
      <path d="M6.5 17v-6a5.5 5.5 0 0 1 11 0v6l1.5 1.5H5z" />
      <path d="M10 21h4" />
      <circle className="dot dot-pink" cx="18" cy="5.2" r="2.3" stroke="none" />
    </svg>
  );
}

export function NavSliders() {
  return (
    <svg {...base}>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle className="dot dot-pink" cx="8" cy="6" r="2.4" stroke="none" />
      <circle className="dot dot-yellow" cx="16" cy="12" r="2.4" stroke="none" />
      <circle className="dot dot-blue" cx="10" cy="18" r="2.4" stroke="none" />
    </svg>
  );
}