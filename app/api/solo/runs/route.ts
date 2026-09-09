import { NextResponse } from "next/server";
import { friendContext, friendError } from "@/lib/friends/http";
import { FriendsError } from "@/lib/friends/repository";
import { submitAttempt, runDetails } from "@/lib/solo/repository";
import { SubmitSchema } from "@/lib/solo/schema";
export async function POST(req: Request) {
  try {
    const { db, actor } = await friendContext();
    const text = await req.text();
    if (text.length > 500000)
      throw new FriendsError("Run submission is too large.", 413);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new FriendsError("Invalid run submission.", 400);
    }
    const parsed = SubmitSchema.safeParse(body);
    if (!parsed.success) throw new FriendsError("Invalid run submission.", 400);
    return NextResponse.json(
      await submitAttempt(db, actor, parsed.data.id, parsed.data.actions),
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return friendError(error);
  }
}
export async function GET(req: Request) {
  try {
    const { db, actor } = await friendContext();
    return NextResponse.json(
      await runDetails(
        db,
        actor,
        new URL(req.url).searchParams.get("id") || ""
      ),
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return friendError(error);
  }
}
