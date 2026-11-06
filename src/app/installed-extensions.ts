import { OsfExtension } from '@core/extensions';

/**
 * The extensions installed in this deployment, in menu order.
 *
 * This is the one place a deployment edits to add pages: put the extension
 * package under `src/extensions/<name>/` and list its extension here, for
 * example
 *
 * ```ts
 * import { BINDERHUB_EXTENSION } from '@extensions/binderhub';
 *
 * export const INSTALLED_EXTENSIONS: OsfExtension[] = [BINDERHUB_EXTENSION];
 * ```
 *
 * The list stays empty in the upstream repository. See `docs/extensions.md`.
 */
export const INSTALLED_EXTENSIONS: OsfExtension[] = [];
