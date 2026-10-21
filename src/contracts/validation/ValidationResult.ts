export type ValidationResult<TValue> =
  | Readonly<{ valid: true; value: TValue }>
  | Readonly<{
      valid: false;
      issues: readonly Readonly<{
        path: readonly (string | number)[];
        code: string;
        message: string;
      }>[];
    }>;
