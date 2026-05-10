#!/bin/bash
CMD=$1
OUTPUT=$2
echo "Running: $CMD"
eval "$CMD" &
PID=$!
sleep 2
echo "Capturing frontmost window..."
WINDOW_ID=$(osascript -e 'tell application "System Events" to get id of window 1 of (first process whose frontmost is true)')
screencapture -x -l $WINDOW_ID "$OUTPUT"
kill $PID 2>/dev/null
echo "Capture complete: $OUTPUT"