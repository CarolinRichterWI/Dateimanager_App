# Abdeckung der Anforderungen

## Grundanforderungen

| Nr. | Anforderung | Umsetzung |
| --- | --- | --- |
| 1 | Unterstützung von Android oder iOS | Vollständiges Android-Projekt unter `android/` mit Capacitor 8 |
| 2 | Listenansicht für alle Dateien und Ordner des aktuellen Verzeichnisses | `Filesystem.readdir()` in `file-manager.service.ts`, sortierte Darstellung in `FileManagerPage.vue` |
| 3 | Button zum Hinzufügen neuer Dateien oder Ordner | Violetter Plus-Button mit Ionic Action Sheet |
| 4 | Neue Dateien werden in ein internes App-Verzeichnis kopiert | File Picker mit `readData: true`, anschließend `Filesystem.writeFile()` in `Directory.Data` |
| 5 | Neuer Ordner erfordert mindestens einen Namen | Eingabedialog mit Pflichtfeld und zusätzlicher Namensvalidierung |
| 6 | Jede Datei kann geöffnet werden | `Filesystem.getUri()` und `FileOpener.openFile()` mit passendem MIME-Typ |
| 7 | Jeder Ordner kann geöffnet werden | Navigation über eine Liste von Pfadsegmenten, Zurück-Taste und Breadcrumbs |
| 8 | Jede Datei und jeder Ordner kann gelöscht werden | `deleteFile()` für Dateien sowie `rmdir(..., recursive: true)` für Ordner |
| 9 | Löschen muss bestätigt werden | Bestätigungsdialog mit eindeutig hervorgehobener destruktiver Aktion |
| 10 | Datei und Ordner sind in der Liste unterscheidbar | Unterschiedliche Symbole, Farben und Typinformationen |

## Zusatzanforderungen

| Nr. | Anforderung | Umsetzung |
| --- | --- | --- |
| Z1 | Dateien und Ordner können umbenannt werden | Validierter Dialog und `Filesystem.rename()` |
| Z2 | Ordner können als ZIP-Datei im aktuellen Verzeichnis komprimiert werden | Native `Zip.zip()`-Anbindung mit automatischem Rückfall auf die JSZip-Absicherung |
| Z3 | ZIP-Dateien können in einen neuen Ordner entpackt werden | Eindeutiger Zielordner, `Zip.unzip()` beziehungsweise geprüfte JSZip-Entpackung, ebenfalls mit Rückfall |

## Zusätzliche Qualitätsmerkmale

- Keine Auflistung von Systemdateien
- Schutz gegen Pfadmanipulation und ZIP-Slip
- Keine stillen Überschreibungen vorhandener Dateien
- Bereinigung importierter Dateinamen
- Fehlerbehandlung mit verständlichen Meldungen
- Aufräumen eines Zielordners nach fehlgeschlagenem Entpacken
- Automatischer Rückfall auf die Absicherung, wenn das native ZIP-Plugin fehlt oder ablehnt
- Größenprüfung vor dem Packen und Entpacken, damit die WebView nicht am Speicher scheitert
- Sprechende Fehlermeldungen je Fehlerursache, technische Details landen zusätzlich in der Konsole
- Rücksprung in den vorherigen Ordner, wenn ein Ordner nicht geöffnet werden kann
- `queries`-Eintrag im Android-Manifest für die Package Visibility ab Android 11
- Datei- und Ordnersortierung mit Ordnern an erster Stelle
- Unterstützung leerer Ordner in ZIP-Archiven
- Responsives Layout für Smartphones und größere Displays
- Dark Mode
- Zugängliche Beschriftungen für Icon-Buttons
- Eigener Splashscreen und eigenes adaptives Android-App-Icon
- Automatisierte Unit- und Service-Tests

## Abnahmetest im Android-Emulator oder auf einem Android-Gerät

1. App starten und prüfen, dass die leere Startansicht erscheint.
2. Einen Ordner `Test` anlegen.
3. Den Ordner öffnen und über die Breadcrumbs zurücknavigieren.
4. Eine PDF- und eine Bilddatei importieren.
5. Beide Dateien öffnen.
6. Eine Datei umbenennen.
7. Eine Datei löschen und den Dialog zunächst abbrechen.
8. Den Löschvorgang erneut starten und bestätigen.
9. Im Ordner `Test` eine Datei ablegen.
10. `Test` als `Test.zip` komprimieren.
11. `Test.zip` entpacken und den neu entstandenen Ordner öffnen.
12. Einen nicht leeren Ordner löschen und bestätigen.
13. Die App neu starten und prüfen, dass die verbleibenden Inhalte weiterhin vorhanden sind.
