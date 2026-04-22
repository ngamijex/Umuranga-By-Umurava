import Link from "next/link";
import Image from "next/image";
import { Twitter, Linkedin, Github, Phone, Mail } from "lucide-react";

const footerLinks: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "Features",     href: "#features"     },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing",      href: "#pricing"       },
    { label: "Security",     href: "#security"      },
  ],
  Company: [
    { label: "About Us", href: "/about"   },
    { label: "Careers",  href: "/careers" },
    { label: "Blog",     href: "/blog"    },
    { label: "Contact",  href: "/contact" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs"      },
    { label: "API Reference",  href: "/api-docs"  },
    { label: "Changelog",      href: "/changelog" },
    { label: "Status",         href: "/status"    },
  ],
};

const socials = [
  { Icon: Twitter,  href: "#" },
  { Icon: Linkedin, href: "#" },
  { Icon: Github,   href: "#" },
  { Icon: Mail,     href: "#" },
];

export default function Footer() {
  return (
    <footer style={{ background: "#2b72f0" }}>
      <style>{`
        .ft-subscribe-input::placeholder { color: rgba(255,255,255,0.5); }
        .ft-subscribe-input:focus { outline: none; border-color: rgba(255,255,255,0.6) !important; }
        .ft-subscribe-btn:hover { background: #1a5cd4 !important; }
        .ft-link:hover { color: #fff !important; }
        .ft-social:hover { background: rgba(255,255,255,0.3) !important; }
      `}</style>

      {/* ── Blue footer body ── */}
      <div style={{ background:"#2b72f0" }}>
        <div style={{ maxWidth:"1200px", margin:"0 auto", padding:"240px 24px 40px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1.3fr", gap:"40px" }}>

            {/* Brand */}
            <div>
              <Link href="/">
                <Image
                  src="/logo.svg"
                  alt="Umuranga"
                  width={500}
                  height={130}
                  style={{ height:"130px", width:"auto", objectFit:"contain", filter:"brightness(0) invert(1)" }}
                />
              </Link>
              <p style={{ color:"rgba(191,219,255,0.75)", fontSize:"0.84rem", lineHeight:1.7, maxWidth:"240px", marginTop:"8px" }}>
                AI-powered talent screening for hiring top African digital talent — fast, fair, and explainable.
              </p>
              <div style={{ display:"flex", gap:"10px", marginTop:"18px" }}>
                {socials.map(({ Icon, href }, i) => (
                  <a key={i} href={href} className="ft-social" style={{ width:"36px", height:"36px", borderRadius:"50%", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", textDecoration:"none", transition:"all 0.2s" }}>
                    <Icon style={{ width:"15px", height:"15px" }} />
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([section, links]) => (
              <div key={section}>
                <h4 style={{ fontWeight:700, color:"#fff", fontSize:"0.82rem", marginBottom:"16px" }}>
                  {section}
                </h4>
                <ul style={{ listStyle:"none", margin:0, padding:0, display:"flex", flexDirection:"column", gap:"10px" }}>
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="ft-link" style={{ color:"rgba(191,219,255,0.7)", fontSize:"0.85rem", textDecoration:"none", transition:"color 0.2s" }}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Contact Us */}
            <div>
              <h4 style={{ fontWeight:700, color:"#fff", fontSize:"0.82rem", marginBottom:"16px" }}>Contact Us</h4>
              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                <a href="tel:+250780000000" style={{ display:"flex", alignItems:"center", gap:"10px", color:"rgba(191,219,255,0.8)", fontSize:"0.85rem", textDecoration:"none" }}>
                  <span style={{ width:"30px", height:"30px", borderRadius:"8px", background:"rgba(255,255,255,0.18)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Phone style={{ width:"14px", height:"14px", color:"#fff" }} />
                  </span>
                  +250 780 000 000
                </a>
                <a href="mailto:hello@umuranga.rw" style={{ display:"flex", alignItems:"center", gap:"10px", color:"rgba(191,219,255,0.8)", fontSize:"0.85rem", textDecoration:"none" }}>
                  <span style={{ width:"30px", height:"30px", borderRadius:"8px", background:"rgba(255,255,255,0.18)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Mail style={{ width:"14px", height:"14px", color:"#fff" }} />
                  </span>
                  hello@umuranga.rw
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ marginTop:"40px", paddingTop:"20px", borderTop:"1px solid rgba(255,255,255,0.15)", display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:"10px" }}>
            <p style={{ color:"rgba(191,219,255,0.45)", fontSize:"0.78rem" }}>© 2026 Umuranga. Built for the Umurava Hackathon. All rights reserved.</p>
            <div style={{ display:"flex", gap:"20px" }}>
              {["Privacy Policy","Terms of Use","Legal","Site Map"].map(label => (
                <Link key={label} href="#" className="ft-link" style={{ color:"rgba(191,219,255,0.45)", fontSize:"0.78rem", textDecoration:"none", transition:"color 0.2s" }}>{label}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
