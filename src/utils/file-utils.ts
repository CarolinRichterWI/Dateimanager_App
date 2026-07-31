const FORBIDDEN_NAME_CHARACTERS = /[\\/:*?"<>|\u0000-\u001f]/;
const MAX_NAME_LENGTH = 180;

const MIME_TYPES: Record<string, string> = {
  apk: 'application/vnd.android.package-archive',
  avi: 'video/x-msvideo',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  gif: 'image/gif',
  heic: 'image/heic',
  html: 'text/html',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  json: 'application/json',
  md: 'text/markdown',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  odp: 'application/vnd.oasis.opendocument.presentation',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odt: 'application/vnd.oasis.opendocument.text',
  pdf: 'application/pdf',
  png: 'image/png',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  rar: 'application/vnd.rar',
  rtf: 'application/rtf',
  svg: 'image/svg+xml',
  tar: 'application/x-tar',
  txt: 'text/plain',
  wav: 'audio/wav',
  webp: 'image/webp',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xml: 'application/xml',
  zip: 'application/zip',
};

export const joinPath = (...parts: Array<string | undefined>): string =>
  parts
    .filter((part): part is string => Boolean(part))
    .flatMap((part) => part.split('/'))
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');

export const entryPath = (root: string, path: string[], name?: string): string =>
  joinPath(root, ...path, name);

export const validateEntryName = (rawName: string): string | null => {
  const name = rawName.trim();

  if (!name) {
    return 'Bitte gib einen Namen ein.';
  }

  if (name === '.' || name === '..') {
    return 'Dieser Name ist nicht erlaubt.';
  }

  if (FORBIDDEN_NAME_CHARACTERS.test(name)) {
    return 'Der Name enthält ein nicht erlaubtes Zeichen.';
  }

  if (name.endsWith('.') || name.endsWith(' ')) {
    return 'Der Name darf nicht mit einem Punkt oder Leerzeichen enden.';
  }

  if (name.length > MAX_NAME_LENGTH) {
    return `Der Name darf höchstens ${MAX_NAME_LENGTH} Zeichen lang sein.`;
  }

  return null;
};

export const cleanImportedName = (rawName: string): string => {
  const leafName = rawName.split(/[\\/]/).at(-1)?.trim() || 'Unbenannte Datei';
  const cleaned = leafName
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .slice(0, MAX_NAME_LENGTH);

  return cleaned || 'Unbenannte Datei';
};

export const splitExtension = (
  name: string,
): {
  stem: string;
  extension: string;
} => {
  const dotIndex = name.lastIndexOf('.');

  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return { stem: name, extension: '' };
  }

  return {
    stem: name.slice(0, dotIndex),
    extension: name.slice(dotIndex),
  };
};

export const makeUniqueName = (
  desiredName: string,
  existingNames: Iterable<string>,
): string => {
  const used = new Set(Array.from(existingNames, (name) => name.toLocaleLowerCase('de-DE')));

  if (!used.has(desiredName.toLocaleLowerCase('de-DE'))) {
    return desiredName;
  }

  const { stem, extension } = splitExtension(desiredName);
  let index = 1;
  let candidate = `${stem} (${index})${extension}`;

  while (used.has(candidate.toLocaleLowerCase('de-DE'))) {
    index += 1;
    candidate = `${stem} (${index})${extension}`;
  }

  return candidate;
};

export const isZipFile = (name: string): boolean => name.toLocaleLowerCase().endsWith('.zip');

export const zipDestinationFolderName = (zipName: string): string => {
  const withoutExtension = zipName.replace(/\.zip$/i, '').trim();
  return cleanImportedName(withoutExtension || 'Entpackte Dateien');
};

export const mimeTypeForName = (name: string): string => {
  const extension = splitExtension(name).extension.slice(1).toLocaleLowerCase();
  return MIME_TYPES[extension] ?? 'application/octet-stream';
};

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  const digits = unitIndex === 0 || value >= 10 ? 0 : 1;

  return `${value.toLocaleString('de-DE', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })} ${units[unitIndex]}`;
};

export const formatModifiedAt = (timestamp?: number): string => {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return 'Datum unbekannt';
  }

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
};

export const appendFileUri = (directoryUri: string, fileName: string): string =>
  `${directoryUri.replace(/\/+$/, '')}/${encodeURIComponent(fileName)}`;

export const blobFromBase64 = (data: string, mimeType: string): Blob => {
  const normalized = data.includes(',') ? (data.split(',').at(-1) ?? '') : data;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
};

