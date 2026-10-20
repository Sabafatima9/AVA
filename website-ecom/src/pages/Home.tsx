import { ArrowRight, CheckCircle, Flask, Leaf, Package, Sparkle } from "@phosphor-icons/react";
import { Link } from "react-router";
import { ErrorState, IslandButton, ProductImage, Reveal } from "../components/common";
import { ProductTile, TileSkeleton } from "../components/ProductTile";
import { DecisionBars, OutcomeBadge } from "../components/Signals";
import { useProducts } from "../state/useProducts";

const FEATURED = ["aria-stoneware-mug", "dune-pour-over-set", "kiln-dinner-plates", "ember-soy-candle", "terra-planter"];

function Hero() {
  return (
    <section className="hero container">
      <div className="hero__copy">
        <span className="eyebrow rise" style={{ ["--i" as string]: 0 }}>
          <span className="dot" /> New glazes from the autumn firing
        </span>
        <h1 className="display h-xl rise" style={{ ["--i" as string]: 1 }}>
          Made by hand.
          <br />
          <em>Used every day.</em>
        </h1>
        <p className="lede rise" style={{ ["--i" as string]: 2 }}>
          Stoneware, linen and small-batch goods from our studio, thrown slowly and built for daily use.
        </p>
        <div className="hero__ctas rise" style={{ ["--i" as string]: 3 }}>
          <IslandButton to="/shop">Shop the studio</IslandButton>
          <Link to="/demo" className="btn btn--ghost">
            See Ava live
          </Link>
        </div>
      </div>
      <div className="hero__art" aria-hidden="true">
        <div className="hero__card hero__card--a bezel">
          <div className="bezel__core">
            <ProductImage src="/images/products/aria-stoneware-mug.svg" alt="" />
          </div>
        </div>
        <div className="hero__card hero__card--b bezel">
          <div className="bezel__core">
            <ProductImage src="/images/products/kiln-dinner-plates.svg" alt="" />
          </div>
        </div>
        <div className="hero__card hero__card--c bezel">
          <div className="bezel__core">
            <ProductImage src="/images/products/ember-soy-candle.svg" alt="" />
          </div>
        </div>
        <div className="hero__toast">
          <CheckCircle size={20} weight="fill" />
          <div>
            <strong>Ava cancelled SB1003</strong>
            <span>Refund on its way. Customer confirmed.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Featured() {
  const res = useProducts();
  const products =
    res.status === "ready" ? FEATURED.map((h) => res.data.find((p) => p.handle === h)).filter((p) => p !== undefined) : [];
  return (
    <section className="featured container">
      <Reveal className="section-head">
        <h2 className="display h-lg">From the kiln</h2>
        <Link to="/shop" className="link">
          View all pieces <ArrowRight size={16} />
        </Link>
      </Reveal>
      {res.status === "error" ? (
        <ErrorState error={res.error} title="The shop is taking a break" onRetry={res.retry} />
      ) : (
        <div className="featured__grid">
          {res.status === "loading"
            ? FEATURED.map((h, i) => <TileSkeleton key={h} size={i === 0 ? "lg" : "md"} />)
            : products.map((p, i) => (
                <Reveal key={p.handle} index={i} className={i === 0 ? "featured__lead" : ""}>
                  <ProductTile product={p} size={i === 0 ? "lg" : "md"} />
                </Reveal>
              ))}
        </div>
      )}
    </section>
  );
}

function Story() {
  return (
    <section className="story">
      <div className="container story__inner">
        <Reveal as="p" className="display story__statement">
          We make fewer things, and we make them to be used. Every piece is thrown, trimmed and glazed by a small team in{" "}
          <em>one room</em>, then packed by the same hands.
        </Reveal>
        <div className="story__facts">
          {[
            { icon: <Flask size={22} weight="light" />, t: "Glazes mixed in-house", d: "So a Sand mug from this firing matches one from the last." },
            { icon: <Leaf size={22} weight="light" />, t: "Plastic-free packing", d: "Paper, card and recycled pulp. Nothing that lasts longer than the mug." },
            { icon: <Package size={22} weight="light" />, t: "Free 30-day returns", d: "Ceramics and textiles come back free. Candles are final sale." },
          ].map((f, i) => (
            <Reveal key={f.t} index={i} className="story__fact">
              <span className="story__icon">{f.icon}</span>
              <h3>{f.t}</h3>
              <p className="muted">{f.d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function MeetAva() {
  return (
    <section className="container">
      <Reveal className="ava-block">
        <div className="ava-block__copy">
          <span className="eyebrow eyebrow--dark">
            <Sparkle size={12} weight="fill" /> Customer support
          </span>
          <h2 className="display h-lg">
            Meet Ava, the support agent that <em>actually resolves things.</em>
          </h2>
          <p>
            Most chat widgets point you to a help article. Ava verifies who you are, looks up the order and makes the change: cancellations,
            address updates, returns, duplicate-charge refunds and not-received claims. Each action is weighed by NACE Drex, and Ava asks
            before changing anything.
          </p>
          <ul className="ava-block__caps">
            {["Track", "Cancel", "Change address", "Start returns", "Refund duplicates", "File claims", "Hand off to a human"].map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <IslandButton to="/demo" variant="light">
            Open the live demo
          </IslandButton>
        </div>
        <div className="ava-block__preview" role="figure" aria-label="Example of a decision Ava makes">
          <div className="preview-bubble preview-bubble--me">Please cancel SB1003, I picked the wrong colour.</div>
          <div className="preview-card">
            <div className="preview-card__head">
              <span className="preview-card__k">Drex decision · Cancel order</span>
              <OutcomeBadge outcome="auto_approve" />
            </div>
            <DecisionBars probabilities={{ p_intent_confirmed: 0.96, p_fraud: 0.03 }} thresholds={{ p_intent_confirmed: 0.85, p_fraud: 0.25 }} />
          </div>
          <div className="preview-bubble preview-bubble--ava">
            It hasn't shipped yet, so I can cancel it. Shall I go ahead and refund $120 to your card?
          </div>
          <div className="preview-resolved">
            <CheckCircle size={20} weight="fill" />
            <span>
              <strong>Order SB1003 cancelled</strong>
              <span>Confirmed by the customer, refund issued</span>
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function HomePage() {
  return (
    <>
      <Hero />
      <Featured />
      <Story />
      <MeetAva />
    </>
  );
}
