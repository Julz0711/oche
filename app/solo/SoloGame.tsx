"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Target,
  Crown,
  Ticket,
  Crosshair,
  Coins,
  Backpack,
  ArrowUpRight,
} from "lucide-react";
import { CATALOGUE, item } from "@/lib/games/roguelike/catalogue";
import {
  canonicalActions,
  has,
  makeRound,
  purchasePrice,
  refreshPrice,
  replay,
  salePrice,
  summary,
} from "@/lib/games/roguelike/engine";
import { boardPoints, resolveVisit } from "@/lib/games/roguelike/scoring";
import {
  RULES_VERSION,
  type Action,
  type Config,
  type Difficulty,
  type Hit,
  type Run,
  type Owned,
} from "@/lib/games/roguelike/types";
import { decodeSave, SAVE_KEY, writeSave, type Save } from "@/lib/solo/storage";
import FriendsBoard from "./FriendsBoard";
import styles from "./solo.module.css";
const STARTERS = [16, 17, 19] as const;
const BOSSES = {
  bouncer: {
    name: "The Bouncer",
    rule: "Sector 20 is closed. No run points or effects from any 20.",
    hint: "Try repeating 19s. There is more than one way in.",
  },
  wanderer: {
    name: "The Wanderer",
    rule: "Each numbered sector scores only once per visit. Bulls stay open.",
    hint: "Spread your aim. Three numbers, three chances.",
  },
  minimalist: {
    name: "The Minimalist",
    rule: "Numbered trebles count as singles for run scoring and effects.",
    hint: "Your doubles and bulls still count at full value.",
  },
};
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
async function request(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}
function EquipmentIcon({ id }: { id: number }) {
  const Icon = [41, 42, 43, 44, 45, 46, 71].includes(id)
    ? Backpack
    : item(id).kind === "dart"
    ? Crosshair
    : item(id).kind === "consumable"
    ? Ticket
    : (id >= 61 && id <= 67) || [47, 48, 49].includes(id)
    ? Coins
    : id === 23
    ? Crown
    : Target;
  return <Icon aria-hidden="true" />;
}
function Equipment({
  owned,
  onSell,
  value,
}: {
  owned: Owned;
  onSell?: () => void;
  value?: number;
}) {
  const def = item(owned.id);
  return (
    <div className={styles.equipment}>
      <div className={styles.smallArt}>
        <EquipmentIcon id={def.id} />
      </div>
      <div>
        <strong>{def.name}</strong>
        <p>{def.description}</p>
      </div>
      {onSell && (
        <button className={styles.smallButton} onClick={onSell}>
          Sell · {value}
        </button>
      )}
    </div>
  );
}
export default function SoloGame() {
  const { data: session, status } = useSession();
  const [save, setSave] = useState<Save | null>(null),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState<"run" | "friends" | "collection">("run");
  const [difficulty, setDifficulty] = useState<Difficulty>("regular"),
    [starter, setStarter] = useState<16 | 17 | 19>(16),
    [busy, setBusy] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [boardKey, setBoardKey] = useState(0);
  const [home, setHome] = useState(20),
    [dealer, setDealer] = useState<"points" | "coins">("points"),
    [wager, setWager] = useState(false),
    [dartSlot, setDartSlot] = useState(0),
    [modifier, setModifier] = useState<"S" | "D" | "T">("S"),
    [search, setSearch] = useState("");
  const [corrupt, setCorrupt] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) setSave(decodeSave(raw));
    } catch (e) {
      setError(errorText(e));
      setCorrupt(true);
    }
    setLoaded(true);
  }, []);
  const run = useMemo(
    () => (save ? replay(save.config, save.actions) : null),
    [save]
  );
  const r = run?.round;
  function persist(config: Config, actions: Action[]) {
    const next = {
      config,
      actions: canonicalActions(actions),
      revision: crypto.randomUUID(),
    };
    writeSave(next, localStorage, save?.revision ?? null);
    setSave(next);
    setSubmitted(false);
  }
  function act(action: Action) {
    if (!save) return;
    try {
      replay(save.config, [...save.actions, action]);
      persist(save.config, [...save.actions, action]);
      setError("");
      if (action.type === "throw") setModifier("S");
      if (action.type === "next") {
        setWager(false);
        setHome(20);
        setDealer("points");
      }
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function start(ranked: boolean) {
    if (
      save &&
      run?.phase !== "won" &&
      run?.phase !== "lost" &&
      !window.confirm(
        "Start a new run? The current unfinished run will be replaced."
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      let config: Config;
      if (ranked) {
        config = (await request("/api/solo/challenge", { difficulty, starter }))
          .config;
      } else
        config = {
          id: crypto.randomUUID(),
          seed: crypto.randomUUID(),
          difficulty,
          starter,
          version: RULES_VERSION,
        };
      if (save && (run?.phase === "won" || run?.phase === "lost")) {
        const archive = JSON.parse(
          localStorage.getItem(SAVE_KEY + ".history") || "[]"
        );
        localStorage.setItem(
          SAVE_KEY + ".history",
          JSON.stringify(
            [save, ...(Array.isArray(archive) ? archive : [])].slice(0, 20)
          )
        );
      }
      persist(config, []);
      setTab("run");
      setHome(20);
      setDealer("points");
      setWager(false);
      setModifier("S");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  function exportSave() {
    const raw = localStorage.getItem(SAVE_KEY) || "{}",
      url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "oche-house-rules-run.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function recover() {
    try {
      const raw = localStorage.getItem(SAVE_KEY + ".backup");
      if (!raw)
        throw new Error(
          "No backup is available. Export the existing save before clearing it."
        );
      const backup = decodeSave(raw);
      localStorage.setItem(SAVE_KEY, raw);
      setSave(backup);
      setCorrupt(false);
      setError("Recovered the previous saved action.");
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function submit() {
    if (!save) return;
    setBusy(true);
    setError("");
    try {
      await request("/api/solo/runs", {
        id: save.config.id,
        actions: save.actions,
      });
      setSubmitted(true);
      setBoardKey((k) => k + 1);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const preview = useMemo(() => {
    if (!run || !run.round.hits.length) return null;
    return resolveVisit(structuredClone(run));
  }, [run]);
  const finished = run && (run.phase === "won" || run.phase === "lost");
  const visitSize = r ? Math.min(3, r.budget - r.spent) : 3;
  const boss = r?.boss ? BOSSES[r.boss] : null;
  const houseActive = run && run.charms.some((c) => c.id >= 68 && c.id <= 72);
  const canUndo =
    save &&
    (() => {
      try {
        canonicalActions([...save.actions, { type: "undo" }]);
        return true;
      } catch {
        return false;
      }
    })();
  const catalogue = CATALOGUE.filter((i) =>
    (i.name + " " + i.description + " " + i.kind)
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← Play
        </Link>
        <span className={styles.eyebrow}>OCHE / HOUSE RULES</span>
        <span className={styles.badge}>BETA · SOLO</span>
      </header>
      <nav className={styles.tabs} aria-label="Solo mode">
        <button
          aria-current={tab === "run" ? "page" : undefined}
          onClick={() => setTab("run")}
        >
          Your run
        </button>
        <button
          aria-current={tab === "friends" ? "page" : undefined}
          onClick={() => setTab("friends")}
        >
          Friends leaderboard
        </button>
        <button
          aria-current={tab === "collection" ? "page" : undefined}
          onClick={() => setTab("collection")}
        >
          The collection · 72
        </button>
      </nav>
      {error && (
        <div className={styles.error} role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}
      {!loaded && <p className={styles.muted}>Loading your run…</p>}
      {corrupt && (
        <section className={styles.panel}>
          <h2>Your saved run needs attention.</h2>
          <p>
            Export it before clearing it. A backup may recover the previous
            action.
          </p>
          <div className={styles.actions}>
            <button onClick={exportSave}>Export save</button>
            <button onClick={recover}>Restore backup</button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Clear the unreadable save? Export it first if you want to keep it."
                  )
                ) {
                  localStorage.removeItem(SAVE_KEY);
                  setCorrupt(false);
                  setError("");
                }
              }}
            >
              Clear unreadable save
            </button>
          </div>
        </section>
      )}
      {tab === "friends" && (
        <FriendsBoard
          key={boardKey}
          userId={session?.user?.id}
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          onStart={() => start(true)}
          busy={busy}
        />
      )}
      {tab === "collection" && (
        <>
          <div className={styles.heading}>
            <div>
              <p className={styles.eyebrow}>A DIFFERENT WAY TO THROW</p>
              <h1>Build your unfair advantage.</h1>
              <p className={styles.muted}>
                3 virtual darts · 5 shared charms · 2 consumables. Every effect
                is in the shop pool.
              </p>
            </div>
          </div>
          <label className={styles.search}>
            Find equipment
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Try extra darts, coins, or House Number"
            />
          </label>
          <div className={styles.catalogue}>
            {catalogue.map((i) => (
              <article className={styles.itemCard} key={i.id}>
                <div className={styles.art}>
                  <EquipmentIcon id={i.id} />
                  <span>{String(i.id).padStart(2, "0")}</span>
                </div>
                <span className={styles.eyebrow}>
                  {i.kind} · {i.price} coins
                </span>
                <h3>{i.name}</h3>
                <p>{i.description}</p>
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "run" && loaded && !corrupt && (
        <>
          {(!run || finished) && (
            <section className={styles.setup}>
              {!run && (
                <>
                  <p className={styles.eyebrow}>REAL DARTS. HOUSE RULES.</p>
                  <h1>
                    Your board.
                    <br />A whole new game.
                  </h1>
                  <p className={styles.intro}>
                    Beat nine rising targets. Buy enchanted darts and charms.
                    Outsmart three bosses — and then your friends.
                  </p>
                </>
              )}
              {finished && run && (
                <>
                  <div className={styles.victory}>
                    <Crown aria-hidden="true" />
                    <p className={styles.eyebrow}>
                      {run.phase === "won"
                        ? "ALL NINE ROUNDS CLEARED"
                        : "THE HOUSE WINS THIS TIME"}
                    </p>
                    <h1>
                      {run.phase === "won"
                        ? "The house is yours."
                        : "One more run?"}
                    </h1>
                  </div>
                  <div className={styles.statGrid}>
                    {Object.entries({
                      "Rounds cleared": summary(run).cleared + "/9",
                      "Run points": summary(run).rawScore,
                      "Best visit": summary(run).bestVisit,
                      "Physical darts": summary(run).darts,
                      "Board average / 3": summary(run).average.toFixed(1),
                    }).map(([label, value]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className={styles.panel}>
                    <h2>Your final build</h2>
                    <div className={styles.tags}>
                      {[
                        ...run.darts.filter((d): d is Owned => !!d),
                        ...run.charms,
                      ].map((i) => (
                        <span key={i.id}>{item(i.id).name}</span>
                      ))}
                    </div>
                    <p className={styles.muted}>
                      Personal result saved on this device. Physical hits are
                      self-reported.
                    </p>
                    {save?.config.challengeId && (
                      <div className={styles.actions}>
                        <button
                          className={styles.primary}
                          disabled={
                            busy ||
                            submitted ||
                            session?.user?.id !== save.config.owner
                          }
                          onClick={submit}
                        >
                          {submitted
                            ? "Result submitted ✓"
                            : busy
                            ? "Submitting…"
                            : "Submit to friends leaderboard"}
                        </button>
                        <button onClick={() => setTab("friends")}>
                          View friends ranking →
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
              <div className={styles.setupGrid}>
                <div className={styles.panel}>
                  <h2>Choose your pace</h2>
                  <div className={styles.actions}>
                    {(["social", "regular", "expert"] as const).map((d) => (
                      <button
                        key={d}
                        aria-pressed={difficulty === d}
                        onClick={() => setDifficulty(d)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <p className={styles.muted}>
                    12 darts to start each round. Reach the target before your
                    darts run out. Upgrades can add more.
                  </p>
                </div>
                <div className={styles.panel}>
                  <h2>Your first charm</h2>
                  <div className={styles.starters}>
                    {STARTERS.map((id) => (
                      <button
                        key={id}
                        aria-pressed={starter === id}
                        onClick={() => setStarter(id)}
                      >
                        <b>{item(id).name}</b>
                        <small>{item(id).description}</small>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.primary}
                  disabled={busy}
                  onClick={() => start(false)}
                >
                  Start solo run <ArrowUpRight size={18} />
                </button>
                {status === "authenticated" ? (
                  <button disabled={busy} onClick={() => start(true)}>
                    Play weekly friends challenge
                  </button>
                ) : (
                  <Link href="/signin?callbackUrl=/solo">
                    Sign in to challenge friends →
                  </Link>
                )}
              </div>
              <p className={styles.muted}>
                Practice works without an account. Save and resume on this
                browser. Targets and prices are still being playtested.
              </p>
            </section>
          )}
          {run && !finished && r && (
            <>
              <div className={styles.heading}>
                <div>
                  <p className={styles.eyebrow}>
                    ACT {Math.floor(r.index / 3) + 1} ·{" "}
                    {run.config.challengeId
                      ? "WEEKLY FRIENDS CHALLENGE"
                      : "SOLO RUN"}{" "}
                    · {run.config.difficulty}
                  </p>
                  <h1>
                    {run.phase === "shop"
                      ? "A little unfair advantage."
                      : run.phase === "preview" && boss
                      ? "The house has a rule."
                      : "Find your rhythm."}
                  </h1>
                  <p className={styles.muted}>
                    {run.phase === "shop"
                      ? "Spend your winnings. Shape your next visit."
                      : boss
                      ? boss.rule
                      : "A familiar board. A very different game."}
                  </p>
                </div>
                <div className={styles.stamp}>
                  <small>ROUND</small>
                  <strong>
                    {String(r.index + 1).padStart(2, "0")} <span>/ 09</span>
                  </strong>
                  {run.phase !== "shop" && <small>◉ {run.coins} coins</small>}
                </div>
              </div>
              {run.config.closesAt && (
                <p className={styles.muted}>
                  Weekly deadline:{" "}
                  {new Date(run.config.closesAt).toLocaleString()}. Finish and
                  submit before this time to join the friends ranking.
                </p>
              )}
              <div className={styles.track} aria-label="Run progress">
                {Array.from({ length: 9 }, (_, i) => (
                  <span
                    key={i}
                    className={
                      i === r.index
                        ? styles.current
                        : i < r.index
                        ? styles.done
                        : ""
                    }
                  >
                    {i < r.index ? "✓" : (i + 1) % 3 === 0 ? "♜" : i + 1}
                  </span>
                ))}
              </div>
              {run.phase === "preview" && (
                <div className={styles.previewGrid}>
                  <div className={styles.poster}>
                    <Crown />
                    <p className={styles.eyebrow}>
                      {boss ? "BOSS ENCOUNTER" : "NEXT ENCOUNTER"}
                    </p>
                    <h2>
                      {boss?.name ||
                        ["Opening round", "Raise the stakes"][r.index % 3]}
                    </h2>
                    <p>
                      {boss?.hint ||
                        "The target is rising. Let your build do some of the work."}
                    </p>
                    <div className={styles.bigTarget}>
                      {wager ? Math.ceil(r.standardTarget * 1.2) : r.target}
                      <small>POINTS TO CLEAR</small>
                    </div>
                  </div>
                  <div className={styles.panel}>
                    <h2>Before you throw</h2>
                    <p className={styles.muted}>
                      {12 + (has(run, 41) ? 2 : 0) + (has(run, 42) ? 3 : 0)}{" "}
                      darts this round · record hits in visits of up to three.
                    </p>
                    <div className={styles.house}>
                      <span>HOUSE NUMBER</span>
                      <strong>{r.house}</strong>
                      <p>
                        {houseActive
                          ? "Your rotating charms reward this number."
                          : "Find rotating-number charms in the shop to put this sector to work."}
                      </p>
                    </div>
                    {has(run, 31) && (
                      <label className={styles.field}>
                        Home Ground number
                        <select
                          value={home}
                          onChange={(e) => setHome(Number(e.target.value))}
                        >
                          {Array.from({ length: 20 }, (_, i) => (
                            <option key={i} value={i + 1}>
                              {i + 1}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {has(run, 72) && (
                      <label className={styles.field}>
                        Dealer’s Choice
                        <select
                          value={dealer}
                          onChange={(e) =>
                            setDealer(e.target.value as "points" | "coins")
                          }
                        >
                          <option value="points">
                            +20 points per House Number hit
                          </option>
                          <option value="coins">
                            Every second hit earns a coin
                          </option>
                        </select>
                      </label>
                    )}
                    {has(run, 67) && r.index < 8 && (
                      <label className={styles.field}>
                        <input
                          type="checkbox"
                          checked={wager}
                          onChange={(e) => setWager(e.target.checked)}
                        />
                        High Roller: +20% target for +3 coins on clearance
                      </label>
                    )}
                    <button
                      className={styles.primary}
                      onClick={() =>
                        act({ type: "start", home, dealer, wager })
                      }
                    >
                      Step up to the oche →
                    </button>
                    <p className={styles.muted}>
                      Choices lock when the round starts. You can correct
                      recorded darts before confirming the round result.
                    </p>
                  </div>
                </div>
              )}
              {(run.phase === "playing" || run.phase === "pending") && (
                <div className={styles.playGrid}>
                  <div>
                    <section className={`${styles.panel} ${styles.scorePanel}`}>
                      <div className={styles.between}>
                        <span className={styles.eyebrow}>ROUND SCORE</span>
                        <span>
                          {r.budget - r.spent - r.hits.length} darts left
                        </span>
                      </div>
                      <div className={styles.score}>
                        <strong>{r.score}</strong>
                        <span>/ {r.target}</span>
                      </div>
                      <progress
                        max={r.target}
                        value={Math.min(r.target, r.score)}
                        aria-label="Round progress"
                      />
                      <div className={styles.between}>
                        <span>
                          {Math.max(0, r.target - r.score)} points to go
                        </span>
                        <span>◉ {r.coins} pending coins</span>
                      </div>
                    </section>
                    <section className={styles.panel}>
                      <div className={styles.between}>
                        <h2>
                          {run.phase === "pending"
                            ? r.score >= r.target
                              ? "Round cleared."
                              : "So close. Run over."
                            : "Your visit"}
                        </h2>
                        <span className={styles.muted}>
                          Visit {r.visits.length + 1}
                        </span>
                      </div>
                      <div className={styles.dartSlots}>
                        {run.darts.map((dart, i) => (
                          <div key={i}>
                            <small>
                              DART {i + 1} ·{" "}
                              {dart ? item(dart.id).name : "Standard"}
                            </small>
                            <strong>
                              {r.hits[i]
                                ? r.hits[i].ring === "M"
                                  ? "MISS"
                                  : `${r.hits[i].ring}${r.hits[i].sector}`
                                : run.phase === "playing" && i < visitSize
                                ? "—"
                                : "·"}
                            </strong>
                          </div>
                        ))}
                      </div>
                      <div className={styles.breakdown} aria-live="polite">
                        {preview
                          ? `${preview.base} eligible + ${
                              preview.bonus
                            } bonus · ×${preview.mult.toFixed(2)}${
                              preview.amplifier !== 1
                                ? " · ×" + preview.amplifier
                                : ""
                            } = ${preview.score} run points`
                          : "Throw your darts, then record the actual hits in order."}
                      </div>
                      {run.phase === "playing" && (
                        <>
                          <div className={styles.keypad}>
                            {Array.from({ length: 20 }, (_, i) => (
                              <button
                                key={i}
                                className={
                                  houseActive && r.house === i + 1
                                    ? styles.houseKey
                                    : ""
                                }
                                aria-label={`Record ${modifier}${i + 1}`}
                                disabled={r.hits.length >= visitSize}
                                onClick={() =>
                                  act({
                                    type: "throw",
                                    hit: { sector: i + 1, ring: modifier },
                                  })
                                }
                              >
                                {i + 1}
                                {houseActive && r.house === i + 1 ? " ★" : ""}
                              </button>
                            ))}
                          </div>
                          <div className={styles.inputActions}>
                            <button
                              aria-pressed={modifier === "D"}
                              onClick={() =>
                                setModifier(modifier === "D" ? "S" : "D")
                              }
                            >
                              Double
                            </button>
                            <button
                              aria-pressed={modifier === "T"}
                              onClick={() =>
                                setModifier(modifier === "T" ? "S" : "T")
                              }
                            >
                              Treble
                            </button>
                            {(
                              [
                                { sector: 25, ring: "OB" },
                                { sector: 25, ring: "IB" },
                                { sector: 0, ring: "M" },
                              ] as Hit[]
                            ).map((hit) => (
                              <button
                                key={hit.ring}
                                disabled={r.hits.length >= visitSize}
                                onClick={() => act({ type: "throw", hit })}
                              >
                                {hit.ring === "M"
                                  ? "Miss"
                                  : `Bull ${boardPoints(hit)}`}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      <div className={styles.actions}>
                        <button
                          disabled={!canUndo}
                          onClick={() => act({ type: "undo" })}
                        >
                          ↶ Undo dart
                        </button>
                        {run.phase === "playing" ? (
                          <button
                            className={styles.primary}
                            disabled={r.hits.length !== visitSize}
                            onClick={() => act({ type: "bank" })}
                          >
                            {r.hits.length === visitSize
                              ? `Score visit · +${preview?.score} →`
                              : `Record ${visitSize - r.hits.length} more dart${
                                  visitSize - r.hits.length === 1 ? "" : "s"
                                }`}
                          </button>
                        ) : (
                          <button
                            className={styles.primary}
                            onClick={() => act({ type: "commit" })}
                          >
                            {r.score >= r.target && r.index < 8
                              ? "Confirm result & open shop →"
                              : "Confirm final result →"}
                          </button>
                        )}
                      </div>
                      {run.phase === "pending" && (
                        <p className={styles.muted}>
                          Confirming locks this round’s throws and payouts.
                        </p>
                      )}
                    </section>
                    {r.visits.length > 0 && (
                      <details className={styles.panel}>
                        <summary>Visit history & scoring effects</summary>
                        {r.visits.map((v, i) => (
                          <div className={styles.visitHistory} key={i}>
                            <strong>
                              Visit {i + 1}: {v.score} run points{" "}
                              <small>({v.board} board)</small>
                            </strong>
                            <p>
                              {v.hits
                                .map((h) =>
                                  h.ring === "M"
                                    ? "Miss"
                                    : `${h.ring}${h.sector}`
                                )
                                .join(" · ")}
                            </p>
                            {v.effects.map((e, j) => (
                              <p key={j}>
                                {e.label}:{" "}
                                {[
                                  e.points ? `+${e.points} points` : "",
                                  e.mult ? `+${e.mult} mult` : "",
                                  e.coins ? `+${e.coins} coins` : "",
                                  e.darts ? `+${e.darts} darts` : "",
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            ))}
                          </div>
                        ))}
                      </details>
                    )}
                  </div>
                  <aside>
                    <div className={styles.panel}>
                      <span className={styles.eyebrow}>DART BUDGET</span>
                      <strong className={styles.budget}>
                        {r.budget - r.spent - r.hits.length}
                        <small> / {r.budget}</small>
                      </strong>
                      <p className={styles.muted}>
                        12 baseline + {r.budget - 12} extra darts
                      </p>
                      {houseActive && (
                        <div className={styles.house}>
                          <span>THIS ROUND</span>
                          <strong>{r.house}</strong>
                          {has(run, 69) && (
                            <p>Bounty: {r.counts.coin69 || 0} / 3 coins</p>
                          )}
                          {has(run, 71) && (
                            <p>
                              Encore: {Math.min(3, r.counts.house || 0)} / 3
                              hits
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className={styles.between}>
                      <h2>Your charms</h2>
                      <span>{run.charms.length} / 5</span>
                    </div>
                    {run.charms.map((c) => (
                      <Equipment key={c.id} owned={c} />
                    ))}
                    <h2 className={styles.spaced}>
                      In your pocket · {run.consumables.length} / 2
                    </h2>
                    {run.consumables.map((c, i) => (
                      <div key={i} className={styles.panel}>
                        <Equipment owned={c} />
                        {c.id === 60 && (
                          <label className={styles.field}>
                            Virtual dart
                            <select
                              value={dartSlot}
                              onChange={(e) =>
                                setDartSlot(Number(e.target.value))
                              }
                            >
                              {run.darts.map((d, j) => (
                                <option key={j} value={j}>
                                  {j + 1}: {d ? item(d.id).name : "Standard"}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <button
                          disabled={
                            run.phase !== "playing" ||
                            !!r.hits.length ||
                            r.usedBoundary
                          }
                          onClick={() =>
                            act({ type: "use", id: c.id, slot: dartSlot })
                          }
                        >
                          Use {item(c.id).name}
                        </button>
                      </div>
                    ))}
                    {!run.consumables.length && (
                      <p className={styles.muted}>
                        Find tactical powerups in the shop.
                      </p>
                    )}
                    {r.usedBoundary && r.hits.length === 0 && (
                      <button onClick={() => act({ type: "cancelUse" })}>
                        Cancel powerup
                      </button>
                    )}
                    {r.usedBoundary && (
                      <p className={styles.muted}>
                        Powerup active for this visit:{" "}
                        {r.power
                          ? item(r.power).name
                          : "Pocket Dart (+1 dart granted)"}
                      </p>
                    )}
                  </aside>
                </div>
              )}
              {run.phase === "shop" && (
                <>
                  <div className={styles.shopToolbar}>
                    <div
                      className={styles.shopWallet}
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      <span className={styles.eyebrow}>YOUR BALANCE</span>
                      <div>
                        <Coins aria-hidden="true" />
                        <strong>{run.coins}</strong>
                        <span>coins</span>
                      </div>
                      <small>
                        +{run.results.at(-1)?.coins ?? 0} earned last round
                      </small>
                    </div>
                    <div className={styles.shopToolbarActions}>
                      <button
                        disabled={run.coins < refreshPrice(run)}
                        onClick={() => act({ type: "refresh" })}
                      >
                        Refresh offers <span>◉ {refreshPrice(run)}</span>
                      </button>
                      <button
                        className={styles.primary}
                        onClick={() => act({ type: "next" })}
                      >
                        Next round <ArrowUpRight size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className={styles.shopNotice}>
                    <Crown />
                    <div>
                      <b>
                        Next:{" "}
                        {makeRound(run.config, r.index + 1).boss
                          ? BOSSES[makeRound(run.config, r.index + 1).boss!]
                              .name
                          : "Raise the stakes"}{" "}
                        · {makeRound(run.config, r.index + 1).target} points
                      </b>
                      <p>
                        House Number: {makeRound(run.config, r.index + 1).house}
                        .{" "}
                        {makeRound(run.config, r.index + 1).boss
                          ? BOSSES[makeRound(run.config, r.index + 1).boss!]
                              .rule
                          : "Pick an upgrade that fits your next round."}
                      </p>
                    </div>
                  </div>
                  <div className={styles.shopShelfHeading}>
                    <div>
                      <h2>Fresh on the counter</h2>
                      <p>Find something that changes your next throw.</p>
                    </div>
                    <div className={styles.shopSlotCounts}>
                      <span>{run.charms.length}/5 charms</span>
                      <span>{run.darts.filter(Boolean).length}/3 darts</span>
                      <span>{run.consumables.length}/2 powerups</span>
                    </div>
                  </div>
                  <label className={`${styles.field} ${styles.shopDartSelect}`}>
                    New dart purchases go into
                    <select
                      value={dartSlot}
                      onChange={(e) => setDartSlot(Number(e.target.value))}
                    >
                      {run.darts.map((d, i) => (
                        <option key={i} value={i}>
                          Slot {i + 1}:{" "}
                          {d ? item(d.id).name : "Standard (empty)"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className={styles.shopGrid}>
                    {run.offers.map((o, i) => {
                      const def = item(o.id);
                      const price = purchasePrice(run, o.id);
                      const shortfall = Math.max(0, price - run.coins);
                      const slotBlocked =
                        def.kind === "charm"
                          ? run.charms.length >= 5
                          : def.kind === "consumable"
                          ? run.consumables.length >= 2
                          : !!run.darts[dartSlot];
                      const blockedReason =
                        def.kind === "dart"
                          ? `Dart slot ${dartSlot + 1} is occupied`
                          : `${
                              def.kind === "charm" ? "Charm" : "Powerup"
                            } slots are full`;
                      return (
                        <article
                          className={`${styles.itemCard} ${styles.shopItem} ${
                            o.sold ? styles.purchasedItem : ""
                          }`}
                          key={`${run.shop.generation}-${i}`}
                        >
                          <div className={styles.art}>
                            <EquipmentIcon id={o.id} />
                            <span>{String(o.id).padStart(2, "0")}</span>
                          </div>
                          <span className={styles.eyebrow}>{def.kind}</span>
                          <h2>{def.name}</h2>
                          <p>{def.description}</p>
                          <div className={styles.shopPurchase}>
                            <div className={styles.shopPrice}>
                              <span>
                                <Coins size={17} aria-hidden="true" />
                                <strong>{price}</strong>
                                {price < def.price && <del>{def.price}</del>}
                              </span>
                              <small>
                                {o.sold
                                  ? "Added to your build"
                                  : shortfall
                                  ? `Need ${shortfall} more coin${
                                      shortfall === 1 ? "" : "s"
                                    }`
                                  : slotBlocked
                                  ? blockedReason
                                  : `${
                                      run.coins - price
                                    } coins left after buying`}
                              </small>
                            </div>
                            <button
                              className={
                                !o.sold && !shortfall && !slotBlocked
                                  ? styles.primary
                                  : undefined
                              }
                              disabled={o.sold || shortfall > 0 || slotBlocked}
                              onClick={() =>
                                act({ type: "buy", offer: i, slot: dartSlot })
                              }
                              aria-label={
                                o.sold
                                  ? `${def.name} purchased`
                                  : `Buy ${def.name} for ${price} coins`
                              }
                            >
                              {o.sold
                                ? "Purchased ✓"
                                : shortfall
                                ? "Not enough coins"
                                : slotBlocked
                                ? "Free a slot to buy"
                                : "Buy upgrade →"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <details className={`${styles.panel} ${styles.shopBuild}`}>
                    <summary>
                      <span>
                        Your build{" "}
                        <small>{run.charms.length} / 5 charms equipped</small>
                      </span>
                      <span>Manage equipment ↓</span>
                    </summary>
                    <p className={styles.muted}>
                      Sell equipment to free a slot or top up your balance. You
                      can also rearrange your three darts here.
                    </p>
                    <div className={styles.setupGrid}>
                      <div>
                        {run.charms.map((c) => (
                          <Equipment
                            key={c.id}
                            owned={c}
                            value={salePrice(run, c)}
                            onSell={() => act({ type: "sell", id: c.id })}
                          />
                        ))}
                      </div>
                      <div>
                        <h3>Virtual darts · exactly 3 slots</h3>
                        {run.darts.map((d, i) => (
                          <div key={i} className={styles.dartInventory}>
                            <span>Slot {i + 1}</span>
                            {d ? (
                              <Equipment
                                owned={d}
                                value={salePrice(run, d)}
                                onSell={() => act({ type: "sell", id: d.id })}
                              />
                            ) : (
                              <p className={styles.muted}>Standard Dart</p>
                            )}
                            <button
                              onClick={() =>
                                act({ type: "swap", from: i, to: (i + 1) % 3 })
                              }
                            >
                              Swap with slot {((i + 1) % 3) + 1}
                            </button>
                          </div>
                        ))}
                        <h3>Consumables · {run.consumables.length} / 2</h3>
                        {run.consumables.map((c, i) => (
                          <Equipment
                            key={i}
                            owned={c}
                            value={salePrice(run, c)}
                            onSell={() => act({ type: "sell", id: c.id })}
                          />
                        ))}
                      </div>
                    </div>
                  </details>
                </>
              )}
              <div className={styles.runFooter}>
                <span>Saved on this browser after every action.</span>
                <button onClick={exportSave}>Export run</button>
                <button disabled={busy} onClick={() => start(false)}>
                  Start a new practice run
                </button>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
