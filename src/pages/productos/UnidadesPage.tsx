import { useEffect, useState, useMemo, useCallback } from 'react'
import { App, Button, Modal, Form, Input, Popconfirm, Tag, Spin, Grid } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UnidadMedida } from '../../types/unidadMedida'
import type { CategoriaUnidad } from '../../types/categoriaUnidad'
import unidadMedidaService from '../../services/unidadMedidaService'
import categoriaUnidadService from '../../services/categoriaUnidadService'
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh'
import ResponsiveTable from '../../components/ResponsiveTable'
import PageHeader from '../../components/PageHeader'
import SubCrudSelect from '../../components/SubCrudSelect'
import { capitalizeWords } from '../../utils/format'

const { useBreakpoint } = Grid

export default function UnidadesPage() {
  const { message } = App.useApp()
  const [unidades, setUnidades] = useState<UnidadMedida[]>([])
  const [categorias, setCategorias] = useState<CategoriaUnidad[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUnidad, setEditingUnidad] = useState<UnidadMedida | null>(null)
  const [form] = Form.useForm()
  const [filterCategoria, setFilterCategoria] = useState<number | undefined>(undefined)
  const [searchText, setSearchText] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })

  const screens = useBreakpoint()
  const isMobile = !screens.md

  const filteredUnidades = useMemo(() => {
    return unidades.filter((u) => {
      const matchesCategoria = filterCategoria ? u.categoria_unidad_id === filterCategoria : true
      const q = searchText.toLowerCase()
      const matchesSearch = u.nombre?.toLowerCase().includes(q) || u.abreviatura?.toLowerCase().includes(q)
      return matchesCategoria && matchesSearch
    })
  }, [unidades, filterCategoria, searchText])

  const loadUnidades = async () => {
    setLoading(true)
    try {
      const data = await unidadMedidaService.getAll()
      setUnidades(Array.isArray(data) ? data : [])
      setPagination(prev => ({ ...prev, current: 1 }))
    } catch {
      message.error('Error al cargar unidades')
      setUnidades([])
    } finally {
      setLoading(false)
    }
  }

  const loadCategorias = async () => {
    try {
      const data = await categoriaUnidadService.getAll()
      setCategorias(Array.isArray(data) ? data : [])
    } catch {
      message.error('Error al cargar categorías')
      setCategorias([])
    }
  }

  const refreshUnidades = useCallback(async () => {
    try {
      const data = await unidadMedidaService.getAll()
      setUnidades(Array.isArray(data) ? data : [])
    } catch {
      setUnidades([])
    }
  }, [])

  useEffect(() => {
    loadUnidades()
    loadCategorias()
  }, [])

  useRealtimeRefresh('productos', refreshUnidades)

  const handleSave = async (values: any) => {
    try {
      if (editingUnidad) {
        await unidadMedidaService.update(editingUnidad.id, values)
        message.success('Unidad actualizada')
      } else {
        await unidadMedidaService.create(values)
        message.success('Unidad creada')
      }
      setModalVisible(false)
      form.resetFields()
      loadUnidades()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al guardar')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await unidadMedidaService.delete(id)
      message.success('Unidad eliminada')
      loadUnidades()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al eliminar')
    }
  }

  const columns: ColumnsType<UnidadMedida> = useMemo(() => {
    const catMap = new Map<number, string>()
    categorias.forEach((c) => catMap.set(c.id, c.nombre))

    return [
      {
        title: 'Unidad',
        key: 'unidad',
        render: (_, r) => (
          <div>
            <div><strong>{r.nombre}</strong></div>
            {r.abreviatura && <div className="text-gray-500 text-xs">{r.abreviatura}</div>}
          </div>
        ),
      },
      {
        title: 'Categoría',
        dataIndex: 'categoria_unidad_id',
        key: 'categoria_unidad_id',
        render: (val: number) => catMap.get(val) || '-',
      },
      {
        title: 'Estado',
        dataIndex: 'activo',
        key: 'activo',
        render: (activo: boolean) => <Tag color={activo ? 'green' : 'red'}>{activo ? 'Activo' : 'Inactivo'}</Tag>,
      },
      {
        title: 'Acciones',
        key: 'acciones',
        render: (_, record) => (
          <div className="flex gap-1">
            <Button icon={<EditOutlined />} size={isMobile ? 'middle' : 'small'} onClick={() => { setEditingUnidad(record); form.setFieldsValue(record); setModalVisible(true) }} />
            <Popconfirm title="¿Eliminar unidad?" onConfirm={() => handleDelete(record.id)}>
              <Button icon={<DeleteOutlined />} size={isMobile ? 'middle' : 'small'} danger />
            </Popconfirm>
          </div>
        ),
      },
    ]
  }, [categorias, isMobile])

  const catSelectOptions = useMemo(() =>
    categorias.map((c) => ({ value: c.id, label: c.nombre })),
    [categorias]
  )

  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb']

  const fabVisible = isMobile && !modalVisible

  return (
    <div className={fabVisible ? 'pb-16' : ''}>
      <PageHeader title="Unidades de Medida">
        <Button type="primary" icon={<PlusOutlined />} size={isMobile ? 'middle' : 'middle'} onClick={() => { setEditingUnidad(null); form.resetFields(); setModalVisible(true) }} className={isMobile ? 'hidden' : ''}>
          Nueva Unidad
        </Button>
      </PageHeader>
      <div className="mb-4">
        <Input.Search
          placeholder="Buscar por nombre o abreviatura"
          allowClear
          className="max-w-[300px] mb-3"
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPagination(prev => ({ ...prev, current: 1 })) }}
        />
        <div className="flex flex-wrap gap-2">
          <Tag.CheckableTag
            checked={filterCategoria === undefined}
            onChange={() => { setFilterCategoria(undefined); setPagination(prev => ({ ...prev, current: 1 })) }}
            className="!m-0"
          >
            Todas
          </Tag.CheckableTag>
          {categorias.map((cat, idx) => (
            <Tag.CheckableTag
              key={cat.id}
              checked={filterCategoria === cat.id}
              onChange={() => { setFilterCategoria(filterCategoria === cat.id ? undefined : cat.id); setPagination(prev => ({ ...prev, current: 1 })) }}
              className="!m-0"
              style={{ backgroundColor: filterCategoria === cat.id ? colors[idx % colors.length] : undefined }}
            >
              {cat.nombre}
            </Tag.CheckableTag>
          ))}
        </div>
      </div>
      <Spin spinning={loading}>
        <ResponsiveTable
          columns={columns}
          dataSource={filteredUnidades}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `${total} unidades`,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
          }}
        />
      </Spin>
      <Modal
        title={editingUnidad ? 'Editar Unidad' : 'Nueva Unidad'}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields(); setEditingUnidad(null) }}
        onOk={() => form.submit()}
        className="responsive-modal"
        width={isMobile ? '95%' : 500}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input
              placeholder="Ej: KILOGRAMO"
              value={form.getFieldValue('nombre') ?? ''}
              onChange={(e) => form.setFieldValue('nombre', capitalizeWords(e.target.value))}
            />
          </Form.Item>
          <Form.Item name="abreviatura" label="Abreviatura">
            <Input placeholder="Ej: kg" />
          </Form.Item>
          <Form.Item name="categoria_unidad_id" label="Categoría">
            <SubCrudSelect
              placeholder="Seleccione una categoría"
              options={catSelectOptions}
              modalProps={{
                title: 'Categorías de Unidad',
                fetchAll: categoriaUnidadService.getAll,
                create: categoriaUnidadService.create,
                update: categoriaUnidadService.update,
                remove: categoriaUnidadService.delete,
                fields: [{ name: 'nombre', label: 'Nombre', normalize: 'capitalize' }],
                onDataChange: (list) => setCategorias(list),
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
      {fabVisible && (
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => { setEditingUnidad(null); form.resetFields(); setModalVisible(true) }}
          className="!fixed bottom-6 right-6 z-50 !w-14 !h-14 !text-2xl shadow-lg"
        />
      )}
    </div>
  )
}
