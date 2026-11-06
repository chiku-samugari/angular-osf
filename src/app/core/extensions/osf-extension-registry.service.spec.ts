import { firstValueFrom } from 'rxjs';

import { computed, Signal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Route } from '@angular/router';

import { RouteContext } from '@core/models/route-context.model';
import { UserPermissions } from '@osf/shared/enums/user-permissions.enum';

import { OsfExtension } from './osf-extension.model';
import { OsfExtensionRegistry } from './osf-extension-registry.service';
import { OSF_EXTENSIONS } from './osf-extensions.token';

describe('OsfExtensionRegistry', () => {
  const routeA: Route = { path: 'alpha', children: [] };
  const routeB: Route = { path: 'beta', children: [] };

  const projectContext = (overrides: Partial<RouteContext> = {}): RouteContext => ({
    resourceId: 'abc12',
    isProject: true,
    isRegistry: false,
    isPreprint: false,
    isCollections: false,
    ...overrides,
  });

  function setup(extensions: OsfExtension[]): OsfExtensionRegistry {
    TestBed.configureTestingModule({
      providers: extensions.map((extension) => ({ provide: OSF_EXTENSIONS, useValue: extension, multi: true })),
    });

    return TestBed.inject(OsfExtensionRegistry);
  }

  it('should expose nothing when no extension is installed', async () => {
    const registry = setup([]);

    expect(registry.extensions).toEqual([]);
    expect(registry.projectRoutes).toEqual([]);
    expect(TestBed.runInInjectionContext(() => registry.resolveProjectMenuItems(signal(projectContext())))()).toEqual(
      []
    );
    expect(await firstValueFrom(registry.getTranslations('en'))).toEqual({});
  });

  it('should concatenate the project routes in installation order', () => {
    const registry = setup([{ id: 'a', projectRoutes: [routeA] }, { id: 'b' }, { id: 'c', projectRoutes: [routeB] }]);

    expect(registry.projectRoutes).toEqual([routeA, routeB]);
  });

  it('should resolve menu items with their defaults and a static visibility of true', () => {
    const registry = setup([
      {
        id: 'a',
        projectMenuItems: [{ id: 'a-page', label: 'a.page', routerLink: 'alpha' }],
      },
    ]);

    const items = TestBed.runInInjectionContext(() => registry.resolveProjectMenuItems(signal(projectContext())));

    expect(items()).toEqual([
      {
        id: 'a-page',
        label: 'a.page',
        routerLink: 'alpha',
        icon: undefined,
        requiredPermission: undefined,
        routerLinkActiveOptions: { exact: false },
        viewOnly: false,
        insertAfter: undefined,
        visible: true,
      },
    ]);
  });

  it('should carry the item options through', () => {
    const registry = setup([
      {
        id: 'a',
        projectMenuItems: [
          {
            id: 'a-page',
            label: 'a.page',
            routerLink: 'alpha',
            icon: 'fas fa-flask',
            requiredPermission: UserPermissions.Write,
            viewOnly: true,
            insertAfter: 'project-wiki',
            routerLinkActiveOptions: { exact: true },
          },
        ],
      },
    ]);

    const items = TestBed.runInInjectionContext(() => registry.resolveProjectMenuItems(signal(projectContext())));

    expect(items()[0]).toMatchObject({
      icon: 'fas fa-flask',
      requiredPermission: UserPermissions.Write,
      viewOnly: true,
      insertAfter: 'project-wiki',
      routerLinkActiveOptions: { exact: true },
    });
  });

  it('should evaluate a dynamic visibility against the live context', () => {
    const visible = vi.fn((context: Signal<RouteContext>) => computed(() => context().resourceId === 'abc12'));
    const registry = setup([
      {
        id: 'a',
        projectMenuItems: [{ id: 'a-page', label: 'a.page', routerLink: 'alpha', visible }],
      },
    ]);
    const context = signal(projectContext());

    const items = TestBed.runInInjectionContext(() => registry.resolveProjectMenuItems(context));

    expect(visible).toHaveBeenCalledTimes(1);
    expect(visible).toHaveBeenCalledWith(context);
    expect(items()[0].visible).toBe(true);

    context.set(projectContext({ resourceId: 'other' }));

    expect(items()[0].visible).toBe(false);
    expect(visible).toHaveBeenCalledTimes(1);
  });

  it('should call a visibility factory once per resolution', () => {
    const visible = vi.fn(() => signal(true).asReadonly());
    const registry = setup([
      {
        id: 'a',
        projectMenuItems: [{ id: 'a-page', label: 'a.page', routerLink: 'alpha', visible }],
      },
    ]);

    TestBed.runInInjectionContext(() => registry.resolveProjectMenuItems(signal(projectContext())));
    TestBed.runInInjectionContext(() => registry.resolveProjectMenuItems(signal(projectContext())));

    expect(visible).toHaveBeenCalledTimes(2);
  });

  it('should merge translations given as a map, later extensions winning', async () => {
    const registry = setup([
      { id: 'a', translations: { en: { ext: { title: 'A', onlyA: 'a' } }, ja: { ext: { title: 'あ' } } } },
      { id: 'b', translations: { en: { ext: { title: 'B' } } } },
      { id: 'c' },
    ]);

    expect(await firstValueFrom(registry.getTranslations('en'))).toEqual({ ext: { title: 'B', onlyA: 'a' } });
    expect(await firstValueFrom(registry.getTranslations('ja'))).toEqual({ ext: { title: 'あ' } });
    expect(await firstValueFrom(registry.getTranslations('fr'))).toEqual({});
  });

  it('should accept translations given as a function, synchronous or not', async () => {
    const registry = setup([
      { id: 'a', translations: (lang) => (lang === 'en' ? { ext: { a: 'a' } } : undefined) },
      { id: 'b', translations: (lang) => Promise.resolve(lang === 'en' ? { ext: { b: 'b' } } : undefined) },
    ]);

    expect(await firstValueFrom(registry.getTranslations('en'))).toEqual({ ext: { a: 'a', b: 'b' } });
    expect(await firstValueFrom(registry.getTranslations('ja'))).toEqual({});
  });

  it('should refuse an extension without an id', () => {
    expect(() => setup([{ id: '' }])).toThrow(/non-empty id/);
  });

  it('should refuse an extension installed twice', () => {
    expect(() => setup([{ id: 'a' }, { id: 'a' }])).toThrow(/"a" is installed twice/);
  });

  it('should refuse a menu item without an id', () => {
    expect(() => setup([{ id: 'a', projectMenuItems: [{ id: '', label: 'x', routerLink: 'x' }] }])).toThrow(
      /menu item without an id/
    );
  });

  it('should refuse a menu item id the project menu already uses', () => {
    expect(() => setup([{ id: 'a', projectMenuItems: [{ id: 'project-wiki', label: 'x', routerLink: 'x' }] }])).toThrow(
      /reuses the project menu item id "project-wiki"/
    );
  });

  it('should refuse a menu item id used by another extension', () => {
    expect(() =>
      setup([
        { id: 'a', projectMenuItems: [{ id: 'shared', label: 'x', routerLink: 'x' }] },
        { id: 'b', projectMenuItems: [{ id: 'shared', label: 'y', routerLink: 'y' }] },
      ])
    ).toThrow(/extension "b" reuses the project menu item id "shared"/);
  });
});
