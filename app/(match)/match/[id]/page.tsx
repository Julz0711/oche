// app/(match)/match/[id]/page.tsx
'use client';
import { useEffect, useState, use } from 'react';
import { useMatchStore } from '@/store/match';
import { getGameModule, GameId } from '@/lib/games/registry';
import { DartboardInput } from '@/components/organisms/DartboardInput';
import { DartBadge } from '@/components/atoms/DartBadge';
import { PostMatchStats } from '@/components/organisms/PostMatchStats';
import { Throw, PlayerId, createPlayerId } from '@/lib/types';
import { Target, Ban, Undo2, Crosshair, BarChart3 } from 'lucide-react';
import { useRemoteMatchSync } from '@/hooks/useRemoteMatchSync';
import { MatchLobby } from '@/components/organisms/MatchLobby';
import { LiveStatsDrawer } from '@/components/organisms/LiveStatsDrawer';
import { identityIdOf, MatchPlayerDoc } from '@/lib/matchLobby';

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

/** A segmented status-bar track — the fill represents `value` out of `target`. */
function RaceBar({ value, target, colorClass }: { value: number; target: number; colorClass: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="w-full h-2 rounded-full bg-oche overflow-hidden border border-sisal/20">
      <div className={`h-full rounded-full ${colorClass} transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** The match-progress HUD panel between the scores: a legs (and sets, when the game uses them)
 *  race-progress bar per player — from gameModule.raceProgress, generic across every game — plus
 *  a real dart-pip readout for the current visit, from gameModule.visitProgress. */
function MatchInfoPanel({
  info,
  visitProgress,
  raceProgress,
  displayNames,
}: {
  info: { label: string; value: string }[];
  visitProgress: { darts: number; max: number };
  raceProgress: { playerId: PlayerId; legs: number; legsTarget: number; sets: number; setsTarget: number }[];
  displayNames: Map<string, string>;
}) {
  return (
    <div className="rounded-2xl bg-slate p-3 flex flex-col gap-1.5 border-2 border-wire/30">
      <div className="flex items-center justify-center gap-1.5">
        <Target className="w-3.5 h-3.5 text-wire shrink-0" />
        <span className="text-[11px] font-display font-bold uppercase tracking-wide">
          {info.map((entry) => `${entry.label} ${entry.value}`).join(' · ')}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {raceProgress.map((p) => (
          <div key={p.playerId} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-sisal truncate">
                {displayNames.get(p.playerId) ?? p.playerId}
              </span>
              <span className="text-[9px] font-bold text-wire shrink-0">
                {p.legs}/{p.legsTarget}
                {p.setsTarget > 0 && <span className="text-double"> · {p.sets}/{p.setsTarget}</span>}
              </span>
            </div>
            <RaceBar value={p.legs} target={p.legsTarget} colorClass="bg-wire" />
            {p.setsTarget > 0 && <RaceBar value={p.sets} target={p.setsTarget} colorClass="bg-double" />}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-1">
        {Array.from({ length: visitProgress.max }, (_, i) => (
          <span
            key={i}
            className={`w-2.5 h-2.5 rotate-45 rounded-[2px] ${
              i < visitProgress.darts ? 'bg-wire' : 'bg-oche border border-sisal/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/** A single dart, rendered as a small colored circle rather than a text label. */

const HISTORY_VISIBLE_LIMIT = 9;

function HistoryPanel({
  playerId,
  displayName,
  visits,
  inProgress,
}: {
  playerId: PlayerId;
  /** Friendly name to show instead of the raw playerId (a guest UUID in remote mode). Falls
   *  back to `playerId` when no match is found (e.g. local mode, where `players` is empty). */
  displayName?: string;
  visits: { throws: Throw[]; scoreBefore: number; scoreAfter: number; busted: boolean }[];
  inProgress: Throw[];
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = visits.length > HISTORY_VISIBLE_LIMIT;
  const visibleVisits = expanded ? visits : visits.slice(0, HISTORY_VISIBLE_LIMIT);

  return (
    <div className="rounded-2xl bg-slate p-4 flex flex-col gap-3 min-h-[240px] border-2 border-sisal/15">
      <div className="text-xs font-bold uppercase tracking-widest text-sisal shrink-0">
        {displayName ?? playerId}
      </div>

      {inProgress.length > 0 && (
        <div className="flex gap-2 flex-wrap p-2 rounded-xl bg-wire/10 border border-wire/40 shrink-0">
          {inProgress.map((t, j) => (
            <DartBadge key={j} t={t} />
          ))}
        </div>
      )}

      {visits.length === 0 && inProgress.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-sisal/50 text-sm">—</div>
      )}

      <div className="flex flex-col gap-2">
        {visibleVisits.map((visit, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div
              className={`flex items-center gap-2 flex-wrap rounded-xl p-2 border ${
                visit.busted ? 'bg-treble/10 border-treble/40' : 'bg-oche border-sisal/10'
              }`}
            >
              {visit.throws.map((t, j) => (
                <DartBadge key={j} t={t} />
              ))}
              <span className="ml-auto text-sm font-bold text-chalk">{Math.abs(visit.scoreAfter - visit.scoreBefore)}</span>
            </div>
            {visit.busted && (
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-treble">
                <Ban className="w-3 h-3" /> bust
              </div>
            )}
          </div>
        ))}

        {hasMore && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs font-bold uppercase tracking-widest text-sisal hover:text-chalk hover:border-wire rounded-lg border border-sisal/20 px-2 py-1 transition-colors self-start"
          >
            Show more ({visits.length - HISTORY_VISIBLE_LIMIT})
          </button>
        )}
        {expanded && hasMore && (
          <button
            onClick={() => setExpanded(false)}
            className="text-xs font-bold uppercase tracking-widest text-sisal hover:text-chalk hover:border-wire rounded-lg border border-sisal/20 px-2 py-1 transition-colors self-start"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}

export default function MatchPage({ params }: MatchPageProps) {
  const { gameState, gameModule, settings } = useMatchStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { id } = use(params);

  const { mode, status, players: lobbyPlayers, you, hostId, throwError, roomCode } = useMatchStore();
  useRemoteMatchSync(mode === 'remote' ? id : null);
  const [starting, setStarting] = useState(false);
  // Which opponent's compact row is expanded to show their fuller recent-throw history —
  // remote mode's opponents panel only, at most one open at a time.
  const [expandedOpponent, setExpandedOpponent] = useState<PlayerId | null>(null);
  const [showAllOpponentVisits, setShowAllOpponentVisits] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  const handleStart = async () => {
    setStarting(true);
    await fetch(`/api/matches/${id}/start`, { method: 'POST' });
    setStarting(false);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(`/api/matches/${id}`);
        if (!res.ok) {
          setError('Match not found');
          setLoading(false);
          return;
        }
        const snapshot = await res.json();
        const module = await getGameModule(snapshot.gameId as GameId);

        if (snapshot.mode === 'remote') {
          useMatchStore.getState().setMatch({
            matchId: id,
            gameModule: module,
            gameState: snapshot.state,
            settings: snapshot.settings ?? module.defaultSettings,
            mode: 'remote',
            status: snapshot.status,
            players: snapshot.players,
            you: snapshot.you,
            hostId: snapshot.hostId,
            roomCode: snapshot.roomCode,
          });
        } else {
          const settings = snapshot.settings ?? module.defaultSettings;
          const initialState = module.init([createPlayerId('player1'), createPlayerId('player2')], settings);
          useMatchStore.getState().setMatch({
            matchId: id,
            gameModule: module,
            gameState: initialState,
            settings,
            mode: 'local',
            status: 'live',
          });
        }
        setLoading(false);
      } catch {
        setError('Unable to load this match');
        setLoading(false);
      }
    };
    init();
  }, [id]);

  const handleThrow = (throw_: Throw) => {
    useMatchStore.getState().applyThrow(throw_);
  };

  const handleUndo = () => {
    useMatchStore.getState().undo();
  };

  if (error) {
    return <div className="min-h-screen bg-oche text-chalk flex items-center justify-center">{error}</div>;
  }

  if (loading || !gameModule) {
    return <div className="min-h-screen bg-oche text-chalk flex items-center justify-center">Loading...</div>;
  }

  if (mode === 'remote' && status === 'lobby') {
    // hostId is a fixed field set at creation — independent of a player's position in
    // `lobbyPlayers`, which the host can rearrange via the reorder endpoint.
    const isHost = hostId !== null && you !== null && hostId === you;

    return (
      <div className="min-h-screen bg-oche text-chalk p-4 flex items-center justify-center">
        <MatchLobby
          matchId={id}
          roomCode={roomCode ?? ''}
          players={lobbyPlayers as MatchPlayerDoc[]}
          playerRange={gameModule.playerRange}
          isHost={isHost}
          onStart={handleStart}
          starting={starting}
        />
      </div>
    );
  }

  if (!gameState) {
    return <div className="min-h-screen bg-oche text-chalk flex items-center justify-center">Loading...</div>;
  }

  const isComplete = gameModule.isComplete(gameState);
  const visitProgress = gameModule.visitProgress(gameState);
  const players = gameModule.players(gameState);
  const [leftPlayer, rightPlayer] = players;
  const currentPlayerId = gameModule.currentPlayer(gameState);
  const info = gameModule.matchInfo(gameState, settings);
  const raceProgress = gameModule.raceProgress(gameState, settings);
  const currentPlayerHeatmap = gameModule.heatmap(gameState, currentPlayerId);

  // PlayerId -> display name lookup, built from the lobby snapshot's `players` field. Empty in
  // local mode (where `players` is []), so lookups simply miss and callers fall back to the raw
  // playerId — byte-identical to today's local-mode rendering.
  const displayNames = new Map<string, string>(
    (lobbyPlayers as MatchPlayerDoc[]).map((p) => [identityIdOf(p), p.name])
  );

  // In remote mode, `you` (this client's identity id) is always one of `players` once the match
  // is live — remote matches support up to 8 players, so the live screen focuses on your own
  // scoreboard/history/dartboard and shows everyone else as a compact list, rather than the
  // fixed 2-up layout local mode uses (which only ever has exactly 2 players).
  const youPlayerId = mode === 'remote' ? (players.find((p) => p === you) ?? null) : null;
  const otherPlayers = youPlayerId ? players.filter((p) => p !== youPlayerId) : [];
  // The compact "you + opponents" layout only earns its keep once a fixed 2-up view can't fit
  // everyone — a 2-player remote match looks and behaves exactly like local mode's layout.
  const useCompactOpponentsLayout = mode === 'remote' && youPlayerId !== null && players.length > 2;

  return (
    <div
      className="min-h-screen bg-oche text-chalk p-4 flex flex-col gap-4"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--wire) 8%, transparent), transparent 60%)',
      }}
    >
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-display font-bold">{gameModule.name}</h1>
        {!isComplete && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatsOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border-2 border-sisal/30 bg-slate px-3 py-1.5 hover:border-wire transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-wire" />
              <span className="text-xs font-bold uppercase tracking-widest text-chalk">Stats</span>
            </button>
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 rounded-xl border-2 border-sisal/30 bg-slate px-3 py-1.5 hover:border-wire transition-colors"
            >
              <Undo2 className="w-4 h-4 text-wire" />
              <span className="text-xs font-bold uppercase tracking-widest text-chalk">Undo</span>
            </button>
          </div>
        )}
      </header>

      {useCompactOpponentsLayout && youPlayerId ? (
        <>
          {/* Top row: score / match info / score — same 3-equal-column layout as local mode.
              The right slot, which used to be a single opponent's ScoreboardSlot, is now a
              same-sized card listing every opponent's score compactly. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <gameModule.ScoreboardSlot
              state={gameState}
              playerId={youPlayerId}
              settings={settings}
              displayName={displayNames.get(youPlayerId)}
            />
            <MatchInfoPanel
              info={info}
              visitProgress={visitProgress}
              raceProgress={raceProgress}
              displayNames={displayNames}
            />
            <div className="rounded-2xl bg-slate p-4 border-2 border-sisal/15 flex flex-col gap-2 justify-center">
              {otherPlayers.map((playerId) => {
                const metric = gameModule.primaryMetric(gameState, playerId);
                const isTurn = playerId === currentPlayerId;
                return (
                  <div
                    key={playerId}
                    className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 border ${
                      isTurn ? 'bg-wire/10 border-wire/40' : 'bg-oche border-sisal/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isTurn && <Crosshair className="w-3.5 h-3.5 text-wire shrink-0" />}
                      <span className="text-xs font-bold uppercase tracking-widest text-sisal truncate">
                        {displayNames.get(playerId) ?? playerId}
                      </span>
                    </div>
                    <span className="text-lg font-display font-bold shrink-0">{metric.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Middle row: history / board+keypad / history — same 3-column layout as local mode.
              The right slot shows whichever opponent is currently on throw, exactly like the
              single opponent's HistoryPanel it replaces; when it's your own turn, that slot has
              no opponent activity to show. */}
          {!isComplete && (
            <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.4fr_0.8fr] gap-3 flex-1">
              {gameModule.HistoryPanel ? (
                <gameModule.HistoryPanel
                  state={gameState}
                  playerId={youPlayerId}
                  settings={settings}
                  displayName={displayNames.get(youPlayerId)}
                />
              ) : (
                <HistoryPanel
                  playerId={youPlayerId}
                  displayName={displayNames.get(youPlayerId)}
                  visits={gameModule.visitHistory(gameState, youPlayerId)}
                  inProgress={youPlayerId === currentPlayerId ? visitProgress.throws : []}
                />
              )}

              <div className="flex flex-col items-center justify-center gap-4 w-full">
                {throwError && (
                  <div className="text-sm text-treble bg-treble/10 border border-treble/40 rounded-xl px-3 py-2 flex items-center gap-2">
                    {throwError}
                    <button onClick={() => useMatchStore.getState().clearThrowError()} className="underline">
                      Dismiss
                    </button>
                  </div>
                )}
                <DartboardInput
                  onThrow={handleThrow}
                  disabled={isComplete || currentPlayerId !== you}
                  visitDartCount={visitProgress.darts}
                  heatmap={currentPlayerHeatmap}
                />
              </div>

              <div className="rounded-2xl bg-slate p-3 flex flex-col gap-3 min-h-[240px] border-2 border-sisal/15">
                {otherPlayers.map((playerId) => {
                  const isTurn = playerId === currentPlayerId;
                  const expanded = expandedOpponent === playerId;
                  const lastVisit = gameModule.lastCompletedVisit(gameState, playerId);
                  const lastThrows = isTurn ? visitProgress.throws : (lastVisit?.throws ?? []);

                  return (
                    <div
                      key={playerId}
                      className={`flex flex-col gap-1.5 rounded-xl p-2 border ${
                        isTurn ? 'bg-wire/10 border-wire/40' : 'bg-oche border-sisal/10'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setExpandedOpponent(expanded ? null : playerId);
                          setShowAllOpponentVisits(false);
                        }}
                        className="flex items-center gap-1.5 text-left"
                      >
                        {isTurn && <Crosshair className="w-3.5 h-3.5 text-wire shrink-0" />}
                        <span className="text-xs font-bold uppercase tracking-widest text-sisal hover:text-chalk truncate">
                          {displayNames.get(playerId) ?? playerId}
                        </span>
                      </button>

                      {expanded ? (
                        (() => {
                          const visits = gameModule.visitHistory(gameState, playerId);
                          const hasMoreVisits = visits.length > HISTORY_VISIBLE_LIMIT;
                          const visibleVisits = showAllOpponentVisits ? visits : visits.slice(0, HISTORY_VISIBLE_LIMIT);

                          return (
                            <div className="flex flex-col gap-1.5">
                              {visits.length === 0 && lastThrows.length === 0 ? (
                                <span className="text-sisal/40 text-xs">No throws yet</span>
                              ) : (
                                <>
                                  {isTurn && lastThrows.length > 0 && (
                                    <div className="flex gap-1.5 flex-wrap p-1.5 rounded-lg bg-wire/10 border border-wire/40">
                                      {lastThrows.map((t, i) => (
                                        <DartBadge key={i} t={t} />
                                      ))}
                                    </div>
                                  )}
                                  {visibleVisits.map((visit, i) => (
                                    <div
                                      key={i}
                                      className={`flex items-center gap-1.5 flex-wrap rounded-lg p-1.5 border ${
                                        visit.busted ? 'bg-treble/10 border-treble/40' : 'bg-oche border-sisal/10'
                                      }`}
                                    >
                                      {visit.throws.map((t, j) => (
                                        <DartBadge key={j} t={t} />
                                      ))}
                                      <span className="ml-auto text-sm font-bold text-chalk">
                                        {Math.abs(visit.scoreAfter - visit.scoreBefore)}
                                      </span>
                                    </div>
                                  ))}
                                  {hasMoreVisits && !showAllOpponentVisits && (
                                    <button
                                      onClick={() => setShowAllOpponentVisits(true)}
                                      className="text-xs font-bold uppercase tracking-widest text-sisal hover:text-chalk hover:border-wire rounded-lg border border-sisal/20 px-2 py-1 transition-colors self-start"
                                    >
                                      Show more ({visits.length - HISTORY_VISIBLE_LIMIT})
                                    </button>
                                  )}
                                  {showAllOpponentVisits && hasMoreVisits && (
                                    <button
                                      onClick={() => setShowAllOpponentVisits(false)}
                                      className="text-xs font-bold uppercase tracking-widest text-sisal hover:text-chalk hover:border-wire rounded-lg border border-sisal/20 px-2 py-1 transition-colors self-start"
                                    >
                                      Show less
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex gap-1.5 flex-wrap min-h-[36px] items-center">
                          {lastThrows.length > 0 ? (
                            <>
                              {lastThrows.map((t, i) => (
                                <DartBadge key={i} t={t} />
                              ))}
                              {!isTurn && lastVisit && (
                                <span className="ml-auto text-sm font-bold text-chalk">
                                  {Math.abs(lastVisit.scoreAfter - lastVisit.scoreBefore)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-sisal/40 text-xs">No throws yet</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Top row: score / match info / score — the original fixed 2-up layout, used for
              local mode (always 2 players) and 2-player remote matches alike */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            {leftPlayer && (
              <gameModule.ScoreboardSlot
                state={gameState}
                playerId={leftPlayer}
                settings={settings}
                displayName={displayNames.get(leftPlayer)}
              />
            )}
            <MatchInfoPanel
              info={info}
              visitProgress={visitProgress}
              raceProgress={raceProgress}
              displayNames={displayNames}
            />
            {rightPlayer && (
              <gameModule.ScoreboardSlot
                state={gameState}
                playerId={rightPlayer}
                settings={settings}
                displayName={displayNames.get(rightPlayer)}
              />
            )}
          </div>

          {/* Middle row: history / board+keypad / history */}
          {!isComplete && (
            <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.4fr_0.8fr] gap-3 flex-1">
              {leftPlayer &&
                (gameModule.HistoryPanel ? (
                  <gameModule.HistoryPanel
                    state={gameState}
                    playerId={leftPlayer}
                    settings={settings}
                    displayName={displayNames.get(leftPlayer)}
                  />
                ) : (
                  <HistoryPanel
                    playerId={leftPlayer}
                    displayName={displayNames.get(leftPlayer)}
                    visits={gameModule.visitHistory(gameState, leftPlayer)}
                    inProgress={leftPlayer === currentPlayerId ? visitProgress.throws : []}
                  />
                ))}

              <div className="flex flex-col items-center justify-center gap-4 w-full">
                {throwError && (
                  <div className="text-sm text-treble bg-treble/10 border border-treble/40 rounded-xl px-3 py-2 flex items-center gap-2">
                    {throwError}
                    <button onClick={() => useMatchStore.getState().clearThrowError()} className="underline">
                      Dismiss
                    </button>
                  </div>
                )}
                <DartboardInput
                  onThrow={handleThrow}
                  disabled={isComplete || (mode === 'remote' && currentPlayerId !== you)}
                  visitDartCount={visitProgress.darts}
                  heatmap={currentPlayerHeatmap}
                />
              </div>

              {rightPlayer &&
                (gameModule.HistoryPanel ? (
                  <gameModule.HistoryPanel
                    state={gameState}
                    playerId={rightPlayer}
                    settings={settings}
                    displayName={displayNames.get(rightPlayer)}
                  />
                ) : (
                  <HistoryPanel
                    playerId={rightPlayer}
                    displayName={displayNames.get(rightPlayer)}
                    visits={gameModule.visitHistory(gameState, rightPlayer)}
                    inProgress={rightPlayer === currentPlayerId ? visitProgress.throws : []}
                  />
                ))}
            </div>
          )}
        </>
      )}

      {/* Match end */}
      {isComplete && (
        <PostMatchStats
          matchId={id}
          gameModule={gameModule}
          state={gameState}
          settings={settings}
          players={players}
          winnerId={gameModule.winner(gameState)}
          displayNames={displayNames}
        />
      )}

      <LiveStatsDrawer
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        gameModule={gameModule}
        state={gameState}
        settings={settings}
        players={players}
        displayNames={displayNames}
      />
    </div>
  );
}
