import { MENU_ITEMS, PROJECT_MENU_ITEMS } from '@core/constants/nav-items.constant';
import { OsfResolvedExtensionMenuItem } from '@core/extensions';
import { CustomMenuItem } from '@core/models/custom-menu-item.model';
import { RouteContext } from '@core/models/route-context.model';
import { UserPermissions } from '@osf/shared/enums/user-permissions.enum';

import { updateMenuItems } from './nav-menu.helper';

describe('nav-menu.helper updateMenuItems with extension items', () => {
  const projectContext = (overrides: Partial<RouteContext> = {}): RouteContext => ({
    resourceId: 'abc12',
    isProject: true,
    isRegistry: false,
    isPreprint: false,
    isCollections: false,
    permissions: [UserPermissions.Read, UserPermissions.Write, UserPermissions.Admin],
    ...overrides,
  });

  const extensionItem = (overrides: Partial<OsfResolvedExtensionMenuItem> = {}): OsfResolvedExtensionMenuItem => ({
    id: 'ext-alpha',
    label: 'alpha.menu',
    routerLink: 'alpha',
    routerLinkActiveOptions: { exact: false },
    viewOnly: false,
    visible: true,
    ...overrides,
  });

  const projectItems = (items: CustomMenuItem[]): CustomMenuItem[] => {
    const projects = items.find((item) => item.id === 'projects');
    const details = projects?.items?.find((item) => item.id === 'project-details');
    return details?.items ?? [];
  };

  const ids = (items: CustomMenuItem[]): string[] => items.map((item) => item.id as string);

  it('should leave the project menu as it is without extension items', () => {
    const items = projectItems(updateMenuItems(MENU_ITEMS, projectContext()));

    expect(ids(items)).toEqual(ids(PROJECT_MENU_ITEMS));
  });

  it('should append an extension item at the end by default', () => {
    const items = projectItems(updateMenuItems(MENU_ITEMS, projectContext(), [extensionItem()]));

    expect(ids(items)).toEqual([...ids(PROJECT_MENU_ITEMS), 'ext-alpha']);
    expect(items[items.length - 1]).toMatchObject({
      label: 'alpha.menu',
      routerLink: ['abc12', 'alpha'],
      visible: true,
      queryParams: undefined,
    });
  });

  it('should place an extension item after the item it names', () => {
    const items = projectItems(
      updateMenuItems(MENU_ITEMS, projectContext(), [extensionItem({ insertAfter: 'project-wiki' })])
    );

    const wikiIndex = ids(items).indexOf('project-wiki');
    expect(ids(items)[wikiIndex + 1]).toBe('ext-alpha');
    expect(items).toHaveLength(PROJECT_MENU_ITEMS.length + 1);
  });

  it('should append an extension item whose anchor is unknown', () => {
    const items = projectItems(
      updateMenuItems(MENU_ITEMS, projectContext(), [extensionItem({ insertAfter: 'no-such-item' })])
    );

    expect(ids(items)[items.length - 1]).toBe('ext-alpha');
  });

  it('should keep extension items in installation order, anchors included', () => {
    const items = projectItems(
      updateMenuItems(MENU_ITEMS, projectContext(), [
        extensionItem({ id: 'ext-one', insertAfter: 'project-wiki' }),
        extensionItem({ id: 'ext-two', insertAfter: 'ext-one' }),
        extensionItem({ id: 'ext-three' }),
      ])
    );

    const wikiIndex = ids(items).indexOf('project-wiki');
    expect(ids(items).slice(wikiIndex, wikiIndex + 3)).toEqual(['project-wiki', 'ext-one', 'ext-two']);
    expect(ids(items)[items.length - 1]).toBe('ext-three');
  });

  it('should keep the visibility the extension decided', () => {
    const items = projectItems(updateMenuItems(MENU_ITEMS, projectContext(), [extensionItem({ visible: false })]));

    expect(items[items.length - 1]).toMatchObject({ id: 'ext-alpha', visible: false });
  });

  it('should hide an extension item whose permission the user lacks', () => {
    const items = projectItems(
      updateMenuItems(MENU_ITEMS, projectContext({ permissions: [UserPermissions.Read] }), [
        extensionItem({ requiredPermission: UserPermissions.Write }),
      ])
    );

    expect(items[items.length - 1]).toMatchObject({ id: 'ext-alpha', visible: false });
  });

  it('should show an extension item whose permission the user holds', () => {
    const items = projectItems(
      updateMenuItems(MENU_ITEMS, projectContext({ permissions: [UserPermissions.Write] }), [
        extensionItem({ requiredPermission: UserPermissions.Write }),
      ])
    );

    expect(items[items.length - 1]).toMatchObject({ id: 'ext-alpha', visible: true });
  });

  it('should leave extension items out of the view-only menu unless they opt in', () => {
    const items = projectItems(
      updateMenuItems(MENU_ITEMS, projectContext({ viewOnly: 'token' }), [
        extensionItem({ id: 'ext-hidden' }),
        extensionItem({ id: 'ext-shown', viewOnly: true }),
      ])
    );

    expect(ids(items)).not.toContain('ext-hidden');
    expect(items[items.length - 1]).toMatchObject({
      id: 'ext-shown',
      routerLink: ['abc12', 'alpha'],
      queryParams: { view_only: 'token' },
    });
  });

  it('should not touch the extension item object it was given', () => {
    const given = extensionItem({ insertAfter: 'project-wiki' });

    updateMenuItems(MENU_ITEMS, projectContext(), [given]);

    expect(given).toEqual(extensionItem({ insertAfter: 'project-wiki' }));
  });

  it('should show no extension items outside a project', () => {
    const items = updateMenuItems(MENU_ITEMS, projectContext({ isProject: false, resourceId: undefined }), [
      extensionItem(),
    ]);

    const projects = items.find((item) => item.id === 'projects');
    expect(projects?.visible).toBe(false);
    expect(projectItems(items)).toEqual([]);
  });
});
