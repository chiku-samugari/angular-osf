import { TranslateLoader, TranslationObject } from '@ngx-translate/core';

import { Observable, of } from 'rxjs';

import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';

import { SSR_CONFIG } from '@core/constants/ssr-config.token';
import { OSF_BASE_TRANSLATE_LOADER } from '@core/extensions';
import { ConfigModel } from '@core/models/config.model';

import en from '../assets/i18n/en.json';
import { readJsonFile } from '../server/ssr-server-config';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(serverDistFolder, '../browser/assets/config/config.json');
const ssrConfig = {
  ...readJsonFile(configPath, {} as ConfigModel),
  throttleToken: process.env['THROTTLE_TOKEN'] || '',
} as ConfigModel;

class SsrTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<TranslationObject> {
    return of(lang === 'en' ? en : {});
  }
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: OSF_BASE_TRANSLATE_LOADER, useClass: SsrTranslateLoader },
    { provide: SSR_CONFIG, useValue: ssrConfig },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
