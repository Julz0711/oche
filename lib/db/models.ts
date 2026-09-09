// lib/db/models.ts
import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema({
  gameId: { type: String, required: true },
  settings: mongoose.Schema.Types.Mixed,
  mode: { type: String, enum: ['local', 'remote'], required: true },
  roomCode: String,
  rematch: mongoose.Schema.Types.Mixed,
  nextMatchId: String,
  previousMatchId: String,
  hostId: String,
  userId: String,
  players: [
    {
      userId: String,
      guestId: String,
      name: String,
      isGuest: Boolean,
    },
  ],
  status: { type: String, enum: ['lobby', 'live', 'complete', 'abandoned'], required: true },
  state: mongoose.Schema.Types.Mixed,
  winnerId: String,
  startedAt: Date,
  completedAt: Date,
  durationMs: Number,
  // User ids whose achievements have already been evaluated for this finished match. Written
  // once per user by POST /api/matches/[id]/achievements so a reload of a completed match can't
  // award repeatable achievements a second time.
  achievementsEvaluatedFor: [String],
  createdAt: { type: Date, default: Date.now },
});

export const Match = mongoose.models.Match || mongoose.model('Match', MatchSchema);

const VisitSchema = new mongoose.Schema({
  matchId: { type: String, required: true },
  legId: String,
  playerId: { type: String, required: true },
  index: Number,
  seq: Number,
  throws: [
    {
      sector: Number,
      ring: String,
      points: Number,
      order: Number,
    },
  ],
  scoreBefore: Number,
  scoreAfter: Number,
  busted: Boolean,
  isCheckout: Boolean,
  enteredBy: String,
  createdAt: { type: Date, default: Date.now },
});

export const Visit = mongoose.models.Visit || mongoose.model('Visit', VisitSchema);

const AchievementSchema = new mongoose.Schema({
  achievement_id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], required: true },
  icon: { type: String, required: true },
  is_repeatable: { type: Boolean, default: false },
  trigger_condition: { type: mongoose.Schema.Types.Mixed, required: true },
  category: { type: String, required: true },
  display_order: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
});

export const Achievement =
  mongoose.models.Achievement || mongoose.model('Achievement', AchievementSchema);

const UserAchievementSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  achievement_id: { type: String, required: true },
  unlocked_at: { type: Date, default: Date.now },
  last_unlocked_at: Date,
  count: { type: Number, default: 1 },
  progress_data: mongoose.Schema.Types.Mixed,
});

UserAchievementSchema.index({ user_id: 1, achievement_id: 1 }, { unique: true });

export const UserAchievement =
  mongoose.models.UserAchievement ||
  mongoose.model('UserAchievement', UserAchievementSchema);
