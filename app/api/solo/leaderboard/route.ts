import { NextResponse } from "next/server";
import { friendContext, friendError } from "@/lib/friends/http";
import { FriendsError } from "@/lib/friends/repository";
import { leaderboard } from "@/lib/solo/repository";
export async function GET(req: Request) {
  try {
    const { db, actor } = await friendContext(),
      value = new URL(req.url).searchParams.get("difficulty") || "regular";
    if (value !== "social" && value !== "regular" && value !== "expert")
      throw new FriendsError("Invalid difficulty.", 400);
    return NextResponse.json(await leaderboard(db, actor, value), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return friendError(error);
  }
}
