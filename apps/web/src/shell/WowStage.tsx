import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Outcome } from "../../../../packages/core/src/ops.js";
import { paths } from "./destinations";
import { useStore } from "../store";

type BeatId = "canonical" | "alt-unstaked" | "stake" | "alt-admit" | "drain" | "sweep" | "cosign";

type BeatResult = {
  verdict: string;
  explorerUrl?: string;
  at: number;
};

const BEATS: readonly {
  id: BeatId;
  n: string;
  title: string;
  expect: string;
  say: string;
}[] = [
  {
    id: "canonical",
    n: "01",
    title: "Canonical ping",
    expect: "canonical-storage-read",
    say: "Same VERIFY policy read. Canonical mempool rejects.",
  },
  {
    id: "alt-unstaked",
    n: "02",
    title: "Alt, unstaked",
    expect: "unstaked-storage-read",
    say: "Alt still rejects the external ShepherdPolicy slot.",
  },
  {
    id: "stake",
    n: "03",
    title: "Owner stakes",
    expect: "admitted",
    say: "Owner-path addStake. No policy read — works while unstaked.",
  },
  {
    id: "alt-admit",
    n: "04",
    title: "Alt, staked ping",
    expect: "admitted",
    say: "Same agent ping. Now admitted — open the explorer link.",
  },
  {
    id: "drain",
    n: "05",
    title: "Injected drain",
    expect: "TargetDenied",
    say: "Agent tries an unknown target. VERIFY denies before APPROVE.",
  },
  {
    id: "sweep",
    n: "06",
    title: "High-risk sweep",
    expect: "NeedsCosign",
    say: "Allowlisted as high-risk. Agent alone cannot clear it.",
  },
  {
    id: "cosign",
    n: "07",
    title: "Owner co-signs",
    expect: "admitted",
    say: "Owner secp256k1 unlocks APPROVE. Explorer link again.",
  },
] as const;

function labelOutcome(outcome: Outcome | null): BeatResult | null {
  if (!outcome) return null;
  const reason = outcome.reason || "";
  const verdict =
    /storage-read|TargetDenied|NeedsCosign/i.test(reason)
      ? reason
      : reason && reason !== "included"
        ? `${outcome.verdict}:${reason}`
        : outcome.verdict;
  return { verdict, explorerUrl: outcome.explorerUrl, at: Date.now() };
}

