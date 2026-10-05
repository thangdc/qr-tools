import type { RecordId, WorkflowId } from "../../types/src/index.ts";

const QR_IDENTITY_PREFIX = "qrtools:";
const QR_IDENTITY_FIELDS = ["version", "workflowId", "recordId"] as const;

export interface QrIdentity {
  version: number;
  workflowId: WorkflowId;
  recordId: RecordId;
  signature?: string;
}

export interface QrPayloadEncoder {
  encode(identity: QrIdentity): string;
}

export interface QrPayloadDecoder {
  decode(payload: string): QrIdentity;
}

export interface QrIdentityVerifier {
  verify(identity: QrIdentity): Promise<boolean>;
}

export interface QrEngine {
  encode(identity: QrIdentity): string;
  decode(payload: string): QrIdentity;
  verify(identity: QrIdentity): Promise<boolean>;
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;
  const binary = atob(normalized + "=".repeat(padding));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function assertValidIdentity(identity: unknown): asserts identity is QrIdentity {
  if (!identity || typeof identity !== "object") {
    throw new Error("Invalid QR identity.");
  }

  const value = identity as Record<string, unknown>;

  if (
    typeof value.version !== "number" ||
    !Number.isInteger(value.version) ||
    value.version < 1
  ) {
    throw new Error("Invalid QR identity version.");
  }

  if (typeof value.workflowId !== "string" || value.workflowId.length === 0) {
    throw new Error("Invalid QR identity workflowId.");
  }

  if (typeof value.recordId !== "string" || value.recordId.length === 0) {
    throw new Error("Invalid QR identity recordId.");
  }

  if (value.signature !== undefined && typeof value.signature !== "string") {
    throw new Error("Invalid QR identity signature.");
  }
}

export const qrPayloadEncoder: QrPayloadEncoder = {
  encode(identity) {
    assertValidIdentity(identity);

    return (
      QR_IDENTITY_PREFIX +
      encodeBase64Url(
        JSON.stringify({
          version: identity.version,
          workflowId: identity.workflowId,
          recordId: identity.recordId,
          ...(identity.signature !== undefined
            ? { signature: identity.signature }
            : {}),
        }),
      )
    );
  },
};

export const qrPayloadDecoder: QrPayloadDecoder = {
  decode(payload) {
    if (!payload.startsWith(QR_IDENTITY_PREFIX)) {
      throw new Error("Invalid QR Tools payload prefix.");
    }

    const encoded = payload.slice(QR_IDENTITY_PREFIX.length);

    if (encoded.length === 0) {
      throw new Error("Empty QR Tools payload.");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(decodeBase64Url(encoded));
    } catch {
      throw new Error("Invalid QR Tools payload encoding.");
    }

    assertValidIdentity(parsed);

    return parsed;
  },
};

export const qrIdentityEngine: QrEngine = {
  encode(identity) {
    return qrPayloadEncoder.encode(identity);
  },

  decode(payload) {
    return qrPayloadDecoder.decode(payload);
  },

  async verify(identity) {
    assertValidIdentity(identity);

    // Cryptographic verification is intentionally infrastructure-owned.
    // The core engine only validates the identity shape.
    return true;
  },
};

export { QR_IDENTITY_PREFIX, QR_IDENTITY_FIELDS };
