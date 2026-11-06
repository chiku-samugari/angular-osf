import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { TRANSLATE_HTTP_LOADER_CONFIG, TranslateHttpLoader } from '@ngx-translate/http-loader';

import { OSF_BASE_TRANSLATE_LOADER, OsfExtensionTranslateLoader } from '@core/extensions';

export const provideTranslation = provideTranslateService({
  loader: [
    {
      provide: TRANSLATE_HTTP_LOADER_CONFIG,
      useValue: {
        prefix: '/assets/i18n/',
        suffix: '.json',
      },
    },
    // the application's own files; the SSR config swaps this one for the bundled JSON
    { provide: OSF_BASE_TRANSLATE_LOADER, useClass: TranslateHttpLoader },
    // ... with the installed extensions' translations merged over them
    { provide: TranslateLoader, useClass: OsfExtensionTranslateLoader },
  ],
  lang: 'en',
  fallbackLang: 'en',
});
