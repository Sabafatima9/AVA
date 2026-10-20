import type {
  ConversationState,
  Message,
  ProductView,
  Trace,
  TurnResponse,
  UiPayload,
  VerificationLevel,
  VerificationView,
} from "../api/types.js";

export type OrderStatus =
  | "unfulfilled"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface Address {
  first_name?: string;
  last_name?: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
}

export interface Slots {
  order_number?: string;
  preferred_resolution?: string;
  last_agent_request?: string;
}

export interface ConversationRecord {
  id: string;
  state: ConversationState;
  level: VerificationLevel;
  customer_id: string | null;
  verified_email: string | null;
  first_name: string | null;
  verified_orders: string[];
  slots: Slots;
  turn_count: number;
  stall_counter: number;
  high_frustration_streak: number;
  abusive_count: number;
  escalation_reference: string | null;
  created_at: string;
}

export interface HistoryLine {
  role: "customer" | "assistant" | "system";
  text: string;
}

export interface PendingProposal {
  id: string;
  action_type: string;
  order_number: string | null;
  title: string;
  expires_at: string;
}

export interface LastSignal {
  p_frustrated_plus: number | null;
  p_angry: number | null;
  degraded: boolean;
}

export interface TurnContext {
  conversation: ConversationRecord;
  customerMessageId: string;
  history: HistoryLine[];
  pendingProposal: PendingProposal | null;
  lastSignal: LastSignal | null;
}

export type BeginTurnResult =
  | { kind: "replay"; response: TurnResponse }
  | { kind: "busy" }
  | { kind: "closed" }
  | { kind: "started"; context: TurnContext };

export interface SignalRow {
  question_set_version: string;
  model: string;
  drex_request_id: string | null;
  answers: unknown;
  intent: string | null;
  intent_confidence: number | null;
  frustration_score: number | null;
  p_frustrated_plus: number | null;
  p_angry: number | null;
  urgency_score: number | null;
  wants_human: number | null;
  repeat_contact: number | null;
  issue_resolved: number | null;
  injection_attempt: number | null;
  abusive: number | null;
  threatens_escalation: number | null;
  needs_human_judgment: number | null;
  confirms_pending_action: number | null;
  input_tokens: number | null;
  round_trip_ms: number | null;
  degraded: boolean;
}

export interface ToolCallRow {
  tool: string;
  args: unknown;
  result: unknown;
  status: "ok" | "error";
  latency_ms: number;
}

export interface AuditEvent {
  event: string;
  entity_type?: string;
  entity_id?: string;
  data?: unknown;
}

export interface ConversationPatch {
  state?: ConversationState;
  stall_counter?: number;
  high_frustration_streak?: number;
  abusive_count?: number;
  slots?: Slots;
}

export interface FinishTurnInput {
  conversationId: string;
  customerMessageId: string;
  assistantMessages: { text: string; ui: UiPayload[] }[];
  trace: Trace;
  signal: SignalRow | null;
  toolCalls: ToolCallRow[];
  patch: ConversationPatch;
  audit: AuditEvent[];
}

export interface OrderItemDetail {
  id: string;
  product_id: string;
  variant_id: string;
  handle: string;
  title: string;
  variant_title: string;
  sku: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  is_returnable: boolean;
  product_type: string;
  inventory_quantity: number;
  image: string;
  returned_quantity: number;
}

export interface ShipmentDetail {
  carrier: string;
  tracking_number: string;
  tracking_url: string;
  status: string;
  shipped_at: string | null;
  estimated_delivery_at: string | null;
  delivered_at: string | null;
  last_event_at: string | null;
  last_event_description: string | null;
}

export interface PaymentDetail {
  id: string;
  amount_cents: number;
  status: string;
  method_brand: string;
  method_last4: string;
  created_at: string;
}

export interface RefundDetail {
  id: string;
  amount_cents: number;
  reason: string;
  status: string;
  initiated_by: string;
  created_at: string;
  processed_at: string | null;
}

export interface ReturnDetail {
  rma_number: string;
  status: string;
  reason: string;
  resolution: string;
  items: { order_item_id: string; quantity: number }[];
  created_at: string;
}

export interface CustomerHistory {
  account_age_days: number;
  orders: number;
  delivered_orders: number;
  lifetime_spend_cents: number;
  lifetime_spend_band: string;
  refunds_12m: number;
  refund_amount_12m_cents: number;
  not_received_claims_12m: number;
  returns_12m: number;
  ai_refunds_30d_cents: number;
  goodwill_30d: number;
}

export interface OrderFacts {
  order: {
    id: string;
    order_number: string;
    status: OrderStatus;
    customer_id: string | null;
    currency: string;
    subtotal_cents: number;
    shipping_cents: number;
    total_cents: number;
    placed_at: string;
    address_changes: number;
    shipping_address: Address;
    replacement_for: string | null;
    cancelled_at: string | null;
  };
  status_label: string;
  items: OrderItemDetail[];
  shipment: ShipmentDetail | null;
  payments: PaymentDetail[];
  refunds: RefundDetail[];
  returns: ReturnDetail[];
  replacement_orders: string[];
  history: CustomerHistory;
}

