import React, { Component } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Link, Routes, NavLink } from 'react-router-dom';
import ProductPitch from './components/ProductPitch';
import HousingChart from './components/DoubleBarChart';
import DoubleRadarChart from './components/DoubleRadarChart';
import LineChartEmployment from './components/LineChartEmployment';
import LabourForceStats from './components/LabourForceStats';
import DateTime from './components/DateTime';
import { PageHero } from './components/PageHero';

interface AppState {
  showContactInfo: boolean;
  showCompletions: boolean;
  darkMode: boolean;
}

class App extends Component<{}, AppState> {
  public state: AppState = {
    showContactInfo: false,
    showCompletions: false,
    darkMode: false,
  };

  private readonly handleToggleDarkMode = (): void => {
    this.setState((prevState) => ({
      darkMode: !prevState.darkMode,
    }));
  };
  private readonly handleToggleView = (): void => {
    this.setState((prevState) => ({
      showCompletions: !prevState.showCompletions,
    }));
  };

  private getHousingTrendsHeroSrc(): string {
    const { darkMode, showCompletions } = this.state;
    if (darkMode) {
      return showCompletions ? './HCD.png' : './HSD.png';
    }
    return showCompletions ? './HC.png' : './HS.png';
  }

  public render(): React.JSX.Element {
    const { darkMode, showCompletions } = this.state;
    return (
      <Router>
        <main className={`min-h-screen w-screen overflow-x-hidden ${darkMode ? 'dark-mode' : ''}`}>
          <div className={`w-full px-0 ${darkMode ? 'main-content' : ''}`}>
            {/* ── Header ─────────────────────────────── */}
            <header className={`w-full px-4 sm:px-6 py-2.5 transition-colors sticky top-0 z-50 ${darkMode ? 'bg-[#1c1726]/90' : 'bg-[#f4f9fb]/90'}`}>
              <div className="w-full max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <Link to="/" className="flex-shrink-0">
                  <img
                    src={darkMode ? "./logoMetroDark.png" : "./logoMetro.webp"}
                    alt="Metropolitan Index"
                    className="h-10 w-auto sm:h-12 md:h-[60px] max-w-[min(200px,40vw)]"
                  />
                </Link>

                <nav className="min-w-0 flex-1 basis-[min(100%,280px)] md:basis-auto md:flex-[1_1_auto]">
                  <ul className="nav-links flex flex-wrap items-center justify-center gap-0.5 sm:gap-1">
                    <li><NavLink to="/types" className={({ isActive }) => `${darkMode ? 'dark-mode' : ''} ${isActive ? 'nav-active' : ''}`}>Types</NavLink></li>
                    <li><NavLink to="/completions-starts" className={({ isActive }) => `${darkMode ? 'dark-mode' : ''} ${isActive ? 'nav-active' : ''}`}>Trends</NavLink></li>
                    <li><NavLink to="/employment" className={({ isActive }) => `${darkMode ? 'dark-mode' : ''} ${isActive ? 'nav-active' : ''}`}>Employment</NavLink></li>
                    <li><NavLink to="/labour-force-stats" className={({ isActive }) => `${darkMode ? 'dark-mode' : ''} ${isActive ? 'nav-active' : ''}`}>Labour</NavLink></li>
                    <li><NavLink to="/contact" className={({ isActive }) => `${darkMode ? 'dark-mode' : ''} ${isActive ? 'nav-active' : ''}`}>Contact</NavLink></li>
                  </ul>
                </nav>

                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <button
                    onClick={this.handleToggleDarkMode}
                    className="dark-mode-toggle"
                    aria-label="Toggle dark mode"
                  >
                    {darkMode ? '☀️' : '🌙'}
                  </button>
                  <DateTime darkMode={darkMode} />
                </div>
              </div>
            </header>

            {/* ── Routes ─────────────────────────────── */}
            <Routes>
              <Route
                path="/"
                element={
                  <section className="my-0">
                    <PageHero
                      src={darkMode ? './darkmodeTitle.png' : './title.png'}
                      alt="Title"
                      imgClassName="max-h-[min(280px,68vw)] sm:max-h-[280px] w-auto max-w-[min(520px,90vw)]"
                    />
                    <ProductPitch darkMode={darkMode} />
                  </section>
                }
              />
              <Route
                path="/types"
                element={
                  <section className="py-6">
                    <PageHero
                      src={darkMode ? './HTD.png' : './HT.png'}
                      alt="Housing types"
                      imgClassName="max-h-[180px] sm:max-h-[210px] md:max-h-[230px]"
                    />
                    <div className="max-w-5xl mx-auto px-4 mt-4">
                      <DoubleRadarChart darkMode={darkMode} />
                    </div>
                  </section>
                }
              />
              <Route
                path="/completions-starts"
                element={
                  <section className="py-6">
                    <PageHero
                      src={this.getHousingTrendsHeroSrc()}
                      alt="Housing trends"
                      imgClassName={
                        showCompletions
                          ? 'max-h-[200px] sm:max-h-[260px] md:max-h-[280px]'
                          : 'max-h-[180px] sm:max-h-[210px] md:max-h-[230px]'
                      }
                    />
                    <div className="max-w-5xl mx-auto px-4 mt-4">
                      <HousingChart
                        darkMode={darkMode}
                        showCompletions={showCompletions}
                        onToggleView={this.handleToggleView}
                      />
                    </div>
                  </section>
                }
              />
              <Route
                path="/contact"
                element={
                  <section className="py-10 md:py-14 min-h-screen flex flex-col items-center px-4">
                    <PageHero
                      src={darkMode ? './CUD.png' : './CU.png'}
                      alt="Contact us"
                      imgClassName="max-h-[100px] sm:max-h-[140px] mb-6"
                    />
                    <div className="contact-info w-full max-w-md rounded-xl p-6 text-center border text-base md:text-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <img src={darkMode ? "./mailDark.png" : "./mailLight.png"} alt="Email" className="h-7 w-7" />
                        <a href="mailto:info@metropolitanindex.com" className={`hover:underline ${darkMode ? 'text-white' : 'text-[var(--color-primary)]'}`}>
                          info@metropolitanindex.com
                        </a>
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                        <img src={darkMode ? "./phoneDark.png" : "./phoneLight.png"} alt="Phone" className="h-7 w-7" />
                        <a href="tel:+11234567890" className={`hover:underline ${darkMode ? 'text-white' : 'text-[var(--color-primary)]'}`}>
                          (123) 456-7890
                        </a>
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                        <img src={darkMode ? "./instaDark.png" : "./instaLight.png"} alt="Instagram" className="h-7 w-7" />
                        <a href="https://www.instagram.com/bts.bighitofficial/?hl=en" className={`hover:underline ${darkMode ? 'text-white' : 'text-[var(--color-primary)]'}`}>
                          Follow Us For Updates
                        </a>
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                        <img src={darkMode ? './discordDark.png' : './discordLight.png'} alt="Discord" className="h-7 w-7" />
                        <a href="https://discord.gg/qXeEcnJyYA" className={`hover:underline ${darkMode ? 'text-white' : 'text-[var(--color-primary)]'}`}>
                          Join Our Discord
                        </a>
                      </div>
                    </div>
                  </section>
                }
              />
              <Route
                path="/employment"
                element={
                  <section className="py-6">
                    <PageHero
                      src={darkMode ? './employmentD.png' : './employment.png'}
                      alt="Employment"
                    />
                    <div className="max-w-5xl mx-auto px-4 mt-4">
                      <LineChartEmployment darkMode={darkMode} />
                    </div>
                  </section>
                }
              />
              <Route
                path="/labour-force-stats"
                element={
                  <section className="py-6">
                    <PageHero
                      src={darkMode ? './LFD.png' : './LF.png'}
                      alt="Labour force"
                    />
                    <div className="max-w-5xl mx-auto px-4 mt-4">
                      <LabourForceStats darkMode={darkMode} />
                    </div>
                  </section>
                }
              />
            </Routes>

            {/* ── Footer ─────────────────────────────── */}
            <footer className={`w-full px-4 py-6 text-center transition-colors ${darkMode ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-secondary)]'}`}>
              <p className="font-medium text-sm" style={{ fontFamily: 'var(--font-display)' }}>&copy; 2025 Metropolitan Index. All Rights Reserved.</p>
              <div className="social-links">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              </div>
            </footer>
          </div>
        </main>
      </Router>
    );
  }
}

export default App;
