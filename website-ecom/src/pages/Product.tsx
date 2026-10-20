import { ArrowLeft, ArrowsCounterClockwise, ChatCircleDots, Check, Minus, Plus, Prohibit, Truck } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError } from "../api";
import { ErrorState, IslandButton, ProductImage, Reveal } from "../components/common";
import { ProductTile } from "../components/ProductTile";
import { isDefaultVariant, money } from "../lib/format";
import { useCart } from "../state/cart";
import { useChat } from "../state/chat";
import { useProduct, useProducts } from "../state/useProducts";

export function ProductPage() {
  const { handle } = useParams();
  const res = useProduct(handle);
  const all = useProducts();
  const { add, setDrawerOpen } = useCart();
  const { openChat } = useChat();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const product = res.status === "ready" ? res.data : null;
  const variants = product?.variants ?? [];
  const showVariants = variants.length > 1 || (variants[0] && !isDefaultVariant(variants[0].title));

  useEffect(() => {
    if (!product) return;
    const firstInStock = product.variants.find((v) => v.inventory_quantity > 0) ?? product.variants[0];
    setVariantId(firstInStock?.id ?? null);
    setQty(1);
  }, [product]);

  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const stock = variant?.inventory_quantity ?? 0;
  const soldOut = !variant || stock <= 0;

  const related = useMemo(() => {
    if (all.status !== "ready" || !product) return [];
    const same = all.data.filter((p) => p.handle !== product.handle && p.product_type === product.product_type);
    const rest = all.data.filter((p) => p.handle !== product.handle && p.product_type !== product.product_type);
    return [...same, ...rest].slice(0, 3);
  }, [all, product]);

  if (res.status === "loading") {
    return (
      <div className="container page pdp">
        <div className="pdp__grid">
          <div className="skeleton pdp__skeleton" />
          <div className="pdp__info">
            <div className="skeleton" style={{ height: 56, width: "70%" }} />
            <div className="skeleton" style={{ height: 120 }} />
          </div>
        </div>
      </div>
    );
  }
  if (res.status === "error" || !product) {
    const notFound = res.status === "error" && res.error instanceof ApiError && res.error.kind === "not_found";
    return (
      <div className="container page">
        {notFound ? (
          <div className="state-block">
            <h3>We couldn't find that piece</h3>
            <p className="muted">It may have sold out for good, or the link is wrong.</p>
            <Link to="/shop" className="btn btn--ghost btn--sm">
              Back to the shop
            </Link>
          </div>
        ) : (
          <ErrorState error={res.status === "error" ? res.error : null} onRetry={res.retry} />
        )}
      </div>
    );
  }

  const addToBag = () => {
    if (!variant || soldOut) return;
    add(
      {
        variantId: variant.id,
        handle: product.handle,
        title: product.title,
        variantTitle: variant.title,
        price: variant.price,
        image: product.image,
        maxQuantity: variant.inventory_quantity,
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    setDrawerOpen(true);
  };

  return (
    <div className="container page pdp">
      <Link to="/shop" className="back-link">
        <ArrowLeft size={16} /> Shop
      </Link>
      <div className="pdp__grid">
        <div className="pdp__media rise">
          <div className="bezel">
            <div className="bezel__core">
              <ProductImage src={product.image} alt={product.title} />
            </div>
          </div>
        </div>
        <div className="pdp__info">
          <p className="pdp__type rise">{product.product_type}</p>
          <h1 className="display h-lg rise" style={{ ["--i" as string]: 1 }}>
            {product.title}
          </h1>
          <p className="pdp__price rise" style={{ ["--i" as string]: 2 }}>
            {money(variant?.price ?? product.price, product.currency)}
          </p>
          <p className="pdp__desc rise" style={{ ["--i" as string]: 3 }}>
            {product.description}
          </p>

          {showVariants && (
            <fieldset className="variants rise" style={{ ["--i" as string]: 4 }}>
              <legend>
                {/small|medium|large/i.test(variants[0]?.title ?? "") ? "Size" : "Colour"}
                <span className="muted"> · {variant?.title}</span>
              </legend>
              <div className="variants__list">
                {variants.map((v) => {
                  const out = v.inventory_quantity <= 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`variant ${v.id === variant?.id ? "is-on" : ""} ${out ? "is-out" : ""}`}
                      onClick={() => {
                        setVariantId(v.id);
                        setQty(1);
                      }}
                      aria-pressed={v.id === variant?.id}
                    >
                      {v.title}
                      {out && <span className="variant__out">Sold out</span>}
                      {!out && v.price !== product.price && <span className="variant__price">{money(v.price)}</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <p className={`stock ${soldOut ? "stock--out" : stock <= 5 ? "stock--low" : "stock--ok"}`}>
            <span className="stock__dot" />
            {soldOut ? "Sold out in this colour" : stock <= 5 ? `Only ${stock} left` : "In stock, ships in 1–2 days"}
          </p>

          <div className="buy">
            <div className="qty qty--lg" role="group" aria-label="Quantity">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease" disabled={soldOut || qty <= 1}>
                <Minus size={16} />
              </button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(stock, q + 1))} aria-label="Increase" disabled={soldOut || qty >= stock}>
                <Plus size={16} />
              </button>
            </div>
            <IslandButton onClick={addToBag} disabled={soldOut} icon={added ? <Check size={16} weight="bold" /> : undefined}>
              {soldOut ? "Sold out" : added ? "Added" : "Add to bag"}
            </IslandButton>
          </div>

          <ul className="pdp__notes">
            <li>
              <Truck size={18} weight="light" /> Free shipping, packed without plastic
            </li>
            <li>
              {product.is_returnable ? (
                <>
                  <ArrowsCounterClockwise size={18} weight="light" /> Free returns within 30 days
                </>
              ) : (
                <>
                  <Prohibit size={18} weight="light" /> Final sale, not returnable
                </>
              )}
            </li>
          </ul>

          <button
            type="button"
            className="pdp__ask"
            onClick={() => openChat({ draft: `I have a question about the ${product.title}.` })}
          >
            <ChatCircleDots size={18} /> Questions about this piece? <strong>Ask Ava</strong>
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <section className="related">
          <Reveal as="h2" className="display h-md">
            Pairs well with
          </Reveal>
          <div className="related__grid">
            {related.map((p, i) => (
              <Reveal key={p.handle} index={i}>
                <ProductTile product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
