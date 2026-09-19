/**
 * API client for Walcano & Surfaces Tiles - QuickBooks Live Inventory System.
 */

export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return '/api/v1';
  }
  return 'http://127.0.0.1:8000/api/v1';
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const url = `${getApiBase()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type');
    let data: any = null;
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      let errorMessage = 'An error occurred';
      if (data && typeof data === 'object') {
        if (data.detail) {
          errorMessage = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      return { ok: false, status: res.status, error: errorMessage };
    }

    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err.message || 'Network connection failed. Please check backend server.',
    };
  }
}

export interface QuickBooksStatus {
  connected: boolean;
  realm_id?: string | null;
  company_name?: string | null;
  environment: string;
  client_configured: boolean;
  error?: string;
}

export interface QuickBooksInventoryItem {
  id: string;
  name: string;
  walcano_name?: string;
  surfaces_name?: string | null;
  surfaces_variants?: string[];
  is_mapped?: boolean;
  mapping_note?: string | null;
  sku: string;
  qty_on_hand: number;
  category: string;
  type?: string;
  active?: boolean;
}

export interface QuickBooksInventoryResponse {
  connected: boolean;
  is_demo: boolean;
  items: QuickBooksInventoryItem[];
  count: number;
  total_count?: number;
  categories: string[];
  source: string;
  last_synced: string;
  message?: string;
  error?: string;
}

export async function getQuickBooksStatus(): Promise<QuickBooksStatus> {
  const res = await apiFetch<QuickBooksStatus>('/quickbooks/status');
  if (res.ok && res.data) {
    return res.data;
  }
  return {
    connected: false,
    environment: 'sandbox',
    client_configured: false,
    error: res.error,
  };
}

export async function getQuickBooksAuthUrl(): Promise<{ url?: string; error?: string }> {
  const res = await apiFetch<{ auth_url: string }>('/quickbooks/auth-url');
  if (res.ok && res.data?.auth_url) {
    return { url: res.data.auth_url };
  }
  return { error: res.error || 'Failed to generate QuickBooks authorization link.' };
}

export async function disconnectQuickBooks(): Promise<boolean> {
  const res = await apiFetch('/quickbooks/disconnect', { method: 'POST' });
  return res.ok;
}

export async function getLiveInventory(params?: {
  search?: string;
  category?: string;
  demo?: boolean;
}): Promise<QuickBooksInventoryResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.category) query.set('category', params.category);
  if (params?.demo) query.set('demo', 'true');

  const qs = query.toString();
  const endpoint = `/quickbooks/inventory${qs ? `?${qs}` : ''}`;
  const res = await apiFetch<QuickBooksInventoryResponse>(endpoint);

  if (res.ok && res.data) {
    return res.data;
  }

  return {
    connected: false,
    is_demo: false,
    items: [],
    count: 0,
    categories: [],
    source: 'quickbooks_online',
    last_synced: new Date().toISOString(),
    error: res.error || 'Failed to fetch inventory',
  };
}

// ─── AI Copilot & Smart Mapping APIs ───────────────────────────────────────

export interface AiStatusResponse {
  configured: boolean;
  provider: string;
  model: string;
  mode_label: string;
  notice?: string | null;
}

export interface AiFilterAction {
  action: 'filter';
  label: string;
  filters: {
    stock?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
    mapping?: 'all' | 'mapped' | 'unmapped';
    category?: string;
    search?: string;
  };
}

export interface AiChatResponse {
  answer: string;
  action?: AiFilterAction | null;
  provider: string;
  model?: string;
}

export async function getAiStatus(): Promise<AiStatusResponse> {
  const res = await apiFetch<AiStatusResponse>('/ai/status');
  if (res.ok && res.data) {
    return res.data;
  }
  return {
    configured: false,
    provider: 'heuristic',
    model: 'ai-engine',
    mode_label: 'Smart Local Assistant',
    notice: 'Using local heuristic intelligence.',
  };
}

export async function sendAiChat(
  message: string,
  history?: Array<{ role: string; content: string }>,
  demo: boolean = false
): Promise<AiChatResponse> {
  const res = await apiFetch<AiChatResponse>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history, demo }),
  });

  if (res.ok && res.data) {
    return res.data;
  }

  return {
    answer: `⚠️ Failed to get AI response: ${res.error || 'Backend communication error'}`,
    action: null,
    provider: 'error',
  };
}

export interface AutoMapProductRequest {
  walcano_name?: string;
  surfaces_name?: string;
  sku?: string;
  category?: string;
  auto_save?: boolean;
}

export interface AutoMapProductResponse {
  success: boolean;
  walcano_name: string;
  surfaces_name: string;
  confidence: number;
  reasoning: string;
  is_unique: boolean;
  provider: string;
  attributes?: {
    dimensions?: string;
    finish?: string;
    tile_type?: string;
    collection?: string;
  };
  saved: boolean;
  message?: string;
}

export async function autoMapSingleProduct(
  params: AutoMapProductRequest
): Promise<AutoMapProductResponse> {
  const res = await apiFetch<AutoMapProductResponse>('/ai/auto-map-product', {
    method: 'POST',
    body: JSON.stringify(params),
  });

  if (res.ok && res.data) {
    return res.data;
  }

  return {
    success: false,
    walcano_name: params.walcano_name || '',
    surfaces_name: '',
    confidence: 0,
    reasoning: res.error || 'Failed to auto-map product',
    is_unique: false,
    provider: 'error',
    saved: false,
    message: res.error || 'Auto-mapping request failed',
  };
}

// ─── AI Copilot, Restock & Semantic Search APIs ──────────────────────────

export interface RestockRecommendation {
  name: string;
  surfaces_name?: string | null;
  sku: string;
  category: string;
  current_qty: number;
  priority: 'Critical' | 'Warning';
  risk_reason: string;
  suggested_reorder_qty: number;
  is_mapped: boolean;
}

export interface RestockInsightsResponse {
  health_score: number;
  status: string;
  summary: string;
  critical_count: number;
  low_stock_count: number;
  healthy_count?: number;
  recommendations: RestockRecommendation[];
  executive_summary?: string;
  provider: string;
}

export interface SemanticSearchResult {
  item: QuickBooksInventoryItem;
  score: number;
  match_reasons: string[];
}

export interface SemanticSearchResponse {
  query: string;
  count: number;
  results: SemanticSearchResult[];
  provider: string;
}

export interface CustomMappingItem {
  walcano_name: string;
  surfaces_name: string;
  created_at?: string;
}

export async function acceptAiMapping(
  walcano_name: string,
  surfaces_name: string,
  confidence: number = 1.0,
  note: string = 'AI confirmed mapping'
): Promise<{ success: boolean; message?: string }> {
  const res = await apiFetch<{ success: boolean; message?: string }>('/ai/accept-mapping', {
    method: 'POST',
    body: JSON.stringify({ walcano_name, surfaces_name, confidence, note }),
  });

  if (res.ok && res.data) {
    return res.data;
  }

  return {
    success: false,
    message: res.error || 'Failed to save mapping',
  };
}

export async function saveManualMapping(
  walcano_name: string,
  surfaces_name: string
): Promise<{ success: boolean; message?: string }> {
  return acceptAiMapping(walcano_name, surfaces_name, 1.0, 'Manual user entry');
}

export async function getRestockInsights(
  thresholdLow: number = 10,
  demo: boolean = false
): Promise<RestockInsightsResponse> {
  const res = await apiFetch<RestockInsightsResponse>('/ai/restock-insights', {
    method: 'POST',
    body: JSON.stringify({ threshold_low: thresholdLow, demo }),
  });

  if (res.ok && res.data) {
    return res.data;
  }

  return {
    health_score: 85,
    status: 'good',
    summary: res.error || 'Failed to fetch restock insights.',
    critical_count: 0,
    low_stock_count: 0,
    recommendations: [],
    provider: 'heuristic',
  };
}

export async function performSemanticSearch(
  query: string,
  limit: number = 15,
  demo: boolean = false
): Promise<SemanticSearchResponse> {
  const res = await apiFetch<SemanticSearchResponse>('/ai/semantic-search', {
    method: 'POST',
    body: JSON.stringify({ query, limit, demo }),
  });

  if (res.ok && res.data) {
    return res.data;
  }

  return {
    query,
    count: 0,
    results: [],
    provider: 'error',
  };
}

export async function getCustomMappings(): Promise<{ count: number; mappings: Record<string, any> }> {
  const res = await apiFetch<{ count: number; mappings: Record<string, any> }>('/ai/custom-mappings');
  if (res.ok && res.data) {
    return res.data;
  }
  return { count: 0, mappings: {} };
}

export async function deleteCustomMapping(walcanoName: string): Promise<boolean> {
  const res = await apiFetch(`/ai/custom-mappings/${encodeURIComponent(walcanoName)}`, {
    method: 'DELETE',
  });
  return res.ok;
}

