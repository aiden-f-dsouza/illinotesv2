# IlliNotes Architecture Guide

A comprehensive walkthrough of the IlliNotes codebase — frontend and backend.

---

## High-Level Architecture

IlliNotes is a **monolithic Flask application** with a classic server-rendered architecture, enhanced with AJAX for modern interactivity.

```
┌──────────────────────────────────────────────┐
│               Browser (Frontend)             │
│  Jinja2 HTML Templates + Vanilla JS + CSS    │
├──────────────────────────────────────────────┤
│              Flask (app.py ~1800 lines)       │
│  Routes, Auth, Business Logic, Templating    │
├──────────────────────────────────────────────┤
│           SQLAlchemy ORM (Models)            │
├──────────────┬───────────────────────────────┤
│  Supabase    │  Supabase Auth   │  Supabase  │
│  PostgreSQL  │  (Users/Sessions)│  Storage   │
└──────────────┴──────────────────┴────────────┘
│  OpenAI API  │  Resend (Email)  │
└──────────────┴──────────────────┘
```

**The key architectural decision**: Supabase is used for 3 separate things:

1. **PostgreSQL database** — accessed via SQLAlchemy ORM (not the Supabase client)
2. **Auth** — user signup/login/tokens via the Supabase Auth SDK
3. **File Storage** — note attachments stored in a Supabase Storage bucket

---

## Backend Walkthrough (`app.py`)

### 1. App Initialization (lines 1–84)

The app boots up by:

