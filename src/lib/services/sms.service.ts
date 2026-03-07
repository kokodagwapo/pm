interface SMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (!phone.startsWith("+")) return `+${digits}`;
  return phone;
}

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log("[SMS] Twilio not configured, skipping SMS");
    return { success: false, error: "Twilio not configured" };
  }

  const toFormatted = formatPhone(to);

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: toFormatted,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("[SMS] Twilio error:", data);
      return { success: false, error: data.message || "Twilio API error" };
    }

    return { success: true, messageSid: data.sid };
  } catch (err) {
    console.error("[SMS] Send error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
