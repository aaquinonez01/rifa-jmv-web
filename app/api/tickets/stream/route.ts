import { addSubscriber, removeSubscriber } from "@/lib/events";
import { getTicketRepo } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(req: Request) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      const send = (chunk: Uint8Array) => controller.enqueue(chunk);
      addSubscriber(send);

      // initial state
      (async () => {
        try {
          const repo = await getTicketRepo();
          const sold = await repo.list();
          controller.enqueue(
            enc.encode(`event: sold\ndata: ${JSON.stringify(sold)}\n\n`)
          );
        } catch {
          controller.enqueue(enc.encode(`event: sold\ndata: []\n\n`));
        }
      })();

      // heartbeat
      const keepAlive = setInterval(() => {
        controller.enqueue(enc.encode(`: keep-alive\n\n`));
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        removeSubscriber(send);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  const repo = await getTicketRepo();
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
  return new Response(stream, { headers });
}
