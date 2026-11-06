import { useMemo, useState } from "react";

type IntentId = "ping" | "drain" | "sweep";

type Step = {
  id: string;
  title: string;
  detail: string;
  status: "pass" | "fail" | "wait" | "info";
};

const INTENTS: Record<
  IntentId,
  {
    label: string;
    target: string;
    selector: string;
    value: string;
    policy: "allow" | "deny" | "high";
    art: string;
  }
> = {
  ping: {
    label: "vault.ping()",
    target: "ShepherdVault",
    selector: "ping()",
    value: "0 ETH",
    policy: "allow",
    art: "/how/asset-allow.jpg",
  },
  drain: {
    label: "value → unknown",
    target: "0x…unknown",
    selector: "(plain transfer)",
    value: "0.5 ETH",
    policy: "deny",
    art: "/how/asset-deny.jpg",
  },
  sweep: {
    label: "vault.sweep()",
    target: "ShepherdVault",
    selector: "sweep()",
    value: "session cap",
    policy: "high",
    art: "/how/asset-cosign.jpg",
  },
};

function buildSteps(id: IntentId, cosigned: boolean): Step[] {
  const intent = INTENTS[id];
  const base: Step[] = [
    {
      id: "request",
      title: "1 · Agent requests",
      detail: `Session key proposes ${intent.label} to ${intent.target}.`,
      status: "info",
    },
    {
      id: "verify",
      title: "2 · VERIFY checks",
      detail: "Signer must be an active session. Frame data mode is 0x01. Target, selector, and value are read from the SENDER frame.",
      status: "pass",
    },
  ];

  if (intent.policy === "deny") {
    return [
      ...base,
      {
        id: "policy",
        title: "3 · Policy evaluation",
        detail: "ShepherdPolicy has no allow rule for this target/selector (or value exceeds the session cap).",
        status: "fail",
      },
      {
        id: "result",
        title: "4 · Result",
        detail: "VERIFY reverts before APPROVE. Typical verdict: TargetDenied. Nothing executes.",
        status: "fail",
      },
    ];
  }

  if (intent.policy === "high") {
    return [
      ...base,
      {
        id: "policy",
        title: "3 · Policy evaluation",
        detail: "Rule mode is high-risk. A second signature is required from the owner or a registered P256 co-signer.",
        status: "wait",
      },
      cosigned
        ? {
            id: "result",
            title: "4 · Result",
            detail: "Co-signature present. VERIFY can APPROVE. On a staked alt mempool path the frame can be admitted.",
            status: "pass",
          }
        : {
            id: "result",
            title: "4 · Result",
            detail: "No co-signature yet. Verdict: NeedsCosign. The healthy agent refuses to sign this alone.",
            status: "wait",
          },
    ];
  }

  return [
    ...base,
    {
      id: "policy",
      title: "3 · Policy evaluation",
      detail: "ShepherdPolicy returns allow for this target and selector. Value is under the session cap.",
      status: "pass",
    },
    {
      id: "result",
      title: "4 · Result",
      detail: "VERIFY APPROVEs. Canonical still rejects the external policy storage read; after stake the alt mempool can admit.",
      status: "pass",
    },
  ];
}

export function Simulator() {
  const [intent, setIntent] = useState<IntentId>("ping");
  const [cosigned, setCosigned] = useState(false);
  const steps = useMemo(() => buildSteps(intent, cosigned), [intent, cosigned]);
  const current = INTENTS[intent];
  const verdict =
    current.policy === "deny"
      ? "TargetDenied"
      : current.policy === "high"
        ? cosigned
          ? "admitted"
          : "NeedsCosign"
        : "admitted (after stake)";

  return (
    <div className="sim">
      <div className="sim-intents" role="tablist" aria-label="Demo intents">
        {(Object.keys(INTENTS) as IntentId[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            className="sim-intent"
            aria-selected={intent === id}
            onClick={() => {
              setIntent(id);
              setCosigned(false);
            }}
          >
            {INTENTS[id].label}
          </button>
        ))}
      </div>

      <div className="sim-grid">
        <figure className="sim-art">
          <img src={current.art} alt="" />
        </figure>
        <div className="sim-meta">
          <dl>
            <div>
              <dt>Target</dt>
              <dd>{current.target}</dd>
            </div>
            <div>
              <dt>Selector</dt>
              <dd>
                <code>{current.selector}</code>
              </dd>
            </div>
            <div>
              <dt>Value</dt>
              <dd>{current.value}</dd>
            </div>
            <div>
              <dt>Verdict</dt>
              <dd>
                <span className={`sim-verdict sim-verdict-${verdict.startsWith("admitted") ? "ok" : verdict === "NeedsCosign" ? "wait" : "bad"}`}>
                  {verdict}
                </span>
              </dd>
            </div>
          </dl>
          {current.policy === "high" && (
            <label className="sim-toggle">
              <input type="checkbox" checked={cosigned} onChange={(e) => setCosigned(e.target.checked)} />
              Owner / P256 co-signature present
            </label>
          )}
        </div>
      </div>

      <ol className="sim-steps">
        {steps.map((step) => (
          <li key={step.id} data-status={step.status}>
            <strong>{step.title}</strong>
            <p>{step.detail}</p>
          </li>
        ))}
      </ol>
      <p className="guide-note">
        Simulator mirrors ShepherdPolicy modes used in the demo: allow (ping), deny (unknown transfer), high-risk (sweep).
      </p>
    </div>
  );
}
