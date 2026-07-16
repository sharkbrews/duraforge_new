/**
 * Email / marketing event hooks (Stage 4).
 * Logs events locally now; Opus wires Klaviyo in Stage 4b.
 */

export type EmailEventName =
  | "user.registered"
  | "order.placed"
  | "order.fulfilled"
  | "duracoins.earned"
  | "badge.earned"
  | "spin.won"
  | "brochure.download"
  | "abandoned_basket";

export interface EmailEventPayload {
  email?: string;
  userId?: string;
  orderNumber?: string;
  coins?: number;
  badgeKey?: string;
  prizeLabel?: string;
  [key: string]: unknown;
}

/** Fire-and-forget — never throws. Sends to Klaviyo when configured. */
export function trackEmailEvent(
  name: EmailEventName,
  payload: EmailEventPayload,
): void {
  const apiKey = process.env.KLAVIYO_API_KEY;
  if (!apiKey) {
    console.info("[email-event]", name, payload);
    return;
  }
  void sendToKlaviyo(apiKey, name, payload).catch((err) =>
    console.error("Klaviyo event failed:", name, err),
  );
}

async function sendToKlaviyo(
  apiKey: string,
  name: EmailEventName,
  payload: EmailEventPayload,
): Promise<void> {
  const email = payload.email;
  if (!email) return; // Klaviyo needs a profile identifier

  const res = await fetch("https://a.klaviyo.com/api/events/", {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      "Content-Type": "application/json",
      accept: "application/json",
      revision: "2024-10-15",
    },
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          metric: { data: { type: "metric", attributes: { name } } },
          properties: { ...payload },
          profile: {
            data: {
              type: "profile",
              attributes: { email },
            },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Klaviyo ${res.status}: ${text}`);
  }
}
