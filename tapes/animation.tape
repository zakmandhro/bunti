# Bunti launch asset — animation demo (gradients, easing, typewriter)
# Run from repo root: vhs tapes/animation.tape
# Requires: vhs (brew install vhs), JetBrainsMono Nerd Font

Output .tmp/recordings/animation.gif
Output .tmp/recordings/animation.mp4

Set FontFamily "JetBrainsMono Nerd Font"
Set FontSize 18
Set Width 1200
Set Height 750
Set Padding 16
Set Theme "Catppuccin Mocha"
Set Framerate 60
Set TypingSpeed 40ms

# Launch directly (skip the demo/runner.ts watchdog for clean recordings).
Hide
Type "bun demo/animation.ts"
Enter
Sleep 1s
Show

# Full boot sequence plays out (~3s), then replay it once with Enter.
Sleep 4.5s
Enter
Sleep 4.5s

# Quit off-camera.
Hide
Type "q"
Sleep 500ms
