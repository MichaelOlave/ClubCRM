import { parseApiDateTime } from "@/lib/utils/datetime";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(value: string): string {
  return dateFormatter.format(parseApiDateTime(value));
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(parseApiDateTime(value));
}
