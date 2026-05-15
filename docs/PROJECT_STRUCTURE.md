# Project Structure

Use this layout to keep the project clean and easy to maintain.

```text
Vidyut_solars/
  server.js
    Express server, API routes, authentication, uploads, MongoDB models.

  package.json
  package-lock.json
    Node dependencies and npm scripts.

  .env
    Local secrets only. Do not commit this file.

  .env.example
    Safe template showing required environment variables.

  render.yaml
    Render deployment configuration.

  public/
    Browser-facing website files. Anything here can be loaded by visitors.

    index.html
    services.html
    projects.html
    about.html
    contact.html
    auth.html
    owner-projects.html
      Main public pages.

    pages/
      calculator.html
      preview.html
        Secondary pages.

    components/
      navbar.html
      footer.html
      whatsapp-float.html
        Shared HTML components loaded by JavaScript.

    css/
      styles.css
        Shared custom styles.

    js/
      main.js
      auth-client.js
      auth.js
      calculator.js
      owner-projects.js
      projects.js
      form.js
      preview.js
        Browser JavaScript.

    assets/
      images/
        brand/
          logo.png
            Brand/logo images.

        hero/
          img1.jpeg
          img2.jpeg
          img3.jpeg
            Homepage hero and carousel images.

        services/
          ongrid.png
          offgrid.png
          hybrid.png
            Service page images.

        projects/
          prj1/
          prj2/
            Static completed-project gallery images.

  uploads/
    Local fallback upload storage when Cloudinary is not configured.
    This folder is ignored by git.

  data/
    Legacy JSON data used by migration scripts.

  scripts/
    migrate-local-data.js
      Imports old local JSON data into MongoDB.

    print-project-structure.js
      Prints this folder guide in the terminal.

  docs/
    PROJECT_STRUCTURE.md
      Human-readable directory guide.
```

## Asset Rules

- Put all website images under `public/assets/images/`.
- Put logo and brand files in `public/assets/images/brand/`.
- Put homepage carousel or hero images in `public/assets/images/hero/`.
- Put service images in `public/assets/images/services/`.
- Put manually curated project photos in `public/assets/images/projects/<project-name>/`.
- Do not put new images directly in the repo root or directly in `public/`.
- User/admin uploads should go through the app and be stored in Cloudinary or `uploads/`.
