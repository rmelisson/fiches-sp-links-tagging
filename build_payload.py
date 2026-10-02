#!/usr/bin/env python3
"""Assemble le contenu à chiffrer pour l'UI de tagging.

Sortie : un JSON {links, docs, l2}
  - links : liens suggérés (fiches_service_public_links.json)
  - docs  : annuaire des documents [{s: source, g: slug, i: id, t: titre}], pour
            résoudre une URL code.travail.gouv.fr collée dans l'UI
  - l2    : {slug L2 -> slug L1}, pour valider les URL /themes/<l1>#<l2>

Usage (depuis analysis/) :
  python tools/build_payload.py [sortie.json]
puis : PASSWORD=... node tools/encrypt.mjs data <sortie.json>
"""
import csv
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "output" / "l2"


def main() -> None:
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT / "tagging_payload.json"
    csv.field_size_limit(sys.maxsize)  # la colonne embedding est très longue

    links = json.loads((OUT / "fiches_service_public_links.json").read_text(encoding="utf-8"))
    l2 = json.loads((OUT / "l2_l1.json").read_text(encoding="utf-8"))
    with (OUT / "docs-titles.csv").open(encoding="utf-8", newline="") as f:
        docs = [
            {"s": r["source"], "g": r["slug"], "i": r["id"], "t": r["title"]}
            for r in csv.DictReader(f)
            if r["slug"] and r["id"]
        ]

    target.write_text(
        json.dumps({"links": links, "docs": docs, "l2": l2}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"{target} : {len(links)} fiches, {len(docs)} documents, {len(l2)} thèmes L2")


if __name__ == "__main__":
    main()
