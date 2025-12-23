import { NextResponse } from "next/server"
import { getTicketRepo } from "@/lib/db"
import { broadcastSold } from "@/lib/events"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Range = { start: number; end: number }

export async function POST(req: Request) {
  if (process.env.SEED_ENABLED !== "true") {
    return NextResponse.json({ error: "Seeding deshabilitado" }, { status: 403 })
  }

  let ranges: Range[] | undefined
  try {
    const body = await req.json().catch(() => ({}))
    ranges = body?.ranges
  } catch {}

  const seedRanges: Range[] = Array.isArray(ranges) && ranges.length
    ? ranges
    : [
        { start: 651, end: 700 },
        { start: 701, end: 800 },
      ]

  const repo = await getTicketRepo()
  let created = 0
  for (const { start, end } of seedRanges) {
    const s = Math.max(1, start)
    const e = Math.min(1000, end)
    for (let n = s; n <= e; n++) {
      // avoid duplicates
      // eslint-disable-next-line no-await-in-loop
      const exists = await repo.exists(n)
      if (!exists) {
        // eslint-disable-next-line no-await-in-loop
        await repo.sell(n)
        created++
      }
    }
  }

  const sold = await repo.list()
  broadcastSold(sold)
  return NextResponse.json({ ok: true, created, soldCount: sold.length })
}