export function WowStage() {
  const store = useStore();
  const [results, setResults] = useState<Partial<Record<BeatId, BeatResult>>>({});
  const [cursor, setCursor] = useState(0);
  const [running, setRunning] = useState(false);
  const [line, setLine] = useState("Same VERIFY read. Three mempool verdicts — then the leash.");

  const ready = Boolean(store.deployed && store.live?.active);
  const staked = Boolean(store.live?.staked);

  const progress = useMemo(() => BEATS.filter((b) => results[b.id]).length, [results]);

  async function playBeat(id: BeatId): Promise<boolean> {
    setLine(BEATS.find((b) => b.id === id)?.say ?? "");
    let outcome: Outcome | null = null;
    if (id === "canonical") outcome = await store.runIntent("canonical");
    else if (id === "alt-unstaked" || id === "alt-admit") outcome = await store.runIntent("alt");
    else if (id === "stake") outcome = await store.stakeAccount();
    else if (id === "drain") outcome = await store.runIntent("drain");
    else if (id === "sweep") outcome = await store.runIntent("sweep");
    else if (id === "cosign") outcome = await store.runIntent("sweep-cosign");

    const labeled = labelOutcome(outcome);
    if (!labeled) {
      setLine(store.error || "That beat did not finish. Check the ops log.");
      return false;
    }
    setResults((prev) => ({ ...prev, [id]: labeled }));
    if (labeled.explorerUrl) setLine(`Explorer: ${labeled.verdict}`);
    else setLine(`${labeled.verdict}`);
    return true;
  }

  async function runNext() {
    if (!ready || running) return;
    setRunning(true);
    try {
      let i = cursor;
      // Skip unstaked beat if already staked and that slot empty — still allow manual replay
      if (BEATS[i]?.id === "alt-unstaked" && staked && !results["alt-unstaked"]) {
        setResults((prev) => ({
          ...prev,
          "alt-unstaked": { verdict: "skipped (already staked)", at: Date.now() },
        }));
        i += 1;
      }
      if (BEATS[i]?.id === "stake" && staked && !results.stake) {
        setResults((prev) => ({
          ...prev,
          stake: { verdict: "already staked", at: Date.now() },
        }));
        i += 1;
      }
      const beat = BEATS[i];
      if (!beat) {
        setLine("Leash demo complete. Same call: reject → reject → admit — drain dies, sweep waits.");
        return;
      }
      const ok = await playBeat(beat.id);
      if (ok) setCursor(i + 1);
    } finally {
      setRunning(false);
    }
  }

  async function runAll() {
    if (!ready || running) return;
    setRunning(true);
    setResults({});
    setCursor(0);
    try {
      for (let i = 0; i < BEATS.length; i++) {
        const beat = BEATS[i];
        if (beat.id === "alt-unstaked" && store.live?.staked) {
          setResults((prev) => ({
            ...prev,
            "alt-unstaked": { verdict: "skipped (already staked)", at: Date.now() },
          }));
          setCursor(i + 1);
          continue;
        }
        if (beat.id === "stake" && store.live?.staked) {
          setResults((prev) => ({
            ...prev,
            stake: { verdict: "already staked", at: Date.now() },
          }));
          setCursor(i + 1);
          continue;
        }
        const ok = await playBeat(beat.id);
        setCursor(i + 1);
        if (!ok && beat.id !== "sweep") break;
        // sweep waiting is success for the beat
        if (!ok && beat.id === "sweep") break;
      }
      setLine("Leash demo complete. Open explorer links on admitted beats.");
    } finally {
      setRunning(false);
    }
  }

  if (!store.deployed) {
    return (
      <section className="wow">
        <header className="wow-hero">
          <p className="wow-kicker">Judge path</p>
          <h1>Canonical reject → stake → admit → leash</h1>
          <p>Prepare the account on Home, then grant a session. This stage runs the wow beats live.</p>
        </header>
        <Button asChild>
          <Link to={paths.home}>Go to Home</Link>
        </Button>
      </section>
    );
  }

  if (!store.live?.active) {
    return (
      <section className="wow">
        <header className="wow-hero">
          <p className="wow-kicker">Judge path</p>
          <h1>Need an active session</h1>
          <p>Issue a session key first. Then this page walks mempool physics and the agent leash.</p>
        </header>
        <Button asChild>
          <Link to={paths.session}>Open Session</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="wow" aria-label="Shepherd wow demo">
      <header className="wow-hero">
        <p className="wow-kicker">Judge path · {progress}/{BEATS.length}</p>
        <h1>Same VERIFY read. Then the leash.</h1>
        <p className="wow-lead">{line}</p>
        <div className="wow-actions">
          <Button disabled={store.busy || running} onClick={() => void runNext()}>
            {cursor >= BEATS.length ? "Done" : `Run beat ${String(cursor + 1).padStart(2, "0")}`}
          </Button>
          <Button variant="outline" disabled={store.busy || running} onClick={() => void runAll()}>
            Run full leash demo
          </Button>
          <Button
            variant="ghost"
            disabled={running}
            onClick={() => {
              setResults({});
              setCursor(0);
              setLine("Same VERIFY read. Three mempool verdicts — then the leash.");
            }}
          >
            Reset board
          </Button>
        </div>
      </header>

      <ol className="wow-board">
        {BEATS.map((beat, index) => {
          const result = results[beat.id];
          const active = index === cursor && cursor < BEATS.length;
          const done = Boolean(result);
          const tone = result
            ? /Cosign|waiting/i.test(result.verdict)
              ? "wait"
              : /Denied|storage-read|reject/i.test(result.verdict)
                ? "deny"
                : "ok"
            : active
              ? "active"
              : "idle";
          return (
            <li key={beat.id} className={`wow-beat is-${tone}`} aria-current={active ? "step" : undefined}>
              <div className="wow-beat-n">{beat.n}</div>
              <div className="wow-beat-body">
                <strong>{beat.title}</strong>
                <p>{beat.say}</p>
                <code className="wow-expect">expect · {beat.expect}</code>
                {result && (
                  <div className="wow-result">
                    <span>{result.verdict}</span>
                    {result.explorerUrl && (
                      <a href={result.explorerUrl} target="_blank" rel="noreferrer">
                        Explorer ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={store.busy || running}
                onClick={() => {
                  void (async () => {
                    setRunning(true);
                    try {
                      await playBeat(beat.id);
                    } finally {
                      setRunning(false);
                    }
                  })();
                }}
              >
                Fire
              </Button>
            </li>
          );
        })}
      </ol>

      <p className="wow-foot">
        Say out loud: <em>the agent key is not the owner key; denial is VERIFY, not the prompt.</em> Intents lab stays at{" "}
        <Link to={paths.intents}>demo/intents</Link>.
      </p>
    </section>
  );
}
