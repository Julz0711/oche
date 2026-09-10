# Achievement System Design Spec

## Overview

The achievement system gamifies the Oche darts app by tracking player milestones, scoring records, and competitive achievements. Achievements are organized by rarity tier (Common, Rare, Epic, Legendary) and displayed on the user's profile with visual badges, descriptions, and counts for repeatable achievements.

**Goals:**
- Motivate players to explore different game modes and improve skills
- Provide long-term progression goals beyond individual match wins
- Create a visual showcase of player accomplishments on the profile

## Achievement Categories & List

### Legendary
- **9-Dart Finish** — Score a perfect 9-dart game (180 in 3 throws); one-time
- **Unstoppable** — Win 10 consecutive matches; one-time
- **Flawless Victory** — Win 3 matches in a row without losing a leg; one-time
- **Cricket God** — Win a Cricket leg by only hitting required numbers (no wasted rounds); one-time

### Epic
- **Triple 20** (180 Score) — Score 180 points in a single round; repeatable, counted
- **5-Win Streak** — Win 5 consecutive matches; repeatable
- **10-Dart Finish** — Win an X01 match in 10 darts or fewer; repeatable
- **Grand Slam** — Win first match in all 3 game modes (X01, Cricket, Copycat); one-time
- **180!** — Score a 180; repeatable

### Rare
- **25+ Wins** — Achieve 25 total match wins; one-time (then count milestones: 50, 100, 250)
- **Comeback Kid** — Win a match after being 100+ points behind (X01); repeatable
- **100-Point Round** — Score 100+ points in a single round; repeatable
- **Triple Trouble** — Score only with triples in a single round; repeatable
- **Double Down** — Score only with doubles in a single round; repeatable
- **50+ Average** — Score a 50+ average in a single leg; repeatable
- **First 180** — Score your first 180; one-time
- **Bounce Back** — Lose first leg, then win the match; repeatable

### Common
- **First Win** — Win your first match (any mode); one-time
- **First 20** — Score a 20-point segment; one-time
- **First Triple** — Hit a triple segment
- **First Double Bulls-Eye** — Score a 20-point segment; one-time
- **Winning Streak** — Win 3 consecutive matches; repeatable
- **Practice Makes Perfect** — Play 10 matches total; one-time
- **Round the Board** — Hit 10 different numbered segments in a single leg; one-time
- **Sharpshooter** — Hit 10 bull's-eye segments total, one-time

## Data Model

### Achievement Definition (Database Collection: `achievements`)
```
{
  _id: ObjectId,
  achievement_id: string (unique),           // e.g., "first_win", "triple_20"
  name: string,                              // "First Win"
  description: string,                       // "Win your first match"
  category: enum ["legendary", "epic", "rare", "common"],
  rarity: enum ["legendary", "epic", "rare", "common"],
  icon: string,                              // Icon name (lucide-react)
  is_repeatable: boolean,                    // false = one-time, true = counted
  trigger_condition: object,                 // Conditions for earning
  display_order: number,                     // Sort order by rarity
}
```

### User Achievement Progress (Database Collection: `user_achievements`)
```
{
  _id: ObjectId,
  user_id: string,
  achievement_id: string,
  unlocked_at: Date,                         // When first earned
  count: number,                             // For repeatable achievements (default 1)
  progress_data: object,                     // Optional: e.g., current_streak: 3
}
```

## Achievement Trigger Conditions

**After Each Match Completion:**
- Check winner → evaluate win-based achievements (First Win, 3-Win Streak, 5-Win Streak, 20-Win Streak, 50-Win Streak, 25+ Wins, etc.)
- Check match duration & score → evaluate efficiency achievements (10-Dart Finish, Speed Runner, Comeback Kid)
- Check opponent score → Perfect Match, Flawless Victory
- Scan all throws for 180 scores → Triple 20 count
- Check if all game modes played → Grand Slam
- Check session state (matches played today) → Consistent, Undefeated Session
- Evaluate game-mode-specific achievements (Perfect Cricket, Copycat King)

**During Match (Per Round/Throw):**
- On each completed round: check for 180, Perfect Round (100+ points), max-points round
- Track round scores for 100+ point detection
- Monitor match timer for speed achievements

**Special Cases:**
- 9-Dart Finish: Only X01 with host player winning in exactly 9 darts (3 visits of 3 darts each, all 180s)
- Perfect Match: Opponent never scores (score = 0)
- Flawless Victory: Host wins all legs with no loss (X01 best-of-N format)
- Perfect Cricket: Only hits required numbers, no wasted rounds
- Comeback Kid: Trailing by 80+ points at some point, then win
- Grand Slam: Achievement_earned for each mode separately, one unlock when all three earned
- Streaks: Require consecutive wins in real-time play (reset on loss or logout)

