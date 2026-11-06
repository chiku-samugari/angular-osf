import { InjectionToken } from '@angular/core';

import { OsfExtension } from './osf-extension.model';

/**
 * The installed extensions, one multi-provider value each.
 * Provide through `provideOsfExtensions()`; read through `OsfExtensionRegistry`.
 */
export const OSF_EXTENSIONS = new InjectionToken<OsfExtension[]>('OSF_EXTENSIONS');
