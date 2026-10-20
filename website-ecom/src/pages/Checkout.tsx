import { ArrowLeft, CheckCircle, CreditCard, Lock, ChatCircleDots, WarningCircle } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { api } from "../api";
import { friendlyError } from "../api/http";
import { IslandButton, ProductImage } from "../components/common";
import { isDefaultVariant, money } from "../lib/format";
import { useCart } from "../state/cart";
import { useChat } from "../state/chat";

interface FormState {
  email: string;
  first_name: string;
  last_name: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
}

const DEMO: FormState = {
  email: "sara@example.com",
  first_name: "Sara",
  last_name: "Haddad",
  line1: "221 Mercer St",
  line2: "Apt 4B",
  city: "New York",
  region: "NY",
  postal_code: "10012",
  country: "US",
};

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required = true,
  span,
}: {
  id: keyof FormState;
  label: string;
  value: string;
  onChange: (id: keyof FormState, v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  span?: 1 | 2;
}) {
  return (
    <div className={`field ${span === 2 ? "field--span" : ""}`}>
      <label htmlFor={`co-${id}`}>
        {label}
        {!required && <span className="muted"> (optional)</span>}
      </label>
      <input
        id={`co-${id}`}
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        autoComplete={autoComplete}
        required={required}
      />
    </div>
  );
}

export function CheckoutPage() {
  const { lines, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(DEMO);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (id: keyof FormState, v: string) => setForm((f) => ({ ...f, [id]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (lines.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const shipping_address = {
        line1: form.line1.trim(),
        city: form.city.trim(),
        region: form.region.trim(),
        postal_code: form.postal_code.trim(),
        country: form.country.trim() || "US",
        ...(form.line2.trim() ? { line2: form.line2.trim() } : {}),
      };
      const res = await api.createOrder({
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        items: lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
        shipping_address,
      });
      clear();
      navigate(`/order/${encodeURIComponent(res.order_number)}`, {
        state: { total: res.total, currency: res.currency, email: form.email.trim(), first_name: form.first_name.trim() },
      });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="container page">
        <div className="state-block">
          <h3>Your bag is empty</h3>
          <p className="muted">Add something from the shop and come back here to check out.</p>
          <Link to="/shop" className="btn btn--sm">
            Go to the shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page checkout">
      <Link to="/shop" className="back-link">
        <ArrowLeft size={16} /> Keep shopping
      </Link>
      <h1 className="display h-lg rise">Checkout</h1>
      <form className="checkout__grid" onSubmit={submit}>
        <div className="checkout__form">
          <section className="co-section rise" style={{ ["--i" as string]: 1 }}>
            <h2>Contact</h2>
            <div className="co-fields">
              <Field id="email" label="Email" type="email" value={form.email} onChange={set} autoComplete="email" span={2} />
              <Field id="first_name" label="First name" value={form.first_name} onChange={set} autoComplete="given-name" />
              <Field id="last_name" label="Last name" value={form.last_name} onChange={set} autoComplete="family-name" />
            </div>
          </section>
          <section className="co-section rise" style={{ ["--i" as string]: 2 }}>
            <h2>Shipping address</h2>
            <div className="co-fields">
              <Field id="line1" label="Address" value={form.line1} onChange={set} autoComplete="address-line1" span={2} />
              <Field id="line2" label="Apartment, suite" value={form.line2} onChange={set} autoComplete="address-line2" required={false} span={2} />
              <Field id="city" label="City" value={form.city} onChange={set} autoComplete="address-level2" />
              <Field id="region" label="State / region" value={form.region} onChange={set} autoComplete="address-level1" />
              <Field id="postal_code" label="Postal code" value={form.postal_code} onChange={set} autoComplete="postal-code" />
              <Field id="country" label="Country" value={form.country} onChange={set} autoComplete="country" />
            </div>
          </section>
          <section className="co-section rise" style={{ ["--i" as string]: 3 }}>
            <div className="co-section__title">
              <h2>Payment</h2>
              <span className="pill pill--accent">Demo, no real payment</span>
            </div>
            <div className="demo-card">
              <div className="demo-card__row">
                <CreditCard size={22} weight="light" />
                <span className="mono demo-card__num">4242 4242 4242 4242</span>
                <span className="mono muted">12 / 29</span>
                <span className="mono muted">CVC 123</span>
              </div>
              <p className="muted demo-card__note">
                <Lock size={14} /> This is a test card. Nothing is charged and no card details leave your browser.
              </p>
            </div>
          </section>
          {error && (
            <p className="form-error" role="alert">
              <WarningCircle size={18} /> {error}
            </p>
          )}
        </div>

        <aside className="checkout__summary">
          <div className="bezel">
            <div className="bezel__core summary">
              <h2>Order summary</h2>
              <ul className="summary__lines">
                {lines.map((l) => (
                  <li key={l.variantId}>
                    <span className="summary__img">
                      <ProductImage src={l.image} alt={l.title} />
                      <span className="summary__qty">{l.quantity}</span>
                    </span>
                    <span className="summary__title">
                      {l.title}
                      {!isDefaultVariant(l.variantTitle) && <span className="muted">{l.variantTitle}</span>}
                    </span>
                    <span>{money(l.price * l.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="summary__rows">
                <div>
                  <span className="muted">Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div>
                  <span className="muted">Shipping</span>
                  <span>Free</span>
                </div>
                <div className="summary__total">
                  <span>Total</span>
                  <span>{money(subtotal)}</span>
                </div>
              </div>
              <IslandButton type="submit" disabled={submitting} variant="accent" icon={<Lock size={15} weight="bold" />}>
                {submitting ? "Placing order…" : `Place order · ${money(subtotal)}`}
              </IslandButton>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

export function ConfirmationPage() {
  const { orderNumber = "" } = useParams();
  const location = useLocation();
  const { openChat } = useChat();
  const st = (location.state ?? {}) as { total?: number; currency?: string; email?: string; first_name?: string };

  const ask = () => {
    const who = st.email ? ` with ${st.email}` : "";
    openChat({ docked: true, draft: `Hi! I just placed order ${orderNumber}${who}. Can you confirm the details?` });
  };

  return (
    <div className="container page confirm-page">
      <div className="confirm-page__card bezel rise">
        <div className="bezel__core">
          <span className="confirm-page__icon">
            <CheckCircle size={40} weight="fill" />
          </span>
          <h1 className="display h-lg">{st.first_name ? `Thank you, ${st.first_name}.` : "Thank you."}</h1>
          <p className="lede">Your order is in. We'll email you when it leaves the studio.</p>
          <div className="confirm-page__meta">
            <div>
              <span className="muted">Order number</span>
              <span className="mono confirm-page__num">{orderNumber}</span>
            </div>
            {typeof st.total === "number" && (
              <div>
                <span className="muted">Total</span>
                <span className="confirm-page__num">{money(st.total, st.currency)}</span>
              </div>
            )}
          </div>
          <div className="confirm-page__ctas">
            <IslandButton onClick={ask} icon={<ChatCircleDots size={16} weight="bold" />}>
              Ask Ava about this order
            </IslandButton>
            <Link to="/shop" className="btn btn--ghost">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
