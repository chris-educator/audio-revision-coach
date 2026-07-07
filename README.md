# Audio Revision Coach (S1)

Flashcard decks and listen-aloud revision scripts for Australian secondary students.

**Host:** https://revise.appstax.ai  
**EdStack app id:** `audio-revision-coach`

## Credits

- **3 credits** — flashcard deck  
- **5 credits** — listen-aloud script (browser TTS)

## Local dev

```bash
uvicorn server.main:app --port 8029 --reload
cd client && npm run dev   # :5203
```
