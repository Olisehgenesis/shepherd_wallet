/** Editorial orbital privacy illustration for the landing hero. */
export function OrbitalPrivacy({ className = "" }: { className?: string }) {
  return (
    <figure className={`orbital ${className}`} aria-label="Orbital privacy network illustration">
      <div className="orbital-frame">
        <img
          src="/orbital-privacy.jpg"
          alt="Abstract network of privacy nodes and orbital signal paths in forest green on ivory."
          width={960}
          height={960}
          decoding="async"
        />
        <svg className="orbital-rings" viewBox="0 0 400 400" aria-hidden="true">
          <ellipse className="orbital-ring orbital-ring-a" cx="200" cy="200" rx="148" ry="148" />
          <ellipse className="orbital-ring orbital-ring-b" cx="200" cy="200" rx="118" ry="72" />
          <ellipse className="orbital-ring orbital-ring-c" cx="200" cy="200" rx="72" ry="118" />
          <circle className="orbital-node" cx="348" cy="200" r="4" />
          <circle className="orbital-node" cx="200" cy="52" r="3.5" />
          <circle className="orbital-node orbital-node-mint" cx="78" cy="268" r="3" />
        </svg>
        <div className="orbital-emblem" aria-hidden="true">
          <img src="/icon-64.png" width={36} height={36} alt="" decoding="async" />
        </div>
      </div>
      <figcaption className="orbital-caption">
        <span>signal · verify · admit</span>
      </figcaption>
    </figure>
  );
}
