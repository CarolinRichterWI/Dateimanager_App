import { describe, expect, it } from 'vitest';

import {
  appendFileUri,
  cleanImportedName,
  entryPath,
  formatBytes,
  isZipFile,
  joinPath,
  makeUniqueName,
  mimeTypeForName,
  splitExtension,
  validateEntryName,
  zipDestinationFolderName,
} from './file-utils';

describe('Pfadbehandlung', () => {
  it('setzt einen relativen App-Pfad ohne doppelte Trennzeichen zusammen', () => {
    expect(joinPath('Dateimanager/', '/Projekte/', '2026')).toBe(
      'Dateimanager/Projekte/2026',
    );
  });

  it('setzt den Pfad eines Eintrags aus Root, Navigation und Name zusammen', () => {
    expect(entryPath('Dateimanager', ['Studium', 'Mobile Apps'], 'Aufgabe.pdf')).toBe(
      'Dateimanager/Studium/Mobile Apps/Aufgabe.pdf',
    );
  });

  it('hängt Dateinamen URL-sicher an eine Datei-URI an', () => {
    expect(appendFileUri('file:///data/user/0/app/files/', 'Meine Datei.zip')).toBe(
      'file:///data/user/0/app/files/Meine%20Datei.zip',
    );
  });
});

describe('Namensvalidierung', () => {
  it('lehnt leere Namen ab', () => {
    expect(validateEntryName('   ')).toBe('Bitte gib einen Namen ein.');
  });

  it.each(['.', '..'])('lehnt den reservierten Pfadnamen %s ab', (name) => {
    expect(validateEntryName(name)).toBe('Dieser Name ist nicht erlaubt.');
  });

  it.each(['A/B', 'A\\B', 'Frage?.txt', 'A:B'])(
    'lehnt Pfad- und Sonderzeichen in %s ab',
    (name) => {
      expect(validateEntryName(name)).toBe(
        'Der Name enthält ein nicht erlaubtes Zeichen.',
      );
    },
  );

  it('akzeptiert einen normalen Dateinamen', () => {
    expect(validateEntryName('Projektbericht 2026.pdf')).toBeNull();
  });

  it('bereinigt Pfadbestandteile aus importierten Namen', () => {
    expect(cleanImportedName('C:\\Downloads\\Frage?.pdf')).toBe('Frage_.pdf');
  });
});

describe('Kollisionsfreie Namen', () => {
  it('behält einen noch freien Namen bei', () => {
    expect(makeUniqueName('Foto.jpg', ['Text.txt'])).toBe('Foto.jpg');
  });

  it('nummeriert eine vorhandene Datei vor ihrer Erweiterung', () => {
    expect(makeUniqueName('Foto.jpg', ['Foto.jpg'])).toBe('Foto (1).jpg');
  });

  it('überspringt bereits vorhandene Nummerierungen', () => {
    expect(makeUniqueName('Foto.jpg', ['Foto.jpg', 'Foto (1).jpg', 'Foto (2).jpg'])).toBe(
      'Foto (3).jpg',
    );
  });

  it('vergleicht Namen ohne Beachtung der Großschreibung', () => {
    expect(makeUniqueName('BERICHT.PDF', ['bericht.pdf'])).toBe('BERICHT (1).PDF');
  });

  it('nummeriert auch Ordnernamen ohne Erweiterung', () => {
    expect(makeUniqueName('Dokumente', ['Dokumente'])).toBe('Dokumente (1)');
  });
});

describe('Dateitypen und Darstellung', () => {
  it('trennt Stamm und Erweiterung', () => {
    expect(splitExtension('Archiv.tar.zip')).toEqual({
      stem: 'Archiv.tar',
      extension: '.zip',
    });
  });

  it('behandelt eine versteckte Datei nicht als reine Erweiterung', () => {
    expect(splitExtension('.env')).toEqual({ stem: '.env', extension: '' });
  });

  it('erkennt ZIP-Dateien unabhängig von der Großschreibung', () => {
    expect(isZipFile('Unterlagen.ZIP')).toBe(true);
  });

  it('bestimmt den Namen des neuen Entpackordners', () => {
    expect(zipDestinationFolderName('Unterlagen 2026.zip')).toBe('Unterlagen 2026');
  });

  it('liefert passende MIME-Typen und einen sicheren Fallback', () => {
    expect(mimeTypeForName('Bericht.pdf')).toBe('application/pdf');
    expect(mimeTypeForName('Daten.unbekannt')).toBe('application/octet-stream');
  });

  it('formatiert Dateigrößen deutsch und kompakt', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });
});

