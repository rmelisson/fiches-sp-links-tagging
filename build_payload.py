#!/usr/bin/env python3
"""Reconstruit le contenu à chiffrer pour l'UI de tagging depuis des liens existants.

`uv run l2-recommend-links` écrit déjà `tagging_payload.json` à côté des liens ;
ce script ne sert qu'à le refaire depuis un fichier de liens déjà généré.

Usage (depuis analysis/) :
  uv run python tools/build_payload.py [liens.json [sortie.json]]
puis : PASSWORD=... node tools/encrypt.mjs data <sortie.json>
"""
import sys
from pathlib import Path

from analysis.l2.tagging_payload import main

OUT = Path(__file__).resolve().parent.parent / "output" / "l2"

if __name__ == "__main__":
    links = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT / "fiches_service_public_links.json"
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else links.parent / "tagging_payload.json"
    main([str(links), str(OUT / "l2_l1.json"), str(OUT / "docs_openapi.csv"), str(target)])
