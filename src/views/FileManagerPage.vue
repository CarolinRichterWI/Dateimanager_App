<template>
  <IonPage>
    <IonHeader class="app-header" :translucent="true">
      <IonToolbar>
        <IonButtons slot="start">
          <IonButton
            v-if="pathSegments.length"
            aria-label="Eine Ordnerebene zurück"
            :disabled="operationBusy"
            @click="goUp"
          >
            <IonIcon slot="icon-only" :icon="arrowBackOutline" />
          </IonButton>
        </IonButtons>

        <IonTitle>Dateimanager</IonTitle>

        <IonButtons slot="end">
          <IonButton
            aria-label="Dateiliste aktualisieren"
            :disabled="loading || operationBusy"
            @click="loadEntries(true)"
          >
            <IonIcon slot="icon-only" :icon="refreshOutline" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <IonRefresher slot="fixed" @ion-refresh="refreshEntries">
        <IonRefresherContent pulling-text="Zum Aktualisieren ziehen" refreshing-spinner="crescent" />
      </IonRefresher>

      <section class="overview" aria-labelledby="overview-title">
        <div class="overview__icon" aria-hidden="true">
          <IonIcon :icon="folderOpenOutline" />
        </div>
        <div>
          <p class="eyebrow">Sicher im App-Speicher</p>
          <h1 id="overview-title">Meine Dateien</h1>
          <p>{{ entrySummary }}</p>
        </div>
      </section>

      <nav class="breadcrumbs" aria-label="Aktueller Ordner">
        <IonBreadcrumbs :max-items="4" :items-before-collapse="1" :items-after-collapse="2">
          <IonBreadcrumb :disabled="pathSegments.length === 0" @click="navigateToDepth(0)">
            <IonIcon slot="start" :icon="homeOutline" />
            Start
          </IonBreadcrumb>
          <IonBreadcrumb
            v-for="(segment, index) in pathSegments"
            :key="`${index}-${segment}`"
            :disabled="index === pathSegments.length - 1"
            @click="navigateToDepth(index + 1)"
          >
            {{ segment }}
          </IonBreadcrumb>
        </IonBreadcrumbs>
      </nav>

      <IonSearchbar
        v-if="entries.length > 5 || searchQuery"
        v-model="searchQuery"
        class="file-search"
        placeholder="In diesem Ordner suchen"
        :debounce="100"
        show-clear-button="focus"
        aria-label="Dateien und Ordner suchen"
      />

      <section class="content-card" aria-live="polite">
        <div v-if="loading" class="loading-list" aria-label="Dateien werden geladen">
          <div v-for="index in 4" :key="index" class="skeleton-row">
            <IonSkeletonText :animated="true" class="skeleton-row__icon" />
            <div class="skeleton-row__text">
              <IonSkeletonText :animated="true" />
              <IonSkeletonText :animated="true" />
            </div>
          </div>
        </div>

        <div v-else-if="loadError" class="state state--error">
          <div class="state__icon state__icon--error">
            <IonIcon :icon="alertCircleOutline" />
          </div>
          <h2>Dateien konnten nicht geladen werden</h2>
          <p>{{ loadError }}</p>
          <IonButton fill="outline" @click="loadEntries(true)">Erneut versuchen</IonButton>
        </div>

        <div v-else-if="filteredEntries.length === 0" class="state">
          <div class="state__icon">
            <IonIcon :icon="searchQuery ? searchOutline : folderOutline" />
          </div>
          <h2>{{ searchQuery ? 'Keine Treffer' : 'Dieser Ordner ist leer' }}</h2>
          <p v-if="searchQuery">Für „{{ searchQuery }}“ wurde kein Eintrag gefunden.</p>
          <p v-else>Importiere eine Datei oder erstelle deinen ersten Ordner.</p>
          <IonButton v-if="!searchQuery" @click="showAddActions">
            <IonIcon slot="start" :icon="addOutline" />
            Hinzufügen
          </IonButton>
        </div>

        <IonList v-else class="file-list" :inset="false" lines="full">
          <IonItem
            v-for="entry in filteredEntries"
            :key="`${entry.type}-${entry.name}`"
            button
            :detail="false"
            class="file-row"
            :disabled="operationBusy"
            @click="openEntry(entry)"
          >
            <div
              slot="start"
              class="file-row__icon"
              :class="entry.type === 'directory' ? 'file-row__icon--folder' : 'file-row__icon--file'"
              aria-hidden="true"
            >
              <IonIcon :icon="iconForEntry(entry)" />
            </div>

            <IonLabel>
              <h2>{{ entry.name }}</h2>
              <p>{{ metadataForEntry(entry) }}</p>
            </IonLabel>

            <IonIcon
              v-if="entry.type === 'directory'"
              slot="end"
              class="file-row__chevron"
              :icon="chevronForwardOutline"
              aria-hidden="true"
            />

            <IonButton
              slot="end"
              fill="clear"
              color="medium"
              class="file-row__menu"
              :aria-label="`Aktionen für ${entry.name}`"
              @click.stop="showEntryActions(entry)"
            >
              <IonIcon slot="icon-only" :icon="ellipsisVertical" />
            </IonButton>
          </IonItem>
        </IonList>
      </section>

      <div class="bottom-spacer" aria-hidden="true" />

      <IonFab slot="fixed" vertical="bottom" horizontal="end">
        <IonFabButton
          aria-label="Datei oder Ordner hinzufügen"
          :disabled="operationBusy"
          @click="showAddActions"
        >
          <IonIcon :icon="addOutline" />
        </IonFabButton>
      </IonFab>
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  IonBreadcrumb,
  IonBreadcrumbs,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  actionSheetController,
  alertController,
  loadingController,
  toastController,
  useBackButton,
  type RefresherCustomEvent,
} from '@ionic/vue';
import {
  addOutline,
  alertCircleOutline,
  archiveOutline,
  arrowBackOutline,
  chevronForwardOutline,
  codeSlashOutline,
  documentAttachOutline,
  documentOutline,
  documentTextOutline,
  ellipsisVertical,
  folderOpenOutline,
  folderOutline,
  homeOutline,
  imageOutline,
  musicalNotesOutline,
  pencilOutline,
  refreshOutline,
  searchOutline,
  trashOutline,
  videocamOutline,
} from 'ionicons/icons';

