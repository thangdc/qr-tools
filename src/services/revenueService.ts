export type ProPlan = 'monthly' | 'yearly';

export interface CreateOrderResult {
  success: boolean;
  orderCode?: string;
  amount?: number;
  plan?: ProPlan;
  paymentQrUrl?: string;
  paymentAccountName?: string;
  paymentAccountNumber?: string;
  paymentBankName?: string;
  message?: string;
}

export interface OrderStatusResult {
  success: boolean;
  status?: 'pending' | 'paid' | 'cancelled' | 'expired';
  licenseKey?: string;
  expiresAt?: string;
  message?: string;
}

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://yatmdgjkljmaohdkvzkd.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(SUPABASE_PUBLISHABLE_KEY
        ? { Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` }
        : {}),
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    throw new Error((data as { message?: string }).message || 'Request failed.');
  }
  return data;
}

export async function createProOrder(email: string, plan: ProPlan): Promise<CreateOrderResult> {
  return callFunction<CreateOrderResult>('create-order', { email, plan });
}

export async function getOrderStatus(email: string, orderCode: string): Promise<OrderStatusResult> {
  return callFunction<OrderStatusResult>('order-status', { email, orderCode });
}

export async function activateProLicense(email: string, licenseKey: string, deviceId: string) {
  return callFunction<{ success: boolean; expiresAt?: string; message?: string }>(
    'activate-license',
    { email, licenseKey, deviceId },
  );
}

export function getDeviceId(): string {
  const key = 'qr_tools_device_id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const value = crypto.randomUUID();
    localStorage.setItem(key, value);
    return value;
  } catch {
    return `qr-tools-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
