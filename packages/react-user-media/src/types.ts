export type ShallowShapeOf<T> = {
  // biome-ignore lint/suspicious/noExplicitAny: shallow shape intentionally widens values
  [K in keyof T]: any;
};