import { fileManagerService } from '@/services/file-manager.service';
import type { ManagedEntry } from '@/types/files';
import {
  formatBytes,
  formatModifiedAt,
  isZipFile,
  makeUniqueName,
  splitExtension,
  validateEntryName,
  zipDestinationFolderName,
} from '@/utils/file-utils';

const entries = ref<ManagedEntry[]>([]);
const pathSegments = ref<string[]>([]);
const searchQuery = ref('');
const loading = ref(true);
const operationBusy = ref(false);
const loadError = ref('');
const initialized = ref(false);

const filteredEntries = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('de-DE');

  if (!query) {
    return entries.value;
  }

  return entries.value.filter((entry) =>
    entry.name.toLocaleLowerCase('de-DE').includes(query),
  );
});

const entrySummary = computed(() => {
  const folderCount = entries.value.filter((entry) => entry.type === 'directory').length;
  const fileCount = entries.value.length - folderCount;
  const folderLabel = folderCount === 1 ? '1 Ordner' : `${folderCount} Ordner`;
  const fileLabel = fileCount === 1 ? '1 Datei' : `${fileCount} Dateien`;

  return `${folderLabel} · ${fileLabel}`;
});

const currentNames = (ignoredName?: string): string[] =>
  entries.value
    .filter((entry) => entry.name !== ignoredName)
    .map((entry) => entry.name);

const hasName = (name: string, ignoredName?: string): boolean =>
  currentNames(ignoredName).some(
    (existingName) =>
      existingName.toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'),
  );

