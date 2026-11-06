import { mergeDeep, TranslationObject } from '@ngx-translate/core';

import { from, map, Observable } from 'rxjs';

import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { Routes } from '@angular/router';

import { PROJECT_MENU_ITEMS } from '@core/constants/nav-items.constant';
import { CustomMenuItem } from '@core/models/custom-menu-item.model';
import { RouteContext } from '@core/models/route-context.model';

import { OsfExtension, OsfExtensionMenuItem } from './osf-extension.model';
import { OSF_EXTENSIONS } from './osf-extensions.token';

/**
 * An extension's project menu item with its dynamic visibility evaluated,
 * ready for `updateMenuItems()` to place into the Project section.
 */
export interface OsfResolvedExtensionMenuItem extends CustomMenuItem {
  id: string;
  routerLink: string;
  visible: boolean;
  viewOnly: boolean;
  insertAfter?: string;
}

/**
 * Reads the installed extensions (`OSF_EXTENSIONS`), validates them once at
 * startup and exposes what the application's seams consume: the project
 * routes, the project menu items and the translations.
 */
@Injectable({ providedIn: 'root' })
export class OsfExtensionRegistry {
  readonly extensions: readonly OsfExtension[];

  /** The project routes of all extensions, in installation order. */
  readonly projectRoutes: Routes;

  private readonly projectMenuItems: readonly OsfExtensionMenuItem[];

  constructor() {
    const extensions = inject(OSF_EXTENSIONS, { optional: true }) ?? [];

    validateExtensions(extensions);

    this.extensions = extensions;
    this.projectRoutes = extensions.flatMap((extension) => extension.projectRoutes ?? []);
    this.projectMenuItems = extensions.flatMap((extension) => extension.projectMenuItems ?? []);
  }

  /**
   * Resolves the extensions' project menu items against the live route
   * context of one navigation menu. Must be called in an injection context
   * (a component's constructor or field initializer): the items' `visible`
   * factories run there, once per call.
   */
  resolveProjectMenuItems(context: Signal<RouteContext>): Signal<OsfResolvedExtensionMenuItem[]> {
    const entries = this.projectMenuItems.map((item) => ({
      item,
      visible: item.visible ? item.visible(context) : signal(true).asReadonly(),
    }));

    return computed(() =>
      entries.map(({ item, visible }) => ({
        id: item.id,
        label: item.label,
        routerLink: item.routerLink,
        icon: item.icon,
        requiredPermission: item.requiredPermission,
        routerLinkActiveOptions: item.routerLinkActiveOptions ?? { exact: false },
        viewOnly: item.viewOnly ?? false,
        insertAfter: item.insertAfter,
        visible: visible(),
      }))
    );
  }

  /** The extensions' translations of one language, merged in installation order. */
  getTranslations(lang: string): Observable<TranslationObject> {
    const translations = this.extensions.map((extension) => resolveTranslations(extension, lang));

    return from(Promise.all(translations)).pipe(
      map((resolved) =>
        resolved.reduce<TranslationObject>((merged, current) => (current ? mergeDeep(merged, current) : merged), {})
      )
    );
  }
}

function resolveTranslations(extension: OsfExtension, lang: string): Promise<TranslationObject | undefined> {
  const translations = extension.translations;

  if (!translations) {
    return Promise.resolve(undefined);
  }

  if (typeof translations === 'function') {
    return Promise.resolve(translations(lang));
  }

  return Promise.resolve(translations[lang]);
}

function validateExtensions(extensions: OsfExtension[]): void {
  const extensionIds = new Set<string>();
  const menuItemIds = new Set(PROJECT_MENU_ITEMS.map((item) => item.id));

  for (const extension of extensions) {
    if (!extension.id) {
      throw new Error('OSF extensions: every extension needs a non-empty id');
    }

    if (extensionIds.has(extension.id)) {
      throw new Error(`OSF extensions: extension id "${extension.id}" is installed twice`);
    }

    extensionIds.add(extension.id);

    for (const item of extension.projectMenuItems ?? []) {
      if (!item.id) {
        throw new Error(`OSF extensions: extension "${extension.id}" has a project menu item without an id`);
      }

      if (menuItemIds.has(item.id)) {
        throw new Error(`OSF extensions: extension "${extension.id}" reuses the project menu item id "${item.id}"`);
      }

      menuItemIds.add(item.id);
    }
  }
}
