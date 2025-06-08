export const TOKEN_PACKAGES = [
  {
    id: "tokens_10",
    label: "🎟️ 10 Tokens",
    quantity: 10,
    priceId: "price_299", // $2.99
    amount: 299,
  },
  {
    id: "tokens_20",
    label: "🎟️ 20 Tokens",
    quantity: 20,
    priceId: "price_499", // $4.99
    amount: 499,
  },
  {
    id: "tokens_50",
    label: "🎟️ 50 Tokens",
    quantity: 50,
    priceId: "price_999", // $9.99
    popular: true, // Mark as best value
    amount: 999,
  },
  {
    id: "tokens_70",
    label: "🎟️ 70 Tokens",
    quantity: 70,
    priceId: "price_1299", // $12.99
    amount: 1299,
  },
  {
    id: "tokens_100",
    label: "🎟️ 100 Tokens",
    quantity: 100,
    priceId: "price_1599", // $15.99
    amount: 1599,
  },
];

export interface TokenPackage {
  id: string;
  label: string;
  quantity: number;
  priceId: string;
  amount: number;
}
