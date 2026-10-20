import { run, type SqlDb } from "./sql.js";

/**
 * Demo seed for the Saba store. Every date is relative to `now`, so the
 * scenarios (grace periods, return windows, ETAs) always line up.
 */

interface SeedVariant {
  key: string;
  title: string;
  price: number;
  stock: number;
}

interface SeedProduct {
  handle: string;
  title: string;
  description: string;
  type: string;
  returnable: boolean;
  variants: SeedVariant[];
}

export const SEED_PRODUCTS: readonly SeedProduct[] = [
  {
    handle: "aria-stoneware-mug",
    title: "Aria Stoneware Mug",
    description:
      "A wheel-thrown 12 oz mug with a soft speckled glaze and a thumb rest that fits just right. Dishwasher and microwave safe.",
    type: "Drinkware",
    returnable: true,
    variants: [
      { key: "sand", title: "Sand", price: 28, stock: 24 },
      { key: "charcoal", title: "Charcoal", price: 28, stock: 18 },
    ],
  },
  {
    handle: "dune-pour-over-set",
    title: "Dune Pour-Over Set",
    description:
      "A ceramic dripper and matching 600 ml carafe glazed in warm dune tones. Brews two slow, clear cups at a time.",
    type: "Coffee",
    returnable: true,
    variants: [{ key: "default", title: "Default", price: 64, stock: 9 }],
  },
  {
    handle: "linen-throw-blanket",
    title: "Linen Throw Blanket",
    description:
      "Stonewashed European linen with knotted fringe. Breathable in summer, layered in winter, softer with every wash.",
    type: "Textiles",
    returnable: true,
    variants: [
      { key: "oat", title: "Oat", price: 120, stock: 7 },
      { key: "sage", title: "Sage", price: 120, stock: 0 },
    ],
  },
  {
    handle: "terra-planter",
    title: "Terra Planter",
    description:
      "Unglazed terracotta-toned stoneware planter with a drainage hole and matching saucer. Lets roots breathe.",
    type: "Planters",
    returnable: true,
    variants: [
      { key: "small", title: "Small", price: 42, stock: 15 },
      { key: "medium", title: "Medium", price: 48, stock: 11 },
      { key: "large", title: "Large", price: 56, stock: 3 },
    ],
  },
  {
    handle: "ember-soy-candle",
    title: "Ember Soy Candle",
    description:
      "Hand-poured soy wax in a reusable ceramic vessel. About 50 hours of slow, clean burn. Not returnable once opened.",
    type: "Candles",
    returnable: false,
    variants: [
      { key: "cedar", title: "Cedar", price: 34, stock: 30 },
      { key: "fig", title: "Fig", price: 34, stock: 22 },
    ],
  },
  {
    handle: "kiln-dinner-plates",
    title: "Kiln Dinner Plates, Set of 4",
    description:
      "Four 10.5 inch dinner plates with raw clay rims and a satin glaze. Each one carries the marks of the kiln.",
    type: "Tableware",
    returnable: true,
    variants: [
      { key: "bone", title: "Bone", price: 88, stock: 12 },
      { key: "slate", title: "Slate", price: 88, stock: 8 },
    ],
  },
  {
    handle: "mesa-serving-bowl",
    title: "Mesa Serving Bowl",
    description:
      "A wide, shallow 11 inch bowl made for salads, pasta, and long dinners. Glazed inside, raw stoneware outside.",
    type: "Tableware",
    returnable: true,
    variants: [{ key: "default", title: "Default", price: 56, stock: 10 }],
  },
  {
    handle: "haven-cotton-towels",
    title: "Haven Cotton Towel Set",
    description:
      "Two bath towels and two hand towels in long-staple Turkish cotton. Light, absorbent, and quick to dry.",
    type: "Textiles",
    returnable: true,
    variants: [
      { key: "white", title: "White", price: 72, stock: 14 },
      { key: "clay", title: "Clay", price: 72, stock: 6 },
    ],
  },
];

export function productId(handle: string): string {
  return `prod_${handle.replace(/-/g, "_")}`;
}

export function variantId(handle: string, key: string): string {
  return `var_${handle.replace(/-/g, "_")}_${key}`;
}

export function skuFor(handle: string, key: string): string {
  const base = handle
    .split("-")
    .slice(0, 2)
    .map((p) => p.toUpperCase())
    .join("-");
  return key === "default" ? base : `${base}-${key.toUpperCase()}`;
}

export const FREE_SHIPPING_CENTS = 10000;
export const SHIPPING_CENTS = 800;

