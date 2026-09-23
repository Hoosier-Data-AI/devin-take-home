export function titleCase(value: string): string {
  return value.replace(/[._-]/g, " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

const entityTypeLabels: Record<string, string> = {
  kyc_case: "KYC case",
  refund_request: "Refund request",
  feature_flag: "Feature flag"
};

export function entityTypeLabel(value: string): string {
  return entityTypeLabels[value] ?? titleCase(value);
}

export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amountCents / 100);
}
