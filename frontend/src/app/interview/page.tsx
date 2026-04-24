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

/* ── Speech helpers (with Chrome keepalive workaround) ── */
let _speakKeepAlive: ReturnType<typeof setInterval> | null = null;
let _speakTimeout: ReturnType<typeof setTimeout> | null = null;

function _clearSpeakTimers() {
  if (_speakKeepAlive) { clearInterval(_speakKeepAlive); _speakKeepAlive = null; }
  if (_speakTimeout) { clearTimeout(_speakTimeout); _speakTimeout = null; }
}

function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined") return;
  _clearSpeakTimers();
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95; u.pitch = 1; u.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => /en[-_](US|GB|AU)/i.test(v.lang) && /female|woman|samantha|karen|moira|serena|victoria/i.test(v.name))
    || voices.find(v => /en/i.test(v.lang));
  if (preferred) u.voice = preferred;

  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    _clearSpeakTimers();
    onEnd?.();
  };

  u.onend = done;
  u.onerror = () => done();

  // Chrome bug workaround: pause/resume every 12s to keep synthesis alive
  // Use a consecutive-not-speaking counter to avoid false positives
  let notSpeakingCount = 0;
  _speakKeepAlive = setInterval(() => {
    if (!window.speechSynthesis.speaking) {
      notSpeakingCount++;
      // Only call done if not speaking for 2 consecutive checks (24s idle = truly done)
      if (notSpeakingCount >= 2) { done(); return; }
    } else {
      notSpeakingCount = 0;
    }
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
  }, 12_000);

  // Timeout fallback: ~500ms per word + 10s buffer
  // At rate 0.95, speech is roughly 140 wpm ≈ 430ms/word — 500ms gives safe margin
  const wordCount = text.split(/\s+/).length;
  const estimatedMs = Math.max(15_000, wordCount * 500 + 10_000);
  _speakTimeout = setTimeout(() => {
    if (!finished) {
      window.speechSynthesis.cancel();
      done();
    }
  }, estimatedMs);

  window.speechSynthesis.speak(u);
}

function stopSpeaking() {
  if (typeof window === "undefined") return;
  _clearSpeakTimers();
  window.speechSynthesis.cancel();
}

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

type TourStep = {
  id: string;
  selector: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "you-video",
    selector: "[data-tour='you-video']",
    title: "This is your camera preview.",
    body: "Stay centered and well-lit. You can keep your camera on, or turn it off anytime.",
    placement: "right",
  },
  {
    id: "mic",
    selector: "[data-tour='mic-indicator']",
    title: "Your microphone is always listening.",
    body: "You don’t need to press any button. After the AI finishes speaking, just start talking naturally.",
    placement: "top",
  },
  {
    id: "captions",
    selector: "[data-tour='captions-toggle']",
    title: "Captions show what the AI says.",
    body: "Captions are on by default so you can read along. Toggle them on/off any time.",
    placement: "top",
  },
  {
    id: "camera-toggle",
    selector: "[data-tour='camera-toggle']",
    title: "Camera toggle.",
    body: "If you need privacy or low bandwidth, you can switch the camera off. Audio stays on for your answers.",
    placement: "top",
  },
  {
    id: "end",
    selector: "[data-tour='end-button']",
    title: "End the interview anytime.",
    body: "If something goes wrong or you’re done, click End. Your conversation so far will be saved.",
    placement: "top",
  },
  {
    id: "ai-panel",
    selector: "[data-tour='ai-panel']",
    title: "AI interviewer panel.",
    body: "Watch the status: Speaking → Waiting → Listening. When it’s Waiting, you can answer.",
    placement: "left",
  },
  {
    id: "ready",
    selector: "[data-tour='start-cta']",
    title: "When you’re ready, start the interview.",
    body: "You’ll get a 10‑second countdown to get comfortable before the first question begins.",
    placement: "top",
  },
];


