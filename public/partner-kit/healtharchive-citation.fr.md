> Version française (alpha). Traduction automatisée fournie à titre informatif seulement; elle peut contenir des erreurs. En cas d’incohérence, la version anglaise fait foi : /partner-kit/healtharchive-citation.md

# HealthArchive.ca — Fiche de citation

Objectif : fournir une façon cohérente, prête à citer, de référencer des captures HealthArchive et des vues de comparaison.

Ces citations se rapportent à du contenu archivé, pas à des directives actuelles ni à un avis médical.

---

## 1) Citer une capture

Format recommandé (en anglais) :

HealthArchive.ca Project. "<Page title>" (snapshot from <capture date/time>). Archived copy of <source organization> web page (<original URL>). Accessed <access date>. Available from: <HealthArchive snapshot URL>.

Exemple :

HealthArchive.ca Project. "COVID-19 epidemiology update: Canada" (snapshot from 2025-02-15 00:00 UTC). Archived copy of Public Health Agency of Canada web page (https://www.canada.ca/...). Accessed 2025-12-03. Available from: https://www.healtharchive.ca/snapshot/12345.

Notes :

- Utilisez l’URL exacte de la capture consultée.
- Utilisez l’horodatage de capture affiché sur la page de capture (UTC).
- Citez toujours aussi l’URL d’origine.

---

## 2) Citer une vue de comparaison

Les vues de comparaison mettent en évidence des différences de texte descriptives entre deux captures archivées de la même page.

Format recommandé (en anglais) :

HealthArchive.ca Project. "Comparison of archived captures" (from snapshot <ID A> to snapshot <ID B>). Archived copies of <source organization> web page (<original URL>). Accessed <access date>. Available from: https://www.healtharchive.ca/compare?from=<ID A>&to=<ID B>.

Notes :

- Le résultat de comparaison est descriptif seulement et n’interprète pas la signification.
- Notez toujours les deux ID de capture et les horodatages de capture affichés sur la page de comparaison.

---

## 3) Où trouver les champs de citation

Sur `/snapshot/<id>`, vous pouvez trouver :

- Titre de la page
- Date/heure de capture (UTC)
- Organisation source
- URL d’origine
- URL de la capture (la page que vous consultez)

Sur `/compare?from=<id>&to=<id>`, vous pouvez trouver :

- Les deux ID de capture
- Les deux dates/heures de capture (UTC)
- L’URL d’origine
- Un résumé descriptif des changements
