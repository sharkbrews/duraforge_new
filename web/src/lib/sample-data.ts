// Sample data for Stage 0. Replaced with real data (from docs/ price lists) in Stage 1.

export type FinderBrand = {
  name: string;
  models: {
    name: string;
    positions: string[];
  }[];
};

export const finderBrands: FinderBrand[] = [
  {
    name: "JCB",
    models: [
      { name: "3DX / 3CX", positions: ["Boom", "Dipper", "Bucket", "Stabiliser", "Steering"] },
      { name: "531-70 Telehandler", positions: ["Boom lift", "Carriage tilt", "Sway"] },
      { name: "535-95 Telehandler", positions: ["Boom lift", "Tilt"] },
    ],
  },
  {
    name: "CAT / Caterpillar",
    models: [{ name: "424B", positions: ["Boom", "Dipper"] }],
  },
  {
    name: "Hyva",
    models: [
      { name: "FE-162-4 Tipper", positions: ["Tipper cylinder"] },
      { name: "FE-141-3 Tipper", positions: ["Tipper cylinder"] },
      { name: "FE-120-3 Tipper", positions: ["Tipper cylinder"] },
    ],
  },
  {
    name: "Kubota",
    models: [{ name: "KX016-4", positions: ["Boom", "Arm", "Bucket"] }],
  },
  {
    name: "Takeuchi",
    models: [
      { name: "TB250", positions: ["Boom", "Arm"] },
      { name: "TB230 / TB325R", positions: ["Boom", "Blade"] },
    ],
  },
  {
    name: "Hyundai",
    models: [{ name: "R210LC-9", positions: ["Boom", "Arm", "Bucket"] }],
  },
  {
    name: "Bobcat",
    models: [{ name: "E50Z / E55Z", positions: ["Boom", "Arm"] }],
  },
];

export type Category = {
  name: string;
  slug: string;
  blurb: string;
  emoji: string;
};

export const featuredCategories: Category[] = [
  { name: "JCB", slug: "jcb", blurb: "3DX, 3CX & telehandlers", emoji: "🚜" },
  { name: "CAT", slug: "caterpillar", blurb: "Backhoe & excavator kits", emoji: "🏗️" },
  { name: "Hyva", slug: "hyva", blurb: "Tipper cylinder seals", emoji: "🚛" },
  { name: "Kubota", slug: "kubota", blurb: "Mini-excavator kits", emoji: "⚙️" },
  { name: "Takeuchi", slug: "takeuchi", blurb: "Compact excavators", emoji: "🔧" },
  { name: "Hyundai", slug: "hyundai", blurb: "Heavy excavator seals", emoji: "🛠️" },
];
