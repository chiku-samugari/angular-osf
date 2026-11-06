import { mergeDeep, TranslateLoader, TranslationObject } from '@ngx-translate/core';

import { forkJoin, map, Observable } from 'rxjs';

import { inject, Injectable, InjectionToken } from '@angular/core';

import { OsfExtensionRegistry } from './osf-extension-registry.service';

/**
 * The loader that fetches the application's own translations: the HTTP
 * loader in the browser, the bundled JSON on the server. `TranslateLoader`
 * itself is `OsfExtensionTranslateLoader`, which decorates this one.
 */
export const OSF_BASE_TRANSLATE_LOADER = new InjectionToken<TranslateLoader>('OSF_BASE_TRANSLATE_LOADER');

/**
 * Serves the application's translations with the installed extensions'
 * translations merged over them, so that a language loads atomically: no
 * key is ever missing between the two.
 */
@Injectable()
export class OsfExtensionTranslateLoader implements TranslateLoader {
  private readonly baseLoader = inject(OSF_BASE_TRANSLATE_LOADER);
  private readonly extensions = inject(OsfExtensionRegistry);

  getTranslation(lang: string): Observable<TranslationObject> {
    if (!this.extensions.extensions.length) {
      return this.baseLoader.getTranslation(lang);
    }

    return forkJoin([this.baseLoader.getTranslation(lang), this.extensions.getTranslations(lang)]).pipe(
      map(([base, extension]) => mergeDeep(base, extension))
    );
  }
}
