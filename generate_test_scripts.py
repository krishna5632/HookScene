import os
import zipfile
from pathlib import Path

ep1_content = """EPISODE NUMBER: Episode 01
EPISODE LOGLINE: Liam is publicly humiliated and served divorce papers at his wife's billionaire celebration, only for an elite motorcade to arrive revealing his true identity as Chairman Vance.
CONTINUITY NOTES: The pilot episode establishing the high-stakes boardroom betrayal, secret identity reveal, and intense cliffhanger.

--- SCRIPT START ---

SCENE 01
Scene heading: INT. AVALON GRAND BALLROOM - NIGHT
Scene start: 00:00.00
Scene end: 01:02.00

Actions and dialogue:

**VICTORIA (Freezing):**
Start: (00:00.00) | End: (00:02.80)
"Sign the divorce papers, Liam. You are a penniless nobody in my father's empire."

**ACTION:**
Start: (00:02.80) | End: (00:04.90)
Victoria slaps a thick legal agreement onto the glass table, her diamond rings glinting under the crystal chandeliers.

**LIAM (Calm):**
Start: (00:05.00) | End: (00:07.80)
"After three years of keeping your family out of ruin, this is your loyalty?"

**RICHARD (Mocking):**
Start: (00:08.00) | End: (00:11.20)
"You served drinks in our kitchen, beggar! Victoria is marrying a true titan tonight."

**ACTION:**
Start: (00:11.30) | End: (00:13.50)
Richard steps forward, pouring a flute of vintage champagne directly over Liam's leather shoes.

**VICTORIA (Cruel):**
Start: (00:13.60) | End: (00:16.80)
"Take your one thousand dollar settlement and crawl out before security throws you onto the pavement."

**LIAM (Whispering):**
Start: (00:17.00) | End: (00:20.40)
"Remember this moment, Victoria. Once I sign, the Avalon Group ceases to exist."

**ACTION:**
Start: (00:20.50) | End: (00:23.00)
Liam takes the gold fountain pen, scrawls an aggressive signature, and slides the papers back.

**SOUND FX:**
Start: (00:23.20) | End: (00:25.80)
Screech of heavy tires outside followed by the shattering roar of three armored black SUVs breaching the gates.

**CAMERA:**
Start: (00:26.00) | End: (00:28.50)
Whip-pan toward the double mahogany doors swinging open violently, revealing twelve armed bodyguards in charcoal suits.

**ELDER TYCOON (Booming):**
Start: (00:28.80) | End: (00:33.40)
"Stand aside, fools! We are here to escort the supreme Chairman of the Sovereign Global Syndicate!"

**ACTION:**
Start: (00:33.60) | End: (00:36.50)
The Elder Tycoon bypasses the stunned guests, walks straight to Liam, and drops to one knee with head bowed.

**ELDER TYCOON (Trembling):**
Start: (00:36.80) | End: (00:41.20)
"Chairman Vance! Your three-year trial of obscurity is over. Your global armada awaits your first command."

**CAMERA:**
Start: (00:41.40) | End: (00:44.20)
Extreme close-up on Victoria dropping her champagne glass, the crystal shattering into hundreds of shards on the marble floor.

**VICTORIA (Gasping):**
Start: (00:44.50) | End: (00:48.20)
"C-Chairman Vance? Liam... who on earth are you?!"

**LIAM (Smiling):**
Start: (00:48.50) | End: (00:53.00)
"You wanted a divorce, Victoria. Effective immediately, liquidate all Avalon assets."
"""

ep2_content = """EPISODE NUMBER: Episode 02
EPISODE LOGLINE: Victoria tries to desperately beg for forgiveness as Chairman Vance's armada freezes Avalon Group accounts, but Liam's secret past with an assassin reveals an even deadlier conspiracy.
CONTINUITY NOTES: Picks up immediately after Liam's identity reveal in Episode 01.

--- SCRIPT START ---

SCENE 01
Scene heading: INT. AVALON GRAND BALLROOM - CONTINUOUS
Scene start: 00:00.00
Scene end: 00:58.00

Actions and dialogue:

**VICTORIA (Desperate):**
Start: (00:00.00) | End: (00:02.80)
"Liam, please! I was pressured by my father! I never meant those cruel words!"

**ACTION:**
Start: (00:02.80) | End: (00:05.10)
Victoria drops to her knees, grabbing Liam's coat hem, tears ruining her immaculate mascara.

**LIAM (Glacial):**
Start: (00:05.30) | End: (00:08.50)
"When I was sick on the floor last winter, you stepped over me to go to a gala."

**RICHARD (Panicked):**
Start: (00:08.80) | End: (00:12.40)
"This is a trick! Guards, arrest this impostor! He is not a billionaire!"

**ACTION:**
Start: (00:12.60) | End: (00:15.50)
Four security guards charge forward, drawing steel batons.

**SOUND FX:**
Start: (00:15.60) | End: (00:18.00)
Two lightning-fast bone-cracking strikes as Liam's head bodyguard dismantles the guards in under two seconds.

**BODYGUARD COMMANDER (Cold):**
Start: (00:18.20) | End: (00:21.00)
"Lay a finger on the Chairman, and your lineage ends tonight."

**ACTION:**
Start: (00:21.20) | End: (00:24.00)
Richard's phone vibrates frantically; he stares at the screen in pure terror.

**RICHARD (Choking):**
Start: (00:24.20) | End: (00:28.00)
"Our bank shares... wiped out. Four hundred million dollars in debt, frozen in two minutes!"

**LIAM (Low):**
Start: (00:28.30) | End: (00:32.50)
"I gave you an empire to hold, and you thought you were emperors."

**CAMERA:**
Start: (00:32.80) | End: (00:35.50)
Red laser dot suddenly appears centered on Liam's forehead from an unseen sniper across the street.

**MYSTERIOUS VOICE (O.S.):**
Start: (00:35.80) | End: (00:40.20)
"Target located. Chairman Vance has surfaced. Execute Operation Red Dawn."

**ACTION:**
Start: (00:40.50) | End: (00:44.00)
Liam spots the laser, his eyes flashing with dark recognition as he grabs Victoria and dives behind the pillar.
"""

