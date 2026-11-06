import { TranslationObject } from '@ngx-translate/core';

import { EnvironmentProviders, Provider, Signal } from '@angular/core';
import { IsActiveMatchOptions, Routes } from '@angular/router';

import { RouteContext } from '@core/models/route-context.model';
import { UserPermissions } from '@osf/shared/enums/user-permissions.enum';

/**
 * A page-level extension of the application: pages and navigation entries
 * that a deployment adds without changing the application's own code.
 *
 * An extension is a plain object exported by an npm package (or any module)
 * and listed in `src/app/installed-extensions.ts`. Its sources are compiled
 * into the application like a feature, so it may use the application's
 * shared code (`@osf/shared/...`, `@core/...`) the way a feature does.
 *
 * See `docs/extensions.md`.
 */
export interface OsfExtension {
  /**
   * Unique, kebab-case id (`binderhub`). Used to name the extension in error
   * messages and to keep installed extensions apart.
   */
  id: string;

  /**
   * Routes mounted under the project shell: a route with `path: 'binderhub'`
   * answers `/{projectId}/binderhub`. Use `loadComponent` so the page stays
   * out of the main bundle, and set `data.canonicalPath` like the project's
   * own pages do.
   */
  projectRoutes?: Routes;

  /** Items added to the Project section of the navigation menu. */
  projectMenuItems?: OsfExtensionMenuItem[];

  /**
   * Providers registered at the application root: NGXS states through
   * `provideStates([...])`, services, HTTP interceptors, ...
   */
  providers?: (Provider | EnvironmentProviders)[];

  /**
   * Translations, merged over the application's own `assets/i18n/{lang}.json`
   * with the extension's keys winning. Either a map `lang -> translations`
   * or a function returning the translations of one language (possibly
   * lazily, through a dynamic `import()`).
   */
  translations?: OsfExtensionTranslations;
}

export type OsfExtensionTranslations =
  | Partial<Record<string, TranslationObject>>
  | ((lang: string) => TranslationObject | undefined | Promise<TranslationObject | undefined>);

/**
 * A navigation entry contributed by an extension to the Project section of
 * the menu. It is rendered like the application's own project entries:
 * the label is translated, the link is made relative to the current project,
 * and the view-only query parameter is carried along.
 */
export interface OsfExtensionMenuItem {
  /** Unique across the whole menu (the application's own ids included). */
  id: string;

  /** Translation key of the label. */
  label: string;

  /** Project-relative path: the `path` of one of the extension's project routes. */
  routerLink: string;

  /** Optional icon class, as in the application's own menu items. */
  icon?: string;

  /** Hidden unless the current user holds this permission on the project. */
  requiredPermission?: UserPermissions;

  /**
   * Whether the item is offered to visitors coming through a view-only link.
   * Defaults to `false`, i.e. hidden in view-only mode.
   */
  viewOnly?: boolean;

  /**
   * Id of the Project menu item after which this one is placed, for example
   * `project-wiki`. Appended at the end of the section when omitted or when
   * the id is not present (it may be filtered out in view-only mode).
   */
  insertAfter?: string;

  /** Defaults to `{ exact: false }`. */
  routerLinkActiveOptions?: { exact: boolean } | IsActiveMatchOptions;

  /**
   * Optional dynamic visibility, for pages the project may or may not
   * offer (like the wiki, which follows a project setting). Omitted means
   * always visible, subject to `requiredPermission` and `viewOnly`.
   *
   * The function is called once per navigation-menu instance (the
   * application renders one menu for wide screens and one in the mobile
   * drawer, which is created and destroyed as the drawer opens and closes),
   * inside that instance's injection context, with the live route context
   * the menu is built from. It may `inject()` services, read store
   * selectors and create `effect()`s; keep shared work, such as requests
   * made to decide the answer, in a root-provided service so that it is not
   * repeated per instance.
   */
  visible?: OsfExtensionMenuItemVisibility;
}

export type OsfExtensionMenuItemVisibility = (context: Signal<RouteContext>) => Signal<boolean>;
