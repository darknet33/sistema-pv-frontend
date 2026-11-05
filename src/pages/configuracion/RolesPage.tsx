import { useState, useEffect } from 'react'
import { App, Modal, Button, Switch, Tag, Popconfirm, Space, Grid, Spin } from 'antd'
import { PlusOutlined, SecurityScanOutlined, EditOutlined, DeleteOutlined, DashboardOutlined, SaveOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import CrudModal from '../../components/CrudModal'
import type { CrudField } from '../../components/CrudModal'
import PageHeader from '../../components/PageHeader'
import ResponsiveTable from '../../components/ResponsiveTable'
import { useCrud } from '../../hooks/useCrud'
import rolService from '../../services/rolService'
import moduloService from '../../services/moduloService'
import { useEmpresaColors } from '../../stores/empresaStore'
import type { Rol, Modulo } from '../../types/configuracion'

const fields: CrudField[] = [
  { name: 'nombre', label: 'Nombre', required: true, normalize: 'uppercase' },
]

export default function RolesPage() {
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const { primary } = useEmpresaColors()
  const { data, loading, modalVisible, editingRecord, form, openModal, closeModal, handleSubmit, handleDelete } =
    useCrud<Rol>(rolService)

  const [modulos, setModulos] = useState<Modulo[]>([])
  const [modalesOpen, setModalesOpen] = useState(false)
  const [selectedRol, setSelectedRol] = useState<Rol | null>(null)
  const [targetKeys, setTargetKeys] = useState<string[]>([])
  const [modulosLoading, setModulosLoading] = useState(false)

  useEffect(() => {
    moduloService.getAll().then(setModulos).catch(() => message.error('Error al cargar módulos'))
  }, [])

  const handleOpenModales = async (rol: Rol) => {
    setSelectedRol(rol)
    setModalesOpen(true)
    setModulosLoading(true)
    try {
      const asignaciones = await rolService.getModulosByRol(rol.id)
      const keys = asignaciones.map((a) => String(a.modulo_id))
      if (keys.length === 0) {
        const dashboard = modulos.find((m) => m.nombre.toLowerCase() === 'dashboard')
        if (dashboard && dashboard.activo) keys.push(String(dashboard.id))
      }
      setTargetKeys(keys)
    } catch {
      message.error('Error al cargar módulos del rol')
    } finally {
      setModulosLoading(false)
    }
  }

  const handleSaveModulos = async () => {
    if (!selectedRol) return
    try {
      await rolService.asignarModulos(selectedRol.id, targetKeys.map((k) => Number(k)))
      message.success('Módulos asignados correctamente')
      setModalesOpen(false)
    } catch {
      message.error('Error al asignar módulos')
    }
  }

  const toggleModulo = (id: string) => {
    setTargetKeys((keys) => (keys.includes(id) ? keys.filter((k) => k !== id) : [...keys, id]))
  }

  const permitidos = targetKeys.length
  const totalActivos = modulos.filter((m) => m.activo).length
  const pct = totalActivos > 0 ? Math.round((permitidos / totalActivos) * 100) : 0
  const todosPermitidos = totalActivos > 0 && permitidos === totalActivos

  const columns: ColumnsType<Rol> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Nombre', dataIndex: 'nombre' },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 240,
      render: (_: unknown, record: Rol) => (
        <Space>
          <Button size="small" icon={<SecurityScanOutlined />} onClick={() => handleOpenModales(record)}>
            Módulos
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(record)} />
          <Popconfirm title="¿Eliminar rol?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const fabVisible = isMobile && !modalVisible

  return (
    <div className={fabVisible ? 'pb-16' : ''}>
      <PageHeader title="Roles">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} className={isMobile ? 'hidden' : ''}>
          Nuevo Rol
        </Button>
      </PageHeader>
      <ResponsiveTable
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {fabVisible && (
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
          className="!fixed bottom-6 right-6 z-50 !w-14 !h-14 !text-2xl shadow-lg"
        />
      )}

      <CrudModal
        visible={modalVisible}
        onCancel={closeModal}
        onSubmit={handleSubmit}
        form={form}
        title={editingRecord ? 'Editar Rol' : 'Nuevo Rol'}
        fields={fields}
      />

      <Modal
        title="Permisos de módulos"
        open={modalesOpen}
        onOk={handleSaveModulos}
        onCancel={() => setModalesOpen(false)}
        okText="Guardar"
        cancelText="Cancelar"
        okButtonProps={{ icon: <SaveOutlined /> }}
        className="responsive-modal"
        width={isMobile ? '95%' : 520}
      >
        <Spin spinning={modulosLoading}>
          <div className="mb-3">
            <div className="text-[13px] text-gray-500">Rol</div>
            <div className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <DashboardOutlined style={{ color: primary }} />
              {selectedRol?.nombre}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-gray-700">
                <span className="font-semibold" style={{ color: primary }}>{permitidos}</span>
                {' '}de {totalActivos} módulos permitidos
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="text"
                  size="small"
                  icon={<UnlockOutlined />}
                  disabled={todosPermitidos}
                  onClick={() => setTargetKeys(modulos.filter((m) => m.activo).map((m) => String(m.id)))}
                >
                  Permitir todos
                </Button>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<LockOutlined />}
                  disabled={permitidos === 0}
                  onClick={() => setTargetKeys([])}
                >
                  Quitar todos
                </Button>
              </div>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: pct > 0 ? primary : undefined }}
              />
            </div>
          </div>

          <div className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {modulos.map((m) => {
              const key = String(m.id)
              const checked = targetKeys.includes(key)
              return (
                <div
                  key={key}
                  onClick={() => m.activo && toggleModulo(key)}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer select-none transition-colors ${
                    m.activo ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-sm text-gray-800">{m.nombre}</span>
                    {!m.activo && <Tag color="red" style={{ marginLeft: 8, fontSize: 11 }}>Inactivo</Tag>}
                  </div>
                  <Switch size="small" checked={checked} disabled={!m.activo} onClick={(_, e) => e.stopPropagation()} onChange={() => toggleModulo(key)} />
                </div>
              )
            })}
          </div>

          <div className="mt-2 text-xs text-gray-400">
            Para los roles nuevos, el módulo Inicio se activa automáticamente. Si quita todos, el acceso iniciará solo con el destino que asigne.
          </div>
        </Spin>
      </Modal>
    </div>
  )
}