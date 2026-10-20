import { Minus, Plus, Tote, X } from "@phosphor-icons/react";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { isDefaultVariant, money } from "../lib/format";
import { useCart } from "../state/cart";
import { IslandButton, ProductImage } from "./common";

export function CartDrawer() {
  const { lines, subtotal, drawerOpen, setDrawerOpen, setQuantity, remove } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, setDrawerOpen]);

  return (
    <div className={`drawer ${drawerOpen ? "is-open" : ""}`} aria-hidden={!drawerOpen}>
      <button type="button" className="drawer__scrim" aria-label="Close bag" tabIndex={-1} onClick={() => setDrawerOpen(false)} />
      <aside className="drawer__panel" aria-label="Shopping bag">
        <div className="drawer__head">
          <h2 className="display">Your bag</h2>
          <button type="button" className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Close bag">
            <X size={20} />
          </button>
        </div>
        {lines.length === 0 ? (
          <div className="drawer__empty">
            <span className="drawer__empty-icon">
              <Tote size={28} weight="light" />
            </span>
            <p className="display">Nothing here yet.</p>
            <p className="muted">The Aria mug is a good place to start.</p>
            <Link to="/shop" className="btn btn--ghost btn--sm" onClick={() => setDrawerOpen(false)}>
              Browse the shop
            </Link>
          </div>
        ) : (
          <>
            <ul className="drawer__lines">
              {lines.map((l) => (
                <li key={l.variantId} className="cart-line">
                  <Link to={`/products/${l.handle}`} className="cart-line__img" onClick={() => setDrawerOpen(false)}>
                    <ProductImage src={l.image} alt={l.title} />
                  </Link>
                  <div className="cart-line__body">
                    <div className="cart-line__top">
                      <div>
                        <p className="cart-line__title">{l.title}</p>
                        {!isDefaultVariant(l.variantTitle) && <p className="muted cart-line__variant">{l.variantTitle}</p>}
                      </div>
                      <p className="cart-line__price">{money(l.price * l.quantity)}</p>
                    </div>
                    <div className="cart-line__bottom">
                      <div className="qty" role="group" aria-label={`Quantity for ${l.title}`}>
                        <button type="button" onClick={() => setQuantity(l.variantId, l.quantity - 1)} aria-label="Decrease">
                          <Minus size={14} />
                        </button>
                        <span>{l.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(l.variantId, l.quantity + 1)}
                          aria-label="Increase"
                          disabled={l.maxQuantity > 0 && l.quantity >= l.maxQuantity}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button type="button" className="cart-line__remove" onClick={() => remove(l.variantId)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="drawer__foot">
              <div className="drawer__row">
                <span>Subtotal</span>
                <span className="drawer__subtotal">{money(subtotal)}</span>
              </div>
              <p className="muted drawer__note">Free shipping on every demo order. Taxes calculated at checkout.</p>
              <IslandButton
                onClick={() => {
                  setDrawerOpen(false);
                  navigate("/checkout");
                }}
              >
                Checkout
              </IslandButton>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