export interface OrderSummary {
  order_number: string;
  placed_at: string;
  total: number;
  status_label: string;
}

export type ActionType =
  | "cancel_order"
  | "update_shipping_address"
  | "create_return"
  | "issue_refund"
  | "create_replacement"
  | "issue_goodwill";

export interface DecisionRecordInput {
  decision_type: string;
  order_number: string | null;
  policy_version: string;
  state_schema_version: string | null;
  facts: unknown;
  hard_rules: unknown;
  drex_questions: unknown;
  drex_response: unknown;
  drex_request_id: string | null;
  model: string | null;
  probabilities: Record<string, number>;
  thresholds: Record<string, number>;
  outcome: string;
  reason_codes: string[];
  amount_cents: number | null;
  degraded: boolean;
}

export interface ProposalInput {
  decision_id: string | null;
  action_type: ActionType;
  order_number: string | null;
  params: Record<string, unknown>;
  title: string;
  lines: string[];
  confirm_label: string;
  decline_label: string;
}

export interface ProposalView {
  id: string;
  expires_at: string;
}

export interface Resolution {
  title: string;
  lines: string[];
  reference?: string;
}

export type ResolveProposalResult =
  | { ok: true; status: "executed"; resolution: Resolution; replay: boolean }
  | { ok: true; status: "declined"; title: string }
  | {
      ok: false;
      code: "not_found" | "expired" | "superseded" | "rule_failed" | "already_resolved";
      message: string;
    };

export interface EscalationInput {
  trigger: string;
  priority: "urgent" | "high" | "normal" | "low";
  reason: string;
  handoff: unknown;
  setEscalatedState: boolean;
}

export type VerifyResult =
  | {
      ok: true;
      verification: VerificationView;
      order_number: string;
      card: UiPayload;
    }
  | { ok: false; locked: boolean };

export interface ConversationView {
  conversation_id: string;
  state: ConversationState;
  verification: VerificationView;
  messages: Message[];
}

export interface CheckoutInput {
  email: string;
  first_name: string;
  last_name: string;
  items: { variant_id: string; quantity: number }[];
  shipping_address: Address;
}

export type CheckoutResult =
  | { ok: true; order_number: string; total: number; currency: "USD" }
  | { ok: false; code: "invalid_request" | "out_of_stock"; message: string };

export interface CreateConversationInput {
  id: string;
  tokenHash: string;
  ipHash: string;
  channel: string;
  locale: string | null;
  pageUrl: string | null;
  greeting: { text: string; ui: UiPayload[] };
}

/** Typed RPC surface of the store Durable Object. */
export interface StoreApi {
  ping(): Promise<{ ok: true; seeded_at: string }>;
  reset(): Promise<{ ok: true }>;
  hitRateLimit(
    key: string,
    limit: number,
    windowSec: number,
  ): Promise<{ ok: boolean; retryAfterSec: number }>;
  listProducts(): Promise<ProductView[]>;
  getProduct(handle: string): Promise<ProductView | null>;
  searchProducts(query: string, limit: number): Promise<ProductView[]>;
  findProduct(ref: string): Promise<ProductView | null>;
  placeOrder(input: CheckoutInput): Promise<CheckoutResult>;
  createConversation(input: CreateConversationInput): Promise<ConversationView>;
  authorize(conversationId: string, tokenHash: string): Promise<ConversationRecord | null>;
  getConversationView(conversationId: string): Promise<ConversationView | null>;
  beginTurn(
    conversationId: string,
    clientMessageId: string,
    customerText: string,
  ): Promise<BeginTurnResult>;
  finishTurn(input: FinishTurnInput): Promise<TurnResponse>;
  verifyOrder(
    conversationId: string,
    orderNumber: string,
    email: string,
  ): Promise<VerifyResult>;
  listOrders(conversationId: string): Promise<OrderSummary[] | null>;
  getFacts(conversationId: string, orderNumber: string): Promise<OrderFacts | null>;
  recordDecision(conversationId: string, input: DecisionRecordInput): Promise<{ id: string }>;
  createProposal(conversationId: string, input: ProposalInput): Promise<ProposalView>;
  resolveProposal(
    conversationId: string,
    proposalId: string,
    action: "confirm" | "decline",
  ): Promise<ResolveProposalResult>;
  createEscalation(
    conversationId: string,
    input: EscalationInput,
  ): Promise<{ reference: string; existing: boolean }>;
  submitFeedback(
    conversationId: string,
    rating: number,
    comment: string | null,
  ): Promise<{ ok: boolean }>;
  activity(): Promise<unknown>;
}
