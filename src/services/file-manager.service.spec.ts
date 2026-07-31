import { beforeEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';

const mocks = vi.hoisted(() => ({
  platform: 'android',
  pluginAvailable: true,
  filesystem: {
    stat: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    getUri: vi.fn(),
    rmdir: vi.fn(),
    deleteFile: vi.fn(),
    rename: vi.fn(),
  },
  filePicker: {
    pickFiles: vi.fn(),
  },
  fileOpener: {
    openFile: vi.fn(),
  },
  zip: {
    zip: vi.fn(),
    unzip: vi.fn(),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => mocks.platform,
    isPluginAvailable: () => mocks.pluginAvailable,
  },
  registerPlugin: () => mocks.zip,
}));

vi.mock('@capacitor/filesystem', () => ({
  Directory: {
    Data: 'DATA',
  },
  Filesystem: mocks.filesystem,
}));

vi.mock('@capawesome/capacitor-file-picker', () => ({
  FilePicker: mocks.filePicker,
}));

vi.mock('@capawesome-team/capacitor-file-opener', () => ({
  FileOpener: mocks.fileOpener,
}));

import { fileManagerService } from './file-manager.service';

describe('FileManagerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.platform = 'android';
    mocks.pluginAvailable = true;
    mocks.filesystem.stat.mockResolvedValue({
      type: 'directory',
    });
    mocks.filesystem.mkdir.mockResolvedValue(undefined);
    mocks.filesystem.readdir.mockResolvedValue({ files: [] });
    mocks.filesystem.writeFile.mockResolvedValue({
      uri: 'file:///written',
    });
    mocks.filesystem.readFile.mockResolvedValue({
      data: 'SGFsbG8=',
    });
    mocks.filesystem.getUri.mockImplementation(({ path }: { path: string }) =>
      Promise.resolve({ uri: `file:///data/${path}` }),
    );
    mocks.filesystem.rmdir.mockResolvedValue(undefined);
    mocks.filesystem.deleteFile.mockResolvedValue(undefined);
    mocks.filesystem.rename.mockResolvedValue(undefined);
    mocks.fileOpener.openFile.mockResolvedValue(undefined);
    mocks.zip.zip.mockResolvedValue(undefined);
    mocks.zip.unzip.mockResolvedValue(undefined);
  });

  it('legt das interne App-Verzeichnis an, wenn es noch nicht existiert', async () => {
    mocks.filesystem.stat.mockRejectedValueOnce(new Error('not found'));

    await fileManagerService.initialize();

    expect(mocks.filesystem.mkdir).toHaveBeenCalledWith({
      path: 'Dateimanager',
      directory: 'DATA',
      recursive: true,
    });
  });

  it('listet Ordner vor Dateien und sortiert alphabetisch', async () => {
    mocks.filesystem.readdir.mockResolvedValueOnce({
      files: [
        {
          name: 'Zebra.pdf',
          type: 'file',
          size: 20,
          mtime: 2,
          uri: 'file:///zebra',
        },
        {
          name: 'Archiv',
          type: 'directory',
          size: 0,
          mtime: 1,
          uri: 'file:///archiv',
        },
        {
          name: 'Alpha.pdf',
          type: 'file',
          size: 10,
          mtime: 3,
          uri: 'file:///alpha',
        },
      ],
    });

    const result = await fileManagerService.list(['Studium']);

    expect(mocks.filesystem.readdir).toHaveBeenCalledWith({
      path: 'Dateimanager/Studium',
      directory: 'DATA',
    });
    expect(result.map((entry) => entry.name)).toEqual([
      'Archiv',
      'Alpha.pdf',
      'Zebra.pdf',
    ]);
  });

  it('kopiert ausgewählte Base64-Dateien kollisionsfrei in das App-Verzeichnis', async () => {
    const result = await fileManagerService.importPickedFiles(
      ['Studium'],
      [
        {
          name: 'Bericht.pdf',
          mimeType: 'application/pdf',
          size: 3,
          data: 'YWJj',
        },
      ],
      ['Bericht.pdf'],
    );

    expect(mocks.filesystem.writeFile).toHaveBeenCalledWith({
      path: 'Dateimanager/Studium/Bericht (1).pdf',
      directory: 'DATA',
      data: 'YWJj',
      recursive: false,
    });
    expect(result).toEqual({
      importedNames: ['Bericht (1).pdf'],
      failedNames: [],
    });
  });

  it('öffnet eine interne Datei über ihre native URI', async () => {
    await fileManagerService.openFile(['Studium'], {
      name: 'Bericht.pdf',
      type: 'file',
      size: 100,
      modifiedAt: 1,
      uri: 'file:///ignored',
    });

    expect(mocks.filesystem.getUri).toHaveBeenCalledWith({
      path: 'Dateimanager/Studium/Bericht.pdf',
      directory: 'DATA',
    });
    expect(mocks.fileOpener.openFile).toHaveBeenCalledWith({
      path: 'file:///data/Dateimanager/Studium/Bericht.pdf',
      mimeType: 'application/pdf',
    });
  });

  it('löscht Ordner einschließlich ihres Inhalts rekursiv', async () => {
    await fileManagerService.deleteEntry(['Studium'], {
      name: 'Alt',
      type: 'directory',
      size: 0,
      uri: 'file:///alt',
    });

    expect(mocks.filesystem.rmdir).toHaveBeenCalledWith({
      path: 'Dateimanager/Studium/Alt',
      directory: 'DATA',
      recursive: true,
    });
    expect(mocks.filesystem.deleteFile).not.toHaveBeenCalled();
  });

  it('benennt Dateien innerhalb des aktuellen Verzeichnisses um', async () => {
    await fileManagerService.renameEntry(
      ['Studium'],
      {
        name: 'Alt.txt',
        type: 'file',
        size: 1,
        uri: 'file:///alt',
      },
      'Neu.txt',
    );

    expect(mocks.filesystem.rename).toHaveBeenCalledWith({
      from: 'Dateimanager/Studium/Alt.txt',
      to: 'Dateimanager/Studium/Neu.txt',
      directory: 'DATA',
      toDirectory: 'DATA',
    });
  });

  it('komprimiert einen Ordner als ZIP-Datei im aktuellen Verzeichnis', async () => {
    await fileManagerService.compressFolder(
      ['Studium'],
      'Meine Abgabe',
      'Meine Abgabe.zip',
    );

    expect(mocks.zip.zip).toHaveBeenCalledWith({
      source: 'file:///data/Dateimanager/Studium/Meine Abgabe',
      destination: 'file:///data/Dateimanager/Studium/Meine%20Abgabe.zip',
    });
  });

  it('entpackt ZIP-Dateien in einen neu erstellten Ordner', async () => {
    await fileManagerService.extractZip(
      ['Studium'],
      'Unterlagen.zip',
      'Unterlagen',
    );

    expect(mocks.filesystem.mkdir).toHaveBeenCalledWith({
      path: 'Dateimanager/Studium/Unterlagen',
      directory: 'DATA',
      recursive: false,
    });
    expect(mocks.zip.unzip).toHaveBeenCalledWith({
      source: 'file:///data/Dateimanager/Studium/Unterlagen.zip',
      destination: 'file:///data/Dateimanager/Studium/Unterlagen',
    });
  });

  it('nutzt die Absicherung, wenn das native Plugin das Entpacken ablehnt', async () => {
    mocks.zip.unzip.mockRejectedValueOnce(new Error('not implemented'));
    const sourceArchive = new JSZip();
    sourceArchive.file('Inhalt/Text.txt', 'Hallo');
    const archiveData = await sourceArchive.generateAsync({ type: 'base64' });
    mocks.filesystem.readFile.mockResolvedValueOnce({ data: archiveData });

    await fileManagerService.extractZip(['Studium'], 'Unterlagen.zip', 'Unterlagen');

    expect(mocks.filesystem.writeFile).toHaveBeenCalledWith({
      path: 'Dateimanager/Studium/Unterlagen/Inhalt/Text.txt',
      directory: 'DATA',
      data: 'SGFsbG8=',
      recursive: true,
    });
  });

  it('entfernt einen leeren Zielordner wieder, wenn das Entpacken vollständig fehlschlägt', async () => {
    mocks.pluginAvailable = false;

    await expect(
      fileManagerService.extractZip(['Studium'], 'Defekt.zip', 'Defekt'),
    ).rejects.toThrow();

    expect(mocks.filesystem.rmdir).toHaveBeenCalledWith({
      path: 'Dateimanager/Studium/Defekt',
      directory: 'DATA',
      recursive: true,
    });
  });

  it('komprimiert auch ohne natives Plugin vollständig über die Absicherung', async () => {
    mocks.pluginAvailable = false;
    mocks.filesystem.readdir.mockResolvedValueOnce({
      files: [
        {
          name: 'Notiz.txt',
          type: 'file',
          size: 5,
          mtime: 1,
          uri: 'file:///notiz',
        },
      ],
    });

    await fileManagerService.compressFolder(
      ['Studium'],
      'Meine Abgabe',
      'Meine Abgabe.zip',
    );

    expect(mocks.zip.zip).not.toHaveBeenCalled();
    const writeOptions = mocks.filesystem.writeFile.mock.calls.at(-1)?.[0];
    expect(writeOptions).toMatchObject({
      path: 'Dateimanager/Studium/Meine Abgabe.zip',
      directory: 'DATA',
      recursive: false,
    });

    const archive = await JSZip.loadAsync(writeOptions.data, { base64: true });
    expect(await archive.file('Meine Abgabe/Notiz.txt')?.async('string')).toBe(
      'Hallo',
    );
  });

  it('entpackt auch ohne natives Plugin und erhält Unterordner', async () => {
    mocks.pluginAvailable = false;
    const sourceArchive = new JSZip();
    sourceArchive.file('Inhalt/Text.txt', 'Hallo');
    const archiveData = await sourceArchive.generateAsync({ type: 'base64' });
    mocks.filesystem.readFile.mockResolvedValueOnce({ data: archiveData });

    await fileManagerService.extractZip(
      ['Studium'],
      'Unterlagen.zip',
      'Unterlagen',
    );

    expect(mocks.zip.unzip).not.toHaveBeenCalled();
    expect(mocks.filesystem.writeFile).toHaveBeenCalledWith({
      path: 'Dateimanager/Studium/Unterlagen/Inhalt/Text.txt',
      directory: 'DATA',
      data: 'SGFsbG8=',
      recursive: true,
    });
  });

  it('nutzt die Absicherung, wenn das native Plugin das Komprimieren ablehnt', async () => {
    mocks.zip.zip.mockRejectedValueOnce(new Error('not implemented'));
    mocks.filesystem.readdir.mockResolvedValueOnce({
      files: [
        {
          name: 'Notiz.txt',
          type: 'file',
          size: 5,
          mtime: 1,
          uri: 'file:///notiz',
        },
      ],
    });

    await fileManagerService.compressFolder(['Studium'], 'Abgabe', 'Abgabe.zip');

    const writeOptions = mocks.filesystem.writeFile.mock.calls.at(-1)?.[0];
    expect(writeOptions).toMatchObject({
      path: 'Dateimanager/Studium/Abgabe.zip',
      directory: 'DATA',
      recursive: false,
    });
  });

  it('bricht ab, wenn die Datenmenge für die Absicherung zu groß ist', async () => {
    mocks.pluginAvailable = false;
    mocks.filesystem.readdir.mockResolvedValueOnce({
      files: [
        {
          name: 'Film.mp4',
          type: 'file',
          size: 200 * 1024 * 1024,
          mtime: 1,
          uri: 'file:///film',
        },
      ],
    });

    await expect(
      fileManagerService.compressFolder(['Studium'], 'Videos', 'Videos.zip'),
    ).rejects.toThrow('ZIP_FALLBACK_LIMIT');

    expect(mocks.filesystem.readFile).not.toHaveBeenCalled();
  });

  it('blockiert unsichere relative Pfade aus ZIP-Dateien', async () => {
    mocks.pluginAvailable = false;
    const sourceArchive = new JSZip();
    sourceArchive.file('../ausbruch.txt', 'Nicht schreiben');
    const archiveData = await sourceArchive.generateAsync({ type: 'base64' });
    mocks.filesystem.readFile.mockResolvedValueOnce({ data: archiveData });

    await expect(
      fileManagerService.extractZip(['Studium'], 'Unsicher.zip', 'Unsicher'),
    ).rejects.toThrow('UNSAFE_ZIP_PATH');

    expect(mocks.filesystem.rmdir).toHaveBeenCalledWith({
      path: 'Dateimanager/Studium/Unsicher',
      directory: 'DATA',
      recursive: true,
    });
  });
});