export function shippingFor(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_CENTS ? 0 : SHIPPING_CENTS;
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;

interface SeedOrder {
  number: string;
  customer: "sara" | "omar" | null;
  email: string;
  status: "unfulfilled" | "processing" | "shipped" | "delivered" | "cancelled";
  placedAgoMs: number;
  items: { handle: string; key: string; qty: number }[];
  card: { brand: string; last4: string };
  address: Record<string, string>;
  shipment?: {
    carrier: string;
    tracking: string;
    shippedAgoDays: number;
    etaInDays: number;
    deliveredAgoDays?: number;
    lastEventAgoDays: number;
    lastEvent: string;
    status: string;
  };
  duplicatePayment?: boolean;
  refund?: { reason: string; agoDays: number };
  cancelledAgoDays?: number;
}

const SARA_ADDRESS = {
  first_name: "Sara",
  last_name: "Ahmed",
  line1: "1452 Alder Street",
  city: "Portland",
  region: "OR",
  postal_code: "97205",
  country: "US",
};
const OMAR_ADDRESS = {
  first_name: "Omar",
  last_name: "Khan",
  line1: "88 Harbor View Road",
  city: "Oakland",
  region: "CA",
  postal_code: "94607",
  country: "US",
};
const GUEST_ADDRESS = {
  first_name: "Lena",
  last_name: "Park",
  line1: "301 Maple Avenue",
  city: "Austin",
  region: "TX",
  postal_code: "78701",
  country: "US",
};

const VISA = { brand: "Visa", last4: "4242" };

function trackingUrl(carrier: string, tracking: string): string {
  return carrier === "UPS"
    ? `https://www.ups.com/track?tracknum=${tracking}`
    : `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`;
}

export const SEED_ORDERS: readonly SeedOrder[] = [
  {
    number: "SB1001",
    customer: "sara",
    email: "sara@example.com",
    status: "unfulfilled",
    placedAgoMs: 2 * HOUR,
    items: [
      { handle: "aria-stoneware-mug", key: "sand", qty: 2 },
      { handle: "ember-soy-candle", key: "fig", qty: 1 },
    ],
    card: VISA,
    address: SARA_ADDRESS,
  },
  {
    number: "SB1002",
    customer: "sara",
    email: "sara@example.com",
    status: "processing",
    placedAgoMs: 1 * DAY,
    items: [{ handle: "dune-pour-over-set", key: "default", qty: 1 }],
    card: { brand: "Mastercard", last4: "4444" },
    address: SARA_ADDRESS,
  },
  {
    number: "SB1003",
    customer: "sara",
    email: "sara@example.com",
    status: "shipped",
    placedAgoMs: 3 * DAY,
    items: [{ handle: "kiln-dinner-plates", key: "bone", qty: 1 }],
    card: VISA,
    address: SARA_ADDRESS,
    shipment: {
      carrier: "UPS",
      tracking: "1Z999AA10123456784",
      shippedAgoDays: 2,
      etaInDays: 2,
      lastEventAgoDays: 0.4,
      lastEvent: "In transit - arrived at UPS facility, Sacramento CA",
      status: "in_transit",
    },
  },
  {
    number: "SB1004",
    customer: "sara",
    email: "sara@example.com",
    status: "shipped",
    placedAgoMs: 10 * DAY,
    items: [{ handle: "aria-stoneware-mug", key: "charcoal", qty: 2 }],
    card: VISA,
    address: SARA_ADDRESS,
    shipment: {
      carrier: "USPS",
      tracking: "9400111899223197428490",
      shippedAgoDays: 9,
      etaInDays: -4,
      lastEventAgoDays: 8,
      lastEvent: "Departed USPS regional facility, Reno NV",
      status: "in_transit",
    },
  },
  {
    number: "SB1005",
    customer: "sara",
    email: "sara@example.com",
    status: "delivered",
    placedAgoMs: 10 * DAY,
    items: [
      { handle: "mesa-serving-bowl", key: "default", qty: 1 },
      { handle: "ember-soy-candle", key: "cedar", qty: 1 },
    ],
    card: VISA,
    address: SARA_ADDRESS,
    shipment: {
      carrier: "UPS",
      tracking: "1Z999AA10123456785",
      shippedAgoDays: 9,
      etaInDays: -6,
      deliveredAgoDays: 6,
      lastEventAgoDays: 6,
      lastEvent: "Delivered - front porch",
      status: "delivered",
    },
  },
  {
    number: "SB1006",
    customer: "sara",
    email: "sara@example.com",
    status: "delivered",
    placedAgoMs: 50 * DAY,
    items: [{ handle: "haven-cotton-towels", key: "white", qty: 1 }],
    card: VISA,
    address: SARA_ADDRESS,
    shipment: {
      carrier: "UPS",
      tracking: "1Z999AA10123456786",
      shippedAgoDays: 48,
      etaInDays: -45,
      deliveredAgoDays: 45,
      lastEventAgoDays: 45,
      lastEvent: "Delivered - front door",
      status: "delivered",
    },
  },
  {
    number: "SB1007",
    customer: "sara",
    email: "sara@example.com",
    status: "cancelled",
    placedAgoMs: 11 * DAY,
    items: [{ handle: "terra-planter", key: "medium", qty: 1 }],
    card: VISA,
    address: SARA_ADDRESS,
    cancelledAgoDays: 10,
    refund: { reason: "order_cancelled", agoDays: 10 },
  },
  {
    number: "SB1008",
    customer: null,
    email: "guest@example.com",
    status: "delivered",
    placedAgoMs: 8 * DAY,
    items: [{ handle: "linen-throw-blanket", key: "oat", qty: 1 }],
    card: { brand: "Visa", last4: "1881" },
    address: GUEST_ADDRESS,
    duplicatePayment: true,
    shipment: {
      carrier: "USPS",
      tracking: "9400111899223197428501",
      shippedAgoDays: 7,
      etaInDays: -4,
      deliveredAgoDays: 4,
      lastEventAgoDays: 4,
      lastEvent: "Delivered - mailbox",
      status: "delivered",
    },
  },
  {
    number: "SB1009",
    customer: "omar",
    email: "omar@example.com",
    status: "shipped",
    placedAgoMs: 9 * DAY,
    items: [
      { handle: "linen-throw-blanket", key: "oat", qty: 1 },
      { handle: "terra-planter", key: "small", qty: 1 },
    ],
    card: { brand: "Mastercard", last4: "0005" },
    address: OMAR_ADDRESS,
    shipment: {
      carrier: "UPS",
      tracking: "1Z999AA10123456790",
      shippedAgoDays: 8,
      etaInDays: -3,
      lastEventAgoDays: 7,
      lastEvent: "In transit - departed UPS facility, Fresno CA",
      status: "in_transit",
    },
  },
  // History: Sara's earlier delivered orders.
  ...(
    [
      ["SB0901", 120, "terra-planter", "large"],
      ["SB0902", 210, "haven-cotton-towels", "clay"],
      ["SB0903", 330, "kiln-dinner-plates", "slate"],
    ] as const
  ).map(
    ([number, ago, handle, key]): SeedOrder => ({
      number,
      customer: "sara",
      email: "sara@example.com",
      status: "delivered",
      placedAgoMs: ago * DAY,
      items: [{ handle, key, qty: 1 }],
      card: VISA,
      address: SARA_ADDRESS,
      shipment: {
        carrier: "UPS",
        tracking: `1Z999AA1${number.slice(2)}000001`,
        shippedAgoDays: ago - 1,
        etaInDays: -(ago - 5),
        deliveredAgoDays: ago - 5,
        lastEventAgoDays: ago - 5,
        lastEvent: "Delivered",
        status: "delivered",
      },
    }),
  ),
  // History: Omar's three prior "not received" claims, all refunded.
  ...(
    [
      ["SB0951", 250, "aria-stoneware-mug", "sand"],
      ["SB0952", 150, "mesa-serving-bowl", "default"],
      ["SB0953", 60, "dune-pour-over-set", "default"],
    ] as const
  ).map(
    ([number, ago, handle, key]): SeedOrder => ({
      number,
      customer: "omar",
      email: "omar@example.com",
      status: "shipped",
      placedAgoMs: ago * DAY,
      items: [{ handle, key, qty: 1 }],
      card: { brand: "Mastercard", last4: "0005" },
      address: OMAR_ADDRESS,
      shipment: {
        carrier: "UPS",
        tracking: `1Z999AA1${number.slice(2)}000002`,
        shippedAgoDays: ago - 1,
        etaInDays: -(ago - 6),
        lastEventAgoDays: ago - 3,
        lastEvent: "In transit",
        status: "in_transit",
      },
      refund: { reason: "not_received", agoDays: ago - 12 },
    }),
  ),
];

export function seedStore(db: SqlDb, now: Date): void {
  const t = now.getTime();
  const iso = (ms: number) => new Date(ms).toISOString();
  const created = iso(t - 400 * DAY);

  SEED_PRODUCTS.forEach((p, index) => {
    run(
      db,
      `INSERT INTO products (id, handle, title, description, product_type, status, is_returnable, image, position, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
      productId(p.handle),
      p.handle,
      p.title,
      p.description,
      p.type,
      p.returnable ? 1 : 0,
      `/images/products/${p.handle}.svg`,
      index,
      created,
    );
    p.variants.forEach((v, vi) => {
      run(
        db,
        `INSERT INTO product_variants (id, product_id, sku, title, price_cents, inventory_quantity, position, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        variantId(p.handle, v.key),
        productId(p.handle),
        skuFor(p.handle, v.key),
        v.title,
        v.price * 100,
        v.stock,
        vi,
      );
    });
  });

  run(
    db,
    `INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    "cus_sara",
    "sara@example.com",
    "Sara",
    "Ahmed",
    "+1 503 555 0142",
    iso(t - 700 * DAY),
  );
  run(
    db,
    `INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    "cus_omar",
    "omar@example.com",
    "Omar",
    "Khan",
    "+1 510 555 0199",
    iso(t - 300 * DAY),
  );

  for (const o of SEED_ORDERS) {
    const orderId = `ord_${o.number.toLowerCase()}`;
    const placed = t - o.placedAgoMs;
    let subtotal = 0;
    const items = o.items.map((it, idx) => {
      const product = SEED_PRODUCTS.find((p) => p.handle === it.handle);
      const variant = product?.variants.find((v) => v.key === it.key);
      if (!product || !variant) throw new Error(`seed: unknown ${it.handle}/${it.key}`);
      const unit = variant.price * 100;
      subtotal += unit * it.qty;
      return { idx, product, variant, unit, qty: it.qty, handle: it.handle, key: it.key };
    });
    const shipping = shippingFor(subtotal);
    const total = subtotal + shipping;
    run(
      db,
      `INSERT INTO orders (id, order_number, customer_id, email, status, currency, subtotal_cents, shipping_cents,
        tax_cents, discount_cents, total_cents, shipping_address, address_changes, cancelled_at, cancel_reason, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'USD', ?, ?, 0, 0, ?, ?, 0, ?, ?, ?, ?)`,
      orderId,
      o.number,
      o.customer ? `cus_${o.customer}` : null,
      o.email,
      o.status,
      subtotal,
      shipping,
      total,
      JSON.stringify(o.address),
      o.cancelledAgoDays !== undefined ? iso(t - o.cancelledAgoDays * DAY) : null,
      o.cancelledAgoDays !== undefined ? "customer_request" : null,
      iso(placed),
      iso(placed),
    );
    for (const it of items) {
      run(
        db,
        `INSERT INTO order_items (id, order_id, product_id, variant_id, title, variant_title, sku, quantity, unit_price_cents, total_cents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `itm_${o.number.toLowerCase()}_${it.idx + 1}`,
        orderId,
        productId(it.handle),
        variantId(it.handle, it.key),
        it.product.title,
        it.variant.title,
        skuFor(it.handle, it.key),
        it.qty,
        it.unit,
        it.unit * it.qty,
      );
    }
    const paymentId = `pay_${o.number.toLowerCase()}_1`;
    run(
      db,
      `INSERT INTO payments (id, order_id, provider, provider_ref, amount_cents, status, method_brand, method_last4, created_at)
       VALUES (?, ?, 'demo_card', ?, ?, 'captured', ?, ?, ?)`,
      paymentId,
      orderId,
      `ch_${o.number.toLowerCase()}a`,
      total,
      o.card.brand,
      o.card.last4,
      iso(placed + 60_000),
    );
    if (o.duplicatePayment) {
      run(
        db,
        `INSERT INTO payments (id, order_id, provider, provider_ref, amount_cents, status, method_brand, method_last4, created_at)
         VALUES (?, ?, 'demo_card', ?, ?, 'captured', ?, ?, ?)`,
        `pay_${o.number.toLowerCase()}_2`,
        orderId,
        `ch_${o.number.toLowerCase()}b`,
        total,
        o.card.brand,
        o.card.last4,
        iso(placed + 95_000),
      );
    }
    if (o.shipment) {
      const s = o.shipment;
      run(
        db,
        `INSERT INTO shipments (id, order_id, carrier, tracking_number, tracking_url, status, shipped_at,
          estimated_delivery_at, delivered_at, last_event_at, last_event_description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `shp_${o.number.toLowerCase()}`,
        orderId,
        s.carrier,
        s.tracking,
        trackingUrl(s.carrier, s.tracking),
        s.status,
        iso(t - s.shippedAgoDays * DAY),
        iso(t + s.etaInDays * DAY),
        s.deliveredAgoDays !== undefined ? iso(t - s.deliveredAgoDays * DAY) : null,
        iso(t - s.lastEventAgoDays * DAY),
        s.lastEvent,
      );
    }
    if (o.refund) {
      run(
        db,
        `INSERT INTO refunds (id, order_id, payment_id, amount_cents, currency, reason, status, initiated_by, created_at, processed_at)
         VALUES (?, ?, ?, ?, 'USD', ?, 'succeeded', 'staff', ?, ?)`,
        `ref_${o.number.toLowerCase()}`,
        orderId,
        paymentId,
        total,
        o.refund.reason,
        iso(t - o.refund.agoDays * DAY),
        iso(t - (o.refund.agoDays - 2) * DAY),
      );
    }
  }
}
