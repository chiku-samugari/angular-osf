export interface BucketLocation {
  name: string;
  host?: string;
}

export interface AvailableService {
  name: string;
  host: string;
  bucketLocations?: Record<string, BucketLocation>;
  serverSideEncryption?: boolean;
}

export interface HostInfo {
  availableServices?: AvailableService[];
  encryptUploads?: boolean;
}
