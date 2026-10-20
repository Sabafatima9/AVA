import { ChatCircleDots, List, Tote, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { useCart } from "../state/cart";
import { useChat } from "../state/chat";
import { Logo } from "./common";

const LINKS = [
  { to: "/shop", label: "Shop" },
  { to: "/track", label: "Track order" },
  { to: "/demo", label: "Live demo" },
];

export function Header() {
  const { count, setDrawerOpen } = useCart();
  const { openChat } = useChat();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="nav-wrap">
      <nav className="nav" aria-label="Main">
        <Link to="/" className="nav__brand" aria-label="Saba home">
          <Logo />
        </Link>
        <div className="nav__links">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav__link ${isActive ? "is-active" : ""}`}>
              {l.label}
              {l.to === "/demo" && <span className="nav__live" aria-hidden="true" />}
            </NavLink>
          ))}
        </div>
        <div className="nav__actions">
          <button type="button" className="nav__ava" onClick={() => openChat()}>
            <ChatCircleDots size={18} />
            <span>Ask Ava</span>
          </button>
          <button type="button" className="icon-btn nav__cart" onClick={() => setDrawerOpen(true)} aria-label={`Open bag, ${count} items`}>
            <Tote size={20} />
            {count > 0 && <span className="nav__count">{count}</span>}
          </button>
          <button
            type="button"
            className={`icon-btn nav__burger ${menuOpen ? "is-open" : ""}`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={20} /> : <List size={20} />}
          </button>
        </div>
      </nav>
      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        {[{ to: "/", label: "Home" }, ...LINKS].map((l, i) => (
          <Link key={l.to} to={l.to} className="mobile-menu__link" style={{ transitionDelay: `${80 + i * 50}ms` }} tabIndex={menuOpen ? 0 : -1}>
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
