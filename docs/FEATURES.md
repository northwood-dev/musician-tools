# Musician Tools - Documentation des Fonctionnalités

## Vue d'ensemble

Musician Tools est une application web de gestion de répertoire musical permettant aux musiciens de cataloguer, organiser et tracker leurs chansons avec des détails techniques et des métadonnées musicales complètes.

---

## 1. Gestion des Chansons

### 1.1 Création de Chanson
- **Formulaire multi-étapes** avec validation
- **Champs obligatoires**: Titre
- **Champs optionnels**:
  - Artiste
  - Album (avec suggestions auto-complétées)
  - Notes/Commentaires
  - BPM (tempo)
  - Clé musicale (C, C#, Db, D, Eb, E, F, F#, Gb, G, Ab, A, Bb, B)
  - Mode (Major, Minor, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian, Other)
  - Signature rythmique/Time Signature (2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 9/8, 12/8, 5/8, 7/4, 3/8, Other)
  - Standard de hauteur (A440, A435, etc.)
  - Genres (35+ options: Rock, Jazz, Blues, Pop, Folk, Classical, Country, Metal, etc.)
  - Techniques musicales (avec autocomplétition selon l'instrument)
  - Liens de streaming (Spotify, YouTube, etc.)

### 1.2 Système d'Instruments
- **Sélection multiple d'instruments** par chanson
- **Types d'instruments supportés**:
  - Guitare acoustique, électrique, basse
  - Piano/Clavier
  - Batterie
  - Voix
  - Violon, Violoncelle
  - Trompette, Saxophone
  - Et 20+ autres instruments
- **Propriétés par instrument**:
  - **Difficulté** (notation en étoiles 1-5)
  - **Accordage/Tuning** (options spécifiques selon l'instrument)
  - **Techniques** (liste filtrée par instrument avec recherche si >8 items)
  - **Liens d'apprentissage** (YouTube, documentation, etc.)
  - **Dernier moment joué** (tracking automatique avec "Mark as Played Now")

### 1.3 Modification de Chanson
- Édition complète de tous les champs
- Sauvegarde automatique des changements
- Gestion de la propriété (utilisateur doit être propriétaire)

### 1.4 Suppression de Chanson
- Dialogue de confirmation avant suppression
- Suppression définitive avec propriété vérifiée

### 1.5 Affichage des Chansons
- **Tableau détaillé** avec colonnes:
  - Titre
  - Artiste
  - Album
  - BPM
  - Clé
  - Mode
  - Signature rythmique
  - Instruments
  - Genres
  - Standard de hauteur
  - Actions (Éditer, Supprimer)
- **Vue responsive** adaptée au mobile et desktop

---

## 2. Système de Filtrage Avancé

### 2.1 Sidebar des Filtres
Interface d'accordéon avec 5 sections persistantes:

#### Filtres disponibles:
1. **Clé musicale** (Key)
   - Multi-sélection avec cases à cocher
   - 14 options: C, C#, Db, D, Eb, E, F, F#, Gb, G, Ab, A, Bb, B

2. **Mode**
   - Multi-sélection avec cases à cocher
   - 9 options: Major, Minor, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian, Other

3. **Time Signature**
   - Dropdown de sélection unique
   - 12 options: 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 9/8, 12/8, 5/8, 7/4, 3/8, Other

4. **BPM**
   - Filtrage par plage Min/Max
   - Champs numériques avec suggestions (ex: 90-140)
   - Filtering en temps réel

5. **Standard de Hauteur**
   - Multi-sélection avec cases à cocher
   - Options: A440, A435, A442, A455, Other

### 2.2 Recherche Textuelle
- **Recherche globale** sur titre, artiste, album
- **Cas insensible**
- **Recherche en temps réel** au fur et à mesure de la saisie

### 2.3 Persistance des Filtres
- **LocalStorage**: Tous les filtres et accordéons sauvegardés localement
- **Restauration automatique** au rechargement de la page
- **Bouton "Clear All Filters"** pour réinitialiser

### 2.4 Logique de Filtrage
- Filtres appliqués en **ET logique** (tous les filtres actifs s'appliquent)
- Filtre BPM : `bpm >= min AND bpm <= max`
- Filtre clé : `key IN selectedKeys`
- Filtre mode : `mode IN selectedModes`
- Filtre time signature : `timeSignature === selectedTimeSignature`
- Filtre standard : `pitchStandard IN selectedStandards`
- Recherche : match sur titre, artiste, ou album

---

## 3. Authentification et Sécurité

### 3.1 Sessions Utilisateur
- **Session-based authentication** via Express sessions
- **Vérification du propriétaire** pour toutes les opérations CRUD
- Les utilisateurs ne voient que leurs propres chansons

### 3.2 Middleware de Sécurité
- **Authorization middleware** pour protéger les routes
- **Vérification de l'authentification** sur chaque requête
- **Masquage automatique** des secrets sensibles dans les logs

---

## 4. Architecture Technique

### 4.1 Frontend
- **Framework**: React 18+ avec TypeScript
- **Build**: Vite (builds optimisés ~688-706ms)
- **Styling**: Tailwind CSS avec support dark mode
- **State Management**: React Hooks (50+ useState hooks dans Songs.tsx)
- **Persistance**: LocalStorage pour les préférences UI et filtres
- **Composants principaux**:
  - `Songs.tsx` - Orchestrateur principal (1355+ lignes)
  - `SongForm.tsx` - Formulaire de création/édition (615 lignes)
  - `SongFormInstruments.tsx` - Gestion des instruments (336 lignes)
  - `SongsSidebar.tsx` - Interface des filtres (595 lignes)
  - `SongsList.tsx` - Tableau et layout (374 lignes)

### 4.2 Backend
- **Framework**: Express.js
- **Base de données**: Supabase avec Sequelize ORM
- **Architecture**: RESTful API
- **Contrôleurs**:
  - `songcontroller.js` - Opérations CRUD sur chansons
  - `usercontroller.js` - Gestion utilisateurs
  - Et autres selon les besoins

### 4.3 Migrations de Base de Données
- **Sequelize migrations** pour versionning du schéma
- Dernière migration: Ajout de `timeSignature` et `mode` (2026-01-13)
- Toutes les migrations automatiquement exécutées au démarrage

### 4.4 Modèles de Données

#### Song (Chanson)
```
- uid (UUID, primary key)
- userUid (FK vers User)
- title (string, required)
- artist (string, optional)
- album (string, optional)
- bpm (integer, optional)
- key (string, optional) - ex: "C", "G#"
- mode (string, optional) - ex: "Major", "Minor"
- timeSignature (string, optional) - ex: "4/4", "3/4"
- pitchStandard (string, optional) - ex: "A440"
- notes (text, optional)
- genre (JSON array, optional) - multi-sélection
- technique (JSON array, optional) - multi-sélection
- instrument (JSON array, optional) - multi-sélection
- instrumentDifficulty (JSON object, optional) - {guitarAcoustic: 3, piano: 2}
- instrumentTuning (JSON object, optional) - {guitarAcoustic: "Standard"}
- instrumentLinks (JSON object, optional) - {guitarAcoustic: [{url, label}]}
- myInstrumentUid (FK vers Instrument personnel)
- lastPlayed (timestamp, optional)
- streamingLinks (JSON array, optional) - [{label, url}]
- createdAt (timestamp, auto)
- updatedAt (timestamp, auto)
```

---

## 5. Expérience Utilisateur

### 5.1 Dark Mode
- **Support complet** du dark mode avec Tailwind CSS
- Basculement automatique selon les préférences système
- Classes `dark:` appliquées à tous les composants
- Persistance de la préférence utilisateur

### 5.2 Navigation
- **En-tête** avec logo et liens de navigation
- **Lien "Songs"** retour à la liste (avec state pour reset du formulaire)
- **Navigation cohérente** entre pages

### 5.3 Dialogues et Confirmations
- **ConfirmDialog** stylisé avec support du dark mode
- Confirmation avant suppression de chanson
- Messages de confirmation explicites

### 5.4 Feedback Utilisateur
- **États de chargement** (boutons disabled pendant les opérations)
- **Messages de succès/erreur** (implémentation existante)
- **Accordéons interactifs** pour explorer les options

### 5.5 Accessibilité
- **Labels HTML** pour tous les inputs
- **ARIA attributes** (aria-expanded, aria-label)
- **Navigation au clavier** supportée

---

## 6. Fonctionnalités Avancées

### 6.1 Auto-complétions
- **Albums**: Suggestions basées sur la saisie
  - Masquage automatique quand une seule suggestion exacte existe
- **Artistes**: Suggestions basées sur l'historique
- **Techniques**: Autocomplétition par instrument

### 6.2 Recherche de Techniques
- **Affichage conditionnelle**: Champ de recherche visible si >8 techniques
- **Filtrage en temps réel** par instrument
- **Recherche case-insensitive**

### 6.3 Tracking de Lectures
- **"Mark as Played Now"** par instrument
- **Dernier moment joué** sauvegardé et affiché
- **Historique** des lectures (SongPlay records)

### 6.4 Gestion des Liens
- **Liens de streaming** (Spotify, YouTube, Deezer, etc.)
- **Liens spécifiques par instrument** (tutoriels, documentation)
- **Édition/Suppression** des liens

---

## 7. Formats et Standards Supportés

### 7.1 Notes Musicales
12 notes chromatiques: C, C#/Db, D, D#/Eb, E, F, F#/Gb, G, G#/Ab, A, A#/Bb, B

### 7.2 Modes Musicaux
- 7 modes classiques: Major, Minor, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian
- Option "Other" pour les modes exotiques/custom

### 7.3 Time Signatures
12 signatures courantes + "Other":
- Binaires: 2/4, 3/4, 4/4, 5/4, 7/4
- Ternaires: 6/8, 7/8, 9/8, 12/8, 5/8, 3/8

### 7.4 Genres Musicaux
35+ genres: Rock, Jazz, Blues, Pop, Folk, Classical, Country, Metal, Hip-Hop, EDM, Latin, Reggae, Funk, etc.

### 7.5 Standards de Hauteur
- A440 (standard moderne)
- A435 (baroque)
- A442 (français)
- A455 (historique)
- Other (custom)

---

## 8. Performance et Optimisation

### 8.1 Build
- **Vite**: Build optimisé en ~688-706ms
- **Tree-shaking**: Élimination du code mort
- **Code splitting**: Chargement asynchrone des modules

### 8.2 State Management
- **Hooks optimisés**: React.useMemo pour les calculs coûteux
- **Filtrage côté client**: Pas de requête serveur à chaque filtre
- **Lazy loading**: Chargement à la demande des données

### 8.3 LocalStorage
- **Persistance intelligente**: Sauvegarde des préférences
- **Pas de re-renders inutiles**: Initialisation basée sur localStorage

---

## 9. Gestion des Erreurs

### 9.1 Backend
- **Erreurs HTTP standardisées**:
  - 400: Mauvaise requête
  - 401: Non authentifié
  - 403: Non autorisé
  - 404: Ressource non trouvée
  - 500: Erreur serveur

### 9.2 Logging
- **Logger centralisé** avec timestamps
- **Masquage des secrets** via middleware hideSecrets
- **Traçabilité** des erreurs critiques

### 9.3 Validation
- **Validation côté client**: Champs obligatoires, formats
- **Validation côté serveur**: Double-check pour la sécurité

---

## 10. Cas d'Usage Principaux

### 10.1 Musicien Guitarist
1. Créer une nouvelle chanson
2. Ajouter guitare acoustique et électrique avec difficulté
3. Ajouter accords ou techniques (fingerstyle, barre chords)
4. Tagger avec clé et mode pour l'analyse harmonique
5. Filtrer par BPM et clé pour les sessions de pratique

### 10.2 Compositeur
1. Cataloguer compositions avec métadonnées complètes
2. Tracker les différents arrangements par instrument
3. Lier à des enregistrements streaming
4. Filtrer par genre et mode pour l'inspiration

### 10.3 Enseignant Musical
1. Gérer répertoire pédagogique
2. Tracker la difficulté par instrument
3. Linker vers ressources d'enseignement
4. Organiser par clé pour les leçons progressives

---

## 11. Roadmap Future (Suggestions)

- [ ] Partage de répertoire entre musiciens
- [ ] Génération de listes de lecture automatiques
- [ ] Intégration Spotify/Apple Music API
- [ ] Export PDF du répertoire
- [ ] Système de notation (5 étoiles)
- [ ] Collaborations en temps réel
- [ ] Backup cloud automatique
- [ ] Analyse statistique du répertoire
- [ ] OCR pour importer des partitions
- [ ] Mobile app native

---

## 12. Support et Maintenance

### 12.1 Dépendances Principales
- React 18+
- TypeScript
- Tailwind CSS
- Vite
- Express.js
- Sequelize
- Supabase

### 12.2 Configuration
- `vite.config.ts` - Configuration du build
- `tailwind.config.ts` - Thème et customisations
- `tsconfig.json` - Options TypeScript
- `.env` - Variables d'environnement (Supabase URL, etc.)

### 12.3 Scripts Disponibles
- `npm run dev` - Démarrage en développement
- `npm run build` - Build production
- `npm run preview` - Prévisualisation du build
- Backend: `npm start` ou `node server.js`

---

**Document généré**: 2026-01-13
**Dernière mise à jour**: Après l'ajout de timeSignature et mode