- Loading `.env` variables (database URL, API keys, etc.)
- Creating **two** Supabase clients: a regular one (anon key) and an **admin** one (service role key for privileged operations like creating users and bypassing RLS)
- Configuring Flask with SQLAlchemy, CSRF protection (`flask_wtf`), rate limiting (`flask_limiter`)
- Setting `NullPool` for database connections (required for Supabase's connection pooler)

### 2. Course Loading System (lines 87–116)

At startup, `load_courses_from_json()` reads `courses.json` and builds three data structures:

- **`COURSES_DICT`** — `{"CS": ["124", "128", ...], "MATH": ["221", ...]}` — hierarchical, for the two-dropdown filter UI
- **`CLASSES`** — `["CS124", "CS128", ...]` — flat list for backward compatibility
- **`SUBJECTS`** — `["CS", "MATH", ...]` — just the subject codes

These are **global constants** — no database query needed for course data.

### 3. Blog System (lines 118–230)

A markdown-file-based blog. Posts are `.md` files in a `blog/` directory, loaded with the `frontmatter` library. Metadata (title, date, author, slug) is in YAML frontmatter, content is rendered to HTML. Posts are grouped by month for timeline display.

### 4. Database Models (lines 232–461)

Six SQLAlchemy models that map to PostgreSQL tables:

| Model | Purpose | Key Relationships |
|---|---|---|
| **Note** | A posted note | Has many Attachments, Likes, Comments (cascade delete) |
| **Attachment** | A file on a note | Belongs to one Note |
| **Like** | A user liking a note | Belongs to one Note |
| **Comment** | A comment on a note | Belongs to one Note |
| **Mention** | An @mention in a comment | Links to Comment + Note + mentioned user |
| **PasswordResetToken** | Password reset flow | Single-use, 1hr expiry |
| **EmailVerificationToken** | Email verification | Single-use, 24hr expiry |

Notes store tags as a **comma-separated string** in a single `tags` column, and the `get_tags_list()` method parses them back into a list.

### 5. Authentication System (lines 463–550)

This is where the Supabase Auth integration lives:

- **`login_required` decorator** — Checks for an `access_token` cookie, validates it against Supabase, redirects to login if invalid
- **`UserWrapper` class** — Wraps Supabase's raw user object to add `is_admin`, `username`, and `display_name` attributes (fetched from the `profiles` table via a separate Supabase query)
- **`get_current_user()`** — The central function called on nearly every route. Reads the `access_token` cookie, calls `supabase.auth.get_user()`, then queries the `profiles` table for extra metadata. Returns a `UserWrapper` or `None`

The auth flow:

1. **Signup** → Admin API creates user (email unconfirmed) → Profile row inserted → Verification email sent via Resend → User clicks link → `/verify-email` confirms via Admin API
2. **Login** → Username looked up in `profiles` table to get email → `sign_in_with_password()` → Access token stored as httponly cookie
3. **Every request** → `get_current_user()` validates cookie with Supabase

### 6. The Dual API Pattern (throughout routes)

This is a core pattern in the codebase. Almost every user action has **two route implementations**:

**Form-based route** (traditional, full-page reload):

```python
@app.route("/like/<int:note_id>", methods=["POST"])
def like_note(note_id):
    # ... toggle like ...
    return redirect(request.referrer)  # full page reload
```

**AJAX API route** (JSON response, no reload):

```python
@app.route("/api/like/<int:note_id>", methods=["POST"])
def api_like_note(note_id):
    # ... toggle like ...
    return jsonify({"success": True, "liked": liked, "like_count": like_count})
```

The AJAX routes are what the JavaScript frontend actually uses. The form routes exist as a fallback if JS fails. This pattern repeats for likes, comments, comment edits, comment deletes, and note deletes.

### 7. Notes Route — The Central Endpoint (lines 700–917)

`/notes` handles both GET (viewing) and POST (creating):

**POST (create note)**:

1. Validates user is logged in
2. Extracts form data (title, body, class, tags)
3. Merges explicit tags with hashtags extracted from the body (`#python` → tag `python`)
4. Creates `Note` row, commits to get the ID
5. Uploads each attached file to Supabase Storage at path `notes/{note_id}/{uuid_filename}`
6. Creates `Attachment` rows for each
7. Redirects back to `/notes`

**GET (view notes)**:

1. Reads filter params from query string (`class_filter`, `search`, `tag_filter`, `date_filter`, `sort_by`)
2. Calls `_get_filtered_notes()` which builds a dynamic SQLAlchemy query with chained `.filter()` and `.order_by()` calls
3. Applies pagination (`PAGE_SIZE = 5`)
4. Builds a tag cloud by scanning all notes
5. Fetches current user's liked notes and unread mentions
6. Passes everything to the `index.html` template

**`/api/notes`** does the same filtering/pagination but returns a JSON response with an HTML fragment (rendered from `notes_fragment.html`) for AJAX "Load More" and filter operations.

### 8. File Downloads

`/download/<attachment_id>` fetches the file from Supabase Storage and serves it to the user with the original filename.

### 9. AI Summarizer

`/api/summarize` sends note text to OpenAI's GPT-4o-mini and returns a summary. The `/summarizer` page provides the UI.

---

## Frontend Walkthrough

### CSS Architecture

Three main stylesheets:

| File | Purpose |
|---|---|
| `turbolearn-darkmode.css` | The design system — CSS custom properties for colors, typography, spacing. Supports light/dark mode via `[data-theme="dark"]` selectors |
| `landing-page.css` | Landing page specific styles (hero, features grid, comparison table, footer) |
| `notes-page.css` | Notes feed styles (note cards, filters, comments, modals) |

The theming system uses CSS custom properties like `--bg-card`, `--text-primary`, `--accent-terracotta`, `--border-light` that change values based on `data-theme` attribute on `<html>`.

### JavaScript Architecture

| File | Purpose |
|---|---|
| `notes-page.js` | The main JS file (~1125 lines). Handles everything on the notes feed page |
| `theme-toggle.js` | Dark mode toggle with `localStorage` persistence |
| `mobile-menu.js` | Hamburger menu for mobile |

### `notes-page.js` — Deep Dive

This is the most important frontend file. Here's what it does:

**Initialization** (`DOMContentLoaded`):

1. Reads data from a hidden `#page-data` div (the template injects JSON data as `data-*` attributes)
2. Populates the two-dropdown course filter (Subject → Number) using `Choices.js` for searchable dropdowns
3. Sets up event listeners on all filter dropdowns

**Course Filter System**:

- Two linked `<select>` dropdowns: Subject and Number
- Selecting a subject dynamically populates the number dropdown from `COURSES_DICT`
- Selecting a number combines them (e.g., "CS" + "124" = "CS124") and triggers an AJAX filter

**AJAX Operations** (all use `fetch()` with CSRF tokens from a `<meta>` tag):

- **`toggleLike()`** — Optimistic UI update (instantly toggles the heart icon and count), then calls `/api/like/{id}`. If the server disagrees, it rolls back the UI
- **`addCommentAjax()`** — Posts comment to `/api/comment/{id}`, then injects the new comment HTML into the DOM without a page reload. If no comments section exists yet, it creates the entire container
- **`editCommentAjax()`** / **`deleteCommentAjax()`** — Inline edit and fade-out delete with rollback on error
- **`deleteNoteAjax()`** — Confirmation dialog, then fade-out animation, then removes the card from DOM
- **`applyFiltersAjax()`** — Replaces the entire notes container with a loading spinner, fetches `/api/notes` with current filter values, injects the HTML fragment response
- **`loadMore()`** — Increments page counter, fetches next page of notes, appends HTML to the container

**Toast System**: `showToast(message, type)` creates temporary notification popups (success/error/info) in the bottom-right corner.

### Template Architecture

- **`landing.html`** — Marketing page: hero section with demo video, feature cards, comparison table vs competitors, value propositions, live notes feed (loaded via AJAX from `/api/landing/recent-notes`), footer
- **`index.html`** — The main app page. Self-contained with inline `<style>` and `<script>` blocks plus external JS files. Contains: navbar with search, mobile menu, mention notifications banner, "Add Note" section, course filter, posted notes with sorting/filtering, note cards with full CRUD, create note modal, scroll-to-top button, toast container
- **`notes_fragment.html`** — A partial template that renders just note cards (no `<html>` wrapper). Used by the `/api/notes` endpoint to return HTML fragments for AJAX pagination
- **Auth templates** — `login.html`, `signup.html`, `forgot_password.html`, `reset_password.html` — standalone pages

---

## Data Flows

### How a Page Load Works

```
1. User visits /notes?class_filter=CS124
2. Flask route `notes()` runs
3. get_current_user() → validates cookie with Supabase → queries profiles table
4. _get_filtered_notes() → SQLAlchemy query with .filter(class_code=="CS124")
5. Pagination slices results (page 1, 5 notes)
6. Tag cloud computed from all notes
7. Liked notes and unread mentions fetched for current user
8. render_template("index.html", ...) with all data
9. Jinja2 renders HTML with {% for n in notes %} loops
10. Browser receives full HTML, loads CSS/JS
11. notes-page.js reads #page-data, initializes Choices.js dropdowns
12. User interacts → JS handles via AJAX (no page reloads)
```

### How an AJAX Action Works (e.g., Liking a Note)

```
1. User clicks heart icon
2. toggleLike(noteId, button) called
3. Optimistic UI: icon fills, count increments immediately
4. fetch('/api/like/42', {method: 'POST', headers: {'X-CSRFToken': ...}})
5. Flask route api_like_note(42) runs
6. Checks if Like row exists for this user+note
7. If exists → delete (unlike), else → create (like)
8. Returns JSON: {success: true, liked: true, like_count: 7}
9. JS verifies server state matches optimistic update
10. Updates metadata badge count
11. If error → rolls back the optimistic UI change
```

---

## Security Model

- **CSRF**: Flask-WTF CSRFProtect on all forms, AJAX sends token via `X-CSRFToken` header
- **Rate Limiting**: `flask_limiter` — 5 signups/hr, 10 logins/min, 200 requests/day default
- **Auth**: Supabase handles password hashing, token management, email verification
- **Permissions**: Owner OR admin can edit/delete (checked on both form and API routes)
- **File uploads**: Extension whitelist, `secure_filename()`, UUID prefixes prevent collisions
- **RLS**: Supabase Row Level Security on all database tables as an additional layer
