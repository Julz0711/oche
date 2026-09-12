// app/(dashboard)/StepSettings.tsx
'use client';
import { Plus, X } from 'lucide-react';
import { Panel } from '@/components/atoms';
import { Input } from '@/components/atoms/Input';
import { Pills, Setting, SettingLabel } from './SetupControls';
import {
  COPYCAT_LIMIT_OPTIONS,
  CRICKET_SCORING,
  LEG_OPTIONS,
  MAX_PLAYERS,
  MatchSetup,
  SET_OPTIONS,
  STARTING_SCORES,
} from './matchSetup';

/** Step two: only the chosen game's settings, so one game's controls never compete with
 *  another's for space. Local play adds its player list here rather than in its own slab. */
export function StepSettings({
  setup,
  onChange,
  sessionName,
}: {
  setup: MatchSetup;
  onChange: (patch: Partial<MatchSetup>) => void;
  sessionName?: string | null;
}) {
  const { gameId } = setup;

  return (
    <>
      <Panel notch="panel" className="dashboard-settings p-4 md:p-6">
        {gameId === 'x01' && (
          <>
            <Setting label="Starting score">
              <Pills label="Starting score" options={STARTING_SCORES} value={setup.x01.startingScore} onChange={startingScore => onChange({ x01: { ...setup.x01, startingScore } })} />
            </Setting>
            <Setting label="Legs (first to)">
              <Pills label="Legs, first to" options={LEG_OPTIONS} value={setup.x01.firstTo} onChange={firstTo => onChange({ x01: { ...setup.x01, firstTo } })} />
            </Setting>
            <Setting label="Sets (first to)">
              <Pills
                label="Sets, first to"
                options={SET_OPTIONS}
                value={setup.x01.sets}
                onChange={sets => onChange({ x01: { ...setup.x01, sets } })}
                format={(value) => (value === 0 ? 'Off' : String(value))}
              />
            </Setting>
          </>
        )}

        {gameId === 'cricket' && (
          <>
            <Setting label="Legs (first to)">
              <Pills label="Legs, first to" options={LEG_OPTIONS} value={setup.cricket.firstTo} onChange={firstTo => onChange({ cricket: { ...setup.cricket, firstTo } })} />
            </Setting>
            <Setting
              label="Scoring"
              hint={setup.cricket.scoring === 'standard'
                ? 'Extra hits score while an opponent has the number open. Close all numbers and lead or tie on points to win.'
                : 'First to close all seven numbers wins the leg. Extra hits do not score.'}
            >
              <Pills
                label="Scoring"
                options={CRICKET_SCORING}
                value={setup.cricket.scoring}
                onChange={scoring => onChange({ cricket: { ...setup.cricket, scoring } })}
                format={value => (value === 'standard' ? 'Standard' : 'No points')}
              />
            </Setting>
          </>
        )}

        {gameId === 'copycat' && (
          <Setting label="Points (first to)">
            <Pills label="Points, first to" options={COPYCAT_LIMIT_OPTIONS} value={setup.copycat.firstTo} onChange={firstTo => onChange({ copycat: { firstTo } })} />
          </Setting>
        )}
      </Panel>

      {setup.mode === 'singleplayer' && (
        <Panel notch="panel" className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <SettingLabel>Players · {setup.playerNames.length} / {MAX_PLAYERS}</SettingLabel>
            <button
              type="button"
              className="text-link"
              disabled={setup.playerNames.length >= MAX_PLAYERS}
              onClick={() => onChange({ playerNames: [...setup.playerNames, `Player ${setup.playerNames.length + 1}`] })}
            >
              <Plus size={15} aria-hidden="true" />Add player
            </button>
          </div>
          <p className="t-meta">Throw in this order. Pass the device when your turn ends.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {setup.playerNames.map((name, index) => (
              <div key={index} className="flex items-end gap-2">
                <Input
                  label={`Player ${index + 1}`}
                  maxLength={32}
                  value={index === 0 && sessionName ? sessionName : name}
                  readOnly={index === 0 && !!sessionName}
                  containerClassName="flex-1 min-w-0"
                  className="min-h-11"
                  onChange={event => onChange({ playerNames: setup.playerNames.map((value, i) => (i === index ? event.target.value : value)) })}
                />
                {index > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove player ${index + 1}`}
                    className="flex items-center justify-center w-11 h-11 shrink-0 text-[color:var(--text-muted)] hover:text-treble transition-colors"
                    onClick={() => onChange({ playerNames: setup.playerNames.filter((_, i) => i !== index) })}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
