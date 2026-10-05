import Link from "next/link";
import { Mark } from "@/components/mark";

export function SiteNav() {
  return (
    <header className="nav">
      <div className="wrap">
        <Link href="/" className="lockup" aria-label="Casdey home">
          <Mark />
          Casdey
        </Link>
        <Link href="/analysis" className="nav-cta">Free analysis</Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        <span>© {new Date().getFullYear()} Casdey</span>
        <nav aria-label="Footer">
          <Link href="/privacy">Privacy</Link>
          <span>info@casdey.com</span>
        </nav>
      </div>
    </footer>
  );
}
