export class PromptCacheConfigurationError extends Error {
  readonly code = "PROMPT_CACHE_CONFIGURATION_INVALID";
  constructor() { super("Provider prompt-cache configuration or prepared request is invalid."); this.name = "PromptCacheConfigurationError"; }
}
