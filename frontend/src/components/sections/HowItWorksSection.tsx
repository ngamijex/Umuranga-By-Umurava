"use client";
import { useEffect, useRef, useState } from "react";
import { Briefcase, Users, Bot, FileText, Scale, GitBranch, Mic, Trophy } from "lucide-react";

const STEPS = [
  { number:1, title:"Create the Job",            desc:"Define the role — title, skills, experience, and priorities. The AI learns what your ideal candidate looks like.", highlights:["title, skills, experience","ideal candidate"],                    Icon: Briefcase, above:true  },
  { number:2, title:"Add Candidates",             desc:"Upload talent profiles, PDFs, or Excel/CSV files. Umuranga standardises everything into a clean format.",          highlights:["Upload","standardises"],                                         Icon: Users,     above:false },
  { number:3, title:"AI Screening",               desc:"Skills matched, every candidate scored and ranked. Top 10–20 shortlisted in seconds — not days.",                  highlights:["scored and ranked","seconds — not days"],                        Icon: Bot,       above:true  },
  { number:4, title:"Clear Explanations",         desc:"Each shortlisted candidate comes with strengths, gaps, and an overall recommendation.",                              highlights:["strengths, gaps","overall recommendation"],                      Icon: FileText,  above:false },
  { number:5, title:"Compare & Evaluate",         desc:"Side-by-side comparison across skills, experience, and fit — objective and easy.",                                  highlights:["Side-by-side comparison","objective"],                           Icon: Scale,     above:true  },
  { number:6, title:"Hiring Stages",              desc:"Move candidates: Shortlist → Interview → Final Selection with notifications and full tracking.",                     highlights:["Shortlist → Interview → Final Selection"],                       Icon: GitBranch, above:false },
  { number:7, title:"AI-Assisted Interviews",     desc:"Auto-generated questions, response evaluation, and performance scoring for consistent interviews.",                  highlights:["Auto-generated questions","performance scoring"],                 Icon: Mic,       above:true  },
  { number:8, title:"Transparent Final Decision", desc:"Clear reasoning, scoring breakdowns, and reports. Final decisions always remain with humans.",                       highlights:["Clear reasoning","Final decisions always remain with humans"],    Icon: Trophy,    above:false },
];

function highlight(desc: string, words: string[]) {
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = desc.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <strong key={i} style={{ color:"#2B72F0", fontWeight:700 }}>{part}</strong>
      : part
  );
}

// Long winding road: enters left at top, S-curves down, exits right at bottom
// Camera follows car so only a 1600x560 window is visible at any time
const CENTER_PATH   = "M -300,200 C 400,200 700,200 900,350 C 1100,500 1200,720 1000,980 C 800,1240 300,1240 200,1500 C 100,1760 400,1960 750,2050 C 1100,2140 1400,2100 2100,2100";
const STEP_TRIGGERS = [0.08, 0.19, 0.30, 0.41, 0.51, 0.62, 0.72, 0.83];
const HEADER_H      = 72; // px reserved for header inside sticky view

