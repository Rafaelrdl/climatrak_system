import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { ProductsPage } from './pages/ProductsPage'
import { TrakNorPage } from './pages/products/TrakNorPage'
import { TrakSensePage } from './pages/products/TrakSensePage'
import { AirTrakPage } from './pages/products/AirTrakPage'
import { FinancePage } from './pages/products/FinancePage'
import { SolutionsPage } from './pages/SolutionsPage'
import { PricingPage } from './pages/PricingPage'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { BlogPage } from './pages/BlogPage'
import { DemoPage } from './pages/DemoPage'
import { TechnicianPage } from './pages/TechnicianPage'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/produtos" element={<ProductsPage />} />
          <Route path="/produtos/traknor" element={<TrakNorPage />} />
          <Route path="/produtos/traksense" element={<TrakSensePage />} />
          <Route path="/produtos/airtrak" element={<AirTrakPage />} />
          <Route path="/produtos/finance" element={<FinancePage />} />
          <Route path="/solucoes" element={<SolutionsPage />} />
          <Route path="/precos" element={<PricingPage />} />
          <Route path="/sobre" element={<AboutPage />} />
          <Route path="/contato" element={<ContactPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/tecnicos" element={<TechnicianPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
