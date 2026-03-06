import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import AdminPanel from "./pages/AdminPanel.tsx";
import ExplorePage from "./pages/ExplorePage.tsx";
import MapPage from "./pages/MapPage.tsx";
import PartiesPage from "./pages/PartiesPage.tsx";
import CandidatesPage from "./pages/CandidatesPage.tsx";
import AboutPage from "./pages/AboutPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import ContactPage from "./pages/ContactPage.tsx";
import CandidateDetailPage from "./pages/CandidateDetailPage.tsx";
import PartyPage from "./pages/PartyPage.tsx";
import PartyConstituenciesPage from "./pages/PartyConstituenciesPage.tsx";
import ConstituencyPage from "./pages/ConstituencyPage.tsx";
import FavoritesPage from "./pages/FavoritesPage.tsx";

// Register service worker (autoUpdate — silently refreshes on new version)
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/parties" element={<PartiesPage />} />
        <Route path="/party/:partySlug" element={<PartyPage />} />
        <Route path="/party/:partySlug/constituencies" element={<PartyConstituenciesPage />} />
        <Route path="/constituency/:code" element={<ConstituencyPage />} />
        <Route path="/candidates" element={<CandidatesPage />} />
        <Route path="/candidate/:candidateSlug" element={<CandidateDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy-policy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
