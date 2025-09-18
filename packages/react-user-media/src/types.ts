export type ShallowShapeOf<T> = {
	// biome-ignore lint/suspicious/noExplicitAny: typescript utility type
	[K in keyof T]: any;
};
