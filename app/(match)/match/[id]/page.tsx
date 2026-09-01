// app/(match)/match/[id]/page.tsx
'use client';
import { useEffect, useState, use } from 'react';
import { useMatchStore } from '@/store/match';
import { getGameModule, GameId } from '@/lib/games/registry';
import { DartboardInput } from '@/components/organisms/DartboardInput';
import { Button } from '@/components/atoms/Button';
import { Throw, createPlayerId } from '@/lib/types';

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

export default function MatchPage({ params }: MatchPageProps) {
  const { gameState, gameModule } = useMatchStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { id } = use(params);

  useEffect(() => {
    const init = async () => {
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

  return (
    <div className="min-h-screen bg-oche text-chalk p-4 flex flex-col">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{gameModule.name}</h1>
        <Button onClick={handleUndo} size="sm" variant="ghost">
          ↶ Undo
        </Button>
      </header>

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {gameModule.players(gameState).map((playerId) => (
          <gameModule.ScoreboardSlot key={playerId} state={gameState} playerId={playerId} />
        ))}
      </div>

      {/* Dartboard input */}
      <div className="flex-1 flex items-center justify-center">
        <DartboardInput onThrow={handleThrow} disabled={isComplete} visitDartCount={visitProgress.darts} />
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
