export const formatPrice = (n: number | null | undefined): string =>
  n == null ? "—" : new Intl.NumberFormat("en-US").format(n) + " تومان";

export const formatNumber = (n: number | null | undefined): string =>
  n == null ? "۰" : new Intl.NumberFormat("en-US").format(n);
