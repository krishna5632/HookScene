"""SnipDeck: automatic promo selection for microdrama screenplays.

Package layout:
  snipdeck.core       parsing, schemas, heuristics, attention, subtitles, validation, stages, pipeline
  snipdeck.providers  the model client (LLM) and provider-specific glue (base.py, anthropic_compat.py)
  snipdeck.export     writers for promos.md / .csv / .json and the website payload
"""