const showToast = async (
  message: string,
  color: 'success' | 'danger' | 'warning' | 'medium' = 'success',
): Promise<void> => {
  const toast = await toastController.create({
    message,
    color,
    duration: color === 'danger' ? 3500 : 2400,
    position: 'bottom',
  });
  await toast.present();
};

const friendlyError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);

  if (/cancel|abgebrochen|canceled/i.test(message)) {
    return '';
  }

  console.error('Dateimanager', error);

  if (message.includes('ZIP_FALLBACK_LIMIT')) {
    return 'Für diese Datenmenge wird das native ZIP-Plugin benötigt. Führe zuerst die ZIP-Einrichtung aus.';
  }

  if (message.includes('UNSAFE_ZIP_PATH')) {
    return 'Die ZIP-Datei enthält unsichere Pfade und wurde nicht entpackt.';
  }

  if (/end of central directory|corrupt|crc|invalid zip/i.test(message)) {
    return 'Die ZIP-Datei ist beschädigt und konnte nicht gelesen werden.';
  }

  if (/not exist|no such file|enoent|not found/i.test(message)) {
    return 'Der Eintrag ist nicht mehr vorhanden. Bitte aktualisiere die Ansicht.';
  }

  if (/already exist|file exists|directory exists|eexist/i.test(message)) {
    return 'Ein Eintrag mit diesem Namen existiert bereits.';
  }

  if (/no space|enospc|quota/i.test(message)) {
    return 'Auf dem Gerät ist kein Speicherplatz mehr frei.';
  }

  if (/activity|no app|unable to resolve|resolve activity/i.test(message)) {
    return 'Auf dem Gerät ist keine App installiert, die diesen Dateityp öffnen kann.';
  }

  if (/permission|denied/i.test(message)) {
    return 'Der Zugriff wurde vom System verweigert.';
  }

  return 'Die Aktion konnte nicht abgeschlossen werden.';
};

const loadEntries = async (showLoading = false): Promise<void> => {
  if (showLoading) {
    loading.value = true;
  }
  loadError.value = '';

  try {
    if (!initialized.value) {
      await fileManagerService.initialize();
      initialized.value = true;
    }
    entries.value = await fileManagerService.list(pathSegments.value);
  } catch (error) {
    loadError.value = friendlyError(error) || 'Der Zugriff auf den App-Speicher ist fehlgeschlagen.';
  } finally {
    loading.value = false;
  }
};

const refreshEntries = async (event: RefresherCustomEvent): Promise<void> => {
  await loadEntries(false);
  event.target.complete();
};

const runOperation = async (
  loadingMessage: string,
  successMessage: string,
  operation: () => Promise<void>,
): Promise<boolean> => {
  operationBusy.value = true;
  const overlay = await loadingController.create({
    message: loadingMessage,
    spinner: 'crescent',
    backdropDismiss: false,
  });
  await overlay.present();

  try {
    await operation();
    await loadEntries(false);
    await showToast(successMessage);
    return true;
  } catch (error) {
    const message = friendlyError(error);
    if (message) {
      await showToast(message, 'danger');
    }
    return false;
  } finally {
    await overlay.dismiss().catch(() => undefined);
    operationBusy.value = false;
  }
};

const promptForName = async (options: {
  title: string;
  confirmText: string;
  initialValue?: string;
  ignoredName?: string;
}): Promise<string | null> => {
  let acceptedName = '';
  const alert = await alertController.create({
    header: options.title,
    message: 'Der Name darf keine Pfad- oder Sonderzeichen enthalten.',
    inputs: [
      {
        name: 'name',
        type: 'text',
        value: options.initialValue ?? '',
        placeholder: 'Name',
        attributes: {
          maxlength: 180,
          autocapitalize: 'sentences',
          enterkeyhint: 'done',
        },
      },
    ],
    buttons: [
      {
        text: 'Abbrechen',
        role: 'cancel',
      },
      {
        text: options.confirmText,
        role: 'confirm',
        handler: (data) => {
          const name = String(data.name ?? '').trim();
          const validationError = validateEntryName(name);

          if (validationError) {
            void showToast(validationError, 'warning');
            return false;
          }

          if (hasName(name, options.ignoredName)) {
            void showToast('Ein Eintrag mit diesem Namen existiert bereits.', 'warning');
            return false;
          }

          acceptedName = name;
          return true;
        },
      },
    ],
  });

  await alert.present();
  const result = await alert.onDidDismiss();
  return result.role === 'confirm' ? acceptedName : null;
};

