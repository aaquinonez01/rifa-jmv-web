type Subscriber = (chunk: Uint8Array) => void

const enc = new TextEncoder()

const globalEvents = globalThis as unknown as {
  _subs?: Set<Subscriber>
}
const subscribers = (globalEvents._subs ||= new Set<Subscriber>())

export function addSubscriber(cb: Subscriber) {
  subscribers.add(cb)
}

export function removeSubscriber(cb: Subscriber) {
  subscribers.delete(cb)
}

export function broadcastSold(sold: number[]) {
  const payload = `event: sold\ndata: ${JSON.stringify(sold)}\n\n`
  const data = enc.encode(payload)
  subscribers.forEach((cb) => {
    try {
      cb(data)
    } catch {}
  })
}
