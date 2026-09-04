// app/(match)/match/[id]/page.tsx
'use client';
import { useEffect, useState, use } from 'react';
import { useMatchStore } from '@/store/match';
import { getGameModule, GameId } from '@/lib/games/registry';
import { DartboardInput } from '@/components/organisms/DartboardInput';
import { PostMatchStats } from '@/components/organisms/PostMatchStats';
import { Button } from '@/components/atoms/Button';
import { Throw, PlayerId, createPlayerId } from '@/lib/types';
import { Target, Ban, Undo2, Crosshair } from 'lucide-react';
import { useRemoteMatchSync } from '@/hooks/useRemoteMatchSync';
import { MatchLobby } from '@/components/organisms/MatchLobby';
import { identityIdOf, MatchPlayerDoc } from '@/lib/matchLobby';

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

/** A single dart, rendered as a small colored circle rather than a text label. */
function DartBadge({ t }: { t: Throw }) {
  if (t.ring === 'M') {
    return (
      <span className="w-9 h-9 flex items-center justify-center rounded-full bg-oche border border-sisal/30 text-sisal text-xs font-bold">
        ×
      </span>
    );
  }
  if (t.ring === 'IB') {
    return (
      <span className="w-9 h-9 flex items-center justify-center rounded-full bg-double text-chalk text-xs font-bold ring-2 ring-wire">
        50
      </span>
    );
  }
  if (t.ring === 'OB') {
    return (
      <span className="w-9 h-9 flex items-center justify-center rounded-full bg-wire text-oche text-xs font-bold">
        25
      </span>
    );
  }
  const colorClass =
    t.ring === 'D'
      ? 'bg-double text-chalk'
      : t.ring === 'T'
        ? 'bg-treble text-chalk'
        : 'bg-oche text-chalk border border-sisal/30';
  return (
    <span className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold ${colorClass}`}>
      {t.sector}
    </span>
  );
}

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
    <div className="rounded-2xl bg-slate p-4 flex flex-col gap-3 min-h-[240px]">
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
              className={`flex items-center gap-2 flex-wrap rounded-xl p-2 ${
                visit.busted ? 'bg-treble/10 border border-treble/40' : ''
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
            className="text-xs font-bold uppercase tracking-widest text-sisal hover:text-chalk py-1"
          >
            Show more ({visits.length - HISTORY_VISIBLE_LIMIT})
          </button>
        )}
        {expanded && hasMore && (
          <button
            onClick={() => setExpanded(false)}
            className="text-xs font-bold uppercase tracking-widest text-sisal hover:text-chalk py-1"
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
          <Button onClick={handleUndo} size="sm" variant="ghost">
            <Undo2 className="w-4 h-4 mr-1" /> Undo
          </Button>
        )}
      </header>

      {mode === 'remote' && youPlayerId ? (
        <>
          {/* Top row: your score / match info */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <gameModule.ScoreboardSlot
              state={gameState}
              playerId={youPlayerId}
              settings={settings}
              displayName={displayNames.get(youPlayerId)}
            />
            <div className="rounded-2xl bg-slate p-3 flex items-center justify-center gap-3 border border-wire/30 md:min-w-[180px]">
              <Target className="w-6 h-6 text-wire shrink-0" />
              {info.map((entry) => (
                <div key={entry.label} className="text-center leading-tight">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-sisal">{entry.label}</div>
                  <div className="text-xl font-display font-bold">{entry.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Middle row: your history + board+keypad on the left, everyone else compact on the right */}
          {!isComplete && (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-3 flex-1">
              <div className="flex flex-col gap-3">
                <HistoryPanel
                  playerId={youPlayerId}
                  displayName={displayNames.get(youPlayerId)}
                  visits={gameModule.visitHistory(gameState, youPlayerId)}
                  inProgress={youPlayerId === currentPlayerId ? visitProgress.throws : []}
                />

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
              </div>

              <div className="flex flex-col gap-2 md:max-h-[640px] overflow-y-auto">
                <div className="text-[10px] font-bold uppercase tracking-widest text-sisal px-1">Opponents</div>
                {otherPlayers.map((playerId) => {
                  const metric = gameModule.primaryMetric(gameState, playerId);
                  const isTurn = playerId === currentPlayerId;
                  return (
                    <div
                      key={playerId}
                      className={`rounded-xl p-3 flex items-center justify-between gap-2 ${
                        isTurn ? 'bg-wire/10 border border-wire/40' : 'bg-slate'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isTurn && <Crosshair className="w-3.5 h-3.5 text-wire shrink-0" />}
                        <span className="text-sm font-bold truncate">{displayNames.get(playerId) ?? playerId}</span>
                      </div>
                      <span className="text-lg font-display font-bold shrink-0">{metric.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Top row: score / match info / score — local mode's fixed 2-player layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {leftPlayer && (
              <gameModule.ScoreboardSlot
                state={gameState}
                playerId={leftPlayer}
                settings={settings}
                displayName={displayNames.get(leftPlayer)}
              />
            )}
            <div className="rounded-2xl bg-slate p-3 flex items-center justify-center gap-3 border border-wire/30">
              <Target className="w-6 h-6 text-wire shrink-0" />
              {info.map((entry) => (
                <div key={entry.label} className="text-center leading-tight">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-sisal">{entry.label}</div>
                  <div className="text-xl font-display font-bold">{entry.value}</div>
                </div>
              ))}
            </div>
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
              {leftPlayer && (
                <HistoryPanel
                  playerId={leftPlayer}
                  displayName={displayNames.get(leftPlayer)}
                  visits={gameModule.visitHistory(gameState, leftPlayer)}
                  inProgress={leftPlayer === currentPlayerId ? visitProgress.throws : []}
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
                  disabled={isComplete}
                  visitDartCount={visitProgress.darts}
                  heatmap={currentPlayerHeatmap}
                />
              </div>

              {rightPlayer && (
                <HistoryPanel
                  playerId={rightPlayer}
                  displayName={displayNames.get(rightPlayer)}
                  visits={gameModule.visitHistory(gameState, rightPlayer)}
                  inProgress={rightPlayer === currentPlayerId ? visitProgress.throws : []}
                />
              )}
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
    </div>
  );
}