const createFolder = async (): Promise<void> => {
  const name = await promptForName({
    title: 'Neuen Ordner erstellen',
    confirmText: 'Erstellen',
  });

  if (!name) {
    return;
  }

  await runOperation('Ordner wird erstellt …', `Ordner „${name}“ wurde erstellt.`, () =>
    fileManagerService.createFolder(pathSegments.value, name),
  );
};

const importFiles = async (): Promise<void> => {
  operationBusy.value = true;

  try {
    const result = await fileManagerService.pickAndImportFiles(
      pathSegments.value,
      currentNames(),
    );

    if (result.importedNames.length) {
      await loadEntries(false);
      const importedLabel =
        result.importedNames.length === 1
          ? `„${result.importedNames[0]}“ wurde importiert.`
          : `${result.importedNames.length} Dateien wurden importiert.`;
      await showToast(importedLabel);
    }

    if (result.failedNames.length) {
      await showToast(
        `${result.failedNames.length} Datei(en) konnten nicht importiert werden.`,
        'warning',
      );
    }
  } catch (error) {
    const message = friendlyError(error);
    if (message) {
      await showToast(message, 'danger');
    }
  } finally {
    operationBusy.value = false;
  }
};

const showAddActions = async (): Promise<void> => {
  const sheet = await actionSheetController.create({
    header: 'Hinzufügen',
    subHeader: 'Was möchtest du in diesem Ordner ablegen?',
    buttons: [
      {
        text: 'Datei importieren',
        icon: documentAttachOutline,
        handler: () => {
          void importFiles();
        },
      },
      {
        text: 'Ordner erstellen',
        icon: folderOutline,
        handler: () => {
          void createFolder();
        },
      },
      {
        text: 'Abbrechen',
        role: 'cancel',
      },
    ],
  });
  await sheet.present();
};

const openEntry = async (entry: ManagedEntry): Promise<void> => {
  if (entry.type === 'directory') {
    const previousPath = [...pathSegments.value];
    pathSegments.value = [...previousPath, entry.name];
    searchQuery.value = '';
    await loadEntries(true);

    if (loadError.value) {
      pathSegments.value = previousPath;
      await loadEntries(false);
      await showToast('Dieser Ordner konnte nicht geöffnet werden.', 'danger');
    }

    return;
  }

  operationBusy.value = true;
  try {
    await fileManagerService.openFile(pathSegments.value, entry);
  } catch (error) {
    const message = friendlyError(error);
    await showToast(
      message || 'Für diese Datei wurde keine passende App zum Öffnen gefunden.',
      'danger',
    );
  } finally {
    operationBusy.value = false;
  }
};

const renameEntry = async (entry: ManagedEntry): Promise<void> => {
  const newName = await promptForName({
    title: entry.type === 'directory' ? 'Ordner umbenennen' : 'Datei umbenennen',
    confirmText: 'Umbenennen',
    initialValue: entry.name,
    ignoredName: entry.name,
  });

  if (!newName || newName === entry.name) {
    return;
  }

  await runOperation(
    'Eintrag wird umbenannt …',
    `„${entry.name}“ heißt jetzt „${newName}“.`,
    () => fileManagerService.renameEntry(pathSegments.value, entry, newName),
  );
};

