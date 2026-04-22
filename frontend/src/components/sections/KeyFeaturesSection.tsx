"use client";
import { useEffect, useRef, useState } from "react";
import { Bot, Eye, Mic2, GitBranch } from "lucide-react";

const FEATURES = [
  {
    Icon: Bot,
    number: "01",
    title: "Intelligent AI Screening",
    desc: "Automatically analyzes every applicant against your job requirements. Matches skills, experience, and relevance, then scores and ranks all candidates to generate a clear Top 10–20 shortlist in seconds — not days.",
    highlights: ["scores and ranks", "Top 10–20 shortlist", "seconds — not days"],
    from: "left",
  },
  {
    Icon: Eye,
    number: "02",
    title: "Explainable & Transparent Decisions",
    desc: "Every AI decision is fully explained — why a candidate was selected, their key strengths and gaps, and a final recommendation with clear reasoning. Recruiters trust and understand every result.",
    highlights: ["fully explained", "strengths and gaps", "trust and understand"],
    from: "left",
  },
  {
    Icon: Mic2,
    number: "03",
    title: "AI-Powered Interviews & Evaluation",
    desc: "Generates smart interview questions, evaluates candidate responses, and scores performance consistently across all interviews. Brings fairness, consistency, and deeper insights to every hiring decision.",
    highlights: ["smart interview questions", "scores performance", "fairness, consistency"],
    from: "right",
  },
  {
    Icon: GitBranch,
    number: "04",
    title: "End-to-End Hiring Workflow",
    desc: "Manage the full hiring journey in one place — move candidates across stages, compare them side-by-side, send notifications, and access detailed reports and hiring insights. From first application to final offer.",
    highlights: ["full hiring journey", "side-by-side", "first application to final offer"],
    from: "right",
  },
];

function highlightText(text: string, words: readonly string[]) {
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  return text.split(regex).map((part, i) =>
    regex.test(part)
      ? <strong key={i} style={{ color: "#2b72f0", fontWeight: 700 }}>{part}</strong>
      : part
  );
}

export default function KeyFeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="features" style={{ backgroundColor: "#2b72f0", padding: "80px 0" }}>
      <style>{`
        @keyframes slideFromLeft {
          from { opacity: 0; transform: translateX(-80px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideFromRight {
          from { opacity: 0; transform: translateX(80px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes dropFromTop {
          from { opacity: 0; transform: translateY(-36px) scale(0.7); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div className="container-brand">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
            What We Offer
          </p>
          <h2 style={{ margin: 0, fontSize: "clamp(1.6rem, 3vw, 2.25rem)", fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
            Key Features of Umuranga
          </h2>
        </div>

        {/* Cards row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
          {FEATURES.map((f, i) => (
            <div
              key={f.number}
              style={{
                background: "#fff",
                borderRadius: "16px",
                padding: "28px 22px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                opacity: visible ? 1 : 0,
                animation: visible
                  ? `${f.from === "left" ? "slideFromLeft" : "slideFromRight"} 0.6s cubic-bezier(0.34,1.2,0.64,1) ${i * 0.12}s both`
                  : "none",
              }}
            >
              {/* Icon — hollow open circle */}
              <div style={{
                width: "54px", height: "54px",
                borderRadius: "50%",
                border: "2.5px solid #2b72f0",
                background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: visible ? `dropFromTop 0.5s cubic-bezier(0.34,1.4,0.64,1) ${i * 0.12 + 0.25}s both` : "none",
                opacity: visible ? 1 : 0,
              }}>
                <f.Icon size={24} color="#2b72f0" strokeWidth={1.8} />
              </div>

              {/* Number badge + title */}
              <div>
                <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#2b72f0", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  {f.number}
                </span>
                <h3 style={{ margin: "4px 0 0", fontSize: "0.95rem", fontWeight: 700, color: "#111827", lineHeight: 1.35 }}>
                  {f.title}
                </h3>
              </div>

              {/* Description with highlights */}
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#374151", lineHeight: 1.65 }}>
                {highlightText(f.desc, f.highlights)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
