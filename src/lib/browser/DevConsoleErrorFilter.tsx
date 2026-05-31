"use client";

import { useEffect } from "react";

function stringifyConsoleArg(arg: unknown): string {
  if (arg instanceof Error) return `${arg.name}\n${arg.message}\n${arg.stack ?? ""}`;
  if (typeof arg === "string") return arg;
  if (!arg || typeof arg !== "object") return String(arg ?? "");

  const record = arg as Record<string, unknown>;
  const knownFields = ["name", "message", "stack", "reason", "error"]
    .map((key) => record[key])
    .filter((value): value is NonNullable<unknown> => value !== null && value !== undefined)
    .map(stringifyConsoleArg);

  try {
    return [...knownFields, JSON.stringify(arg)].join("\n");
  } catch {
    return knownFields.join("\n") || Object.prototype.toString.call(arg);
  }
}

function isNoisyExtensionPingFailure(args: unknown[]): boolean {
  const message = args.map(stringifyConsoleArg).join("\n");
  return /extension unavailable/i.test(message) && /ping failed/i.test(message);
}

function isNoisyApiWsDisconnect(args: unknown[]): boolean {
  const message = args.map(stringifyConsoleArg).join("\n");
  const isWsModule = /API-WS:|RPC-CORE:/i.test(message);
  const isDisconnect = /disconnected from ws/i.test(message);
  const isClosure = /Normal Closure|Abnormal Closure/i.test(message);
  return isWsModule && isDisconnect && isClosure;
}

export function DevConsoleErrorFilter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      if (isNoisyExtensionPingFailure(args)) return;
      if (isNoisyApiWsDisconnect(args)) return;
      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return null;
}
