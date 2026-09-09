import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Match } from '@/lib/db/models';
import { getIdentity } from '@/lib/identity';
import { gameRegistry, getGameModule, GameId } from '@/lib/games/registry';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
  const { identity } = await getIdentity(req);
  await connectDB();
  const previous = await Match.findById(id);
  if (!previous) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  if (previous.mode !== 'remote' || previous.hostId !== identity.id) {
    return NextResponse.json({ error: 'Only the room host can set up the next match' }, { status: 403 });
  }
  if (previous.status !== 'complete') return NextResponse.json({ error: 'Finish this match first' }, { status: 409 });
  if (previous.nextMatchId) return NextResponse.json({ id: previous.nextMatchId });

  // Reserve the next configuration once. Retrying after an interrupted request recovers the
  // same match; concurrent submissions cannot create two lobbies or overwrite the result.
  let reservation = previous.rematch;
  if (!reservation) {
    let body;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    if (!body || typeof body.gameId !== 'string' || !Object.hasOwn(gameRegistry, body.gameId)) {
      return NextResponse.json({ error: 'Choose a valid game' }, { status: 400 });
    }
    const game = await getGameModule(body.gameId as GameId);
    const settings = game.settingsSchema.safeParse(body.settings);
    if (!settings.success) return NextResponse.json({ error: 'Invalid game settings' }, { status: 400 });
    if (previous.players.length < game.playerRange[0] || previous.players.length > game.playerRange[1]) {
      return NextResponse.json({ error: 'This game does not support the current number of players' }, { status: 400 });
    }
    const proposed = { id: new mongoose.Types.ObjectId().toString(), gameId: body.gameId, settings: settings.data };
    const claimed = await Match.findOneAndUpdate(
      { _id: id, status: 'complete', rematch: { $exists: false } },
      { $set: { rematch: proposed } }, { new: true }
    );
    reservation = claimed?.rematch ?? (await Match.findById(id))?.rematch;
  }
  if (!reservation) return NextResponse.json({ error: 'Could not prepare the next match. Please retry.' }, { status: 409 });
  try {
    await Match.updateOne({ _id: reservation.id }, { $setOnInsert: {
      gameId: reservation.gameId, settings: reservation.settings, mode: 'remote', status: 'lobby',
      roomCode: previous.roomCode, hostId: previous.hostId, players: previous.players,
      previousMatchId: id,
    } }, { upsert: true });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  await Match.updateOne({ _id: id }, { $set: { nextMatchId: reservation.id } });
  return NextResponse.json({ id: reservation.id });
}
