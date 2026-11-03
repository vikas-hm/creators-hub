const tracks = [
  [
    { l: 2, w: 26, c: 'pink' },
    { l: 31, w: 18, c: 'yellow' },
    { l: 52, w: 30, c: 'teal' },
  ],
  [
    { l: 10, w: 20, c: 'teal' },
    { l: 34, w: 34, c: 'pink' },
    { l: 72, w: 20, c: 'yellow' },
  ],
  [
    { l: 0, w: 40, c: 'yellow' },
    { l: 44, w: 16, c: 'teal' },
    { l: 64, w: 28, c: 'pink' },
  ],
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth">
      <aside className="stage">
        <div className="brand">Creators Hub</div>

        <div className="stage-copy">
          <h1>Show your cut.</h1>
          <p>
            Post your edits and photos, get honest feedback from other
            students, and enter the weekly edit challenge.
          </p>
        </div>

        <div className="timeline" aria-hidden="true">
          {tracks.map((clips, i) => (
            <div className="track" key={i}>
              {clips.map((clip, j) => (
                <span
                  key={j}
                  className={'clip ' + clip.c}
                  style={{ left: clip.l + '%', width: clip.w + '%' }}
                />
              ))}
            </div>
          ))}
          <div className="playhead" />
        </div>
      </aside>

      <main className="panel">
        <div className="panel-inner">
          <h2>{title}</h2>
          <p className="sub">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}