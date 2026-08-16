# Dateimanager-App


## Gruppe 4

- Carolin Richter
- Rahel Friesen
- Erona Bajrami
- Hannah Hezel

## Funktionsumfang

- Listenansicht für alle Dateien und Ordner im aktuellen Verzeichnis
- Mehrfachauswahl und Import beliebiger Dateien über den nativen File Picker
- Kopieren importierter Dateien in `Directory.Data`
- Erstellen neuer Ordner mit validierter Namenseingabe
- Öffnen von Dateien mit einer passenden App auf dem Gerät
- Navigation in Ordner, per Breadcrumb und über die Android-Zurück-Taste
- Löschen von Dateien und ganzen Ordnerstrukturen nach Bestätigungsdialog
- Umbenennen von Dateien und Ordnern
- Komprimieren von Ordnern als ZIP-Datei im aktuellen Verzeichnis
- Entpacken von ZIP-Dateien in einen automatisch neu angelegten Ordner
- Eindeutige Datei- und Ordnersymbole
- Suche im aktuellen Ordner
- Pull-to-refresh und manuelles Aktualisieren
- Automatische kollisionsfreie Namen wie `Bericht (1).pdf`
- Helles und dunkles Farbschema
- Eigenes App-Icon und eigener Splashscreen

Die detaillierte Zuordnung zur Aufgabenstellung steht in [ANFORDERUNGEN.md](ANFORDERUNGEN.md).

## Technische Basis

- Ionic 8
- Vue 3 und TypeScript
- Capacitor 8
- Android als Zielplattform
- `@capacitor/filesystem`
- `@capawesome/capacitor-file-picker`
- `@capawesome-team/capacitor-file-opener`
- `@capawesome-team/capacitor-zip` als vorgesehener nativer ZIP-Provider
- JSZip als sofort funktionierende und plattformunabhängige Absicherung

## Voraussetzungen

- Node.js 22 oder neuer
- Android Studio mit Android SDK
- JDK 21. Am einfachsten wird das in Android Studio mitgelieferte JDK verwendet.

## Installation

Im Projektordner ausführen

```bash
npm install
npm test
npm run android:sync
```

Anschließend das native Projekt öffnen

```bash
npm run android:open
```

In Android Studio ein Gerät oder einen Emulator auswählen und die App über **Run** starten.

## Einrichtung des vorgegebenen nativen ZIP-Plugins

ZIP-Komprimierung und Entpacken funktionieren bereits ohne diesen Schritt über die integrierte Absicherung. Für die in der Aufgabenstellung vorgesehene native ZIP-Implementierung wird der bereitgestellte Lizenzschlüssel ausschließlich lokal als Umgebungsvariable gesetzt.

PowerShell

```powershell
$env:CAPAWESOME_TOKEN = "HIER_DEN_BEREITGESTELLTEN_SCHLÜSSEL_EINSETZEN"
npm run zip:setup
Remove-Item Env:CAPAWESOME_TOKEN
```

Der Schlüssel ist nicht im Quellcode enthalten. Die lokale `.npmrc` ist durch `.gitignore` von einer Veröffentlichung ausgeschlossen. Den Schlüssel niemals in Git committen, in Screenshots zeigen oder in einer öffentlichen Abgabe veröffentlichen.

## Android-SDK-Fehler beheben

Falls Gradle meldet, dass der SDK-Pfad fehlt, muss die lokale Datei `android/local.properties` den richtigen Pfad enthalten. Unter Windows beispielsweise

```properties
sdk.dir=C:/Users/DEIN_BENUTZERNAME/AppData/Local/Android/Sdk
```

`local.properties` ist absichtlich nicht Teil der Abgabe, weil dieser Pfad auf jedem Rechner anders ist.

Falls Gradle eine nicht unterstützte Java-Version meldet, in Android Studio unter **Settings**, **Build, Execution, Deployment**, **Build Tools**, **Gradle** das mitgelieferte JDK 21 auswählen.

## Nützliche Befehle

```bash
# Browser-Vorschau
npm run dev

# Automatisierte Tests
npm test

# TypeScript-Prüfung und Produktionsbuild
npm run build

# Web-Build erzeugen und nach Android synchronisieren
npm run android:sync

# App direkt auf einem verbundenen Android-Gerät starten
npm run android:run
```

## Bedienung

Über den violetten Plus-Button können Dateien importiert oder neue Ordner erstellt werden. Ein Tipp auf einen Ordner öffnet ihn. Ein Tipp auf eine Datei öffnet sie mit einer passenden App. Über das Drei-Punkte-Menü stehen Umbenennen, Löschen sowie je nach Eintrag Komprimieren oder Entpacken zur Verfügung.

## Speicher und Berechtigungen

Die App verwaltet nur Inhalte, die durch den Nutzer importiert oder in der App erstellt wurden. Sie liest keine Systemverzeichnisse aus. Alle Inhalte liegen unter `Directory.Data` und werden beim Deinstallieren der App entfernt. Der Android File Provider ist auf die benötigten internen und App-eigenen Pfade begrenzt.

## Qualitätssicherung

Die Tests prüfen unter anderem sichere Pfade, Namensvalidierung, Kollisionen, Dateitypen, Sortierung, internen Import, Öffnen, rekursives Löschen, Umbenennen, ZIP-Komprimierung, Entpacken, den Rückfall auf die Absicherung und die Größenbegrenzung. Vor jeder Abgabe müssen diese drei Befehle erfolgreich durchlaufen.

```bash
npm test
npm run build
npm run android:sync
```

Wichtig, nach jeder Änderung am Quellcode muss `npm run android:sync` laufen. Sonst enthält das Android-Projekt noch den alten Web-Build und die Änderungen sind auf dem Gerät nicht sichtbar.

## Bekannte Einschränkungen

- Ohne das native ZIP-Plugin übernimmt JSZip. Dabei liegt der Inhalt vollständig im Arbeitsspeicher der WebView. Ab 48 MB bricht die App bewusst mit einer Meldung ab, statt abzustürzen. Mit eingerichtetem nativen Plugin gilt diese Grenze nicht.
- Nur Android ist umgesetzt. Das Aufgabenblatt verlangt mindestens eine der beiden Plattformen.
- Die App verwaltet ausschließlich eigene Inhalte unter `Directory.Data`. Systemverzeichnisse des Geräts werden bewusst nicht gelesen.

## Abgabe-Checkliste

Abgabe bis 17.08.2026, 23:59 Uhr in Moodle. Präsentation am 19.08.2026.

- [x] Quellcode als ZIP-Datei
- [x] APK-Datei
- [ ] Präsentation
- [x] `KI-EINSATZ.md` vollständig ausgefüllt
- [x] `npm test` und `npm run build` laufen fehlerfrei
- [x] Vollständigen Abnahmetest aus `ANFORDERUNGEN.md` im Android-Emulator oder auf einem Android-Gerät durchführen
- [x] Lizenzschlüssel taucht nirgends in der Projektdatei auf

Die APK wird so erzeugt

```bash
cd android
./gradlew assembleDebug
```

Unter Windows stattdessen `gradlew.bat assembleDebug`. Die fertige Datei liegt anschließend unter `android/app/build/outputs/apk/debug/app-debug.apk`.
