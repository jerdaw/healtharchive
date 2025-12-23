> Version française (alpha). Traduction automatisée fournie à titre informatif seulement; elle peut contenir des erreurs. En cas d’incohérence, la version anglaise fait foi : /exports/healtharchive-data-dictionary.md

# Exports HealthArchive — dictionnaire de données

Ce document décrit les exports de recherche publics disponibles via `/api/exports`.
Les exports contiennent des métadonnées uniquement et n’incluent pas le HTML brut ni les corps de diff complets.

Tous les horodatages sont en UTC et utilisent le format ISO-8601.

---

## Export des captures (`/api/exports/snapshots`)

Une ligne par capture (page capturée).

Champs :

- `snapshot_id` — identifiant numérique de capture.
- `source_code` — code de source (p. ex. `hc`, `phac`).
- `source_name` — nom lisible de la source.
- `captured_url` — URL capturée au moment du crawl.
- `normalized_url_group` — clé canonique de regroupement d’une page à travers les captures.
- `capture_timestamp_utc` — horodatage de capture (UTC, ISO-8601).
- `language` — langue détectée (si disponible).
- `status_code` — statut HTTP enregistré pendant la capture (si disponible).
- `mime_type` — type de contenu enregistré pendant la capture (si disponible).
- `title` — titre de page extrait (si disponible).
- `job_id` — ID de job d’archivage (ancre d’édition, si disponible).
- `job_name` — nom de job d’archivage (étiquette d’édition, si disponible).
- `snapshot_url` — URL publique stable vers la page de détail de la capture.

Notes :

- `normalized_url_group` est l’identifiant canonique d’une page à travers plusieurs captures.
- Certains champs peuvent être nuls si une capture ne les a pas enregistrés ou si la capture n’était pas du HTML.

---

## Export des changements (`/api/exports/changes`)

Une ligne par événement de changement pré-calculé entre deux captures du même groupe de pages.

Champs :

- `change_id` — identifiant numérique d’événement de changement.
- `source_code` — code de source (p. ex. `hc`, `phac`).
- `source_name` — nom lisible de la source.
- `normalized_url_group` — clé canonique de regroupement de la page.
- `from_snapshot_id` — ID de la capture antérieure (peut être nul pour la première capture).
- `to_snapshot_id` — ID de la capture ultérieure.
- `from_capture_timestamp_utc` — horodatage de capture antérieur (UTC).
- `to_capture_timestamp_utc` — horodatage de capture ultérieur (UTC).
- `from_job_id` — ID du job/édition antérieur (si disponible).
- `to_job_id` — ID du job/édition ultérieur (si disponible).
- `change_type` — classification du changement (`new_page`, `updated`, `removed`, etc.).
- `summary` — résumé descriptif du changement (sans interprétation).
- `added_sections` — nombre de sections ajoutées (si disponible).
- `removed_sections` — nombre de sections retirées (si disponible).
- `changed_sections` — nombre de sections modifiées (si disponible).
- `added_lines` — nombre de lignes ajoutées (si disponible).
- `removed_lines` — nombre de lignes retirées (si disponible).
- `change_ratio` — score proportionnel de changement (si disponible).
- `high_noise` — vrai lorsque les changements sont probablement dominés par la mise en page / boilerplate.
- `diff_truncated` — vrai lorsque le diff stocké a été tronqué pour la lisibilité.
- `diff_version` — identifiant de version de l’algorithme de diff (si disponible).
- `normalization_version` — identifiant de version de normalisation (si disponible).
- `computed_at_utc` — moment où cet événement de changement a été calculé (UTC).
- `compare_url` — URL publique stable vers la vue de comparaison.

Notes :

- Les événements de changement tiennent compte des éditions par défaut : ils reflètent des captures archivées, pas des mises à jour en temps réel de la source.
- `compare_url` est sûr pour la citation et affiche le diff descriptif.

---

## Limites

- Les exports reflètent le contenu capturé, pas nécessairement des mises à jour en temps réel de la source.
- La couverture est limitée aux sources dans le périmètre et aux captures réussies.
- La fidélité de relecture varie selon le site et le type de ressource; les exports n’incluent pas les ressources de relecture ni le HTML brut.
