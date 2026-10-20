import {
  ArrowSquareOut,
  CaretRight,
  CheckCircle,
  Clock,
  HandWaving,
  Lifebuoy,
  MapPin,
  Package,
  ShieldCheck,
  Star,
  Truck,
} from "@phosphor-icons/react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { Link } from "react-router";
import type {
  ActionConfirmationUi,
  CsatPromptUi,
  EscalationNoticeUi,
  OrderCardUi,
  OrderPickerUi,
  ProductCardUi,
  QuickRepliesUi,
  ResolutionUi,
  UiPayload,
} from "../../api/types";
import { isDefaultVariant, money, shortDate } from "../../lib/format";
import { useChat } from "../../state/chat";
import { ProductImage } from "../common";

export function statusTone(label: string | undefined): "ok" | "warn" | "bad" | "info" | "neutral" {
  const l = (label ?? "").toLowerCase();
  if (/(deliver|complete|refunded)/.test(l)) return "ok";
  if (/(cancel|fail|lost|return)/.test(l)) return "bad";
  if (/(transit|shipped|out for|fulfilled)/.test(l)) return "info";
  if (/(process|pending|unfulfilled|paid|placed|packing)/.test(l)) return "warn";
  return "neutral";
}

export function OrderCard({ ui }: { ui: OrderCardUi }) {
  const items = Array.isArray(ui.items) ? ui.items : [];
  const tone = statusTone(ui.status_label);
  return (
    <div className="ui-card order-card">
      <div className="order-card__head">
        <div>
          <span className="ui-kicker">Order</span>
          <p className="order-card__num mono">{ui.order_number}</p>
        </div>
        <span className={`pill pill--${tone === "neutral" ? "" : tone}`}>
          <span className="pill-dot" />
          {ui.status_label}
        </span>
      </div>
      {items.length > 0 && (
        <ul className="order-card__items">
          {items.map((it, i) => (
            <li key={`${it.title}-${i}`}>
              <span className="order-card__thumb">
                <ProductImage src={it.image} alt={it.title} />
              </span>
              <span className="order-card__item-body">
                <span className="order-card__item-title">{it.title}</span>
                <span className="muted">
                  {!isDefaultVariant(it.variant_title) && `${it.variant_title} · `}Qty {it.quantity}
                </span>
              </span>
              <span className="order-card__item-price">{money((it.unit_price ?? 0) * (it.quantity ?? 1), ui.currency)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="order-card__meta">
        {(ui.carrier || ui.eta) && (
          <div className="order-card__row">
            <Truck size={16} />
            <span>
              {ui.carrier && <strong>{ui.carrier}</strong>}
              {ui.carrier && ui.eta && " · "}
              {ui.eta && <>Arrives {ui.eta}</>}
            </span>
          </div>
        )}
        {ui.shipping_address_summary && (
          <div className="order-card__row">
            <MapPin size={16} />
            <span>{ui.shipping_address_summary}</span>
          </div>
        )}
        {ui.placed_at && (
          <div className="order-card__row">
            <Clock size={16} />
            <span>Placed {shortDate(ui.placed_at)}</span>
          </div>
        )}
      </div>
      <div className="order-card__foot">
        <span>
          <span className="muted">Total </span>
          <strong>{money(ui.total, ui.currency)}</strong>
        </span>
        {ui.tracking_url && (
          <a className="order-card__track" href={ui.tracking_url} target="_blank" rel="noopener noreferrer">
            Track package <ArrowSquareOut size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

export function OrderPicker({ ui, active }: { ui: OrderPickerUi; active: boolean }) {
  const { sendText, pending } = useChat();
  const orders = Array.isArray(ui.orders) ? ui.orders : [];
  return (
    <div className="ui-card picker">
      <span className="ui-kicker">Your orders</span>
      <ul>
        {orders.map((o) => (
          <li key={o.order_number}>
            <button type="button" disabled={!active || pending} onClick={() => sendText(`Order ${o.order_number}`)}>
              <Package size={18} weight="light" />
              <span className="picker__main">
                <span className="mono picker__num">{o.order_number}</span>
                <span className="muted">
                  {[shortDate(o.placed_at), money(o.total)].filter(Boolean).join(" · ")}
                </span>
              </span>
              {o.status_label && <span className={`pill pill--${statusTone(o.status_label)}`}>{o.status_label}</span>}
              <CaretRight size={14} className="picker__caret" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VerificationForm({ active }: { active: boolean }) {
  const { verify, verification, pending } = useChat();
  const [order, setOrder] = useState("");
  const [email, setEmail] = useState("");
  const uid = useId();
  const verified = verification.level !== "L0";
  const disabled = !active || pending || verified;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!order.trim() || !email.trim()) return;
    void verify(order, email);
  };
  if (verified && !active) {
    return (
      <div className="ui-card verify verify--done">
        <ShieldCheck size={18} weight="fill" /> Verified
      </div>
    );
  }
  return (
    <form className="ui-card verify" onSubmit={submit}>
      <div className="verify__head">
        <ShieldCheck size={18} />
        <span>Verify it's your order</span>
      </div>
      <div className="verify__fields">
        <div className="field">
          <label htmlFor={`${uid}-o`}>Order number</label>
          <input id={`${uid}-o`} className="input" placeholder="SB1003" value={order} onChange={(e) => setOrder(e.target.value)} disabled={disabled} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-e`}>Email used at checkout</label>
          <input id={`${uid}-e`} className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={disabled} autoComplete="email" />
        </div>
      </div>
      <button type="submit" className="btn btn--sm btn--block" disabled={disabled || !order.trim() || !email.trim()}>
        {verified ? "Verified" : "Verify"}
      </button>
      <p className="verify__note">We only use this to find your order. Ava never sees your payment details.</p>
    </form>
  );
}

function useCountdown(expiresAt: string | undefined, enabled: boolean): number | null {
  const target = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled || Number.isNaN(target)) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [enabled, target]);
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.round((target - now) / 1000));
}

export function ActionConfirmation({ ui }: { ui: ActionConfirmationUi }) {
  const { sendAction, usedProposals, pending } = useChat();
  const used = usedProposals.has(ui.proposal_id);
  const remaining = useCountdown(ui.expires_at, !used);
  const expired = remaining === 0;
  const locked = used || expired;
  const confirm = ui.confirm_label || "Confirm";
  const decline = ui.decline_label || "No thanks";
  return (
    <div className={`ui-card confirm ${locked ? "is-locked" : ""}`}>
      <div className="confirm__head">
        <span className="confirm__badge">
          <HandWaving size={14} weight="bold" /> Needs your OK
        </span>
        {!locked && remaining !== null && (
          <span className="confirm__timer mono">
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </span>
        )}
      </div>
      <p className="confirm__title">{ui.title}</p>
      {Array.isArray(ui.lines) && ui.lines.length > 0 && (
        <ul className="confirm__lines">
          {ui.lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
      {locked ? (
        <p className="confirm__status">{used ? "Answered" : "This confirmation expired. Ask Ava again to get a fresh one."}</p>
      ) : (
        <div className="confirm__actions">
          <button
            type="button"
            className="btn btn--accent btn--sm"
            disabled={pending}
            onClick={() => sendAction({ type: "confirm", proposal_id: ui.proposal_id }, confirm)}
          >
            {confirm}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={pending}
            onClick={() => sendAction({ type: "decline", proposal_id: ui.proposal_id }, decline)}
          >
            {decline}
          </button>
        </div>
      )}
    </div>
  );
}

export function QuickReplies({ ui, active }: { ui: QuickRepliesUi; active: boolean }) {
  const { sendQuickReply, pending } = useChat();
  const options = Array.isArray(ui.options) ? ui.options : [];
  if (!active || options.length === 0) return null;
  return (
    <div className="chips" role="group" aria-label="Suggested replies">
      {options.map((o, i) => (
        <button key={`${o.value}-${i}`} type="button" className="chip" disabled={pending} onClick={() => sendQuickReply(o.label, o.value)} style={{ animationDelay: `${i * 60}ms` }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EscalationNotice({ ui }: { ui: EscalationNoticeUi }) {
  return (
    <div className="ui-card escalation">
      <span className="escalation__icon">
        <Lifebuoy size={22} weight="regular" />
      </span>
      <div>
        <p className="escalation__title">Handed to a human</p>
        {ui.sla_text && <p className="escalation__sla">{ui.sla_text}</p>}
        <p className="escalation__ref">
          Reference <span className="mono">{ui.reference}</span>
        </p>
      </div>
    </div>
  );
}

export function ProductCards({ ui }: { ui: ProductCardUi }) {
  const products = Array.isArray(ui.products) ? ui.products : [];
  return (
    <div className="pcards">
      {products.map((p) => (
        <Link key={p.handle} to={`/products/${p.handle}`} className="pcard">
          <span className="pcard__img">
            <ProductImage src={p.image} alt={p.title} />
          </span>
          <span className="pcard__title">{p.title}</span>
          <span className="pcard__price">{money(p.price)}</span>
        </Link>
      ))}
    </div>
  );
}

export function Resolution({ ui }: { ui: ResolutionUi }) {
  return (
    <div className="ui-card resolution">
      <span className="resolution__icon">
        <CheckCircle size={26} weight="fill" />
      </span>
      <div className="resolution__body">
        <p className="resolution__title">{ui.title}</p>
        {Array.isArray(ui.lines) && ui.lines.length > 0 && (
          <ul>
            {ui.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
        {ui.reference && (
          <p className="resolution__ref">
            Reference <span className="mono">{ui.reference}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export function CsatPrompt({ ui, messageId }: { ui: CsatPromptUi; messageId: string }) {
  const { rate, ratedMessages } = useChat();
  const rated = ratedMessages.get(messageId);
  const scale = Math.max(3, Math.min(10, Number(ui.scale) || 5));
  const [hover, setHover] = useState(0);
  return (
    <div className="ui-card csat">
      {rated ? (
        <p className="csat__thanks">
          <CheckCircle size={16} weight="fill" /> Thanks, that helps us improve Ava.
        </p>
      ) : (
        <>
          <p className="csat__q">How did Ava do?</p>
          <div className="csat__stars" onMouseLeave={() => setHover(0)}>
            {Array.from({ length: scale }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`Rate ${n} of ${scale}`}
                onMouseEnter={() => setHover(n)}
                onFocus={() => setHover(n)}
                onClick={() => void rate(messageId, n)}
                className={n <= hover ? "is-on" : ""}
              >
                <Star size={22} weight={n <= hover ? "fill" : "regular"} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function UiBlock({ ui, active, messageId }: { ui: UiPayload; active: boolean; messageId: string }) {
  switch (ui.type) {
    case "order_card":
      return <OrderCard ui={ui as OrderCardUi} />;
    case "order_picker":
      return <OrderPicker ui={ui as OrderPickerUi} active={active} />;
    case "verification_form":
      return <VerificationForm active={active} />;
    case "action_confirmation":
      return <ActionConfirmation ui={ui as ActionConfirmationUi} />;
    case "quick_replies":
      return <QuickReplies ui={ui as QuickRepliesUi} active={active} />;
    case "escalation_notice":
      return <EscalationNotice ui={ui as EscalationNoticeUi} />;
    case "product_card":
      return <ProductCards ui={ui as ProductCardUi} />;
    case "resolution":
      return <Resolution ui={ui as ResolutionUi} />;
    case "csat_prompt":
      return <CsatPrompt ui={ui as CsatPromptUi} messageId={messageId} />;
    default:
      return null;
  }
}
