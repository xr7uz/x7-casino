# X7 Casino ohne Mac hochladen – nur mit dem iPhone

Den Teil mit Xcode übernimmt **Codemagic**, ein Cloud-Dienst mit Mac-Computern.
Du steuerst alles im Browser bzw. in Apps auf dem iPhone. Die Datei `codemagic.yaml` im Projekt ist bereits fertig.

**Tipp für Safari:** Bei Apple-Developer-, App-Store-Connect- und Codemagic-Seiten oben links auf **„aA“ → „Desktop-Website anfordern“** tippen. Dann sind alle Knöpfe da.

| Was | Kosten |
|---|---|
| Apple Developer Program | 99 USD / Jahr (Pflicht, auch für Gratis-Apps) |
| GitHub-Konto | kostenlos |
| Codemagic | Gratis-Kontingent an Build-Minuten pro Monat (ein Build dauert ca. 10–20 Min.; aktuelle Grenzen auf codemagic.io/pricing prüfen) |

---

## Schritt 1 – Apple Developer Program (einmalig)
1. App **„Apple Developer“** aus dem App Store laden.
2. **Konto → Jetzt registrieren** (Enroll) mit deiner Apple-ID, als Einzelperson. Bezahlen geht direkt in der App.
3. Warten, bis die Bestätigungs-Mail kommt (meist 1–2 Tage).

## Schritt 2 – Projekt auf GitHub
1. In der **GitHub-App** oder auf github.com ein **neues privates Repository** anlegen, z. B. `x7-casino` (leer, ohne README).
2. Projekt hochladen:
   - **Einfachster Weg:** Sag mir den Namen des Repos – ich lade das Projekt für dich hoch.
   - Selbst: ZIP in der Dateien-App entpacken und auf github.com im Repo **„Add file → Upload files“** nutzen (alle Ordner einzeln, inkl. `codemagic.yaml`).

## Schritt 3 – App-Kennung bei Apple registrieren
developer.apple.com/account → **Certificates, Identifiers & Profiles** → **Identifiers** → **+**
- **App IDs → App** → Beschreibung `X7 Casino` → Bundle ID **Explicit**: `xyz.xr7uz.casino` → **Register**.
  (Falls schon vergeben: z. B. `xyz.xr7uz.x7casino` nehmen und in `codemagic.yaml` und `capacitor.config.ts` ebenfalls ändern.)

## Schritt 4 – App in App Store Connect anlegen
appstoreconnect.apple.com → **Apps → + → Neue App**
- Plattform iOS · Name `X7 Casino – Spielgeld` · Sprache Deutsch · Bundle-ID aus Schritt 3 · SKU `x7casino001`
- Danach unter **App-Informationen** die **Apple-ID** (eine lange Zahl) kopieren und in `codemagic.yaml` bei `APP_STORE_APPLE_ID` eintragen (auf GitHub die Datei öffnen → Stift-Symbol → speichern).

## Schritt 5 – API-Schlüssel für Codemagic
App Store Connect → **Benutzer und Zugriff → Integrationen → App Store Connect API** → Team-Schlüssel **+**
- Name `Codemagic`, Zugriff **App Manager** → **Generieren**.
- **Issuer ID** und **Key ID** notieren, **API-Schlüssel laden** (die `.p8`-Datei landet in der Dateien-App – geht nur **einmal**).

## Schritt 6 – Codemagic einrichten
codemagic.io → **mit GitHub anmelden** → **Add application** → Repo `x7-casino` wählen → Projekttyp **Other / codemagic.yaml**.

**a) API-Schlüssel verbinden:** Team settings → **Team integrations → Developer Portal → Connect / Manage keys**
- Name exakt: **`X7 ASC`** · Issuer ID · Key ID · `.p8`-Datei aus der Dateien-App hochladen.

**b) Zertifikat erzeugen:** Team settings → **codemagic.yaml settings → Code signing identities → iOS certificates**
- **Generate certificate** → Typ **Apple Distribution** → API-Key `X7 ASC` → erstellen.
- Zertifikat und Passwort **sofort speichern** (nur einmal abrufbar).

**c) Bereitstellungsprofil erstellen (bei Apple):** developer.apple.com → **Profiles → +**
- **App Store Connect** (Distribution) → App ID `xyz.xr7uz.casino` → das Zertifikat aus 6b wählen → Name `X7 Casino App Store` → **Generate**.

**d) Profil in Codemagic holen:** zurück zu **Code signing identities → iOS provisioning profiles → Fetch profiles** → `X7 Casino App Store` auswählen → speichern.

## Schritt 7 – Bauen
In Codemagic beim Projekt **Start new build** → Workflow **X7 Casino → TestFlight** → Start.
Nach ca. 10–20 Minuten ist die App automatisch in **TestFlight**. Mit der **TestFlight-App** kannst du sie direkt auf deinem iPhone installieren und testen.

Wenn ein Build fehlschlägt: In Codemagic den roten Schritt öffnen, das Log kopieren und mir schicken.

## Schritt 8 – Store-Eintrag & Einreichen (App Store Connect im Browser)
1. Screenshots aus `store/screenshots-6.9/` in die **Fotos** oder **Dateien** speichern und bei **iPhone 6,9″** hochladen.
2. Texte aus `store/APP-STORE-TEXTE.md` einfügen: Untertitel, Beschreibung, Keywords, Support-URL, Werbetext.
3. **Datenschutz-URL** eintragen (öffentliche Seite mit dem Text aus `store/DATENSCHUTZ-APP.md`).
4. **App-Datenschutz:** „Daten werden nicht erfasst“.
5. **Altersfreigabe:** Simuliertes Glücksspiel „häufig/intensiv“, sonst überall „Keine“ → 18+.
6. **Preise:** Kostenlos.
7. Unter der Version **Build** auswählen (der aus TestFlight), Review-Notiz einfügen.
8. **Zur Prüfung hinzufügen → Senden.** Prüfung meist 1–3 Tage.

## Updates später
Änderung am Code (bzw. mich darum bitten) → auf GitHub landet die neue Version → in Codemagic **Start new build** → neue Version in App Store Connect anlegen → Build auswählen → einreichen.
