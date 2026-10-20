import { IconContext } from "@phosphor-icons/react";
import { useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router";
import { CartDrawer } from "./components/CartDrawer";
import { ChatWidget } from "./components/chat/ChatWidget";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { CheckoutPage, ConfirmationPage } from "./pages/Checkout";
import { DemoPage } from "./pages/Demo";
import { HomePage } from "./pages/Home";
import { ProductPage } from "./pages/Product";
import { ShopPage } from "./pages/Shop";
import { TrackPage } from "./pages/Track";
import { CartProvider } from "./state/cart";
import { ChatProvider } from "./state/chat";

const TITLES: [RegExp, string][] = [
  [/^\/shop/, "Shop"],
  [/^\/products\//, "Product"],
  [/^\/checkout/, "Checkout"],
  [/^\/order\//, "Order confirmed"],
  [/^\/demo/, "Live demo"],
  [/^\/track/, "Track an order"],
];

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    const t = TITLES.find(([rx]) => rx.test(pathname))?.[1];
    document.title = t ? `${t} · Saba` : "Saba · Handmade ceramics & home goods";
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="container page">
      <div className="state-block">
        <h3>This page wandered off</h3>
        <p className="muted">The link may be old. Everything we make is in the shop.</p>
        <Link to="/shop" className="btn btn--sm">
          Go to the shop
        </Link>
      </div>
    </div>
  );
}

export function App() {
  return (
    <IconContext.Provider value={{ weight: "regular", size: 18 }}>
      <CartProvider>
        <ChatProvider>
          <RouteEffects />
          <Header />
          <main className="main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/products/:handle" element={<ProductPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order/:orderNumber" element={<ConfirmationPage />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/track" element={<TrackPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <CartDrawer />
          <ChatWidget />
        </ChatProvider>
      </CartProvider>
    </IconContext.Provider>
  );
}
