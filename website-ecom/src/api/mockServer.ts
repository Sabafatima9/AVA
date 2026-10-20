// A small scripted stand-in for the backend, used only in mock mode
// (VITE_MOCK=1, or automatically in dev when /v1/products is unreachable).
// It is deliberately simple: keyword routing plus canned Drex-style traces,
// enough to exercise every UI payload type.

import { ApiError } from "./http";
import { MOCK_PRODUCTS, MOCK_SCENARIOS, seedActivity } from "./mockData";
import type {
  Activity,
  ActivityDecision,
  ActivityEscalation,
  ConversationCreated,
  ConversationSnapshot,
  CreateOrderBody,
  CreateOrderResponse,
  DemoScenario,
  Message,
  OrderCardUi,
  Product,
  SendMessageBody,
  Trace,
  TraceDecision,
  TurnResponse,
  UiPayload,
  Verification,
} from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const POLICY = "policy-2026.10.1";
const MODEL = "deepseek/deepseek-v4-flash";

interface MockOrderItem {
  handle: string;
  variant: string;
  qty: number;
}
interface MockOrder {
  number: string;
  email: string;
  status: string;
  placedDaysAgo: number;
  items: MockOrderItem[];
  carrier?: string;
  eta?: string;
  address: string;
}

const ORDERS: MockOrder[] = [
  { number: "SB1001", email: "sara@example.com", status: "Delivered", placedDaysAgo: 21, items: [{ handle: "aria-stoneware-mug", variant: "Sand", qty: 2 }], carrier: "UPS", address: "221 Mercer St, New York, NY 10012" },
  { number: "SB1002", email: "sara@example.com", status: "In transit", placedDaysAgo: 4, items: [{ handle: "kiln-dinner-plates", variant: "Bone", qty: 1 }, { handle: "mesa-serving-bowl", variant: "Default Title", qty: 1 }], carrier: "UPS", eta: "Thursday, Oct 16", address: "221 Mercer St, New York, NY 10012" },
  { number: "SB1003", email: "sara@example.com", status: "Processing", placedDaysAgo: 1, items: [{ handle: "linen-throw-blanket", variant: "Oat", qty: 1 }], address: "221 Mercer St, New York, NY 10012" },
  { number: "SB1004", email: "sara@example.com", status: "Delivered", placedDaysAgo: 12, items: [{ handle: "ember-soy-candle", variant: "Cedar", qty: 1 }], carrier: "USPS", address: "221 Mercer St, New York, NY 10012" },
  { number: "SB1005", email: "sara@example.com", status: "Processing", placedDaysAgo: 2, items: [{ handle: "terra-planter", variant: "Medium", qty: 1 }], address: "221 Mercer St, New York, NY 10012" },
  { number: "SB1006", email: "sara@example.com", status: "Delivered", placedDaysAgo: 40, items: [{ handle: "haven-cotton-towels", variant: "Clay", qty: 1 }], carrier: "FedEx", address: "221 Mercer St, New York, NY 10012" },
  { number: "SB1007", email: "sara@example.com", status: "Shipped", placedDaysAgo: 3, items: [{ handle: "dune-pour-over-set", variant: "Default Title", qty: 1 }], carrier: "FedEx", eta: "Monday, Oct 13", address: "221 Mercer St, New York, NY 10012" },
  { number: "SB1008", email: "guest@example.com", status: "Processing", placedDaysAgo: 1, items: [{ handle: "dune-pour-over-set", variant: "Default Title", qty: 1 }], address: "9 Elm Ave, Portland, OR 97205" },
  { number: "SB1009", email: "omar@example.com", status: "Delivered", placedDaysAgo: 9, items: [{ handle: "haven-cotton-towels", variant: "White", qty: 1 }, { handle: "ember-soy-candle", variant: "Fig", qty: 2 }], carrier: "USPS", address: "1180 Market St, San Francisco, CA 94102" },
];
const FIRST_NAMES: Record<string, string> = { "sara@example.com": "Sara", "guest@example.com": "Alex", "omar@example.com": "Omar" };
let nextOrder = 1010;

