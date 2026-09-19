import { describe, expect, it } from "vitest";

import { saveError } from "./save-error";

describe("saveError", () => {
  it("turns database constraints into a next step", () => {
    expect(saveError({ code: "23505" }, "your services")).toBe(
      "Something in your services is already in use. Change the duplicate value and save again.",
    );
    expect(saveError({ code: "23514" }, "your settings")).toBe(
      "A value in your settings is not valid. Check the form and save again.",
    );
    expect(saveError({ code: "42501" }, "your offer")).toBe(
      "Only the gym owner can change your offer.",
    );
  });

  it("does not leak a raw provider error", () => {
    expect(saveError({ message: "internal database detail" }, "your campaign")).toBe(
      "casdey could not complete the save for your campaign. Nothing changed. Reload and try again. If it keeps happening, contact support.",
    );
  });
});
