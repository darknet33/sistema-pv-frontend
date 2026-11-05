import { useEffect, useMemo } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ShopOutlined,
  FileTextOutlined,
  UserOutlined,
  SettingOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  DollarOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import { useAuthStore } from './stores/authStore'
import { useIdleSession } from './hooks/useIdleSession'
import AppLayout from './components/AppLayout'
import LandingPage from './pages/LandingPage'
import ProductosLandingPage from './pages/landing/ProductosPage'
import LoginPage from './pages/LoginPage'
import SessionExpiredPage from './pages/SessionExpiredPage'
import InicioPage from './pages/InicioPage'
import ProductosPage from './pages/ProductosPage'
import CategoriasPage from './pages/productos/CategoriasPage'
import KardexPage from './pages/productos/KardexPage'
import CategoriasUnidadPage from './pages/productos/CategoriasUnidadPage'
import UnidadesPage from './pages/productos/UnidadesPage'
import ComprasPage from './pages/ComprasPage'
import ProveedoresPage from './pages/ProveedoresPage'
import VentasPage from './pages/VentasPage'
import CotizacionesPage from './pages/CotizacionesPage'
import ClientesPage from './pages/ClientesPage'
import GastosPage from './pages/GastosPage'
import ReportesPage from './pages/ReportesPage'
import ConfiguracionesPage from './pages/configuracion/ConfiguracionesPage'
import EmpresaPage from './pages/configuracion/EmpresaPage'
import UsuariosPage from './pages/configuracion/UsuariosPage'
import RolesPage from './pages/configuracion/RolesPage'
import ModulosPage from './pages/configuracion/ModulosPage'
import ComprobantesPage from './pages/configuracion/ComprobantesPage'
import EstadosPage from './pages/configuracion/EstadosPage'
import PerfilPage from './pages/PerfilPage'

type MenuItem = Required<MenuProps>['items'][number]

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return { key, icon, children, label } as MenuItem
}

