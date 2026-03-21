import { TestBed } from '@angular/core/testing';
import { Route, UrlSegment } from '@angular/router';

import { FileProviderRegistryService } from '@core/services/file-provider-registry.service';

import { isFileProvider } from './is-file-provider.guard';

describe('isFileProvider guard', () => {
  let mockRegistry: jest.Mocked<FileProviderRegistryService>;

  beforeEach(() => {
    mockRegistry = {
      isValidProvider: jest.fn(),
      getValidProviders: jest.fn(),
      isInitialized: jest.fn(),
      initialize: jest.fn(),
    } as unknown as jest.Mocked<FileProviderRegistryService>;

    TestBed.configureTestingModule({
      providers: [{ provide: FileProviderRegistryService, useValue: mockRegistry }],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createUrlSegment = (path: string): UrlSegment => {
    return new UrlSegment(path, {});
  };

  const mockRoute: Route = {};

  describe('with valid providers', () => {
    beforeEach(() => {
      mockRegistry.isValidProvider.mockImplementation((name: string) => {
        const validProviders = ['osfstorage', 'googledrive', 'dropbox', 's3compat'];
        return validProviders.includes(name.toLowerCase());
      });
    });

    it('should return true for built-in provider osfstorage', () => {
      const segments = [createUrlSegment('osfstorage')];

      const result = TestBed.runInInjectionContext(() => isFileProvider(mockRoute, segments));

      expect(result).toBe(true);
      expect(mockRegistry.isValidProvider).toHaveBeenCalledWith('osfstorage');
    });

    it('should return true for built-in provider googledrive', () => {
      const segments = [createUrlSegment('googledrive')];

      const result = TestBed.runInInjectionContext(() => isFileProvider(mockRoute, segments));

      expect(result).toBe(true);
      expect(mockRegistry.isValidProvider).toHaveBeenCalledWith('googledrive');
    });

    it('should return true for built-in provider dropbox', () => {
      const segments = [createUrlSegment('dropbox')];

      const result = TestBed.runInInjectionContext(() => isFileProvider(mockRoute, segments));

      expect(result).toBe(true);
      expect(mockRegistry.isValidProvider).toHaveBeenCalledWith('dropbox');
    });

    it('should return true for external provider s3compat (foreign addon)', () => {
      const segments = [createUrlSegment('s3compat')];

      const result = TestBed.runInInjectionContext(() => isFileProvider(mockRoute, segments));

      expect(result).toBe(true);
      expect(mockRegistry.isValidProvider).toHaveBeenCalledWith('s3compat');
    });

    it('should return false for unknown provider', () => {
      const segments = [createUrlSegment('unknownprovider')];

      const result = TestBed.runInInjectionContext(() => isFileProvider(mockRoute, segments));

      expect(result).toBe(false);
      expect(mockRegistry.isValidProvider).toHaveBeenCalledWith('unknownprovider');
    });
  });

  describe('with empty or missing segments', () => {
    it('should return false when segments array is empty', () => {
      const segments: UrlSegment[] = [];

      const result = TestBed.runInInjectionContext(() => isFileProvider(mockRoute, segments));

      expect(result).toBe(false);
      expect(mockRegistry.isValidProvider).not.toHaveBeenCalled();
    });

    it('should return false when first segment path is empty', () => {
      const segments = [createUrlSegment('')];

      const result = TestBed.runInInjectionContext(() => isFileProvider(mockRoute, segments));

      expect(result).toBe(false);
      expect(mockRegistry.isValidProvider).not.toHaveBeenCalled();
    });
  });

  describe('with multiple segments', () => {
    beforeEach(() => {
      mockRegistry.isValidProvider.mockImplementation((name: string) => {
        return name.toLowerCase() === 'googledrive';
      });
    });

    it('should only check the first segment', () => {
      const segments = [createUrlSegment('googledrive'), createUrlSegment('subfolder'), createUrlSegment('file.txt')];

      const result = TestBed.runInInjectionContext(() => isFileProvider(mockRoute, segments));

      expect(result).toBe(true);
      expect(mockRegistry.isValidProvider).toHaveBeenCalledWith('googledrive');
      expect(mockRegistry.isValidProvider).toHaveBeenCalledTimes(1);
    });
  });

  describe('registry not initialized scenario', () => {
    it('should return false when registry has no providers', () => {
      mockRegistry.isValidProvider.mockReturnValue(false);

      const segments = [createUrlSegment('osfstorage')];

      const result = TestBed.runInInjectionContext(() => isFileProvider(mockRoute, segments));

      expect(result).toBe(false);
    });
  });
});
