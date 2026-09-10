"use client";
import { useEffect, useState } from "react";
import type { RoundResult } from "@/lib/games/roguelike/types";
import styles from "./solo.module.css";
export default function RunDetails({ id }: { id: string }) {
  const [rounds, setRounds] = useState<RoundResult[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setRounds(null);
    setError("");
    fetch(`/api/solo/runs?id=${encodeURIComponent(id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Run details unavailable.");
        return body.result.rounds as RoundResult[];
      })
      .then((value) => {
        if (active) setRounds(value);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);
  if (error) return <p role="alert">{error}</p>;
  if (!rounds)
    return <p className={styles.muted}>Loading encounter details…</p>;
  return (
    <div>
      {rounds.map((round) => (
        <details key={round.index} className={styles.visitHistory}>
          <summary>
            Round {round.index + 1} · {round.won ? "Cleared" : "Failed"} ·{" "}
            {round.score} / {round.target} points · {round.darts} darts
          </summary>
          {round.visits.map((visit, index) => (
            <p key={index}>
              Visit {index + 1}:{" "}
              {visit.hits
                .map((h) => (h.ring === "M" ? "Miss" : h.ring + h.sector))
                .join(" · ")}{" "}
              · {visit.board} physical points, {visit.score} run points.
            </p>
          ))}
        </details>
      ))}
    </div>
  );
}
