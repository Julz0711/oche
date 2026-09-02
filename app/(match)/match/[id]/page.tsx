// app/(match)/match/[id]/page.tsx
'use client';
import { useEffect, useState, use } from 'react';
import { useMatchStore } from '@/store/match';
import { getGameModule, GameId } from '@/lib/games/registry';
import { DartboardInput } from '@/components/organisms/DartboardInput';
import { PostMatchStats } from '@/components/organisms/PostMatchStats';
import { Button } from '@/components/atoms/Button';
import { Throw, PlayerId, createPlayerId } from '@/lib/types';
import { Target, Ban, Undo2 } from 'lucide-react';

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

function HistoryPanel({
  playerId,
  visits,
  inProgress,
}: {
  playerId: PlayerId;
  visits: { throws: Throw[]; scoreBefore: number; scoreAfter: number; busted: boolean }[];
  inProgress: Throw[];
}) {
  return (
    <div className="rounded-2xl bg-slate p-4 flex flex-col gap-3 min-h-[240px]">
      <div className="text-xs font-bold uppercase tracking-widest text-sisal">{playerId}</div>

      {inProgress.length > 0 && (
        <div className="flex gap-2 flex-wrap p-2 rounded-xl bg-wire/10 border border-wire/40">
          {inProgress.map((t, j) => (
            <DartBadge key={j} t={t} />
          ))}
        </div>
      )}

      {visits.length === 0 && inProgress.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-sisal/50 text-sm">—</div>
      )}

      <div className="flex flex-col gap-2">
        {visits.map((visit, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div
              className={`flex items-center gap-2 flex-wrap rounded-xl p-2 ${
                visit.busted ? 'bg-treble/10 border border-treble/40' : ''
              }`}
            >
              {visit.throws.map((t, j) => (
                <DartBadge key={j} t={t} />
              ))}
              <span className="ml-auto text-sm font-bold text-chalk">{visit.scoreBefore - visit.scoreAfter}</span>
            </div>
            {visit.busted && (
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-treble">
                <Ban className="w-3 h-3" /> bust
              </div>
            )}
          </div>
        ))}
      </div>
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

      {/* Top row: score / match info / score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {leftPlayer && <gameModule.ScoreboardSlot state={gameState} playerId={leftPlayer} settings={settings} />}
        <div className="rounded-2xl bg-slate p-3 flex items-center justify-center gap-3 border border-wire/30">
          <Target className="w-6 h-6 text-wire shrink-0" />
          {info.map((entry) => (
            <div key={entry.label} className="text-center leading-tight">
              <div className="text-[10px] font-bold uppercase tracking-widest text-sisal">{entry.label}</div>
              <div className="text-xl font-display font-bold">{entry.value}</div>
            </div>
          ))}
        </div>
        {rightPlayer && <gameModule.ScoreboardSlot state={gameState} playerId={rightPlayer} settings={settings} />}
      </div>

      {/* Middle row: history / board+keypad / history */}
      {!isComplete && (
        <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.4fr_0.8fr] gap-3 flex-1">
          {leftPlayer && (
            <HistoryPanel
              playerId={leftPlayer}
              visits={gameModule.visitHistory(gameState, leftPlayer)}
              inProgress={leftPlayer === currentPlayerId ? visitProgress.throws : []}
            />
          )}

          <div className="flex flex-col items-center justify-center gap-4 w-full">
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
      )}

      {/* Match end */}
      {isComplete && (
        <PostMatchStats
          gameModule={gameModule}
          state={gameState}
          settings={settings}
          players={players}
          winnerId={gameModule.winner(gameState)}
        />
      )}
    </div>
  );
}
