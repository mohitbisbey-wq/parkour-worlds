#!/bin/sh
input=$(cat)
cwd=$(echo "$input" | jq -r '.cwd')
model=$(echo "$input" | jq -r '.model.display_name')
remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')

if [ -n "$remaining" ]; then
  printf "%s | %s | Context: %.0f%% remaining" "$cwd" "$model" "$remaining"
else
  printf "%s | %s | Context: N/A" "$cwd" "$model"
fi
