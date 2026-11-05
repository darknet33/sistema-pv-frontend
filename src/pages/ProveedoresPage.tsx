import { App, Switch, Button, Popconfirm, Space, Grid } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import CrudModal from '../components/CrudModal'
import type { CrudField } from '../components/CrudModal'
import PageHeader from '../components/PageHeader'
import ResponsiveTable from '../components/ResponsiveTable'
import { useCrud } from '../hooks/useCrud'
import type { Proveedor } from '../types/proveedor'
import { getProveedores, createProveedor, updateProveedor, deleteProveedor, toggleProveedorActivo } from '../services/proveedorService'

const fields: CrudField[] = [
  { name: 'nombre', label: 'Nombre', required: true, normalize: 'uppercase' },
  { name: 'nit', label: 'NIT', required: true, normalize: 'uppercase' },
  { name: 'materiales', label: 'Materiales', required: true, normalize: 'uppercase' },
  { name: 'contacto', label: 'Contacto', required: true, normalize: 'uppercase' },
  { name: 'celular_contacto', label: 'Celular', required: true, normalize: 'uppercase' },
  { name: 'email_contacto', label: 'Email', required: true },
]

export default function ProveedoresPage() {
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const { data, loading, modalVisible, editingRecord, form, openModal, closeModal, handleSubmit, handleDelete, loadData } =
    useCrud<Proveedor>({
      getAll: getProveedores,
      create: createProveedor as any,
      update: updateProveedor as any,
      delete: deleteProveedor,
    })

  const handleToggleActivo = async (id: number) => {
    try {
      await toggleProveedorActivo(id)
      loadData()
    } catch {
      message.error('Error al cambiar estado')
    }
  }

  const columns: ColumnsType<Proveedor> = [
    { title: 'ID', dataIndex: 'id' },
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'NIT', dataIndex: 'nit' },
    { title: 'Materiales', dataIndex: 'materiales' },
    { title: 'Contacto', dataIndex: 'contacto' },
    { title: 'Celular', dataIndex: 'celular_contacto' },
    { title: 'Email', dataIndex: 'email_contacto' },
    {
      title: 'Estado',
      dataIndex: 'activo',
      render: (activo: boolean, record: Proveedor) => (
        <Switch checked={activo} onChange={() => handleToggleActivo(record.id)} size="small" />
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      render: (_: unknown, record: Proveedor) => (
        <Space>
          <Button size={isMobile ? 'middle' : 'small'} icon={<EditOutlined />} onClick={() => openModal(record)} />
          <Popconfirm title="¿Eliminar proveedor?" onConfirm={() => handleDelete(record.id)}>
            <Button size={isMobile ? 'middle' : 'small'} danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const fabVisible = isMobile && !modalVisible

  return (
    <div className={fabVisible ? 'pb-16' : ''}>
      <PageHeader title="Proveedores">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} className={isMobile ? 'hidden' : ''}>
          Nuevo Proveedor
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
        title={editingRecord ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        fields={fields}
      />
    </div>
  )
}