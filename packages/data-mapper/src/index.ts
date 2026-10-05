import type {
  FieldMapping,
  ValidationResult,
} from "../../types/src/index.ts";

export interface DataValidator {
  validate(
    data: Record<string, unknown>,
    rules: ValidationRule[],
  ): ValidationResult;
}

export interface DataMapper {
  map(
    source: Record<string, unknown>,
    mappings: FieldMapping[],
  ): Record<string, unknown>;
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: "string" | "number" | "boolean" | "object";
  allowedValues?: unknown[];
}

export interface DataMappingPipeline {
  validate(
    data: Record<string, unknown>,
    rules: ValidationRule[],
  ): ValidationResult;

  map(
    source: Record<string, unknown>,
    mappings: FieldMapping[],
  ): Record<string, unknown>;
}
