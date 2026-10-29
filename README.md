# APEX — House of APEX

A Vite + Three.js cinematic car experience.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Production build

```bash
npm run build
npm run preview
```

Vite writes the production site to `dist/`.

## Deploy to Vercel

1. Push this project to the `main` branch of the GitHub repository.
2. In Vercel, import the GitHub repository.
3. Keep the framework preset as **Vite**.
4. Set the build command to `npm run build` and the output directory to `dist`.
5. Deploy.

No environment variables are required by the current project.

## Cinematic intro

- The progress bar remains at 0% until Space is pressed.
- The camera moves into a close side-on view of the car.
- At 100%, the car fades away in staggered mesh sections while colored fragments fly outward.
- The final message reveals letter by letter.

The original model at `public/assets/models/rc_f1.glb` is retained.
