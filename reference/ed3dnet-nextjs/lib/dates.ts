import { DateTime } from "luxon";

export function shortDateStyle(date: Date | string) {
  if (typeof date === "string") {
    date = new Date(date);
  }

  return DateTime.fromJSDate(date).toFormat("y LLL d");
}

export function longDateStyle(date: Date | string) {
  if (typeof date === "string") {
    date = new Date(date);
  }

  return DateTime.fromJSDate(date).toFormat("cccc, LLLL d, y");
}