export default function HowItWorksSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef      = useRef<SVGPathElement>(null);
  const roadLenRef   = useRef(3000);
  const [progress,   setProgress]   = useState(0);
  const [view,       setView]       = useState({ x: -1100, y: -80 });
  const [carScreen,  setCarScreen]  = useState({ left: 0, top: 0, angle: 0 });
  const [stepScreen, setStepScreen] = useState<{x:number;y:number}[]>([]);

  // Single effect: scroll + resize both call update() which computes everything at once
  useEffect(() => {
    const update = () => {
      if (!containerRef.current || !pathRef.current) return;
      const top = containerRef.current.getBoundingClientRect().top;
      const scrollable = containerRef.current.offsetHeight - window.innerHeight;
      const prog = top > 0 ? 0 : Math.max(0, Math.min(1, -top / ((scrollable || 1) * 0.88)));

      const len  = pathRef.current.getTotalLength();
      const dist = prog * len;
      const pt   = pathRef.current.getPointAtLength(dist);
      const pt2  = pathRef.current.getPointAtLength(Math.min(dist + 12, len));
      const angle = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * (180 / Math.PI);

      const svgH = window.innerWidth * 560 / 1600;
      const svgT = HEADER_H + (window.innerHeight - HEADER_H - svgH) / 2;
      const w    = window.innerWidth;
      const vx   = pt.x - 800;
      const vy   = pt.y - 280;

      setProgress(prog);
      setView({ x: vx, y: vy });
      setCarScreen({ left: ((pt.x - vx) / 1600) * w, top: svgT + ((pt.y - vy) / 560) * svgH, angle });
      setStepScreen(STEP_TRIGGERS.map(t => {
        const sp = pathRef.current!.getPointAtLength(t * len);
        return { x: ((sp.x - vx) / 1600) * w, y: svgT + ((sp.y - vy) / 560) * svgH };
      }));
    };
    if (pathRef.current) roadLenRef.current = pathRef.current.getTotalLength();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const dashOffset  = -progress * roadLenRef.current; // dashes flow backward, opposite to car
  const activeIdx   = [...STEP_TRIGGERS].reduce((acc, t, i) => (progress >= t ? i : acc), -1);

  return (
    <section style={{ background: "linear-gradient(180deg,#f8faff 0%,#ffffff 45%,#f0f7ff 100%)" }}>

      <div ref={containerRef} style={{ height: "1600vh" }}>
        <div className="sticky top-0 overflow-hidden" style={{ height: "100vh" }}>

          <style>{`
            @keyframes pinStandUp {
              0%   { transform:scaleY(0); opacity:0; }
              60%  { transform:scaleY(1.18); opacity:1; }
              100% { transform:scaleY(1); }
            }
            @keyframes cardPop {
              from { opacity:0; transform:translateX(-50%) scale(0.85) translateY(8px); }
              to   { opacity:1; transform:translateX(-50%) scale(1)    translateY(0);   }
            }
            @keyframes descFade {
              from { opacity:0; transform:translateX(-50%) translateY(5px); }
              to   { opacity:1; transform:translateX(-50%) translateY(0);   }
            }
          `}</style>

          {/* Scrolling panorama: forest → mountains → buildings */}
          <div style={{
            position:"absolute", bottom:0, left:0,
            display:"flex", alignItems:"flex-end",
            transform:`translateX(-${progress * 200}vw)`,
            willChange:"transform",
            zIndex:0, pointerEvents:"none",
          }}>
            {/* ── Forest ── ~102vw */}
            <img src="/forest.png"  alt="" style={{ height:"auto", width:"34vw", flexShrink:0, opacity:0.88, display:"block" }} />
            <img src="/forest.png"  alt="" style={{ height:"auto", width:"34vw", flexShrink:0, opacity:0.88, display:"block" }} />
            <img src="/forest.png"  alt="" style={{ height:"auto", width:"34vw", flexShrink:0, opacity:0.88, display:"block" }} />
            {/* ── Mountains ── ~100vw */}
            <img src="/mountain.png" alt="" style={{ height:"auto", width:"25vw", flexShrink:0, opacity:0.88, display:"block" }} />
            <img src="/mountain.png" alt="" style={{ height:"auto", width:"25vw", flexShrink:0, opacity:0.88, display:"block" }} />
            <img src="/mountain.png" alt="" style={{ height:"auto", width:"25vw", flexShrink:0, opacity:0.88, display:"block" }} />
            <img src="/mountain.png" alt="" style={{ height:"auto", width:"25vw", flexShrink:0, opacity:0.88, display:"block" }} />
            {/* ── Buildings ── ~100vw */}
            <img src="/building.png"  alt="" style={{ height:"auto", width:"25vw", flexShrink:0, opacity:0.88, display:"block" }} />
            <img src="/building1.png" alt="" style={{ height:"auto", width:"25vw", flexShrink:0, opacity:0.88, display:"block" }} />
            <img src="/building3.png" alt="" style={{ height:"auto", width:"25vw", flexShrink:0, opacity:0.88, display:"block" }} />
            <img src="/building4.png" alt="" style={{ height:"auto", width:"25vw", flexShrink:0, opacity:0.88, display:"block" }} />
          </div>

          {/* Gradient veil: dense at base, transparent upward */}
          <div style={{
            position:"absolute", bottom:0, left:0, right:0,
            height:"340px",
            background:"linear-gradient(to top, rgba(43,114,240,0.88) 0%, rgba(43,114,240,0.45) 40%, rgba(43,114,240,0.0) 100%)",
            zIndex:1, pointerEvents:"none",
          }} />

          {/* Header */}
          <div style={{ position:"absolute", top:0, left:0, right:0, height: HEADER_H+"px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"4px", zIndex:20 }}>
            <p className="section-label" style={{ margin:0 }}>Step by Step</p>
            <h2 className="section-title" style={{ margin:0 }}>How Umuranga Works</h2>
          </div>

          {/* SVG road */}
          <svg
            viewBox={`${view.x} ${view.y} 1600 560`}
            preserveAspectRatio="none"
            style={{
              position:"absolute",
              top: HEADER_H+"px",
              left:0, width:"100%",
              height:`calc(100vh - ${HEADER_H}px)`,
              zIndex:2, overflow:"hidden",
            }}
          >
            {/* White border — always fully visible */}
            <path d={CENTER_PATH} fill="none" stroke="white" strokeWidth="98" strokeLinecap="butt" />
            {/* Dark asphalt — always fully visible */}
            <path ref={pathRef} d={CENTER_PATH} fill="none" stroke="#1a1a1a" strokeWidth="88" strokeLinecap="butt" />
            {/* Centre dashes — scroll-driven, moves right to left */}
            <path d={CENTER_PATH} fill="none" stroke="white" strokeWidth="3.5" strokeDasharray="22 15"
              strokeDashoffset={dashOffset} strokeLinecap="butt" />

            {/* Location pins */}
            {STEP_TRIGGERS.map((t, i) => {
              if (!pathRef.current) return null;
              const pt      = pathRef.current.getPointAtLength(t * pathRef.current.getTotalLength());
              const reached = progress >= t;
              return (
                <g key={i} style={{
                  transformOrigin:`${pt.x}px ${pt.y}px`,
                  transform: reached ? "scaleY(1)" : "scaleY(0)",
                  transition:"transform 0.55s cubic-bezier(0.34,1.56,0.64,1)",
                }}>
                  <path
                    d={`M ${pt.x},${pt.y} C ${pt.x-7},${pt.y-9} ${pt.x-13},${pt.y-20} ${pt.x-13},${pt.y-29} C ${pt.x-13},${pt.y-42} ${pt.x+13},${pt.y-42} ${pt.x+13},${pt.y-29} C ${pt.x+13},${pt.y-20} ${pt.x+7},${pt.y-9} ${pt.x},${pt.y} Z`}
                    fill="#2B72F0" stroke="white" strokeWidth="1.5"
                  />
                  <circle cx={pt.x} cy={pt.y-31} r={7} fill="white"/>
                  <circle cx={pt.x} cy={pt.y-31} r={3} fill="#2B72F0"/>
                </g>
              );
            })}
          </svg>

          {/* Car GIF */}
          <img src="/car.gif" alt="" style={{
            position:"absolute",
            left: carScreen.left+"px",
            top:  carScreen.top+"px",
            transform:`translateX(-50%) translateY(-58%) rotate(${carScreen.angle}deg)`,
            height:"360px", width:"auto",
            zIndex:6, pointerEvents:"none",
            filter:"drop-shadow(0 6px 14px rgba(0,0,0,0.4))",
          }} />

          {/* Step cards */}
          {STEPS.map((step, i) => {
            const triggered = progress >= STEP_TRIGGERS[i];
            const pos = stepScreen[i];
            if (!pos) return null;
            const cardTop = step.above ? pos.y - 210 : pos.y + 48;
            return (
              <div key={step.number} style={{
                position:"absolute",
                left: pos.x+"px", top: cardTop+"px",
                transform:"translateX(-50%)",
                width:"clamp(130px,13%,175px)",
                opacity:triggered ? 1 : 0,
                animation:triggered ? "cardPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" : "none",
                zIndex:10, pointerEvents:"none",
              }}>
                <div style={{
                  background:"white",
                  border:`2px solid ${triggered ? "#2B72F0" : "#e5e7eb"}`,
                  borderRadius:"12px", padding:"9px 9px 7px", textAlign:"center",
                  boxShadow:triggered ? "0 5px 18px rgba(43,114,240,0.18)" : "none",
                }}>
                  <div style={{ display:"flex", justifyContent:"center", marginBottom:"3px" }}>
                    <step.Icon size={18} color="#2B72F0" strokeWidth={1.8}/>
                  </div>
                  <div style={{ fontSize:"0.55rem", fontWeight:700, color:"#2B72F0", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:"2px" }}>Step {step.number}</div>
                  <h3 style={{ fontSize:"0.65rem", fontWeight:700, color:"#111827", lineHeight:1.3, margin:"0 0 4px" }}>{step.title}</h3>
                  <p style={{ fontSize:"0.6rem", color:"#111827", lineHeight:1.5, margin:0 }}>{highlight(step.desc, step.highlights)}</p>
                </div>
                {/* Connector */}
                <div style={{ width:"2px", height:"14px", background:"#2B72F0", margin:"0 auto" }}/>
              </div>
            );
          })}


        </div>
      </div>
    </section>
  );
}
