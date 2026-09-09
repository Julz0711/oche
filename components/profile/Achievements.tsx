'use client';
import { useEffect, useRef, useState } from 'react';
import type { Achievement, UserAchievement } from '@/lib/achievements/types';
import { getIconForAchievement } from '@/lib/achievements/icons';
import { Button } from '@/components/atoms/Button';
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
  return <dialog ref={ref} className="achievement-dialog" aria-labelledby="achievement-title" onCancel={close} onClick={e => { if (e.target === e.currentTarget) { const bounds = e.currentTarget.getBoundingClientRect(); if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) close(); } }}>
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
  return <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-sisal">{unlocked.length} of {definitions.length} unlocked</p><button type="button" aria-pressed={showLocked} onClick={() => setShowLocked(!showLocked)} className="min-h-11 text-xs text-wire">{showLocked ? 'Show unlocked only' : 'Show all achievements'}</button></div>
    {visible.length ? <div className="achievement-grid">{visible.map(achievement => {
      const award = awards.get(achievement.achievement_id);
      return <button key={achievement.achievement_id} type="button" className={`achievement-tile ${award ? '' : 'achievement-locked'}`} onClick={() => setSelected(achievement)} aria-haspopup="dialog">
        <span className="text-[26px]" aria-hidden="true">{getIconForAchievement(achievement.icon)}</span><span className="min-w-0"><strong>{achievement.name}</strong><small>{award ? achievement.is_repeatable ? `Earned ${award.count}×` : 'Unlocked' : 'Locked'}</small></span>
      </button>;
    })}</div> : <p className="text-sm text-sisal">Your achievements will appear here as you play. View all to explore the challenges.</p>}
    {selected && <AchievementDetails achievement={selected} award={awards.get(selected.achievement_id)} close={() => setSelected(null)} />}
  </div>;
}
