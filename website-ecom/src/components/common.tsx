import { ArrowClockwise, ArrowUpRight } from "@phosphor-icons/react";
import { type CSSProperties, type ElementType, type ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { friendlyError } from "../api/http";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`logo ${className ?? ""}`}>
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="var(--forest)" />
        <path d="M10 11c0-2 2.6-3.4 6-3.4s6 1.4 6 3.4v2c0 6.6-2.6 11.4-6 11.4S10 19.6 10 13z" fill="#ECE9E1" />
        <ellipse cx="16" cy="11" rx="6" ry="1.8" fill="var(--accent)" />
      </svg>
      <span className="logo__word">Saba</span>
    </span>
  );
}

/** Fades content up when it scrolls into view (IntersectionObserver, no scroll listeners). */
export function Reveal({
  as,
  children,
  className,
  index = 0,
  style,
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  index?: number;
  style?: CSSProperties;
}) {
  const Tag = as ?? "div";
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={`reveal ${inView ? "is-in" : ""} ${className ?? ""}`}
      style={{ ...style, "--i": index } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

export function IslandButton({
  to,
  onClick,
  children,
  variant = "dark",
  icon,
  type = "button",
  disabled,
}: {
  to?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: "dark" | "ghost" | "accent" | "light";
  icon?: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const cls = `btn btn--island ${variant === "ghost" ? "btn--ghost" : variant === "accent" ? "btn--accent" : variant === "light" ? "btn--light" : ""}`;
  const inner = (
    <>
      <span>{children}</span>
      <span className="btn__icon" aria-hidden="true">
        {icon ?? <ArrowUpRight size={16} weight="bold" />}
      </span>
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {inner}
    </button>
  );
}

export function ErrorState({
  error,
  title = "We couldn't load this right now",
  onRetry,
}: {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-block" role="alert">
      <h3>{title}</h3>
      <p className="muted">{friendlyError(error)}</p>
      {onRetry && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          <ArrowClockwise size={16} /> Try again
        </button>
      )}
    </div>
  );
}

export function ProductImage({ src, alt, className }: { src: string | undefined; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`product-img product-img--empty ${className ?? ""}`} role="img" aria-label={alt}>
        <span>{alt.charAt(0)}</span>
      </div>
    );
  }
  return <img className={`product-img ${className ?? ""}`} src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
