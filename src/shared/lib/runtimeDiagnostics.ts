const MAX_DIAGNOSTIC_VALUE_LENGTH = 64;
const MAX_DIAGNOSTIC_ATTRIBUTES = 8;
const FORBIDDEN_ATTRIBUTE_NAMES = new Set([
  "access_token",
  "anonkey",
  "apikey",
  "area",
  "body",
  "credential",
  "credentials",
  "error",
  "event",
  "jwt",
  "key",
  "password",
  "payload",
  "prototype",
  "raw",
  "secret",
  "stack",
  "token",
  "__proto__",
  "constructor",
]);

function boundValue(value: string): string {
  return value.slice(0, MAX_DIAGNOSTIC_VALUE_LENGTH);
}

export function reportRuntimeDiagnostic(
  area: string,
  event: string,
  attributes: Readonly<Record<string, string>> = {},
): void {
  const safeDiagnostic: Record<string, string> = {
    area: boundValue(area),
    event: boundValue(event),
  };

  let acceptedAttributes = 0;
  for (const key of Reflect.ownKeys(attributes)) {
    if (
      acceptedAttributes >= MAX_DIAGNOSTIC_ATTRIBUTES ||
      typeof key !== "string" ||
      FORBIDDEN_ATTRIBUTE_NAMES.has(key.toLowerCase())
    ) {
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(attributes, key);
    if (
      !descriptor ||
      !("value" in descriptor) ||
      typeof descriptor.value !== "string"
    ) {
      continue;
    }

    safeDiagnostic[boundValue(key)] = boundValue(descriptor.value);
    acceptedAttributes += 1;
  }

  console.info("MH_DIAGNOSTIC", safeDiagnostic);
}
