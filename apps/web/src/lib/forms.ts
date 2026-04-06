export type ActionNotice = {
  kind: "error" | "success";
  message: string;
};

type SearchParamValue = string | string[] | undefined;

function normalizeSearchParamValue(value: SearchParamValue): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

export function getActionNotice(
  successValue: SearchParamValue,
  errorValue: SearchParamValue
): ActionNotice | null {
  const errorMessage = normalizeSearchParamValue(errorValue);

  if (errorMessage) {
    return {
      kind: "error",
      message: errorMessage,
    };
  }

  const successMessage = normalizeSearchParamValue(successValue);

  if (!successMessage) {
    return null;
  }

  return {
    kind: "success",
    message: successMessage,
  };
}

export function buildPathWithSearchParams(
  path: string,
  values: Record<string, string | undefined>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();

  return query ? `${path}?${query}` : path;
}

export function getRequiredString(formData: FormData, fieldName: string, label: string): string {
  const value = formData.get(fieldName);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

export function getOptionalString(formData: FormData, fieldName: string): string | null {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue || null;
}
