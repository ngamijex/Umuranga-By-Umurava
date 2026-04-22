"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/* ── Brand colors ── */
const C = {
  primary:     "#2B72F0",
  primaryDark: "#1D4ED8",
  primary50:   "#EFF6FF",
  primary100:  "#DBEAFE",
  primary200:  "#BFDBFE",
  gray50:      "#F9FAFB",
  gray100:     "#F3F4F6",
  gray200:     "#E5E7EB",
  gray300:     "#D1D5DB",
  gray400:     "#9CA3AF",
  gray500:     "#6B7280",
  gray600:     "#4B5563",
  gray700:     "#374151",
  gray900:     "#111827",
  white:       "#FFFFFF",
  green:       "#22c55e",
  green50:     "#f0fdf4",
  green200:    "#bbf7d0",
  red:         "#ef4444",
  red50:       "#fef2f2",
  amber:       "#f59e0b",
};

/* ── Types ── */
interface SessionInfo {
  jobTitle: string; department: string; candidateName: string;
  status: string; windowStart: string; windowEnd: string;
  questionCount: number; startedAt?: string;
}

/* ── Icons ── */
const Ic = {
  mic: (col = C.gray600) => (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
      <path d="M19 10v2a7 7 0 01-14 0v-2"/>
      <line x1={12} y1={19} x2={12} y2={23}/><line x1={8} y1={23} x2={16} y2={23}/>
    </svg>
  ),
  micOff: (col = C.red) => (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1={1} y1={1} x2={23} y2={23}/>
      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
      <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23"/>
      <line x1={12} y1={19} x2={12} y2={23}/><line x1={8} y1={23} x2={16} y2={23}/>
    </svg>
  ),
  camera: (col = C.gray600) => (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z"/><rect x={1} y={5} width={15} height={14} rx={2}/>
    </svg>
  ),
  cameraOff: (col = C.red) => (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34"/>
      <path d="M23 7l-7 5 7 5V7z"/><line x1={1} y1={1} x2={23} y2={23}/>
    </svg>
  ),
  captions: (col = C.gray600) => (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={1} y={4} width={22} height={16} rx={2}/><path d="M7 15h4m4 0h2M7 11h2m4 0h4"/>
    </svg>
  ),
  phone: (col = C.white) => (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.43 9.19 19.79 19.79 0 01.36 .54a2 2 0 012-.2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.68 8.68"/>
    </svg>
  ),
  check: (col = C.primary) => (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  alert: (col = C.red) => (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={12} cy={12} r={10}/><line x1={12} y1={8} x2={12} y2={12}/><line x1={12} y1={16} x2={12.01} y2={16}/>
    </svg>
  ),
  clock: (col = C.primary) => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={12} cy={12} r={10}/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  calendar: (col = C.primary) => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={4} width={18} height={18} rx={2}/><line x1={16} y1={2} x2={16} y2={6}/><line x1={8} y1={2} x2={8} y2={6}/><line x1={3} y1={10} x2={21} y2={10}/>
    </svg>
  ),
  info: (col = C.primary) => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={12} cy={12} r={10}/><line x1={12} y1={16} x2={12} y2={12}/><line x1={12} y1={8} x2={12.01} y2={8}/>
    </svg>
  ),
};

/* ── Speech helpers ── */
function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.93; u.pitch = 1; u.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => /en[-_](US|GB|AU)/i.test(v.lang) && /female|woman|samantha|karen|moira|serena|victoria/i.test(v.name))
    || voices.find(v => /en/i.test(v.lang));
  if (preferred) u.voice = preferred;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}
function stopSpeaking() { if (typeof window !== "undefined") window.speechSynthesis.cancel(); }

/* ── Score ring ── */
function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 28, circ = 2 * Math.PI * r, offset = circ - (value / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={72} height={72}>
        <circle cx={36} cy={36} r={r} fill="none" stroke={C.gray200} strokeWidth={6} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 36 36)" />
        <text x={36} y={40} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.gray900}>{value}</text>
      </svg>
      <span style={{ fontSize: "0.62rem", fontWeight: 600, color: C.gray500, textAlign: "center" }}>{label}</span>
    </div>
  );
}

