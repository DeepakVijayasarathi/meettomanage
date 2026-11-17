import { describe, expect, it } from "vitest";
import { parseLeadCsv } from "./crm";

describe("parseLeadCsv", () => {
  it("reads the team's region exports, with quotes, commas and a BOM", () => {
    const csv = String.fromCharCode(0xfeff) + '"Region","Email","First name","Academy","City","Phone","Category","Source","Notes"\r\n'
      + '"Chennai","contact@arivagam.com","","Prakrith Arivagam","Chennai","+91 94454 11121","Children\'s reading","https://arivagam.com/","Library, robotics and ""weekly"" programs"\r\n';
    const { rows, ignored } = parseLeadCsv(csv);
    expect(ignored).toEqual([]);
    expect(rows).toEqual([{
      region: "Chennai", email: "contact@arivagam.com", academyName: "Prakrith Arivagam", city: "Chennai", phone: "+91 94454 11121",
      segment: "Children's reading", website: "https://arivagam.com/", notes: 'Library, robotics and "weekly" programs',
    }]);
  });

  it("joins first and last name, keeps a label source and reports unknown columns", () => {
    const { rows, ignored } = parseLeadCsv("First Name,Last Name,Mobile,Company,Lead source,Fax\nAsha,Rao,98765 43210,Bright Abacus,Instagram,123\n\n");
    expect(rows).toEqual([{ fullName: "Asha Rao", phone: "98765 43210", academyName: "Bright Abacus", source: "Instagram" }]);
    expect(ignored).toEqual(["Fax"]);
  });

  it("returns nothing for a header-only file", () => {
    expect(parseLeadCsv("Email,Name\n").rows).toEqual([]);
  });
});
