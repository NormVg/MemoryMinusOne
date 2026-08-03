export interface Logger {
  debug(namespace: string, message: string, meta?: any): void;
  info(namespace: string, message: string, meta?: any): void;
  warn(namespace: string, message: string, meta?: any): void;
  error(namespace: string, message: string, meta?: any): void;
}

export interface LoggerOptions {
  enabled?: boolean;
  namespaces?: string[]; // e.g., ["engine", "temporal", "*"]
}

export class DefaultLogger implements Logger {
  private enabled: boolean;
  private namespaces: Set<string>;
  private matchAll: boolean;

  constructor(options: LoggerOptions = {}) {
    this.enabled = options.enabled ?? false;
    this.matchAll = options.namespaces?.includes("*") ?? true;
    this.namespaces = new Set(options.namespaces || []);
  }

  private shouldLog(namespace: string): boolean {
    if (!this.enabled) return false;
    if (this.matchAll) return true;
    return this.namespaces.has(namespace);
  }

  private format(level: string, namespace: string, message: string, meta?: any) {
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    return `[m1:${namespace}] ${message}${metaStr}`;
  }

  debug(namespace: string, message: string, meta?: any) {
    if (this.shouldLog(namespace)) {
      console.debug(this.format("DEBUG", namespace, message, meta));
    }
  }

  info(namespace: string, message: string, meta?: any) {
    if (this.shouldLog(namespace)) {
      console.info(this.format("INFO", namespace, message, meta));
    }
  }

  warn(namespace: string, message: string, meta?: any) {
    if (this.shouldLog(namespace)) {
      console.warn(this.format("WARN", namespace, message, meta));
    }
  }

  error(namespace: string, message: string, meta?: any) {
    if (this.shouldLog(namespace)) {
      console.error(this.format("ERROR", namespace, message, meta));
    }
  }
}
