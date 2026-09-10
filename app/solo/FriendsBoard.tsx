"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { item } from "@/lib/games/roguelike/catalogue";
import type { Difficulty, Owned } from "@/lib/games/roguelike/types";
import styles from "./solo.module.css";
import RunDetails from "./RunDetails";
interface Row {
  id: string;
  owner: string;
  name: string;
  rank: number;
  cleared: number;
  progress: number;
  darts: number;
  rawScore: number;
  bestVisit: number;
  attempts: number;
  build: Owned[];
  completedAt: string;
}
interface Board {
  challenge: {
    id: string;
    closesAt: string;
  };
  rows: Row[];
  friendCount: number;
}
export default function FriendsBoard({
  userId,
  difficulty,
  onDifficulty,
  onStart,
  busy,
}: {
  userId?: string;
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onStart: () => void;
  busy: boolean;
}) {
  const [board, setBoard] = useState<Board | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setBoard(null);
    setSelected(null);
    setError("");
    if (userId) {
      setLoading(true);
      fetch(`/api/solo/leaderboard?difficulty=${difficulty}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (res) => {
          const body = await res.json();
          if (!res.ok)
            throw new Error(body.error || "Leaderboard unavailable.");
          return body as Board;
        })
        .then((data) => {
          if (!cancelled) setBoard(data);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    const onFocus = () => setRefresh((n) => n + 1);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      controller.abort();
      window.removeEventListener("focus", onFocus);
    };
  }, [userId, difficulty, refresh]);
  const own = board?.rows.find((r) => r.owner === userId),
    above = own && board?.rows.filter((r) => r.rank < own.rank).at(-1);
  return (
    <section>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>THE SAME HOUSE. YOUR FRIENDS.</p>
          <h1>Who owns the board?</h1>
          <p className={styles.muted}>
            A shared weekly seed. The same bosses, shop pool, and House Numbers.
          </p>
        </div>
      </div>
      <div className={styles.actions}>
        {(["social", "regular", "expert"] as const).map((d) => (
          <button
            key={d}
            aria-pressed={difficulty === d}
            onClick={() => onDifficulty(d)}
          >
            {d}
          </button>
        ))}
      </div>
      {!userId ? (
        <div className={styles.panel}>
          <h2>Your friends are the competition.</h2>
          <p>
            Sign in to enter the weekly challenge and compare builds with
            accepted friends.
          </p>
          <Link className={styles.primary} href="/signin?callbackUrl=/solo">
            Sign in →
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          {loading && (
            <p className={styles.muted}>Loading this week’s board…</p>
          )}
          {board && (
            <>
              <div className={styles.shopNotice}>
                <div>
                  <b>Week of {board.challenge.id}</b>
                  <p>
                    Closes {new Date(board.challenge.closesAt).toLocaleString()}
                    . Finish and submit before the deadline.
                  </p>
                </div>
                <button
                  className={styles.primary}
                  disabled={busy}
                  onClick={onStart}
                >
                  Start weekly challenge →
                </button>
              </div>
              {own && (
                <p className={styles.rankMessage}>
                  Your best: rank #{own.rank} · {own.cleared} rounds cleared.
                  {above
                    ? ` Next friend: ${above.name}, ${
                        above.cleared > own.cleared
                          ? `${above.cleared - own.cleared} more rounds cleared`
                          : above.progress > own.progress
                          ? `${
                              above.progress - own.progress
                            } more progress points`
                          : `${own.darts - above.darts} fewer darts`
                      }.`
                    : " You share or hold the lead."}
                </p>
              )}
              {!board.rows.length ? (
                <div className={styles.panel}>
                  <h2>The board is wide open.</h2>
                  <p>
                    Be the first to finish this week’s challenge. Wins and
                    failed runs both count.
                  </p>
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <caption>
                      Best completed run per friend · {difficulty}
                    </caption>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Rounds</th>
                        <th>Progress</th>
                        <th>Darts</th>
                        <th>Build</th>
                      </tr>
                    </thead>
                    <tbody>
                      {board.rows.map((row) => (
                        <tr
                          key={row.id}
                          className={
                            row.owner === userId ? styles.you : undefined
                          }
                        >
                          <td>#{row.rank}</td>
                          <td>
                            {row.name}
                            {row.owner === userId ? " (you)" : ""}
                            <small>
                              {row.attempts} finished attempt
                              {row.attempts === 1 ? "" : "s"}
                            </small>
                          </td>
                          <td>{row.cleared}/9</td>
                          <td>{row.progress}</td>
                          <td>{row.darts}</td>
                          <td>
                            <button
                              onClick={() =>
                                setSelected(selected === row.id ? null : row.id)
                              }
                              aria-expanded={selected === row.id}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {selected &&
                (() => {
                  const row = board.rows.find((r) => r.id === selected);
                  return row ? (
                    <div className={styles.panel}>
                      <h2>{row.name}’s build</h2>
                      <div className={styles.tags}>
                        {row.build.map((i) => (
                          <span key={i.id} title={item(i.id).description}>
                            {item(i.id).name}
                          </span>
                        ))}
                      </div>
                      <p>
                        {row.rawScore} run points · best visit {row.bestVisit} ·
                        completed {new Date(row.completedAt).toLocaleString()}
                      </p>
                      <RunDetails id={row.id} />
                    </div>
                  ) : null;
                })()}
              <div className={styles.actions}>
                <Link href="/friends">
                  {board.friendCount
                    ? "Manage friends"
                    : "Add your first friend"}{" "}
                  →
                </Link>
                <button onClick={() => setRefresh((n) => n + 1)}>
                  Refresh leaderboard
                </button>
              </div>
            </>
          )}
          <p className={styles.muted}>
            Ranked by rounds cleared, then capped encounter progress, then fewer
            physical darts. Exact ties share a rank. Throws are self-reported;
            game rules are replayed on the server. Only you and accepted friends
            can see your results.
          </p>
        </>
      )}
    </section>
  );
}
