# Extensions

## Index

- [Overview](#overview)
- [What an extension can contribute](#what-an-extension-can-contribute)
- [The contract](#the-contract)
- [How the application consumes an extension](#how-the-application-consumes-an-extension)
- [Writing an extension](#writing-an-extension)
- [Installing an extension](#installing-an-extension)
- [Rules and limits](#rules-and-limits)

---

## Overview

An **extension** adds pages and navigation entries to the application without changes to the application's own code. It exists for deployments that offer a service beyond OSF's: a hosting institution plugs its page in, keeps the page's code in its own package, and tracks upstream releases without carrying a fork.

An extension is a plain object (`OsfExtension`) exported by an npm package or any other module. The application discovers extensions through **one registration site**, `src/app/installed-extensions.ts`, whose list is empty in this repository. Everything else is read from dependency injection: the extension's routes, menu items, providers and translations.

Extensions are compiled **into** the application build, like a feature: an extension package is placed under `src/extensions/<name>/` (ignored by git) and imported through the `@extensions/<name>` alias. It may therefore use the application's shared code (`@osf/shared/...`, `@core/...`) through the usual path aliases, and it is subject to the same Angular version, lint rules and test runner as the application.

---

## What an extension can contribute

| Contribution       | Where it appears                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Project routes     | Children of the project shell: a route with `path: 'alpha'` answers `/{projectId}/alpha`.                          |
| Project menu items | Entries of the **Project** section of the navigation menu, placed after a named item or at the end of the section. |
| Providers          | Root-level providers: NGXS states through `provideStates([...])`, services, interceptors.                          |
| Translations       | Merged over the application's `assets/i18n/{lang}.json`, the extension's keys winning.                             |

Other sections of the menu (registrations, preprints, ...) and other route trees are not extensible today; the contract leaves room for them.

---

## The contract

Everything an extension author needs is exported from `@core/extensions`:

```ts
export interface OsfExtension {
  id: string; // unique, kebab-case
  projectRoutes?: Routes; // mounted under /{projectId}/
  projectMenuItems?: OsfExtensionMenuItem[];
  providers?: (Provider | EnvironmentProviders)[];
  translations?: OsfExtensionTranslations; // { en: {...}, ja: {...} } or (lang) => ...
}

export interface OsfExtensionMenuItem {
  id: string; // unique across the whole menu
  label: string; // translation key
  routerLink: string; // project-relative path, i.e. the `path` of one of the project routes
  icon?: string;
  requiredPermission?: UserPermissions; // hidden unless the user holds it on the project
  viewOnly?: boolean; // offered through view-only links? default false
  insertAfter?: string; // id of the Project menu item to follow, e.g. 'project-wiki'
  routerLinkActiveOptions?: { exact: boolean } | IsActiveMatchOptions; // default { exact: false }
  visible?: (context: Signal<RouteContext>) => Signal<boolean>; // dynamic visibility, see below
}
```

The `visible` factory is for pages a project may or may not offer, like the wiki, which follows a project setting. It is called once per navigation-menu instance (the application renders one menu for wide screens and one in the mobile drawer, which is created and destroyed as the drawer opens and closes), inside that instance's injection context, with the live `RouteContext` the menu is built from. It may `inject()` services, read store selectors and create `effect()`s. Keep shared work, such as a request that decides the answer, in a root-provided service so that it is not repeated per instance.

---

## How the application consumes an extension

- `src/app/app.config.ts` calls `provideOsfExtensions(INSTALLED_EXTENSIONS)`: each extension is registered under the `OSF_EXTENSIONS` multi-token, its `providers` are added to the root injector, and an environment initializer validates the whole set at bootstrap (unique ids, menu item ids that do not collide with the application's own), so that a misconfigured deployment fails at startup, not on first use.
- `OsfExtensionRegistry` (root service) exposes the installed extensions' project routes, resolves their menu items against a menu's route context, and merges their translations.
- `src/app/features/project/project.routes.ts` ends with an empty-path `loadChildren` entry that returns `OsfExtensionRegistry.projectRoutes`. The project's own routes are matched first; an extension route is tried only when none of them matched.
- `NavMenuComponent` hands its `routeContext` signal to the registry and passes the resolved items to `updateMenuItems()`, which places them into the Project section (permission check, view-only filter, project-relative links, `view_only` query parameter), exactly like the project's own entries.
- `TranslateLoader` is `OsfExtensionTranslateLoader`: it decorates the loader that fetches the application's files (`OSF_BASE_TRANSLATE_LOADER`: the HTTP loader in the browser, the bundled JSON on the server) and merges the extensions' translations over them, so a language loads atomically.

---

## Writing an extension

A minimal extension package:

```
my-osf-extension/
├── package.json          # name, version, peerDependencies; no build step, no "main" needed
├── index.ts              # re-exports the OsfExtension object: `export { ALPHA_EXTENSION } from './src';`
└── src/
    ├── index.ts          # the OsfExtension object
    ├── alpha.component.ts
    ├── alpha.component.spec.ts
    └── i18n/en.ts, ja.ts
```

```ts
// src/index.ts
import { computed } from '@angular/core';

import { OsfExtension } from '@core/extensions';
import { UserPermissions } from '@osf/shared/enums/user-permissions.enum';

import { EN } from './i18n/en';
import { JA } from './i18n/ja';

export const ALPHA_EXTENSION: OsfExtension = {
  id: 'alpha',
  projectRoutes: [
    {
      path: 'alpha',
      data: { canonicalPath: 'alpha' },
      loadComponent: () => import('./alpha.component').then((m) => m.AlphaComponent),
    },
  ],
  projectMenuItems: [
    {
      id: 'project-alpha',
      label: 'alpha.menu', // a key of the extension's own translations
      routerLink: 'alpha',
      insertAfter: 'project-wiki',
      requiredPermission: UserPermissions.Read,
      visible: (context) => computed(() => context().isProject), // or a store selector, a probe, ...
    },
  ],
  translations: { en: EN, ja: JA },
};
```

The page itself is an ordinary standalone component. Because the sources are compiled with the application, it may import the shared components, services and stores (`@osf/shared/...`) and the core tokens (`@core/...`); it is type-checked, linted (`ng lint` covers `src/**`) and bundled like the application's own features, and its `*.spec.ts` files run under the application's `ng test` with the application's testing helpers (`@testing/*`) available. Use `loadComponent` in the routes: the page then lands in its own lazy chunk, as it did for the sample extension this mechanism was verified with.

Declare everything the extension imports from the application's dependency set (`@angular/*`, `@ngxs/store`, `@ngx-translate/core`, `primeng`, `rxjs`, ...) as **peer dependencies**. A dependency the application does not have must be installed **in the application** (`npm install <package>` at the application root); never run `npm install` inside the extension directory, since a nested `node_modules` would resolve to a second copy of Angular.

Why the sources are compiled by the application rather than installed as a prebuilt package: TypeScript type-checks `.ts` sources found under `node_modules` but never emits them (it treats them as external libraries), so the Angular builder rejects an extension kept there; and a prebuilt Angular library could only use the application's internals by compiling against a copy of its sources. An extension that uses nothing of the application (Angular, PrimeNG and its own code only) may be built with `ng-packagr`, installed with `npm install` and registered the same way; the registry does not care where the object comes from.

A page that must not be reachable for some projects (or some users) guards its route the usual way (`canMatch`, `canActivate`); the menu item's `visible` only decides what the menu shows.

---

## Installing an extension

1. Put the package under `src/extensions/<name>/` (a `git clone`, a git submodule of the deployment's fork, or an unpacked `npm pack` tarball). The directory is ignored by git except for its README.
2. Install the extension's peer dependencies the application lacks, if any, at the application root.
3. List it in `src/app/installed-extensions.ts`:

   ```ts
   import { ALPHA_EXTENSION } from '@extensions/my-osf-extension';

   export const INSTALLED_EXTENSIONS: OsfExtension[] = [ALPHA_EXTENSION];
   ```

4. Build. That file is the only line of the application a deployment changes; `angular.json`'s `fileReplacements` can swap it per build configuration if preferred.

Keep the list empty in this repository.

---

## Rules and limits

- **Ids.** Extension ids and menu item ids are unique; a menu item id must not reuse one of the project's own (`project-overview`, `project-wiki`, ...). Validation runs at bootstrap.
- **Route precedence.** The project's own pages win over an extension route with the same path.
- **Canonical path.** Set `data.canonicalPath` on the extension's project routes, as the project's own routes do: the project shell derives canonical URLs and meta tags from it.
- **Server-side rendering.** `src/app/app.routes.server.ts` renders unknown project paths on the client (`**` is `RenderMode.Client`), which is what an extension page gets unless the deployment adds a server route for it.
- **Menu placement.** Items go into the Project section only, after the item named by `insertAfter` or at the end; when the anchor is absent (for instance filtered out in view-only mode) the item is appended.
- **View-only links.** Extension items are left out of the view-only menu unless `viewOnly: true`.
- **Translations.** An extension's keys are merged over the application's for every language it provides; it can therefore override application strings, deliberately or not. Namespace keys by extension (`alpha.*`) and add only the `navigation.*` key the menu item needs.
- **Coupling.** An extension that imports application internals must follow the application's releases; the contract in `@core/extensions` is the only part of the application that promises stability.
