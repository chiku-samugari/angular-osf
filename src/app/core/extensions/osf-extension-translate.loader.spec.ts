import { TranslateLoader, TranslationObject } from '@ngx-translate/core';

import { firstValueFrom, Observable, of } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { OsfExtension } from './osf-extension.model';
import { OSF_BASE_TRANSLATE_LOADER, OsfExtensionTranslateLoader } from './osf-extension-translate.loader';
import { OSF_EXTENSIONS } from './osf-extensions.token';

describe('OsfExtensionTranslateLoader', () => {
  const base: TranslationObject = {
    navigation: { overview: 'Overview', wiki: 'Wiki' },
    common: { save: 'Save' },
  };

  class BaseLoaderStub implements TranslateLoader {
    getTranslation = vi.fn((_lang: string): Observable<TranslationObject> => of(base));
  }

  function setup(extensions: OsfExtension[]) {
    const baseLoader = new BaseLoaderStub();

    TestBed.configureTestingModule({
      providers: [
        OsfExtensionTranslateLoader,
        { provide: OSF_BASE_TRANSLATE_LOADER, useValue: baseLoader },
        ...extensions.map((extension) => ({ provide: OSF_EXTENSIONS, useValue: extension, multi: true })),
      ],
    });

    return { loader: TestBed.inject(OsfExtensionTranslateLoader), baseLoader };
  }

  it('should pass the base translations through when no extension is installed', async () => {
    const { loader, baseLoader } = setup([]);

    expect(await firstValueFrom(loader.getTranslation('en'))).toBe(base);
    expect(baseLoader.getTranslation).toHaveBeenCalledWith('en');
  });

  it('should merge the extensions translations over the base ones', async () => {
    const { loader } = setup([
      { id: 'a', translations: { en: { navigation: { alpha: 'Alpha' }, alpha: { title: 'Alpha page' } } } },
      { id: 'b', translations: { en: { navigation: { wiki: 'Wiki (b)' } } } },
    ]);

    expect(await firstValueFrom(loader.getTranslation('en'))).toEqual({
      navigation: { overview: 'Overview', wiki: 'Wiki (b)', alpha: 'Alpha' },
      common: { save: 'Save' },
      alpha: { title: 'Alpha page' },
    });
  });

  it('should leave the base translations alone for a language the extensions do not cover', async () => {
    const { loader, baseLoader } = setup([{ id: 'a', translations: { en: { alpha: { title: 'Alpha page' } } } }]);

    expect(await firstValueFrom(loader.getTranslation('fr'))).toEqual(base);
    expect(baseLoader.getTranslation).toHaveBeenCalledWith('fr');
  });
});
