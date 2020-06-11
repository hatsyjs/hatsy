/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
/**
 * Modification or extension of {@link RequestContext request processing means}.
 *
 * The properties present here are added to new context potentially replacing the original ones.
 *
 * @category Core
 * @typeparam TMeans  A type of request processing means to modify.
 * @typeparam TExt  A type of request processing means extension.
 */
export type RequestModification<TMeans, TExt = object> = {
  [K in keyof TMeans]?: TMeans[K];
} & {
  [K in Exclude<keyof TExt, keyof TMeans>]: TExt[K];
};
