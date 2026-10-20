import { useEffect, useState } from "react";
import { Link } from "react-router";
import { isMockMode, onMockModeChange } from "../api";
import { Logo } from "./common";

export function Footer() {
  const [mock, setMock] = useState(isMockMode());
  useEffect(() => onMockModeChange(setMock), []);
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Logo />
          <p className="muted">Stoneware, linen and small-batch goods for the table and the home. Made in small runs and packed without plastic.</p>
        </div>
        <div className="footer__cols">
          <div>
            <h4>Shop</h4>
            <Link to="/shop">All pieces</Link>
            <Link to="/shop?type=Tableware">Tableware</Link>
            <Link to="/shop?type=Textiles">Textiles</Link>
          </div>
          <div>
            <h4>Help</h4>
            <Link to="/track">Track an order</Link>
            <Link to="/demo">How Ava works</Link>
            <span className="muted">Returns within 30 days</span>
          </div>
        </div>
      </div>
      <div className="container footer__base">
        <span>© 2026 Saba Studio. A hackathon demo store, no real orders are shipped.</span>
        <span className="footer__powered">
          Support decisions by <strong>NACE Drex</strong>
          {mock && <span className="pill pill--warn">Mock data</span>}
        </span>
      </div>
    </footer>
  );
}