const normalizeModuleName = (name: string) =>
  (name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

const MODULE_ROUTE_MAP: Record<string, string> = {
  DASHBOARD: '/dashboard',
  PRODUCTOS: '/dashboard/productos/lista',
  CATEGORIAS: '/dashboard/productos/categorias',
  'UNIDADES DE MEDIDA': '/dashboard/productos/unidades',
  'CATEGORIAS DE UNIDAD': '/dashboard/productos/categorias-unidad',
  COMPRAS: '/dashboard/entradas/compras',
  PROVEEDORES: '/dashboard/entradas/proveedores',
  VENTAS: '/dashboard/salidas/ventas',
  COTIZACIONES: '/dashboard/cotizaciones',
  CLIENTES: '/dashboard/salidas/clientes',
  GASTOS: '/dashboard/gastos',
  REPORTES: '/dashboard/reportes',
  USUARIOS: '/dashboard/configuracion/usuarios',
  ROLES: '/dashboard/configuracion/roles',
  MODULOS: '/dashboard/configuracion/modulos',
  COMPROBANTES: '/dashboard/configuracion/comprobantes',
  ESTADOS: '/dashboard/configuracion/estados',
  EMPRESA: '/dashboard/configuracion/empresa',
}

function App() {
  const token = useAuthStore((state) => state.token)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const modulos = useAuthStore((state) => state.modulos)
  const rehydrated = useAuthStore((state) => state.rehydrated)
  const logout = useAuthStore((state) => state.logout)

  const hasModules = modulos.length > 0
  const validSession = Boolean(isAuthenticated && token && hasModules)

  useIdleSession(validSession)

  useEffect(() => {
    if (isAuthenticated && (!token || !hasModules)) {
      logout()
    }
  }, [isAuthenticated, token, hasModules, logout])

  useEffect(() => {
    if (!rehydrated) {
      const t = setTimeout(() => useAuthStore.setState({ rehydrated: true }), 800)
      return () => clearTimeout(t)
    }
  }, [rehydrated])

  const moduloNombres = new Set(modulos.map((m) => normalizeModuleName(m.nombre)))
  const hasModule = (name: string) => moduloNombres.has(normalizeModuleName(name))
  const hasAny = (...names: string[]) => names.some((n) => hasModule(n))

  const menuItems = useMemo(() => {
    const items: MenuItem[] = []

    if (hasModule('Dashboard')) {
      items.push(getItem('Inicio', '/dashboard', <DashboardOutlined />))
    }

    if (hasModule('Productos')) {
      const children: MenuItem[] = []
      children.push(getItem('Lista', '/dashboard/productos/lista', <UnorderedListOutlined />))
      if (hasModule('Categorias')) children.push(getItem('Categorías', '/dashboard/productos/categorias', <AppstoreOutlined />))
      if (hasModule('Unidades de Medida')) children.push(getItem('Unidades de Medida', '/dashboard/productos/unidades', <AppstoreOutlined />))
      if (hasModule('Categorías de Unidad')) children.push(getItem('Categorías de Unidad', '/dashboard/productos/categorias-unidad', <AppstoreOutlined />))
      children.push(getItem('Kardex', '/dashboard/productos/kardex', <HistoryOutlined />))
      items.push(getItem('Productos', 'productos-group', <ShoppingCartOutlined />, children))
    }

    if (hasAny('Compras', 'Proveedores')) {
      const children: MenuItem[] = []
      if (hasModule('Compras')) children.push(getItem('Compras', '/dashboard/entradas/compras', <ShoppingOutlined />))
      if (hasModule('Proveedores')) children.push(getItem('Proveedores', '/dashboard/entradas/proveedores', <TeamOutlined />))
      items.push(getItem('Entradas', 'entradas-group', <ShoppingOutlined />, children))
    }

    if (hasAny('Ventas', 'Clientes')) {
      const children: MenuItem[] = []
      if (hasModule('Ventas')) children.push(getItem('Ventas', '/dashboard/salidas/ventas', <ShopOutlined />))
      if (hasModule('Cotizaciones')) children.push(getItem('Cotizaciones', '/dashboard/cotizaciones', <FileTextOutlined />))
      if (hasModule('Clientes')) children.push(getItem('Clientes', '/dashboard/salidas/clientes', <TeamOutlined />))
      items.push(getItem('Salidas', 'salidas-group', <ShopOutlined />, children))
    }

    if (hasModule('Gastos')) {
      items.push(getItem('Gastos', '/dashboard/gastos', <DollarOutlined />))
    }

    if (hasModule('Reportes')) {
      items.push(getItem('Reportes', '/dashboard/reportes', <FileTextOutlined />))
    }

    const hasConfigModules = ['Usuarios', 'Roles', 'Modulos', 'Comprobantes', 'Estados', 'Empresa'].some((m) => hasModule(m))
    if (hasConfigModules) {
      const children: MenuItem[] = []
      if (hasModule('Empresa')) children.push(getItem('Empresa', '/dashboard/configuracion/empresa', <ShopOutlined />))
      if (hasModule('Usuarios')) children.push(getItem('Usuarios', '/dashboard/configuracion/usuarios', <UserOutlined />))
      if (hasModule('Roles')) children.push(getItem('Roles', '/dashboard/configuracion/roles', <TeamOutlined />))
      if (hasModule('Modulos')) children.push(getItem('Módulos', '/dashboard/configuracion/modulos', <AppstoreOutlined />))
      if (hasModule('Comprobantes')) children.push(getItem('Comprobantes', '/dashboard/configuracion/comprobantes', <FileTextOutlined />))
      if (hasModule('Estados')) children.push(getItem('Estados', '/dashboard/configuracion/estados', <SettingOutlined />))
      items.push(getItem('Configuración', 'config-group', <SettingOutlined />, children))
    }

    return items
  }, [modulos])

  const moduloPaths = new Set(modulos.map((m) => MODULE_ROUTE_MAP[normalizeModuleName(m.nombre)]).filter(Boolean))
  const hasAccess = (path: string) => moduloPaths.has(path)

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/productos" element={<ProductosLandingPage />} />
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route path="/session-expired" element={<SessionExpiredPage />} />
      <Route
        path="/dashboard"
        element={
          !rehydrated ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
              Cargando...
            </div>
          ) : validSession ? (
            <AppLayout menuItems={menuItems}>
              <Outlet />
            </AppLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<InicioPage />} />

        <Route path="productos/lista" element={hasAccess('/dashboard/productos/lista') ? <ProductosPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="productos/categorias" element={hasAccess('/dashboard/productos/categorias') ? <CategoriasPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="productos/unidades" element={hasAccess('/dashboard/productos/unidades') ? <UnidadesPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="productos/categorias-unidad" element={hasAccess('/dashboard/productos/categorias-unidad') ? <CategoriasUnidadPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="productos/kardex" element={hasModule('Productos') ? <KardexPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="entradas/compras" element={hasAccess('/dashboard/entradas/compras') ? <ComprasPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="entradas/proveedores" element={hasAccess('/dashboard/entradas/proveedores') ? <ProveedoresPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="salidas/ventas" element={hasAccess('/dashboard/salidas/ventas') ? <VentasPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="cotizaciones" element={hasAccess('/dashboard/cotizaciones') ? <CotizacionesPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="salidas/clientes" element={hasAccess('/dashboard/salidas/clientes') ? <ClientesPage /> : <Navigate to="/dashboard" replace />} />

        <Route path="gastos" element={hasAccess('/dashboard/gastos') ? <GastosPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="reportes" element={hasAccess('/dashboard/reportes') ? <ReportesPage /> : <Navigate to="/dashboard" replace />} />

        <Route path="perfil" element={<PerfilPage />} />

        <Route path="configuracion" element={<ConfiguracionesPage />}>
          <Route path="empresa" element={hasAccess('/dashboard/configuracion/empresa') ? <EmpresaPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="usuarios" element={hasAccess('/dashboard/configuracion/usuarios') ? <UsuariosPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="roles" element={hasAccess('/dashboard/configuracion/roles') ? <RolesPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="modulos" element={hasAccess('/dashboard/configuracion/modulos') ? <ModulosPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="comprobantes" element={hasAccess('/dashboard/configuracion/comprobantes') ? <ComprobantesPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="estados" element={hasAccess('/dashboard/configuracion/estados') ? <EstadosPage /> : <Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
