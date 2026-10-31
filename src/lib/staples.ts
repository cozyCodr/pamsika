// Plausibility ranges are rough sanity heuristics for flagging likely typos, not market data.
export type Staple = { key: string; label: string; unit: string; minZmw: number; maxZmw: number };

export const STAPLES: Staple[] = [
  { key: "mealie_meal_25kg", label: "Mealie meal", unit: "25kg bag", minZmw: 150, maxZmw: 700 },
  { key: "kapenta_1kg", label: "Kapenta", unit: "1kg", minZmw: 60, maxZmw: 450 },
  { key: "tomatoes_box", label: "Tomatoes", unit: "Box", minZmw: 80, maxZmw: 700 },
  { key: "cooking_oil_2l", label: "Cooking oil", unit: "2 litres", minZmw: 40, maxZmw: 250 },
  { key: "eggs_tray", label: "Eggs", unit: "Tray of 30", minZmw: 40, maxZmw: 180 },
  { key: "rape_bundle", label: "Rape", unit: "Bundle", minZmw: 2, maxZmw: 40 },
  { key: "onions_5kg", label: "Onions", unit: "5kg pocket", minZmw: 25, maxZmw: 250 },
  { key: "kalembula_bundle", label: "Kalembula", unit: "Bundle", minZmw: 2, maxZmw: 40 },
  { key: "sugar_2kg", label: "Sugar", unit: "2kg", minZmw: 30, maxZmw: 150 },
  { key: "beans_1kg", label: "Beans", unit: "1kg", minZmw: 20, maxZmw: 120 },
];

export const STAPLE_KEYS = STAPLES.map((s) => s.key);

export function stapleByKey(key: string | null | undefined): Staple | undefined {
  return STAPLES.find((s) => s.key === key);
}

export const MARKETS = [
  "Soweto Market",
  "Chisokone Market",
  "Kamwala Market",
  "City Market",
  "Mtendere Market",
  "COMESA Market",
  "Other",
];