const confirmDelete = async (entry: ManagedEntry): Promise<void> => {
  const isDirectory = entry.type === 'directory';
  const alert = await alertController.create({
    header: isDirectory ? 'Ordner löschen?' : 'Datei löschen?',
    message: isDirectory
      ? `„${entry.name}“ und alle enthaltenen Dateien werden dauerhaft gelöscht.`
      : `„${entry.name}“ wird dauerhaft gelöscht.`,
    buttons: [
      {
        text: 'Abbrechen',
        role: 'cancel',
      },
      {
        text: 'Löschen',
        role: 'destructive',
      },
    ],
  });

  await alert.present();
  const result = await alert.onDidDismiss();

  if (result.role !== 'destructive') {
    return;
  }

  await runOperation(
    isDirectory ? 'Ordner wird gelöscht …' : 'Datei wird gelöscht …',
    `„${entry.name}“ wurde gelöscht.`,
    () => fileManagerService.deleteEntry(pathSegments.value, entry),
  );
};

const compressFolder = async (entry: ManagedEntry): Promise<void> => {
  const desiredName = `${entry.name}.zip`;
  const destinationName = makeUniqueName(desiredName, currentNames());

  await runOperation(
    'Ordner wird komprimiert …',
    `„${destinationName}“ wurde erstellt.`,
    () =>
      fileManagerService.compressFolder(
        pathSegments.value,
        entry.name,
        destinationName,
      ),
  );
};

const extractZip = async (entry: ManagedEntry): Promise<void> => {
  const desiredFolderName = zipDestinationFolderName(entry.name);
  const destinationFolderName = makeUniqueName(desiredFolderName, currentNames());

  await runOperation(
    'ZIP-Datei wird entpackt …',
    `„${entry.name}“ wurde nach „${destinationFolderName}“ entpackt.`,
    () =>
      fileManagerService.extractZip(
        pathSegments.value,
        entry.name,
        destinationFolderName,
      ),
  );
};

const showEntryActions = async (entry: ManagedEntry): Promise<void> => {
  const buttons = [];

  if (entry.type === 'directory') {
    buttons.push(
      {
        text: 'Öffnen',
        icon: folderOpenOutline,
        handler: () => {
          void openEntry(entry);
        },
      },
      {
        text: 'Als ZIP komprimieren',
        icon: archiveOutline,
        handler: () => {
          void compressFolder(entry);
        },
      },
    );
  } else {
    buttons.push({
      text: 'Öffnen',
      icon: documentOutline,
      handler: () => {
        void openEntry(entry);
      },
    });

    if (isZipFile(entry.name)) {
      buttons.push({
        text: 'In neuen Ordner entpacken',
        icon: archiveOutline,
        handler: () => {
          void extractZip(entry);
        },
      });
    }
  }

  buttons.push(
    {
      text: 'Umbenennen',
      icon: pencilOutline,
      handler: () => {
        void renameEntry(entry);
      },
    },
    {
      text: 'Löschen',
      role: 'destructive',
      icon: trashOutline,
      handler: () => {
        void confirmDelete(entry);
      },
    },
    {
      text: 'Abbrechen',
      role: 'cancel',
    },
  );

  const sheet = await actionSheetController.create({
    header: entry.name,
    subHeader: entry.type === 'directory' ? 'Ordner' : 'Datei',
    buttons,
  });
  await sheet.present();
};

const goUp = async (): Promise<void> => {
  if (!pathSegments.value.length) {
    return;
  }

  pathSegments.value.pop();
  searchQuery.value = '';
  await loadEntries(true);
};

const navigateToDepth = async (depth: number): Promise<void> => {
  if (depth === pathSegments.value.length) {
    return;
  }

  pathSegments.value = pathSegments.value.slice(0, depth);
  searchQuery.value = '';
  await loadEntries(true);
};

