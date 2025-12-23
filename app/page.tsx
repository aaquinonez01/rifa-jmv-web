/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Range = { label: string; start: number };

function buildRanges(): Range[] {
  const ranges: Range[] = [];
  for (let s = 1; s <= 1000; s += 100) {
    const e = s + 99;
    ranges.push({ label: `${s}-${e}`, start: s });
  }
  return ranges;
}

function RifaGrid({
  start,
  onSelect,
  selected,
  sold,
}: {
  start: number;
  onSelect: (n: number) => void;
  selected?: number;
  sold: Set<number>;
}) {
  const nums = useMemo(
    () => Array.from({ length: 100 }, (_, i) => start + i),
    [start]
  );
  return (
    <div className="mt-4 grid w-full grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1 sm:gap-2 lg:gap-1">
      {nums.map((n) => {
        const isSel = selected === n;
        const isSold = sold.has(n);
        return (
          <button
            key={n}
            type="button"
            onClick={() => onSelect(n)}
            className={[
              "flex items-center justify-center rounded-md border p-0 select-none",
              "w-full aspect-square sm:w-11 sm:h-11 md:w-11 md:h-11 lg:w-10 lg:h-10",
              "text-base sm:text-base md:text-sm lg:text-xs",
              isSold
                ? "border-green-600 bg-green-500 text-white cursor-pointer hover:bg-green-600"
                : "cursor-pointer hover:bg-blue-50 border-blue-200 text-blue-900 bg-white",
            ].join(" ")}
            aria-pressed={isSel}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

export default function RifasPage() {
  const ranges = useMemo(() => buildRanges(), []);
  const [selected, setSelected] = useState<number | undefined>(undefined);
  const [sold, setSold] = useState<Set<number>>(new Set());

  useEffect(() => {
    let active = true;
    fetch("/api/tickets")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        const s = new Set<number>(Array.isArray(d?.sold) ? d.sold : []);
        setSold(s);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/tickets/stream");
    const handler = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data ?? "[]");
        if (Array.isArray(data)) setSold(new Set<number>(data));
      } catch {}
    };
    es.addEventListener("sold", handler as any);
    es.onmessage = handler as any;
    es.onopen = () => {
      // connected
    };
    es.onerror = () => {};
    return () => {
      es.close();
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 p-5 text-white">
        <h1 className="text-3xl sm:text-4xl font-bold text-center tracking-wide">
          RIFA SOLIDARIA JMV
        </h1>
        <p className="mt-2 text-sm text-center opacity-90">
          Selecciona el número de boleto
        </p>
      </div>

      <div className="mt-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Vendidos</p>
              <p className="text-2xl font-bold text-gray-900">{sold.size}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Faltan</p>
              <p className="text-2xl font-bold text-gray-900">
                {1000 - sold.size}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-blue-100">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${(sold.size / 1000) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-blue-700">
              {Math.round((sold.size / 1000) * 100)}% completado
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue={ranges[0].label} className="mt-4">
        <TabsList>
          {ranges.map((r) => (
            <TabsTrigger key={r.label} value={r.label}>
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ranges.map((r) => (
          <TabsContent key={r.label} value={r.label}>
            <RifaGrid
              start={r.start}
              onSelect={(n) => {
                if (sold.has(n)) {
                  toast.warning(`El boleto ${n} ya está vendido`, {
                    action: {
                      label: "Cancelar venta",
                      onClick: () => {
                        fetch("/api/tickets", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ number: n }),
                        })
                          .then(async (r) => {
                            if (!r.ok) return;
                            setSold((prev) => {
                              const next = new Set(prev);
                              next.delete(n);
                              return next;
                            });
                            toast.success(`Venta cancelada del boleto ${n}`);
                          })
                          .catch(() => {});
                      },
                    },
                  });
                  return;
                }
                setSelected(n);
                fetch("/api/tickets", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ number: n }),
                })
                  .then(async (r) => {
                    if (!r.ok) {
                      toast.error("No se pudo vender el boleto");
                      return;
                    }
                    setSold((prev) => new Set<number>([...prev, n]));
                    toast.success(`Boleto ${n} vendido`);
                  })
                  .catch(() => {});
              }}
              selected={selected}
              sold={sold}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
