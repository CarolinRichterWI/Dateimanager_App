import { Capacitor } from '@capacitor/core';
import {
  Directory,
  Filesystem,
  type FileInfo,
  type WriteFileOptions,
} from '@capacitor/filesystem';
import {
  FilePicker,
  type PickedFile,
} from '@capawesome/capacitor-file-picker';
import { FileOpener } from '@capawesome-team/capacitor-file-opener';
import JSZip, { type JSZipObject } from 'jszip';

import { Zip, isNativeZipAvailable } from '@/plugins/zip';
import type { ImportResult, ManagedEntry } from '@/types/files';
import {
  appendFileUri,
  blobFromBase64,
  cleanImportedName,
  entryPath,
  makeUniqueName,
  mimeTypeForName,
} from '@/utils/file-utils';

const APP_ROOT = 'Dateimanager';
const STORAGE_DIRECTORY = Directory.Data;

// Die JSZip-Absicherung hält den kompletten Inhalt im Arbeitsspeicher der WebView.
// Oberhalb dieser Grenze wird abgebrochen, statt die App abstürzen zu lassen.
const FALLBACK_SIZE_LIMIT = 48 * 1024 * 1024;

const toManagedEntry = (file: FileInfo): ManagedEntry => ({
  name: file.name,
  type: file.type,
  size: file.size,
  modifiedAt: file.mtime,
  uri: file.uri,
});

const sortEntries = (entries: ManagedEntry[]): ManagedEntry[] =>
  entries.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'directory' ? -1 : 1;
    }

    return left.name.localeCompare(right.name, 'de-DE', {
      numeric: true,
      sensitivity: 'base',
    });
  });

class FileManagerService {
  async initialize(): Promise<void> {
    try {
      const root = await Filesystem.stat({
        path: APP_ROOT,
        directory: STORAGE_DIRECTORY,
      });

      if (root.type !== 'directory') {
        throw new Error('APP_ROOT_IS_NOT_A_DIRECTORY');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'APP_ROOT_IS_NOT_A_DIRECTORY') {
        throw error;
      }

      await Filesystem.mkdir({
        path: APP_ROOT,
        directory: STORAGE_DIRECTORY,
        recursive: true,
      });
    }
  }

  async list(path: string[]): Promise<ManagedEntry[]> {
    const result = await Filesystem.readdir({
      path: entryPath(APP_ROOT, path),
      directory: STORAGE_DIRECTORY,
    });

    return sortEntries(result.files.map(toManagedEntry));
  }

  async createFolder(path: string[], name: string): Promise<void> {
    await Filesystem.mkdir({
      path: entryPath(APP_ROOT, path, name),
      directory: STORAGE_DIRECTORY,
      recursive: false,
    });
  }

  async pickAndImportFiles(
    path: string[],
    existingNames: Iterable<string>,
  ): Promise<ImportResult> {
    const selection = await FilePicker.pickFiles({
      limit: 0,
      readData: true,
    });

    return this.importPickedFiles(path, selection.files, existingNames);
  }

  async importPickedFiles(
    path: string[],
    files: PickedFile[],
    existingNames: Iterable<string>,
  ): Promise<ImportResult> {
    const usedNames = new Set(existingNames);
    const importedNames: string[] = [];
    const failedNames: string[] = [];

    for (const file of files) {
      const cleanName = cleanImportedName(file.name);
      const destinationName = makeUniqueName(cleanName, usedNames);
      const data = file.data ?? file.blob;

      if (!data) {
        failedNames.push(file.name);
        continue;
      }

      const options: WriteFileOptions = {
        path: entryPath(APP_ROOT, path, destinationName),
        directory: STORAGE_DIRECTORY,
        data,
        recursive: false,
      };

      try {
        await Filesystem.writeFile(options);
        importedNames.push(destinationName);
        usedNames.add(destinationName);
      } catch {
        failedNames.push(file.name);
      }
    }

    return { importedNames, failedNames };
  }

