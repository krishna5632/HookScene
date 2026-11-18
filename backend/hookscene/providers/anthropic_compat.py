"""Anthropic (Claude) via its OpenAI-compatible endpoint: https://api.anthropic.com/v1/.

Anthropic's compatibility layer is a normal provider entry in config.yaml (base_url + api_key_env), handled by the
generic client in providers/base.py. This module only documents and validates the quirks that config.yaml must set
so the generic client behaves correctly, and offers a small helper to build a ready-made provider block:

* `json_mode: false`   Anthropic's compat layer returns 400 on response_format: json_object; the JSON instruction
                        must live in the prompt instead (prompts/*.md already ask for JSON-only output).
* `max_tokens: <n>`     the compat layer requires max_tokens on every request; base.py also recovers automatically
                        if a model/endpoint rejects a request for lacking it.
* `extra_headers`       only needed for a personal/service-account key that isn't scoped to a workspace
                        (anthropic-workspace-id); leave unset for a normal API key.
* `reasoning_effort`    not supported by the compat layer; base.py drops it and retries once if rejected, so it is
                        simply never set for the anthropic stage entries.
"""
from __future__ import annotations

DEFAULT_BASE_URL = "https://api.anthropic.com/v1/"
DEFAULT_MAX_TOKENS = 8192


def provider_block(api_key_env: str = "ANTHROPIC_API_KEY", workspace_id: str | None = None,
                    max_tokens: int = DEFAULT_MAX_TOKENS, **overrides) -> dict:
    """A ready-to-merge config.yaml `providers.anthropic` entry."""
    block = {
        "base_url": DEFAULT_BASE_URL,
        "api_key_env": api_key_env,
        "json_mode": False,
        "max_tokens": max_tokens,
        "min_interval_s": 0.2,
        "concurrency": 4,
        "timeout": 300,
        "retries": 3,
    }
    if workspace_id:
        block["extra_headers"] = {"anthropic-workspace-id": workspace_id}
    block.update(overrides)
    return block
