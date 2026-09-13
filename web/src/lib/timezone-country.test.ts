import { describe, expect, it } from "vitest";

import { countryFromTimezone, regionName } from "./timezone-country";

describe("countryFromTimezone", () => {
  it("names the country of a European zone", () => {
    expect(countryFromTimezone("Europe/Rome")).toBe("IT");
    expect(countryFromTimezone("Europe/Dublin")).toBe("IE");
    expect(countryFromTimezone("Atlantic/Canary")).toBe("ES");
  });

  it("knows both spellings of a renamed zone", () => {
    expect(countryFromTimezone("Asia/Calcutta")).toBe("IN");
    expect(countryFromTimezone("Asia/Kolkata")).toBe("IN");
  });

  it("reads an unlisted or missing zone as unknown rather than guessing", () => {
    expect(countryFromTimezone("Etc/UTC")).toBeNull();
    expect(countryFromTimezone(null)).toBeNull();
    expect(countryFromTimezone("")).toBeNull();
  });
});

describe("regionName", () => {
  it("turns a code into an English country name", () => {
    expect(regionName("IT")).toBe("Italy");
    expect(regionName("GB")).toBe("United Kingdom");
  });
});