const iconForEntry = (entry: ManagedEntry): string => {
  if (entry.type === 'directory') {
    return folderOutline;
  }

  if (isZipFile(entry.name)) {
    return archiveOutline;
  }

  const extension = splitExtension(entry.name).extension.toLocaleLowerCase();

  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.heic'].includes(extension)) {
    return imageOutline;
  }
  if (['.mp3', '.wav', '.aac', '.m4a', '.ogg'].includes(extension)) {
    return musicalNotesOutline;
  }
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(extension)) {
    return videocamOutline;
  }
  if (['.txt', '.md', '.doc', '.docx', '.pdf', '.rtf'].includes(extension)) {
    return documentTextOutline;
  }
  if (['.html', '.css', '.js', '.ts', '.vue', '.json', '.xml'].includes(extension)) {
    return codeSlashOutline;
  }

  return documentOutline;
};

const metadataForEntry = (entry: ManagedEntry): string => {
  const typeLabel = entry.type === 'directory' ? 'Ordner' : formatBytes(entry.size);
  return `${typeLabel} · ${formatModifiedAt(entry.modifiedAt)}`;
};

useBackButton(10, (processNextHandler) => {
  if (pathSegments.value.length) {
    void goUp();
    return;
  }

  processNextHandler();
});

onMounted(() => {
  void loadEntries(true);
});
</script>

<style scoped>
.app-header ion-toolbar {
  --background: rgba(249, 250, 255, 0.94);
  --border-color: transparent;
  --color: var(--app-ink);
  --min-height: 62px;
  backdrop-filter: blur(18px);
}

