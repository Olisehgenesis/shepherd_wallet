export function Mark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3 13 L9 3 L15 13" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 13 L9 7.5 L12 13" fill="none" stroke="#f54e00" strokeWidth="1.6" />
    </svg>
  );
}

const checks = [
  ["Ping the vault", "Admitted"],
  ["Value to an unknown target", "VERIFY rejected"],
  ["Sweep", "Waiting for you"],
];

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="gate">
      <header className="gate-bar">
        <div className="mark">
          <Mark />
          Shepherd
        </div>
      </header>
      <div className="gate-copy">
        <h1>The agent never holds the key that can empty the wallet.</h1>
        <p>
          You keep the owner key. The agent gets a session key that can only do what the account’s VERIFY frame
          allowlists. A drain that isn’t on that list never gets approved. Reads inside the console go through
          Anon‑RPC, and the worker still sees the request.
        </p>
        <button className="btn gate-cta" type="button" onClick={onEnter}>
          Open the console
        </button>
      </div>
      <aside className="gate-strip" aria-label="What VERIFY decides">
        <p>Same three checks the console runs.</p>
        <ol>
          {checks.map(([action, verdict]) => (
            <li key={action}>
              <span>{action}</span>
              <strong>{verdict}</strong>
            </li>
          ))}
        </ol>
      </aside>
      <p className="gate-foot">Devnet only. Keys stay in this browser. Nothing on this page phones home.</p>
    </div>
  );
}
