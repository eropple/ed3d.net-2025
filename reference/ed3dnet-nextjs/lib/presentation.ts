import { format } from "date-fns";

import { SITE_NAME } from "./constants";

export function titleize(str: string) {
  return `${SITE_NAME} | ${str.trim()}`;
}

export function reverseTitleize(str: string) {
  return `${str.trim()} | ${SITE_NAME}`;
}

export function shortDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;

  return format(date, "d MMM yyy");
}

export function monYearDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;

  return format(date, "MMM yyy");
}

export function monYearDateLong(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;

  return format(date, "MMMM yyy");
}
