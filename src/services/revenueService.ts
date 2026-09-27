export type ProPlan = 'monthly' | 'yearly';

export interface CreateOrderResult {
  success: boolean;
  orderCode?: string;
  amount?: number;
  plan?: ProPlan;
  checkoutEndpoint?: string;
  checkoutFields?: Record<string, string>;
  expiresAt?: string;
  message?: string;
}

export interface OrderStatusResult {
  success: boolean;
  status?: 'pending' | 'paid' | 'cancelled' | 'expired';
  licenseKey?: string;
  expiresAt?: string;
  message?: string;
}

export interface InvoiceResult {
  success: boolean;
  invoice?: {
    invoice_number: string;
    document_type: string;
    product_name: string;
    plan: ProPlan;
    customer_email: string;
    subtotal: number;
    tax_rate: number | null;
    tax_amount: number;
    total: number;
    currency: string;
    payment_method: string;
    payment_reference?: string | null;
    issued_at: string;
  };
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
        ? { apikey: SUPABASE_PUBLISHABLE_KEY }
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

export async function getInvoice(email: string, orderCode: string): Promise<InvoiceResult> {
  return callFunction<InvoiceResult>('get-invoice', { email, orderCode });
}

export async function activateProLicense(email: string, licenseKey: string, deviceId: string) {
  return callFunction<{ success: boolean; expiresAt?: string; activationToken?: string; activeDevices?: number; maxDevices?: number; code?: string; message?: string }>(
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

export function submitSePayCheckout(endpoint: string, fields: Record<string, string>): Window | null {
  const target = window.open('', '_blank');
  if (!target) return null;

  const form = target.document.createElement('form');
  form.method = 'POST';
  form.action = endpoint;
  form.style.display = 'none';

  for (const [name, value] of Object.entries(fields)) {
    const input = target.document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  target.document.body.appendChild(form);
  form.submit();
  return target;
}


export async function deactivateProLicense(email: string, deviceId: string, activationToken: string) {
  return callFunction<{ success: boolean; activeDevices?: number; maxDevices?: number; message?: string }>(
    'deactivate-license',
    { email, deviceId, activationToken },
  );
}

export async function validateProLicense(
  email: string,
  deviceId: string,
  activationToken: string,
) {
  return callFunction<{
    success: boolean;
    plan?: ProPlan;
    expiresAt?: string;
    activeDevices?: number;
    maxDevices?: number;
    message?: string;
  }>('validate-license', { email, deviceId, activationToken });
}
