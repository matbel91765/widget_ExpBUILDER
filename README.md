https://developers.arcgis.com/experience-builder/guide/install-guide/


Pour la recherche:

Voici le flux précis :
Quand vous tapez un terme de recherche, par exemple "test", la fonction handleSearch prend ce terme et va le comparer avec tous les champs configurés dans votre widget.
Pour chaque record, elle regarde les valeurs de tous les champs configurés dans displayFields (que vous avez définis dans la configuration du widget). Par exemple, si vos displayFields contiennent ["title", "description", "category"], il va chercher dans ces trois champs.

La comparaison se fait via calculateSimilarity qui :
    Compare d&eposabord exactement : "test" === "test" → 100%
    Regarde si c&eposest inclus : "testing" inclut "test" → 85%
    Regarde le début des mots : "testeur" commence par "test" → 70%
    Regarde la fin des mots : "attest" finit par "test" → 60%
    Regarde si c&eposest inclus n&eposimporte où : "attestation" contient "test" → 50%
    Sinon utilise la distance de Levenshtein pour les correspondances floues

# Widget Liste et Recherche

Widget Experience Builder combinant une liste interactive avec un système de recherche avancé. Il permet l&eposaffichage, le filtrage et le scoring des éléments avec une recherche en temps réel.

## Fonctionnalités Principales

### Système de Recherche
- Recherche en temps réel avec mise à jour instantanée
- Support de la syntaxe de recherche avancée `field:value`
- Algorithme de pertinence avec scoring des résultats
- Gestion des recherches floues et partielles
- Autocomplétion basée sur les données existantes

### Affichage et Interaction
- Affichage en liste ou en grille configurable
- Système de scoring avec boutons +/- par élément
- Filtrage par tags avec interface intuitive
- Pagination intégrée
- Indicateur de pertinence des résultats

### Performance
- Mise en cache des résultats de recherche
- Optimisation des requêtes à la source de données
- Gestion efficace des mises à jour en temps réel

## Configuration

### Prérequis
- Experience Builder 1.12 ou supérieur
- Source de données de type FeatureLayer
- Droits d&eposédition sur la source de données pour le scoring

### Structure des Données
La source de données doit contenir les champs suivants :

{
  title: string;          // Titre de l&eposélément
  summary?: string;       // Description (optionnel)
  category?: string;      // Catégorie (optionnel)
  tags?: string;         // Tags séparés par des virgules
  score?: number;        // Score de l&eposélément
  url?: string;          // Lien externe (optionnel)
}

### Configuration du Widget
Dans le panneau de configuration :

**Source de Données**
- Sélectionner une FeatureLayer
- Configurer les champs à afficher

**Affichage**
- Choisir le style d&eposaffichage (liste/grille)
- Activer/désactiver le système de score
- Configurer le champ de score

## Fonctionnement de la Recherche

Quand vous tapez un terme de recherche, par exemple "test", la fonction `handleSearch` compare ce terme avec tous les champs configurés dans votre widget. La comparaison se fait via `calculateSimilarity` qui :

1. Compare d&eposabord exactement : "test" === "test" → 100%
2. Regarde si c&eposest inclus : "testing" inclut "test" → 85%
3. Regarde le début des mots : "testeur" commence par "test" → 70%
4. Regarde la fin des mots : "attest" finit par "test" → 60%
5. Regarde si c&eposest inclus n&eposimporte où : "attestation" contient "test" → 50%
6. Sinon utilise la distance de Levenshtein pour les correspondances floues

### Exemples d&eposUtilisation

**Recherche Simple**

dashboard table

Recherche les éléments contenant "dashboard" ou "table"

**Recherche Avancée**

product:dashboard category:widget

Recherche les éléments de catégorie "widget" dans le produit "dashboard"

## Installation

Structure des fichiers :

enhanced-list/
├── runtime/
│   ├── components/
│   │   ├── list-item.tsx
│   │   ├── search-box.tsx
│   │   └── empty-state.tsx
│   ├── widget.tsx
├── setting/
│   ├── setting.tsx/
├── config.ts
└── style.css

## Optimisations
- Debouncing sur la recherche
- Mise en cache des résultats fréquents
- Lazy loading des images
- Virtualisation de la liste pour les grands volumes

## Limitations Connues
- La recherche fuzzy est limitée aux champs textuels
- Les mises à jour de score nécessitent des droits d&eposédition