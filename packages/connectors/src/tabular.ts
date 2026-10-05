/** Provider-independent tabular input contracts. */

export type TabularRow = Record<string, unknown>;

export interface TabularDataSource {
  readonly type: string;
  load(): Promise<TabularRow[]>;
}

/**
 * Parser supplied by the host application or infrastructure adapter.
 * The connector boundary intentionally does not depend on an Excel/CSV library.
 */
export interface TabularParser<TInput = Uint8Array> {
  parse(input: TInput): Promise<TabularRow[]>;
}

export interface TabularConnectorOptions<TInput = Uint8Array> {
  readonly input: TInput;
  readonly parser: TabularParser<TInput>;
}

export class ParsedTabularDataSource<TInput = Uint8Array>
  implements TabularDataSource
{
  readonly type = "tabular";

  constructor(private readonly options: TabularConnectorOptions<TInput>) {}

  load(): Promise<TabularRow[]> {
    return this.options.parser.parse(this.options.input);
  }
}

/**
 * CSV parser contract for hosts that already have a CSV parser available.
 * Parsing remains outside the workflow core and connector boundary.
 */
export interface CsvParser extends TabularParser<string> {}

export function createCsvDataSource(
  input: string,
  parser: CsvParser,
): TabularDataSource {
  return new ParsedTabularDataSource({ input, parser });
}

/**
 * Excel parser contract. The actual XLSX implementation is supplied by the host.
 */
export interface ExcelParser extends TabularParser<Uint8Array> {}

export function createExcelDataSource(
  input: Uint8Array,
  parser: ExcelParser,
): TabularDataSource {
  return new ParsedTabularDataSource({ input, parser });
}
