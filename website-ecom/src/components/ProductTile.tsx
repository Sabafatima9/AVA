import { Link } from "react-router";
import type { Product } from "../api/types";
import { isDefaultVariant, money } from "../lib/format";
import { ProductImage } from "./common";

export function productStock(p: Product): { soldOut: boolean; partial: boolean } {
  const vs = Array.isArray(p.variants) ? p.variants : [];
  const inStock = vs.filter((v) => (v.inventory_quantity ?? 0) > 0).length;
  return { soldOut: vs.length > 0 && inStock === 0, partial: inStock > 0 && inStock < vs.length };
}

export function priceLabel(p: Product): string {
  const prices = (p.variants ?? []).map((v) => v.price).filter((n) => Number.isFinite(n));
  const min = prices.length ? Math.min(...prices) : p.price;
  const max = prices.length ? Math.max(...prices) : p.price;
  return min !== max ? `From ${money(min, p.currency)}` : money(min, p.currency);
}

export function ProductTile({ product, size = "md" }: { product: Product; size?: "md" | "lg" }) {
  const { soldOut } = productStock(product);
  const options = (product.variants ?? []).filter((v) => !isDefaultVariant(v.title));
  return (
    <Link to={`/products/${product.handle}`} className={`tile tile--${size}`}>
      <div className="bezel tile__frame">
        <div className="bezel__core tile__img">
          <ProductImage src={product.image} alt={product.title} />
          {soldOut && <span className="pill tile__badge">Sold out</span>}
          {!product.is_returnable && !soldOut && <span className="pill tile__badge">Final sale</span>}
        </div>
      </div>
      <div className="tile__meta">
        <div>
          <p className="tile__title">{product.title}</p>
          <p className="tile__sub">
            {options.length > 1 ? `${options.length} ${/small|medium|large/i.test(options[0]?.title ?? "") ? "sizes" : "colours"}` : product.product_type}
          </p>
        </div>
        <p className="tile__price">{priceLabel(product)}</p>
      </div>
    </Link>
  );
}

export function TileSkeleton({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div className={`tile tile--${size}`} aria-hidden="true">
      <div className="skeleton tile__skeleton" />
      <div className="tile__meta">
        <div className="skeleton" style={{ height: 18, width: "60%" }} />
      </div>
    </div>
  );
}
