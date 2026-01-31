/**
 * Simple logger utility
 */

export interface Logger {
  info: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

export function createLogger(name: string): Logger {
  const prefix = `[${name}]`;
  
  return {
    info: (message: string, ...args: any[]) => {
      console.log(prefix, message, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(prefix, message, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(prefix, message, ...args);
    },
    debug: (message: string, ...args: any[]) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(prefix, '[DEBUG]', message, ...args);
      }
    }
  };
}
