export class MemoryMinusOneError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "MemoryMinusOneError";
  }
}

export class StorageError extends MemoryMinusOneError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "StorageError";
  }
}

export class EmbeddingError extends MemoryMinusOneError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "EmbeddingError";
  }
}

export class ConfigError extends MemoryMinusOneError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "ConfigError";
  }
}

export class PluginError extends MemoryMinusOneError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "PluginError";
  }
}
