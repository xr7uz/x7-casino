# X7 Casino

Casino-Simulator mit Spielgeld für iOS – React 19 + Vite + TypeScript + Capacitor.

```bash
npm install
npm run dev     # im Browser testen
npm run ios     # bauen, mit iOS synchronisieren, Xcode öffnen
```

- 16 Spiele: `src/games/` · Spielliste: `src/games/registry.ts`
- Zustand (Guthaben, Party, Online-Turnier): `src/store.tsx`
- Online-Codes und optionale Live-Rangliste: `src/lib/online.ts`, `src/config.ts`
- Designs/Themes: `src/styles/app.css`, Spiele-Styles: `src/styles/games.css`
- Smooth Scrolling (Lenis, auch Touch): `src/lib/smooth.ts`
- Store-Material: `store/` · Anleitung mit Mac: `ANLEITUNG-APP-STORE.md` · ohne Mac (nur iPhone + Cloud-Build): `ANLEITUNG-OHNE-MAC.md`, Konfiguration `codemagic.yaml`
