'use client';
import { useEffect, useRef, useState } from 'react';
import type { Achievement, UserAchievement } from '@/lib/achievements/types';
import { getIconForAchievement } from '@/lib/achievements/icons';
import { rarityColors } from '@/lib/theme';
import { Button } from '@/components/atoms/Button';
import { EmptyState, SegmentedControl, TextButton } from '@/components/molecules';
import { Trophy } from 'lucide-react';
export interface AchievementsData { unlocked: UserAchievement[]; definitions: Achievement[] }

function AchievementDetails({ achievement, award, close }: { achievement: Achievement; award?: UserAchievement; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  const time = (date: Date) => <time dateTime={new Date(date).toISOString()}>{new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>;
  return <dialog ref={ref} className="achievement-dialog" style={{ borderColor: rarityColors[achievement.rarity].border }} aria-labelledby="achievement-title" onCancel={close} onClick={e => { if (e.target === e.currentTarget) { const bounds = e.currentTarget.getBoundingClientRect(); if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) close(); } }}>
    <div className="flex items-center gap-3"><span className="text-[32px]" aria-hidden="true">{getIconForAchievement(achievement.icon)}</span><div><p className="text-xs uppercase tracking-widest text-sisal">{achievement.rarity}{award ? ' · Unlocked' : ' · Locked'}</p><h2 id="achievement-title" className="text-[24px] font-display text-wire">{achievement.name}</h2></div></div>
    <p className="text-sm leading-relaxed">{achievement.description}</p>
    {award ? <dl className="achievement-dates"><div><dt>First unlocked</dt><dd>{time(award.unlocked_at)}</dd></div>{achievement.is_repeatable && <><div><dt>Times earned</dt><dd>{award.count}</dd></div><div><dt>Last unlocked</dt><dd>{award.last_unlocked_at ? time(award.last_unlocked_at) : award.count === 1 ? time(award.unlocked_at) : 'Not recorded for earlier awards'}</dd></div></>}</dl> : <p className="text-sm text-sisal">Complete the challenge to unlock this achievement.</p>}
    <Button variant="secondary" onClick={close} className="w-full">Close</Button>
  </dialog>;
}

export function Achievements({ unlocked, definitions }: AchievementsData) {
  const [selected, setSelected] = useState<Achievement | null>(null);
  const [showLocked, setShowLocked] = useState(false);
  const awards = new Map(unlocked.map(award => [award.achievement_id, award]));
  const visible = definitions.filter(achievement => showLocked || awards.has(achievement.achievement_id));
  const progress = definitions.length ? Math.round((unlocked.length / definitions.length) * 100) : 0;

  return <div className="flex flex-col gap-4">
    {/* Progress first: "11 of 40" is the thing a reader wants from this section at a glance,
        and it was previously the smallest, quietest text in it. */}
    <div className="achievement-progress">
      <p><span><strong>{unlocked.length}</strong><span>of {definitions.length} unlocked</span></span><span>{progress}%</span></p>
      <div
        className="achievement-progress-bar"
        role="progressbar"
        aria-valuenow={unlocked.length}
        aria-valuemin={0}
        aria-valuemax={definitions.length}
        aria-label="Achievements unlocked"
      >
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-2">
      <TextButton aria-pressed={showLocked} onClick={() => setShowLocked(!showLocked)}>
        {showLocked ? 'View unlocked only' : 'View all achievements'}
      </TextButton>
    </div>

    {visible.length ? <ul className="achievement-grid">{visible.map(achievement => {
      const award = awards.get(achievement.achievement_id);
      return <li key={achievement.achievement_id}>
        {/* Locked tiles are stated in words ("Locked") as well as being dimmer, and unlocked
            ones carry their rarity colour only as a left edge — a full coloured border on
            every tile made forty of them read as one texture. */}
        <button
          type="button"
          data-rarity={achievement.rarity}
          style={award ? { borderLeftColor: rarityColors[achievement.rarity].border } : undefined}
          className={`achievement-tile ${award ? '' : 'achievement-locked'}`}
          onClick={() => setSelected(achievement)}
          aria-haspopup="dialog"
        >
          <span className="achievement-icon" aria-hidden="true">{getIconForAchievement(achievement.icon)}</span>
          <span className="min-w-0">
            <strong>{achievement.name}</strong>
            {/* Status only. Pairing it with the rarity made a two-word line that truncated on
                every tile; rarity is what the coloured left edge and the detail dialog are
                for, and it is not something you scan a grid of forty tiles to compare. */}
            <small>{award
              ? achievement.is_repeatable ? `Earned ${award.count}×` : 'Unlocked'
              : 'Locked'}</small>
          </span>
        </button>
      </li>;
    })}</ul> : <EmptyState
      icon={Trophy}
      title="No achievements yet"
      body="Play a match and the first ones start unlocking. Use “View all achievements” to see what is on offer."
    />}
    {selected && <AchievementDetails achievement={selected} award={awards.get(selected.achievement_id)} close={() => setSelected(null)} />}
  </div>;
}
