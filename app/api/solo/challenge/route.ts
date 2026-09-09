import { NextResponse } from "next/server";
import { weeklyChallenge } from "@/lib/solo/challenge";
import { friendContext, friendError } from "@/lib/friends/http";
import { FriendsError } from "@/lib/friends/repository";
import { startAttempt } from "@/lib/solo/repository";
import { StartSchema } from "@/lib/solo/schema";
export function GET() {
  return NextResponse.json(weeklyChallenge(), {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(req: Request) {
  try {
    const { db, actor } = await friendContext();
    const parsed = StartSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      throw new FriendsError("Invalid challenge settings.", 400);
    return NextResponse.json(
      await startAttempt(
        db,
        actor,
        parsed.data.difficulty,
        parsed.data.starter
      ),
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return friendError(error);
  }
}
