# Vidyut Solar and Electricals Website

Responsive lead-generation website for solar panel installation and sales in Nashik.

## Features

- 5 pages: Home, Services, Projects, About, Contact
- Mobile-first responsive Tailwind UI
- Sticky navbar + floating WhatsApp button
- Click-to-call buttons for mobile users
- Lead capture form with image upload
- MongoDB-backed storage for leads and projects
- Cloudinary image storage for production uploads
- Local SEO content for Nashik service areas

## Setup

1. Install dependencies:
   `npm install`
2. Configure environment:
   - Copy `.env.example` to `.env`
   - Add MongoDB Atlas connection string (`MONGODB_URI`)
   - Add Cloudinary credentials (`CLOUDINARY_*`)
   - Add Gmail SMTP details (use Gmail App Password)
   - Set `OWNER_PANEL_KEY` for admin upload access
3. Start server:
   `npm start`
4. Open:
   `http://localhost:3000`

## Migrate existing local data

If you already have data in `data/projects.json` or `data/leads.json`, migrate it once:

`npm run migrate:local-data`

This imports existing rows into MongoDB.

## Notes

- Update phone number in HTML files and WhatsApp links as needed.
- Projects and leads are stored in MongoDB.
- Uploaded images are stored in Cloudinary when credentials are configured.
- If Cloudinary credentials are missing, uploads fall back to local `uploads/`.
- Visitor alerts are sent to:
  - `sanapanuj7@gmail.com`
  - `vidyutsolarelectricals@gmail.com`
