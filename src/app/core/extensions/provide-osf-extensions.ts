import { EnvironmentProviders, inject, makeEnvironmentProviders, provideEnvironmentInitializer } from '@angular/core';

import { OsfExtension } from './osf-extension.model';
import { OsfExtensionRegistry } from './osf-extension-registry.service';
import { OSF_EXTENSIONS } from './osf-extensions.token';

/**
 * Installs extensions: registers each under `OSF_EXTENSIONS`, adds their
 * root providers, and validates the whole set at startup so that a
 * misconfigured deployment fails at bootstrap rather than on first use.
 */
export function provideOsfExtensions(extensions: OsfExtension[]): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...extensions.map((extension) => ({ provide: OSF_EXTENSIONS, useValue: extension, multi: true })),
    ...extensions.flatMap((extension) => extension.providers ?? []),
    provideEnvironmentInitializer(() => {
      inject(OsfExtensionRegistry);
    }),
  ]);
}
