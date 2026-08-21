import { useEffect, useRef, useState } from "react";
import "./App.css";

type LearningApp = {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  url: string;
  status: "Disponible" | "Próximamente";
  image?: string;
};

const learningApps: LearningApp[] = [
  {
    id: "codespeak",
    name: "CodeSpeak English",
    category: "English for IT",
    description:
      "Inglés práctico para profesionales de tecnología. Entrena verbos, expresiones, vocabulario, trivia y comunicación aplicada al trabajo.",
    tags: ["IT English", "Práctica", "Gamificación", "Coach IT"],
    url: "https://app.codespeak.tizapp.fun/",
    status: "Disponible",
    image: "",
  },
  {
    id: "gran-caldas",
    name: "Gran Caldas Escuela Nueva",
    category: "Educación solidaria",
    description:
      "Plataforma educativa para mantener activo el proceso de enseñanza-aprendizaje en primaria durante contingencias o reconstrucción.",
    tags: ["Primaria", "Escuela Nueva", "PWA", "Solidaria"],
    url: "https://grancaldasescuelanueva.tizapp.fun/",
    status: "Disponible",
    image: "/gran-caldas-mountain.png",
  },
];

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState(window.location.hash || "#inicio");
  const menuAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 820) {
        setIsMenuOpen(false);
      }
    };

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        menuAreaRef.current &&
        !menuAreaRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleHashChange = () => {
      setCurrentHash(window.location.hash || "#inicio");
      setIsMenuOpen(false);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("hashchange", handleHashChange);
    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("hashchange", handleHashChange);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const isAboutPage = currentHash === "#/sobre-mi";

  if (isAboutPage) {
    return (
      <div className="site-shell">
        <header className="site-header">
          <div className="header-inner">
            <a className="brand" href="#inicio" aria-label="Ir al inicio">
              <span className="brand-mark">
                <img
                  src="/felix-logo.png"
                  alt="Logo de Félix Cancelado"
                />
              </span>

              <span className="brand-copy">
                <strong>Félix Cancelado</strong>
                <small>Educación + Tecnología</small>
              </span>
            </a>

            <nav className="desktop-nav" aria-label="Navegación principal">
              <a href="#inicio">Inicio</a>
              <a href="#apps">Mis apps</a>
              <a href="#/sobre-mi">Sobre mí</a>
              <a href="#contacto">Contacto</a>
            </nav>

            <div className="mobile-menu-area" ref={menuAreaRef}>
              <button
                className={`mobile-menu-button ${isMenuOpen ? "mobile-menu-button-open" : ""}`}
                type="button"
                aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-navigation-about"
                onClick={() => setIsMenuOpen((current) => !current)}
              >
                <span />
                <span />
                <span />
              </button>

              <nav
                id="mobile-navigation-about"
                className={`mobile-nav ${isMenuOpen ? "mobile-nav-open" : ""}`}
                aria-label="Navegación móvil"
              >
                <a href="#inicio" onClick={() => setIsMenuOpen(false)}>
                  Inicio
                </a>
                <a href="#apps" onClick={() => setIsMenuOpen(false)}>
                  Mis apps
                </a>
                <a href="#/sobre-mi" onClick={() => setIsMenuOpen(false)}>
                  Sobre mí
                </a>
                <a href="#contacto" onClick={() => setIsMenuOpen(false)}>
                  Contacto
                </a>
              </nav>
            </div>
          </div>
        </header>

        <main>
          <section className="about-page">
            <nav className="breadcrumbs" aria-label="Ruta de navegación">
              <a href="#inicio">Inicio</a>
              <span>/</span>
              <strong>Sobre mí</strong>
            </nav>

            <section className="about-section about-section-page">
              <div className="about-heading">
                <p className="section-kicker">Sobre mí</p>
                <h2>Comunicación, educación y productos digitales.</h2>
              </div>

              <div className="about-copy">
                <p>
                  Soy Félix Cancelado, comunicador social, diseñador instruccional
                  y creador de experiencias educativas digitales.
                </p>

                <p>
                  Diseño aplicaciones prácticas, visuales y accesibles para que
                  personas, familias, docentes e instituciones puedan aprender con
                  tecnología.
                </p>
              </div>
            </section>
          </section>
        </main>

        <footer className="site-footer">
          <span>© {new Date().getFullYear()} Félix Cancelado</span>
          <span>Educación + Tecnología</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#inicio" aria-label="Ir al inicio">
            <span className="brand-mark">
              <img
                src="/felix-logo.png"
                alt="Logo de Félix Cancelado"
              />
            </span>

            <span className="brand-copy">
              <strong>Félix Cancelado</strong>
              <small>Educación + Tecnología</small>
            </span>
          </a>

          <nav className="desktop-nav" aria-label="Navegación principal">
            <a href="#inicio">Inicio</a>
            <a href="#apps">Mis apps</a>
            <a href="#/sobre-mi">Sobre mí</a>
            <a href="#contacto">Contacto</a>
          </nav>

          <div className="mobile-menu-area" ref={menuAreaRef}>
            <button
              className={`mobile-menu-button ${
                isMenuOpen ? "mobile-menu-button-open" : ""
              }`}
              type="button"
              aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              <span />
              <span />
              <span />
            </button>

            <nav
              id="mobile-navigation"
              className={`mobile-nav ${
                isMenuOpen ? "mobile-nav-open" : ""
              }`}
              aria-label="Navegación móvil"
            >
              <a href="#inicio" onClick={() => setIsMenuOpen(false)}>
                Inicio
              </a>
              <a href="#apps" onClick={() => setIsMenuOpen(false)}>
                Mis apps
              </a>
              <a href="#/sobre-mi" onClick={() => setIsMenuOpen(false)}>
                Sobre mí
              </a>
              <a href="#contacto" onClick={() => setIsMenuOpen(false)}>
                Contacto
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-overlay" />

          <div className="hero-content">
            <p className="section-kicker">Educación + tecnología</p>

            <h1>
              Inglés con propósitos
              <span> profesionales.</span>
            </h1>

            <p className="hero-description">
              Desarrollo experiencias digitales para aprender inglés,
              fortalecer habilidades profesionales y transformar la educación
              mediante la tecnología.
            </p>

            <a className="primary-button" href="#apps">
              <span>Explorar mis aplicaciones</span>
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>

        <section className="apps-section" id="apps">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Mis aplicaciones</p>
              <h2>Experiencias de aprendizaje listas para usar.</h2>
            </div>


          </div>

          <div className="apps-grid">
            {learningApps.map((app) => (
              <a
                className="app-card"
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                key={app.id}
                aria-label={`Entrar a ${app.name}`}
              >
                <div className="app-card-top">
                  <div className="card-grid-pattern" />

                  <div className="app-status">
                    <span className="status-dot" />
                    {app.status}
                  </div>

                  {app.image ? (
                    <img
                      className="app-image"
                      src={app.image}
                      alt={app.name}
                    />
                  ) : (
                    <>
                      <div className="codespeak-logo">
                        <span className="code-symbol">&lt;/&gt;</span>
                        <strong>CS</strong>
                      </div>

                      <div className="speech-bubble">
                        <span>&lt;/&gt;</span>
                        <strong>
                          I speak <em>code.</em>
                          <br />
                          I speak <em>English.</em>
                        </strong>
                      </div>
                    </>
                  )}
                </div>

                <div className="app-card-body">
                  <p className="app-category">{app.category}</p>
                  <h3>{app.name}</h3>
                  <p className="app-description">{app.description}</p>

                  <div className="app-tags">
                    {app.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>

                  <div className="app-card-action">
                    <span>Entrar a {app.name}</span>
                    <span className="action-arrow" aria-hidden="true">
                      →
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="contact-section" id="contacto">
          <div>
            <p className="section-kicker">Contacto</p>
            <h2>Construyamos nuevas formas de aprender.</h2>
          </div>

          <a
            className="contact-button"
            href="mailto:felixcancelado@gmail.com"
          >
            <span>felixcancelado@gmail.com</span>
            <span aria-hidden="true">→</span>
          </a>
        </section>
      </main>

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Félix Cancelado</span>
        <span>Educación + Tecnología</span>
      </footer>
    </div>
  );
}

export default App;









