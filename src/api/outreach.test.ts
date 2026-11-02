import { describe, expect, it } from "vitest";
import { parseCsvRows, prospectsFromCsv } from "./outreach";

describe("outreach CSV import", () => {
  it("reads quoted fields with commas, escaped quotes and Windows line endings", () => {
    expect(parseCsvRows('a,"b, c","say ""hi"""\r\n1,2,3\r\n')).toEqual([["a", "b, c", 'say "hi"'], ["1", "2", "3"]]);
  });

  it("maps columns by name in any order and drops rows without an e-mail", () => {
    const csv = "﻿City,Academy,E-mail,Name\nChennai,Sunrise Abacus,Anita@Sunrise.in,Anita\nMadurai,No Mail Academy,,Ravi\n";
    const { rows, missingEmailColumn } = prospectsFromCsv(csv);
    expect(missingEmailColumn).toBe(false);
    expect(rows).toEqual([{ email: "anita@sunrise.in", firstName: "Anita", academyName: "Sunrise Abacus", city: "Chennai", phone: null, source: null, notes: null }]);
  });

  it("says when there is no e-mail column", () => {
    expect(prospectsFromCsv("Name,City\nAnita,Chennai").missingEmailColumn).toBe(true);
  });
});
