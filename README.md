# IlliNotes

**CS124 Honors Project - FA25-Group10**

A note-sharing web application for UIUC students. Users can post, search, and organize class notes by course.

## Features

### Notes
- Create, edit, and delete notes with titles and content
- Assign notes to courses (191 subjects, 2,000+ courses)
- File attachments: PDF, images, documents, presentations (up to 16MB)
- Tag notes with hashtags

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
- AI note summarizer (OpenAI GPT-4o-mini)
- Blog system (markdown posts)
- Dark/light mode toggle
- User profiles with display names

## Tech Stack

- **Backend**: Flask, SQLAlchemy, PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **AI**: OpenAI GPT-4o-mini
- **Email**: Resend API
- **Frontend**: Jinja2, HTML/CSS/JS, Phosphor Icons

## Project Structure

```
Illinotes/
├── app.py                       # Main Flask app (~2,000 lines)
├── courses.json                 # Course catalog (191 subjects)
├── requirements.txt
├── templates/
│   ├── landing.html             # Landing page
│   ├── index.html               # Notes feed
│   ├── blog.html, blog_post.html
│   ├── forum.html, support.html # Stubs (coming soon)
│   ├── philosophy.html, team.html
│   ├── profile.html, summarizer.html
│   ├── login.html, signup.html
│   ├── forgot_password.html, reset_password.html
│   └── notes_fragment.html      # AJAX fragment
├── static/
│   ├── turbolearn-darkmode.css  # Main styles
│   ├── landing-page.css, notes-page.css, figma-design.css
│   ├── theme-toggle.js, notes-page.js
│   └── images/
├── blog/                        # Markdown blog posts
└── uploads/                     # User uploads (gitignored)
```

## Database Models

- **Note**: id, author, title, body, class_code, user_id, tags, created
- **Attachment**: id, note_id, filename, original_filename, file_type
- **Like**: id, note_id, user_id, created
- **Comment**: id, note_id, author, body, user_id, created
- **Mention**: id, comment_id, note_id, mentioned_user_email, is_read
- **PasswordResetToken**: id, user_id, token, created, expires_at

## Setup

### Prerequisites
- Python 3.8+
- Supabase project (PostgreSQL + Auth)
- OpenAI API key
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
- `GET /notes` - Notes feed
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
- `GET /api/notes` - Paginated notes
- `POST /api/like/<id>` - Toggle like
- `POST /api/comment/<id>` - Add comment
- `POST /api/comment/<id>/edit` - Edit comment
- `POST /api/comment/<id>/delete` - Delete comment
- `POST /api/note/<id>/delete` - Delete note
- `POST /api/summarize` - Summarize text

### Other
- `GET /download/<id>` - Download attachment
- `POST /mentions/<id>/mark-read` - Mark mention read
- `POST /mentions/mark-all-read` - Mark all read

## Security

- Supabase Row Level Security (RLS) on all tables
- Owner/admin permissions for edit/delete
- File upload validation (extension + 16MB limit)
- Session auth with httponly cookies

## Status

### Complete
- Note CRUD with attachments
- Likes, comments, @mentions
- Search, filter, sort, pagination
- AI summarizer
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
