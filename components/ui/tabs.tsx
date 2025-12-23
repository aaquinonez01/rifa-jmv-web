"use client";
import { ReactNode, useState, createContext, useContext } from "react";

type TabsProps = {
  defaultValue?: string;
  children: ReactNode;
  className?: string;
};

type TabsContext = {
  value: string;
  setValue: (v: string) => void;
};
const TabsCtx = createContext<TabsContext | null>(null);

function useTabsContext(): TabsContext {
  const ctx = useContext(TabsCtx);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
  return ctx;
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <TabsCtx.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabsList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex h-12 w-full max-w-full items-center justify-start rounded-xl border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700 overflow-x-auto gap-1 scroll-smooth",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="tablist"
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { value: current, setValue } = useTabsContext();
  const active = current === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => setValue(value)}
      className={[
        "inline-flex min-w-[72px] sm:min-w-[96px] shrink-0 items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-xs sm:text-sm font-medium cursor-pointer",
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-blue-700 hover:bg-blue-100",
        "transition-colors",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { value: current } = useTabsContext();
  if (current !== value) return null;
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}
