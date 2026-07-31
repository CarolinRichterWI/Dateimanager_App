export type EntryType = 'file' | 'directory';

export interface ManagedEntry {
  name: string;
  type: EntryType;
  size: number;
  modifiedAt?: number;
  uri: string;
}

export interface ImportResult {
  importedNames: string[];
  failedNames: string[];
}

