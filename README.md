# IlliNotes

**CS124 Honors Project - FA25-Group10**

A collaborative note-sharing web application for UIUC students. Upload, search, and study class notes organized by course — with a built-in AI tutor to help you learn.

## Features

### Notes
- Create, edit, and delete notes with titles and content
- Assign notes to courses (191 subjects, 2,000+ courses)
- File attachments: PDF, images, documents, presentations (up to 16MB)
- Tag notes with hashtags
- "Post first" gate: users must contribute a note before browsing the feed

### AI Tutor
- Floating chat widget on the notes feed — click "Ask AI" on any note card
- Context-aware: reads note body, extracted PDF text, and image attachments
- Automatic PDF text extraction at upload time (via pdfplumber)
- On-demand image analysis via GPT-4o-mini Vision API
- Session-based conversation history (resets on refresh)
- 30 messages/user/day rate limit

### AI Summarizer
- Standalone page to paste and summarize text
- Powered by GPT-4o-mini

### Social
- Like notes
- Comment on notes with edit/delete
- @mention users in comments with notification tracking

### Search & Filter
- Filter by course, tags, date range
- Full-text search (title, body, author)
- Sort by: recent, oldest, title, author, likes, comments, popularity
- Pagination (5 notes per page)

### Other
- Blog system (markdown posts)
- Dark/light mode toggle
- User profiles with display names
- Mobile-responsive design

## Tech Stack

- **Backend**: Flask, SQLAlchemy, PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (`note-attachments` bucket)
- **AI**: OpenAI GPT-4o-mini (chat, summarization, vision)
- **PDF Extraction**: pdfplumber
- **Email**: Resend API
- **Frontend**: Jinja2, HTML/CSS/JS, Phosphor Icons

## Project Structure

```
Illinotes/
├── app.py                       # Main Flask app (~2,500 lines)
├── courses.json                 # Course catalog (191 subjects)
├── requirements.txt
├── templates/
│   ├── landing.html             # Landing page
│   ├── index.html               # Notes feed + AI chat widget
│   ├── blog.html, blog_post.html
│   ├── forum.html, support.html # Stubs (coming soon)
│   ├── philosophy.html, team.html
│   ├── profile.html, summarizer.html
│   ├── login.html, signup.html
│   ├── forgot_password.html, reset_password.html
│   └── notes_fragment.html      # AJAX fragment
├── static/
│   ├── turbolearn-darkmode.css  # Main styles (light/dark mode)
│   ├── landing-page.css, notes-page.css, figma-design.css
│   ├── theme-toggle.js, notes-page.js
│   ├── ai-chat.js               # AI chat widget
│   └── images/
├── blog/                        # Markdown blog posts
└── uploads/                     # User uploads (gitignored)
```

## Database Models

- **Note**: id, author, title, body, class_code, user_id, tags, created
- **Attachment**: id, note_id, filename, original_filename, file_type, extracted_text
- **Like**: id, note_id, user_id, created
- **Comment**: id, note_id, author, body, user_id, created
- **Mention**: id, comment_id, note_id, mentioned_user_email, is_read
- **PasswordResetToken**: id, user_id, token, created, expires_at

## Setup

### Prerequisites
- Python 3.8+
- Supabase project (PostgreSQL + Auth + Storage)
- OpenAI API key (with billing enabled)
- Resend API key

### Installation

```bash
# Clone and enter directory
git clone <repo-url>
cd Illinotes

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...
OPENAI_API_KEY=your-key
RESEND_API_KEY=your-key

# Run
python app.py
```

Server runs at `http://localhost:5000`

## API Routes

### Pages
- `GET /` or `/landing` - Landing page
- `GET /notes` - Notes feed (requires login + first post)
- `GET /profile` - User profile
- `GET /summarizer` - AI summarizer
- `GET /blog` - Blog listing
- `GET /blog/<slug>` - Blog post
- `GET /forum`, `/support`, `/philosophy`, `/team` - Info pages

### Auth
- `GET/POST /login`, `/signup`, `/logout`
- `GET/POST /forgot-password`, `/reset-password`
- `POST /change-password`

### Notes API (AJAX)
- `GET /api/notes` - Paginated notes (gated: requires login + first post)
- `POST /api/like/<id>` - Toggle like
- `POST /api/comment/<id>` - Add comment
- `POST /api/comment/<id>/edit` - Edit comment
- `POST /api/comment/<id>/delete` - Delete comment
- `POST /api/note/<id>/delete` - Delete note
- `POST /api/summarize` - Summarize text
- `POST /api/chat` - AI tutor chat (30/day rate limit)

### Other
- `GET /download/<id>` - Download attachment
- `POST /mentions/<id>/mark-read` - Mark mention read
- `POST /mentions/mark-all-read` - Mark all read

## Security

- Supabase Row Level Security (RLS) on all tables
- Owner/admin permissions for edit/delete
- File upload validation (extension + 16MB limit)
- Session auth with httponly cookies
- Rate limiting on AI endpoints (30/day chat, per-user)
- CSRF protection on all forms and AJAX

## Status

### Complete
- Note CRUD with attachments
- Likes, comments, @mentions
- Search, filter, sort, pagination
- AI summarizer
- AI tutor chat widget (floating, context-aware)
- PDF text extraction at upload
- "Post first" feed gate
- Blog system
- Auth (login, signup, password reset)
- Dark/light mode
- Full course catalog

### Pending
- Forum implementation
- Support/FAQ pages
- Production deployment

## License

MIT
