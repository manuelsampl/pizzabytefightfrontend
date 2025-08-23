#!/bin/zsh
# Upload WebM-Video zum Backend
curl -F "file=@pizza-royale.webm" http://localhost:4000/api/upload
