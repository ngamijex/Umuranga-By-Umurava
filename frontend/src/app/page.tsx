import Link from "next/link";
import {
  Brain, Shield, Users, FileText, BarChart3,
  CheckCircle, ArrowRight, Star, Zap, Target, Globe,
  TrendingUp, Sparkles, ThumbsUp,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

/* ─── Data ─────────────────────────────────────────────── */

const partners = ["Cenfri", "Umurava", "CHARIS", "SBank", "AFD", "GIZ", "Andela", "Turing"];

const valueProps = [
  {
    icon: Brain,
    title: "AI-Powered Screening",
    desc: "Gemini 1.5 Pro evaluates each candidate against your job requirements — skills, experience, education — in seconds, not days.",
  },
  {
    icon: Shield,
    title: "Explainable Decisions",
    desc: "Every AI score comes with a full breakdown: what matched, what's missing, and why the candidate is recommended.",
  },
  {
    icon: Users,
    title: "Human in Control",
    desc: "AI assists — humans decide. Recruiters review, override, and approve every hiring decision with full context and reasoning.",
  },
];

const stats = [
  { number: "500+",  label: "Jobs Screened"        },
  { number: "10K+",  label: "Candidates Evaluated" },
  { number: "80%",   label: "Time Saved"           },
  { number: "95%",   label: "Accuracy Rate"        },
];

const coreFeatures = [
  {
    icon: FileText,
    title: "Smart Resume Parsing",
    desc: "Extracts structured data from PDF and Word resumes — skills, experience, education, certifications — with zero manual entry.",
  },
  {
    icon: BarChart3,
    title: "Configurable Scoring Engine",
    desc: "Set custom weights per job role. Technical skills 50%, culture fit 20% — you define what matters most.",
  },
  {
    icon: Target,
    title: "Bias Mitigation",
    desc: "PII like names, gender, and age are anonymized before AI evaluation — every candidate scored on merit alone.",
  },
  {
    icon: Globe,
    title: "Full Audit Trail",
    desc: "Every screening decision is logged with timestamps, scores, and AI reasoning — built-in compliance and accountability.",
  },
];

const steps = [
  {
    step: "01",
    icon: FileText,
    title: "Define the Job",
    desc: "Create a job post with required skills, experience, education, and set scoring weights for each criterion.",
  },
  {
    step: "02",
    icon: Users,
    title: "Candidates Apply",
    desc: "Candidates upload their resume and fill in their profile. Umuranga parses it automatically into structured data.",
  },
  {
    step: "03",
    icon: Brain,
    title: "AI Screens & Scores",
    desc: "Gemini AI analyzes each candidate against your requirements and generates a score with a full explanation.",
  },
  {
    step: "04",
    icon: ThumbsUp,
    title: "Review & Hire",
    desc: "Recruiters review the ranked shortlist with AI reasoning, make the final decision, and hire with confidence.",
  },
];

const reasons = [
  "Screen 100 candidates in the time it takes to read 5 resumes",
  "Every AI decision is explainable and fully auditable",
  "Reduce unconscious bias with anonymous evaluation",
  "Fully configurable scoring rubric per job role",
  "Built specifically for African digital talent pipelines",
  "Seamless integration with your existing hiring workflow",
];

const testimonials = [
  {
    name: "Amara Diallo",
    role: "Head of Talent, TechVentures Africa",
    text: "Umuranga cut our time-to-hire from 3 weeks to 4 days. The AI explanations are so clear our team trusts every shortlist it produces.",
    rating: 5,
  },
  {
    name: "Fatima Nkosi",
    role: "HR Director, Cenfri",
    text: "What I love most is the explainability. We can show candidates exactly why they scored the way they did — completely transparent.",
    rating: 5,
  },
  {
    name: "Kwame Mensah",
    role: "CTO, Andela",
    text: "The bias mitigation feature is a game-changer. We see more diverse shortlists and significantly better overall hire quality.",
    rating: 5,
  },
];

/* ─── Page ─────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>

        {/* ── HERO ──────────────────────────────────────────── */}
        <section className="section-gradient min-h-screen flex items-center relative overflow-hidden pt-16">
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#2b73f0]/25 rounded-full blur-[140px]" />
            <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-[#2b73f0]/15 rounded-full blur-[100px]" />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
                backgroundSize: "64px 64px",
              }}
            />
          </div>

          <div className="container-brand py-24 relative z-10 w-full">
            <div className="max-w-3xl mx-auto text-center">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2.5 mb-10">
                <Sparkles className="w-4 h-4 text-[#2b73f0]" />
                <span className="text-white/90 text-sm font-medium">Powered by Google Gemini AI</span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold text-white leading-[1.08] mb-6 tracking-tight">
                Hire Smarter with{" "}
                <span className="relative inline-block">
                  <span className="text-[#2b73f0]">AI Talent</span>
                  <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-[#2b73f0]/50 rounded-full" />
                </span>{" "}
                Screening
              </h1>

              {/* Subtitle */}
              <p className="text-blue-100/75 text-xl leading-relaxed mb-12 max-w-2xl mx-auto">
                Umuranga evaluates candidates instantly, explains every decision, and keeps humans in control —
                built for hiring African digital talent at scale.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-[#2b73f0] text-white font-semibold px-8 py-4 rounded-full text-base shadow-[0_4px_24px_rgba(43,115,240,0.55)] hover:bg-[#1a5fd4] hover:shadow-[0_6px_32px_rgba(43,115,240,0.65)] transition-all duration-200"
                >
                  Start Screening Free <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-4 rounded-full text-base hover:bg-white/10 transition-all duration-200"
                >
                  See How It Works
                </Link>
              </div>

              {/* Inline stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10">
                {stats.map(({ number, label }) => (
                  <div key={label} className="bg-white/5 hover:bg-white/10 transition-colors py-6 text-center">
                    <div className="text-3xl md:text-4xl font-extrabold text-white mb-1">{number}</div>
                    <div className="text-blue-100/55 text-sm font-medium">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── TRUSTED BY ────────────────────────────────────── */}
        <section className="bg-white py-12 border-b border-[#e2eaf6]">
          <div className="container-brand">
            <p className="text-center text-[#9ca3af] text-xs font-semibold uppercase tracking-[0.2em] mb-8">
              Trusted by leading organizations across Africa
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {partners.map((name) => (
                <span
                  key={name}
                  className="text-[#011b40]/25 font-extrabold text-lg tracking-tight hover:text-[#2b73f0] transition-colors cursor-default select-none"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── VALUE PROPS ───────────────────────────────────── */}
        <section id="features" className="section-light">
          <div className="container-brand">
            <div className="text-center mb-14">
              <p className="section-label">Why Umuranga</p>
              <h2 className="section-title">
                Recruit the Right Talent,<br />Faster Than Ever Before
              </h2>
              <p className="section-subtitle">
                AI that works with your team — not instead of it. Transparent, explainable, and always human-controlled.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {valueProps.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="card-brand p-8 group hover:border-[#2b73f0]/40 hover:-translate-y-1 transition-all duration-300">
                  <div className="icon-box mb-6 group-hover:bg-[#2b73f0] group-hover:text-white transition-all duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-[#011b40] font-bold text-xl mb-3">{title}</h3>
                  <p className="text-[#6b7280] leading-relaxed text-[0.95rem]">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS ─────────────────────────────────────────── */}
        <section id="stats" className="section-blue">
          <div className="container-brand">
            <div className="text-center mb-14">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Our Impact</p>
              <h2 className="section-title-white">
                Achievements &amp; Impact<br />by the Numbers
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map(({ number, label }) => (
                <div
                  key={label}
                  className="text-center p-7 bg-white/10 rounded-2xl border border-white/15 hover:bg-white/[0.16] transition-colors"
                >
                  <div className="text-4xl md:text-5xl font-extrabold text-white mb-2">{number}</div>
                  <div className="text-white/65 font-medium text-sm">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CORE FEATURES ─────────────────────────────────── */}
        <section className="section-white">
          <div className="container-brand">
            <div className="text-center mb-14">
              <p className="section-label">Core Capabilities</p>
              <h2 className="section-title">
                Building the Future of<br />Fair &amp; Fast Hiring
              </h2>
              <p className="section-subtitle">
                Every feature is designed to make hiring faster, fairer, and more defensible.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {coreFeatures.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex gap-5 p-7 rounded-2xl border border-transparent hover:border-[#e2eaf6] hover:bg-[#f6fcff] transition-all duration-300 group"
                >
                  <div className="icon-box shrink-0 group-hover:bg-[#2b73f0] group-hover:text-white transition-all duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-[#011b40] font-bold text-lg mb-2">{title}</h3>
                    <p className="text-[#6b7280] leading-relaxed text-sm">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────── */}
        <section id="how-it-works" className="section-light">
          <div className="container-brand">
            <div className="text-center mb-16">
              <p className="section-label">Simple Process</p>
              <h2 className="section-title">How It Works</h2>
              <p className="section-subtitle">From job post to shortlist in minutes — not weeks.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Connector line */}
              <div className="hidden lg:block absolute top-[3.5rem] left-[14%] right-[14%] h-px bg-[#e2eaf6] z-0" />

              {steps.map(({ step, icon: Icon, title, desc }) => (
                <div key={step} className="relative z-10 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#2b73f0] flex items-center justify-center mb-5 shadow-card-md">
                    <Icon className="w-7 h-7 text-[#2b73f0]" />
                  </div>
                  <div className="text-[#2b73f0] font-black text-[10px] tracking-[0.2em] mb-2">STEP {step}</div>
                  <h3 className="text-[#011b40] font-bold text-lg mb-2">{title}</h3>
                  <p className="text-[#6b7280] text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-14">
              <Link href="/login" className="btn-primary text-base px-8 py-4">
                Get Started Today <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── WHY CHOOSE ────────────────────────────────────── */}
        <section className="bg-[#011b40] py-16 md:py-24">
          <div className="container-brand">
            <div className="grid md:grid-cols-2 gap-16 items-center">

              {/* Left */}
              <div>
                <p className="text-[#2b73f0] text-xs font-semibold uppercase tracking-[0.2em] mb-4">
                  Why Companies Choose Umuranga
                </p>
                <h2 className="section-title-white mb-8 text-4xl">
                  Your AI-Powered Talent<br />Marketplace Platform
                </h2>
                <ul className="space-y-4">
                  {reasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#2b73f0] flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-blue-100/75 leading-relaxed text-[0.95rem]">{reason}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="btn-primary mt-10 inline-flex text-base px-8 py-4">
                  Try Umuranga Free <ArrowRight className="w-5 h-5" />
                </Link>
              </div>

              {/* Right — visual orb */}
              <div className="relative flex items-center justify-center">
                <div className="w-72 h-72 rounded-full bg-[#2b73f0]/15 flex items-center justify-center">
                  <div className="w-52 h-52 rounded-full bg-[#2b73f0]/25 flex items-center justify-center">
                    <div className="w-36 h-36 rounded-full bg-[#2b73f0] flex items-center justify-center shadow-[0_0_80px_rgba(43,115,240,0.6)]">
                      <Brain className="w-16 h-16 text-white" />
                    </div>
                  </div>
                </div>
                {/* Floating cards */}
                <div className="absolute top-4 -right-2 md:right-0 card-brand px-4 py-3 shadow-card-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <span className="text-[#011b40] text-xs font-bold">AI Score: 94 / 100</span>
                  </div>
                </div>
                <div className="absolute bottom-8 -left-2 md:left-0 card-brand px-4 py-3 shadow-card-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#2b73f0]" />
                    <span className="text-[#011b40] text-xs font-bold">Top 3% Candidate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ──────────────────────────────────── */}
        <section id="testimonials" className="section-white">
          <div className="container-brand">
            <div className="text-center mb-14">
              <p className="section-label">Testimonials</p>
              <h2 className="section-title">What Our Users Say</h2>
              <p className="section-subtitle">
                Trusted by HR teams, recruiters, and companies across Africa.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map(({ name, role, text, rating }) => (
                <div key={name} className="card-brand p-8 hover:border-[#2b73f0]/40 hover:-translate-y-1 transition-all duration-300">
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-[#374151] leading-relaxed mb-6 text-sm italic">"{text}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-[#e2eaf6]">
                    <div className="w-10 h-10 rounded-full bg-[#2b73f0] flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="font-bold text-[#011b40] text-sm">{name}</div>
                      <div className="text-[#9ca3af] text-xs">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ────────────────────────────────────── */}
        <section className="section-gradient relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#2b73f0]/20 rounded-full blur-[120px]" />
          </div>
          <div className="container-brand text-center relative z-10">
            <div className="max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-8">
                <Zap className="w-4 h-4 text-[#2b73f0]" />
                <span className="text-white/85 text-sm font-medium">Get Started Today</span>
              </div>
              <h2 className="section-title-white mb-6 text-4xl md:text-5xl">
                Ready to Transform<br />Your Hiring?
              </h2>
              <p className="text-blue-100/65 text-lg mb-10 leading-relaxed">
                Join 50+ organizations already using Umuranga to hire smarter, faster, and fairer.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-[#2b73f0] text-white font-semibold px-8 py-4 rounded-full text-base shadow-[0_4px_24px_rgba(43,115,240,0.55)] hover:bg-[#1a5fd4] transition-all duration-200"
                >
                  Start for Free <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-4 rounded-full text-base hover:bg-white/10 transition-all duration-200"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
