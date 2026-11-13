"""
Builds films.html and every page in films/ from the list below.

To re-rank: move a film's block up or down. Its position = its rank.
To add your opinion: fill in "take".
To add a film: copy a block, put its poster in images/films/<slug>.jpg.
Then run:   python3 _build_films.py
(GitHub Pages skips files starting with "_", so this script is never published.)
"""
import html, os

FILMS = [
    dict(slug="the-namesake", title="The Namesake", by="Mira Nair", year="2006",
         cast="Kal Penn, Tabu, Irrfan Khan",
         plot="A Bengali family settles in America, and their son grows up caught between two worlds. Based on Jhumpa Lahiri's novel.",
         take=""),
    dict(slug="dexter", title="Dexter", by="Series, created by James Manos Jr.", year="2006–2013",
         cast="Michael C. Hall, Jennifer Carpenter, David Zayas",
         plot="A Miami police blood-spatter analyst lives a double life as a serial killer who only hunts other killers.",
         take=""),
    dict(slug="the-social-network", title="The Social Network", by="David Fincher", year="2010",
         cast="Jesse Eisenberg, Andrew Garfield, Justin Timberlake",
         plot="The founding of Facebook, told through the lawsuits that followed it.",
         take=""),
    dict(slug="the-dark-knight", title="The Dark Knight", by="Christopher Nolan", year="2008",
         cast="Christian Bale, Heath Ledger, Aaron Eckhart",
         plot="Batman meets the Joker, an agent of chaos who pushes Gotham and everyone protecting it to break their own rules.",
         take=""),
    dict(slug="fight-club", title="Fight Club", by="David Fincher", year="1999",
         cast="Edward Norton, Brad Pitt, Helena Bonham Carter",
         plot="An insomniac office worker and a reckless soap salesman start an underground fight club that grows into something far more dangerous.",
         take=""),
    dict(slug="schindlers-list", title="Schindler's List", by="Steven Spielberg", year="1993",
         cast="Liam Neeson, Ralph Fiennes, Ben Kingsley",
         plot="A German businessman in occupied Poland saves more than a thousand Jewish workers from the Holocaust by keeping them in his factories.",
         take=""),
    dict(slug="black-friday", title="Black Friday", by="Anurag Kashyap", year="2004",
         cast="Kay Kay Menon, Pavan Malhotra, Aditya Srivastava",
         plot="A step-by-step retelling of the 1993 Bombay bombings and the police hunt that followed, based on S. Hussain Zaidi's book.",
         take=""),
    dict(slug="taxi-driver", title="Taxi Driver", by="Martin Scorsese", year="1976",
         cast="Robert De Niro, Jodie Foster, Cybill Shepherd",
         plot="A lonely veteran driving a night cab through New York slowly slides toward violence.",
         take=""),
    dict(slug="gulaal", title="Gulaal", by="Anurag Kashyap", year="2009",
         cast="Raj Singh Chaudhary, Kay Kay Menon, Abhimanyu Singh",
         plot="A quiet law student in Rajasthan gets pulled into campus elections and a violent movement to bring back a Rajput kingdom.",
         take=""),
    dict(slug="ugly", title="Ugly", by="Anurag Kashyap", year="2014",
         cast="Rahul Bhat, Ronit Roy, Tejaswini Kolhapure",
         plot="A young girl goes missing in Mumbai, and the adults around her care more about what they can gain from it than about finding her.",
         take=""),
    dict(slug="badlapur", title="Badlapur", by="Sriram Raghavan", year="2015",
         cast="Varun Dhawan, Nawazuddin Siddiqui, Huma Qureshi",
         plot="After his wife and son are killed during a bank robbery, a man spends fifteen years waiting for revenge.",
         take=""),
    dict(slug="ab-tak-chhappan", title="Ab Tak Chhappan", by="Shimit Amin", year="2004",
         cast="Nana Patekar, Revathi, Mohan Agashe",
         plot="A Mumbai encounter specialist with 56 kills to his name finds the system he served turning against him.",
         take=""),
    dict(slug="the-gangster-the-cop-the-devil", title="The Gangster, the Cop, the Devil", by="Lee Won-tae", year="2019",
         cast="Ma Dong-seok, Kim Moo-yul, Kim Sung-kyu",
         plot="A crime boss survives an attack by a serial killer and teams up with a detective to hunt the killer down.",
         take=""),
    dict(slug="dev-d", title="Dev.D", by="Anurag Kashyap", year="2009",
         cast="Abhay Deol, Mahie Gill, Kalki Koechlin",
         plot="A modern, drug-soaked retelling of Devdas, set in Punjab and Delhi.",
         take=""),
    dict(slug="that-girl-in-yellow-boots", title="That Girl in Yellow Boots", by="Anurag Kashyap", year="2011",
         cast="Kalki Koechlin, Naseeruddin Shah, Prashant Prakash",
         plot="A young British woman comes to Mumbai to find the father she never knew, and survives the city while she searches.",
         take=""),
    dict(slug="the-roundup", title="The Roundup", by="Lee Sang-yong", year="2022",
         cast="Ma Dong-seok, Son Suk-ku, Choi Gwi-hwa",
         plot="Detective Ma Seok-do flies to Vietnam to bring back a suspect and ends up chasing a killer who preys on Korean tourists.",
         take=""),
    dict(slug="no-smoking", title="No Smoking", by="Anurag Kashyap", year="2007",
         cast="John Abraham, Ayesha Takia, Paresh Rawal",
         plot="A chain-smoker signs up with a mysterious clinic that promises to make him quit, and its methods turn sinister. Loosely inspired by Stephen King's story Quitters, Inc.",
         take=""),
    dict(slug="shagird", title="Shagird", by="Tigmanshu Dhulia", year="2011",
         cast="Nana Patekar, Mohit Ahlawat, Anurag Kashyap",
         plot="A corrupt Delhi police officer takes a young recruit under his wing and shows him how the city really works.",
         take=""),
    dict(slug="tirangaa", title="Tirangaa", by="Mehul Kumar", year="1993",
         cast="Raaj Kumar, Nana Patekar, Varsha Usgaonkar",
         plot="An army brigadier and a hot-headed police inspector join forces to stop a terrorist plot.",
         take=""),
    dict(slug="obsession", title="Obsession", by="Curry Barker", year="2026",
         cast="Michael Johnston, Inde Navarrette, Cooper Tomlinson",
         plot="A hopeless romantic wishes for his longtime crush to fall in love with him, and the wish comes true in the worst possible way.",
         take=""),
]

