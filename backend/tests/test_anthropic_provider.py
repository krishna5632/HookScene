"""Anthropic-specific provider behaviour that needs no network: config block, json_mode/max_tokens wiring, and
automatic recovery when the OpenAI-compatible endpoint rejects response_format or requires max_tokens."""
from hookscene.providers import LLM, anthropic_provider_block, load_config


class _Msg:
    def __init__(self, t): self.content = t


class _Resp:
    def __init__(self, t):
        self.choices = [type("C", (), {"message": _Msg(t)})()]
        self.usage = type("U", (), {"prompt_tokens": 3, "completion_tokens": 2})()


class RecordingClient:
    """Captures every kwargs dict sent to chat.completions.create; can reject a field once with HTTP 400."""

    def __init__(self, reject_field=None):
        self.requests: list[dict] = []
        self.reject_field = reject_field
        self._rejected_once = False
        outer = self

        class _C:
            def create(self, **kw):
                outer.requests.append(dict(kw))
                if outer.reject_field and outer.reject_field in kw and not outer._rejected_once:
                    outer._rejected_once = True
                    e = RuntimeError(f"Invalid request: {outer.reject_field} is not supported")
                    e.status_code = 400
                    raise e
                return _Resp('{"ok": true}')
        self.chat = type("Chat", (), {"completions": _C()})()


ANTHROPIC_CFG = {
    "providers": {"anthropic": anthropic_provider_block(api_key_env="NOPE", max_tokens=4096)},
    "stages": {"summary": {"provider": "anthropic", "model": "claude-sonnet-4-5", "fallback_models": [],
                           "temperature": 0.0}},
}

MSGS = [{"role": "user", "content": "hi"}]


def make(tmp_path, client, cfg=ANTHROPIC_CFG, **kw):
    llm = LLM(cfg, cache_dir=tmp_path, **kw)
    llm._clients["anthropic"] = client
    return llm


def test_anthropic_provider_block_disables_json_mode_and_sets_max_tokens():
    block = anthropic_provider_block(api_key_env="ANTHROPIC_API_KEY", max_tokens=2048)
    assert block["json_mode"] is False
    assert block["max_tokens"] == 2048
    assert block["base_url"] == "https://api.anthropic.com/v1/"
    assert "extra_headers" not in block  # only set when a workspace_id is given


def test_anthropic_provider_block_can_add_a_workspace_header():
    block = anthropic_provider_block(workspace_id="ws_123")
    assert block["extra_headers"] == {"anthropic-workspace-id": "ws_123"}


def test_request_to_anthropic_has_no_response_format_but_has_max_tokens(tmp_path):
    c = RecordingClient()
    make(tmp_path, c)._raw("summary", MSGS, 0.0)
    assert len(c.requests) == 1
    kw = c.requests[0]
    assert "response_format" not in kw        # json_mode: false in the provider block
    assert kw["max_tokens"] == 4096            # from the provider block
    assert kw.get("reasoning_effort") is None  # never set for anthropic stage entries


def test_rejected_max_tokens_is_retried_with_a_fallback_value(tmp_path):
    cfg = {
        "providers": {"anthropic": {**anthropic_provider_block(api_key_env="NOPE"), "max_tokens": None}},
        "stages": {"summary": {"provider": "anthropic", "model": "claude-sonnet-4-5", "fallback_models": [],
                               "temperature": 0.0}},
    }
    cfg["providers"]["anthropic"].pop("max_tokens")
    c = RecordingClient(reject_field="dummy")
    # simulate a 400 that mentions max_tokens even though it wasn't sent, forcing the generic recovery path
    c.reject_field = None

    class MaxTokensClient(RecordingClient):
        def __init__(self):
            super().__init__()
            outer = self

            class _C:
                def create(self, **kw):
                    outer.requests.append(dict(kw))
                    if "max_tokens" not in kw:
                        e = RuntimeError("max_tokens is required"); e.status_code = 400
                        raise e
                    return _Resp('{"ok": true}')
            self.chat = type("Chat", (), {"completions": _C()})()

    mc = MaxTokensClient()
    llm = make(tmp_path, mc, cfg=cfg)
    llm._raw("summary", MSGS, 0.0)
    assert len(mc.requests) == 2
    assert "max_tokens" not in mc.requests[0]
    assert mc.requests[1]["max_tokens"] == 8192  # the generic fallback default


def test_rejected_response_format_is_dropped_and_retried(tmp_path):
    cfg = {
        "providers": {"anthropic": anthropic_provider_block(api_key_env="NOPE", max_tokens=4096)},
        "stages": {"summary": {"provider": "anthropic", "model": "claude-sonnet-4-5", "fallback_models": [],
                               "temperature": 0.0}},
    }
    # force json_mode on to exercise the recovery path even though Anthropic normally sets it False in config
    cfg["providers"]["anthropic"]["json_mode"] = True
    c = RecordingClient(reject_field="response_format")
    llm = make(tmp_path, c, cfg=cfg)
    llm._raw("summary", MSGS, 0.0)
    assert len(c.requests) == 2
    assert "response_format" in c.requests[0]
    assert "response_format" not in c.requests[1]


def test_anthropic_profile_merges_claude_models_into_every_stage():
    import pathlib
    root = pathlib.Path(__file__).resolve().parents[1]
    cfg = load_config(root / "config.yaml", "anthropic")
    for stage in ("summary", "candidates", "score", "rank", "montage"):
        assert cfg["stages"][stage]["provider"] == "anthropic"
        assert cfg["stages"][stage]["model"].startswith("claude-")
    assert cfg["providers"]["anthropic"]["json_mode"] is False
    assert cfg["providers"]["anthropic"]["max_tokens"]