  async openFile(path: string[], entry: ManagedEntry): Promise<void> {
    const fullPath = entryPath(APP_ROOT, path, entry.name);
    const mimeType = mimeTypeForName(entry.name);

    if (Capacitor.getPlatform() === 'web') {
      const result = await Filesystem.readFile({
        path: fullPath,
        directory: STORAGE_DIRECTORY,
      });
      const blob =
        result.data instanceof Blob ? result.data : blobFromBase64(result.data, mimeType);

      await FileOpener.openFile({ blob });
      return;
    }

    const { uri } = await Filesystem.getUri({
      path: fullPath,
      directory: STORAGE_DIRECTORY,
    });

    await FileOpener.openFile({
      path: uri,
      mimeType,
    });
  }

  async deleteEntry(path: string[], entry: ManagedEntry): Promise<void> {
    const fullPath = entryPath(APP_ROOT, path, entry.name);

    if (entry.type === 'directory') {
      await Filesystem.rmdir({
        path: fullPath,
        directory: STORAGE_DIRECTORY,
        recursive: true,
      });
      return;
    }

    await Filesystem.deleteFile({
      path: fullPath,
      directory: STORAGE_DIRECTORY,
    });
  }

  async renameEntry(path: string[], entry: ManagedEntry, newName: string): Promise<void> {
    await Filesystem.rename({
      from: entryPath(APP_ROOT, path, entry.name),
      to: entryPath(APP_ROOT, path, newName),
      directory: STORAGE_DIRECTORY,
      toDirectory: STORAGE_DIRECTORY,
    });
  }

  async compressFolder(
    path: string[],
    folderName: string,
    destinationZipName: string,
  ): Promise<void> {
    if (isNativeZipAvailable()) {
      try {
        await this.compressFolderNatively(path, folderName, destinationZipName);
        return;
      } catch (error) {
        console.warn(
          'Das native ZIP-Plugin hat das Komprimieren abgelehnt. Es wird die integrierte Absicherung genutzt.',
          error,
        );
        await Filesystem.deleteFile({
          path: entryPath(APP_ROOT, path, destinationZipName),
          directory: STORAGE_DIRECTORY,
        }).catch(() => undefined);
      }
    }

    await this.compressFolderWithJsZip(path, folderName, destinationZipName);
  }

  async extractZip(
    path: string[],
    zipName: string,
    destinationFolderName: string,
  ): Promise<void> {
    const sourcePath = entryPath(APP_ROOT, path, zipName);
    const destinationPath = entryPath(APP_ROOT, path, destinationFolderName);

    await Filesystem.mkdir({
      path: destinationPath,
      directory: STORAGE_DIRECTORY,
      recursive: false,
    });

    try {
      if (isNativeZipAvailable()) {
        try {
          await this.extractZipNatively(sourcePath, destinationPath);
          return;
        } catch (error) {
          console.warn(
            'Das native ZIP-Plugin hat das Entpacken abgelehnt. Es wird die integrierte Absicherung genutzt.',
            error,
          );
          await this.resetDirectory(destinationPath);
        }
      }

      await this.extractArchiveWithJsZip(sourcePath, destinationPath);
    } catch (error) {
      await Filesystem.rmdir({
        path: destinationPath,
        directory: STORAGE_DIRECTORY,
        recursive: true,
      }).catch(() => undefined);
      throw error;
    }
  }

  private async compressFolderNatively(
    path: string[],
    folderName: string,
    destinationZipName: string,
  ): Promise<void> {
    const [source, currentDirectory] = await Promise.all([
      Filesystem.getUri({
        path: entryPath(APP_ROOT, path, folderName),
        directory: STORAGE_DIRECTORY,
      }),
      Filesystem.getUri({
        path: entryPath(APP_ROOT, path),
        directory: STORAGE_DIRECTORY,
      }),
    ]);

    await Zip.zip({
      source: source.uri,
      destination: appendFileUri(currentDirectory.uri, destinationZipName),
    });
  }

  private async extractZipNatively(
    sourcePath: string,
    destinationPath: string,
  ): Promise<void> {
    const [source, destination] = await Promise.all([
      Filesystem.getUri({
        path: sourcePath,
        directory: STORAGE_DIRECTORY,
      }),
      Filesystem.getUri({
        path: destinationPath,
        directory: STORAGE_DIRECTORY,
      }),
    ]);

    await Zip.unzip({
      source: source.uri,
      destination: destination.uri,
    });
  }

