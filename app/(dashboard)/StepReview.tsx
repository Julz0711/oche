// app/(dashboard)/StepReview.tsx
'use client';
import { Panel } from '@/components/atoms';
import { LoadingIndicator } from '@/components/atoms/LoadingIndicator';
import { MatchSetup, WizardStep, summarize } from './matchSetup';

/** Step three: everything that is about to be sent, in one readout, with a way back to whichever
 *  step owns each line. The start button lives here and nowhere else. */
export function StepReview({
  setup,
  onEdit,
  onStart,
  creating,
  error,
}: {
  setup: MatchSetup;
  onEdit: (step: WizardStep) => void;
  onStart: () => void;
  creating: boolean;
  error: string | null;
}) {
  const rows = summarize(setup);
  const online = setup.mode === 'multiplayer';

  return (
    <>
      <Panel notch="panel" className="p-3 md:p-6 flex flex-col gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-sisal">Your match</h3>
        <dl className="dashboard-review">
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
              <button type="button" onClick={() => onEdit(row.step)} disabled={creating}>
                Edit<span className="sr-only"> {row.label.toLowerCase()}</span>
              </button>
            </div>
          ))}
        </dl>
      </Panel>

      {error && <p role="alert" className="text-sm text-chalk border border-treble p-3">{error}</p>}
      {creating && <LoadingIndicator label="Opening your match…" />}

      <div className="flex flex-col gap-2">
        <Panel
          as="button"
          notch="panel"
          accent="wire"
          fill="wire"
          onClick={onStart}
          disabled={creating}
          className="play-action play-action-primary"
        >
          {creating ? 'Starting…' : online ? 'Play Online' : 'Play Local'}
        </Panel>
        <span className="text-center text-xs text-sisal">
          {online ? 'Create a room and invite players' : 'Play on the same device'}
        </span>
      </div>
    </>
  );
}
