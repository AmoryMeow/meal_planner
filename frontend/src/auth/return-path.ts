export const getReturnPath = (state: unknown): string => {
  if (!isRecord(state) || !isRecord(state.from)) return "/home";

  const { pathname, search = "", hash = "" } = state.from;
  if (
    typeof pathname !== "string" ||
    !pathname.startsWith("/") ||
    pathname.startsWith("//")
  ) {
    return "/home";
  }

  return `${pathname}${typeof search === "string" ? search : ""}${
    typeof hash === "string" ? hash : ""
  }`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
