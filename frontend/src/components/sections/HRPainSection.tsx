"use client";

import { useEffect, useRef, useState } from "react";

type Segment = { text: string; highlight?: boolean };

type Slide =
  | { type: "gif"; gif: string; segments: Segment[] }
  | { type: "card"; emoji: string; title: string; desc: string };

const slides: Slide[] = [
  {
    type: "gif",
    gif: "/1.gif",
    segments: [
      { text: "HR teams burn " },
      { text: "10+ hours", highlight: true },
      { text: " every day manually reviewing " },
      { text: "hundreds of CVs", highlight: true },
      { text: " — missing " },
      { text: "top candidates", highlight: true },
      { text: " due to fatigue and bias." },
    ],
  },
  {
    type: "gif",
    gif: "/2.png",
    segments: [
      { text: "After reviewing " },
      { text: "50+ CVs", highlight: true },
      { text: ", " },
      { text: "bias and fatigue", highlight: true },
      { text: " creep in — " },
      { text: "top candidates", highlight: true },
      { text: " get missed." },
    ],
  },
  {
    type: "gif",
    gif: "/3.gif",
    segments: [
      { text: "Long " },
      { text: "screening delays", highlight: true },
      { text: " mean " },
      { text: "losing your best candidates", highlight: true },
      { text: " to " },
      { text: "faster-moving competitors", highlight: true },
      { text: "." },
    ],
  },
  {
    type: "gif",
    gif: "/4.png",
    segments: [
      { text: "Comparing candidates across reviewers leads to " },
      { text: "inconsistent", highlight: true },
      { text: ", " },
      { text: "unfair decisions", highlight: true },
      { text: "." },
    ],
  },
  {
    type: "gif",
    gif: "/5.png",
    segments: [
      { text: "A single wrong hire costs up to " },
      { text: "30% of their annual salary", highlight: true },
      { text: " — plus " },
      { text: "team morale", highlight: true },
      { text: "." },
    ],
  },
];

export default function HRPainSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const indexRef = useRef(0);
  const throttled = useRef(false);

  useEffect(() => { indexRef.current = activeIndex; }, [activeIndex]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setActiveIndex(0);
          indexRef.current = 0;
        }
      },
      { threshold: 1.0 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!fullyVisible) return;

      const cur = indexRef.current;

      if (e.deltaY > 0 && cur < slides.length - 1) {
        e.preventDefault();
        if (throttled.current) return;
        throttled.current = true;
        setActiveIndex(cur + 1);
        setTimeout(() => { throttled.current = false; }, 650);
      } else if (e.deltaY < 0 && cur > 0) {
        e.preventDefault();
        if (throttled.current) return;
        throttled.current = true;
        setActiveIndex(cur - 1);
        setTimeout(() => { throttled.current = false; }, 650);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <section ref={sectionRef} className="bg-white pb-0" style={{ marginTop: "16px" }}>
      <div className="container-brand pt-0 pb-0">
        {/* Sliding area + nav arrows */}
        <div className="flex items-center gap-4 max-w-3xl mx-auto" style={{ height: "200px" }}>

          {/* Left arrow */}
          <button
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            aria-label="Previous"
            style={{
              width: "36px", height: "36px", borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0,
              background: "radial-gradient(circle, rgba(43,114,240,0.18) 0%, rgba(43,114,240,0.06) 60%, transparent 80%)",
              color: "var(--color-primary)", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s",
            }}
          >‹</button>

        <div
          className="relative flex-1"
          style={{ height: "200px", overflow: "hidden" }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              className="absolute inset-0 flex items-center"
              style={{
                transform:
                  i === activeIndex
                    ? "translateX(0)"
                    : i < activeIndex
                    ? "translateX(-110%)"
                    : "translateX(110%)",
                opacity: i === activeIndex ? 1 : 0,
                transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease",
              }}
            >
              {slide.type === "gif" ? (
                <div className="flex items-center gap-8 w-full px-6 py-4 h-full">
                  <img
                    src={slide.gif}
                    alt=""
                    className="shrink-0 rounded-xl object-cover"
                    style={{ width: "220px", height: "220px" }}
                  />
                  <p className="text-lg leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {slide.segments.map((seg, j) =>
                      seg.highlight ? (
                        <strong key={j} style={{ color: "var(--color-primary)", fontWeight: 700 }}>
                          {seg.text}
                        </strong>
                      ) : (
                        <span key={j}>{seg.text}</span>
                      )
                    )}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-4 w-full px-6 h-full">
                  <span className="text-3xl shrink-0">{slide.emoji}</span>
                  <div>
                    <h3 className="font-bold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
                      {slide.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {slide.desc}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

          {/* Right arrow */}
          <button
            onClick={() => setActiveIndex((i) => Math.min(slides.length - 1, i + 1))}
            aria-label="Next"
            style={{
              width: "36px", height: "36px", borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0,
              background: "radial-gradient(circle, rgba(43,114,240,0.18) 0%, rgba(43,114,240,0.06) 60%, transparent 80%)",
              color: "var(--color-primary)", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s",
            }}
          >›</button>

        </div>
      </div>

      {/* line.png divider */}
      <img src="/line.png" alt="" className="w-full block" />
    </section>
  );
}