.app-header ion-title {
  font-size: 1.08rem;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.overview {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 18px 16px 10px;
  padding: 20px;
  overflow: hidden;
  position: relative;
  color: white;
  border-radius: 24px;
  background:
    radial-gradient(circle at 92% 14%, rgba(255, 255, 255, 0.3), transparent 29%),
    linear-gradient(135deg, #6557f5 0%, #4939d9 62%, #3727bd 100%);
  box-shadow: 0 16px 36px rgba(74, 57, 217, 0.22);
}

.overview::after {
  content: '';
  width: 115px;
  height: 115px;
  position: absolute;
  right: -44px;
  bottom: -65px;
  border: 18px solid rgba(255, 255, 255, 0.09);
  border-radius: 50%;
}

.overview__icon {
  width: 58px;
  height: 58px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.overview__icon ion-icon {
  font-size: 31px;
}

.overview h1 {
  margin: 2px 0 4px;
  font-size: clamp(1.35rem, 5vw, 1.7rem);
  line-height: 1.15;
  letter-spacing: -0.035em;
}

.overview p {
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.86rem;
}

.overview .eyebrow {
  color: rgba(255, 255, 255, 0.73);
  font-size: 0.69rem;
  font-weight: 750;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.breadcrumbs {
  min-height: 42px;
  margin: 0 10px;
  padding: 3px 6px;
  overflow-x: auto;
}

.breadcrumbs ion-breadcrumb {
  --color: var(--ion-color-primary);
  --color-active: var(--app-ink);
  font-size: 0.83rem;
  font-weight: 650;
}

.file-search {
  --background: #ffffff;
  --border-radius: 16px;
  --box-shadow: 0 4px 18px rgba(26, 27, 45, 0.06);
  --color: var(--app-ink);
  --placeholder-color: var(--app-muted);
  margin: 2px 8px 7px;
  width: auto;
}

.content-card {
  margin: 4px 12px 0;
  overflow: hidden;
  border: 1px solid rgba(81, 76, 122, 0.08);
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 8px 28px rgba(34, 35, 58, 0.06);
}

.file-list {
  padding: 2px 0;
  background: transparent;
}

.file-row {
  --background: transparent;
  --background-hover: #f7f6ff;
  --background-activated: #efedff;
  --border-color: rgba(75, 72, 107, 0.09);
  --inner-padding-end: 5px;
  --min-height: 76px;
  --padding-start: 12px;
}

.file-row::part(native) {
  transition: background-color 150ms ease;
}

.file-row__icon {
  width: 46px;
  height: 46px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  margin-inline-end: 14px;
  border-radius: 15px;
}

.file-row__icon ion-icon {
  font-size: 25px;
}

.file-row__icon--folder {
  color: #6c52d9;
  background: #eeeafe;
}

.file-row__icon--file {
  color: #287c85;
  background: #e8f6f6;
}

.file-row ion-label {
  margin: 13px 0;
}

.file-row ion-label h2 {
  overflow: hidden;
  margin: 0 0 5px;
  color: var(--app-ink);
  font-size: 0.96rem;
  font-weight: 690;
  letter-spacing: -0.015em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-row ion-label p {
  overflow: hidden;
  margin: 0;
  color: var(--app-muted);
  font-size: 0.76rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-row__chevron {
  margin-inline: 4px 0;
  color: #aaa7bb;
  font-size: 17px;
}

.file-row__menu {
  --padding-end: 8px;
  --padding-start: 8px;
  width: 42px;
  height: 42px;
  margin-inline-start: 0;
}

.loading-list {
  padding: 2px 12px;
}

.skeleton-row {
  min-height: 76px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid rgba(75, 72, 107, 0.08);
}

.skeleton-row:last-child {
  border-bottom: 0;
}

.skeleton-row__icon {
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  margin: 0;
  border-radius: 15px;
}

.skeleton-row__text {
  flex: 1;
}

.skeleton-row__text ion-skeleton-text:first-child {
  width: min(220px, 70%);
  height: 14px;
  margin-bottom: 9px;
}

.skeleton-row__text ion-skeleton-text:last-child {
  width: min(160px, 55%);
  height: 10px;
}

.state {
  min-height: 320px;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  padding: 38px 28px;
  text-align: center;
}

.state__icon {
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  color: #6557f5;
  border-radius: 24px;
  background: #efedff;
}

.state__icon ion-icon {
  font-size: 37px;
}

.state__icon--error {
  color: var(--ion-color-danger);
  background: #fff0f1;
}

.state h2 {
  margin: 0 0 8px;
  color: var(--app-ink);
  font-size: 1.1rem;
  letter-spacing: -0.02em;
}

.state p {
  max-width: 290px;
  margin: 0 0 20px;
  color: var(--app-muted);
  font-size: 0.87rem;
  line-height: 1.55;
}

.bottom-spacer {
  height: 104px;
}

ion-fab {
  margin: 0 6px 8px 0;
}

ion-fab-button {
  --background: linear-gradient(145deg, #6c5df7, #4c3cda);
  --background-activated: #3f31c5;
  --box-shadow: 0 12px 25px rgba(75, 58, 215, 0.35);
  --color: #fff;
}

@media (min-width: 720px) {
  .overview,
  .breadcrumbs,
  .file-search,
  .content-card {
    max-width: 760px;
    margin-right: auto;
    margin-left: auto;
  }

  .overview {
    margin-top: 28px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .file-row::part(native) {
    transition: none;
  }
}

@media (prefers-color-scheme: dark) {
  .app-header ion-toolbar {
    --background: rgba(20, 20, 29, 0.94);
  }

  .content-card {
    border-color: rgba(255, 255, 255, 0.07);
    background: #1d1d28;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  }

  .file-search {
    --background: #20202c;
    --box-shadow: 0 5px 18px rgba(0, 0, 0, 0.16);
  }

  .file-row {
    --background-hover: #282638;
    --background-activated: #302c4d;
    --border-color: rgba(255, 255, 255, 0.07);
  }

  .file-row__icon--folder {
    color: #a89dff;
    background: #302b4f;
  }

  .file-row__icon--file {
    color: #78cbd0;
    background: #223b3e;
  }

  .skeleton-row {
    border-bottom-color: rgba(255, 255, 255, 0.07);
  }

  .state__icon {
    color: #afa5ff;
    background: #302b4f;
  }
}
</style>
