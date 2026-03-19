/**
 * Resolve contract template variables.
 */
export function resolveContractTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let resolved = template;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    resolved = resolved.replace(regex, value);
  }
  return resolved;
}

