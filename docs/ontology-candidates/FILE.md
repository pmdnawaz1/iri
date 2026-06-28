# Candidate feature: FILE / UPLOAD

- Source repos:
  - **directus** (POST /files, GET /files, GET /:pk/:filename?, POST /import, POST /export/:collection — file management routes)
  - **medusa** (POST /admin/uploads, GET /admin/uploads — `route.ts`)
  - **novu** (GET /upload-url — `storage.controller.ts`)
  - **cal.com** (POST /ics-feed/save, GET /ics-feed/check — `calendars.controller.ts`)
- Rationale: File upload, storage, and download appears in CMS (directus), e-commerce (medusa), notifications (novu), and scheduling (cal.com). The concept of asset management is universal.

## Proposed capabilities
- `FILE.UPLOAD`     aliases: `["upload", "uploads", "files", "file"]`    chain: BACKEND
- `FILE.DOWNLOAD`   aliases: `["download"]`                              chain: BACKEND
- `FILE.DELETE`     aliases: `[]`                                         chain: BACKEND
- `FILE.LIST`       aliases: `[]`                                         chain: BACKEND
- `FILE.GET_URL`    aliases: `["upload-url", "presigned"]`               chain: BACKEND

## Proposed constraints (if any, with ontology-typed enums)
- `STORAGE_PROVIDER` = ENUM[LOCAL, S3, GCS, AZURE_BLOB, CLOUDINARY]
- `ALLOWED_MIME`     = ENUM[IMAGE, VIDEO, DOCUMENT, ANY]

## Evidence
- Routes observed (directus): `POST /files/`, `GET /:pk/:filename?`, `POST /import`, `POST /export/:collection`, `DELETE /:pk`, `POST /folder/:pk` — files + folders controllers
- Routes observed (medusa): `POST /admin/uploads`, `GET /admin/uploads/:id` — file-based router
- Routes observed (novu): `GET /upload-url` — `storage.controller.ts`
- Routes observed (cal.com): `POST /ics-feed/save`, `GET /ics-feed/check` — `calendars.controller.ts`
- Example call chains (directus): `FilesController` → `AssetsService` → `StorageService` → DATABASE → `RESPONSE`
