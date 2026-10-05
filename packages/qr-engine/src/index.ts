import type { RecordId, WorkflowId } from "../../types/src/index.ts";

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