ROOT = os.path.dirname(os.path.abspath(__file__))
e = html.escape


def head(title, css):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)} · Shreshta Sinha</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{css}">
</head>
<body>
<div class="wrap">
  <aside class="side"><nav>
    <a href="{css[:-9]}index.html">About</a>
    <a href="{css[:-9]}work.html">Work</a>
    <a href="{css[:-9]}books.html">Books</a>
    <a href="{css[:-9]}films.html" class="on">Films</a>
    <a href="{css[:-9]}blog.html">Blog</a>
  </nav></aside>
"""


TAIL = "</div>\n</body>\n</html>\n"


def poster(f, prefix, cls):
    if f.get("poster", True) is None:  # no image: a plain title card instead
        return f'<div class="{cls} card-poster" style="--c:{f.get("color", "#1d1d1f")}">{e(f["title"])}</div>'
    return f'<img class="{cls}" src="{prefix}images/films/{f["slug"]}.jpg" alt="{e(f["title"])} poster">'


def meta(f):
    return " · ".join(x for x in (f["by"], f["year"]) if x)


def build():
    items = []
    for i, f in enumerate(FILMS, 1):
        items.append(f"""    <a class="item ranked" href="films/{f['slug']}.html">
      <i class="rank">{i:02d}</i>
      {poster(f, "", "thumb")}
      <div><b>{e(f['title'])}</b><span>{e(meta(f))}</span></div>
    </a>""")
    with open(os.path.join(ROOT, "films.html"), "w") as out:
        out.write(head("Films", "style.css") + """
  <!-- This page is generated by _build_films.py. Edit the list there, then run it. -->
  <main class="list">
    <p class="quiet intro">Ranked. Favorites first.</p>
""" + "\n".join(items) + "\n  </main>\n" + TAIL)

    os.makedirs(os.path.join(ROOT, "films"), exist_ok=True)
    n = len(FILMS)
    for i, f in enumerate(FILMS):
        prev_, next_ = FILMS[i - 1], FILMS[(i + 1) % n]
        take = e(f["take"]) if f["take"] else '<span class="quiet">Coming soon.</span>'
        cast = f'<p class="quiet">{e(f["cast"])}</p>' if f["cast"] else ""
        plot = f"<p>{e(f['plot'])}</p>" if f["plot"] else ""
        with open(os.path.join(ROOT, "films", f["slug"] + ".html"), "w") as out:
            out.write(head(f["title"], "../style.css") + f"""
  <main class="film">
    <a class="back" href="../films.html">← Films</a>
    <div class="film-top">
      {poster(f, "../", "big")}
      <div>
        <p class="rank-big">#{i + 1} of {n}</p>
        <h1>{e(f['title'])}</h1>
        <p class="quiet">{e(meta(f))}</p>
        {cast}
      </div>
    </div>

    {plot}

    <h2>My take</h2>
    <p>{take}</p>

    <nav class="pager">
      <a class="u" href="{prev_['slug']}.html">← {e(prev_['title'])}</a>
      <a class="u" href="{next_['slug']}.html">{e(next_['title'])} →</a>
    </nav>
  </main>
""" + TAIL)
    print(f"built films.html and {n} film pages")


if __name__ == "__main__":
    build()
