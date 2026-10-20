// Types for the Saba support backend contract (Cloudflare Worker, /v1/*).
// Everything coming from the network is treated as possibly partial; UI code
// reads optional fields defensively.

export interface Variant {
  id: string;
  sku: string;
  title: string;
  price: number;
  inventory_quantity: number;
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  product_type: string;
  price: number;
  currency: "USD" | string;
  image: string;
  is_returnable: boolean;
  variants: Variant[];
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
}

export interface CreateOrderBody {
  email: string;
  first_name: string;
  last_name: string;
  items: { variant_id: string; quantity: number }[];
  shipping_address: Address;
}

export interface CreateOrderResponse {
  order_number: string;
  total: number;
  currency: string;
}

export type VerificationLevel = "L0" | "L1" | "L2";

export interface Verification {
  level: VerificationLevel;
  customer_first_name?: string;
}

export type ConversationState = "active" | "awaiting_confirmation" | "escalated" | "closed";

// ---- UI payloads ----------------------------------------------------------

export interface OrderCardItem {
  title: string;
  variant_title?: string;
  quantity: number;
  unit_price: number;
  image?: string;
}

export interface OrderCardUi {
  type: "order_card";
  order_number: string;
  status_label: string;
  placed_at?: string;
  items?: OrderCardItem[];
  total?: number;
  currency?: string;
  tracking_url?: string;
  carrier?: string;
  eta?: string;
  shipping_address_summary?: string;
}

export interface OrderPickerUi {
  type: "order_picker";
  orders: { order_number: string; placed_at?: string; total?: number; status_label?: string }[];
}

export interface VerificationFormUi {
  type: "verification_form";
  fields?: unknown;
}

export interface ActionConfirmationUi {
  type: "action_confirmation";
  proposal_id: string;
  title: string;
  lines?: string[];
  confirm_label?: string;
  decline_label?: string;
  expires_at?: string;
}

export interface QuickRepliesUi {
  type: "quick_replies";
  options: { label: string; value: string }[];
}

export interface EscalationNoticeUi {
  type: "escalation_notice";
  reference: string;
  sla_text?: string;
}

export interface ProductCardUi {
  type: "product_card";
  products: { handle: string; title: string; price: number; image?: string }[];
}

export interface ResolutionUi {
  type: "resolution";
  title: string;
  lines?: string[];
  reference?: string;
}

export interface CsatPromptUi {
  type: "csat_prompt";
  scale?: number;
}

export type KnownUi =
  | OrderCardUi
  | OrderPickerUi
  | VerificationFormUi
  | ActionConfirmationUi
  | QuickRepliesUi
  | EscalationNoticeUi
  | ProductCardUi
  | ResolutionUi
  | CsatPromptUi;

/** Anything the server sends. Unknown types are ignored by the renderer. */
export type UiPayload = KnownUi | { type: string; [key: string]: unknown };

export interface Message {
  id: string;
  role: "assistant" | "customer" | "system";
  text: string;
  created_at: string;
  ui?: UiPayload[];
}

// ---- Trace ----------------------------------------------------------------

export type DecisionOutcome = "auto_approve" | "human_review" | "deny";

export interface TraceDecision {
  type: string;
  outcome: DecisionOutcome | string;
  probabilities?: Record<string, number>;
  thresholds?: Record<string, number>;
  hard_rule?: string | null;
  policy_version?: string;
}

export interface Trace {
  mood?: { label: string; p_frustrated_or_worse: number; trend?: string | null } | null;
  intent?: { label: string; confidence: number } | null;
  wants_human?: number | null;
  drex?: { request_ids?: string[]; degraded?: boolean; latency_ms?: number } | null;
  tools?: { name: string; args_summary?: string; display?: string; ms?: number }[];
  decision?: TraceDecision | null;
  llm?: { model?: string; latency_ms?: number; input_tokens?: number; output_tokens?: number } | null;
}

export interface ConversationCreated {
  conversation_id: string;
  client_token: string;
  state: ConversationState;
  verification: Verification;
  messages: Message[];
}

export interface ConversationSnapshot {
  conversation_id: string;
  state: ConversationState;
  verification: Verification;
  messages: Message[];
}

export interface TurnResponse {
  state: ConversationState;
  verification: Verification;
  messages: Message[];
  trace?: Trace | null;
}

export type ChatAction =
  | { type: "confirm"; proposal_id: string }
  | { type: "decline"; proposal_id: string }
  | { type: "quick_reply"; value: string };

export interface SendMessageBody {
  client_message_id: string;
  text?: string;
  action?: ChatAction;
}

// ---- Demo / admin ---------------------------------------------------------

export interface DemoScenario {
  id: string;
  title: string;
  description?: string;
  order_number?: string;
  email?: string;
  prompt: string;
  expected?: string;
}

export interface ActivityDecision {
  id?: string;
  type?: string;
  order_number?: string;
  outcome?: string;
  probabilities?: Record<string, number>;
  thresholds?: Record<string, number>;
  hard_rule?: string | null;
  created_at?: string;
}

export interface ActivityEscalation {
  reference?: string;
  reason?: string;
  order_number?: string;
  created_at?: string;
}

export interface Activity {
  decisions?: ActivityDecision[];
  escalations?: ActivityEscalation[];
  audit?: { event?: string; created_at?: string; [key: string]: unknown }[];
}
