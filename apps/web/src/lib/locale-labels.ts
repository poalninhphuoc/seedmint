/** Language name for a data-locale code, shown in the UI language. */
export function localeLabel(code: string, uiLocale: string): string {
  try {
    return new Intl.DisplayNames([uiLocale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}
