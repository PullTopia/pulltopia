# PullTopia – öffentliche Website

Statische Website der PullTopia-Discord-Community (Start, Datenschutz, Nutzungsbedingungen, Impressum) und die
Bestätigungsseite für die TikTok-Verbindung (`tiktok/callback/`), die den Einmal-Code nur im Browser anzeigt.
Keine Server-Logik, keine Cookies, kein Tracking.

Startseite (`index.html`) im neuen Design mit `assets/` (selbst gehostete Inter-Schrift, eigene Cardverse-Motive, CSS/JS ohne Frameworks).
Vorschau-Kopie: `preview/` (noindex). Ältere Startseite: `old/index.html`.
Backup der Startseite v1 (Stand 6c9c24c, vor dem Umbau am 16.11.2026): `v1/` (noindex, eingefrorene CSS/JS) und Git-Tag `backup/website-v1-20261116`.
Rollback auf v1: `git checkout backup/website-v1-20261116 -- index.html assets/site.css assets/site.js && git commit -m "Rollback v1" && git push`.
Gründerplätze ändern: in `index.html` die zwei Zahlen im Block `<!-- GRÜNDERPLÄTZE -->` (data-fc-free / data-fc-total).
