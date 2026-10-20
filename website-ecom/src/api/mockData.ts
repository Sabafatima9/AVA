import type { ActivityDecision, ActivityEscalation, DemoScenario, Product } from "./types";

// Mirrors the products the backend seeds. Used only in mock mode.

function v(id: string, sku: string, title: string, price: number, qty: number) {
  return { id, sku, title, price, inventory_quantity: qty };
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod_aria",
    handle: "aria-stoneware-mug",
    title: "Aria Stoneware Mug",
    description:
      "A wheel-thrown mug with a generous handle and a satin glaze that pools at the rim. Holds a proper 12 oz pour and keeps it warm while you get to it.",
    product_type: "Drinkware",
    price: 28,
    currency: "USD",
    image: "/images/products/aria-stoneware-mug.svg",
    is_returnable: true,
    variants: [v("var_aria_sand", "SB-ARIA-SAND", "Sand", 28, 24), v("var_aria_charcoal", "SB-ARIA-CHAR", "Charcoal", 28, 12)],
  },
  {
    id: "prod_dune",
    handle: "dune-pour-over-set",
    title: "Dune Pour-Over Set",
    description:
      "A ceramic dripper, matching carafe and two cups. The ribbed cone keeps the flow even, so a slow Sunday brew tastes the same every time.",
    product_type: "Drinkware",
    price: 64,
    currency: "USD",
    image: "/images/products/dune-pour-over-set.svg",
    is_returnable: true,
    variants: [v("var_dune_default", "SB-DUNE", "Default Title", 64, 8)],
  },
  {
    id: "prod_linen",
    handle: "linen-throw-blanket",
    title: "Linen Throw Blanket",
    description:
      "Stonewashed European linen, soft from the first night and softer every wash after. Finished with a hand-knotted fringe.",
    product_type: "Textiles",
    price: 120,
    currency: "USD",
    image: "/images/products/linen-throw-blanket.svg",
    is_returnable: true,
    variants: [v("var_linen_oat", "SB-LINEN-OAT", "Oat", 120, 6), v("var_linen_sage", "SB-LINEN-SAGE", "Sage", 120, 0)],
  },
  {
    id: "prod_terra",
    handle: "terra-planter",
    title: "Terra Planter",
    description:
      "Unglazed terracotta that breathes, with a matching saucer and a drainage hole. Three sizes, from windowsill herbs to a fiddle-leaf fig.",
    product_type: "Planters",
    price: 42,
    currency: "USD",
    image: "/images/products/terra-planter.svg",
    is_returnable: true,
    variants: [
      v("var_terra_s", "SB-TERRA-S", "Small", 42, 15),
      v("var_terra_m", "SB-TERRA-M", "Medium", 58, 9),
      v("var_terra_l", "SB-TERRA-L", "Large", 78, 4),
    ],
  },
  {
    id: "prod_ember",
    handle: "ember-soy-candle",
    title: "Ember Soy Candle",
    description:
      "Hand-poured soy wax in a reusable stoneware vessel. Around 50 hours of slow, clean burn. Candles are final sale.",
    product_type: "Home Fragrance",
    price: 34,
    currency: "USD",
    image: "/images/products/ember-soy-candle.svg",
    is_returnable: false,
    variants: [v("var_ember_cedar", "SB-EMBER-CEDAR", "Cedar", 34, 30), v("var_ember_fig", "SB-EMBER-FIG", "Fig", 34, 18)],
  },
  {
    id: "prod_kiln",
    handle: "kiln-dinner-plates",
    title: "Kiln Dinner Plates, Set of 4",
    description:
      "Everyday plates with a raw stoneware edge and a glaze that varies slightly from plate to plate. Dishwasher and microwave safe.",
    product_type: "Tableware",
    price: 88,
    currency: "USD",
    image: "/images/products/kiln-dinner-plates.svg",
    is_returnable: true,
    variants: [v("var_kiln_bone", "SB-KILN-BONE", "Bone", 88, 10), v("var_kiln_slate", "SB-KILN-SLATE", "Slate", 88, 3)],
  },
  {
    id: "prod_mesa",
    handle: "mesa-serving-bowl",
    title: "Mesa Serving Bowl",
    description:
      "A wide, low bowl for salads, fruit or a pile of warm bread. The glaze breaks to bare clay at the rim.",
    product_type: "Tableware",
    price: 56,
    currency: "USD",
    image: "/images/products/mesa-serving-bowl.svg",
    is_returnable: true,
    variants: [v("var_mesa_default", "SB-MESA", "Default Title", 56, 11)],
  },
  {
    id: "prod_haven",
    handle: "haven-cotton-towels",
    title: "Haven Cotton Towel Set",
    description:
      "Two bath towels and two hand towels in long-staple Turkish cotton. Thick enough to feel generous, light enough to dry fast.",
    product_type: "Textiles",
    price: 72,
    currency: "USD",
    image: "/images/products/haven-cotton-towels.svg",
    is_returnable: true,
    variants: [v("var_haven_white", "SB-HAVEN-WHITE", "White", 72, 20), v("var_haven_clay", "SB-HAVEN-CLAY", "Clay", 72, 7)],
  },
];

