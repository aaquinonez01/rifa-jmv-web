import { NextResponse } from "next/server";
import { getTicketRepo } from "@/lib/db";
import { broadcastSold } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const repo = await getTicketRepo();
  const sold = await repo.list();
  return NextResponse.json({ sold });
}

export async function POST(req: Request) {
  const body = await req.json();
  const n = Number(body?.number);
  if (!Number.isInteger(n) || n < 1 || n > 1000) {
    return NextResponse.json({ error: "Número inválido" }, { status: 400 });
  }
  const repo = await getTicketRepo();
  const exists = await repo.exists(n);
  if (exists)
    return NextResponse.json({ error: "Ya vendido" }, { status: 409 });
  await repo.sell(n);
  const sold = await repo.list();
  broadcastSold(sold);
  return NextResponse.json({ ok: true, number: n });
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const n = Number(body?.number);
  if (!Number.isInteger(n) || n < 1 || n > 1000) {
    return NextResponse.json({ error: "Número inválido" }, { status: 400 });
  }
  const repo = await getTicketRepo();
  const exists = await repo.exists(n);
  if (!exists)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  await repo.cancel(n);
  const sold = await repo.list();
  broadcastSold(sold);
  return NextResponse.json({ ok: true, number: n });
}
