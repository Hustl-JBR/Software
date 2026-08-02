export type LocalTimeDisambiguation = "EARLIER" | "LATER" | "REJECT";

export type LocalTimeResolution = {
  instant: Date;
  timeZone: string;
  localDateTime: string;
  ambiguous: boolean;
  disambiguation?: Exclude<LocalTimeDisambiguation, "REJECT">;
};

const localPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function isIanaTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return timeZone.includes("/") || timeZone === "UTC";
  } catch {
    return false;
  }
}

export function localDateTimeToInstant(
  localDateTime: string,
  timeZone: string,
  disambiguation: LocalTimeDisambiguation = "REJECT",
): LocalTimeResolution {
  if (!isIanaTimeZone(timeZone)) throw new Error("INVALID_TIME_ZONE");
  const match = localPattern.exec(localDateTime);
  if (!match) throw new Error("INVALID_LOCAL_DATE_TIME");
  const parts = match
    .slice(1)
    .map((value) => (value === undefined ? 0 : Number(value)));
  const [year, month, day, hour, minute, second = 0] = parts;
  const localEpoch = Date.UTC(year, month - 1, day, hour, minute, second);
  const normalized = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${String(second).padStart(2, "0")}`;
  if (new Date(localEpoch).toISOString().slice(0, 19) !== `${normalized}`)
    throw new Error("INVALID_LOCAL_DATE_TIME");

  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const candidate = localEpoch + hours * 3_600_000;
    offsets.add(offsetAt(candidate, timeZone));
  }
  const matches = [...offsets]
    .map((offset) => localEpoch - offset)
    .filter((candidate) => localParts(candidate, timeZone) === normalized)
    .sort((a, b) => a - b);

  if (matches.length === 0) throw new Error("NONEXISTENT_LOCAL_TIME");
  if (matches.length > 1 && disambiguation === "REJECT")
    throw new Error("AMBIGUOUS_LOCAL_TIME");
  const selected =
    matches.length === 1 || disambiguation === "EARLIER"
      ? matches[0]
      : matches.at(-1)!;
  return {
    instant: new Date(selected),
    timeZone,
    localDateTime: normalized,
    ambiguous: matches.length > 1,
    disambiguation:
      matches.length > 1 && disambiguation !== "REJECT"
        ? disambiguation
        : undefined,
  };
}

export function formatInFacilityTimeZone(
  instant: Date,
  timeZone: string,
): string {
  if (!isIanaTimeZone(timeZone)) throw new Error("INVALID_TIME_ZONE");
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(instant);
}

function formatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function numericParts(epoch: number, timeZone: string) {
  const result: Record<string, number> = {};
  for (const part of formatter(timeZone).formatToParts(epoch)) {
    if (part.type !== "literal") result[part.type] = Number(part.value);
  }
  return result as Record<
    "year" | "month" | "day" | "hour" | "minute" | "second",
    number
  >;
}

function offsetAt(epoch: number, timeZone: string) {
  const part = numericParts(epoch, timeZone);
  const represented = Date.UTC(
    part.year,
    part.month - 1,
    part.day,
    part.hour,
    part.minute,
    part.second,
  );
  return represented - Math.floor(epoch / 1000) * 1000;
}

function localParts(epoch: number, timeZone: string) {
  const part = numericParts(epoch, timeZone);
  return `${part.year}-${String(part.month).padStart(2, "0")}-${String(part.day).padStart(2, "0")}T${String(part.hour).padStart(2, "0")}:${String(part.minute).padStart(2, "0")}:${String(part.second).padStart(2, "0")}`;
}
