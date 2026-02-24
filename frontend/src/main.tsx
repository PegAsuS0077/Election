import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";
import ExplorePage from "./pages/ExplorePage.tsx";
import MapPage from "./pages/MapPage.tsx";
import PartiesPage from "./pages/PartiesPage.tsx";
import CandidatesPage from "./pages/CandidatesPage.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/parties" element={<PartiesPage />} />
        <Route path="/candidates" element={<CandidatesPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