function product(handle: string): Product | undefined {
  return MOCK_PRODUCTS.find((p) => p.handle === handle);
}
function unitPrice(it: MockOrderItem): number {
  const p = product(it.handle);
  return p?.variants.find((x) => x.title === it.variant)?.price ?? p?.price ?? 0;
}
function orderTotal(o: MockOrder): number {
  return o.items.reduce((s, it) => s + unitPrice(it) * it.qty, 0);
}
function placedAt(o: MockOrder): string {
  return new Date(Date.now() - o.placedDaysAgo * 86_400_000).toISOString();
}

function orderCard(o: MockOrder): OrderCardUi {
  const card: OrderCardUi = {
    type: "order_card",
    order_number: o.number,
    status_label: o.status,
    placed_at: placedAt(o),
    items: o.items.map((it) => {
      const p = product(it.handle);
      return {
        title: p?.title ?? it.handle,
        variant_title: it.variant,
        quantity: it.qty,
        unit_price: unitPrice(it),
        image: p?.image ?? "",
      };
    }),
    total: orderTotal(o),
    currency: "USD",
    shipping_address_summary: o.address,
  };
  if (o.carrier && o.status !== "Processing") {
    card.carrier = o.carrier;
    card.tracking_url = "https://example.com/track/1Z999AA10123456784";
  }
  if (o.eta) card.eta = o.eta;
  return card;
}

// ---------------------------------------------------------------------------

interface Conv {
  id: string;
  token: string;
  verification: Verification;
  email?: string;
  order?: MockOrder;
  pending?: { id: string; kind: "cancel" | "address" | "duplicate" | "return"; order: MockOrder; expires: number };
  messages: Message[];
  frustration: number;
}
const CONVS = new Map<string, Conv>();
const ACTIVITY = seedActivity();
const DECISIONS: ActivityDecision[] = ACTIVITY.decisions;
const ESCALATIONS: ActivityEscalation[] = ACTIVITY.escalations;

function msg(text: string, ui: UiPayload[] = []): Message {
  return { id: rid("msg"), role: "assistant", text, created_at: new Date().toISOString(), ui };
}

function baseTrace(over: Partial<Trace> = {}): Trace {
  const drexLatency = 280 + Math.round(Math.random() * 420);
  return {
    mood: { label: "neutral", p_frustrated_or_worse: 0.12, trend: "flat" },
    intent: { label: "other", confidence: 0.7 },
    wants_human: 0.06,
    drex: { request_ids: [rid("drx"), rid("drx")], degraded: false, latency_ms: drexLatency },
    tools: [],
    decision: null,
    llm: {
      model: MODEL,
      latency_ms: 900 + Math.round(Math.random() * 1400),
      input_tokens: 1800 + Math.round(Math.random() * 900),
      output_tokens: 90 + Math.round(Math.random() * 120),
    },
    ...over,
  };
}

function recordDecision(d: TraceDecision, order?: string) {
  DECISIONS.unshift({
    id: rid("dec"),
    type: d.type,
    order_number: order,
    outcome: d.outcome,
    probabilities: d.probabilities,
    thresholds: d.thresholds,
    hard_rule: d.hard_rule ?? null,
    created_at: new Date().toISOString(),
  });
}

function escalate(c: Conv, reason: string): Message {
  const reference = `ESC-${4800 + Math.floor(Math.random() * 199)}`;
  ESCALATIONS.unshift({ reference, reason, order_number: c.order?.number, created_at: new Date().toISOString() });
  return msg(
    "I've handed this to our support team with everything we've covered, so you won't need to repeat yourself.",
    [{ type: "escalation_notice", reference, sla_text: "A person from our team will reply by email within 4 business hours." }],
  );
}

function verifyOrder(order_number: string, email: string): MockOrder | undefined {
  const o = ORDERS.find((x) => x.number.toUpperCase() === order_number.trim().toUpperCase());
  if (!o || o.email.toLowerCase() !== email.trim().toLowerCase()) return undefined;
  return o;
}

function turn(c: Conv, messages: Message[], trace: Trace, state?: TurnResponse["state"]): TurnResponse {
  c.messages.push(...messages);
  return {
    state: state ?? (c.pending ? "awaiting_confirmation" : "active"),
    verification: { ...c.verification },
    messages,
    trace,
  };
}

