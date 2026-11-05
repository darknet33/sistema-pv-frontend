import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card } from 'antd'
import { LogoutOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { useEmpresaStore, useEmpresaColors } from '../stores/empresaStore'
import { resolveUrl } from '../utils/resolveUrl'

export default function SessionExpiredPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cerradaPorInactividad = searchParams.get('reason') === 'idle'
  const empresa = useEmpresaStore((state) => state.empresa)
  const loadEmpresa = useEmpresaStore((state) => state.loadEmpresa)
  const { primary } = useEmpresaColors()
  const logout = useAuthStore((state) => state.logout)

  useEffect(() => {
    loadEmpresa()
    logout()
  }, [])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}>
          {empresa?.logo ? (
            <img src={resolveUrl(empresa.logo)} alt="Logo" style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }} />
          ) : (
            <h1 style={{ color: primary }}>Sistema de Inventario</h1>
          )}
        </div>
        <h2 style={{ marginBottom: 8 }}>
          {cerradaPorInactividad ? 'Sesión cerrada por inactividad' : 'Sesión expirada'}
        </h2>
        <p style={{ color: '#888', marginBottom: 24 }}>
          {cerradaPorInactividad
            ? 'Su sesión se cerró automáticamente por falta de actividad. Por favor, inicie sesión nuevamente.'
            : 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.'}
        </p>
        <Button
          type="primary"
          icon={<LogoutOutlined />}
          size="large"
          block
          onClick={() => navigate('/login')}
        >
          Volver a iniciar sesión
        </Button>
      </Card>
    </div>
  )
}
