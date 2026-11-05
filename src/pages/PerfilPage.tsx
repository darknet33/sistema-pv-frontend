import { useState } from 'react'
import { App, Card, Form, Input, Button, Descriptions, Tag, Grid } from 'antd'
import { UserOutlined, SaveOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { useEmpresaColors } from '../stores/empresaStore'
import usuarioService from '../services/usuarioService'
import PageHeader from '../components/PageHeader'
import { upperText } from '../utils/format'

const { useBreakpoint } = Grid

export default function PerfilPage() {
  const { message } = App.useApp()
  const usuario = useAuthStore((state) => state.usuario)
  const { primary, secondary } = useEmpresaColors()
  const [form] = Form.useForm()
  const [passForm] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await usuarioService.update(usuario!.id, {
        username: usuario!.username,
        nombres: values.nombres,
        apellidos: values.apellidos,
        cargo: values.cargo,
        rol_id: usuario!.rol_id,
      })
      message.success('Perfil actualizado')
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    try {
      const values = await passForm.validateFields()
      setSavingPass(true)
      await usuarioService.changePassword(usuario!.id, {
        current_password: values.current_password,
        new_password: values.new_password,
      })
      message.success('Contraseña actualizada correctamente')
      passForm.resetFields()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al actualizar la contraseña')
    } finally {
      setSavingPass(false)
    }
  }

  if (!usuario) return null

  const initials = ((usuario.nombres?.[0] || '') + (usuario.apellidos?.[0] || '')).toUpperCase()

  return (
    <div>
      <PageHeader title="Mi Perfil" />

      <div className={`flex ${isMobile ? 'flex-col' : 'gap-6'}`}>
        <Card className={`${isMobile ? 'mb-4' : 'w-[280px]'} flex-shrink-0 shadow-sm`} styles={{ body: { padding: 24 } }}>
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-white shadow-md"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, fontSize: 30, fontWeight: 700, letterSpacing: 1 }}
            >
              {initials || <UserOutlined />}
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{usuario.nombres} {usuario.apellidos}</div>
              <div className="text-sm text-gray-500">@{usuario.username}</div>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className={`inline-block h-2 w-2 rounded-full ${usuario.activo ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-600">{usuario.activo ? 'Activo' : 'Inactivo'}</span>
            </div>
            {usuario.cargo && (
              <Tag color="blue" style={{ borderRadius: 999, paddingInline: 12, marginInlineEnd: 0 }}>
                {usuario.cargo}
              </Tag>
            )}
          </div>
        </Card>

        <div className="flex-1">
          <Card
            title="Información personal"
            className="mb-4 shadow-sm"
          >
            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Usuario">{usuario.username}</Descriptions.Item>
              <Descriptions.Item label="Cargo">{usuario.cargo || '-'}</Descriptions.Item>
              <Descriptions.Item label="Fecha de registro">
                {usuario.fecha_registro ? new Date(usuario.fecha_registro).toLocaleDateString('es-BO') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Última actualización">
                {usuario.fecha_actualizado ? new Date(usuario.fecha_actualizado).toLocaleDateString('es-BO') : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Form
              form={form}
              layout="vertical"
              initialValues={{
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                cargo: usuario.cargo,
              }}
              onFinish={handleSave}
              className="mt-6"
            >
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-x-4`}>
                <Form.Item name="nombres" label="Nombres" rules={[{ required: true, message: 'Ingrese sus nombres' }]}>
                  <Input
                    value={form.getFieldValue('nombres') ?? ''}
                    onChange={(e) => form.setFieldValue('nombres', upperText(e.target.value))}
                  />
                </Form.Item>
                <Form.Item name="apellidos" label="Apellidos" rules={[{ required: true, message: 'Ingrese sus apellidos' }]}>
                  <Input
                    value={form.getFieldValue('apellidos') ?? ''}
                    onChange={(e) => form.setFieldValue('apellidos', upperText(e.target.value))}
                  />
                </Form.Item>
                <Form.Item name="cargo" label="Cargo">
                  <Input
                    value={form.getFieldValue('cargo') ?? ''}
                    onChange={(e) => form.setFieldValue('cargo', upperText(e.target.value))}
                  />
                </Form.Item>
              </div>
              <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saving}>
                Guardar cambios
              </Button>
            </Form>
          </Card>

          <Card
            title={
              <span className="flex items-center gap-2">
                <SafetyCertificateOutlined style={{ color: primary }} />
                Seguridad
              </span>
            }
            className="shadow-sm"
          >
            <p className="mb-4 text-sm text-gray-500">
              Cambia tu contraseña periódicamente para mantener protegida tu cuenta.
            </p>
            <Form form={passForm} layout="vertical" onFinish={handleChangePassword}>
              <Form.Item
                name="current_password"
                label="Contraseña actual"
                rules={[{ required: true, message: 'Ingrese su contraseña actual' }]}
              >
                <Input.Password placeholder="Contraseña actual" autoComplete="current-password" />
              </Form.Item>
              <Form.Item
                name="new_password"
                label="Nueva contraseña"
                rules={[
                  { required: true, message: 'Ingrese la nueva contraseña' },
                  { min: 6, message: 'La contraseña debe tener al menos 6 caracteres' },
                ]}
                hasFeedback
              >
                <Input.Password placeholder="Nueva contraseña" autoComplete="new-password" />
              </Form.Item>
              <Form.Item
                name="confirm_password"
                label="Confirmar nueva contraseña"
                dependencies={['new_password']}
                hasFeedback
                rules={[
                  { required: true, message: 'Confirme la nueva contraseña' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('new_password') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('Las contraseñas no coinciden'))
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Repita la nueva contraseña" autoComplete="new-password" />
              </Form.Item>
              <Button type="primary" icon={<LockOutlined />} htmlType="submit" loading={savingPass}>
                Actualizar contraseña
              </Button>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  )
}