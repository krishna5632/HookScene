import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, "/app/backend")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from snipdeck.core.parse import parse_episode
from snipdeck.core.pipeline import arun
from snipdeck.providers import LLM, load_config
from snipdeck.export import payload

async def main():
    root = Path("/app") if Path("/app").exists() else Path(__file__).resolve().parent.parent
    ep_path = root / "frontend" / "data" / "ep11_test.txt"
    if not ep_path.exists():
        src_path = Path("C:/Users/prave/.gemini/antigravity/brain/dcd1bd83-90b3-4797-98a5-c05c6a523994/.user_uploaded/media_1794837774496_89d329c8.txt")
        if src_path.exists():
            ep_path.write_bytes(src_path.read_bytes())
    
    ep = parse_episode(ep_path)
    print(f"Loaded Episode {ep.num}: {len(ep.lines)} lines, duration {ep.duration:.2f}s")
    
    cfg = load_config(root / "config.yaml")
    for s in ("summary", "candidates", "score", "rank", "montage"):
        cfg["stages"][s]["model"] = "gemini-flash-lite-latest"
        cfg["stages"][s]["fallback_models"] = ["gemini-3-flash-preview"]

    key = os.environ.get("GEMINI_API_KEY", "")
    llm = LLM(cfg, cache_dir=str(root / ".cache"), api_keys={"gemini": key}, use_cache=False)

    print("Running AI pipeline with gemini-flash-lite-latest and new API key...")
    res = await arun([ep], cfg, llm=llm, use_llm=True, do_montage=False, show="Episode 11")
    out = payload(res, "Episode 11", {ep.num: ep.duration})
    
    print("\n================ EXTRACTION SUCCESS ================")
    print(f"Total Promos Extracted: {len(out['promos'])}")
    for p in out["promos"]:
        rank = p.get("rank")
        hook = p.get("hook", "")
        cliff = p.get("cliffhanger", "")
        dur = p.get("duration", 0)
        score = p.get("overall_score", 0)
        hold = p.get("attention_hold_rate", 0)
        seg = p.get("segments", [{}])[0]
        print(f"Promo #{rank} [Duration: {dur}s | Score: {score:.2f} | Hold: {hold}% | Timestamp: {seg.get('start', 0):.2f}s - {seg.get('end', 0):.2f}s]")
        print(f"   Hook: {hook}")
        print(f"   Cliffhanger: {cliff}\n")

if __name__ == "__main__":
    asyncio.run(main())