srt_content = """1
00:00:00,000 --> 00:00:02,800
VICTORIA: "Sign the divorce papers, Liam. You are a penniless nobody in my father's empire."

2
00:00:05,000 --> 00:00:07,800
LIAM: "After three years of keeping your family out of ruin, this is your loyalty?"

3
00:00:08,000 --> 00:00:11,200
RICHARD: "You served drinks in our kitchen! Victoria is marrying a true titan tonight."

4
00:00:13,600 --> 00:00:16,800
VICTORIA: "Take your one thousand dollar settlement and crawl out before security throws you out!"

5
00:00:17,000 --> 00:00:20,400
LIAM: "Remember this moment. Once I sign, the Avalon Group ceases to exist."

6
00:00:28,800 --> 00:00:33,400
ELDER TYCOON: "Stand aside, fools! We are here to escort the supreme Chairman of the Sovereign Global Syndicate!"

7
00:00:36,800 --> 00:00:41,200
ELDER TYCOON: "Chairman Vance! Your three-year trial is over. Your global armada awaits your command."

8
00:00:44,500 --> 00:00:48,200
VICTORIA: "C-Chairman Vance? Liam... who on earth are you?!"

9
00:00:48,500 --> 00:00:53,000
LIAM: "You wanted a divorce, Victoria. Effective immediately, liquidate all Avalon assets."
"""

def main():
    root = Path(__file__).resolve().parent
    out_dir = root / "sample_test_show"
    out_dir.mkdir(exist_ok=True)

    p1 = out_dir / "new_test_episode_01.txt"
    p2 = out_dir / "new_test_episode_02.txt"
    p1.write_text(ep1_content, encoding="utf-8")
    p2.write_text(ep2_content, encoding="utf-8")

    # Zip
    zip_path = out_dir / "new_test_series_bundle.zip"
    with zipfile.ZipFile(zip_path, "w") as z:
        z.write(p1, arcname="new_test_episode_01.txt")
        z.write(p2, arcname="new_test_episode_02.txt")

    # SRT
    srt_path = out_dir / "new_test_subtitles.srt"
    srt_path.write_text(srt_content, encoding="utf-8")

    # Mirror to frontend dist and public so they can be downloaded directly from browser
    pub_dir = root / "frontend" / "public" / "test_scripts"
    pub_dir.mkdir(parents=True, exist_ok=True)
    (pub_dir / "new_test_episode_01.txt").write_text(ep1_content, encoding="utf-8")
    (pub_dir / "new_test_episode_02.txt").write_text(ep2_content, encoding="utf-8")
    (pub_dir / "new_test_subtitles.srt").write_text(srt_content, encoding="utf-8")
    with zipfile.ZipFile(pub_dir / "new_test_series_bundle.zip", "w") as z:
        z.write(p1, arcname="new_test_episode_01.txt")
        z.write(p2, arcname="new_test_episode_02.txt")

    dist_dir = root / "frontend" / "dist" / "test_scripts"
    dist_dir.mkdir(parents=True, exist_ok=True)
    (dist_dir / "new_test_episode_01.txt").write_text(ep1_content, encoding="utf-8")
    (dist_dir / "new_test_episode_02.txt").write_text(ep2_content, encoding="utf-8")
    (dist_dir / "new_test_subtitles.srt").write_text(srt_content, encoding="utf-8")
    with zipfile.ZipFile(dist_dir / "new_test_series_bundle.zip", "w") as z:
        z.write(p1, arcname="new_test_episode_01.txt")
        z.write(p2, arcname="new_test_episode_02.txt")

    print("SUCCESS: Generated all test scripts!")

if __name__ == "__main__":
    main()
