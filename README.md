# Tagging des liens fiches service public

Page statique (GitHub Pages) pour évaluer 👍/👎 les liens suggérés pour les fiches service public, et en ajouter à la main. Les évaluations sont enregistrées dans `votes/link_tags.csv` du dépôt de publication, signées du nom du relecteur.

Un seul mot de passe partagé déchiffre à la fois les liens (`links.enc.js`) et le jeton GitHub (`gh_config.js`). Les deux fichiers chiffrés peuvent être publiés.

## Fichiers

| Fichier | Rôle | Publié ? |
|---|---|---|
| `index.html` | l'UI | oui |
| `links.enc.js` | liens + annuaire des documents, chiffrés | oui |
| `gh_config.js` | dépôt cible + jeton GitHub chiffré | oui |
| `build_payload.py` | assemble les données à chiffrer | non |
| `encrypt.mjs` | chiffre les données et le jeton | non |

Ne jamais publier `output/l2/tagging_payload.json` ni `fiches_service_public_links.json` (données en clair).

## Mettre à jour les liens

Depuis `analysis/`, après avoir régénéré `output/l2/fiches_service_public_links.json` :

```bash
python3 tools/build_payload.py
PASSWORD='<mot de passe>' node tools/encrypt.mjs data output/l2/tagging_payload.json
```

Puis republier `links.enc.js`. Les évaluations existantes restent valables tant que les `candidate_id` ne changent pas.

L'annuaire utilisé pour résoudre les URL collées vient de `output/l2/docs-titles.csv` : un document publié après la génération de ce fichier sera refusé tant que le payload n'est pas reconstruit.

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

## Format de `votes/link_tags.csv`

```
source_doc_id,candidate_id,candidate_type,candidate_label,vote,tagged_at,tagged_by,manual
```

- `vote` : `good`, `bad`, ou vide (évaluation annulée, conservée pour se propager aux autres relecteurs).
- `manual` : `1` pour un lien ajouté à la main.
- Une ligne par lien (`source_doc_id`, `candidate_type`, `candidate_id`) ; en cas d'écritures concurrentes, la plus récente (`tagged_at`) l'emporte. L'historique complet est dans git.
