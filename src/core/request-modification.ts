/**
 * Modification or extension of {@link RequestContext request processing means}.
 *
 * The properties present here are added to new context potentially replacing the original ones.
 *
 * @typeParam TMeans - A type of request processing means to modify.
 * @typeParam TExt - A type of request processing means extension.
 */
export type RequestModification<TMeans, TExt = object> = {
  [K in keyof TMeans]?: TMeans[K] | undefined;
} & {
  [K in Exclude<keyof TExt, keyof TMeans>]: TExt[K];
};

/**
 * Builds request modification that updates some of the existing properties of request processing means.
 *
 * This is a helper function to avoid TypeScript limitation. It is a good idea to inline it.
 *
 * @typeParam TMeans - A type of request processing means to modify.
 * @param modification - Partial request modification.
 *
 * @returns Request modification cast to {@link RequestModification}.
 */
export function requestUpdate<TMeans>(modification: Partial<TMeans>): RequestModification<TMeans> {
  return modification;
}

/**
 * Builds request modification that adds new properties to request processing means.
 *
 * This is a helper function to avoid TypeScript limitation. It is a good idea to inline it.
 *
 * @typeParam TMeans - A type of request processing means to modify.
 * @typeParam TExt - A type of request processing means extension.
 * @param extension - Request extension containing all the required properties.
 *
 * @returns Request extension cast to {@link RequestModification}.
 */
export function requestExtension<TMeans, TExt>(extension: TExt): RequestModification<TMeans, TExt> {
  return extension;
}
