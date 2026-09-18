import { ArrowUpRight, Crown, Crosshair, Coins } from "lucide-react";
import { Panel } from "@/components/atoms/Panel";
import { replay, summary } from "@/lib/games/roguelike/engine";
import type { RunSave } from "@/lib/solo/library";
import styles from "./solo.module.css";

export default function SoloHub({
  runs,
  onOpen,
  onNew,
}: {
  runs: RunSave[];
  onOpen: (save: RunSave) => void;
  onNew: () => void;
}) {
  const entries = runs.map((save) => {
    const run = replay(save.config, save.actions);
    return {
      save,
      run,
      ended: !!save.abandonedAt || run.phase === "won" || run.phase === "lost",
    };
  });
  return (
    <section>
      <div className={styles.hubHero}>
        <div className={styles.hubCrest} aria-hidden="true"><Crown size={36} /><span>IX</span></div>
        <div>
          <p className={styles.eyebrow}>NINE ROUNDS. ONE CONTENDER.</p>
          <h1>House Rules</h1>
          <p className={styles.hubMotto}>The board is familiar.<br />The house plays differently.</p>
          <p className={styles.muted}>Throw real darts. Build a powerful set of upgrades. Beat the house before your darts run out.</p>
        </div>
        <button className={styles.primary} onClick={onNew}>
          New run <ArrowUpRight size={16} aria-hidden="true" />
        </button>
        <div className={styles.hubRules}>
          <span><Crosshair size={16} aria-hidden="true" /><b>9</b> rounds</span>
          <span><Crown size={16} aria-hidden="true" /><b>3</b> bosses</span>
          <span><Coins size={16} aria-hidden="true" />Earn & upgrade</span>
        </div>
      </div>
      {(["Continue playing", "Past runs"] as const).map((label, index) => {
        const group = entries.filter((entry) => entry.ended === (index === 1));
        return (
          <section key={label} className={styles.hubSection}>
            <h2>
              {label} <small>· {group.length}</small>
            </h2>
            {!group.length ? (
              <p className={styles.muted}>
                {index === 0
                  ? "No runs in progress. Start a run to step up to the oche."
                  : "Completed and abandoned runs will appear here."}
              </p>
            ) : (
              <div className={styles.hubGrid}>
                {group.map(({ save, run, ended }) => (
                  <Panel
                    key={save.config.id}
                    className={styles.hubRun}
                  >
                    <div className={styles.hubRunInfo}>
                      <span className={styles.eyebrow}>
                        {save.config.challengeId
                          ? "Weekly friends challenge"
                          : "Practice"}{" "}
                        · {run.config.difficulty}
                      </span>
                      <h3>
                        {save.abandonedAt
                          ? "Abandoned"
                          : run.phase === "won"
                          ? "Run won"
                          : run.phase === "lost"
                          ? "Run lost"
                          : `Round ${run.round.index + 1} of 9`}
                      </h3>
                      <p className={styles.muted}>
                        {summary(run).cleared} rounds cleared ·{" "}
                        {summary(run).rawScore} run points · {run.coins} coins
                      </p>
                      <p className={styles.muted}>
                        {save.updatedAt
                          ? new Date(save.updatedAt).toLocaleString()
                          : "Saved run"}{" "}
                        · #{save.config.id.slice(0, 8)}
                      </p>
                    </div>
                    {!save.abandonedAt && (
                      <button
                        className={ended ? undefined : styles.primary}
                        onClick={() => onOpen(save)}
                      >
                        {ended ? "View result" : "Resume run"}
                      </button>
                    )}
                    {save.abandonedAt && (
                      <p className={styles.muted}>
                        Ended early · excluded from leaderboards
                      </p>
                    )}
                  </Panel>
                ))}
              </div>
            )}
          </section>
        );
      })}
      <p className={styles.muted}>
        Runs are saved separately on this browser. Starting another run keeps
        your existing progress.
      </p>
    </section>
  );
}
