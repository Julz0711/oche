// lib/db/models.ts
import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema({
  gameId: { type: String, required: true },
  settings: mongoose.Schema.Types.Mixed,
  mode: { type: String, enum: ['local', 'remote'], required: true },
  roomCode: String,
  hostId: String,
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
