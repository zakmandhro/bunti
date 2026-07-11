# Bunti launch asset — Agent Fleet Mission Control (the theme hero shot)
# Run from repo root: bun run record:mission-control  (or: vhs tapes/mission-control.tape)
# Requires: vhs (brew install vhs), JetBrainsMono Nerd Font

Output .tmp/recordings/mission-control.gif
Output .tmp/recordings/mission-control.mp4

Set FontFamily "JetBrainsMono Nerd Font"
Set FontSize 16
Set Width 1440
Set Height 900
Set Padding 16
Set Theme "Catppuccin Mocha"
Set Framerate 60
Set TypingSpeed 40ms

# Boot off-camera (BUNTI_NF=1: the vhs terminal ships a Nerd Font but sets
# no identifying env vars, so detection would fall back to ascii icons).
Hide
Type "BUNTI_NF=1 bun demo/mission-control.ts"
Enter
Sleep 2s
Show

# Replay the panel entrance cascade on camera, then let telemetry flow.
Type "r"
Sleep 3s

# Cycle themes live: dark -> dracula -> catppuccin -> github-light -> dark.
Type "3"
Sleep 1.2s
Type "5"
Sleep 1.2s
Type "8"
Sleep 1.2s
Type "1"
Sleep 2s

# Quit off-camera so the exit flicker never hits the recording.
Hide
Type "q"
Sleep 500ms
