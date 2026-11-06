export const formatPercentage = (ratio: number) =>
  new Intl.NumberFormat("en", { maximumSignificantDigits: 4 }).format(
    ratio * 100,
  ) + "%";
