import JSZip from "jszip";
import type { ExcelParser, TabularRow } from "./tabular.ts";

function columnNameToIndex(reference: string): number {
  const letters = reference.replace(/\d+$/, "").toUpperCase();
  let index = 0;

  for (const letter of letters) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }

  return index - 1;
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function getAttribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match?.[1];
}

function getTagValue(xml: string, tagName: string): string | undefined {
  const match = xml.match(
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`),
  );

  return match?.[1];
}

function getFirstTag(xml: string, tagName: string): string | undefined {
  return xml.match(new RegExp(`<${tagName}\\b[^>]*(?:/>|>[\\s\\S]*?</${tagName}>)`))?.[0];
}

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((text) => decodeXml(text[1]))
      .join(""),
  );
}

function parseCellValue(
  cellXml: string,
  sharedStrings: string[],
): unknown {
  const cellTag = cellXml.match(/<c\b[^>]*>/)?.[0] ?? "";
  const type = getAttribute(cellTag, "t");
  const rawValue = getTagValue(cellXml, "v");

  if (type === "inlineStr") {
    const inline = getTagValue(cellXml, "is") ?? "";
    return [...inline.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((match) => decodeXml(match[1]))
      .join("");
  }

  if (rawValue === undefined) {
    return "";
  }

  const value = decodeXml(rawValue);

  if (type === "s") {
    const index = Number(value);
    return sharedStrings[index] ?? "";
  }

  if (type === "b") {
    return value === "1";
  }

  const number = Number(value);
  return Number.isNaN(number) ? value : number;
}

export class XlsxParser implements ExcelParser {
  async parse(input: Uint8Array): Promise<TabularRow[]> {
    const zip = await JSZip.loadAsync(input);

    const sharedStringsFile = zip.file("xl/sharedStrings.xml");
    const sharedStrings = sharedStringsFile
      ? parseSharedStrings(await sharedStringsFile.async("string"))
      : [];

    const workbookFile = zip.file("xl/workbook.xml");
    if (!workbookFile) {
      throw new Error("Invalid XLSX file: workbook.xml is missing.");
    }

    const workbookXml = await workbookFile.async("string");
    const firstSheet = getFirstTag(workbookXml, "sheet");
    const relationshipId = firstSheet
      ? getAttribute(firstSheet, "r:id")
      : undefined;

    if (!relationshipId) {
      throw new Error("Invalid XLSX file: first worksheet is missing.");
    }

    const relationshipsFile = zip.file("xl/_rels/workbook.xml.rels");
    if (!relationshipsFile) {
      throw new Error("Invalid XLSX file: workbook relationships are missing.");
    }

    const relationshipsXml = await relationshipsFile.async("string");
    const relationship = [...relationshipsXml.matchAll(/<Relationship\b[^>]*>/g)]
      .map((match) => match[0])
      .find((tag) => getAttribute(tag, "Id") === relationshipId);

    const target = relationship
      ? getAttribute(relationship, "Target")
      : undefined;

    if (!target) {
      throw new Error("Invalid XLSX file: first worksheet target is missing.");
    }

    const worksheetPath = target.startsWith("/")
      ? target.slice(1)
      : `xl/${target.replace(/^\/+/, "")}`;

    const worksheetFile = zip.file(worksheetPath);
    if (!worksheetFile) {
      throw new Error("Invalid XLSX file: worksheet is missing.");
    }

    const worksheetXml = await worksheetFile.async("string");
    const rows = [...worksheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)]
      .map((match) => match[1]);

    if (rows.length === 0) {
      return [];
    }

    const parsedRows = rows.map((rowXml) => {
      const cells = [...rowXml.matchAll(/<c\b[^>]*>[\s\S]*?<\/c>/g)];
      const values: unknown[] = [];

      for (const cellMatch of cells) {
        const cellXml = cellMatch[0];
        const cellTag = cellXml.match(/<c\b[^>]*>/)?.[0] ?? "";
        const reference = getAttribute(cellTag, "r");

        if (!reference) {
          continue;
        }

        values[columnNameToIndex(reference)] = parseCellValue(
          cellXml,
          sharedStrings,
        );
      }

      return values;
    });

    const headers = (parsedRows[0] ?? []).map((value, index) =>
      value === undefined || value === "" ? `Column ${index + 1}` : String(value),
    );

    return parsedRows.slice(1).map((values) => {
      const row: TabularRow = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });

      return row;
    });
  }
}

export function createXlsxParser(): ExcelParser {
  return new XlsxParser();
}
