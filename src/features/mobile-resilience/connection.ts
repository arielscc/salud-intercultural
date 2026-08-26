export type ConnectionQuality = "online" | "slow" | "offline";

export function resolveConnectionQuality(input: {
  online: boolean;
  effectiveType?: string;
  saveData?: boolean;
}): ConnectionQuality {
  if (!input.online) return "offline";
  if (
    input.saveData ||
    input.effectiveType === "slow-2g" ||
    input.effectiveType === "2g"
  ) {
    return "slow";
  }
  return "online";
}
