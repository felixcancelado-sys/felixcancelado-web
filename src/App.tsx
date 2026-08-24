import { useEffect, useRef, useState } from "react";
import "./App.css";
import { PanelPage } from "./PanelPage";

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
      "Inglés práctico para profesionales de tecnología. Entrena vocabulario, expresiones y comunicación aplicada a situaciones reales de trabajo.",
    tags: ["IT English", "Práctica", "Gamificación", "Coach IT"],
    url: "https://app.codespeak.tizapp.fun/",
    status: "Disponible",
    image: "",
  },
  {
    id: "gran-caldas",
    name: "Gran Caldas",
    category: "Educación solidaria",
    description:
      "Educación primaria para situaciones de contingencia. Ofrece actividades, acompañamiento y continuidad del aprendizaje durante la reconstrucción.",
    tags: ["Primaria", "Escuela Nueva", "PWA", "Solidaria"],
    url: "https://grancaldasescuelanueva.tizapp.fun/",
    status: "Disponible",
    image: "/gran-caldas-mountain.png",
  },
];

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm17 2.24-7.45 6.2a1 1 0 0 1-1.1 0L4 7.24V17h16V7.24ZM18.43 7H5.57L12 12.36 18.43 7Z"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.04 2A9.84 9.84 0 0 0 3.6 16.91L2 22l5.22-1.54A9.86 9.86 0 1 0 12.04 2Zm0 17.72a7.83 7.83 0 0 1-4-1.1l-.29-.17-3.1.92.95-3.02-.19-.31a7.84 7.84 0 1 1 6.63 3.68Zm4.3-5.87c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.61.77-.74.93-.14.16-.28.18-.52.06-.24-.12-.99-.37-1.89-1.16a7.1 7.1 0 0 1-1.3-1.62c-.14-.24-.02-.36.1-.48.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.77-.19-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.59 4.1 3.63.57.25 1.02.4 1.37.51.58.18 1.1.16 1.52.1.46-.07 1.4-.57 1.6-1.13.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"
      />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.12C19.53 3.5 12 3.5 12 3.5s-7.53 0-9.4.58A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12C4.47 20.5 12 20.5 12 20.5s7.53 0 9.4-.58a3 3 0 0 0 2.1-2.12A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8ZM9.6 15.58V8.42L15.82 12 9.6 15.58Z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm9.75 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
      />
    </svg>
  );
}

function FooterSocialLinks() {
  return (
    <div className="footer-socials">
      <a
        className="footer-social footer-social-whatsapp"
        href="https://wa.me/5491150514466"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        title="WhatsApp"
      >
        <WhatsAppIcon />
      </a>

      <a
        className="footer-social footer-social-youtube"
        href="https://www.youtube.com/@felixcancelado"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="YouTube de Félix Cancelado"
        title="YouTube"
      >
        <YouTubeIcon />
      </a>

      <a
        className="footer-social footer-social-instagram"
        href="https://www.instagram.com/felix.cancelado/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram de Félix Cancelado"
        title="Instagram"
      >
        <InstagramIcon />
      </a>
    </div>
  );
}
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
  const isContactPage = currentHash === "#/contacto";
  const isPanelPage = currentHash === "#/panel";

  if (isPanelPage) {
    return <PanelPage />;
  }

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
              <a href="#/contacto">Contacto</a>
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
                <a href="#/contacto" onClick={() => setIsMenuOpen(false)}>
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
          <FooterSocialLinks />
        </footer>
      </div>
    );
  }

  if (isContactPage) {
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
              <a href="#/contacto">Contacto</a>
            </nav>

            <div className="mobile-menu-area" ref={menuAreaRef}>
              <button
                className={`mobile-menu-button ${isMenuOpen ? "mobile-menu-button-open" : ""}`}
                type="button"
                aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-navigation-contact"
                onClick={() => setIsMenuOpen((current) => !current)}
              >
                <span />
                <span />
                <span />
              </button>

              <nav
                id="mobile-navigation-contact"
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
                <a href="#/contacto" onClick={() => setIsMenuOpen(false)}>
                  Contacto
                </a>
              </nav>
            </div>
          </div>
        </header>

        <main>
          <section className="contact-page">
            <nav className="breadcrumbs" aria-label="Ruta de navegación">
              <a href="#inicio">Inicio</a>
              <span>/</span>
              <strong>Contacto</strong>
            </nav>

            <section className="contact-section contact-section-page">
              <div>
                <p className="section-kicker">Contacto</p>
                <h2>Construyamos nuevas formas de aprender.</h2>
              </div>

              <div className="contact-actions">
                <a
                  className="contact-button"
                  href="mailto:felixcancelado@gmail.com"
                  aria-label="Enviar email a Félix Cancelado"
                >
                  <span className="contact-channel-main">
                    <span className="contact-brand-icon contact-brand-email">
                      <MailIcon />
                    </span>

                    <span className="contact-channel-copy">
                      <strong>Email</strong>
                      <small>felixcancelado@gmail.com</small>
                    </span>
                  </span>

                  <span aria-hidden="true">→</span>
                </a>

                <a
                  className="contact-button contact-button-whatsapp"
                  href="https://wa.me/5491150514466"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Contactar a Félix Cancelado por WhatsApp"
                >
                  <span className="contact-channel-main">
                    <span className="contact-brand-icon contact-brand-whatsapp">
                      <WhatsAppIcon />
                    </span>

                    <span className="contact-channel-copy">
                      <strong>WhatsApp</strong>
                      <small>+54 9 11 5051-4466</small>
                    </span>
                  </span>

                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </section>

            <section className="social-section">
              <div className="social-heading">
                <p className="section-kicker">Redes sociales</p>
                <h2>También puedes encontrarme aquí.</h2>
              </div>

              <div className="social-links">
                <a
                  className="social-link"
                  href="https://www.youtube.com/@felixcancelado"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ir al canal de YouTube de Félix Cancelado"
                >
                  <span className="social-channel-main">
                    <span className="contact-brand-icon contact-brand-youtube">
                      <YouTubeIcon />
                    </span>

                    <span className="social-channel-copy">
                      <strong>YouTube</strong>
                      <small>@felixcancelado</small>
                    </span>
                  </span>

                  <span aria-hidden="true">→</span>
                </a>

                <a
                  className="social-link"
                  href="https://www.instagram.com/felix.cancelado/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ir al Instagram de Félix Cancelado"
                >
                  <span className="social-channel-main">
                    <span className="contact-brand-icon contact-brand-instagram">
                      <InstagramIcon />
                    </span>

                    <span className="social-channel-copy">
                      <strong>Instagram</strong>
                      <small>@felix.cancelado</small>
                    </span>
                  </span>

                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </section>
          </section>
        </main>

        <footer className="site-footer">
          <span>© {new Date().getFullYear()} Félix Cancelado</span>
          <FooterSocialLinks />
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
            <a href="#/contacto">Contacto</a>
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
              <a href="#/contacto" onClick={() => setIsMenuOpen(false)}>
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
              Desarrollo experiencias digitales para aprender Inglés,
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

      </main>

      <footer className="site-footer">
          <span>© {new Date().getFullYear()} Félix Cancelado</span>
          <FooterSocialLinks />
        </footer>
    </div>
  );
}

export default App;












