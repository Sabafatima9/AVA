/** Public API contract shared with the storefront (SRS §6.1, demo contract). */

export type VerificationLevel = "L0" | "L1" | "L2";

export interface VerificationView {
  level: VerificationLevel;
  customer_first_name?: string;
}

export type ConversationState =
  | "active"
  | "awaiting_confirmation"
  | "escalated"
  | "closed";

export interface OrderCardItem {
  title: string;
  variant_title: string;
  quantity: number;
  unit_price: number;
  image: string;
}

export type UiPayload =
  | {
      type: "order_card";
      order_number: string;
      status_label: string;
      placed_at: string;
      items: OrderCardItem[];
      total: number;
      currency: string;
      tracking_url?: string;
      carrier?: string;
      eta?: string;
      shipping_address_summary?: string;
    }
  | {
      type: "order_picker";
      orders: {
        order_number: string;
        placed_at: string;
        total: number;
        status_label: string;
      }[];
    }
  | { type: "verification_form"; fields: ["order_number", "email"] }
  | {
      type: "action_confirmation";
      proposal_id: string;
      title: string;
      lines: string[];
      confirm_label: string;
      decline_label: string;
      expires_at: string;
    }
  | { type: "quick_replies"; options: { label: string; value: string }[] }
  | { type: "escalation_notice"; reference: string; sla_text: string }
  | {
      type: "product_card";
      products: { handle: string; title: string; price: number; image: string }[];
    }
  | { type: "resolution"; title: string; lines: string[]; reference?: string }
  | { type: "csat_prompt"; scale: 5 };

export interface Message {
  id: string;
  role: "assistant" | "customer" | "system";
  text: string;
  created_at: string;
  ui: UiPayload[];
}

export type DecisionOutcome = "auto_approve" | "human_review" | "deny";

export interface TraceDecision {
  type: string;
  outcome: DecisionOutcome;
  probabilities: Record<string, number>;
  thresholds: Record<string, number>;
  hard_rule?: string;
  policy_version: string;
}

export interface Trace {
  mood: {
    label: "calm" | "neutral" | "frustrated" | "angry";
    p_frustrated_or_worse: number;
    trend?: "up" | "down" | "flat";
  } | null;
  intent: { label: string; confidence: number } | null;
  wants_human: number | null;
  drex: { request_ids: string[]; degraded: boolean; latency_ms: number };
  tools: { name: string; args_summary: string; display: string; ms: number }[];
  decision: TraceDecision | null;
  llm: {
    model: string;
    latency_ms: number;
    input_tokens?: number;
    output_tokens?: number;
  };
}

export interface TurnResponse {
  state: ConversationState;
  verification: VerificationView;
  messages: Message[];
  trace: Trace;
}

export interface ProductVariantView {
  id: string;
  sku: string;
  title: string;
  price: number;
  inventory_quantity: number;
}

export interface ProductView {
  id: string;
  handle: string;
  title: string;
  description: string;
  product_type: string;
  price: number;
  currency: "USD";
  image: string;
  is_returnable: boolean;
  variants: ProductVariantView[];
}
