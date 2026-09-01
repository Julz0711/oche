// app/(match)/match/[id]/page.tsx
'use client';
import { useEffect, useState, use } from 'react';
import { useMatchStore } from '@/store/match';
import { getGameModule, GameId } from '@/lib/games/registry';
import { DartboardInput } from '@/components/organisms/DartboardInput';
import { Button } from '@/components/atoms/Button';
import { Throw, PlayerId, createPlayerId } from '@/lib/types';

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

function formatDart(t: Throw): string {
  if (t.ring === 'M') return 'MISS';
  if (t.ring === 'IB') return 'D-BULL';
  if (t.ring === 'OB') return 'BULL';
  return `${t.ring}${t.sector}`;
}

/** Doubles and triples get distinct colors; everything else stays neutral. */
function dartColorClass(t: Throw): string {
  if (t.ring === 'D' || t.ring === 'IB') return 'bg-double text-chalk';
  if (t.ring === 'T') return 'bg-treble text-chalk';
  return 'bg-oche text-chalk';
}

function HistoryPanel({
  playerId,
  visits,
  inProgress,
}: {
  playerId: PlayerId;
  visits: { throws: Throw[]; scoreAfter: number; busted: boolean }[];
  inProgress: Throw[];
}) {
  return (
    <div className="bg-slate rounded p-4 flex flex-col gap-4 min-h-[240px]">
      <div className="text-sm font-semibold text-sisal uppercase">{playerId} — this leg</div>

      {inProgress.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-wire uppercase">In progress</div>
          <div className="flex gap-2 flex-wrap">
            {inProgress.map((t, j) => (
              <span key={j} className={`px-3 py-2 rounded text-sm font-semibold ${dartColorClass(t)}`}>
                {formatDart(t)}
              </span>
            ))}
          </div>
        </div>
      )}

      {visits.length === 0 && inProgress.length === 0 && (
        <div className="text-sm text-sisal opacity-60">No visits yet</div>
      )}

      {visits.map((visit, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap">
            {visit.throws.map((t, j) => (
              <span key={j} className={`px-3 py-2 rounded text-sm font-semibold ${dartColorClass(t)}`}>
                {formatDart(t)}
              </span>
            ))}
          </div>
          {visit.busted && <div className="text-xs font-semibold text-treble">BUST</div>}
        </div>
      ))}
    </div>
  );
}

export default function MatchPage({ params }: MatchPageProps) {
  const { gameState, gameModule, settings } = useMatchStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { id } = use(params);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(`/api/matches/${id}`);
        if (!res.ok) {
          setError('Match not found');
          setLoading(false);
          return;
        }
        const { gameId } = await res.json();

        const module = await getGameModule(gameId as GameId);
        const initialState = module.init(
          [createPlayerId('player1'), createPlayerId('player2')],
          module.defaultSettings
        );
        useMatchStore.getState().setMatch(id, module, initialState, module.defaultSettings);
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

  if (loading || !gameModule || !gameState) {
    return <div className="min-h-screen bg-oche text-chalk flex items-center justify-center">Loading...</div>;
  }

  const isComplete = gameModule.isComplete(gameState);
  const visitProgress = gameModule.visitProgress(gameState);
  const players = gameModule.players(gameState);
  const [leftPlayer, rightPlayer] = players;
  const currentPlayerId = gameModule.currentPlayer(gameState);
  const info = gameModule.matchInfo(gameState, settings);
  const currentPlayerHeatmap = gameModule.heatmap(gameState, currentPlayerId);

  return (
    <div className="min-h-screen bg-oche text-chalk p-4 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{gameModule.name}</h1>
        <Button onClick={handleUndo} size="sm" variant="ghost">
          ↶ Undo
        </Button>
      </header>

      {/* Top row: score / match info / score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {leftPlayer && <gameModule.ScoreboardSlot state={gameState} playerId={leftPlayer} settings={settings} />}
        <div className="bg-slate rounded p-3 flex items-center justify-center gap-4">
          {info.map((entry) => (
            <div key={entry.label} className="text-center">
              <div className="text-xs text-sisal uppercase">{entry.label}</div>
              <div className="text-lg font-bold">{entry.value}</div>
            </div>
          ))}
        </div>
        {rightPlayer && <gameModule.ScoreboardSlot state={gameState} playerId={rightPlayer} settings={settings} />}
      </div>

      {/* Middle row: history / board+keypad / history */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
        {leftPlayer && (
          <HistoryPanel
            playerId={leftPlayer}
            visits={gameModule.visitHistory(gameState, leftPlayer)}
            inProgress={leftPlayer === currentPlayerId ? visitProgress.throws : []}
          />
        )}

        <div className="flex flex-col items-center justify-center gap-4">
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
            visits={gameModule.visitHistory(gameState, rightPlayer)}
            inProgress={rightPlayer === currentPlayerId ? visitProgress.throws : []}
          />
        )}
      </div>

      {/* Match end */}
      {isComplete && (
        <div className="bg-slate p-4 rounded text-center">
          <p className="text-lg font-bold mb-2">Match Complete!</p>
          <p className="mb-4">Winner: {gameModule.winner(gameState)}</p>
          <Button onClick={() => (window.location.href = '/')}>Back to Dashboard</Button>
        </div>
      )}
    </div>
  );
}