function auth(id: string, token: string | undefined): Conv {
  const c = CONVS.get(id);
  if (!c) throw new ApiError({ status: 404, code: "not_found", message: "Conversation not found" });
  if (c.token !== token) throw new ApiError({ status: 401, code: "unauthorized", message: "Invalid token" });
  return c;
}

const RX = {
  human: /\b(human|person|agent|representative|someone real|real person)\b/i,
  cancel: /\bcancel/i,
  address: /\b(address|moved|send it to|ship it to)\b/i,
  returns: /\b(return|send (it|this) back)\b/i,
  duplicate: /(charged twice|double charge|duplicate|two charges|charged two)/i,
  notReceived: /(never arrived|not received|didn'?t (arrive|receive|get)|hasn'?t arrived|missing package)/i,
  track: /\b(where|track|tracking|status|arrive|delivery|shipped)\b/i,
  products: /\b(recommend|gift|suggest|looking for|show me|browse)\b/i,
  frustrated: /(ridiculous|unacceptable|terrible|worst|angry|furious|three times|!!)/i,
  order: /\bSB\d{4}\b/i,
  email: /[^\s@]+@[^\s@]+\.[^\s@]+/,
};

function respond(c: Conv, text: string): TurnResponse {
  const t = text.trim();
  const frustrated = RX.frustrated.test(t);
  if (frustrated) c.frustration = Math.min(0.95, c.frustration + 0.55);
  else c.frustration = Math.max(0.08, c.frustration - 0.1);
  const mood = {
    label: c.frustration > 0.6 ? "frustrated" : c.frustration > 0.3 ? "concerned" : "neutral",
    p_frustrated_or_worse: Number(c.frustration.toFixed(2)),
    trend: frustrated ? "rising" : "flat",
  };

  // Inline verification: "SB1003 sara@example.com"
  const orderMatch = t.match(RX.order)?.[0];
  const emailMatch = t.match(RX.email)?.[0];
  if (orderMatch && emailMatch && c.verification.level === "L0") {
    const o = verifyOrder(orderMatch, emailMatch);
    if (o) {
      c.verification = { level: "L1", customer_first_name: FIRST_NAMES[o.email] ?? "there" };
      c.email = o.email;
      c.order = o;
    }
  }

  // Explicit order selection
  if (orderMatch && c.verification.level !== "L0" && c.email) {
    const o = ORDERS.find((x) => x.number === orderMatch.toUpperCase() && x.email === c.email);
    if (o) c.order = o;
  }

  const wantsHuman = RX.human.test(t);
  if (wantsHuman || c.frustration > 0.85) {
    return turn(
      c,
      [msg("I'm sorry this has been frustrating. I'm bringing in a person from our team now."), escalate(c, wantsHuman ? "customer_requested" : "frustration")],
      baseTrace({
        mood,
        intent: { label: "talk_to_human", confidence: 0.93 },
        wants_human: wantsHuman ? 0.94 : 0.71,
        tools: [{ name: "create_escalation", args_summary: "reason=customer_requested", display: "Opened a handoff ticket", ms: 142 }],
      }),
      "escalated",
    );
  }

  const needOrder = (intent: string, confidence: number): TurnResponse | null => {
    if (c.verification.level === "L0") {
      return turn(
        c,
        [msg("I can help with that. First, let me make sure it's your order. What's the order number and the email you used at checkout?", [{ type: "verification_form", fields: ["order_number", "email"] }])],
        baseTrace({ mood, intent: { label: intent, confidence }, wants_human: 0.05 }),
      );
    }
    if (!c.order) {
      const mine = ORDERS.filter((o) => o.email === c.email);
      return turn(
        c,
        [msg("Which order is this about?", [{ type: "order_picker", orders: mine.map((o) => ({ order_number: o.number, placed_at: placedAt(o), total: orderTotal(o), status_label: o.status })) }])],
        baseTrace({ mood, intent: { label: intent, confidence }, tools: [{ name: "list_orders", args_summary: `email=${c.email}`, display: `Found ${mine.length} orders`, ms: 88 }] }),
      );
    }
    return null;
  };

  if (RX.duplicate.test(t)) {
    const gate = needOrder("duplicate_charge", 0.95);
    if (gate) return gate;
    const o = c.order as MockOrder;
    const decision: TraceDecision = {
      type: "refund_duplicate_charge",
      outcome: "auto_approve",
      probabilities: { p_duplicate_charge: 0.97, p_fraud: 0.02 },
      thresholds: { p_duplicate_charge: 0.9, p_fraud: 0.15 },
      policy_version: POLICY,
    };
    recordDecision(decision, o.number);
    const pid = rid("prop");
    c.pending = { id: pid, kind: "duplicate", order: o, expires: Date.now() + 10 * 60_000 };
    const amount = orderTotal(o);
    return turn(
      c,
      [
        msg(`You're right, I can see **two identical charges of $${amount.toFixed(2)}** on ${o.number}, a few seconds apart. One of them is a duplicate.`, [
          { type: "action_confirmation", proposal_id: pid, title: "Refund the duplicate charge", lines: [`Order ${o.number}`, `Refund $${amount.toFixed(2)} to the original card`, "Usually arrives in 3–5 business days"], confirm_label: "Refund it", decline_label: "Not now", expires_at: new Date(c.pending.expires).toISOString() },
        ]),
      ],
      baseTrace({
        mood,
        intent: { label: "duplicate_charge", confidence: 0.95 },
        tools: [
          { name: "get_order", args_summary: o.number, display: "Loaded order", ms: 64 },
          { name: "list_payments", args_summary: o.number, display: "2 captures, same amount, 4s apart", ms: 121 },
        ],
        decision,
      }),
    );
  }

  if (RX.notReceived.test(t)) {
    const gate = needOrder("not_received", 0.92);
    if (gate) return gate;
    const o = c.order as MockOrder;
    const highRisk = o.email === "omar@example.com";
    const decision: TraceDecision = highRisk
      ? { type: "not_received_claim", outcome: "human_review", probabilities: { p_genuine_claim: 0.58, p_abuse: 0.36 }, thresholds: { p_genuine_claim: 0.8, p_abuse: 0.2 }, policy_version: POLICY }
      : { type: "not_received_claim", outcome: "auto_approve", probabilities: { p_genuine_claim: 0.91, p_abuse: 0.05 }, thresholds: { p_genuine_claim: 0.8, p_abuse: 0.2 }, policy_version: POLICY };
    recordDecision(decision, o.number);
    const tools = [
      { name: "get_order", args_summary: o.number, display: "Loaded order", ms: 58 },
      { name: "get_tracking", args_summary: `${o.carrier ?? "carrier"}`, display: "Carrier shows delivered", ms: 203 },
      { name: "customer_history", args_summary: o.email, display: highRisk ? "3 prior claims in 6 months" : "No prior claims", ms: 77 },
    ];
    if (highRisk) {
      return turn(
        c,
        [msg("I'm sorry your package hasn't turned up. The carrier marked it delivered, so I want a teammate to look at this properly rather than guess."), escalate(c, "not_received_review")],
        baseTrace({ mood: { ...mood, label: "concerned", p_frustrated_or_worse: Math.max(mood.p_frustrated_or_worse, 0.34) }, intent: { label: "not_received", confidence: 0.92 }, wants_human: 0.22, tools, decision }),
        "escalated",
      );
    }
    return turn(
      c,
      [msg("I'm sorry about that. I've filed a not-received claim and we'll send a replacement.", [{ type: "resolution", title: "Claim filed", lines: [`Replacement for ${o.number} ships in 1–2 days`], reference: rid("CLM").toUpperCase() }])],
      baseTrace({ mood, intent: { label: "not_received", confidence: 0.92 }, tools, decision }),
    );
  }

  if (RX.cancel.test(t)) {
    const gate = needOrder("cancel_order", 0.96);
    if (gate) return gate;
    const o = c.order as MockOrder;
    if (o.status !== "Processing") {
      const decision: TraceDecision = { type: "cancel_order", outcome: "deny", probabilities: { p_intent_confirmed: 0.95 }, thresholds: { p_intent_confirmed: 0.85 }, hard_rule: "order_already_shipped", policy_version: POLICY };
      recordDecision(decision, o.number);
      return turn(
        c,
        [msg(`${o.number} has already shipped, so I can't cancel it. Once it arrives I can start a free return for you.`, [{ type: "quick_replies", options: [{ label: "Start a return", value: "start_return" }, { label: "Track it", value: "track" }] }])],
        baseTrace({ mood, intent: { label: "cancel_order", confidence: 0.96 }, tools: [{ name: "get_order", args_summary: o.number, display: `Status: ${o.status}`, ms: 61 }], decision }),
      );
    }
    const decision: TraceDecision = { type: "cancel_order", outcome: "auto_approve", probabilities: { p_intent_confirmed: 0.96, p_fraud: 0.03 }, thresholds: { p_intent_confirmed: 0.85, p_fraud: 0.25 }, policy_version: POLICY };
    recordDecision(decision, o.number);
    const pid = rid("prop");
    c.pending = { id: pid, kind: "cancel", order: o, expires: Date.now() + 10 * 60_000 };
    return turn(
      c,
      [
        msg(`Good news: **${o.number}** hasn't shipped yet, so I can cancel it. Here's what will happen:`, [
          { type: "action_confirmation", proposal_id: pid, title: `Cancel order ${o.number}`, lines: o.items.map((it) => `${it.qty} × ${product(it.handle)?.title ?? it.handle} (${it.variant})`).concat([`Full refund of $${orderTotal(o).toFixed(2)} to your original card`]), confirm_label: "Cancel order", decline_label: "Keep it", expires_at: new Date(c.pending.expires).toISOString() },
        ]),
      ],
      baseTrace({ mood, intent: { label: "cancel_order", confidence: 0.96 }, tools: [{ name: "get_order", args_summary: o.number, display: "Status: unfulfilled", ms: 61 }, { name: "check_cancellable", args_summary: o.number, display: "Not yet picked", ms: 34 }], decision }),
    );
  }

  if (RX.address.test(t)) {
    const gate = needOrder("change_address", 0.91);
    if (gate) return gate;
    const o = c.order as MockOrder;
    const decision: TraceDecision = { type: "change_address", outcome: "auto_approve", probabilities: { p_legitimate_change: 0.91, p_account_takeover: 0.05 }, thresholds: { p_legitimate_change: 0.8, p_account_takeover: 0.2 }, policy_version: POLICY };
    recordDecision(decision, o.number);
    const pid = rid("prop");
    c.pending = { id: pid, kind: "address", order: o, expires: Date.now() + 10 * 60_000 };
    return turn(
      c,
      [
        msg(`${o.number} hasn't shipped, so I can update it. Please check the new address:`, [
          { type: "action_confirmation", proposal_id: pid, title: "Update shipping address", lines: [`From: ${o.address}`, "To: 48 Orchard St, Brooklyn, NY 11211"], confirm_label: "Update address", decline_label: "Cancel", expires_at: new Date(c.pending.expires).toISOString() },
        ]),
      ],
      baseTrace({ mood, intent: { label: "change_address", confidence: 0.91 }, tools: [{ name: "get_order", args_summary: o.number, display: "Status: unfulfilled", ms: 59 }, { name: "validate_address", args_summary: "Brooklyn, NY 11211", display: "Deliverable", ms: 186 }], decision }),
    );
  }

  if (RX.returns.test(t) || t === "start_return") {
    const gate = needOrder("start_return", 0.94);
    if (gate) return gate;
    const o = c.order as MockOrder;
    const finalSale = o.items.every((it) => product(it.handle)?.is_returnable === false);
    if (finalSale) {
      const decision: TraceDecision = { type: "start_return", outcome: "deny", probabilities: { p_eligible: 0.88, p_abuse: 0.04 }, thresholds: { p_eligible: 0.8, p_abuse: 0.2 }, hard_rule: "non_returnable_item", policy_version: POLICY };
      recordDecision(decision, o.number);
      return turn(
        c,
        [msg("I'm sorry, candles are **final sale**, so I can't start a return for this one. If it arrived damaged or isn't burning properly, I can get that looked at.", [{ type: "quick_replies", options: [{ label: "It arrived damaged", value: "damaged" }, { label: "Show me other scents", value: "recommend candles" }, { label: "Talk to a person", value: "human" }] }])],
        baseTrace({ mood, intent: { label: "start_return", confidence: 0.94 }, tools: [{ name: "get_order", args_summary: o.number, display: "1 item, final sale", ms: 63 }], decision }),
      );
    }
    const decision: TraceDecision = { type: "start_return", outcome: "auto_approve", probabilities: { p_eligible: 0.93, p_abuse: 0.04 }, thresholds: { p_eligible: 0.8, p_abuse: 0.2 }, policy_version: POLICY };
    recordDecision(decision, o.number);
    const pid = rid("prop");
    c.pending = { id: pid, kind: "return", order: o, expires: Date.now() + 10 * 60_000 };
    return turn(
      c,
      [msg(`${o.number} is within the 30-day window.`, [{ type: "action_confirmation", proposal_id: pid, title: `Start a return for ${o.number}`, lines: ["Free prepaid label by email", `Refund of $${orderTotal(o).toFixed(2)} once it's scanned`], confirm_label: "Start return", decline_label: "Not now", expires_at: new Date(c.pending.expires).toISOString() }])],
      baseTrace({ mood, intent: { label: "start_return", confidence: 0.94 }, tools: [{ name: "get_order", args_summary: o.number, display: "Delivered 9 days ago", ms: 63 }], decision }),
    );
  }

  if (RX.products.test(t)) {
    const picks = /candle/i.test(t) ? MOCK_PRODUCTS.filter((p) => p.product_type === "Home Fragrance" || p.handle === "aria-stoneware-mug") : MOCK_PRODUCTS.slice(0, 3);
    return turn(
      c,
      [msg("Here are a few pieces people love:", [{ type: "product_card", products: picks.map((p) => ({ handle: p.handle, title: p.title, price: p.price, image: p.image })) }])],
      baseTrace({ mood, intent: { label: "product_question", confidence: 0.88 }, tools: [{ name: "search_products", args_summary: "gift", display: `${picks.length} results`, ms: 47 }] }),
    );
  }

  if (RX.track.test(t) || t === "track" || (orderMatch && c.order)) {
    const gate = needOrder("track_order", 0.93);
    if (gate) return gate;
    const o = c.order as MockOrder;
    const lead = o.eta
      ? `**${o.number}** is on its way with ${o.carrier}. It should arrive **${o.eta}**.`
      : o.status === "Processing"
        ? `**${o.number}** is being packed at the studio and should ship within 1–2 business days.`
        : `**${o.number}** is marked **${o.status.toLowerCase()}**.`;
    return turn(
      c,
      [msg(lead, [orderCard(o), { type: "quick_replies", options: [{ label: "Change address", value: "change address" }, { label: "Cancel order", value: "cancel" }, { label: "That's all, thanks", value: "thanks" }] }])],
      baseTrace({ mood, intent: { label: "track_order", confidence: 0.93 }, tools: [{ name: "get_order", args_summary: o.number, display: `Status: ${o.status}`, ms: 66 }, ...(o.carrier ? [{ name: "get_tracking", args_summary: o.carrier, display: o.eta ? `ETA ${o.eta}` : "Delivered", ms: 214 }] : [])] }),
    );
  }

  if (/\b(thanks|thank you|that's all|thats all)\b/i.test(t)) {
    return turn(c, [msg("You're welcome! Anything else, I'm right here.", [{ type: "csat_prompt", scale: 5 }])], baseTrace({ mood: { ...mood, label: "satisfied" }, intent: { label: "goodbye", confidence: 0.9 } }));
  }

  return turn(
    c,
    [msg("I can track orders, cancel or change them before they ship, start returns and sort out billing problems. What can I do for you?", [{ type: "quick_replies", options: [{ label: "Track an order", value: "track my order" }, { label: "Start a return", value: "start a return" }, { label: "Gift ideas", value: "recommend a gift" }] }])],
    baseTrace({ mood, intent: { label: "other", confidence: 0.61 } }),
  );
}

function respondAction(c: Conv, action: NonNullable<SendMessageBody["action"]>): TurnResponse {
  if (action.type === "quick_reply") {
    const map: Record<string, string> = { human: "talk to a human", damaged: "It arrived damaged, I want a person to look", start_return: "start a return" };
    return respond(c, map[action.value] ?? action.value);
  }
  const p = c.pending;
  if (!p || p.id !== action.proposal_id || p.expires < Date.now()) {
    return turn(c, [msg("That confirmation has expired. Tell me again what you'd like to do and I'll set it up.")], baseTrace({ intent: { label: "confirm", confidence: 0.9 } }));
  }
  c.pending = undefined;
  if (action.type === "decline") {
    return turn(c, [msg("No problem, I haven't changed anything. Is there something else I can help with?")], baseTrace({ intent: { label: "decline", confidence: 0.97 } }));
  }
  const ref = `${p.kind.toUpperCase().slice(0, 3)}-${Math.floor(100000 + Math.random() * 899999)}`;
  const o = p.order;
  const res: Record<typeof p.kind, { title: string; lines: string[]; tool: string; text: string }> = {
    cancel: { title: `Order ${o.number} cancelled`, lines: [`$${orderTotal(o).toFixed(2)} refunded to your original card`, "You'll get an email confirmation shortly"], tool: "cancel_order", text: "Done. Your order is cancelled." },
    address: { title: "Shipping address updated", lines: [`${o.number} will ship to 48 Orchard St, Brooklyn, NY 11211`], tool: "update_shipping_address", text: "All set, the new address is saved." },
    duplicate: { title: "Duplicate charge refunded", lines: [`$${orderTotal(o).toFixed(2)} back to your card in 3–5 business days`], tool: "refund_payment", text: "Done. The duplicate charge has been refunded." },
    return: { title: "Return started", lines: ["Prepaid label sent to your email", "Drop it off within 14 days"], tool: "create_return", text: "Your return is set up." },
  };
  const r = res[p.kind];
  if (p.kind === "cancel") o.status = "Cancelled";
  if (p.kind === "address") o.address = "48 Orchard St, Brooklyn, NY 11211";
  return turn(
    c,
    [msg(r.text, [{ type: "resolution", title: r.title, lines: r.lines, reference: ref }, { type: "csat_prompt", scale: 5 }])],
    baseTrace({ intent: { label: "confirm", confidence: 0.98 }, mood: { label: "satisfied", p_frustrated_or_worse: 0.05, trend: "falling" }, tools: [{ name: r.tool, args_summary: `${o.number} proposal=${p.id.slice(0, 9)}`, display: "Executed after customer confirmation", ms: 312 }] }),
  );
}

// ---------------------------------------------------------------------------

export const mockServer = {
  async listProducts(): Promise<{ products: Product[] }> {
    await sleep(250);
    return { products: structuredClone(MOCK_PRODUCTS) };
  },
  async getProduct(handle: string): Promise<{ product: Product }> {
    await sleep(150);
    const p = product(handle);
    if (!p) throw new ApiError({ status: 404, code: "not_found", message: "Product not found" });
    return { product: structuredClone(p) };
  },
  async createOrder(body: CreateOrderBody): Promise<CreateOrderResponse> {
    await sleep(900);
    const number = `SB${nextOrder++}`;
    const items: MockOrderItem[] = body.items.map((it) => {
      const p = MOCK_PRODUCTS.find((x) => x.variants.some((v) => v.id === it.variant_id));
      const variant = p?.variants.find((v) => v.id === it.variant_id);
      return { handle: p?.handle ?? "unknown", variant: variant?.title ?? "", qty: it.quantity };
    });
    const a = body.shipping_address;
    const o: MockOrder = { number, email: body.email.toLowerCase(), status: "Processing", placedDaysAgo: 0, items, address: `${a.line1}, ${a.city}, ${a.region} ${a.postal_code}` };
    ORDERS.push(o);
    FIRST_NAMES[o.email] = FIRST_NAMES[o.email] ?? body.first_name;
    return { order_number: number, total: orderTotal(o), currency: "USD" };
  },
  async createConversation(): Promise<ConversationCreated> {
    await sleep(300);
    const c: Conv = { id: rid("conv"), token: rid("tok"), verification: { level: "L0" }, messages: [], frustration: 0.1 };
    c.messages.push(
      msg("Hi, I'm **Ava**, Saba's assistant. I can look up orders, make changes, start returns and fix billing problems. What can I help with today?", [
        { type: "quick_replies", options: [{ label: "Track an order", value: "track my order" }, { label: "Cancel an order", value: "cancel my order" }, { label: "Start a return", value: "start a return" }, { label: "Talk to a person", value: "human" }] },
      ]),
    );
    CONVS.set(c.id, c);
    return { conversation_id: c.id, client_token: c.token, state: "active", verification: c.verification, messages: [...c.messages] };
  },
  async getConversation(id: string, token: string): Promise<ConversationSnapshot> {
    const c = auth(id, token);
    return { conversation_id: c.id, state: c.pending ? "awaiting_confirmation" : "active", verification: c.verification, messages: [...c.messages] };
  },
  async sendMessage(id: string, token: string, body: SendMessageBody): Promise<TurnResponse> {
    const c = auth(id, token);
    if (body.text) c.messages.push({ id: body.client_message_id, role: "customer", text: body.text, created_at: new Date().toISOString(), ui: [] });
    await sleep(1800 + Math.random() * 2200);
    if (body.action) return respondAction(c, body.action);
    return respond(c, body.text ?? "");
  },
  async verifyOrder(id: string, token: string, order_number: string, email: string): Promise<TurnResponse> {
    const c = auth(id, token);
    await sleep(1400);
    const o = verifyOrder(order_number, email);
    const tools = [{ name: "verify_order_email", args_summary: `${order_number.toUpperCase()} · ${email.replace(/^(.).*(@.*)$/, "$1•••$2")}`, display: o ? "Match" : "No match", ms: 92 }];
    if (!o) {
      return turn(
        c,
        [msg("I couldn't match that order number and email. Please double-check both and try again.", [{ type: "verification_form", fields: ["order_number", "email"] }])],
        baseTrace({ intent: { label: "verify", confidence: 0.99 }, tools }),
      );
    }
    c.verification = { level: "L1", customer_first_name: FIRST_NAMES[o.email] ?? "there" };
    c.email = o.email;
    c.order = o;
    return turn(
      c,
      [msg(`Thanks, ${c.verification.customer_first_name}. You're verified. Here's **${o.number}**:`, [orderCard(o)])],
      baseTrace({ intent: { label: "verify", confidence: 0.99 }, tools: [...tools, { name: "get_order", args_summary: o.number, display: `Status: ${o.status}`, ms: 54 }] }),
    );
  },
  async escalate(id: string, token: string): Promise<TurnResponse> {
    const c = auth(id, token);
    await sleep(900);
    return turn(c, [escalate(c, "customer_requested")], baseTrace({ intent: { label: "talk_to_human", confidence: 1 }, wants_human: 1, tools: [{ name: "create_escalation", args_summary: "reason=customer_requested", display: "Opened a handoff ticket", ms: 131 }] }), "escalated");
  },
  async feedback(id: string, token: string): Promise<{ ok: true }> {
    auth(id, token);
    await sleep(300);
    return { ok: true };
  },
  async scenarios(): Promise<{ scenarios: DemoScenario[] }> {
    await sleep(200);
    return { scenarios: MOCK_SCENARIOS };
  },
  async reset(): Promise<{ ok: true }> {
    await sleep(600);
    const fresh = seedActivity();
    DECISIONS.splice(0, DECISIONS.length, ...fresh.decisions);
    ESCALATIONS.splice(0, ESCALATIONS.length, ...fresh.escalations);
    for (const o of ORDERS) {
      if (o.number === "SB1003" || o.number === "SB1005" || o.number === "SB1008") o.status = "Processing";
      if (o.number === "SB1005") o.address = "221 Mercer St, New York, NY 10012";
    }
    return { ok: true };
  },
  async activity(): Promise<Activity> {
    await sleep(120);
    return { decisions: DECISIONS.slice(0, 20), escalations: ESCALATIONS.slice(0, 10), audit: [] };
  },
};
