import type { QrIdentity, QrIdentityVerifier } from "./index.ts";

export interface QrIdentityRevocationStore {
  isRevoked(identity: QrIdentity): Promise<boolean>;
}

export function getQrIdentityKey(identity: QrIdentity): string {
  return [identity.version, identity.workflowId, identity.recordId].join(":");
}

export class RevocationAwareQrIdentityVerifier implements QrIdentityVerifier {
  constructor(
    private readonly verifier: QrIdentityVerifier,
    private readonly revocations: QrIdentityRevocationStore,
  ) {}

  async verify(identity: QrIdentity): Promise<boolean> {
    if (await this.revocations.isRevoked(identity)) {
      return false;
    }

    return this.verifier.verify(identity);
  }
}
