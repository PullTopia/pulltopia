# /alt/ – vorherige Live-Startseite (Backup)

Stand: Commit `e666eed`, Git-Tag `live-v1-backup` (20.11.2026).

Das ist eine funktionierende Kopie der Apple-Stil-Startseite, die bis zu diesem Tag unter
https://pulltopia.github.io/pulltopia/ live war. Asset- und Footer-Pfade zeigen eine Ebene
nach oben (`../assets/`, `../imprint.html` …). Die Seite ist `noindex`.

## Rollback der Live-Startseite

Nur die Startseite zurücksetzen, Rest (inkl. /neon/) unverändert lassen:

```
git checkout live-v1-backup -- index.html
git commit -m "Rollback: vorherige Live-Startseite wiederherstellen"
git push origin main
```

Der Tag `live-v1-backup` zeigt auf den vollständigen Stand vor dieser Umstellung
(alte Startseite im Root plus Neon v7 unter /neon/).
