// app/(dashboard)/page.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { gameRegistry, GameId, getGameModule } from '@/lib/games/registry';
import { GameOption } from './SetupControls';
import { StepGame, ActiveMatch } from './StepGame';
import { StepSettings } from './StepSettings';
import { StepReview } from './StepReview';
import {
  DEFAULT_SETUP,
  MatchSetup,
  WIZARD_STEPS,
  WizardStep,
  buildSettings,
  loadSetup,
  saveSetup,
} from './matchSetup';
import styles from './dashboard.module.css';

export default function Dashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [games, setGames] = useState<GameOption[] | null>(null);
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [step, setStep] = useState<WizardStep>('game');
  const [setup, setSetup] = useState<MatchSetup>(DEFAULT_SETUP);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusedStep = useRef<WizardStep>(step);

  // Restore after mount, never during render: the server has no localStorage, so reading it any
  // earlier would hydrate a different tree than the one rendered on the server. Saving waits for
  // that restore to land — otherwise the first save runs while `setup` is still the default and
  // overwrites the setup we were in the middle of reading back.
  const [restored, setRestored] = useState(false);
  useEffect(() => { setSetup(loadSetup()); setRestored(true); }, []);
  useEffect(() => { if (restored) saveSetup(setup); }, [restored, setup]);

  // Moving between steps replaces the whole panel, so send focus to the new heading rather than
  // leaving it on a button that no longer exists. Comparing against the step already focused
  // (rather than a "first render" flag) also keeps StrictMode's double-invoked effect from
  // stealing focus on arrival, when nobody has navigated anywhere yet.
  useEffect(() => {
    if (focusedStep.current === step) return;
    focusedStep.current = step;
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = Object.keys(gameRegistry) as GameId[];
      const modules = await Promise.all(ids.map((id) => getGameModule(id)));
      if (cancelled) return;
      setGames(ids.map((id, i) => ({
        id,
        name: modules[i].name,
        description: modules[i].description,
        icon: modules[i].icon,
        playerRange: modules[i].playerRange,
        status: modules[i].status,
        defaultSettings: modules[i].defaultSettings,
      })));
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!session?.user) { setActiveMatches([]); return; }
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/matches/active');
      if (cancelled || !res.ok) return;
      const { matches } = await res.json();
      if (!cancelled) setActiveMatches(matches);
    })();
    return () => { cancelled = true; };
  }, [session?.user]);

  const update = (patch: Partial<MatchSetup>) => setSetup(current => ({ ...current, ...patch }));

  const handleDeleteMatch = async (id: string) => {
    if (!window.confirm('Delete this game? This cannot be undone.')) return;
    const res = await fetch(`/api/matches/${id}`, { method: 'DELETE' });
    if (res.ok) setActiveMatches(prev => prev.filter(match => match.id !== id));
  };

  const handleLeaveMatch = async (id: string) => {
    if (!window.confirm('Leave this game? It stays active for the other player(s).')) return;
    const res = await fetch(`/api/matches/${id}/leave`, { method: 'POST' });
    if (res.ok) setActiveMatches(prev => prev.filter(match => match.id !== id));
  };

  const handleCreateMatch = async () => {
    const mode = setup.mode === 'multiplayer' ? 'remote' : 'local';
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: setup.gameId,
          mode,
          settings: buildSettings(setup, games?.find(game => game.id === setup.gameId)?.defaultSettings),
          ...(mode === 'local' ? { playerNames: setup.playerNames } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.id) throw new Error(body.error || 'Could not start the match. Try again.');
      router.push(`/match/${body.id}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not start the match. Check your connection.');
    } finally {
      setCreating(false);
    }
  };

  const stepIndex = WIZARD_STEPS.findIndex(entry => entry.id === step);
  const heading = step === 'game' ? 'Pick a game' : step === 'settings' ? 'Match settings' : 'Review & start';

  return (
    <div className="dashboard-page page-gutters min-h-screen text-chalk p-3 md:p-8 flex flex-col items-center relative">
      <div className="relative z-10 w-full max-w-3xl flex flex-col gap-3 md:gap-9 pt-0 md:pt-12">
        <nav className={styles.stepper} aria-label="Match setup progress">
          <ol>
            {WIZARD_STEPS.map((entry, index) => {
              const state = index === stepIndex ? 'current' : index < stepIndex ? 'done' : 'todo';
              return (
                <li key={entry.id} data-state={state}>
                  <button
                    type="button"
                    onClick={() => setStep(entry.id)}
                    disabled={index > stepIndex || creating}
                    aria-current={state === 'current' ? 'step' : undefined}
                  >
                    <span>{index + 1}</span>
                    {entry.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <header className="dashboard-header flex flex-col gap-2 md:gap-5">
          <h1 id="dashboard-step-heading" ref={headingRef} tabIndex={-1} className="step-heading text-sisal text-sm md:text-base font-normal">
            {heading}
          </h1>
        </header>

        {/* Only step one is a tabpanel — it's the step the mode tabs actually switch between.
            The later steps are plain regions named by the step heading. */}
        <section
          id="dashboard-play-panel"
          className={styles.playPanel}
          {...(step === 'game'
            ? { role: 'tabpanel' as const, 'aria-labelledby': `play-tab-${setup.mode}` }
            : { 'aria-labelledby': 'dashboard-step-heading' })}
        >
          {step === 'game' && (
            <StepGame
              mode={setup.mode}
              onModeChange={mode => update({ mode })}
              games={games}
              onPickGame={(gameId) => { update({ gameId }); setStep('settings'); }}
              activeMatches={activeMatches}
              onResumeMatch={id => router.push(`/match/${id}`)}
              onDeleteMatch={handleDeleteMatch}
              onLeaveMatch={handleLeaveMatch}
            />
          )}

          {step === 'settings' && (
            <StepSettings setup={setup} onChange={update} sessionName={session?.user?.name} />
          )}

          {step === 'review' && (
            <StepReview
              setup={setup}
              onEdit={setStep}
              onStart={handleCreateMatch}
              creating={creating}
              error={createError}
            />
          )}

          {step !== 'game' && (
            <div className={styles.stepNav}>
              <button type="button" onClick={() => setStep(step === 'review' ? 'settings' : 'game')} disabled={creating}>
                Back
              </button>
              {step === 'settings' && (
                <button type="button" data-primary onClick={() => setStep('review')}>
                  Next
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
