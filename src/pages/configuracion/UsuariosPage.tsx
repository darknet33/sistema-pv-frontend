import { useEffect, useState } from 'react'
import { App, Button, Popconfirm, Space, Grid } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import CrudModal from '../../components/CrudModal'
import type { CrudField } from '../../components/CrudModal'
import SubCrudSelect from '../../components/SubCrudSelect'
import PageHeader from '../../components/PageHeader'
import ResponsiveTable from '../../components/ResponsiveTable'
import { useCrud } from '../../hooks/useCrud'
import usuarioService from '../../services/usuarioService'
import rolService from '../../services/rolService'
import type { Usuario, Rol } from '../../types/configuracion'

export default function UsuariosPage() {
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [roles, setRoles] = useState<Rol[]>([])
  const { data, loading, modalVisible, editingRecord, form, openModal, closeModal, handleSubmit, handleDelete } =
    useCrud<Usuario>(usuarioService)

  useEffect(() => {
    rolService.getAll().then(setRoles).catch(() => message.error('Error al cargar roles'))
  }, [])

  const fields: CrudField[] = [
    { name: 'username', label: 'Username', required: true },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      required: !editingRecord,
      rules: editingRecord ? [] : [{ required: true, message: 'Password requerido' }],
    },
    { name: 'nombres', label: 'Nombres', required: true, normalize: 'uppercase' },
    { name: 'apellidos', label: 'Apellidos', required: true, normalize: 'uppercase' },
    { name: 'cargo', label: 'Cargo', required: true, normalize: 'uppercase' },
    {
      name: 'rol_id',
      label: 'Rol',
      required: true,
      render: () => (
        <SubCrudSelect
          placeholder="Seleccione un rol"
          options={roles.map((r) => ({ value: r.id, label: r.nombre }))}
          modalProps={{
            title: 'Roles',
            fetchAll: rolService.getAll,
            create: rolService.create,
            update: rolService.update,
            remove: rolService.delete,
            fields: [
              { name: 'nombre', label: 'Nombre', normalize: 'uppercase' },
            ],
            onDataChange: (list) => setRoles(list),
          }}
        />
      ),
    },
  ]

  const columns: ColumnsType<Usuario> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Username', dataIndex: 'username' },
    { title: 'Nombres', dataIndex: 'nombres' },
    { title: 'Apellidos', dataIndex: 'apellidos' },
    { title: 'Cargo', dataIndex: 'cargo' },
    {
      title: 'Rol',
      dataIndex: 'rol_id',
      render: (rolId: number) => roles.find((r) => r.id === rolId)?.nombre || 'N/A',
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      render: (activo: boolean) => (activo ? 'Sí' : 'No'),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      render: (_: unknown, record: Usuario) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(record)} />
          <Popconfirm title="¿Eliminar usuario?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const fabVisible = isMobile && !modalVisible

  return (
    <div className={fabVisible ? 'pb-16' : ''}>
      <PageHeader title="Usuarios">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} className={isMobile ? 'hidden' : ''}>
          Nuevo Usuario
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
        title={editingRecord ? 'Editar Usuario' : 'Nuevo Usuario'}
        fields={fields}
        width={520}
      />
    </div>
  )
}
