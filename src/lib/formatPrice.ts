export const formatPrice = (n: number | null | undefined): string =>
  n == null ? "—" : new Intl.NumberFormat("fa-IR").format(n) + " تومان";

export const formatNumber = (n: number | null | undefined): string =>
  n == null ? "۰" : new Intl.NumberFormat("fa-IR").format(n);
