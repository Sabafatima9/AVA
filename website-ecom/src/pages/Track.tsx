import { MagnifyingGlass, ShieldCheck, Truck } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { IslandButton, ProductImage } from "../components/common";
import { useChat } from "../state/chat";

export function TrackPage() {
  const { verifyFromTrackPage, pending } = useChat();
  const [order, setOrder] = useState("");
  const [email, setEmail] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!order.trim() || !email.trim()) return;
    void verifyFromTrackPage(order, email);
  };

  return (
    <div className="container page track">
      <div className="track__copy">
        <h1 className="display h-xl rise">Track an order</h1>
        <p className="lede rise" style={{ ["--i" as string]: 1 }}>
          Enter your order number and the email you used. Ava will verify it's you and show where your order is. From there she can change or
          cancel it too.
        </p>
        <form className="track__form rise" style={{ ["--i" as string]: 2 }} onSubmit={submit}>
          <div className="field">
            <label htmlFor="t-order">Order number</label>
            <input id="t-order" className="input" placeholder="SB1002" value={order} onChange={(e) => setOrder(e.target.value)} autoComplete="off" required />
            <span className="hint">Starts with SB, in your confirmation email.</span>
          </div>
          <div className="field">
            <label htmlFor="t-email">Email</label>
            <input id="t-email" className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <IslandButton type="submit" disabled={pending} icon={<MagnifyingGlass size={16} weight="bold" />}>
            Find my order
          </IslandButton>
        </form>
        <div className="track__demo rise" style={{ ["--i" as string]: 3 }}>
          <span className="muted">Demo order:</span>
          <button
            type="button"
            className="chip chip--static"
            onClick={() => {
              setOrder("SB1002");
              setEmail("sara@example.com");
            }}
          >
            SB1002 · sara@example.com
          </button>
        </div>
      </div>
      <div className="track__art rise" style={{ ["--i" as string]: 2 }}>
        <div className="bezel">
          <div className="bezel__core">
            <ProductImage src="/images/products/dune-pour-over-set.svg" alt="" />
          </div>
        </div>
        <ul className="track__points">
          <li>
            <ShieldCheck size={20} weight="light" /> Verified with your order and email, never your card
          </li>
          <li>
            <Truck size={20} weight="light" /> Live carrier status and ETA
          </li>
        </ul>
      </div>
    </div>
  );
}
