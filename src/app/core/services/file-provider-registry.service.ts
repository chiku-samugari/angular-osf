import { firstValueFrom } from 'rxjs';

import { inject, Injectable, signal } from '@angular/core';

import { FileProvider } from '@osf/features/files/constants';
import { AddonsService } from '@osf/shared/services/addons/addons.service';

/**
 * Registry service that maintains a set of valid file providers.
 * Combines built-in providers with dynamically discovered external storage services.
 *
 * This enables foreign addon support - external storage services registered in
 * gravyvalet are automatically recognized as valid file providers in angular-osf.
 */
@Injectable({
  providedIn: 'root',
})
export class FileProviderRegistryService {
  private readonly addonsService = inject(AddonsService);

  // Set of valid provider names (lowercase)
  private readonly _validProviders = signal<Set<string>>(new Set());

  // Initialization state
  private readonly _initialized = signal(false);
  private _initPromise: Promise<void> | null = null;

  /**
   * Check if a provider name is valid (built-in or external)
   */
  isValidProvider(providerName: string): boolean {
    return this._validProviders().has(providerName.toLowerCase());
  }

  /**
   * Get all valid provider names
   */
  getValidProviders(): string[] {
    return Array.from(this._validProviders());
  }

  /**
   * Check if initialization is complete
   */
  isInitialized(): boolean {
    return this._initialized();
  }

  /**
   * Initialize the registry with built-in and external providers.
   * Safe to call multiple times - subsequent calls return the same promise.
   */
  async initialize(): Promise<void> {
    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = this._doInitialize();
    return this._initPromise;
  }

  private async _doInitialize(): Promise<void> {
    // Start with built-in providers
    const providers = new Set<string>(Object.values(FileProvider).map((p) => p.toLowerCase()));

    // Fetch external storage services from gravyvalet
    try {
      const externalServices = await firstValueFrom(this.addonsService.getAddons('storage'));

      // Add each external service's name to the valid providers
      for (const service of externalServices) {
        if (service.externalServiceName) {
          providers.add(service.externalServiceName.toLowerCase());
        }
      }
    } catch {
      // Silently fail - built-in providers will still work
      // External storage services will not be available in the registry
    }

    this._validProviders.set(providers);
    this._initialized.set(true);
  }
}
