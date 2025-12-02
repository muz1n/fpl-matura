# Lineup Builder - Notwendige Fixes

## 1. Alle GRÜNEN Farben → PINK ersetzen

### In `pages/lineup-builder.tsx`:
- `emerald-600` → `pink-600`
- `emerald-700` → `pink-700`  
- `emerald-500` → `pink-500`
- `emerald-400` → `pink-400`

**Betroffene Zeilen:**
- Z.260: `focus:ring-emerald-500` → `focus:ring-pink-500`
- Z.273: `bg-emerald-600 hover:bg-emerald-700` → `bg-pink-600 hover:bg-pink-700`
- Z.306: `text-emerald-500` → `text-pink-500`
- Z.341: `bg-emerald-600` → `bg-pink-600`
- Z.353: `bg-emerald-600` → `bg-pink-600`
- Z.441: `focus:ring-emerald-500` → `focus:ring-pink-500`
- Z.452: `focus:ring-emerald-500` → `focus:ring-pink-500`
- Z.490: `text-emerald-400` → `text-pink-400`
- Z.534: `bg-emerald-600 hover:bg-emerald-700` → `bg-pink-600 hover:bg-pink-700`

## 2. Profilbilder GRÖSSER machen

### In `components/PlayerCard.tsx`:
- Aktuelle Grösse: `w-[90px] h-[115px]`
- **NEU**: `w-[110px] h-[140px]` (ca. 22% grösser)
- Foto-Avatar: von `w-10 h-10` → `w-14 h-14` (40% grösser)
- Team-Logo: von `w-5 h-5` → `w-7 h-7` (40% grösser)

## 3. Fussballplatz Hintergrund ändern

### In `components/PitchXI.tsx`:
- Grüner Platz → Dunkler Slate mit Pink-Akzenten
- **ALT**: `bg-[#2d5016]` oder ähnlich
- **NEU**: `bg-gradient-to-b from-slate-800 via-purple-900/10 to-slate-800`

## 4. Auto Pick Fix

### Problem: Auto Pick Button macht nichts
**Lösung**: Event Handler fehlt oder API-Route fehlt

## 5. Drag & Drop Fix  

### Problem: Kann Spieler nicht verschieben
**Ursache**: DnD-Kit Context fehlt oder Sensor-Config falsch

## 6. Navbar Navigation Fix

### Problem: Klick auf Prognosen funktioniert nicht ohne Refresh
**Lösung**: In `components/Navbar.tsx` - Next.js `Link` verwenden statt `<a>`

## 7. Hintergrund volle Breite

### Gleich wie bei Prognosen-Seite:
- Body-Hintergrund bereits global gesetzt (globals.css)
- Entferne lokale Background-Wrapper

## Prioritäten:
1. ✅ **Farben** (grün → pink) - KRITISCH für Theme
2. ✅ **Profilbilder grösser** - KRITISCH für UX
3. ✅ **Fussballplatz Hintergrund** - KRITISCH für Design
4. ⚠️ **Navbar Navigation** - WICHTIG
5. ⚠️ **Auto Pick** - Features
6. ⚠️ **Drag & Drop** - Features
