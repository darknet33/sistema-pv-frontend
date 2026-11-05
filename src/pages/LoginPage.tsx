import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Alert, Button, Card, Form, Grid, Input, Spin, notification, Typography } from 'antd'
import {
  LockOutlined,
  UserOutlined,
  CloseCircleOutlined,
  ArrowLeftOutlined,
  LoginOutlined,
  UserAddOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { useEmpresaStore, useEmpresaColors } from '../stores/empresaStore'
import { resolveUrl } from '../utils/resolveUrl'
import { upperText } from '../utils/format'
import { checkUsers } from '../services/authService'
import type { LoginRequest, SetupAdminRequest } from '../types/auth'

const { Text } = Typography
const { useBreakpoint } = Grid

export default function LoginPage() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const login = useAuthStore((state) => state.login)
  const setupAdmin = useAuthStore((state) => state.setupAdmin)
  const loadEmpresa = useEmpresaStore((state) => state.loadEmpresa)
  const empresa = useEmpresaStore((state) => state.empresa)
  const { primary } = useEmpresaColors()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [setupForm] = Form.useForm()

  useEffect(() => {
    loadEmpresa()
    const verifySetup = async () => {
      try {
        const response = await checkUsers()
        setNeedsSetup(response.needs_setup)
      } catch (error: any) {
        message.error(error.response?.data?.detail || 'No se pudo verificar la configuración inicial')
      } finally {
        setCheckingSetup(false)
      }
    }

    verifySetup()
  }, [])

  const onFinish = async (values: LoginRequest) => {
    setLoading(true)
    try {
      await login(values)
      message.success('Bienvenido al Sistema de Inventario')
      navigate('/dashboard')
    } catch (error: any) {
      if (error.response?.status === 401) {
        notification.error({
          message: 'Inicio de sesión fallido',
          description: 'El usuario o la contraseña son incorrectos',
          icon: <CloseCircleOutlined className="!text-red-500" />,
          placement: 'topRight',
          duration: 4,
        })
      } else {
        message.error(error.response?.data?.detail || 'Error al iniciar sesión')
      }
    } finally {
      setLoading(false)
    }
  }

  const onSetupFinish = async (values: SetupAdminRequest) => {
    setLoading(true)
    try {
      await setupAdmin(values)
      message.success('Administrador creado correctamente')
      navigate('/dashboard')
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'No se pudo crear el administrador')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSetup) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          color: '#fff',
        }}
      >
        <Spin size="large" style={{ color: '#fff' }} />
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>Cargando...</Text>
      </div>
    )
  }

  const inputCls = 'login-dark-input'
  const buttonBg = { background: primary, borderColor: primary }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: isMobile ? '84px 16px 40px' : '56px 24px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        overflowX: 'hidden',
      }}
    >
      <style>{`
        .login-dark-input,
        .login-dark-input.ant-input,
        .login-dark-input.ant-input-affix-wrapper {
          background: rgba(255,255,255,0.07) !important;
          border: 1px solid rgba(255,255,255,0.14) !important;
          border-radius: 10px !important;
          box-shadow: none !important;
        }
        .login-dark-input:hover {
          border-color: rgba(255,255,255,0.3) !important;
        }
        .login-dark-input.ant-input-affix-wrapper-focused,
        .login-dark-input:focus,
        .login-dark-input.ant-input:focus {
          border-color: ${primary} !important;
          box-shadow: 0 0 0 3px ${primary}40 !important;
        }
        .login-dark-input,
        .login-dark-input input {
          color: #fff !important;
          caret-color: #fff !important;
          background: transparent !important;
        }
        .login-dark-input::placeholder,
        .login-dark-input input::placeholder {
          color: rgba(255,255,255,0.42) !important;
        }
        .login-dark-input .ant-input-prefix {
          color: rgba(255,255,255,0.45) !important;
          margin-inline-end: 10px;
        }
        .login-dark-input .ant-input-suffix,
        .login-dark-input .ant-input-password-icon {
          color: rgba(255,255,255,0.45) !important;
        }
        .login-dark-input input:-webkit-autofill,
        .login-dark-input input:-webkit-autofill:hover,
        .login-dark-input input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px ${'#1e2947'} inset !important;
          box-shadow: 0 0 0 1000px ${'#1e2947'} inset !important;
          -webkit-text-fill-color: #fff !important;
          caret-color: #fff !important;
          transition: background-color 999999s ease-out 0s;
        }
        .login-dark-input input::selection {
          background: ${primary}66;
          color: #fff;
        }
        .login-back-btn {
          color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(4px);
          transition: all .2s ease;
        }
        .login-back-btn:hover {
          color: #fff !important;
          border-color: rgba(255,255,255,0.3) !important;
          background: rgba(255,255,255,0.12) !important;
        }
        .login-card {
          background: rgba(255,255,255,0.055) !important;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
        }
        .login-brand-mark {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
        }
      `}</style>

      {/* Fondo decorativo (capa propia para no recortar el scroll) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: isMobile ? 240 : 420,
            height: isMobile ? 240 : 420,
            borderRadius: '50%',
            background: `${primary}1f`,
            top: isMobile ? -70 : -130,
            right: isMobile ? -70 : -110,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: isMobile ? 200 : 320,
            height: isMobile ? 200 : 320,
            borderRadius: '50%',
            background: `${primary}14`,
            bottom: isMobile ? -60 : -90,
            left: isMobile ? -60 : -90,
          }}
        />
      </div>

      {/* Botón volver */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/')}
        className="login-back-btn"
        style={{
          position: 'absolute',
          top: isMobile ? 16 : 24,
          left: isMobile ? 16 : 24,
          zIndex: 2,
          fontSize: 15,
          height: isMobile ? 36 : 40,
          padding: isMobile ? '0 12px' : '0 16px',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        Volver
      </Button>

      <Card
        className="login-card"
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.12)',
          position: 'relative',
          zIndex: 1,
        }}
        styles={{
          body: { padding: isMobile ? '32px 22px 26px' : '40px 38px 34px' },
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {empresa?.logo ? (
            <div className="login-brand-mark" style={{ display: 'inline-flex', padding: '12px 22px', borderRadius: 14, marginBottom: 18 }}>
              <img
                src={resolveUrl(empresa.logo)}
                alt="Logo"
                style={{ maxHeight: 56, maxWidth: 180, objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div
              style={{
                width: 66,
                height: 66,
                borderRadius: 18,
                background: `linear-gradient(135deg, ${primary}, ${primary}cc)`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
                boxShadow: `0 10px 26px ${primary}40`,
              }}
            >
              {needsSetup ? (
                <SafetyCertificateOutlined style={{ fontSize: 28, color: '#fff' }} />
              ) : (
                <LockOutlined style={{ fontSize: 28, color: '#fff' }} />
              )}
            </div>
          )}
          <h2
            style={{
              color: '#fff',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              marginBottom: 6,
              marginTop: 0,
            }}
          >
            {needsSetup ? 'Configuración inicial' : 'Bienvenido'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: 14, marginBottom: 0, lineHeight: 1.5 }}>
            {needsSetup
              ? 'Crea el usuario administrador para comenzar'
              : empresa?.razon_social?.toUpperCase() || 'Ingresa tus credenciales para acceder'}
          </p>
        </div>

        {needsSetup ? (
          <>
            <Alert
              type="info"
              showIcon
              style={{
                marginBottom: 22,
                borderRadius: 12,
                background: 'rgba(22,119,255,0.12)',
                border: '1px solid rgba(22,119,255,0.3)',
              }}
              message={
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                  No hay usuarios registrados. Crea el administrador inicial.
                </span>
              }
            />
            <Form name="setup-admin" form={setupForm} layout="vertical" onFinish={onSetupFinish} requiredMark={false}>
              <div style={{ display: 'flex', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
                <Form.Item
                  name="nombres"
                  rules={[{ required: true, message: 'Ingrese sus nombres' }]}
                  normalize={(v) => upperText(String(v || ''))}
                  style={{ flex: 1, marginBottom: 16 }}
                >
                  <Input placeholder="Nombres" size="large" className={inputCls} autoComplete="given-name" />
                </Form.Item>
                <Form.Item
                  name="apellidos"
                  rules={[{ required: true, message: 'Ingrese sus apellidos' }]}
                  normalize={(v) => upperText(String(v || ''))}
                  style={{ flex: 1, marginBottom: 16 }}
                >
                  <Input placeholder="Apellidos" size="large" className={inputCls} autoComplete="family-name" />
                </Form.Item>
              </div>
              <Form.Item
                name="username"
                rules={[{ required: true, message: 'Ingrese un usuario' }]}
                style={{ marginBottom: 16 }}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Usuario administrador"
                  size="large"
                  className={inputCls}
                  autoComplete="username"
                />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[
                  { required: true, message: 'Ingrese una contraseña' },
                  { min: 6, message: 'Use al menos 6 caracteres' },
                ]}
                style={{ marginBottom: 24 }}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Contraseña"
                  size="large"
                  className={inputCls}
                  autoComplete="new-password"
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  block
                  icon={<UserAddOutlined />}
                  style={{
                    height: 48,
                    borderRadius: 12,
                    fontWeight: 600,
                    fontSize: 15,
                    ...buttonBg,
                    boxShadow: `0 10px 24px ${primary}3d`,
                  }}
                >
                  Crear administrador
                </Button>
              </Form.Item>
            </Form>
          </>
        ) : (
          <Form name="login" onFinish={onFinish} requiredMark={false}>
            <Form.Item name="username" rules={[{ required: true, message: 'Ingrese su usuario' }]} style={{ marginBottom: 16 }}>
              <Input
                prefix={<UserOutlined />}
                placeholder="Usuario"
                size="large"
                autoComplete="username"
                className={inputCls}
              />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: 'Ingrese su contraseña' }]} style={{ marginBottom: 24 }}>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Contraseña"
                size="large"
                autoComplete="current-password"
                className={inputCls}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
                icon={<LoginOutlined />}
                style={{
                  height: 48,
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 15,
                  ...buttonBg,
                  boxShadow: `0 10px 24px ${primary}3d`,
                }}
              >
                Iniciar sesión
              </Button>
            </Form.Item>
          </Form>
        )}

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Rembix Copyright © 2026</Text>
        </div>
      </Card>
    </div>
  )
}