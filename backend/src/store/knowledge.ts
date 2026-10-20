/** Saba policy articles used by `search_policies` (FR-KB-1). */
export interface Article {
  slug: string;
  title: string;
  tags: string[];
  body: string;
}

export const ARTICLES: readonly Article[] = [
  {
    slug: "shipping",
    title: "Shipping & Delivery",
    tags: ["shipping", "delivery", "carrier", "ups", "usps", "tracking", "late", "eta", "where", "dispatch", "international"],
    body:
      "Orders are packed and dispatched within 1-2 business days. Standard shipping in the US takes 3-5 business days after dispatch with UPS or USPS. Shipping is free on orders of $100 or more, otherwise $8 flat. We ship within the US only for now. Every shipped order gets a tracking link by email. Carriers sometimes run late: we treat a parcel as delayed (not lost) until it is 3 days past its estimated delivery date or 7 days since the last tracking scan. After that, contact us and we will send a replacement or a refund.",
  },
  {
    slug: "returns",
    title: "Returns & Exchanges",
    tags: ["return", "returns", "exchange", "refund", "window", "label", "candle", "unused", "send back"],
    body:
      "You can return unused items in their original condition within 30 days of delivery for a refund or an exchange. Return shipping is free: we email a prepaid return label with your RMA number. Refunds are issued to the original payment method once the return is received and checked (usually within 3 business days of arrival). Candles are not returnable once opened, for hygiene and safety reasons. Items damaged in transit are covered by our Damaged Items policy instead, with no need to send them back first. After 30 days we cannot accept returns, but a teammate can help with warranty questions.",
  },
  {
    slug: "damaged-items",
    title: "Damaged, Defective, or Wrong Items",
    tags: ["damaged", "broken", "cracked", "chipped", "defective", "wrong", "warranty", "photo", "faulty"],
    body:
      "Handmade ceramics can show small variations in glaze, which are part of their character. If an item arrives chipped, cracked, broken, or is not what you ordered, tell us within 30 days of delivery. Photos help but are optional. We will send a free replacement if it is in stock, or a full refund of the item to your original payment method. You do not need to return a broken item. Our stoneware has a 1-year warranty against manufacturing defects such as glaze crazing that leaks.",
  },
  {
    slug: "payments-refunds",
    title: "Payment Methods & Refund Timing",
    tags: ["payment", "pay", "card", "visa", "mastercard", "amex", "paypal", "refund", "charged", "twice", "duplicate", "billing", "pending"],
    body:
      "We accept Visa, Mastercard, American Express, Apple Pay, and Shop Pay. Your card is charged when the order is placed. Refunds always go back to the original payment method and typically appear within 5-10 business days, depending on your bank. If you see two charges for one order, one may be a temporary authorization that drops off within a few days; if both are captured, we refund the duplicate right away. We never ask for your full card number in chat.",
  },
  {
    slug: "order-changes",
    title: "Cancelling or Changing an Order",
    tags: ["cancel", "cancellation", "change", "address", "modify", "edit", "update"],
    body:
      "You can cancel an order or change its shipping address any time before it is packed and shipped (status: order placed). Once an order is being packed or has shipped, we can no longer cancel it, but you can return it after delivery within 30 days. Address changes are limited to one per order and must stay in the same country. Cancelled orders are refunded in full to the original payment method.",
  },
];

/** Keyword scoring; small catalog, no embeddings needed. */
export function searchArticles(query: string, limit = 2): Article[] {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
  if (words.length === 0) return ARTICLES.slice(0, limit);
  const scored = ARTICLES.map((a) => {
    const hay = `${a.title} ${a.body}`.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (a.tags.some((t) => t === w || t.startsWith(w) || w.startsWith(t))) score += 3;
      if (hay.includes(w)) score += 1;
    }
    return { a, score };
  })
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score);
  return scored.slice(0, limit).map((s) => s.a);
}
