/**
 * SQLite schema for the Durable Object. Reference store tables follow SRS §7.2
 * (money in integer cents, timestamps as ISO 8601 text); support tables follow
 * SRS §7.3, trimmed for the demo.
 */
export const SCHEMA_VERSION = 1;

export const STORE_TABLES = [
  "customers",
  "products",
  "product_variants",
  "orders",
  "order_items",
  "shipments",
  "payments",
  "refunds",
  "returns",
  "discount_codes",
] as const;

export const SUPPORT_TABLES = [
  "conversations",
  "messages",
  "signals",
  "decisions",
  "proposals",
  "tool_calls",
  "audit_log",
  "escalations",
  "verification_attempts",
  "rate_limits",
] as const;

export const DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, first_name TEXT, last_name TEXT,
    phone TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, handle TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
    description TEXT NOT NULL, product_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
    is_returnable INTEGER NOT NULL DEFAULT 1, image TEXT NOT NULL, position INTEGER NOT NULL,
    created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY, product_id TEXT NOT NULL, sku TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
    price_cents INTEGER NOT NULL, inventory_quantity INTEGER NOT NULL, position INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, order_number TEXT NOT NULL UNIQUE, customer_id TEXT, email TEXT NOT NULL,
    status TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', subtotal_cents INTEGER NOT NULL,
    shipping_cents INTEGER NOT NULL, tax_cents INTEGER NOT NULL DEFAULT 0,
    discount_cents INTEGER NOT NULL DEFAULT 0, total_cents INTEGER NOT NULL,
    shipping_address TEXT NOT NULL, address_changes INTEGER NOT NULL DEFAULT 0,
    replacement_for TEXT, cancelled_at TEXT, cancel_reason TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS orders_email ON orders(lower(email))`,
  `CREATE INDEX IF NOT EXISTS orders_customer ON orders(customer_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL, product_id TEXT NOT NULL, variant_id TEXT NOT NULL,
    title TEXT NOT NULL, variant_title TEXT NOT NULL, sku TEXT NOT NULL, quantity INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL, total_cents INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS order_items_order ON order_items(order_id)`,
  `CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL, carrier TEXT NOT NULL, tracking_number TEXT NOT NULL,
    tracking_url TEXT NOT NULL, status TEXT NOT NULL, shipped_at TEXT, estimated_delivery_at TEXT,
    delivered_at TEXT, last_event_at TEXT, last_event_description TEXT)`,
  `CREATE INDEX IF NOT EXISTS shipments_order ON shipments(order_id)`,
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL, provider TEXT NOT NULL, provider_ref TEXT NOT NULL,
    amount_cents INTEGER NOT NULL, status TEXT NOT NULL, method_brand TEXT NOT NULL,
    method_last4 TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS payments_order ON payments(order_id)`,
  `CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL, payment_id TEXT, amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD', reason TEXT NOT NULL, status TEXT NOT NULL,
    initiated_by TEXT NOT NULL, support_decision_id TEXT, created_at TEXT NOT NULL, processed_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS refunds_order ON refunds(order_id)`,
  `CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL, rma_number TEXT NOT NULL UNIQUE, status TEXT NOT NULL,
    reason TEXT NOT NULL, items TEXT NOT NULL, resolution TEXT NOT NULL, initiated_by TEXT NOT NULL,
    support_decision_id TEXT, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS returns_order ON returns(order_id)`,
  `CREATE TABLE IF NOT EXISTS discount_codes (
    id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, value INTEGER NOT NULL,
    max_discount_cents INTEGER, customer_id TEXT, email TEXT, max_uses INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, token_expires_at TEXT NOT NULL,
    state TEXT NOT NULL, channel TEXT NOT NULL, locale TEXT, page_url TEXT, ip_hash TEXT,
    verification_level TEXT NOT NULL DEFAULT 'L0', customer_id TEXT, verified_email TEXT,
    verified_first_name TEXT, verified_orders TEXT NOT NULL DEFAULT '[]', slots TEXT NOT NULL DEFAULT '{}',
    turn_count INTEGER NOT NULL DEFAULT 0, stall_counter INTEGER NOT NULL DEFAULT 0,
    high_frustration_streak INTEGER NOT NULL DEFAULT 0, abusive_count INTEGER NOT NULL DEFAULT 0,
    escalation_reference TEXT, csat_rating INTEGER, csat_comment TEXT, turn_lock_until INTEGER,
    created_at TEXT NOT NULL, last_activity_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, seq INTEGER NOT NULL, role TEXT NOT NULL,
    text TEXT NOT NULL, ui TEXT NOT NULL DEFAULT '[]', client_message_id TEXT, response TEXT,
    created_at TEXT NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS messages_client ON messages(conversation_id, client_message_id)`,
  `CREATE INDEX IF NOT EXISTS messages_seq ON messages(conversation_id, seq)`,
  `CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, message_id TEXT NOT NULL,
    question_set_version TEXT NOT NULL, model TEXT NOT NULL, drex_request_id TEXT, answers TEXT NOT NULL,
    intent TEXT, intent_confidence REAL, frustration_score REAL, p_frustrated_plus REAL, p_angry REAL,
    urgency_score REAL, wants_human REAL, repeat_contact REAL, issue_resolved REAL,
    injection_attempt REAL, abusive REAL, threatens_escalation REAL, needs_human_judgment REAL,
    confirms_pending_action REAL, input_tokens INTEGER, round_trip_ms INTEGER,
    degraded INTEGER NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS signals_conv ON signals(conversation_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, decision_type TEXT NOT NULL,
    order_number TEXT, policy_version TEXT NOT NULL, state_schema_version TEXT, facts TEXT NOT NULL,
    hard_rules TEXT NOT NULL, drex_questions TEXT, drex_response TEXT, drex_request_id TEXT,
    model TEXT, probabilities TEXT NOT NULL, thresholds TEXT NOT NULL, outcome TEXT NOT NULL,
    reason_codes TEXT NOT NULL, amount_cents INTEGER, degraded INTEGER NOT NULL,
    created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, decision_id TEXT, action_type TEXT NOT NULL,
    order_number TEXT, params TEXT NOT NULL, summary TEXT NOT NULL, status TEXT NOT NULL,
    result TEXT, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, resolved_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS proposals_conv ON proposals(conversation_id, status)`,
  `CREATE TABLE IF NOT EXISTS tool_calls (
    id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, message_id TEXT, tool TEXT NOT NULL,
    args TEXT NOT NULL, result TEXT NOT NULL, status TEXT NOT NULL, latency_ms INTEGER NOT NULL,
    created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, actor TEXT NOT NULL,
    conversation_id TEXT, event TEXT NOT NULL, entity_type TEXT, entity_id TEXT, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS escalations (
    id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE, conversation_id TEXT NOT NULL,
    trigger TEXT NOT NULL, priority TEXT NOT NULL, status TEXT NOT NULL, reason TEXT,
    handoff TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS verification_attempts (
    id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, success INTEGER NOT NULL,
    order_number_hash TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT NOT NULL, window_start INTEGER NOT NULL, count INTEGER NOT NULL,
    PRIMARY KEY (key, window_start))`,
];
