import { InjectionToken } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { OsfExtension } from './osf-extension.model';
import { OsfExtensionRegistry } from './osf-extension-registry.service';
import { OSF_EXTENSIONS } from './osf-extensions.token';
import { provideOsfExtensions } from './provide-osf-extensions';

describe('provideOsfExtensions', () => {
  const EXTENSION_TOKEN = new InjectionToken<string>('EXTENSION_TOKEN');

  it('should register every extension and its providers', () => {
    const extensions: OsfExtension[] = [
      { id: 'a', providers: [{ provide: EXTENSION_TOKEN, useValue: 'from a' }] },
      { id: 'b' },
    ];

    TestBed.configureTestingModule({ providers: [provideOsfExtensions(extensions)] });

    expect(TestBed.inject(OSF_EXTENSIONS)).toEqual(extensions);
    expect(TestBed.inject(EXTENSION_TOKEN)).toBe('from a');
    expect(TestBed.inject(OsfExtensionRegistry).extensions).toEqual(extensions);
  });

  it('should accumulate across calls', () => {
    TestBed.configureTestingModule({
      providers: [provideOsfExtensions([{ id: 'a' }]), provideOsfExtensions([{ id: 'b' }])],
    });

    expect(TestBed.inject(OSF_EXTENSIONS).map((extension) => extension.id)).toEqual(['a', 'b']);
  });

  it('should validate the installed set at startup', () => {
    TestBed.configureTestingModule({ providers: [provideOsfExtensions([{ id: 'a' }, { id: 'a' }])] });

    expect(() => TestBed.inject(EXTENSION_TOKEN, 'unused')).toThrow(/"a" is installed twice/);
  });
});
