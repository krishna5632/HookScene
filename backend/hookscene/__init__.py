"""HookScene: automatic promo intelligence and discovery for microdrama screenplays.

Package layout:
  hookscene.core       parsing, schemas, heuristics, attention, subtitles, validation, stages, pipeline
  hookscene.providers  the model client (LLM) and provider-specific glue (base.py, anthropic_compat.py)
  hookscene.export     writers for promos.md / .csv / .json and the website payload
  hookscene.eval       evaluations, telemetry, failure tracking, and consistency
"""


