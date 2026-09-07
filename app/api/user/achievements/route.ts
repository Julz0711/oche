import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { getUserAchievements, getAchievementDefinitions } from "@/lib/games/achievements";

export async function GET() {
  await connectDB();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const unlockedAchievements = await getUserAchievements(userId);
  const allDefinitions = await getAchievementDefinitions();

  return NextResponse.json({
    unlocked: unlockedAchievements,
    definitions: allDefinitions,
  });
}
