import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MainLayout from "./layouts/MainLayout";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/OrdersPage";
import InventoryPage from "./pages/InventoryPage";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailsPage from "./pages/ClientDetailsPage"
import OrderDetailsPage from './pages/OrderDetailsPage';

// Vite's `base` (/static/frontend/) is only a real URL prefix when this
// bundle is previewed directly off the Vite dev server; when django-vite
// serves it through Django, the page itself lives at the plain site path
// (e.g. /panel), so the basename has to be picked at runtime, not build time.
const viteBase = import.meta.env.BASE_URL.replace(/\/$/, '');
const basename = viteBase && window.location.pathname.startsWith(viteBase + '/')
  ? viteBase
  : '/';

function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/panel" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:id" element={<ClientDetailsPage />} />
          <Route path="orders/:id" element={<OrderDetailsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App
