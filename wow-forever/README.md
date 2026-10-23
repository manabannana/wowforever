# WoW Forever

Friends pick their Alliance classes, races and roles. Everyone sees the picks live and the page suggests a 10-man raid.

## Deploy (Netlify CLI)

    npm install
    npx netlify-cli login
    npx netlify-cli deploy --prod

The first deploy asks you to create or link a site. Picks are stored in Netlify Blobs, which needs no setup.

Or push this folder to GitHub and import it in Netlify. It picks up `netlify.toml` automatically.

Netlify Drop (drag and drop) won't work here, because it doesn't deploy functions.

## Files

- `public/index.html` is the page
- `netlify/functions/picks.mjs` saves and lists each hero's picks
- `netlify/functions/raid.mjs` saves the shared raid team
- `netlify/lib/classes.mjs` is the class, race and role list the server checks against
- To change classes, races or roles, edit `CLASSES` in both `public/index.html` and `netlify/lib/classes.mjs`
