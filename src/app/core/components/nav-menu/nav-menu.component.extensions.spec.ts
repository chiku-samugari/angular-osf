import { MockComponent, MockProvider } from 'ng-mocks';

import { computed, Signal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { OSF_EXTENSIONS, OsfExtension } from '@core/extensions';
import { CustomMenuItem } from '@core/models/custom-menu-item.model';
import { RouteContext } from '@core/models/route-context.model';
import { AuthService } from '@core/services/auth.service';
import { ProviderSelectors } from '@osf/core/store/provider/provider.selectors';
import { UserSelectors } from '@osf/core/store/user/user.selectors';
import { IconComponent } from '@osf/shared/components/icon/icon.component';
import { CurrentResourceType } from '@osf/shared/enums/resource-type.enum';
import { UserPermissions } from '@osf/shared/enums/user-permissions.enum';
import { CurrentResource } from '@osf/shared/models/current-resource.model';
import { CurrentResourceSelectors } from '@osf/shared/stores/current-resource';

import { MOCK_USER } from '@testing/mocks/data.mock';
import { provideOSFCore } from '@testing/osf.testing.provider';
import { AuthServiceMock } from '@testing/providers/auth-service.mock';
import { ActivatedRouteMockBuilder } from '@testing/providers/route-provider.mock';
import { RouterMockBuilder } from '@testing/providers/router-provider.mock';
import { provideMockStore } from '@testing/providers/store-provider.mock';

import { NavMenuComponent } from './nav-menu.component';

describe('NavMenuComponent with extensions', () => {
  let fixture: ComponentFixture<NavMenuComponent>;
  let component: NavMenuComponent;

  const project: CurrentResource = {
    id: 'abc12',
    type: CurrentResourceType.Projects,
    permissions: [UserPermissions.Read, UserPermissions.Write],
    wikiEnabled: true,
  };

  const enabled = signal(false);
  const visible = vi.fn((context: Signal<RouteContext>) => computed(() => enabled() && context().isProject));

  const extension: OsfExtension = {
    id: 'alpha',
    projectMenuItems: [
      { id: 'alpha-page', label: 'alpha.menu', routerLink: 'alpha', insertAfter: 'project-wiki', visible },
    ],
  };

  const projectItems = (): CustomMenuItem[] => {
    const projects = component.mainMenuItems().find((item) => item.id === 'projects');
    const details = projects?.items?.find((item) => item.id === 'project-details');
    return details?.items ?? [];
  };

  beforeEach(() => {
    enabled.set(false);

    TestBed.configureTestingModule({
      imports: [NavMenuComponent, MockComponent(IconComponent)],
      providers: [
        provideOSFCore(),
        provideMockStore({
          signals: [
            { selector: UserSelectors.isAuthenticated, value: signal(true) },
            { selector: UserSelectors.getCurrentUser, value: signal(MOCK_USER) },
            { selector: UserSelectors.getCanViewReviews, value: signal(false) },
            { selector: ProviderSelectors.getCurrentProvider, value: signal(null) },
            { selector: CurrentResourceSelectors.getCurrentResource, value: signal(project) },
          ],
        }),
        {
          provide: Router,
          useValue: {
            ...RouterMockBuilder.create().withUrl('/abc12/overview').build(),
            serializeUrl: vi.fn(() => '/abc12/overview'),
            parseUrl: vi.fn(() => ({})),
            isActive: vi.fn(() => false),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: ActivatedRouteMockBuilder.create()
            .withFirstChild((child) => child.withParams({ id: 'abc12' }))
            .build(),
        },
        MockProvider(AuthService, AuthServiceMock.simple()),
        { provide: OSF_EXTENSIONS, useValue: extension, multi: true },
      ],
    });

    fixture = TestBed.createComponent(NavMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should hand the extension its visibility context once', () => {
    expect(visible).toHaveBeenCalledTimes(1);
    expect(visible).toHaveBeenCalledWith(component.routeContext);
    expect(component.routeContext()).toMatchObject({ resourceId: 'abc12', isProject: true });
  });

  it('should place the extension item after the wiki, following the visibility the extension decides', () => {
    const before = projectItems();
    const wikiIndex = before.findIndex((item) => item.id === 'project-wiki');

    expect(before[wikiIndex + 1]).toMatchObject({
      id: 'alpha-page',
      label: 'alpha.menu',
      routerLink: ['abc12', 'alpha'],
      visible: false,
    });

    enabled.set(true);

    expect(projectItems()[wikiIndex + 1]).toMatchObject({ id: 'alpha-page', visible: true });
  });
});
