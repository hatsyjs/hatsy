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

/**
 * Builds request modification.
 *
 * This is a helper function to avoid TypeScript limitation. It is a good idea to inline it.
 *
 * @category Core
 * @typeparam TMeans  A type of request processing means to modify.
 * @param modification  Partial request modification.
 *
 * @returns Request modification cast to {@link RequestModification}.
 */
export function requestModification<TMeans>(modification: Partial<TMeans>): RequestModification<TMeans> {
  return modification;
}

/**
 * Builds request extension.
 *
 * This is a helper function to avoid TypeScript limitation. It is a good idea to inline it.
 *
 * @category Core
 * @typeparam TMeans  A type of request processing means to modify.
 * @typeparam TExt  A type of request processing means extension.
 * @param extension  Request extension containing all the required properties.
 *
 * @returns Request extension cast to {@link RequestModification}.
 */
export function requestExtension<TMeans, TExt>(extension: TExt): RequestModification<TMeans, TExt> {
  return extension;
}