export default function InterviewPage() {
  const [token, setToken] = useState<string | null>(null);
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [phase, setPhase] = useState<"loading" | "error" | "lobby" | "tour" | "starting" | "live" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  /* interview state */
  const [aiMsg, setAiMsg] = useState("");
  const [status, setStatus] = useState<"ai_speaking" | "listening" | "processing" | "idle">("idle");
  const [liveCapture, setLiveCapture] = useState("");
  const [score, setScore] = useState<any>(null);

  /* UI state */
  const [captionsOn, setCaptionsOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [tourSpot, setTourSpot] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [tourTargetMissing, setTourTargetMissing] = useState(false);
  const [mediaHint, setMediaHint] = useState<string>("");

  /* refs */
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const aiElementSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const capturedRef = useRef("");
  const sendRef = useRef<((text: string) => Promise<void>) | null>(null);
  const statusRef = useRef(status);
  const phaseRef = useRef(phase);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

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
  const startCamera = useCallback(async (opts?: { startRecorder?: boolean }) => {
    try {
      setMediaHint("");
      const stream =
        streamRef.current ??
        (await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        }));
      streamRef.current = stream;
      // Attach immediately if the video element is already mounted
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
      // Setup mixed audio graph once (mic + AI audio element) so recordings include AI voice.
      if (typeof window !== "undefined") {
        const ctx = audioCtxRef.current ?? new AudioContext();
        audioCtxRef.current = ctx;
        const dest = audioDestRef.current ?? ctx.createMediaStreamDestination();
        audioDestRef.current = dest;
        if (!micSourceRef.current) {
          const micStream = new MediaStream(stream.getAudioTracks());
          micSourceRef.current = ctx.createMediaStreamSource(micStream);
          micSourceRef.current.connect(dest);
        }
      }

      if (opts?.startRecorder !== false) {
        const at = stream.getAudioTracks?.()[0];
        if (at) at.enabled = true;

        // Video from camera + audio from mixed destination (mic + AI).
        const audioTrack = audioDestRef.current?.stream.getAudioTracks?.()[0];
        const mixed = audioTrack
          ? new MediaStream([stream.getVideoTracks()[0], audioTrack])
          : stream;

        const recorder = new MediaRecorder(mixed, { mimeType: "video/webm;codecs=vp8,opus" });
        recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.start(1000);
        recorderRef.current = recorder;
      }
      return true;
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "";
      setMediaHint(msg || "Could not access camera/microphone.");
      return false;
    }
  }, []);

  const playAiSpeech = useCallback(async (text: string, onEnd?: () => void) => {
    if (typeof window === "undefined") return;
    // Prefer server TTS so audio is capturable in recordings; fallback to browser speechSynthesis.
    try {
      if (!token) throw new Error("no token");

      const r = await fetch(`${API}/public/interview/${token}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error("tts failed");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);

      if (!aiAudioRef.current) {
        aiAudioRef.current = new Audio();
      }
      const el = aiAudioRef.current;
      el.src = url;
      el.crossOrigin = "anonymous";
      el.volume = 1;

      // Connect the element into our mixed recording graph once.
      if (audioCtxRef.current && audioDestRef.current && !aiElementSourceRef.current) {
        aiElementSourceRef.current = audioCtxRef.current.createMediaElementSource(el);
        aiElementSourceRef.current.connect(audioDestRef.current);
        aiElementSourceRef.current.connect(audioCtxRef.current.destination); // audible to user
      }

      // Ensure audio context is running (some browsers suspend until user gesture).
      await audioCtxRef.current?.resume().catch(() => {});

      await new Promise<void>((resolve) => {
        const done = () => {
          el.onended = null;
          el.onerror = null;
          URL.revokeObjectURL(url);
          resolve();
        };
        el.onended = done;
        el.onerror = done;
        el.play().catch(done);
      });

      onEnd?.();
    } catch {
      speak(text, onEnd);
    }
  }, [token]);

  /* Attach stream to video element once the live phase renders it */
  useEffect(() => {
    if (phase === "live" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

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

  /* continuous speech recognition — mic is always open */
  const startContinuousListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    capturedRef.current = "";
    setLiveCapture("");

    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;

    let processedUpTo = 0;

    r.onresult = (e: any) => {
      // IMPORTANT: Ignore all speech while AI is speaking or processing.
      // The mic picks up the AI's voice from speakers — treating that as
      // user speech would cause a feedback loop / conflict.
      const cur = statusRef.current;
      if (cur === "ai_speaking" || cur === "processing") {
        // Still advance processedUpTo so we don't re-process stale results later
        for (let i = processedUpTo; i < e.results.length; i++) {
          if (e.results[i].isFinal) processedUpTo = i + 1;
        }
        return;
      }

      let newFinal = "";
      let interim = "";
      for (let i = processedUpTo; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          newFinal += e.results[i][0].transcript + " ";
          processedUpTo = i + 1;
        } else {
          interim += e.results[i][0].transcript;
        }
      }

      if (newFinal) {
        capturedRef.current += newFinal;
        setLiveCapture(capturedRef.current.trim());
      } else if (interim) {
        setLiveCapture((capturedRef.current + interim).trim());
      }

      // Show listening status when user is speaking
      if (newFinal || interim) {
        setStatus("listening");
        statusRef.current = "listening";
      }

      // Reset silence timer
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }

      // After user pauses for 2.5s, auto-submit their accumulated speech
      if (capturedRef.current.trim()) {
        silenceTimerRef.current = setTimeout(() => {
          if (statusRef.current === "processing" || statusRef.current === "ai_speaking") return;
          const text = capturedRef.current.trim();
          if (!text) return;
          capturedRef.current = "";
          setLiveCapture("");
          if (sendRef.current) sendRef.current(text);
        }, 2500);
      }
    };

    // Auto-restart if recognition stops (browser may stop on long silence)
    r.onend = () => {
      processedUpTo = 0;
      if (phaseRef.current === "live") {
        setTimeout(() => { try { r.start(); } catch {} }, 300);
      }
    };

    r.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") return;
      processedUpTo = 0;
      if (phaseRef.current === "live") {
        setTimeout(() => { try { r.start(); } catch {} }, 500);
      }
    };

    try { r.start(); } catch {}
    recognitionRef.current = r;
  }, []);

  /* send candidate turn */
  const doSendAnswer = useCallback(async (text: string) => {
    if (!token || !text.trim()) return;
    stopSpeaking();
    setStatus("processing");
    statusRef.current = "processing";
    try {
      const res = await fetch(`${API}/public/interview/${token}/turn`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const d = await res.json();
      if (!d.success) { setStatus("idle"); statusRef.current = "idle"; return; }
      const msg: string = d.data.message;
      setAiMsg(msg);
      if (d.data.isComplete) {
        setStatus("ai_speaking");
        statusRef.current = "ai_speaking";
        capturedRef.current = "";
        setLiveCapture("");
        await playAiSpeech(msg, async () => {
          setStatus("idle");
          statusRef.current = "idle";
          phaseRef.current = "done";
          if (recorderRef.current?.state === "recording") recorderRef.current.stop();
          recognitionRef.current?.stop();
          if (token) await uploadRecording(token);
          stopCamera();
          setPhase("done");
        });
      } else {
        setStatus("ai_speaking");
        statusRef.current = "ai_speaking";
        capturedRef.current = "";
        setLiveCapture("");
        await playAiSpeech(msg, () => {
          // Cooldown: keep ignoring mic for 2s after AI stops to let speaker echo die
          capturedRef.current = "";
          setLiveCapture("");
          // Restart recognition to flush any buffered echo transcripts
          if (recognitionRef.current && phaseRef.current === "live") {
            try { recognitionRef.current.stop(); } catch {}
          }
          setTimeout(() => {
            capturedRef.current = "";
            setLiveCapture("");
            setStatus("idle");
            statusRef.current = "idle";
          }, 2000);
        });
      }
    } catch { setStatus("idle"); statusRef.current = "idle"; }
  }, [token, stopCamera, uploadRecording]);

  useEffect(() => { sendRef.current = doSendAnswer; }, [doSendAnswer]);

  /* start interview */
  const beginInterview = useCallback(async () => {
    if (!token) return;
    setPhase("starting");
    phaseRef.current = "starting";
    const ok = await startCamera({ startRecorder: true });
    if (!ok) { setErrorMsg("Camera/microphone access denied. Please allow access and try again."); setPhase("error"); return; }
    try {
      const res = await fetch(`${API}/public/interview/${token}/start`, { method: "POST" });
      const d = await res.json();
      if (!d.success) { setErrorMsg(d.error || "Failed to start."); setPhase("error"); return; }
      const msg: string = d.data.message;
      setAiMsg(msg);
      setPhase("live");
      phaseRef.current = "live";
      setStatus("ai_speaking");
      statusRef.current = "ai_speaking";
      // Start continuous listening immediately — mic is always open
      startContinuousListening();
      await playAiSpeech(msg, () => {
        // Cooldown: keep ignoring mic for 2s after AI stops to let speaker echo die
        capturedRef.current = "";
        setLiveCapture("");
        if (recognitionRef.current && phaseRef.current === "live") {
          try { recognitionRef.current.stop(); } catch {}
        }
        setTimeout(() => {
          capturedRef.current = "";
          setLiveCapture("");
          setStatus("idle");
          statusRef.current = "idle";
        }, 2000);
      });
    } catch { setErrorMsg("Failed to start interview."); setPhase("error"); }
  }, [token, startCamera, startContinuousListening, playAiSpeech]);

  const startCountdownThenBegin = useCallback(() => {
    setCountdown(10);
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      beginInterview();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, beginInterview]);

  const openTour = useCallback(async () => {
    setTourStep(0);
    setTourTargetMissing(false);
    setPhase("tour");
    phaseRef.current = "tour";
    // Try to start camera preview during tour so the user can verify devices.
    // Do NOT start recording or call backend start.
    await startCamera({ startRecorder: false });
  }, [startCamera]);

  const closeTour = useCallback(() => {
    setPhase("lobby");
    phaseRef.current = "lobby";
    setTourStep(0);
    setTourSpot(null);
    setTourTargetMissing(false);
  }, []);

  const finishTourAndStartCountdown = useCallback(() => {
    try { window.localStorage.setItem("umuranga_interview_tour_v1", "1"); } catch {}
    setTourSpot(null);
    setTourTargetMissing(false);
    startCountdownThenBegin();
  }, [startCountdownThenBegin]);

  const computeTourSpot = useCallback(() => {
    if (typeof window === "undefined") return;
    if (phase !== "tour") return;
    const step = TOUR_STEPS[Math.min(tourStep, TOUR_STEPS.length - 1)];
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setTourTargetMissing(true);
      setTourSpot(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 10;
    setTourTargetMissing(false);
    setTourSpot({
      x: Math.max(0, r.left - pad),
      y: Math.max(0, r.top - pad),
      w: Math.min(window.innerWidth, r.width + pad * 2),
      h: Math.min(window.innerHeight, r.height + pad * 2),
    });
  }, [phase, tourStep]);

  useEffect(() => {
    computeTourSpot();
    if (typeof window === "undefined") return;
    const onResize = () => computeTourSpot();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [computeTourSpot]);

  /* end interview manually */
  const endInterview = useCallback(async () => {
    stopSpeaking();
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    phaseRef.current = "done"; // prevent recognition auto-restart
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setStatus("idle");
    statusRef.current = "idle";
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
                <li>Captions are optional — turn them on if you want to read what the AI says</li>
                <li>You can end the interview at any time using the controls</li>
              </ul>
            </div>
            <div style={{ background: C.gray50, borderRadius: 10, padding: "11px 13px", border: `1px solid ${C.gray200}`, marginBottom: 18 }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.6rem", fontWeight: 800, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.07em" }}>Audio quality</p>
              <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: C.gray900, lineHeight: 1.55 }}>
                Use headphones if possible. It prevents the mic from picking up the AI voice.
              </p>
              <p style={{ margin: "8px 0 0", fontSize: "0.74rem", color: C.gray600, lineHeight: 1.5 }}>
                Speech recognition is set to English and we enable echo cancellation automatically.
              </p>
            </div>
            {!hasSpeech && (
              <div style={{ background: "#FEF9C3", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: "0.78rem", color: "#92400e" }}>
                Voice recognition works best in Chrome or Edge. Please use one of those browsers.
              </div>
            )}
            {mediaHint && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: "0.78rem", color: "#991B1B" }}>
                {mediaHint}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={() => {
                  openTour();
                }}
                style={{ gridColumn: "1 / span 2", padding: "14px", borderRadius: 12, background: C.primary, color: C.white, border: "none", fontSize: "0.925rem", fontWeight: 800, cursor: "pointer" }}
              >
                Begin interview
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Countdown overlay ── */}
      {countdown !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 650, background: "radial-gradient(1200px 600px at 50% 40%, rgba(43,114,240,0.22), rgba(15,23,42,0.72))", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "min(520px, 100%)", background: "rgba(255,255,255,0.92)", borderRadius: 22, border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 24px 90px rgba(0,0,0,0.35)", padding: "26px 22px", textAlign: "center", backdropFilter: "blur(10px)" }}>
            <p style={{ margin: "0 0 10px", fontSize: "0.72rem", fontWeight: 900, color: C.primary, letterSpacing: "0.12em" }}>GET READY</p>
            <p style={{ margin: "0 0 18px", fontSize: "1.05rem", fontWeight: 900, color: C.gray900 }}>Interview starts in</p>
            <div style={{ fontSize: "4.2rem", fontWeight: 950, lineHeight: 1, color: C.primary, letterSpacing: "-0.06em" }}>
              {countdown}
            </div>
            <p style={{ margin: "12px 0 0", fontSize: "0.9rem", color: C.gray700, lineHeight: 1.6 }}>
              Find a quiet spot, check your mic, and take a breath.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                onClick={() => setCountdown(null)}
                style={{ flex: 1, padding: "12px", borderRadius: 12, background: C.white, border: `1px solid ${C.gray200}`, color: C.gray700, fontSize: "0.9rem", fontWeight: 900, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => setCountdown(1)}
                style={{ flex: 1, padding: "12px", borderRadius: 12, background: C.primary, border: "none", color: C.white, fontSize: "0.9rem", fontWeight: 950, cursor: "pointer" }}
              >
                Start now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ══════════ TOUR + LIVE INTERVIEW ══════════ */
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

      {/* ── Tour spotlight overlay ── */}
      {phase === "tour" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 650, pointerEvents: "auto" }}>
          {/* dim layer */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(2,6,23,0.62)" }} />

          {/* spotlight ring */}
          {tourSpot && (
            <div
              style={{
                position: "absolute",
                left: tourSpot.x,
                top: tourSpot.y,
                width: tourSpot.w,
                height: tourSpot.h,
                borderRadius: 18,
                boxShadow: "0 0 0 9999px rgba(2,6,23,0.62), 0 10px 40px rgba(0,0,0,0.35)",
                outline: `2px solid rgba(255,255,255,0.18)`,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: -10,
                  borderRadius: 22,
                  border: `2px solid ${C.primary}`,
                  boxShadow: `0 0 0 6px rgba(43,114,240,0.18)`,
                }}
              />
            </div>
          )}

          {/* tooltip card */}
          {(() => {
            const step = TOUR_STEPS[Math.min(tourStep, TOUR_STEPS.length - 1)];
            const total = TOUR_STEPS.length;
            const cardW = 380;
            const margin = 14;
            const anchor = tourSpot
              ? { x: tourSpot.x + tourSpot.w / 2, y: tourSpot.y + tourSpot.h / 2, w: tourSpot.w, h: tourSpot.h }
              : { x: window.innerWidth / 2, y: window.innerHeight / 2, w: 0, h: 0 };

            // naive placement based on viewport; keep inside screen
            let left = Math.min(window.innerWidth - cardW - margin, Math.max(margin, anchor.x - cardW / 2));
            let top = margin;
            const desired = step.placement || "bottom";
            if (desired === "bottom") top = Math.min(window.innerHeight - 210 - margin, anchor.y + anchor.h / 2 + 18);
            if (desired === "top") top = Math.max(margin, anchor.y - anchor.h / 2 - 18 - 210);
            if (desired === "left") {
              left = Math.max(margin, anchor.x - anchor.w / 2 - 18 - cardW);
              top = Math.min(window.innerHeight - 210 - margin, Math.max(margin, anchor.y - 105));
            }
            if (desired === "right") {
              left = Math.min(window.innerWidth - cardW - margin, anchor.x + anchor.w / 2 + 18);
              top = Math.min(window.innerHeight - 210 - margin, Math.max(margin, anchor.y - 105));
            }

            return (
              <div style={{ position: "absolute", left, top, width: cardW, maxWidth: "calc(100vw - 28px)" }}>
                <div style={{ background: "rgba(255,255,255,0.96)", border: "1px solid rgba(255,255,255,0.55)", borderRadius: 16, padding: "16px 16px 14px", boxShadow: "0 18px 70px rgba(0,0,0,0.35)", backdropFilter: "blur(10px)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 900, color: C.primary, letterSpacing: "0.12em" }}>
                      TOUR • STEP {Math.min(tourStep + 1, total)} / {total}
                    </p>
                    <button
                      onClick={() => {
                        try { window.localStorage.setItem("umuranga_interview_tour_v1", "1"); } catch {}
                        closeTour();
                      }}
                      style={{ background: "transparent", border: "none", color: C.gray500, fontSize: "0.8rem", fontWeight: 900, cursor: "pointer" }}
                    >
                      Skip
                    </button>
                  </div>

                  <h3 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 950, color: C.gray900 }}>{step.title}</h3>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: C.gray700, lineHeight: 1.65 }}>{step.body}</p>

                  {tourTargetMissing && (
                    <div style={{ marginTop: 10, fontSize: "0.78rem", color: "#92400e", background: "#FEF9C3", border: "1px solid #FDE68A", borderRadius: 10, padding: "8px 10px" }}>
                      This feature isn’t visible right now. Resize your window or continue to the next step.
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button
                      onClick={() => setTourStep((n) => Math.max(0, n - 1))}
                      disabled={tourStep === 0}
                      style={{
                        flex: 1,
                        padding: "10px 10px",
                        borderRadius: 12,
                        background: tourStep === 0 ? "rgba(15,23,42,0.04)" : "rgba(255,255,255,0.9)",
                        border: "1px solid rgba(15,23,42,0.12)",
                        color: C.gray700,
                        fontSize: "0.88rem",
                        fontWeight: 900,
                        cursor: tourStep === 0 ? "not-allowed" : "pointer",
                        opacity: tourStep === 0 ? 0.7 : 1,
                      }}
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        const last = tourStep >= total - 1;
                        if (!last) { setTourStep((n) => Math.min(total - 1, n + 1)); return; }
                        finishTourAndStartCountdown();
                      }}
                      style={{ flex: 1.2, padding: "10px 10px", borderRadius: 12, background: C.primary, border: "none", color: C.white, fontSize: "0.9rem", fontWeight: 950, cursor: "pointer" }}
                    >
                      {tourStep >= total - 1 ? "Start interview" : "Next"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Countdown overlay (shared) ── */}
      {countdown !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 700, background: "radial-gradient(1200px 600px at 50% 40%, rgba(43,114,240,0.22), rgba(15,23,42,0.72))", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "min(520px, 100%)", background: "rgba(255,255,255,0.92)", borderRadius: 22, border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 24px 90px rgba(0,0,0,0.35)", padding: "26px 22px", textAlign: "center", backdropFilter: "blur(10px)" }}>
            <p style={{ margin: "0 0 10px", fontSize: "0.72rem", fontWeight: 900, color: C.primary, letterSpacing: "0.12em" }}>GET READY</p>
            <p style={{ margin: "0 0 18px", fontSize: "1.05rem", fontWeight: 900, color: C.gray900 }}>Interview starts in</p>
            <div style={{ fontSize: "4.2rem", fontWeight: 950, lineHeight: 1, color: C.primary, letterSpacing: "-0.06em" }}>
              {countdown}
            </div>
            <p style={{ margin: "12px 0 0", fontSize: "0.9rem", color: C.gray700, lineHeight: 1.6 }}>
              Find a quiet spot, check your mic, and take a breath.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                onClick={() => setCountdown(null)}
                style={{ flex: 1, padding: "12px", borderRadius: 12, background: C.white, border: `1px solid ${C.gray200}`, color: C.gray700, fontSize: "0.9rem", fontWeight: 900, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => setCountdown(1)}
                style={{ flex: 1, padding: "12px", borderRadius: 12, background: C.primary, border: "none", color: C.white, fontSize: "0.9rem", fontWeight: 950, cursor: "pointer" }}
              >
                Start now
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Main area — two-panel split ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "stretch", padding: "20px", gap: 16, maxWidth: 1280, margin: "0 auto", width: "100%" }}>

        {/* ── Left: Candidate camera — wide horizontal rectangle ── */}
        <div style={{
          flex: "3 1 0",       /* takes 3× the space of the AI panel */
          minWidth: 0,
          borderRadius: 20,
          overflow: "visible", /* allow controls to overflow if needed */
          background: C.gray900,
          border: `2px solid ${status === "listening" ? C.green : "transparent"}`,
          boxShadow: status === "listening" ? `0 0 0 4px ${C.green50}, 0 4px 32px rgba(0,0,0,0.18)` : "0 4px 32px rgba(0,0,0,0.18)",
          transition: "border-color 0.3s, box-shadow 0.3s",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          aspectRatio: "16/7",
          alignSelf: "flex-start",
        }}>
          {/* inner clip so video stays inside rounded corners */}
          <div data-tour="you-video" style={{ position: "absolute", inset: 0, borderRadius: 20, overflow: "hidden" }}>
            {/* Video feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%", height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
                display: cameraOn ? "block" : "none",
              }}
            />

            {/* Camera off placeholder */}
            {!cameraOn && (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                {Ic.cameraOff(C.gray500)}
                <span style={{ color: C.gray500, fontSize: "0.78rem", fontWeight: 600 }}>Camera off</span>
              </div>
            )}

            {/* YOU label — top left */}
            <div style={{ position: "absolute", top: 14, left: 16, zIndex: 10 }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.9)", background: "rgba(0,0,0,0.45)", padding: "3px 10px", borderRadius: 8, backdropFilter: "blur(4px)" }}>YOU</span>
            </div>

            {/* REC badge — top right */}
            <div style={{ position: "absolute", top: 14, right: 16, zIndex: 10, display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.45)", padding: "3px 10px", borderRadius: 8, backdropFilter: "blur(4px)" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.red, animation: "pulse 2s ease-in-out infinite" }} />
              <span style={{ color: C.white, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em" }}>REC</span>
            </div>

            {/* Live speech preview */}
            {status === "listening" && liveCapture && (
              <div style={{
                position: "absolute", bottom: 72, left: 16, right: 16, zIndex: 10,
                background: "rgba(34,197,94,0.18)",
                border: `1px solid ${C.green200}`,
                backdropFilter: "blur(6px)",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: "0.82rem",
                color: C.white,
                lineHeight: 1.5,
              }}>
                {liveCapture}
              </div>
            )}

            {/* ── Controls — bottom center, no background ── */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20,
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              gap: 28, paddingBottom: 16,
              background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)",
              paddingTop: 32,
            }}>
              {/* Mic — always on indicator */}
              <div
                data-tour="mic-indicator"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
              >
                {status === "listening" ? Ic.mic(C.green) : Ic.mic("rgba(255,255,255,0.9)")}
                <span style={{ fontSize: "0.58rem", fontWeight: 700, color: status === "listening" ? C.green : "rgba(255,255,255,0.75)", letterSpacing: "0.04em" }}>
                  {status === "listening" ? "Listening…" : "Mic on"}
                </span>
              </div>

              {/* Captions */}
              <button
                data-tour="captions-toggle"
                onClick={() => setCaptionsOn(v => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: captionsOn ? 1 : 0.5 }}
              >
                {Ic.captions(captionsOn ? C.white : "rgba(255,255,255,0.8)")}
                <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.04em" }}>Captions</span>
              </button>

              {/* Camera */}
              <button
                data-tour="camera-toggle"
                onClick={toggleCameraTrack}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: cameraOn ? 1 : 0.5 }}
              >
                {cameraOn ? Ic.camera("rgba(255,255,255,0.9)") : Ic.cameraOff("rgba(255,255,255,0.7)")}
                <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.04em" }}>{cameraOn ? "Camera" : "Camera off"}</span>
              </button>

              {/* End interview */}
              <button
                data-tour="end-button"
                onClick={() => setShowEndConfirm(true)}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
              >
                {Ic.phone(C.red)}
                <span style={{ fontSize: "0.58rem", fontWeight: 700, color: C.red, letterSpacing: "0.04em" }}>End</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: AI panel — narrower ── */}
        <div style={{
          position: "relative",
          flex: "1 1 0",
          minWidth: 260,
          maxWidth: 340,
          background: C.white,
          borderRadius: 20,
          border: `1px solid ${C.gray200}`,
          boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
          padding: "28px 24px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          alignSelf: "flex-start",
        }}>
          <div data-tour="ai-panel" style={{ position: "absolute", inset: 0, borderRadius: 20 }} />
          {/* AI avatar */}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <div style={{
              width: 180, height: 180,
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
                <img src="/talk.gif" alt="AI speaking" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: C.primary50 }}>
                  <svg width={72} height={72} viewBox="0 0 24 24" fill="none" stroke={C.primary200} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx={12} cy={7} r={4}/>
                  </svg>
                </div>
              )}
            </div>
            <div style={{
              position: "absolute", bottom: 8, right: 8,
              width: 18, height: 18, borderRadius: "50%",
              border: "3px solid white",
              background: status === "ai_speaking" ? C.primary : status === "listening" ? C.green : status === "processing" ? C.amber : C.gray300,
              animation: status !== "idle" ? "pulse 1.5s ease-in-out infinite" : "none",
            }} />
          </div>

          <p style={{ margin: "0 0 4px", fontSize: "0.85rem", fontWeight: 700, color: C.gray700 }}>AI Interviewer</p>

          {/* Speaking / processing wave */}
          {(status === "ai_speaking" || status === "processing") && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 22, marginBottom: 4, justifyContent: "center" }}>
              {[1,2,3,4,5].map(n => <div key={n} className="wv" style={{ background: status === "ai_speaking" ? C.primary : C.gray300 }} />)}
            </div>
          )}

          <p style={{
            margin: "4px 0 18px",
            fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em",
            color: status === "ai_speaking" ? C.primary : status === "listening" ? C.green : status === "processing" ? C.amber : C.gray400,
          }}>
            {status === "ai_speaking" ? "Speaking…" : status === "listening" ? "Listening — speak now" : status === "processing" ? "Processing…" : "Waiting"}
          </p>

          {/* Captions */}
          {captionsOn && aiMsg && (
            <div style={{
              width: "100%",
              background: C.gray900, color: C.white,
              borderRadius: 12, padding: "14px 18px",
              fontSize: "0.875rem", lineHeight: 1.7, textAlign: "left",
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)", marginBottom: 4,
            }}>
              {aiMsg}
            </div>
          )}

          {/* Mic always on — no manual trigger needed */}
        </div>

      </div>

      {/* Start CTA (only in tour mode) */}
      {phase === "tour" && (
        <div data-tour="start-cta" style={{ position: "fixed", bottom: 18, left: 18, right: 18, zIndex: 640, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ width: "min(980px, 100%)", display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 16, padding: "12px 14px", boxShadow: "0 14px 50px rgba(0,0,0,0.25)", backdropFilter: "blur(10px)", pointerEvents: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 900, color: C.primary, letterSpacing: "0.12em" }}>READY?</span>
              <span style={{ fontSize: "0.9rem", fontWeight: 900, color: C.gray900 }}>When you finish the tour, you’ll get a 10‑second countdown.</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={closeTour}
                style={{ padding: "10px 12px", borderRadius: 12, background: C.white, border: `1px solid ${C.gray200}`, color: C.gray700, fontSize: "0.9rem", fontWeight: 900, cursor: "pointer" }}
              >
                Back to intro
              </button>
              <button
                onClick={finishTourAndStartCountdown}
                style={{ padding: "10px 12px", borderRadius: 12, background: C.primary, border: "none", color: C.white, fontSize: "0.9rem", fontWeight: 950, cursor: "pointer" }}
              >
                Start interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
