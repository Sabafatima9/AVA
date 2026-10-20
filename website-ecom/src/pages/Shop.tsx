import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { ErrorState, Reveal } from "../components/common";
import { ProductTile, TileSkeleton } from "../components/ProductTile";
import { useProducts } from "../state/useProducts";

export function ShopPage() {
  const res = useProducts();
  const [params, setParams] = useSearchParams();
  const type = params.get("type") ?? "All";

  const products = res.status === "ready" ? res.data : [];
  const types = useMemo(() => {
    const set = new Set(products.map((p) => p.product_type).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [products]);
  const visible = type === "All" ? products : products.filter((p) => p.product_type === type);

  return (
    <div className="container page shop">
      <header className="shop__head">
        <h1 className="display h-xl rise">The shop</h1>
        <p className="lede rise" style={{ ["--i" as string]: 1 }}>
          Eight pieces we use at home every day. Small runs, so colours come and go.
        </p>
      </header>

      <div className="filters rise" style={{ ["--i" as string]: 2 }} role="tablist" aria-label="Filter by type">
        {types.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === type}
            className={`filter ${t === type ? "is-on" : ""}`}
            onClick={() => setParams(t === "All" ? {} : { type: t }, { replace: true })}
          >
            {t}
            {res.status === "ready" && (
              <span className="filter__n">{t === "All" ? products.length : products.filter((p) => p.product_type === t).length}</span>
            )}
          </button>
        ))}
      </div>

      {res.status === "error" ? (
        <ErrorState error={res.error} title="The shop is taking a break" onRetry={res.retry} />
      ) : (
        <div className="shop__grid">
          {res.status === "loading"
            ? Array.from({ length: 6 }, (_, i) => <TileSkeleton key={i} />)
            : visible.map((p, i) => (
                <Reveal key={`${type}-${p.handle}`} index={i % 3}>
                  <ProductTile product={p} />
                </Reveal>
              ))}
          {res.status === "ready" && visible.length === 0 && (
            <div className="state-block">
              <h3>Nothing in {type} right now</h3>
              <p className="muted">Try another category, or see everything.</p>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setParams({})}>
                Show all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
