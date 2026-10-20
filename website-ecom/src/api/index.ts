// Single entry point for all backend calls.
//
// Mode selection:
//  - VITE_MOCK=1                 → always use the local mock server.
//  - dev build, API unreachable  → probe /v1/products once; fall back to mocks.
//  - production build            → always the real API. Failures surface as
//                                   error states, never silent mocks.

import { ApiError, request } from "./http";
import { mockServer } from "./mockServer";
import type {
  Activity,
  ConversationCreated,
  ConversationSnapshot,
  CreateOrderBody,
  CreateOrderResponse,
  DemoScenario,
  Product,
  SendMessageBody,
  TurnResponse,
} from "./types";

const FORCED_MOCK = import.meta.env.VITE_MOCK === "1" || import.meta.env.VITE_MOCK === "true";
const CAN_AUTO_MOCK = import.meta.env.DEV;

let mockActive = FORCED_MOCK;
const listeners = new Set<(mock: boolean) => void>();

let modeReady: Promise<void> | null = null;
function ensureMode(): Promise<void> {
  if (FORCED_MOCK || !CAN_AUTO_MOCK) return Promise.resolve();
  if (!modeReady) {
    modeReady = request<{ products: Product[] }>("/v1/products")
      .then(() => undefined)
      .catch((err: unknown) => {
        console.info("[saba] /v1/products unavailable in dev, switching to mock data.", err);
        mockActive = true;
        for (const l of listeners) l(true);
      });
  }
  return modeReady;
}

export function isMockMode(): boolean {
  return mockActive;
}
export function onMockModeChange(fn: (mock: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const enc = encodeURIComponent;

export const api = {
  async listProducts(): Promise<Product[]> {
    await ensureMode();
    const res = mockActive ? await mockServer.listProducts() : await request<{ products: Product[] }>("/v1/products");
    return Array.isArray(res.products) ? res.products : [];
  },
  async getProduct(handle: string): Promise<Product> {
    await ensureMode();
    const res = mockActive ? await mockServer.getProduct(handle) : await request<{ product: Product }>(`/v1/products/${enc(handle)}`);
    return res.product;
  },
  async createOrder(body: CreateOrderBody): Promise<CreateOrderResponse> {
    await ensureMode();
    return mockActive ? mockServer.createOrder(body) : request<CreateOrderResponse>("/v1/orders", { body });
  },
  async createConversation(): Promise<ConversationCreated> {
    await ensureMode();
    if (mockActive) return mockServer.createConversation();
    return request<ConversationCreated>("/v1/conversations", {
      body: { channel: "web_chat", locale: navigator.language || "en-US", page_url: window.location.href },
    });
  },
  async getConversation(id: string, token: string): Promise<ConversationSnapshot> {
    await ensureMode();
    return mockActive ? mockServer.getConversation(id, token) : request<ConversationSnapshot>(`/v1/conversations/${enc(id)}`, { token });
  },
  async sendMessage(id: string, token: string, body: SendMessageBody): Promise<TurnResponse> {
    await ensureMode();
    return mockActive
      ? mockServer.sendMessage(id, token, body)
      : request<TurnResponse>(`/v1/conversations/${enc(id)}/messages`, { body, token });
  },
  async verifyOrder(id: string, token: string, order_number: string, email: string): Promise<TurnResponse> {
    await ensureMode();
    return mockActive
      ? mockServer.verifyOrder(id, token, order_number, email)
      : request<TurnResponse>(`/v1/conversations/${enc(id)}/verification/order`, { body: { order_number, email }, token });
  },
  async escalate(id: string, token: string, reason?: string): Promise<TurnResponse> {
    await ensureMode();
    return mockActive
      ? mockServer.escalate(id, token)
      : request<TurnResponse>(`/v1/conversations/${enc(id)}/escalate`, { body: reason ? { reason } : {}, token });
  },
  async feedback(id: string, token: string, rating: number, comment?: string): Promise<void> {
    await ensureMode();
    if (mockActive) {
      await mockServer.feedback(id, token);
      return;
    }
    await request<{ ok: true }>(`/v1/conversations/${enc(id)}/feedback`, { body: comment ? { rating, comment } : { rating }, token });
  },
  async scenarios(): Promise<DemoScenario[]> {
    await ensureMode();
    const res = mockActive ? await mockServer.scenarios() : await request<{ scenarios: DemoScenario[] }>("/v1/demo/scenarios");
    return Array.isArray(res.scenarios) ? res.scenarios : [];
  },
  async resetDemo(): Promise<void> {
    await ensureMode();
    if (mockActive) await mockServer.reset();
    else await request<{ ok: true }>("/v1/demo/reset", { body: {} });
  },
  async activity(): Promise<Activity> {
    await ensureMode();
    return mockActive ? mockServer.activity() : request<Activity>("/v1/admin/activity");
  },
};

export { ApiError };