/* ── Control button ── */
function CtrlBtn({ icon, label, active, danger, onClick, disabled }: {
  icon: React.ReactNode; label: string; active?: boolean; danger?: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "10px 16px", borderRadius: 14,
        background: danger ? C.red : active ? C.primary50 : C.gray100,
        border: `1px solid ${danger ? C.red : active ? C.primary200 : C.gray200}`,
        color: danger ? C.white : active ? C.primary : C.gray700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
        minWidth: 64,
      }}
    >
      {icon}
      <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}

export default function InterviewPage() {
  const [token, setToken] = useState<string | null>(null);
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [phase, setPhase] = useState<"loading" | "error" | "lobby" | "starting" | "live" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  /* interview state */
  const [aiMsg, setAiMsg] = useState("");
  const [status, setStatus] = useState<"ai_speaking" | "listening" | "processing" | "idle">("idle");
  const [liveCapture, setLiveCapture] = useState("");
  const [score, setScore] = useState<any>(null);

  /* UI state */
  const [captionsOn, setCaptionsOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  /* refs */
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const capturedRef = useRef("");
  const sendRef = useRef<((text: string) => Promise<void>) | null>(null);

  /* init */
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (!t) { setErrorMsg("Invalid interview link."); setPhase("error"); return; }
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/public/interview/${token}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) { setErrorMsg(d.error || "Link not found."); setPhase("error"); return; }
        if (d.data.status === "completed") { setPhase("done"); return; }
        setInfo(d.data);
        setPhase(d.data.startedAt ? "starting" : "lobby");
      })
      .catch(() => { setErrorMsg("Could not load interview. Check your connection."); setPhase("error"); });
  }, [token]);

  /* camera */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; }
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(1000);
      recorderRef.current = recorder;
      return true;
    } catch { return false; }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const toggleCameraTrack = () => {
    const vt = streamRef.current?.getVideoTracks()[0];
    if (vt) { vt.enabled = !vt.enabled; setCameraOn(vt.enabled); }
  };

  const uploadRecording = useCallback(async (tok: string) => {
    if (!chunksRef.current.length) return;
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    const fd = new FormData();
    fd.append("recording", blob, "interview.webm");
    try { await fetch(`${API}/public/interview/${tok}/recording`, { method: "POST", body: fd }); } catch { /* non-fatal */ }
  }, []);

  /* speech recognition with auto-submit */
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    capturedRef.current = "";
    setLiveCapture("");
    const r = new SR();
    r.lang = "en-US"; r.continuous = false; r.interimResults = true;
    r.onresult = (e: any) => {
      let interim = "", final = "";
      for (const res of e.results) {
        if (res.isFinal) final += res[0].transcript + " ";
        else interim += res[0].transcript;
      }
      if (final) { capturedRef.current += final; setLiveCapture(capturedRef.current.trim()); }
      else setLiveCapture((capturedRef.current + interim).trim());
    };
    r.onend = () => {
      setStatus("idle");
      const text = capturedRef.current.trim();
      capturedRef.current = "";
      setLiveCapture("");
      if (text && sendRef.current) sendRef.current(text);
    };
    r.onerror = (e: any) => { if (e.error !== "no-speech") setStatus("idle"); };
    r.start();
    recognitionRef.current = r;
    setStatus("listening");
  }, []);

  /* send candidate turn */
  const doSendAnswer = useCallback(async (text: string) => {
    if (!token || !text.trim()) return;
    stopSpeaking();
    setStatus("processing");
    try {
      const res = await fetch(`${API}/public/interview/${token}/turn`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const d = await res.json();
      if (!d.success) { setStatus("idle"); return; }
      const msg: string = d.data.message;
      setAiMsg(msg);
      if (d.data.isComplete) {
        setStatus("ai_speaking");
        speak(msg, async () => {
          setStatus("idle");
          if (recorderRef.current?.state === "recording") recorderRef.current.stop();
          if (token) await uploadRecording(token);
          stopCamera();
          setPhase("done");
        });
      } else {
        setStatus("ai_speaking");
        speak(msg, () => { setStatus("idle"); startListening(); });
      }
    } catch { setStatus("idle"); }
  }, [token, stopCamera, uploadRecording, startListening]);

  useEffect(() => { sendRef.current = doSendAnswer; }, [doSendAnswer]);

  /* start interview */
  const beginInterview = useCallback(async () => {
    if (!token) return;
    setPhase("starting");
    const ok = await startCamera();
    if (!ok) { setErrorMsg("Camera/microphone access denied. Please allow access and try again."); setPhase("error"); return; }
    try {
      const res = await fetch(`${API}/public/interview/${token}/start`, { method: "POST" });
      const d = await res.json();
      if (!d.success) { setErrorMsg(d.error || "Failed to start."); setPhase("error"); return; }
      const msg: string = d.data.message;
      setAiMsg(msg);
      setPhase("live");
      setStatus("ai_speaking");
      speak(msg, () => { setStatus("idle"); startListening(); });
    } catch { setErrorMsg("Failed to start interview."); setPhase("error"); }
  }, [token, startCamera, startListening]);

  /* end interview manually */
  const endInterview = useCallback(async () => {
    stopSpeaking();
    recognitionRef.current?.stop();
    setStatus("idle");
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    if (token) await uploadRecording(token);
    stopCamera();
    setShowEndConfirm(false);
    setPhase("done");
  }, [token, uploadRecording, stopCamera]);

  const hasSpeech = typeof window !== "undefined" &&
    !!(((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));

  /* shared navbar */
  const NavBar = () => (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: 52, background: C.primary, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(43,114,240,0.2)" }}>
      <Image src="/logo.svg" alt="Umuranga" width={110} height={24} style={{ filter: "brightness(0) invert(1)" }} />
      {info && <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem" }}>{info.jobTitle}</span>}
    </div>
  );

  /* ── LOADING ── */
  if (phase === "loading" || phase === "starting") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.gray50 }}>
      <NavBar />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.primary}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
        <p style={{ color: C.gray500, fontSize: "0.875rem", margin: 0 }}>
          {phase === "starting" ? "Starting your interview…" : "Loading…"}
        </p>
      </div>
    </div>
  );

  /* ── ERROR ── */
  if (phase === "error") return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.gray50, padding: 24 }}>
      <NavBar />
      <div style={{ marginTop: 52, background: C.white, borderRadius: 16, border: `1px solid ${C.gray200}`, padding: 40, maxWidth: 460, textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.red50, border: "1px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          {Ic.alert()}
        </div>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: C.gray900, margin: "0 0 8px" }}>Interview Unavailable</h2>
        <p style={{ color: C.gray600, fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>{errorMsg}</p>
      </div>
    </div>
  );

  /* ── DONE ── */
  if (phase === "done") return (
    <div style={{ minHeight: "100vh", background: C.gray50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <NavBar />
      <div style={{ marginTop: 52, background: C.white, borderRadius: 20, border: `1px solid ${C.gray200}`, padding: "48px 40px", maxWidth: 520, textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        <div style={{ width: 68, height: 68, borderRadius: "50%", background: C.primary50, border: `1px solid ${C.primary200}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          {Ic.check()}
        </div>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: C.gray900, margin: "0 0 10px" }}>Interview Complete</h2>
        <p style={{ color: C.gray600, fontSize: "0.9rem", lineHeight: 1.7, margin: 0 }}>
          Thank you{info?.candidateName ? `, ${info.candidateName}` : ""}! Your interview has been submitted. The hiring team will review your responses and be in touch soon.
        </p>
        <p style={{ marginTop: 18, fontSize: "0.72rem", color: C.gray400 }}>You may close this window.</p>
        {score && (
          <div style={{ marginTop: 28, borderTop: `1px solid ${C.gray200}`, paddingTop: 24 }}>
            <p style={{ margin: "0 0 16px", fontSize: "0.68rem", fontWeight: 700, color: C.gray400, letterSpacing: "0.08em" }}>YOUR RESULTS</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
              <ScoreRing value={score.confidence} label="Confidence" color={C.primary} />
              <ScoreRing value={score.communication} label="Communication" color={C.primaryDark} />
              <ScoreRing value={score.accuracy} label="Accuracy" color="#0ea5e9" />
              <ScoreRing value={score.attitude} label="Attitude" color={C.green} />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ── LOBBY ── */
  if (phase === "lobby") return (
    <div style={{ minHeight: "100vh", background: C.gray50, paddingTop: 52 }}>
      <NavBar />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "44px 24px" }}>
        <div style={{ background: C.white, borderRadius: 18, border: `1px solid ${C.gray200}`, overflow: "hidden", boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}>
          <div style={{ background: C.primary, padding: "28px 32px", color: C.white }}>
            <p style={{ margin: "0 0 5px", fontSize: "0.68rem", fontWeight: 700, opacity: 0.7, letterSpacing: "0.12em" }}>AI INTERVIEW</p>
            <h1 style={{ margin: "0 0 3px", fontSize: "1.4rem", fontWeight: 800 }}>{info?.jobTitle}</h1>
            <p style={{ margin: 0, opacity: 0.75, fontSize: "0.85rem" }}>{info?.department}</p>
          </div>
          <div style={{ padding: "28px 32px" }}>
            <p style={{ margin: "0 0 24px", fontSize: "0.925rem", color: C.gray600, lineHeight: 1.75 }}>
              Hello{info?.candidateName ? ` ${info.candidateName}` : ""}! You are about to have a natural conversation with an AI interviewer. Just speak as you normally would — no scripts, no pressure.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {[
                { icon: Ic.clock(), label: "Duration", value: "15–25 minutes" },
                { icon: Ic.camera(), label: "Requirements", value: "Camera + Microphone" },
                { icon: Ic.info(), label: "Format", value: "Natural conversation" },
                { icon: Ic.calendar(), label: "Available until", value: info?.windowEnd ? new Date(info.windowEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : "—" },
              ].map(item => (
                <div key={item.label} style={{ background: C.gray50, borderRadius: 10, padding: "11px 13px", border: `1px solid ${C.gray200}`, display: "flex", alignItems: "flex-start", gap: 9 }}>
                  <span style={{ color: C.primary, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  <div>
                    <p style={{ margin: "0 0 1px", fontSize: "0.6rem", fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.07em" }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600, color: C.gray900 }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: C.primary50, border: `1px solid ${C.primary100}`, borderRadius: 10, padding: "14px 16px", marginBottom: 24 }}>
              <p style={{ margin: "0 0 8px", fontSize: "0.68rem", fontWeight: 700, color: C.primary, letterSpacing: "0.06em" }}>HOW IT WORKS</p>
              <ul style={{ margin: 0, paddingLeft: 18, color: C.gray700, fontSize: "0.8rem", lineHeight: 1.9 }}>
                <li>The AI will greet you and start the conversation</li>
                <li>After the AI speaks, just start talking — no need to press anything</li>
                <li>Pause naturally when done speaking — the AI picks it up automatically</li>
                <li>Captions are on by default so you can read what the AI says</li>
                <li>You can end the interview at any time using the controls</li>
              </ul>
            </div>
            {!hasSpeech && (
              <div style={{ background: "#FEF9C3", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: "0.78rem", color: "#92400e" }}>
                Voice recognition works best in Chrome or Edge. Please use one of those browsers.
              </div>
            )}
            <button onClick={beginInterview} style={{ width: "100%", padding: "14px", borderRadius: 12, background: C.primary, color: C.white, border: "none", fontSize: "0.925rem", fontWeight: 700, cursor: "pointer" }}>
              Begin Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ══════════ LIVE INTERVIEW ══════════ */
  return (
    <div style={{ minHeight: "100vh", background: C.gray100, paddingTop: 52, display: "flex", flexDirection: "column" }}>
      <NavBar />
      <style>{`
        @keyframes spin   { to   { transform: rotate(360deg); } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes waveup { 0%,100%{height:5px} 50%{height:20px} }
        .wv { width:3px; border-radius:2px; display:inline-block; animation:waveup 0.7s ease-in-out infinite; }
        .wv:nth-child(2){animation-delay:.12s}
        .wv:nth-child(3){animation-delay:.24s}
        .wv:nth-child(4){animation-delay:.36s}
        .wv:nth-child(5){animation-delay:.48s}
      `}</style>

      {/* ── End interview confirmation overlay ── */}
      {showEndConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: C.white, borderRadius: 16, padding: "32px 36px", maxWidth: 380, textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "1.1rem", fontWeight: 700, color: C.gray900 }}>End interview?</h3>
            <p style={{ margin: "0 0 24px", fontSize: "0.875rem", color: C.gray600, lineHeight: 1.6 }}>
              Your conversation so far will be saved and submitted to the hiring team.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowEndConfirm(false)} style={{ flex: 1, padding: "10px", borderRadius: 10, background: C.gray100, border: `1px solid ${C.gray200}`, color: C.gray700, fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}>
                Continue
              </button>
              <button onClick={endInterview} style={{ flex: 1, padding: "10px", borderRadius: 10, background: C.red, border: "none", color: C.white, fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>
                End Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px 100px", position: "relative" }}>

        {/* AI panel */}
        <div style={{
          background: C.white,
          borderRadius: 24,
          border: `1px solid ${C.gray200}`,
          boxShadow: "0 4px 32px rgba(0,0,0,0.07)",
          padding: "40px 48px",
          textAlign: "center",
          maxWidth: 480,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}>
          {/* AI avatar */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <div style={{
              width: 200, height: 200,
              borderRadius: "50%",
              overflow: "hidden",
              border: `4px solid ${status === "ai_speaking" ? C.primary : status === "listening" ? C.green : C.gray200}`,
              boxShadow: status === "ai_speaking" ? `0 0 0 6px ${C.primary100}` : status === "listening" ? `0 0 0 6px ${C.green50}` : "none",
              transition: "border-color 0.3s, box-shadow 0.3s",
              background: C.primary50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {status === "ai_speaking" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/talk.gif"
                  alt="AI speaking"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                /* Static avatar when not speaking */
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: C.primary50 }}>
                  <svg width={80} height={80} viewBox="0 0 24 24" fill="none" stroke={C.primary200} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx={12} cy={7} r={4}/>
                  </svg>
                </div>
              )}
            </div>

            {/* Status dot */}
            <div style={{
              position: "absolute", bottom: 10, right: 10,
              width: 18, height: 18, borderRadius: "50%",
              border: "3px solid white",
              background: status === "ai_speaking" ? C.primary : status === "listening" ? C.green : status === "processing" ? C.amber : C.gray300,
              animation: status !== "idle" ? "pulse 1.5s ease-in-out infinite" : "none",
            }} />
          </div>

          {/* Name + wave */}
          <p style={{ margin: "0 0 6px", fontSize: "0.82rem", fontWeight: 700, color: C.gray700 }}>AI Interviewer</p>

          {/* Speaking wave */}
          {status === "ai_speaking" && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 24, marginBottom: 6, justifyContent: "center" }}>
              {[1,2,3,4,5].map(n => <div key={n} className="wv" style={{ background: C.primary }} />)}
            </div>
          )}

          {/* Processing dots */}
          {status === "processing" && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 24, marginBottom: 6, justifyContent: "center" }}>
              {[1,2,3,4,5].map(n => <div key={n} className="wv" style={{ background: C.gray300 }} />)}
            </div>
          )}

          {/* Status text */}
          <p style={{
            margin: "4px 0 20px",
            fontSize: "0.72rem",
            fontWeight: 600,
            color: status === "ai_speaking" ? C.primary : status === "listening" ? C.green : status === "processing" ? C.amber : C.gray400,
            letterSpacing: "0.04em",
          }}>
            {status === "ai_speaking" ? "Speaking…" : status === "listening" ? "Listening — speak now" : status === "processing" ? "Processing…" : "Waiting"}
          </p>

          {/* Captions */}
          {captionsOn && aiMsg && (
            <div style={{
              width: "100%",
              background: C.gray900,
              color: C.white,
              borderRadius: 12,
              padding: "14px 18px",
              fontSize: "0.875rem",
              lineHeight: 1.7,
              textAlign: "left",
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              marginBottom: 4,
            }}>
              {aiMsg}
            </div>
          )}

          {/* Live capture — what candidate is saying */}
          {status === "listening" && liveCapture && (
            <div style={{
              width: "100%",
              marginTop: 8,
              background: C.green50,
              border: `1px solid ${C.green200}`,
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: "0.82rem",
              color: C.gray700,
              textAlign: "left",
              lineHeight: 1.6,
            }}>
              <span style={{ fontSize: "0.6rem", fontWeight: 700, color: C.green, display: "block", marginBottom: 4 }}>YOU</span>
              {liveCapture}
            </div>
          )}

          {/* Speak again button (idle, after AI finished) */}
          {status === "idle" && aiMsg && hasSpeech && (
            <button
              onClick={startListening}
              style={{
                marginTop: 12,
                padding: "9px 22px",
                borderRadius: 50,
                background: C.primary50,
                border: `1px solid ${C.primary200}`,
                color: C.primary,
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              {Ic.mic(C.primary)}
              Tap to speak
            </button>
          )}
        </div>

        {/* Candidate camera — floating PiP */}
        <div style={{
          position: "fixed",
          bottom: 90,
          right: 24,
          width: 176,
          borderRadius: 14,
          overflow: "hidden",
          border: `2px solid ${C.gray200}`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          background: C.gray900,
          aspectRatio: "4/3",
          display: cameraOn ? "block" : "none",
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: "block" }}
          />
          <div style={{ position: "absolute", top: 7, left: 9 }}>
            <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "rgba(255,255,255,0.75)", background: "rgba(0,0,0,0.4)", padding: "2px 7px", borderRadius: 8 }}>YOU</span>
          </div>
          <div style={{ position: "absolute", top: 7, right: 9, display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.4)", padding: "2px 7px", borderRadius: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.red, animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ color: C.white, fontSize: "0.55rem", fontWeight: 700 }}>REC</span>
          </div>
        </div>
      </div>

      {/* ── Control bar ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: C.white,
        borderTop: `1px solid ${C.gray200}`,
        padding: "10px 0 14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap", padding: "0 16px" }}>

          {/* Mic status indicator */}
          <CtrlBtn
            icon={status === "listening" ? Ic.mic(C.primary) : Ic.mic(C.gray500)}
            label={status === "listening" ? "Listening" : "Mic"}
            active={status === "listening"}
            onClick={() => {
              if (status === "idle" && aiMsg) startListening();
            }}
          />

          {/* Captions toggle */}
          <CtrlBtn
            icon={Ic.captions(captionsOn ? C.primary : C.gray500)}
            label="Captions"
            active={captionsOn}
            onClick={() => setCaptionsOn(v => !v)}
          />

          {/* Camera toggle */}
          <CtrlBtn
            icon={cameraOn ? Ic.camera(C.gray600) : Ic.cameraOff()}
            label={cameraOn ? "Camera on" : "Camera off"}
            active={false}
            onClick={toggleCameraTrack}
          />

          {/* Divider */}
          <div style={{ width: 1, height: 40, background: C.gray200, margin: "0 4px" }} />

          {/* End interview */}
          <CtrlBtn
            icon={Ic.phone()}
            label="End Interview"
            danger
            onClick={() => setShowEndConfirm(true)}
          />
        </div>
      </div>
    </div>
  );
}
