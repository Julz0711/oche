// app/(dashboard)/StepSettings.tsx
'use client';
import { Panel } from '@/components/atoms';
import { Input } from '@/components/atoms/Input';
import { Pills, SettingLabel } from './SetupControls';
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
      <Panel notch="panel" className="dashboard-settings p-3 md:p-6">
        {gameId === 'x01' && (
          <>
            <div className="dashboard-setting flex flex-col gap-2">
              <SettingLabel>Starting score</SettingLabel>
              <Pills options={STARTING_SCORES} value={setup.x01.startingScore} onChange={startingScore => onChange({ x01: { ...setup.x01, startingScore } })} />
            </div>
            <div className="dashboard-setting flex flex-col gap-2">
              <SettingLabel>Legs (first to)</SettingLabel>
              <Pills options={LEG_OPTIONS} value={setup.x01.firstTo} onChange={firstTo => onChange({ x01: { ...setup.x01, firstTo } })} />
            </div>
            <div className="dashboard-setting flex flex-col gap-2">
              <SettingLabel>Sets (first to)</SettingLabel>
              <Pills
                options={SET_OPTIONS}
                value={setup.x01.sets}
                onChange={sets => onChange({ x01: { ...setup.x01, sets } })}
                format={(value) => (value === 0 ? 'Off' : String(value))}
              />
            </div>
          </>
        )}

        {gameId === 'cricket' && (
          <>
            <div className="dashboard-setting flex flex-col gap-2">
              <SettingLabel>Legs (first to)</SettingLabel>
              <Pills options={LEG_OPTIONS} value={setup.cricket.firstTo} onChange={firstTo => onChange({ cricket: { ...setup.cricket, firstTo } })} />
            </div>
            <div className="dashboard-setting flex flex-col gap-2">
              <SettingLabel>Scoring</SettingLabel>
              <Pills
                options={CRICKET_SCORING}
                value={setup.cricket.scoring}
                onChange={scoring => onChange({ cricket: { ...setup.cricket, scoring } })}
                format={value => (value === 'standard' ? 'Standard' : 'No points')}
              />
              <p className="text-xs text-sisal max-w-xs">
                {setup.cricket.scoring === 'standard'
                  ? 'Extra hits score while an opponent has the number open. Close all numbers and lead or tie on points to win.'
                  : 'First to close all seven numbers wins the leg. Extra hits do not score.'}
              </p>
            </div>
          </>
        )}

        {gameId === 'copycat' && (
          <div className="dashboard-setting flex flex-col gap-2">
            <SettingLabel>Points (first to)</SettingLabel>
            <Pills options={COPYCAT_LIMIT_OPTIONS} value={setup.copycat.firstTo} onChange={firstTo => onChange({ copycat: { firstTo } })} />
          </div>
        )}
      </Panel>

      {setup.mode === 'singleplayer' && (
        <Panel notch="panel" className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <SettingLabel>Players · {setup.playerNames.length} / {MAX_PLAYERS}</SettingLabel>
            <button
              type="button"
              className="min-h-11 px-3 border border-wire text-sm text-wire disabled:opacity-40"
              disabled={setup.playerNames.length >= MAX_PLAYERS}
              onClick={() => onChange({ playerNames: [...setup.playerNames, `Player ${setup.playerNames.length + 1}`] })}
            >
              Add player
            </button>
          </div>
          <p className="text-xs text-sisal">Throw in this order. Pass the device when your turn ends.</p>
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
                    className="min-h-11 px-2 text-sm text-sisal"
                    onClick={() => onChange({ playerNames: setup.playerNames.filter((_, i) => i !== index) })}
                  >
                    Remove
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
