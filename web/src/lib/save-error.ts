/**
 * Safe explanations for database writes that made it past a form's own
 * validation. We never expose the provider's raw error: it can name internal
 * tables and is not an instruction a gym owner can act on. PostgreSQL's error
 * codes do tell us when there is a useful next step, though.
 */
export function saveError(error: unknown, subject: string): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code ?? "")
      : "";

  if (code === "23505") {
    return `Something in ${subject} is already in use. Change the duplicate value and save again.`;
  }
  if (code === "23514" || code === "22P02") {
    return `A value in ${subject} is not valid. Check the form and save again.`;
  }
  if (code === "23503") {
    return `Something ${subject} depends on no longer exists. Reload this page, then try again.`;
  }
  if (code === "42501") {
    return `Only the gym owner can change ${subject}.`;
  }
  if (code === "PGRST116") {
    return `This page is out of date. Reload before changing ${subject}.`;
  }

  return `casdey could not complete the save for ${subject}. Nothing changed. Reload and try again. If it keeps happening, contact support.`;
}
