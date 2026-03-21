import { of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { FileProvider } from '@osf/features/files/constants';
import { AddonsService } from '@osf/shared/services/addons/addons.service';

import { FileProviderRegistryService } from './file-provider-registry.service';

describe('FileProviderRegistryService', () => {
  let service: FileProviderRegistryService;
  let mockAddonsService: jest.Mocked<AddonsService>;

  beforeEach(() => {
    mockAddonsService = {
      getAddons: jest.fn(),
    } as unknown as jest.Mocked<AddonsService>;

    TestBed.configureTestingModule({
      providers: [FileProviderRegistryService, { provide: AddonsService, useValue: mockAddonsService }],
    });

    service = TestBed.inject(FileProviderRegistryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('before initialization', () => {
    it('should not be initialized', () => {
      expect(service.isInitialized()).toBe(false);
    });

    it('should return false for any provider', () => {
      expect(service.isValidProvider('osfstorage')).toBe(false);
      expect(service.isValidProvider('googledrive')).toBe(false);
    });

    it('should return empty array for getValidProviders', () => {
      expect(service.getValidProviders()).toEqual([]);
    });
  });

  describe('initialization with successful API response', () => {
    const mockExternalServices = [
      { externalServiceName: 'figshare', displayName: 'figshare' },
      { externalServiceName: 's3compat', displayName: 'S3 Compatible Storage' },
      { externalServiceName: 'dropbox', displayName: 'Dropbox' },
    ];

    beforeEach(async () => {
      mockAddonsService.getAddons.mockReturnValue(of(mockExternalServices as any));
      await service.initialize();
    });

    it('should be initialized', () => {
      expect(service.isInitialized()).toBe(true);
    });

    it('should have called getAddons with storage type', () => {
      expect(mockAddonsService.getAddons).toHaveBeenCalledWith('storage');
    });

    it('should return true for built-in providers', () => {
      expect(service.isValidProvider(FileProvider.OsfStorage)).toBe(true);
      expect(service.isValidProvider(FileProvider.GoogleDrive)).toBe(true);
      expect(service.isValidProvider(FileProvider.Box)).toBe(true);
      expect(service.isValidProvider(FileProvider.DropBox)).toBe(true);
      expect(service.isValidProvider(FileProvider.OneDrive)).toBe(true);
      expect(service.isValidProvider(FileProvider.S3)).toBe(true);
      expect(service.isValidProvider(FileProvider.GitHub)).toBe(true);
    });

    it('should return true for external providers (foreign addons)', () => {
      expect(service.isValidProvider('s3compat')).toBe(true);
      expect(service.isValidProvider('figshare')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(service.isValidProvider('S3COMPAT')).toBe(true);
      expect(service.isValidProvider('S3Compat')).toBe(true);
      expect(service.isValidProvider('OSFSTORAGE')).toBe(true);
      expect(service.isValidProvider('OsfStorage')).toBe(true);
    });

    it('should return false for unknown providers', () => {
      expect(service.isValidProvider('unknownprovider')).toBe(false);
      expect(service.isValidProvider('invalidaddon')).toBe(false);
    });

    it('should return all valid providers', () => {
      const providers = service.getValidProviders();

      // Check that built-in providers are included
      expect(providers).toContain('osfstorage');
      expect(providers).toContain('googledrive');
      expect(providers).toContain('box');

      // Check that external providers are included
      expect(providers).toContain('s3compat');
      expect(providers).toContain('figshare');
    });
  });

  describe('initialization with API failure', () => {
    beforeEach(async () => {
      mockAddonsService.getAddons.mockReturnValue(throwError(() => new Error('API Error')));
      await service.initialize();
    });

    it('should be initialized even when API fails', () => {
      expect(service.isInitialized()).toBe(true);
    });

    it('should still have built-in providers', () => {
      expect(service.isValidProvider(FileProvider.OsfStorage)).toBe(true);
      expect(service.isValidProvider(FileProvider.GoogleDrive)).toBe(true);
      expect(service.isValidProvider(FileProvider.Box)).toBe(true);
    });

    it('should not have external providers when API fails', () => {
      // s3compat is not a built-in provider, so it should not be valid
      expect(service.isValidProvider('s3compat')).toBe(false);
    });
  });

  describe('multiple initialization calls', () => {
    it('should only call API once even when initialize is called multiple times', async () => {
      const mockExternalServices = [{ externalServiceName: 's3compat', displayName: 'S3 Compatible Storage' }];

      mockAddonsService.getAddons.mockReturnValue(of(mockExternalServices as any));

      // Call initialize multiple times concurrently
      await Promise.all([service.initialize(), service.initialize(), service.initialize()]);

      // API should only be called once
      expect(mockAddonsService.getAddons).toHaveBeenCalledTimes(1);
    });

    it('should return consistent results for subsequent calls', async () => {
      const mockExternalServices = [{ externalServiceName: 's3compat', displayName: 'S3 Compatible Storage' }];

      mockAddonsService.getAddons.mockReturnValue(of(mockExternalServices as any));

      // First call
      await service.initialize();
      expect(service.isInitialized()).toBe(true);

      // Second call should work without issues
      await service.initialize();
      expect(service.isInitialized()).toBe(true);

      // API should still only be called once
      expect(mockAddonsService.getAddons).toHaveBeenCalledTimes(1);
    });
  });

  describe('external services with missing externalServiceName', () => {
    it('should skip services without externalServiceName', async () => {
      const mockExternalServices = [
        { externalServiceName: 's3compat', displayName: 'S3 Compatible Storage' },
        { externalServiceName: '', displayName: 'Empty Service' },
        { displayName: 'No Service Name' },
        { externalServiceName: 'validaddon', displayName: 'Valid Addon' },
      ];

      mockAddonsService.getAddons.mockReturnValue(of(mockExternalServices as any));
      await service.initialize();

      expect(service.isValidProvider('s3compat')).toBe(true);
      expect(service.isValidProvider('validaddon')).toBe(true);
      expect(service.isValidProvider('')).toBe(false);
    });
  });
});
