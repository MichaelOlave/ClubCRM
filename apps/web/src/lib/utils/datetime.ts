const ISO_TIME_ZONE_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})$/;

export function parseApiDateTime(value: string): Date {
  const normalizedValue = ISO_TIME_ZONE_SUFFIX.test(value) ? value : `${value}Z`;

  return new Date(normalizedValue);
}

export function getApiDateTimeTimestamp(value: string): number {
  return parseApiDateTime(value).getTime();
}
