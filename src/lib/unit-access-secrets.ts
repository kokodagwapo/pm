import {
  decryptUnitSecret,
  encryptUnitSecret,
  isUnitSecretsEncryptionConfigured,
} from "@/lib/unit-secrets-crypto";

/** Strips ciphertext fields and adds decrypted `wifiPassword` / `doorPasscode` for API clients. */
export function formatEmbeddedUnitForClient(
  unit: Record<string, unknown>
): Record<string, unknown> {
  const u = { ...unit };
  const wifiEnc = u.wifiPasswordEnc as string | undefined;
  const doorEnc = u.doorPasscodeEnc as string | undefined;
  delete u.wifiPasswordEnc;
  delete u.doorPasscodeEnc;
  u.wifiPassword = wifiEnc ? decryptUnitSecret(wifiEnc) : null;
  u.doorPasscode = doorEnc ? decryptUnitSecret(doorEnc) : null;
  return u;
}

export function stripSecretPlainFieldsFromBody(
  body: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...body };
  delete out.wifiPassword;
  delete out.doorPasscode;
  delete out.wifiPasswordEnc;
  delete out.doorPasscodeEnc;
  return out;
}

/** For property unit lists: omit ciphertext; optional flags for UI. */
export function stripSecretCiphertextForList(unit: Record<string, unknown>) {
  const { wifiPasswordEnc, doorPasscodeEnc, ...rest } = unit;
  return {
    ...rest,
    hasWifiPassword: Boolean(wifiPasswordEnc),
    hasDoorPasscode: Boolean(doorPasscodeEnc),
  };
}

/** Public/unauthenticated APIs: remove SSID and ciphertext from embedded units. */
export function stripUnitSecretsForPublicApi(unit: Record<string, unknown>) {
  const {
    wifiPasswordEnc: _w,
    doorPasscodeEnc: _d,
    wifiSsid: _s,
    ...rest
  } = unit;
  void _w;
  void _d;
  void _s;
  return rest;
}

/**
 * Apply `wifiSsid`, `wifiPassword`, `doorPasscode` from the raw request body onto `updateData`.
 * Password fields: empty string clears; omitted leaves existing ciphertext unchanged.
 */
export function applySecretUpdatesToUnitUpdate(
  rawBody: Record<string, unknown>,
  updateData: Record<string, unknown>
): { error?: string; status?: number } {
  if ("wifiSsid" in rawBody) {
    const v = rawBody.wifiSsid;
    if (typeof v === "string" && v.trim()) {
      updateData.wifiSsid = v.trim().slice(0, 128);
    } else {
      updateData.wifiSsid = undefined;
    }
  }

  if ("wifiPassword" in rawBody) {
    const v = rawBody.wifiPassword;
    if (v === "" || v === null) {
      updateData.wifiPasswordEnc = undefined;
    } else if (typeof v === "string") {
      if (v.length > 256) {
        return { error: "WiFi password is too long", status: 400 };
      }
      if (!isUnitSecretsEncryptionConfigured()) {
        return {
          error:
            "Secure storage is not configured (set UNIT_SECRETS_ENCRYPTION_KEY)",
          status: 503,
        };
      }
      updateData.wifiPasswordEnc = encryptUnitSecret(v);
    }
  }

  if ("doorPasscode" in rawBody) {
    const v = rawBody.doorPasscode;
    if (v === "" || v === null) {
      updateData.doorPasscodeEnc = undefined;
    } else if (typeof v === "string") {
      if (v.length > 256) {
        return { error: "Door passcode is too long", status: 400 };
      }
      if (!isUnitSecretsEncryptionConfigured()) {
        return {
          error:
            "Secure storage is not configured (set UNIT_SECRETS_ENCRYPTION_KEY)",
          status: 503,
        };
      }
      updateData.doorPasscodeEnc = encryptUnitSecret(v);
    }
  }

  return {};
}
