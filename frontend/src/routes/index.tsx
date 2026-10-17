import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calculator,
  ChevronDown,
  Facebook,
  Grid3X3,
  Instagram,
  Linkedin,
  Menu,
  Music2,
  X,
} from "lucide-react";
import { useState } from "react";
import heroImage from "@/assets/investing-app-hero.jpg";
import helpImage from "@/assets/help-investor.jpg";
import { brokerPartners } from "@/lib/broker-partners";
import { listedCompanies } from "@/lib/listed-companies";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EasyEquities | Investing Made Easy" },
      {
        name: "description",
        content:
          "Invest locally and internationally with EasyEquities, EasyProperties, EasyETFs, and EasyCrypto.",
      },
      { property: "og:title", content: "EasyEquities | Investing Made Easy" },
      {
        property: "og:description",
        content: "Kickstart your investment journey with simple, accessible investing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const cards = [
  {
    logo: <BrandLogo compact />,
    title: "Managed or DIY",
    body: "Do investing your way. Whether you're looking to build your own portfolio of shares or invest in a manged bundle, unit trust or ETF.",
  },
  {
    logo: <ProductLogo icon="▥" name="Easy" suffix="Properties" />,
    title: "Be a property mogul",
    body: "EasyProperties takes away the hassle and admin that comes with being a landlord, and gives you the simplicity of being... an investor",
  },
  {
    logo: <ProductLogo icon="▤" name="Easy" suffix="ETFs" orange />,
    title: "Exchange Traded Funds",
    body: "A unique platform created to help you find the best ETF for you! Check out and compare the top performing and most popular ETFs.",
  },
  {
    logo: <ProductLogo icon="▦" name="Easy" suffix="Crypto" />,
    title: "Get your Crypto on",
    body: "Build your crypto portfolio with the top coins and hand-crafted bundles. A secure custody solution ensures the highest level of digital security.",
  },
];

const legalLinks = [
  "Terms & Conditions",
  "Terms of Use",
  "Privacy Policy",
  "Complaints Process",
  "Fraud Process",
  "FAIS Disclosure",
  "Access to Info Manual",
  "Cost Profile",
];

