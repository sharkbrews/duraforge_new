/** DuraCoin milestone rewards — informational targets for the progress bar. */
export const DURACOIN_MILESTONES = [
  { coins: 500, label: "5% off your next order" },
  { coins: 1000, label: "£15 account credit" },
  { coins: 2500, label: "Free same-day delivery for 30 days" },
  { coins: 5000, label: "DuraForge Pro — permanent 10% trade discount" },
] as const;

export const PRO_MEMBER_THRESHOLD = 5000;

/** £1 spent inc-VAT = 1 DuraCoin (rounded down). */
export function coinsForOrder(totalIncVat: number): number {
  return Math.floor(totalIncVat);
}

export function nextMilestone(balance: number) {
  return DURACOIN_MILESTONES.find((m) => balance < m.coins) ?? null;
}

export function milestoneProgress(balance: number): number {
  const next = nextMilestone(balance);
  if (!next) return 100;
  const prev =
    [...DURACOIN_MILESTONES].reverse().find((m) => m.coins <= balance)?.coins ?? 0;
  const span = next.coins - prev;
  if (span <= 0) return 100;
  return Math.min(100, Math.round(((balance - prev) / span) * 100));
}

/** Spin wheel segments — weights must sum to 100. */
export const SPIN_PRIZES = [
  { key: "pct5", label: "5% off next order", weight: 20 },
  { key: "free_delivery", label: "Free delivery on next order", weight: 15 },
  { key: "credit10", label: "£10 account credit", weight: 10 },
  { key: "coins50", label: "50 bonus DuraCoins", weight: 15 },
  { key: "coins100", label: "100 bonus DuraCoins", weight: 10 },
  { key: "try_again", label: "Try again next month", weight: 30 },
] as const;

export type SpinPrizeKey = (typeof SPIN_PRIZES)[number]["key"];

export function pickSpinPrize(): (typeof SPIN_PRIZES)[number] {
  const roll = Math.random() * 100;
  let acc = 0;
  for (const prize of SPIN_PRIZES) {
    acc += prize.weight;
    if (roll < acc) return prize;
  }
  return SPIN_PRIZES[SPIN_PRIZES.length - 1];
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function canSpinThisMonth(lastSpinMonth: string | null | undefined): boolean {
  return lastSpinMonth !== currentMonthKey();
}

/** Order total qualifies for a post-checkout spin prompt (£200+ inc-VAT). */
export const SPIN_ORDER_THRESHOLD = 200;
