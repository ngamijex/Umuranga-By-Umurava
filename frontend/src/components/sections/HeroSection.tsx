"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

const WORDS = ["screen", "compare", "select", "rank", "hire"];

export default function HeroSection() {
  const [wordIdx,  setWordIdx]  = useState(0);
  const [text,     setText]     = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = WORDS[wordIdx];
    let timer: ReturnType<typeof setTimeout>;

    if (!deleting && text === word) {
      timer = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && text === "") {
      timer = setTimeout(() => {
        setDeleting(false);
        setWordIdx((i) => (i + 1) % WORDS.length);
      }, 400);
    } else {
      timer = setTimeout(
        () => setText(deleting ? text.slice(0, -1) : word.slice(0, text.length + 1)),
        deleting ? 55 : 105
      );
    }

    return () => clearTimeout(timer);
  }, [text, deleting, wordIdx]);

  return (
    <section
      className="relative overflow-hidden pt-[72px]"
      style={{ backgroundColor: "var(--hero-bg)" }}
    >
      {/* ── Irregular cloud glow behind hero text ─────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "68%",
          left: "38%",
          transform: "translate(-50%, -50%) rotate(-8deg)",
          width: "460px",
          height: "150px",
          background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.10) 55%, transparent 75%)",
          filter: "blur(22px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── Centered hero content ─────────────────────────── */}
      <div className="container-brand w-full pt-6 md:pt-8 pb-0 text-center" style={{ position: "relative", zIndex: 1 }}>
        <div className="mx-auto">

          {/* Headline */}
          <h1 className="text-2xl md:text-[2rem] font-extrabold text-white leading-tight tracking-tight mb-3 whitespace-nowrap">
            From Many Applicants to the Right One.
          </h1>

          {/* Typewriter subtitle — single flex row */}
          <div className="flex items-center justify-center gap-2 mb-5 text-white/80 text-base flex-nowrap">
            <span className="whitespace-nowrap">We help you</span>
            <span className="inline-flex items-center text-white font-bold shrink-0">
              <span className="opacity-70">#</span><span>{text}</span>
              <span className="ml-[2px] w-[2px] h-5 bg-white/90 animate-pulse inline-block rounded-full" />
            </span>
            <span className="whitespace-nowrap">top talent — fast, fair, and explainable.</span>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-4 mb-0">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-white text-sm font-medium px-6 py-3 rounded-full hover:bg-blue-50 transition-all duration-200"
              style={{ color: "var(--color-primary)" }}
            >
              Start Screening <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 border border-white/50 text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-white/10 transition-all duration-200"
            >
              Learn More <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </div>

      {/* ── Infinite seamless wave via SVG pattern ── */}
      <svg
        width="100%"
        height="60"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", marginTop: "-30px" }}
      >
        <defs>
          {/* Back wave — deeper blue, slowest, reverse */}
          <pattern id="waveBack" x="0" y="0" width="1440" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M0,40 C240,26 480,26 720,40 C960,54 1200,54 1440,40 L1440,60 L0,60 Z"
              fill="rgba(29,78,216,0.40)"
            />
            <animateTransform attributeName="patternTransform" type="translate"
              from="-1440 0" to="0 0" dur="9s" repeatCount="indefinite" />
          </pattern>

          {/* Mid wave — lighter blue, medium speed */}
          <pattern id="waveMid" x="0" y="0" width="1440" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M0,46 C240,34 480,34 720,46 C960,56 1200,56 1440,46 L1440,60 L0,60 Z"
              fill="rgba(147,197,253,0.55)"
            />
            <animateTransform attributeName="patternTransform" type="translate"
              from="0 0" to="-1440 0" dur="6.5s" repeatCount="indefinite" />
          </pattern>

          {/* Front wave — white, fastest */}
          <pattern id="waveFront" x="0" y="0" width="1440" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M0,48 C240,36 480,36 720,48 C960,58 1200,58 1440,48 L1440,60 L0,60 Z"
              fill="white"
            />
            <animateTransform attributeName="patternTransform" type="translate"
              from="0 0" to="-1440 0" dur="5s" repeatCount="indefinite" />
          </pattern>
        </defs>

        <rect width="100%" height="60" fill="url(#waveBack)" />
        <rect width="100%" height="60" fill="url(#waveMid)" />
        <rect width="100%" height="60" fill="url(#waveFront)" />
      </svg>
    </section>
  );
}
