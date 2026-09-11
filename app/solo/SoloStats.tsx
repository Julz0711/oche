"use client";
import { useMemo } from "react";
import { Panel } from "@/components/atoms";
import { HeatmapBoard } from "@/components/organisms/HeatmapBoard";
import { item } from "@/lib/games/roguelike/catalogue";
import type { RunSave } from "@/lib/solo/library";
import { aggregateRuns, viewOf } from "@/lib/solo/runStats";
import styles from "./solo.module.css";

function StatBlock({ title, stats }: { title: string; stats: [string, string | number][] }) {
  return (
    <section>
      <h2>{title}</h2>
      <div className={styles.statBlock}>
        {stats.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Lifetime House Rules stats, rebuilt from the runs saved in this browser. Runs aren't tied to
 *  an account, so this deliberately says so rather than reading like the server-side /stats. */
export default function SoloStats({ runs }: { runs: RunSave[] }) {
  // Every run has to be replayed from its action list to recover its darts, so only redo it when
  // the saved runs actually change.
  const stats = useMemo(() => {
    const views = [];
    for (const save of runs) {
      try {
        views.push(viewOf(save));
      } catch {
        // A save that no longer replays under the current rules is skipped rather than taking
        // the whole page down with it.
      }
    }
    return aggregateRuns(views);
  }, [runs]);

  if (stats.runs === 0) {
    return (
      <>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>YOUR NUMBERS</p>
            <h1>Stats</h1>
          </div>
        </div>
        <p className={styles.muted}>
          No runs saved on this browser yet. Play a run and your numbers will appear here.
        </p>
      </>
    );
  }

  return (
    <>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>YOUR NUMBERS</p>
          <h1>Stats</h1>
          <p className={styles.muted}>
            Across {stats.runs} {stats.runs === 1 ? "run" : "runs"} saved in this browser. House Rules
            runs aren&apos;t tied to your account, so these are per-device.
          </p>
        </div>
      </div>

      <StatBlock
        title="Progress"
        stats={[
          ["Runs played", stats.runs],
          ["Runs won", stats.wins],
          ["Win rate", `${stats.winRate}%`],
          ["Rounds cleared", stats.roundsCleared],
          ["Furthest round", `${stats.furthestRound}/9`],
          ["Rounds per run", stats.avgRounds],
        ]}
      />

      <StatBlock
        title="Scoring"
        stats={[
          ["Board average / 3", stats.boardAverage.toFixed(1)],
          ["Best visit", stats.bestVisit],
          ["Best run", stats.bestRun],
          ["Physical darts", stats.darts],
        ]}
      />

      <StatBlock
        title="Accuracy"
        stats={[
          ["Darts on board", `${stats.hitRate}%`],
          ["Trebles", `${stats.trebleRate}%`],
          ["Doubles", `${stats.doubleRate}%`],
          ["House number", `${stats.houseHitRate}%`],
          ["Home number", `${stats.homeHitRate}%`],
        ]}
      />

      <Panel notch="panel" className={styles.panel}>
        <h2>Where your darts land</h2>
        <p className={styles.muted}>
          Every dart across every saved run. House Rules moves the target each round, so this shows
          your grouping rather than one number you were aiming at.
        </p>
        <div className={styles.heatmapWrap}>
          <HeatmapBoard heatmap={stats.heatmap} />
        </div>
      </Panel>

      <StatBlock
        title="Economy"
        stats={[
          ["Coins earned", stats.coinsEarned],
          ["Items bought", stats.itemsBought],
        ]}
      />

      {stats.topItems.length > 0 && (
        <Panel notch="panel" className={styles.panel}>
          <h2>Your usual build</h2>
          <p className={styles.muted}>What your runs most often finish holding.</p>
          <div className={styles.tags}>
            {stats.topItems.map((entry) => (
              <span key={entry.id}>
                {item(entry.id).name} · {entry.count}
              </span>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
