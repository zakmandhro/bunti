# Bunti launch asset — 2048 demo (keyboard gameplay)
# Run from repo root: bun run record  (or: vhs tapes/2048.tape)
# Requires: vhs (brew install vhs), JetBrainsMono Nerd Font

Output .tmp/recordings/2048.gif
Output .tmp/recordings/2048.mp4

Set FontFamily "JetBrainsMono Nerd Font"
Set FontSize 18
Set Width 1200
Set Height 750
Set Padding 16
Set Theme "Catppuccin Mocha"
Set Framerate 60
Set TypingSpeed 40ms

# Launch the demo directly (not via demo/runner.ts — the watchdog adds
# bun --watch child-process noise we don't want in a recording).
Hide
Type "bun demo/2048.ts"
Enter
Sleep 2s
Show

# Let the opening board breathe, then play a few moves.
Sleep 1s
Left
Sleep 500ms
Up
Sleep 500ms
Right
Sleep 500ms
Down
Sleep 500ms
Left
Sleep 500ms
Up
Sleep 500ms
Left
Sleep 500ms
Up
Sleep 500ms
Right
Sleep 500ms
Down
Sleep 700ms
Left
Sleep 500ms
Up
Sleep 1.2s

# Quit off-camera so the exit flicker never hits the recording.
Hide
Type "q"
Sleep 500ms
