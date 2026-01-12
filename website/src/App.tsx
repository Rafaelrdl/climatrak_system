import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { ProductsPage } from './pages/ProductsPage'
import { FunctionalitiesPage } from './pages/FunctionalitiesPage'
import { FunctionalityPage } from './pages/FunctionalityPage'
import { TrakNorPage } from './pages/products/TrakNorPage'
import { TrakSensePage } from './pages/products/TrakSensePage'
import { AirTrakPage } from './pages/products/AirTrakPage'
import { TrakLedgerPage } from './pages/products/TrakLedgerPage'
import { SolutionsPage } from './pages/SolutionsPage'
import { EquipeInternaPage } from './pages/personas/EquipeInternaPage'
import { PrestadoresPage } from './pages/personas/PrestadoresPage'
import { TecnicoAutonomoPage } from './pages/personas/TecnicoAutonomoPage'
import { PricingPage } from './pages/PricingPage'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { BlogPage } from './pages/BlogPage'
import { BlogPostPage } from './pages/BlogPostPage'
import { BlogEditorPage } from './pages/BlogEditorPage'
import { DemoPage } from './pages/DemoPage'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/produtos" element={<ProductsPage />} />
          <Route path="/funcionalidades" element={<FunctionalitiesPage />} />
          <Route path="/funcionalidades/:slug" element={<FunctionalityPage />} />
          <Route path="/produtos/traknor" element={<TrakNorPage />} />
          <Route path="/produtos/traksense" element={<TrakSensePage />} />
          <Route path="/produtos/airtrak" element={<AirTrakPage />} />
          <Route path="/produtos/trakledger" element={<TrakLedgerPage />} />
          <Route path="/solucoes" element={<SolutionsPage />} />
          <Route path="/para-quem/equipe-interna" element={<EquipeInternaPage />} />
          <Route path="/para-quem/prestadores" element={<PrestadoresPage />} />
          <Route path="/para-quem/tecnico-autonomo" element={<TecnicoAutonomoPage />} />
          <Route path="/precos" element={<PricingPage />} />
          <Route path="/sobre" element={<AboutPage />} />
          <Route path="/contato" element={<ContactPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/novo" element={<BlogEditorPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/demo" element={<DemoPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
