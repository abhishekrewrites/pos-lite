import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import NavBar from "./composite-components/NavBar/";
import Cart from "./Cart";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/cart" element={<Cart />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  </StrictMode>
);
