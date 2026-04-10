"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Zap } from "lucide-react";

const navLinks = [
  { label: "Features",    href: "#features"     },
  { label: "How It Works",href: "#how-it-works" },
  { label: "Impact",      href: "#stats"         },
  { label: "Testimonials",href: "#testimonials"  },
];

export default function Navbar() {
  const [isOpen,   setIsOpen]   = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/98 backdrop-blur-md shadow-[0_2px_20px_rgba(43,115,240,0.08)] border-b border-[#e2eaf6]"
          : "bg-transparent"
      }`}
    >
      <div className="container-brand">
        <div className="flex items-center justify-between h-16 md:h-[72px]">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2b73f0] flex items-center justify-center shadow-[0_2px_8px_rgba(43,115,240,0.40)]">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className={`font-extrabold text-xl tracking-tight transition-colors duration-300 ${scrolled ? "text-[#011b40]" : "text-white"}`}>
              Umuranga
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className={`font-medium text-sm transition-colors hover:text-[#2b73f0] ${scrolled ? "text-[#374151]" : "text-white/85"}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className={`font-semibold text-sm transition-colors hover:text-[#2b73f0] ${scrolled ? "text-[#011b40]" : "text-white"}`}
            >
              Sign In
            </Link>
            <Link href="/login" className="btn-primary text-sm px-5 py-2.5">
              Get Started →
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? "text-[#011b40]" : "text-white"}`}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-[#e2eaf6] shadow-lg">
          <div className="container-brand py-4 space-y-1">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setIsOpen(false)}
                className="block text-[#374151] hover:text-[#2b73f0] font-medium py-2.5 px-3 rounded-xl hover:bg-[#f6fcff] transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-[#e2eaf6] flex flex-col gap-2">
              <Link href="/login" onClick={() => setIsOpen(false)} className="btn-secondary text-sm text-center">
                Sign In
              </Link>
              <Link href="/login" onClick={() => setIsOpen(false)} className="btn-primary text-sm text-center">
                Get Started →
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
