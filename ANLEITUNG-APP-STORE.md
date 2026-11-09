# X7 Casino in den App Store bringen – Schritt für Schritt

Die App ist mit React + Vite + TypeScript gebaut und wird mit **Capacitor** zu einer echten iOS-App.
Alles ist kostenlos, ohne In-App-Käufe.

---

## 0. Was du brauchst
| Was | Warum | Kosten |
|---|---|---|
| **Mac** mit macOS 14+ | Xcode läuft nur auf dem Mac (Alternative: gemieteter Cloud-Mac, z. B. MacinCloud) | – |
| **Xcode** (App Store, kostenlos) | baut und lädt die App hoch | 0 € |
| **Node.js 20+** (nodejs.org) | baut die Web-App | 0 € |
| **Apple Developer Program** (developer.apple.com/programs) | ohne Mitgliedschaft kein App-Store-Upload | **99 USD/Jahr** |
| iPhone (optional) | zum Testen über Kabel oder TestFlight | – |

> Auch eine kostenlose App braucht die kostenpflichtige Developer-Mitgliedschaft. Die Freischaltung dauert meist 1–2 Tage.

---

## 1. Projekt vorbereiten
Im Terminal im Projektordner:
```bash
npm install
npm run build          # erstellt den Ordner dist/
npx cap add ios        # erstellt das Xcode-Projekt im Ordner ios/
npx cap sync ios       # kopiert die App ins Xcode-Projekt
```

## 2. App-Icon und Startbildschirm erzeugen
```bash
npx @capacitor/assets generate --ios --iconBackgroundColor '#10070b' --splashBackgroundColor '#0b0609'
```
Das Tool nimmt `resources/icon.png` (1024 × 1024, liegt bereit) und erzeugt alle Größen.

## 3. In Xcode einstellen
```bash
npx cap open ios
```
In Xcode links **App** anklicken → Target **App**:
1. **Signing & Capabilities** → *Team*: dein Apple-Developer-Team wählen. *Bundle Identifier*: `xyz.xr7uz.casino` (muss einmalig sein; bei Konflikt z. B. `xyz.xr7uz.x7casino`; dann auch in `capacitor.config.ts` ändern).
2. **General** → *Display Name*: `X7 Casino` · *Version*: `1.0.0` · *Build*: `1` · *Minimum Deployments*: iOS 15.0
3. **General → Deployment Info**: nur **Portrait** ankreuzen (iPhone). Für den Anfang unter *Supported Destinations* iPad entfernen, dann brauchst du keine iPad-Screenshots.
4. **Info** (Info.plist) → Zeile hinzufügen: `App Uses Non-Exempt Encryption` = **NO**.
5. Oben als Ziel **Any iOS Device (arm64)** wählen.

Testen: iPhone per Kabel anschließen, als Ziel wählen, ▶ drücken.

## 4. App in App Store Connect anlegen
appstoreconnect.apple.com → **Apps** → **+** → **Neue App**
- Plattform: iOS · Name: `X7 Casino – Spielgeld` · Primäre Sprache: Deutsch
- Bundle-ID: die aus Schritt 3 · SKU: `x7casino001`

## 5. Hochladen
In Xcode: **Product → Archive**. Danach öffnet sich der *Organizer* → **Distribute App** → **App Store Connect** → **Upload**.
Nach 10–30 Minuten erscheint der Build in App Store Connect unter *TestFlight* (optional erst mit Freunden testen).

## 6. Store-Eintrag ausfüllen
Alle Texte stehen fertig in `store/APP-STORE-TEXTE.md`.
- **Screenshots:** `store/screenshots-6.9/` (1320 × 2868, für 6,9″-iPhones – reicht als Pflichtgröße). 3–10 Stück hochladen.
- **Datenschutz-URL:** Text aus `store/DATENSCHUTZ-APP.md` auf einer öffentlichen Seite veröffentlichen (z. B. auf xr7uz.xyz) und den Link eintragen.
- **App-Datenschutz:** „Daten werden nicht erfasst“ (wenn keine Live-Rangliste aktiv).
- **Altersfreigabe:** Fragebogen wie in den Store-Texten beschrieben → 18+.
- **Preis:** Kostenlos, alle Länder (oder Auswahl).
- **Build** auswählen, **Notes für das Review** einfügen.

## 7. Zur Prüfung einreichen
**Zur Prüfung hinzufügen** → **Senden**. Die Prüfung dauert meist 1–3 Tage. Bei Rückfragen antwortest du im Resolution Center.

---

## Optional: Live-Rangliste für das Online-Turnier
Ohne Server funktioniert das Online-Turnier über Codes (Einladung teilen → spielen → Ergebnis-Codes austauschen).
Für eine Rangliste, die sich live aktualisiert:
1. console.firebase.google.com → Projekt anlegen (kostenloser Spark-Tarif) → **Realtime Database** → Standort *europe-west1*.
2. Unter **Regeln** einfügen und veröffentlichen:
```json
{
  "rules": {
    "rooms": {
      "$room": {
        ".read": true,
        "players": {
          "$device": {
            ".write": true,
            ".validate": "newData.hasChildren(['name','balance','played']) && newData.child('name').isString() && newData.child('name').val().length <= 16 && newData.child('balance').isNumber()"
          }
        }
      }
    }
  }
}
```
3. Die Datenbank-URL in `src/config.ts` bei `LIVE_URL` eintragen, neu bauen (`npm run build && npx cap sync ios`).
4. Datenschutzerklärung und App-Datenschutz-Angaben entsprechend anpassen (Abschnitt „Live-Rangliste“).

> Hinweis: Diese Regeln sind bewusst einfach (Spielgeld-Ranglisten ohne Konto). Jeder mit Raum-Code kann Werte schreiben. Für ein Spaß-Turnier ist das in Ordnung; für Wettbewerbe mit Preisen nicht.

---

## Worauf Apple achtet (damit die Prüfung klappt)
- **Kein echtes Geld:** keine Käufe, keine Auszahlung, keine Preise. Erfüllt.
- **Altersfreigabe 18+** wegen simuliertem Glücksspiel. Im Fragebogen so angeben.
- **Keine Links zu echten Casinos oder Wettanbietern.** Erfüllt.
- **Eigenständige App statt Website:** Die App läuft komplett offline aus dem App-Paket. Erfüllt.
- **Spam-Regel (4.3):** Es gibt viele Casino-Apps. Party- und Online-Turnier, einstellbare Quoten und das eigene Design sind die Unterscheidungsmerkmale – betone sie in Beschreibung und Screenshots.
- **Name:** „Fake“ im Namen ist möglich, „Spielgeld“ oder „Simulator“ wirkt seriöser.

## Rechtliches (kurz, keine Rechtsberatung)
- In Deutschland ist ein Spiel ohne Geldeinsatz und ohne Gewinn mit Geldwert kein Glücksspiel im Sinne des GlüStV. Wichtig: Credits niemals verkaufen und niemals Preise ausloben – sonst ändert sich die Einordnung.
- Loot-Boxen sind hier nur Spielgeld und nicht kaufbar; die Wahrscheinlichkeiten werden angezeigt.
- Ein Impressum für die App ist über die Support-/Website-Seite abgedeckt (xr7uz.xyz).

## Später: Updates
Code ändern → `npm run build && npx cap sync ios` → in Xcode *Build*-Nummer erhöhen → Archive → Upload → in App Store Connect neue Version anlegen.
