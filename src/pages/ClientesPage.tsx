import { App, Switch, Button, Popconfirm, Space, Grid } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import CrudModal from '../components/CrudModal'
import type { CrudField } from '../components/CrudModal'
import PageHeader from '../components/PageHeader'
import ResponsiveTable from '../components/ResponsiveTable'
import { useCrud } from '../hooks/useCrud'
import type { Cliente } from '../types/cliente'
import { getClientes, createCliente, updateCliente, deleteCliente, toggleClienteActivo } from '../services/clienteService'

const fields: CrudField[] = [
  { name: 'nombre', label: 'Nombre', required: true, normalize: 'uppercase' },
  { name: 'nit', label: 'NIT', required: true, normalize: 'uppercase' },
  { name: 'celular', label: 'Celular', required: true, normalize: 'uppercase' },
  { name: 'direccion', label: 'Dirección', type: 'textarea', required: true, normalize: 'uppercase' },
]

export default function ClientesPage() {
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const { data, loading, modalVisible, editingRecord, form, openModal, closeModal, handleSubmit, handleDelete, loadData } =
    useCrud<Cliente>({
      getAll: getClientes,
      create: createCliente as any,
      update: updateCliente as any,
      delete: deleteCliente,
    })

  const handleToggleActivo = async (id: number) => {
    try {
      await toggleClienteActivo(id)
      loadData()
    } catch {
      message.error('Error al cambiar estado')
    }
  }

  const columns: ColumnsType<Cliente> = [
    { title: 'ID', dataIndex: 'id' },
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'NIT', dataIndex: 'nit' },
    { title: 'Celular', dataIndex: 'celular' },
    { title: 'Dirección', dataIndex: 'direccion' },
    {
      title: 'Estado',
      dataIndex: 'activo',
      render: (activo: boolean, record: Cliente) => (
        <Switch checked={activo} onChange={() => handleToggleActivo(record.id)} size="small" />
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      render: (_: unknown, record: Cliente) => (
        <Space>
          <Button size={isMobile ? 'middle' : 'small'} icon={<EditOutlined />} onClick={() => openModal(record)} />
          <Popconfirm title="¿Eliminar cliente?" onConfirm={() => handleDelete(record.id)}>
            <Button size={isMobile ? 'middle' : 'small'} danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const fabVisible = isMobile && !modalVisible

  return (
    <div className={fabVisible ? 'pb-16' : ''}>
      <PageHeader title="Clientes">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} className={isMobile ? 'hidden' : ''}>
          Nuevo Cliente
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
        title={editingRecord ? 'Editar Cliente' : 'Nuevo Cliente'}
        fields={fields}
      />
    </div>
  )
}