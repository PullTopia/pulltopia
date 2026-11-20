# PullTopia – öffentliche Website

Statische Website der PullTopia-Discord-Community. Die Live-Startseite (`index.html`) ist seit dem 20.11.2026
die Neon-v7-Seite (Kino-Szenen, Gründerpreis). Assets liegen weiterhin unter `neon/` (CSS/JS/Videos) und `assets/`.
Die Testkopie unter `/neon/` bleibt erreichbar (noindex, Banner „Testseite“).

Backup der vorherigen Apple-Stil-Startseite: Ordner `/alt/` (funktionierende Kopie) und Git-Tag `live-v1-backup`
(Commit `e666eed`). Rollback nur der Startseite:

```
git checkout live-v1-backup -- index.html && git commit -m "Rollback: vorherige Live-Startseite wiederherstellen" && git push origin main
```


## Hinweise zum bisherigen Aufbau
Statische Website der PullTopia-Discord-Community (Start, Datenschutz, Nutzungsbedingungen, Impressum) und die
Bestätigungsseite für die TikTok-Verbindung (`tiktok/callback/`), die den Einmal-Code nur im Browser anzeigt.
Keine Server-Logik, keine Cookies, kein Tracking.

Startseite (`index.html`) im neuen Design mit `assets/` (selbst gehostete Inter-Schrift, eigene Cardverse-Motive, CSS/JS ohne Frameworks).
Vorschau-Kopie: `preview/` (noindex). Ältere Startseite: `old/index.html`.
Backup der Startseite v1 (Stand 6c9c24c, vor dem Umbau am 16.11.2026): `v1/` (noindex, eingefrorene CSS/JS) und Git-Tag `backup/website-v1-20261116`.
Rollback auf v1 (v1 hatte noch kein `assets/scenes.js`, deshalb wird es entfernt): `git checkout backup/website-v1-20261116 -- index.html assets/site.css assets/site.js && git rm -q assets/scenes.js && git commit -m "Rollback v1" && git push`.
Zwischenstände der neuen Startseite: v2 = `be8b225`/`b7c065b`, v3 (Nebel-Geheimkarte, Kreaturen, Gegen-Match, Set-Explorer) = `81e7e4b`, v3.1 (Creator Nexus visualisiert) = dieser Stand. Rückkehr zu einem Zwischenstand: `git checkout <commit> -- index.html assets/site.css assets/site.js assets/scenes.js && git commit -m "Rollback" && git push`.
Creator Nexus (`#creator`, TikTok-Box `#tiktok`): Inhalte nur aus dem Bot-Code `lib/partners/*` und `ops/docs/CREATOR_NEXUS.md`; die TikTok-Erklärung (Login Kit, Scopes, nur lesend, trennen, englischer Absatz) muss für die TikTok-Prüfung sichtbar bleiben.
Gründerplätze ändern: in `index.html` die zwei Zahlen im Block `<!-- GRÜNDERPLÄTZE -->` (data-fc-free / data-fc-total).

Statistik-Kästen (`#zahlen`): Werte seit Start der Aufzeichnung, geladen aus
`https://raw.githubusercontent.com/PullTopia/pulltopia/live-stats/stats.json` (alle 15 Minuten
vom Bot/VPS erzeugt, nur aggregierte Zahlen). Fallback: `./stats.json` (Stand dieser Auslieferung),
zuletzt im Browser gespeicherter Stand, sonst die fest im HTML hinterlegten Werte. Nie Schätzwerte.
Das Panel zeigt oben rechts „• Live“, wenn die geladenen Daten jünger als 2 Stunden sind.
Backup vor diesem Umbau: Git-Tag `backup/website-v3.1-20261117`. Älteres v1-Backup bleibt
`backup/website-v1-20261116`.
