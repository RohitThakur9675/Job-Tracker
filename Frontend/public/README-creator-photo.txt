Creator photo goes here
========================

Save Rohit's photo in this exact folder as:

    frontend/public/creator-rohit.jpg

That's it — no code changes needed. Vite serves everything in this `public/`
folder straight from the site root, so a file saved here as
`creator-rohit.jpg` becomes reachable at the URL path `/creator-rohit.jpg`,
which is exactly the path `CreatorBadge.jsx` already points at
(frontend/src/components/CreatorBadge.jsx, the CREATOR_PHOTO_SRC constant).

- Any normal photo works (jpg/png/webp) — if you use a different extension
  or filename, update CREATOR_PHOTO_SRC in CreatorBadge.jsx to match.
- Square, at least 100x100px, recommended — it's displayed as a small circle
  (28-30px) so it gets cropped to a circle and scaled down automatically.
- Until a real photo is added here, the badge shows a clean "R" circle
  instead of a broken-image icon — nothing looks broken either way.

You can delete this file once the real photo is in place.