## UI/UX Design

### Profile Achievements Section
- **Grid layout**: Responsive columns (4-5 on desktop, 2-3 on tablet, 1-2 on mobile)
- **Organization**: Grouped by rarity tier (Legendary → Epic → Rare → Common)
- **Locked achievements**: Shown as greyed-out placeholders with lock icon (motivational)
- **Repeatable badge**: Small green count badge in bottom-right corner (e.g., "47" for 180 Score)
- **Hover/tap**: Shows full achievement name and description

### Achievement Badge Styling
| Rarity | Color | Glow | Use Case |
|--------|-------|------|----------|
| Legendary | Gold (#FFD700) | Yes | Nearly impossible achievements |
| Epic | Purple (#A855F7) | Yes | Hard/impressive achievements |
| Rare | Blue (#3B82F6) | No | Moderate difficulty |
| Common | Green (--double) | No | Early progression, accessible |

### Toast Notification (On Unlock)
- **Appearance**: Slide in from top-right, 10s auto-dismiss or click to close
- **Content**: Icon + "Achievement Unlocked" + name + description
- **For repeatable**: "Achievement: [Name] (×N)" where N is new count
- **Color**: Matches achievement rarity tier

### Tooltip/Hover Details
- **Name** (bold)
- **Description** (1-2 lines, what it means)
- **How to unlock** (if applicable, for locked achievements)
- **Count** (if repeatable: "You have earned this N times")

## Technical Implementation

### Achievement Checking Engine
- **Location**: `lib/games/achievements.ts` (new utility module)
- **Exports**:
  - `evaluateAchievements(matchData, user): Achievement[]` — Check all conditions post-match
  - `evaluateVisitAchievements(visit, user): Achievement[]` — Check during play (per-visit)
  - `getAchievementDefinitions(): Achievement[]` — Fetch all achievement metadata
- **Execution**: Called from match completion handler and match page (per-visit)

### Database Seeding
- On app startup, `achievements` collection is seeded with all achievement definitions if empty
- Definitions are immutable after seeding (never updated mid-session)

### Session Lifetime
- Streak state (`current_streak`, `matches_this_session`) stored in-memory during match play
- Persisted to database only on match completion
- Reset on new session (user returns to dashboard, new day)

### API Endpoints
- **GET `/api/user/achievements`** — Fetch user's unlocked achievements + locked definitions
- **POST `/api/achievements/evaluate`** — Internal endpoint (called after match completion)

### Toast Trigger
- Emit `achievement-unlocked` event with achievement data
- Client-side toast component listens and displays
- Toast auto-dismisses after 10 seconds or on user click

## Testing Strategy

### Manual Testing Checklist (Sampled by Rarity)

**Legendary:**
- [ ] 9-Dart Finish (X01: win with exactly 3×180)
- [ ] Perfect Match (opponent score = 0)
- [ ] Grand Slam (win one match in each game mode)

**Epic:**
- [ ] Triple 20 (score 180, check count increments)
- [ ] 5-Win Streak (win 5 in a row, verify repeatable)
- [ ] Consistent (win 5 matches in one session)

**Rare:**
- [ ] 25+ Wins (accumulate 25 total wins, unlock badge)
- [ ] Comeback Kid (lose, score significantly behind, win)
- [ ] Play All Modes (play X01, Cricket, Copycat once each)

**Common:**
- [ ] First Win (win first match, verify one-time)
- [ ] Practice Makes Perfect (play 10 matches)

### General Testing
- [ ] Verify toast appears on each achievement unlock
- [ ] Confirm all 24 achievements display on profile grid
- [ ] Repeatable achievements show count badge (e.g., "47")
- [ ] Locked achievements appear greyed out with lock icon
- [ ] Responsive layout on mobile/tablet/desktop
- [ ] Toast auto-dismisses after 10s or on click
- [ ] Icons match achievement meanings
- [ ] Descriptions are clear and helpful
- [ ] Streak resets on logout/new day
- [ ] Game-mode-specific achievements only trigger in correct mode

### Acceptance Criteria
- [ ] All 24 achievements can be earned through normal play
- [ ] Toast notifications display with correct rarity color
- [ ] Profile section shows all achievements organized by rarity
- [ ] Achievement counts increment correctly for repeatable achievements
- [ ] Locked achievements motivate players (visible but unearned)
- [ ] No false positives (achievements don't trigger on near-conditions)

## Future Enhancements
- Seasonal/limited-time achievements
- Achievement tiers (Milestone badges for cumulative counts: "180 Score ×50", ×100", etc.)
- Friends leaderboard by achievements
- Achievement rarity statistics (% of players who have each)
- Achievement hunting challenges ("Earn 3 Rares this week")
