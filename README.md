# Tagging des liens fiches service public et des thèmes de questions

Page statique (GitHub Pages) à deux onglets : évaluer 👍/👎 les liens suggérés pour les fiches service public (et en ajouter à la main), et valider/corriger le thème L2 proposé pour des questions libres. Les évaluations sont enregistrées dans `votes/link_tags.csv` et `votes/question_themes.csv` du dépôt de publication, signées du nom du relecteur.

Un seul mot de passe partagé déchiffre à la fois les liens (`links.enc.js`) et le jeton GitHub (`gh_config.js`). Les deux fichiers chiffrés peuvent être publiés.

## Fichiers

| Fichier | Rôle | Publié ? |
|---|---|---|
| `index.html` | l'UI | oui |
| `links.enc.js` | liens + annuaire des documents, chiffrés | oui |
| `questions.enc.js` | questions + thèmes proposés, chiffrés (onglet Questions) | oui |
| `gh_config.js` | dépôt cible + jeton GitHub chiffré | oui |
| `build_payload.py` | refait `tagging_payload.json` depuis des liens existants (la logique est dans `analysis.l2.tagging_payload`) | non |
| `encrypt.mjs` | chiffre les données et le jeton | non |

Ne jamais publier `tagging_payload.json`, `fiches_service_public_links.json` ni `questions_payload.json` (données en clair).

## Mettre à jour les liens

`uv run l2-recommend-links …` (depuis `analysis/`) écrit `tagging_payload.json` dans le dossier de sortie, à côté de `fiches_service_public_links.json` (désactivable avec `--no-tagging-payload`). Il ne reste qu'à le chiffrer :

```bash
PASSWORD='<mot de passe>' node tools/encrypt.mjs data output/l2/<dossier de sortie>/tagging_payload.json
```

Puis republier `links.enc.js`. Les évaluations existantes restent valables tant que les `candidate_id` ne changent pas.

Pour refaire le payload depuis un fichier de liens déjà généré : `uv run python tools/build_payload.py [liens.json [sortie.json]]`.

L'annuaire utilisé pour résoudre les URL collées vient du `docs.csv` passé à `l2-recommend-links` (même ids que les liens) : un document publié après la génération de ce fichier sera refusé tant que le payload n'est pas reconstruit.

## Mettre à jour les questions

Depuis `analysis/` : `l2-theme-questions` associe chaque question à ses 3 meilleurs thèmes L2 et écrit `questions_payload.json` avec un échantillon aléatoire (graine fixe ; `0` = toutes) :

```bash
uv run l2-theme-questions output/l2/docs_openapi.csv output/l2/facets.csv output/l2/l2_l1.json \
    output/l2/questions.parquet --top-k 3 --payload-sample 2000 --out output/l2/themed_questions
PASSWORD='<mot de passe>' node tools/encrypt.mjs questions output/l2/themed_questions/questions_payload.json
```

Puis republier `questions.enc.js`. Les corrections restent valables tant que les ids de questions ne changent pas (`questions.parquet` doit venir de la même source anonymisée).

## Configurer le jeton GitHub

1. Créer un jeton fine-grained limité au dépôt de publication : *Contents* en lecture/écriture, expiration courte (90 jours).
2. Chiffrer le jeton avec **le même mot de passe** que pour les liens :

```bash
GH_TOKEN=github_pat_... PASSWORD='<mot de passe>' \
  node tools/encrypt.mjs token <owner>/<depot> main votes
```

Puis republier `gh_config.js`. Le dépôt, la branche et le dossier sont en clair dans ce fichier ; seul le jeton est chiffré.

Changer le mot de passe : relancer les deux commandes `encrypt.mjs` (`data` et `token`) avec le nouveau, puis republier les deux fichiers. Utiliser une longue phrase de passe (5 mots aléatoires ou plus) : les fichiers chiffrés étant publics, elle est attaquable hors ligne.

## Publier

Copier `index.html`, `links.enc.js` et `gh_config.js` à la racine du dépôt de publication, avec GitHub Pages activé sur `main`. La branche `main` doit déjà exister (le premier commit de ces fichiers suffit).

## Utiliser l'UI

1. Saisir son nom et le mot de passe, puis **Se connecter / Enregistrer**. Les liens s'affichent et les évaluations existantes sont reprises.
2. 👍 / 👎 sur chaque lien (recliquer annule). Les modifications sont enregistrées automatiquement environ 20 s après la dernière, ou immédiatement via le bouton.
3. Ajouter un lien : coller une URL `code.travail.gouv.fr` sous la fiche.
   - Document : `https://code.travail.gouv.fr/contribution/<slug>` (aussi `fiche-service-public`, `fiche-ministere-travail`, `modeles-de-courriers`, `outils`, `infographie`).
   - Thème L2 : `https://code.travail.gouv.fr/themes/<l1>#<l2>`, par exemple `…/themes/temps-de-travail#amenagement-du-temps-de-travail`.
4. Le champ de recherche filtre par titre, slug ou id.

### Onglet Questions

- Chaque question affiche son thème effectif (« L1 › L2 ») : la correction s'il y en a une, sinon la meilleure proposition du modèle. Les chiffres sont les similarités cosinus.
- Un clic sur l'une des 3 propositions fixe le thème (cliquer sur la meilleure = la **valider**, une autre = la **corriger**). « Aucun thème » marque une question hors périmètre ou trop vague. Le champ « Autre thème » cherche parmi tous les L2 (ou L1) ; « Revenir à la proposition » annule.
- Recherche : tous les mots saisis doivent figurer dans la question (sans accents ni casse) ou dans l'id. Filtres L1 puis L2 sur le thème effectif, avec les comptes ; tri « moins sûres d'abord » ; « Peu sûres » = meilleur score dans le premier quartile.
- La carte modifiée reste affichée même si elle sort du filtre courant.

## Format de `votes/link_tags.csv`

```
source_doc_id,candidate_id,candidate_type,candidate_label,vote,tagged_at,tagged_by,manual
```

- `vote` : `good`, `bad`, ou vide (évaluation annulée, conservée pour se propager aux autres relecteurs).
- `manual` : `1` pour un lien ajouté à la main.
- Une ligne par lien (`source_doc_id`, `candidate_type`, `candidate_id`) ; en cas d'écritures concurrentes, la plus récente (`tagged_at`) l'emporte. L'historique complet est dans git.

## Format de `votes/question_themes.csv`

```
question_id,l2,l1,model_l2,tagged_at,tagged_by
```

- `l2` : thème choisi, `__none__` pour « Aucun thème », ou vide (retour à la proposition, conservé pour se propager).
- `model_l2` : meilleure proposition du modèle au moment du choix (`l2 == model_l2` : validation).
- Une ligne par question ; la plus récente (`tagged_at`) l'emporte.
