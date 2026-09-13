// app/api/matches/[id]/settings/route.ts
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getIdentity } from '@/lib/identity';
import { canEditSettings } from '@/lib/matchLobby';
import { getGameModule, GameId } from '@/lib/games/registry';
import { toSchemaInput } from '@/lib/games/settingsForm';
import { publishMatchEvent } from '@/lib/realtime';

/**
 * Changes the rules of a match that hasn't started, from its waiting room.
 *
 * Host-only and lobby-only (see `canEditSettings`). The body is a complete settings object for
 * the match's own game, validated by that game's schema — the same contract `POST /api/matches`
 * uses, so a forged or partial payload can no more reach match state through here than through
 * creation.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const settingsInput = (body as { settings?: unknown })?.settings;
  if (!settingsInput || typeof settingsInput !== 'object') {
    return NextResponse.json({ error: 'settings must be an object' }, { status: 400 });
  }

  await connectDB();
  const match = await Match.findById(id);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const { identity } = await getIdentity(req);
  const check = canEditSettings({ status: match.status, hostId: match.hostId }, identity);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  // `toSchemaInput` before `safeParse`, never after: a stored settings object is the schema's
  // OUTPUT, and for X01 that output (a numeric starting score) is not valid input to the same
  // schema. See lib/games/settingsForm.ts.
  const gameModule = await getGameModule(match.gameId as GameId);
  const parsed = gameModule.settingsSchema.safeParse(
    toSchemaInput(match.gameId as GameId, settingsInput as Record<string, unknown>)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid settings for this game' }, { status: 400 });
  }

  match.settings = parsed.data;
  await match.save();

  // Reuses the existing 'lobby' event rather than adding a new one: the broadcast is only a
  // "something changed, re-read it" nudge, and every client's refresh already pulls the whole
  // snapshot — settings included (see hooks/useRemoteMatchSync.ts).
  await publishMatchEvent(id, { name: 'lobby', data: { players: match.players } });

  return NextResponse.json({ settings: parsed.data });
}
