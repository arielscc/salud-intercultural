type ErrorWithCode = {
  code?: unknown;
  name?: unknown;
};

function safeErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as ErrorWithCode).code;

  return typeof code === "string" && /^[A-Z0-9_-]{1,32}$/.test(code)
    ? code
    : undefined;
}

export function reportScriptError(operation: string, error: unknown) {
  const name =
    error instanceof Error && /^[A-Za-z][A-Za-z0-9]*Error$/.test(error.name)
      ? error.name
      : "Error";
  const code = safeErrorCode(error);

  console.error(
    `${operation} failed (${name}${code ? `, code ${code}` : ""}). ` +
      "The detailed error was omitted to protect credentials and personal data."
  );
}
