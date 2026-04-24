"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

/* ── Nav tabs — 3 only ─────────────────────────────────── */
const navTabs = [
  { label: "About",    href: "#about",      desc: "Overview & Purpose",    primary: false },
  { label: "Hire",     href: "/dashboard",  desc: "Hiring Playground",     primary: true  },
  { label: "Insights", href: "#insights",   desc: "Analytics & Reports",   primary: false },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  /* Close drawer on ESC */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[1000] transition-shadow duration-200"
      style={{
        backgroundColor: "var(--navbar-bg)",      /* #2B72F0 — same as hero */
        height: "var(--navbar-height)",            /* 70px */
      }}
    >
      <div className="container-brand h-full">
        <div className="flex items-center justify-between h-full">

          {/* ── Logo ─────────────────────────────────────────── */}
          <Link
            href="/"
            className="shrink-0"
            style={{ position: "relative", display: "block", width: "230px", height: "72px" }}
          >
            {/* SVG clip — vertically centered, trims canvas whitespace */}
            <div style={{
              position: "absolute", top: "50%", transform: "translateY(-50%)",
              width: "230px", height: "58px", overflow: "hidden",
              display: "flex", alignItems: "center",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="Umuranga"
                style={{ height: "650px", width: "auto", flexShrink: 0 }}
                className="brightness-0 invert"
              />
            </div>
            {/* By Umurava — pinned to bottom-right, never overflows */}
            <span style={{
              position: "absolute", bottom: "3px", right: "0",
              fontSize: "12px", color: "#FFFFFF",
              fontWeight: 600, letterSpacing: "0.06em",
            }}>
              By Umurava
            </span>
          </Link>

          {/* ── Desktop pill nav ───────────────────────────── */}
          <div className="hidden md:flex items-center gap-1">
            {navTabs.map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className="px-4 py-2 rounded-full text-base transition-all duration-200 whitespace-nowrap"
                style={
                  tab.primary
                    ? {
                        backgroundColor: "rgba(255,255,255,0.22)",
                        color: "#FFFFFF",
                        fontFamily: '"Work Sans", "Work Sans Fallback"',
                        fontWeight: 500,
                      }
                    : {
                        color: "var(--navbar-text)",
                        fontFamily: '"Work Sans", "Work Sans Fallback"',
                        fontWeight: 500,
                      }
                }
                onMouseEnter={(e) => {
                  if (!tab.primary)
                    (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                }}
                onMouseLeave={(e) => {
                  if (!tab.primary)
                    (e.currentTarget as HTMLElement).style.color = "var(--navbar-text)";
                }}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* ── Desktop CTAs ───────────────────────────────── */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {/* Login — solid white pill, blue text */}
            <Link
              href="/dashboard"
              className="text-sm font-medium px-6 py-3 rounded-full transition-all"
              style={{ backgroundColor: "#FFFFFF", color: "var(--color-primary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f0f4ff"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#FFFFFF"; }}
            >
              Login
            </Link>
            {/* Hire Now — frosted blue pill, white text */}
            <Link
              href="/dashboard"
              className="text-sm font-medium px-6 py-3 rounded-full transition-all"
              style={{
                backgroundColor: "rgba(255,255,255,0.22)",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.50)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.32)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.22)"; }}
            >
              Hire Now
            </Link>
          </div>

          {/* ── Mobile hamburger ───────────────────────────── */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: "#FFFFFF" }}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ──────────────────────────────────── */}
      {isOpen && (
        <div
          className="md:hidden shadow-lg"
          style={{
            backgroundColor: "#FFFFFF",
            borderTop: "1px solid var(--navbar-border)",
          }}
        >
          <div className="container-brand py-4 space-y-1">
            {navTabs.map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                onClick={() => setIsOpen(false)}
                className="flex flex-col py-3 px-4 rounded-xl font-semibold text-sm transition-all"
                style={
                  tab.primary
                    ? { backgroundColor: "var(--color-primary)", color: "#FFFFFF" }
                    : { color: "var(--navbar-text)" }
                }
              >
                <span>{tab.label}</span>
                <span className="text-xs font-normal opacity-60 mt-0.5">{tab.desc}</span>
              </Link>
            ))}
            <div
              className="pt-3 flex flex-col gap-2"
              style={{ borderTop: "1px solid var(--border-light)" }}
            >
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="text-center py-2.5 px-4 rounded-full font-semibold text-sm transition-all"
                style={{
                  border: "1.5px solid var(--color-primary)",
                  color: "var(--color-primary)",
                }}
              >
                Login
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="text-center py-2.5 px-4 rounded-full font-semibold text-sm"
                style={{ backgroundColor: "var(--color-primary)", color: "#FFFFFF" }}
              >
                Hire Now
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
