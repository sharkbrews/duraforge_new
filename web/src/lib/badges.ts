export interface BadgeDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
}

export const BADGES: BadgeDefinition[] = [
  {
    key: "first_seal",
    name: "First Seal",
    description: "Placed your first order — welcome to the club.",
    icon: "🔧",
  },
  {
    key: "big_rig",
    name: "Big Rig",
    description: "Single order over £500 — serious kit.",
    icon: "🚜",
  },
  {
    key: "machine_whisperer",
    name: "Machine Whisperer",
    description: "Ordered kits for 5+ different machine brands.",
    icon: "🎯",
  },
  {
    key: "speed_demon",
    name: "Speed Demon",
    description: "Used same-day delivery five times.",
    icon: "⚡",
  },
  {
    key: "loyal_spanner",
    name: "Loyal Spanner",
    description: "Ordered in 12 consecutive months.",
    icon: "🏆",
  },
  {
    key: "referral_king",
    name: "Referral King",
    description: "Referred 3 trade accounts who placed orders.",
    icon: "👑",
  },
];

export function getBadgeDefinition(key: string): BadgeDefinition | undefined {
  return BADGES.find((b) => b.key === key);
}
