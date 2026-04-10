import Link from "next/link";
import { Zap, Twitter, Linkedin, Github, Mail } from "lucide-react";

const footerLinks: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "Features",    href: "#features"     },
    { label: "How It Works",href: "#how-it-works" },
    { label: "Impact",      href: "#stats"         },
    { label: "Security",    href: "#security"      },
  ],
  Company: [
    { label: "About Us", href: "/about"   },
    { label: "Careers",  href: "/careers" },
    { label: "Blog",     href: "/blog"    },
    { label: "Contact",  href: "/contact" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs"      },
    { label: "API Reference", href: "/api-docs"  },
    { label: "Changelog",     href: "/changelog" },
    { label: "Status",        href: "/status"    },
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
    <footer className="bg-[#011b40] text-white">
      <div className="container-brand py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#2b73f0] flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">Umuranga</span>
            </Link>
            <p className="text-blue-100/60 text-sm leading-relaxed max-w-xs">
              AI-powered talent screening for hiring top African digital talent — fast, fair, and explainable.
              Built for the Umurava Hackathon.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {socials.map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:bg-[#2b73f0] hover:text-white transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="font-semibold text-white text-xs uppercase tracking-widest mb-5">
                {section}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-blue-100/50 hover:text-white text-sm transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-blue-100/40 text-sm">
            © 2026 Umuranga. Built for the Umurava Hackathon. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-blue-100/40 hover:text-white text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-blue-100/40 hover:text-white text-sm transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