const investmentOptions = [...brokerPartners, ...listedCompanies];

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-logo ${compact ? "brand-logo-small" : ""}`}>
      <span className="brand-logo-icon" aria-hidden="true">
        <Calculator />
      </span>
      <span className="brand-logo-strong">Easy</span>
      <span className="brand-logo-light">Equities</span>
    </span>
  );
}

function ProductLogo({
  icon,
  name,
  suffix,
  orange = false,
}: {
  icon: string;
  name: string;
  suffix: string;
  orange?: boolean;
}) {
  return (
    <span className="product-logo">
      <span className="product-icon">{icon}</span>
      <span className="brand-logo-strong">{name}</span>
      <span className={orange ? "product-orange" : "brand-logo-light"}>{suffix}</span>
    </span>
  );
}

function Index() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="site-header">
        <a href="#top" aria-label="EasyEquities home">
          <BrandLogo />
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link to="/register">
            Get Started <ChevronDown />
          </Link>
          <a href="#journey">
            Invest <ChevronDown />
          </a>
          <a href="#help">
            Resources <ChevronDown />
          </a>
          <a href="#journey">
            <Grid3X3 className="apps-icon" /> EasyApps <ChevronDown />
          </a>
          <a href="#about">About</a>
          <a href="#help">
            Support <ChevronDown />
          </a>
        </nav>
        <div className="account-actions">
          <Link className="login-link" to="/login">
            Login
          </Link>
          <Link className="register-link" to="/register">
            Register
          </Link>
        </div>
        <button
          className="menu-button"
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        {menuOpen && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            <Link to="/register" onClick={() => setMenuOpen(false)}>
              Get Started
            </Link>
            <a href="#journey" onClick={() => setMenuOpen(false)}>
              Invest
            </a>
            <a href="#help" onClick={() => setMenuOpen(false)}>
              Resources
            </a>
            <a href="#journey" onClick={() => setMenuOpen(false)}>
              EasyApps
            </a>
            <a href="#about" onClick={() => setMenuOpen(false)}>
              About
            </a>
            <a href="#help" onClick={() => setMenuOpen(false)}>
              Support
            </a>
            <Link to="/login" onClick={() => setMenuOpen(false)}>
              Login
            </Link>
            <Link className="register-link" to="/register" onClick={() => setMenuOpen(false)}>
              Register
            </Link>
          </nav>
        )}
      </header>

      <section id="top" className="hero-section">
        <img
          src={heroImage}
          alt="Colourful lunch boxes arranged on a purple background"
          width={1600}
          height={900}
        />
        <div className="hero-content">
          <h1>
            We’ve got the app
            <br />
            for you!
          </h1>
          <p>
            Local and international markets, along with all the
            <br className="desktop-break" /> investing features that you love, at your fingertips.
            <br className="desktop-break" /> Literally.
          </p>
        </div>
        <div className="hero-shapes" aria-hidden="true">
          <span className="shape-dot shape-teal" />
          <span className="shape-dot shape-pink" />
          <span className="shape-ring shape-orange" />
          <span className="shape-square" />
        </div>
      </section>

      <section id="journey" className="journey-section">
        <h2>Kickstart your investment journey</h2>
        <div className="journey-grid">
          {cards.map((card, index) => (
            <article
              className={`journey-card ${index === 3 ? "crypto-card" : ""}`}
              key={card.title}
            >
              <div className="card-logo">{card.logo}</div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="partners-heading" className="border-y border-border bg-card py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-10 max-w-2xl px-6 text-center sm:px-10">
            <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.18em] text-primary">
              Invest with confidence
            </p>
            <h2 id="partners-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
              Investment partners &amp; popular companies
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Explore the platforms and companies available to investors.
            </p>
          </div>
          <div className="partner-marquee-viewport">
            <div className="partner-marquee-track">
              {[0, 1].map((copy) => (
                <ul key={copy} aria-hidden={copy === 1} className="partner-marquee-group">
                  {investmentOptions.map((option) => (
                    <li className="partner-marquee-card" key={option.name}>
                      {option.logo ? (
                        <img
                          src={option.logo}
                          alt={"logoAlt" in option ? option.logoAlt : `${option.name} logo`}
                          loading="lazy"
                          className="partner-marquee-logo"
                        />
                      ) : (
                        <span aria-hidden="true" className="partner-marquee-wordmark">
                          {option.name}
                        </span>
                      )}
                      <span className="partner-marquee-name">{option.name}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="help" className="help-section">
        <div className="help-photo">
          <img
            src={helpImage}
            alt="Investor smiling while using a tablet"
            loading="lazy"
            width={1200}
            height={900}
          />
          <span className="help-ring ring-left" aria-hidden="true" />
          <span className="help-ring ring-right" aria-hidden="true" />
        </div>
        <div className="help-copy">
          <h2>Let Us Help You, Help Yourself</h2>
          <p>
            If you’re just getting started and don’t know where to begin, fear not. We have an
            amazing FAQ portal with answers to any of the questions you might have, as well as a
            spread of helpful how-to videos on our YouTube channel.
          </p>
          <a className="faq-link" href="#faq">
            Check out FAQ&apos;s
          </a>
        </div>
      </section>

      <footer id="about" className="site-footer">
        <div className="footer-top">
          <BrandLogo />
          <div className="footer-brands">
            <span className="purple-group">
              <span className="purple-ring" /> PURPLE GROUP <small>LIMITED</small>
            </span>
            <div className="social-links" aria-label="Social media">
              <a href="#facebook" aria-label="Facebook">
                <Facebook />
              </a>
              <a href="#x" aria-label="X">
                <X />
              </a>
              <a href="#linkedin" aria-label="LinkedIn">
                <Linkedin />
              </a>
              <a href="#instagram" aria-label="Instagram">
                <Instagram />
              </a>
              <a href="#tiktok" aria-label="TikTok">
                <Music2 />
              </a>
            </div>
            <div className="store-links">
              <a href="#app-store">
                <span className="store-icon">●</span>
                <span>
                  <small>Download on the</small>App Store
                </span>
              </a>
              <a href="#google-play">
                <span className="play-icon">▶</span>
                <span>
                  <small>GET IT ON</small>Google Play
                </span>
              </a>
            </div>
          </div>
        </div>
        <div className="legal-copy">
          <p>
            ©️ EasyEquities. EasyEquities is a product of First World Trader (Pty) Ltd t/a
            EasyEquities which is an authorized financial services provider (FSP 22588), a
            registered credit provider (NCRCP12294) and a licensed over-the-counter derivatives
            provider (ODP 44). All trades on the EasyEquities platform are subject to the legal
            terms and conditions to which you agree to be bound. The EasyEquities platform enables
            users to invest in securities which includes whole shares and fractional security rights
            (FSRs). EasyEquities acts as an agent for the issue of whole shares, where the investor
            is the registered owner of those shares, entitled to dividends, participation in
            corporate actions and all the economic benefits and risks associated with share
            ownership. In respect of FSRs, EasyEquities acts as principal to a contract for
            difference issued to the investor, where the investor will have a contractual claim
            against EasyEquities to the economic benefits and risks associated with share ownership
            (price movements and dividends) without having ownership rights in the underlying share.
            Fractional share rights (FSRs) which are issued through a contract for difference, are
            an over the counter derivative. Unlike whole shares, FSRs do not carry any voting
            rights. As the investor makes further investments in FSRs and ultimately ends up with a
            whole share, the contract for difference is closed out and ownership whole share is
            delivered to the investor. The availability of any share on the EasyEquities platform is
            based on various factors but is not an indication of value and does not mean that any
            share is an appropriate investment for you. Images are for illustrative purposes only
            and past performance is not necessarily an indication of future performance. The
            availability of any share on the browse shares page does not necessarily indicate any
            contractual relationship between EasyEquities and the listed company, or the payment of
            fees for services. Brand Logos are owned by the respective companies and not by
            EasyEquities. The use of a company’s brand logo does not represent an endorsement of
            EasyEquities by the company, nor an endorsement of the company by EasyEquities, nor does
            it necessarily imply any contractual relationship. Further investment disclosures are
            available on the EasyEquities website.* Note exchange prices are delayed in accordance
            with regional exchange rules. South African prices are delayed by 15 minutes; North{" "}
            <Link
              to="/admin"
              aria-label="Open admin sign in"
              className="text-inherit no-underline hover:text-inherit"
            >
              American
            </Link>{" "}
            prices are delayed by 15 minutes; Australian prices are delayed by 20 minutes.
            EasyEquities is a subsidiary of Purple Group Limited, a company listed on the JSE
            Limited (PPE).
          </p>
        </div>
        <nav className="legal-links" aria-label="Legal navigation">
          {legalLinks.map((item) => (
            <a href={`#${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>
              {item}
            </a>
          ))}
        </nav>
      </footer>
    </main>
  );
}
