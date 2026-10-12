// Montants stockés en entiers XAF (pas de sous-unité).
export function formatXAF(amount: number) {
  return new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(amount);
}
