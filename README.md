# Halo: the lamp that rises

A one-page design demo for a made-up sunrise bedside lamp. It shows layered parallax and scroll
storytelling in plain HTML, CSS and JavaScript:

- a hero built from depth layers, with the lamp pinned to the nightstand in the room photo
- a word-by-word manifesto
- a pinned 05:30 to 06:30 sunrise that crossfades the room from night to morning
- a sticky card stack

**Live:** https://sillyvoicesinmyhead.github.io/halo-lamp-demo/

## Run it

Any static server works, for example:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Files

- `index.html`: content and structure
- `styles.css`: the look, phone layout and reduced-motion rules
- `app.js`: GSAP and ScrollTrigger (from cdnjs) for the scroll effects, and the code that pins the lamp to the photo
- `assets/gen/`: the images, all AI-generated for this demo

With reduced motion turned on, the page shows the final states and skips parallax and scrubbing.

Halo is fictional. Nothing here is for sale.
