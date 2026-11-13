# Personal site

Plain HTML/CSS. No build step. Hosted on GitHub Pages.

- `index.html` is the About page (and the homepage).
- `work.html`, `books.html`, `films.html`, `blog.html` are the other pages. Look for `<!-- EDIT -->` comments.
- `style.css` has the colors at the top under `:root`.
- `posts/` holds one HTML file per blog post. Copy `first-post.html` to start a new one.
- `about.html` just forwards old links to the homepage.

- `_build_books.py` does the same for Books.
- `_build_films.py` holds the ranked film list. Reorder or edit it, then run `python3 _build_films.py` to rebuild the Films pages.
