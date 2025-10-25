import crypto from "node:crypto";

export const makeIdemKey = () => crypto.randomUUID();

export const clampIdemKey = (key?: string) =>
  key && key.length <= 64 ? key : undefined;
