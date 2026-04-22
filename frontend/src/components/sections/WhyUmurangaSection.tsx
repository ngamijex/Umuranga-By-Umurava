"use client";

import { useEffect, useRef, useState } from "react";

export default function WhyUmurangaSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const top = containerRef.current.getBoundingClientRect().top;
      // Only start progress once the section has pinned to the top (top <= 0)
      if (top > 0) { setProgress(0); return; }
      const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
      // Animation completes at 67% of scroll — last 33% holds the final state
      const animRange = (totalScrollable || 1) * 0.67;
      const p = Math.max(0, Math.min(1, -top / animRange));
      setProgress(p);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const ease = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const titleP = ease(Math.min(progress / 0.55, 1));
  const contentP = Math.max(0, (progress - 0.55) / 0.45);

  // End state: top-left, slightly smaller
  const titleTop        = 50 - 32 * titleP;       // 50% → 18%
  const titleLeft       = 50 - 43 * titleP;       // 50% → 7%
  const titleTranslateX = -50 * (1 - titleP);     // -50% → 0%
  const titleTranslateY = -50 * (1 - titleP);     // -50% → 0%
  const titleSize       = 4.8 - 2.6 * titleP;     // 4.8rem → 2.2rem

  // Parallax drift — each image moves outward as title scrolls away
  const bX = -22 * titleP, bY = -18 * titleP;
  const cX =  22 * titleP, cY = -18 * titleP;
  const dX =  20 * titleP, dY =  18 * titleP;
  const eX = -20 * titleP, eY =  18 * titleP;

  return (
    <div ref={containerRef} id="features" style={{ height: "400vh" }}>
      <style>{`
        @keyframes floatB {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50%     { transform: translateY(-14px) rotate(2deg); }
        }
        @keyframes floatC {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50%     { transform: translateY(-18px) rotate(-2.5deg); }
        }
        @keyframes floatD {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50%     { transform: translateY(-12px) rotate(1.5deg); }
        }
        @keyframes floatE {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50%     { transform: translateY(-16px) rotate(-1.5deg); }
        }
        @keyframes floatA {
          0%,100% { transform: translate(-50%,-50%) scale(1); }
          50%     { transform: translate(-50%,-50%) scale(1.04); }
        }
      `}</style>
      <div
        className="sticky top-0 overflow-hidden bg-white"
        style={{ height: "100vh" }}
      >
        {/* a.png — large centered backdrop, slow pulse */}
        <img src="/a.png" alt="" aria-hidden="true" style={{
          position: "absolute", top: "50%", left: "50%",
          animation: "floatA 6s ease-in-out infinite",
          width: "680px", height: "680px", objectFit: "contain",
          opacity: (1 - titleP) * 0.35, pointerEvents: "none", zIndex: 1,
        }} />

        {/* b.png — upper-left, floats + drifts outward */}
        <div style={{ position: "absolute", top: "12%", left: "14%", transform: `translate(${bX}px,${bY}px)`, zIndex: 1 }}>
          <img src="/b.png" alt="" aria-hidden="true" style={{
            width: "180px", height: "180px", objectFit: "contain",
            opacity: (1 - titleP) * 0.85, pointerEvents: "none",
            borderRadius: "16px",
            animation: "floatB 4s ease-in-out infinite",
          }} />
        </div>

        {/* c.png — upper-right, floats + drifts outward */}
        <div style={{ position: "absolute", top: "10%", right: "14%", transform: `translate(${cX}px,${cY}px)`, zIndex: 1 }}>
          <img src="/c.png" alt="" aria-hidden="true" style={{
            width: "200px", height: "200px", objectFit: "contain",
            opacity: (1 - titleP) * 0.85, pointerEvents: "none",
            borderRadius: "16px",
            animation: "floatC 5s ease-in-out infinite",
            animationDelay: "-1.2s",
          }} />
        </div>

        {/* d.png — lower-right, floats + drifts outward */}
        <div style={{ position: "absolute", bottom: "12%", right: "16%", transform: `translate(${dX}px,${dY}px)`, zIndex: 1 }}>
          <img src="/d.png" alt="" aria-hidden="true" style={{
            width: "170px", height: "170px", objectFit: "contain",
            opacity: (1 - titleP) * 0.85, pointerEvents: "none",
            borderRadius: "16px",
            animation: "floatD 4.5s ease-in-out infinite",
            animationDelay: "-2s",
          }} />
        </div>

        {/* e.png — lower-left, floats + drifts outward */}
        <div style={{ position: "absolute", bottom: "10%", left: "14%", transform: `translate(${eX}px,${eY}px)`, zIndex: 1 }}>
          <img src="/e.png" alt="" aria-hidden="true" style={{
            width: "175px", height: "175px", objectFit: "contain",
            opacity: (1 - titleP) * 0.85, pointerEvents: "none",
            borderRadius: "16px",
            animation: "floatE 3.8s ease-in-out infinite",
            animationDelay: "-0.6s",
          }} />
        </div>

        {/* Animated "Why Umuranga" label */}
        <div
          style={{
            position: "absolute",
            top: `${titleTop}%`,
            left: `${titleLeft}%`,
            transform: `translate(${titleTranslateX}%, ${titleTranslateY}%)`,
            fontSize: `${titleSize}rem`,
            fontWeight: 800,
            color: "var(--color-primary)",
            whiteSpace: "nowrap",
            lineHeight: 1.1,
            transition: "none",
            zIndex: 2,
            textShadow: "0 0 40px rgba(255,255,255,0.95), 0 0 80px rgba(255,255,255,0.6), 0 2px 8px rgba(255,255,255,0.8)",
          }}
        >
          Why Umuranga

          {/* why.svg — absolutely positioned below text, doesn't affect layout */}
          <img
            src="/why.svg"
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginTop: "14px",
              width: "520px",
              opacity: contentP,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Description — fades in on the right */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: "8%",
            transform: "translateY(-50%)",
            width: "46%",
            opacity: contentP,
            pointerEvents: contentP > 0.1 ? "auto" : "none",
          }}
        >
          {/* hire.svg — centered background behind paragraph */}
          <img
            src="/hire.svg"
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "500px",
              opacity: 0.62,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)", margin: 0 }}>
              Umuranga is an{" "}
              <strong style={{ color: "var(--color-primary)" }}>AI-powered HR assistant</strong>{" "}
              designed to simplify and accelerate the hiring process — from the first application to the final offer.
            </p>
            <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)", margin: 0 }}>
              It screens and{" "}
              <strong style={{ color: "var(--color-primary)" }}>ranks candidates automatically</strong>,
              generates tailored interview questions, evaluates responses, and surfaces the best talent — in seconds, not days.
            </p>
            <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)", margin: 0 }}>
              Every decision comes with clear reasoning, keeping recruiters fully in control while ensuring{" "}
              <strong style={{ color: "var(--color-primary)" }}>transparency, fairness, and smarter outcomes</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
