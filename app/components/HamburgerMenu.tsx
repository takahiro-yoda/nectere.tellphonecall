"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "ホーム" },
  { href: "/calls", label: "架電" },
  { href: "/contracts", label: "契約・売上" },
  { href: "/admin", label: "管理" },
];

export function HamburgerMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-white"
        aria-label="ページメニューを開く"
        aria-expanded={open}
        aria-controls="header-navigation-menu"
      >
        <span className="flex flex-col gap-1.5" aria-hidden>
          <span className="h-0.5 w-4 rounded bg-current" />
          <span className="h-0.5 w-4 rounded bg-current" />
          <span className="h-0.5 w-4 rounded bg-current" />
        </span>
      </button>

      {open && (
        <nav
          id="header-navigation-menu"
          className="absolute left-0 top-12 z-30 w-52 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl shadow-zinc-900/10"
          aria-label="ページ移動"
        >
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? "bg-zinc-900 font-medium text-white shadow-sm"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