  private async compressFolderWithJsZip(
    path: string[],
    folderName: string,
    destinationZipName: string,
  ): Promise<void> {
    const archive = new JSZip();
    const rootFolder = archive.folder(folderName);

    if (!rootFolder) {
      throw new Error('ZIP_ROOT_CREATION_FAILED');
    }

    await this.addDirectoryToArchive(
      rootFolder,
      entryPath(APP_ROOT, path, folderName),
      { remaining: FALLBACK_SIZE_LIMIT },
    );

    const data = await archive.generateAsync({
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6,
      },
      platform: 'UNIX',
    });

    await Filesystem.writeFile({
      path: entryPath(APP_ROOT, path, destinationZipName),
      directory: STORAGE_DIRECTORY,
      data,
      recursive: false,
    });
  }

  private async addDirectoryToArchive(
    archiveFolder: JSZip,
    sourcePath: string,
    budget: { remaining: number },
  ): Promise<void> {
    const contents = await Filesystem.readdir({
      path: sourcePath,
      directory: STORAGE_DIRECTORY,
    });

    for (const item of contents.files) {
      const itemPath = entryPath(sourcePath, [], item.name);

      if (item.type === 'directory') {
        const childFolder = archiveFolder.folder(item.name);
        if (!childFolder) {
          throw new Error('ZIP_FOLDER_CREATION_FAILED');
        }
        await this.addDirectoryToArchive(childFolder, itemPath, budget);
        continue;
      }

      budget.remaining -= Number(item.size) || 0;

      if (budget.remaining < 0) {
        throw new Error('ZIP_FALLBACK_LIMIT');
      }

      const result = await Filesystem.readFile({
        path: itemPath,
        directory: STORAGE_DIRECTORY,
      });
      const options = {
        date: item.mtime ? new Date(item.mtime) : new Date(),
        binary: true,
        ...(typeof result.data === 'string' ? { base64: true } : {}),
      };

      archiveFolder.file(item.name, result.data, options);
    }
  }

  private async resetDirectory(path: string): Promise<void> {
    await Filesystem.rmdir({
      path,
      directory: STORAGE_DIRECTORY,
      recursive: true,
    }).catch(() => undefined);

    await Filesystem.mkdir({
      path,
      directory: STORAGE_DIRECTORY,
      recursive: false,
    });
  }

  private async entrySize(path: string): Promise<number> {
    try {
      const info = await Filesystem.stat({
        path,
        directory: STORAGE_DIRECTORY,
      });

      return Number(info.size) || 0;
    } catch {
      return 0;
    }
  }

  private async extractArchiveWithJsZip(
    sourcePath: string,
    destinationPath: string,
  ): Promise<void> {
    if ((await this.entrySize(sourcePath)) > FALLBACK_SIZE_LIMIT) {
      throw new Error('ZIP_FALLBACK_LIMIT');
    }

    const result = await Filesystem.readFile({
      path: sourcePath,
      directory: STORAGE_DIRECTORY,
    });
    const archive = await JSZip.loadAsync(
      result.data,
      typeof result.data === 'string'
        ? {
            base64: true,
            checkCRC32: true,
          }
        : {
            checkCRC32: true,
          },
    );

    for (const item of Object.values(archive.files)) {
      const relativePath = this.safeArchivePath(item);
      if (!relativePath) {
        continue;
      }

      const outputPath = entryPath(destinationPath, [], relativePath);

      if (item.dir) {
        await Filesystem.mkdir({
          path: outputPath,
          directory: STORAGE_DIRECTORY,
          recursive: true,
        });
        continue;
      }

      const data = await item.async('base64');
      await Filesystem.writeFile({
        path: outputPath,
        directory: STORAGE_DIRECTORY,
        data,
        recursive: true,
      });
    }
  }

  private safeArchivePath(item: JSZipObject): string {
    const rawPath = item.unsafeOriginalName ?? item.name;
    const normalized = rawPath.replaceAll('\\', '/');
    const segments = normalized.split('/').filter((segment) => segment && segment !== '.');

    if (
      normalized.startsWith('/') ||
      /^[a-zA-Z]:/.test(normalized) ||
      segments.some((segment) => segment === '..')
    ) {
      throw new Error('UNSAFE_ZIP_PATH');
    }

    return segments.join('/');
  }
}

export const fileManagerService = new FileManagerService();
