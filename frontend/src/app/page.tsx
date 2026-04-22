import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import HRPainSection from "@/components/sections/HRPainSection";
import WhyUmurangaSection from "@/components/sections/WhyUmurangaSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import KeyFeaturesSection from "@/components/sections/KeyFeaturesSection";


/* ─── Page ─────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>

        {/* ── HERO ──────────────────────────────────────────── */}
        <HeroSection />
        <HRPainSection />

        {/* ── WHY UMURANGA ──────────────────────────────────── */}
        <WhyUmurangaSection />

        {/* ── HOW IT WORKS ──────────────────────────────────── */}
        <HowItWorksSection />

        {/* ── KEY FEATURES ───────────────────────────────────── */}
        <KeyFeaturesSection />

        {/* ── WHITE GAP + FLOATING CTA ───────────────────────── */}
        <div style={{ background:"#ffffff", padding:"28px 24px 28px", position:"relative", zIndex:10, overflow:"visible" }}>
          <div style={{
            maxWidth:"1100px", margin:"0 auto",
            background:"#ffffff",
            borderRadius:"24px",
            padding:"44px 56px 44px 320px",
            position:"relative",
            overflow:"visible",
            minHeight:"200px",
            display:"flex",
            alignItems:"center",
            transform:"translateY(50%)",
            boxShadow:"0 24px 80px rgba(43,114,240,0.18), 0 4px 20px rgba(0,0,0,0.08)",
            border:"1px solid #e8f0fe",
          }}>
            {/* hire.gif overflowing upward */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hire.gif" alt="" style={{ position:"absolute", bottom:0, left:"20px", height:"280px", width:"auto", objectFit:"contain", pointerEvents:"none" }} />

            {/* Sparkle dots */}
            <div style={{ position:"absolute", top:"28px", left:"260px", width:"8px",  height:"8px",  borderRadius:"50%", background:"rgba(43,114,240,0.3)" }} />
            <div style={{ position:"absolute", top:"52px", left:"285px", width:"5px",  height:"5px",  borderRadius:"50%", background:"rgba(43,114,240,0.2)" }} />
            <div style={{ position:"absolute", top:"38px", left:"300px", width:"6px",  height:"6px",  borderRadius:"50%", background:"rgba(43,114,240,0.25)" }} />

            <div style={{ flex:1 }}>
              <h2 style={{ color:"#111827", fontSize:"clamp(1.3rem,2.5vw,1.8rem)", fontWeight:800, lineHeight:1.25, margin:"0 0 8px" }}>
                Ready to hire smarter,<br />faster, and fairer?
              </h2>
              <p style={{ color:"#6b7280", fontSize:"0.88rem", margin:"0 0 20px" }}>
                Join 50+ organizations already using Umuranga. Get updates on new features.
              </p>
              <div style={{ display:"flex", gap:"8px", maxWidth:"400px" }}>
                <input type="email" placeholder="Enter your email" style={{ flex:1, padding:"10px 16px", borderRadius:"10px", border:"1.5px solid #e5e7eb", background:"#f9fafb", color:"#111827", fontSize:"0.875rem" }} />
                <button style={{ padding:"10px 22px", borderRadius:"10px", background:"#2b72f0", color:"#fff", fontWeight:700, fontSize:"0.875rem", border:"none", cursor:"pointer", whiteSpace:"nowrap" }}>
                  Get Started
                </button>
              </div>
              <p style={{ color:"#9ca3af", fontSize:"0.74rem", marginTop:"10px" }}>No credit card required. Unsubscribe at any time.</p>
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </>
  );
}
