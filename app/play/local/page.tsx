'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { LoadingIndicator } from '@/components/atoms/LoadingIndicator';
import { InlineFeedback } from '@/components/molecules';
import { MatchRoom } from '@/components/organisms/MatchRoom';
import { gameRegistry, getGameModule, GameId } from '@/lib/games/registry';
import { toSchemaInput } from '@/lib/games/settingsForm';
import { MAX_PLAYERS, loadLocalSetup, saveLocalSetup } from './localSetup';

/**
 * Setting up a game on one device.
 *
 * Deliberately the same screen as the online waiting room — same sections in the same order, the
 * rules in the same place — minus the things local play has no use for: there is no room code and
 * nobody to wait for, so the "players" section is where you name who is throwing rather than
 * watch them arrive.
 *
 * Nothing is written to the database until Start. A half-configured local game is not something
 * anyone needs to come back to, and creating a row per visit would litter the match history the
 * way empty online rooms used to.
 */
export default function LocalRoomPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session } = useSession();

  const gameId = params.get('game');
  const valid = typeof gameId === 'string' && Object.prototype.hasOwnProperty.call(gameRegistry, gameId);

  const [gameName, setGameName] = useState('');
  const [playerRange, setPlayerRange] = useState<[number, number] | null>(null);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restored after mount, never during render: localStorage does not exist on the server, so
  // reading it any earlier would hydrate a different tree than the one rendered there.
  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    (async () => {
      const module = await getGameModule(gameId as GameId);
      if (cancelled) return;
      const stored = loadLocalSetup(gameId as GameId);
      setGameName(module.name);
      setPlayerRange(module.playerRange);
      setSettings(stored.settings ?? (module.defaultSettings as Record<string, unknown>));
      setNames(stored.names ?? defaultNames(module.playerRange[0]));
    })();
    return () => { cancelled = true; };
  }, [gameId, valid]);

  // Remembered per game, so coming back to a game you play often doesn't mean setting it up again.
  useEffect(() => {
    if (!valid || !settings || names.length === 0) return;
    saveLocalSetup(gameId as GameId, { settings, names });
  }, [gameId, valid, settings, names]);

  const seatedNames = useMemo(
    () => names.map((name, index) => (index === 0 && session?.user?.name ? session.user.name : name)),
    [names, session?.user?.name]
  );

  useEffect(() => {
    if (!valid) router.replace('/');
  }, [valid, router]);

  if (!valid) return <LoadingIndicator fullPage label="Opening setup…" />;
  if (!settings || !playerRange) return <LoadingIndicator fullPage label="Opening setup…" />;

  const [minPlayers, maxPlayers] = playerRange;
  const namesValid = seatedNames.every((name) => name.trim().length > 0);

  const start = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          mode: 'local',
          settings: toSchemaInput(gameId as GameId, settings),
          playerNames: seatedNames.map((name) => name.trim()),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.id) throw new Error(body.error || 'Could not start the match. Try again.');
      router.push(`/match/${body.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the match. Check your connection.');
      setCreating(false);
    }
  };

  return (
    <MatchRoom
      eyebrow="Local match"
      title={gameName}
      back={{ href: '/', label: 'Back to dashboard' }}
      gameId={gameId as GameId}
      settings={settings}
      onSettingsChange={setSettings}
      notice={error ? <InlineFeedback tone="error">{error}</InlineFeedback> : undefined}
      playersCount={`${names.length} / ${Math.min(maxPlayers, MAX_PLAYERS)}`}
      playersAside={<p className="t-meta">Throw in this order. Pass the device when your turn ends.</p>}
      players={
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {names.map((name, index) => (
              <div key={index} className="flex items-end gap-2">
                <Input
                  label={`Player ${index + 1}`}
                  maxLength={32}
                  value={seatedNames[index]}
                  // Seat one is the signed-in account: it is who the match is recorded against,
                  // so it is shown rather than edited.
                  readOnly={index === 0 && !!session?.user?.name}
                  containerClassName="flex-1 min-w-0"
                  className="min-h-11"
                  onChange={(event) =>
                    setNames(names.map((value, i) => (i === index ? event.target.value : value)))
                  }
                />
                {index >= minPlayers && (
                  <button
                    type="button"
                    aria-label={`Remove player ${index + 1}`}
                    className="flex items-center justify-center w-11 h-11 shrink-0 text-[color:var(--text-muted)] hover:text-treble transition-colors"
                    onClick={() => setNames(names.filter((_, i) => i !== index))}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="text-link"
            disabled={names.length >= Math.min(maxPlayers, MAX_PLAYERS)}
            onClick={() => setNames([...names, `Player ${names.length + 1}`])}
          >
            <Plus size={15} aria-hidden="true" />Add player
          </button>
        </>
      }
      status={`${names.length} players on this device.`}
      action={
        <Button onClick={start} disabled={creating || !namesValid} className="room-action">
          {creating ? 'Starting…' : 'Start match'}
        </Button>
      }
    />
  );
}

function defaultNames(minPlayers: number): string[] {
  return Array.from({ length: Math.max(2, minPlayers) }, (_, i) => `Player ${i + 1}`);
}