export const MOCK_SCENARIOS: DemoScenario[] = [
  {
    id: "track",
    title: "Where is my order?",
    description: "A verified customer asks about a shipped order. Ava looks it up and shows live tracking.",
    order_number: "SB1002",
    email: "sara@example.com",
    prompt: "Hi, where is my order? It's been a few days.",
    expected: "Ava verifies Sara, then shows an order card with carrier, ETA and a tracking link.",
  },
  {
    id: "cancel",
    title: "Cancel before it ships",
    description: "The order hasn't shipped yet. Drex weighs the request and Ava asks before changing anything.",
    order_number: "SB1003",
    email: "sara@example.com",
    prompt: "Please cancel my order, I picked the wrong colour.",
    expected: "Drex auto-approves. Ava shows a confirmation card, then cancels and refunds on confirm.",
  },
  {
    id: "address",
    title: "Change the shipping address",
    description: "Customer moved. Address changes are a common takeover vector, so Drex checks the risk first.",
    order_number: "SB1005",
    email: "sara@example.com",
    prompt: "I just moved. Can you send it to 48 Orchard St, Brooklyn, NY 11211 instead?",
    expected: "Low takeover risk, auto-approved. Ava confirms the new address before saving it.",
  },
  {
    id: "final-sale",
    title: "Return a final-sale candle",
    description: "Candles are not returnable. A hard rule applies no matter what the model says.",
    order_number: "SB1004",
    email: "sara@example.com",
    prompt: "I'd like to return the candle I bought.",
    expected: "Denied by hard rule. Ava explains kindly and offers alternatives.",
  },
  {
    id: "duplicate",
    title: "Charged twice",
    description: "A guest checkout was charged two times. Ava confirms the duplicate and refunds it.",
    order_number: "SB1008",
    email: "guest@example.com",
    prompt: "I was charged twice for my order!",
    expected: "Duplicate charge detected with high probability. Refund auto-approved after confirmation.",
  },
  {
    id: "not-received",
    title: "Package never arrived",
    description: "A not-received claim from an account with a high claim history.",
    order_number: "SB1009",
    email: "omar@example.com",
    prompt: "My package never arrived. I want a refund.",
    expected: "Probability below the auto-approve threshold, so Ava hands it to a human with a reference.",
  },
  {
    id: "frustrated",
    title: "Frustrated, wants a person",
    description: "No order details, just frustration. Mood and wants-human signals drive the handoff.",
    prompt: "This is ridiculous, I've asked three times already. Get me a real person.",
    expected: "Mood reads frustrated, wants-human is high. Ava hands off right away.",
  },
];

export function seedActivity(): { decisions: ActivityDecision[]; escalations: ActivityEscalation[] } {
  const now = Date.now();
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();
  return {
    decisions: [
      {
        id: "dec_seed_1",
        type: "start_return",
        order_number: "SB1001",
        outcome: "auto_approve",
        probabilities: { p_eligible: 0.93, p_abuse: 0.04 },
        thresholds: { p_eligible: 0.8, p_abuse: 0.2 },
        created_at: ago(14),
      },
      {
        id: "dec_seed_2",
        type: "not_received_claim",
        order_number: "SB1009",
        outcome: "human_review",
        probabilities: { p_genuine_claim: 0.57, p_abuse: 0.38 },
        thresholds: { p_genuine_claim: 0.8, p_abuse: 0.2 },
        created_at: ago(31),
      },
    ],
    escalations: [{ reference: "ESC-4821", reason: "not_received_high_risk", order_number: "SB1009", created_at: ago(31) }],
  };
}
