"""Core pipeline: parsing, schemas, heuristics, attention, subtitles, validation, stages and the pipeline runner.

Nothing here talks to a network. Model calls are made through hookscene.providers; this package only ever receives
already-validated Pydantic objects back.
"""
