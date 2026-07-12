# Bunti launch asset — STARHOP platformer (60fps physics, parallax, pixel sprite)
# Run from repo root: bun run record:platformer  (or: vhs tapes/platformer.tape)
# Requires: vhs (brew install vhs), JetBrainsMono Nerd Font
#
# The run is a scripted speedrun: continuous Right presses read as a held key
# (the demo tracks press-stream recency), Space bursts read as held jumps
# (burst length = jump height), and jumps are buffered so timing has ~120ms
# of slack. Verified deterministically against the demo physics.

Output .tmp/recordings/platformer.gif
Output .tmp/recordings/platformer.mp4

Set FontFamily "JetBrainsMono Nerd Font"
Set FontSize 16
Set Width 1200
Set Height 750
Set Padding 16
Set Theme "Catppuccin Mocha"
Set Framerate 60
Set TypingSpeed 35ms

# The vhs terminal (xterm.js) renders truecolor but doesn't advertise it;
# without this the dark sky gradient quantizes to ANSI-256 and bands.
# NOTE: Env is a command, so it must come AFTER every Set directive.
Env COLORTERM "truecolor"

# Launch the demo directly (not via demo/runner.ts — the watchdog adds
# bun --watch child-process noise we don't want in a recording).
Hide
Type "bun demo/platformer.ts"
Enter
Sleep 2s
Show

# Let the title/parallax breathe before the run starts.
Sleep 1200ms

# --- The speedrun -----------------------------------------------------------
# Right@35ms N = N held-run presses (~35ms apart); Space@40ms 6 = a full jump.
# Jump times (vs. run start): 0.68s 2.42s 4.52s 5.52s 7.05s 8.08s 9.15s.
# "2"/"3" switch the theme live mid-run (dracula, tokyo-night); each replaces
# one Right press so the downstream jump timing stays intact.

Right@35ms 19
Space@40ms 6
Right@35ms 43
Space@40ms 6
Right@35ms 24
Type "2"
Right@35ms 28
Space@40ms 6
Right@35ms 22
Space@40ms 6
Right@35ms 18
Type "3"
Right@35ms 18
Space@40ms 6
Right@35ms 23
Space@40ms 6
Right@35ms 24
Space@40ms 6
Right@35ms 46

# Touchdown at the pad; the rocket launches and the clear card slides in.
Sleep 3s

# Quit off-camera so the exit flicker never hits the recording.
Hide
Type "q"
Sleep 500ms
