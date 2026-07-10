import { rpc } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Serves a published LifeOS calendar as an ICS feed that Apple Calendar,
    Google Calendar etc. can subscribe to (webcal://…/api/feed/<id>). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f]{32,64}$/.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const rows = await rpc<{ ics: string; updated_at: string }[]>("get_feed", {
      p_id: id,
    });
    if (!rows.length) return new Response("Not found", { status: 404 });

    return new Response(rows[0].ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="lifeos.ics"',
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("Feed temporarily unavailable", { status: 503 });
  }
}
