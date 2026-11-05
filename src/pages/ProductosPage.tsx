import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { App, Button, Modal, Form, Input, InputNumber, Popconfirm, Tag, Spin, Switch, Grid, Upload, Image as AntImage, Select, Radio } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ExportOutlined, ImportOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Producto, ProductoCreate } from '../types/producto'
import type { ProductoUnidadCreate } from '../types/productoUnidad'
import { getProductos, createProducto, updateProducto, deleteProducto, toggleProductoActivo, exportProductos, importProductos, deleteProductosBatch, deleteAllProductos, uploadProductoImagen, deleteProductoImagen } from '../services/productoService'
import categoriaService from '../services/categoriaService'
import type { Categoria } from '../types/categoria'
import unidadMedidaService from '../services/unidadMedidaService'
import type { UnidadMedida } from '../types/unidadMedida'
import { calcularPrecioBase } from '../utils/pricing'
import { resolveUrl } from '../utils/resolveUrl'
import { upperText } from '../utils/format'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import ResponsiveTable from '../components/ResponsiveTable'
import PageHeader from '../components/PageHeader'
import SubCrudSelect from '../components/SubCrudSelect'

const { useBreakpoint } = Grid

interface UnidadRow {
  key: string
  unidad_id: number | null
  es_principal: boolean
  factor_conversion: number
}

export default function ProductosPage() {
  const { message } = App.useApp()
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [allUnidades, setAllUnidades] = useState<UnidadMedida[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)
  const [form] = Form.useForm()

  const [filterCategoria, setFilterCategoria] = useState<number | undefined>(undefined)
  const [searchText, setSearchText] = useState('')
  const [importing, setImporting] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const screens = useBreakpoint()
  const isMobile = !screens.md

  const watchedCosto = Form.useWatch('precio', form)
  const watchedUtilidad = Form.useWatch('utilidad', form)

  const precioBaseCalculado = useMemo(() =>
    calcularPrecioBase(Number(watchedCosto || 0), Number(watchedUtilidad || 0)),
    [watchedCosto, watchedUtilidad]
  )

  const [imageFileList, setImageFileList] = useState<UploadFile[]>([])
  const [unidadesRows, setUnidadesRows] = useState<UnidadRow[]>([])

  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      const matchesCategoria = filterCategoria ? p.categoria_id === filterCategoria : true
      const q = searchText.toLowerCase()
      const matchesSearch = p.descripcion?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q)
      return matchesCategoria && matchesSearch
    })
  }, [productos, filterCategoria, searchText])

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination({ current: page, pageSize })
  }

  const handleFilterChange = (newFilter: number | undefined) => {
    setFilterCategoria(newFilter)
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const handleSearchChange = (newSearch: string) => {
    setSearchText(newSearch)
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const loadProductos = async () => {
    setLoading(true)
    try {
      const data = await getProductos()
      setProductos(Array.isArray(data) ? data : [])
      setPagination(prev => ({ ...prev, current: 1 }))
    } catch (error) {
      message.error('Error al cargar productos')
      setProductos([])
    } finally {
      setLoading(false)
    }
  }

  const loadCategorias = async () => {
    try {
      const data = await categoriaService.getAll()
      setCategorias(Array.isArray(data) ? data : [])
    } catch {
      message.error('Error al cargar categorías')
      setCategorias([])
    }
  }

  const loadUnidades = async () => {
    try {
      const data = await unidadMedidaService.getAll()
      setAllUnidades(Array.isArray(data) ? data : [])
    } catch {
      message.error('Error al cargar unidades')
    }
  }

  const refreshProductos = useCallback(async () => {
    try {
      const data = await getProductos()
      setProductos(Array.isArray(data) ? data : [])
    } catch {
      setProductos([])
    }
  }, [])

  useEffect(() => {
    loadProductos()
    loadCategorias()
    loadUnidades()
  }, [])

  useRealtimeRefresh('productos', refreshProductos)
  useRealtimeRefresh('dashboard', refreshProductos)

  const buildUnidadesPayload = (): ProductoUnidadCreate[] => {
    return unidadesRows
      .filter((r) => r.unidad_id != null)
      .map((r) => ({
        unidad_id: r.unidad_id!,
        es_principal: r.es_principal,
        factor_conversion: r.es_principal ? 1 : Math.max(r.factor_conversion || 1, 1),
      }))
  }

  const handleSave = async (values: ProductoCreate) => {
    try {
      const unidadesPayload = buildUnidadesPayload()
      if (unidadesPayload.length === 0) {
        message.warning('Debe agregar al menos una unidad al producto')
        return
      }
      const tienePrincipal = unidadesPayload.some((u) => u.es_principal)
      if (!tienePrincipal) {
        message.warning('Debe marcar una unidad como principal')
        return
      }
      const principales = unidadesPayload.filter((u) => u.es_principal)
      if (principales.length > 1) {
        message.warning('Solo puede marcarse una unidad como principal')
        return
      }
      const secundariaInvalida = unidadesPayload.some((u) => !u.es_principal && u.factor_conversion <= 1)
      if (secundariaInvalida) {
        message.warning('Las unidades secundarias deben tener un factor de conversión mayor a 1')
        return
      }

      let productoId = editingProducto?.id
      if (editingProducto) {
        await updateProducto(editingProducto.id, { ...values, unidades: unidadesPayload })
        message.success('Producto actualizado')
      } else {
        const created = await createProducto({ ...values, stock_actual: values.stock_inicial, usuario_id: 1, unidades: unidadesPayload })
        productoId = created.id
        message.success('Producto creado')
      }
      if (productoId) {
        const pendingFile = imageFileList.find((f) => f.originFileObj)
        if (pendingFile?.originFileObj) {
          await uploadProductoImagen(productoId, pendingFile.originFileObj as File)
        } else if (editingProducto?.imagen && imageFileList.length === 0) {
          await deleteProductoImagen(productoId)
        }
      }
      setModalVisible(false)
      form.resetFields()
      setImageFileList([])
      setUnidadesRows([])
      loadProductos()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al guardar')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const result = await deleteProducto(id)
      message.success(result?.message || 'Producto eliminado')
      loadProductos()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al eliminar')
    }
  }

  const handleToggleActivo = async (id: number) => {
    try {
      await toggleProductoActivo(id)
      loadProductos()
    } catch (error) {
      message.error('Error al cambiar estado')
    }
  }

  const handleExport = async () => {
    try {
      const blob = await exportProductos()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'productos.xlsx'
      link.click()
      URL.revokeObjectURL(url)
      message.success('Archivo exportado correctamente')
    } catch {
      message.error('Error al exportar productos')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const result = await importProductos(file)
      loadProductos()
      loadCategorias()
      if (result.errores.length > 0) {
        message.warning(`Importacion: ${result.procesados} procesados, ${result.creados} creados, ${result.actualizados} actualizados, ${result.errores.length} errores`)
        console.error('Errores de importacion:', result.errores)
      } else {
        message.success(`Importacion exitosa: ${result.procesados} procesados, ${result.creados} creados, ${result.actualizados} actualizados`)
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al importar productos')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedRowKeys.length === 0) return
    try {
      const result = await deleteProductosBatch(selectedRowKeys as number[])
      setSelectedRowKeys([])
      if (result.count === 0) message.warning('No hay productos que eliminar')
      else message.success(result.message)
      loadProductos()
    } catch (error) {
      message.error('Error al eliminar productos seleccionados')
    }
  }

  const handleDeleteAll = async () => {
    try {
      const result = await deleteAllProductos()
      if (result.count === 0) message.warning('No hay productos que eliminar')
      else message.success(result.message)
      loadProductos()
    } catch (error) {
      message.error('Error al eliminar todos los productos')
    }
  }

  const addUnidadRow = () => {
    setUnidadesRows((prev) => [
      ...prev,
      { key: String(Date.now()), unidad_id: null, es_principal: prev.length === 0, factor_conversion: 1 },
    ])
  }

  const removeUnidadRow = (key: string) => {
    setUnidadesRows((prev) => {
      const next = prev.filter((r) => r.key !== key)
      if (next.length > 0 && !next.some((r) => r.es_principal)) {
        next[0].es_principal = true
      }
      return next
    })
  }

  const updateUnidadRow = (key: string, field: keyof UnidadRow, value: any) => {
    setUnidadesRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r
        // Al marcar como principal, su factor queda fijo en 1 (no editable)
        if (field === 'es_principal' && value === true) {
          return { ...r, es_principal: true, factor_conversion: 1 }
        }
        if (field === 'factor_conversion') {
          // Si es principal se mantiene en 1; las secundarias deben ser > 1
          const val = Math.max(Number(value || 1), 1)
          return r.es_principal ? { ...r, factor_conversion: 1 } : { ...r, factor_conversion: val }
        }
        return { ...r, [field]: value }
      })
    )
  }

  const cambiarPrincipalRow = (key: string) => {
    setUnidadesRows((prev) =>
      prev.map((r) => ({
        ...r,
        es_principal: r.key === key,
        factor_conversion: r.key === key ? 1 : r.factor_conversion,
      }))
    )
  }

  const columns: ColumnsType<Producto> = useMemo(() => {
    const catMap = new Map<number, string>()
    categorias.forEach((c) => catMap.set(c.id, c.nombre))

    return [
      {
        title: 'Producto',
        key: 'producto',
        width: isMobile ? undefined : 280,
        render: (_, r) => (
          <div style={{ minWidth: isMobile ? undefined : 200, whiteSpace: 'normal', wordBreak: 'break-word' }}>
            <div><strong>[{r.codigo}]</strong> {catMap.get(r.categoria_id) || ''} - {r.descripcion}</div>
            <div className="text-gray-500 text-xs">{r.marca}</div>
          </div>
        ),
      },
      {
        title: 'Imagen',
        key: 'imagen',
        width: 70,
        render: (_, r) =>
          r.imagen ? <AntImage src={resolveUrl(r.imagen)} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 4 }} /> : <span className="text-gray-300">-</span>,
      },
      { title: 'Unidad', key: 'unidad_principal', render: (_, r) => r.unidad_principal ? `${r.unidad_principal.unidad_nombre} (${r.unidad_principal.unidad_abreviatura || '-'})` : '-' },
      { title: 'Procedencia', dataIndex: 'procedencia', key: 'procedencia', render: (val) => val || '-' },
      { title: 'Costo Bs.', dataIndex: 'precio', key: 'precio', render: (val) => `Bs. ${Number(val || 0).toFixed(2)}` },
      { title: 'Utilidad Bs.', dataIndex: 'utilidad', key: 'utilidad', render: (val) => `Bs. ${Number(val || 0).toFixed(2)}` },
      { title: 'Precio Base', key: 'precio_base', render: (_, r) =>
        `Bs. ${calcularPrecioBase(Number(r.precio || 0), Number(r.utilidad || 0)).toFixed(2)}` },
      { title: 'Usuario', dataIndex: 'usuario_nombre', key: 'usuario_nombre' },
      { title: 'Stock Actual', dataIndex: 'stock_actual', key: 'stock_actual', render: (val: number, record: Producto) => {
        const bajo = val < (record.stock_minimo || 0)
        const alto = val > (record.stock_maximo || 0) && (record.stock_maximo || 0) > 0
        const color = bajo ? 'red' : alto ? 'gold' : 'default'
        return <Tag color={color}>{val ?? 0}{bajo ? ' ⚠️' : alto ? ' ⬆' : ''}</Tag>
      }},
      { title: 'Stock Mínimo', dataIndex: 'stock_minimo', key: 'stock_minimo', render: (val: number) => val ?? 0 },
      { title: 'Stock Máximo', dataIndex: 'stock_maximo', key: 'stock_maximo', render: (val: number) => val ?? 0 },
      { title: 'Estado', dataIndex: 'activo', key: 'activo', render: (activo: boolean, record: Producto) => (
        <Switch checked={activo} onChange={() => handleToggleActivo(record.id)} size="small" />
      )},
      {
        title: 'Acciones', key: 'acciones', render: (_, record) => (
          <div className="flex gap-1">
            <Button icon={<EditOutlined />} size={isMobile ? 'middle' : 'small'} onClick={() => {
              setEditingProducto(record)
              form.setFieldsValue(record)
              setImageFileList(record.imagen ? [{ uid: '-1', name: 'imagen', status: 'done', url: resolveUrl(record.imagen) }] : [])
              const uRows: UnidadRow[] = (record.unidades || []).map((u, idx) => ({
                key: `edit-${idx}`,
                unidad_id: u.unidad_id,
                es_principal: u.es_principal,
                factor_conversion: u.es_principal ? 1 : Number(u.factor_conversion || 1),
              }))
              setUnidadesRows(uRows.length > 0 ? uRows : [{ key: '1', unidad_id: null, es_principal: true, factor_conversion: 1 }])
              setModalVisible(true)
            }} />
            <Popconfirm
              title="¿Eliminar producto?"
              onConfirm={() => handleDelete(record.id)}
              disabled={record.en_uso}
            >
              <Button
                icon={<DeleteOutlined />}
                size={isMobile ? 'middle' : 'small'}
                danger
                disabled={record.en_uso}
                title={record.en_uso ? 'El producto está en uso (compras, ventas, cotizaciones o notas de entrega) y no puede eliminarse' : undefined}
              />
            </Popconfirm>
          </div>
        )
      }
    ]
  }, [categorias, isMobile])

  const catSelectOptions = useMemo(() =>
    categorias.map((c) => ({ value: c.id, label: c.nombre })),
    [categorias]
  )

  const unidadSelectOptions = useMemo(() =>
    allUnidades.map((u) => ({ value: u.id, label: `${u.nombre} (${u.abreviatura || '-'})`, categoria: u.categoria_nombre })),
    [allUnidades]
  )

  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb']

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  }

  const hasSelected = selectedRowKeys.length > 0

  const fabVisible = isMobile && !modalVisible

  return (
    <div className={fabVisible ? 'pb-16' : ''}>
      <PageHeader title="Gestión de Productos">
        <Popconfirm
          title="¿Eliminar todos los productos?"
          onConfirm={handleDeleteAll}
          okText="Sí, eliminar todos"
          cancelText="Cancelar"
        >
          <Button danger size={isMobile ? 'small' : 'middle'}>Eliminar todos</Button>
        </Popconfirm>
        <Button icon={<ExportOutlined />} size={isMobile ? 'small' : 'middle'} onClick={handleExport}>
          Exportar
        </Button>
        <Button icon={<ImportOutlined />} size={isMobile ? 'small' : 'middle'} loading={importing} onClick={() => fileInputRef.current?.click()}>
          Importar
        </Button>
        <Button type="primary" icon={<PlusOutlined />} size={isMobile ? 'middle' : 'middle'} onClick={() => { setEditingProducto(null); form.resetFields(); setImageFileList([]); setUnidadesRows([{ key: '1', unidad_id: null, es_principal: true, factor_conversion: 1 }]); setModalVisible(true) }} className={isMobile ? 'hidden' : ''}>
          Nuevo Producto
        </Button>
      </PageHeader>
      <input type="file" accept=".xlsx,.xls" ref={fileInputRef} className="hidden" onChange={handleImport} />
      <div className="mb-4">
        <Input.Search
          placeholder="Buscar por descripción o código"
          allowClear
          className="max-w-[300px] mb-3"
          value={searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Tag.CheckableTag
            checked={filterCategoria === undefined}
            onChange={() => handleFilterChange(undefined)}
            className="!m-0"
          >
            Todas
          </Tag.CheckableTag>
          {categorias.map((cat, idx) => (
            <Tag.CheckableTag
              key={cat.id}
              checked={filterCategoria === cat.id}
              onChange={() => handleFilterChange(cat.id)}
              className="!m-0"
              style={{ backgroundColor: filterCategoria === cat.id ? colors[idx % colors.length] : undefined }}
            >
              {cat.nombre}
            </Tag.CheckableTag>
          ))}
        </div>
      </div>
      {hasSelected && (
        <div className="mb-2">
          <span className="mr-2">{selectedRowKeys.length} seleccionado(s)</span>
          <Popconfirm
            title={`¿Eliminar ${selectedRowKeys.length} producto(s)?`}
            onConfirm={handleDeleteSelected}
            okText="Sí, eliminar"
            cancelText="Cancelar"
          >
            <Button danger size="small">Eliminar seleccionados</Button>
          </Popconfirm>
        </div>
      )}
      <Spin spinning={loading}>
        <ResponsiveTable
          columns={columns}
          dataSource={filteredProductos}
          rowKey="id"
          rowSelection={!isMobile ? rowSelection : undefined}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `${total} productos`,
            onChange: handlePaginationChange,
          }}
        />
      </Spin>
      <Modal title={editingProducto ? 'Editar Producto' : 'Nuevo Producto'} open={modalVisible} onCancel={() => { setModalVisible(false); setImageFileList([]) }} onOk={() => form.submit()} className="responsive-modal" width={isMobile ? '95%' : 700}>
        {editingProducto && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <div className="flex flex-col sm:flex-row gap-4 text-sm">
              <div><strong>Creado:</strong> {editingProducto.fecha_registro ? new Date(editingProducto.fecha_registro).toLocaleString('es-BO') : '-'}</div>
              <div><strong>Última modificación:</strong> {editingProducto.fecha_actualizado ? new Date(editingProducto.fecha_actualizado).toLocaleString('es-BO') : '-'}</div>
            </div>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <div className="flex flex-wrap gap-3">
            <Form.Item name="codigo" label="Código" rules={[{ required: true }]} className="flex-1 min-w-[130px]">
              <Input
                value={form.getFieldValue('codigo') ?? ''}
                onChange={(e) => form.setFieldValue('codigo', upperText(e.target.value))}
              />
            </Form.Item>
            <Form.Item name="marca" label="Marca" rules={[{ required: true }]} className="flex-1 min-w-[130px]">
              <Input
                value={form.getFieldValue('marca') ?? ''}
                onChange={(e) => form.setFieldValue('marca', upperText(e.target.value))}
              />
            </Form.Item>
            <Form.Item name="procedencia" label="Procedencia" className="flex-1 min-w-[160px]">
              <Input
                placeholder="Origen del producto"
                value={form.getFieldValue('procedencia') ?? ''}
                onChange={(e) => form.setFieldValue('procedencia', upperText(e.target.value))}
              />
            </Form.Item>
            <Form.Item name="categoria_id" label="Categoría" rules={[{ required: true, message: 'Seleccione una categoría' }]} className="flex-1 min-w-[160px]">
              <SubCrudSelect
                placeholder="Seleccione una categoría"
                options={catSelectOptions}
                modalProps={{
                  title: 'Categorías',
                  fetchAll: categoriaService.getAll,
                  create: categoriaService.create,
                  update: categoriaService.update,
                  remove: categoriaService.delete,
                  fields: [{ name: 'nombre', label: 'Nombre', normalize: 'uppercase' }],
                  onDataChange: (list) => setCategorias(list),
                }}
              />
            </Form.Item>
          </div>
          <Form.Item name="descripcion" label="Descripción" rules={[{ required: true }]}>
            <Input.TextArea
              rows={2}
              value={form.getFieldValue('descripcion') ?? ''}
              onChange={(e) => form.setFieldValue('descripcion', upperText(e.target.value))}
            />
          </Form.Item>
          <div className="flex flex-wrap gap-3">
            <Form.Item name="precio" label="Costo Bs." rules={[{ required: true }]} className="flex-1 min-w-[110px]">
              <InputNumber min={0} step={0.01} prefix="Bs." className="w-full" />
            </Form.Item>
            <Form.Item name="utilidad" label="Utilidad Bs." initialValue={0} className="flex-1 min-w-[110px]">
              <InputNumber min={0} step={0.01} prefix="Bs." className="w-full" />
            </Form.Item>
            <Form.Item label="Precio Base" className="flex-1 min-w-[110px]">
              <InputNumber
                className="w-full"
                value={precioBaseCalculado}
                disabled
                variant="borderless"
                prefix="Bs."
              />
            </Form.Item>
          </div>
          <div className="flex flex-wrap gap-3">
            <Form.Item name="stock_inicial" label="Stock Inicial" rules={[{ required: true }]} className="flex-1 min-w-[130px]">
              <InputNumber min={0} disabled={editingProducto !== null} className="w-full" />
            </Form.Item>
            <Form.Item name="stock_minimo" label="Stock Mínimo" rules={[{ required: true }]} className="flex-1 min-w-[130px]">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="stock_maximo" label="Stock Máximo" className="flex-1 min-w-[130px]">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </div>

          {/* Sección de Unidades */}
          <div className="border rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold text-sm">Unidades del Producto</span>
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addUnidadRow}>
                Agregar unidad
              </Button>
            </div>
            {unidadesRows.length === 0 && (
              <div className="text-gray-400 text-xs text-center py-2">No hay unidades agregadas</div>
            )}
            {unidadesRows.map((row) => (
              <div key={row.key} className="flex flex-wrap gap-2 items-end mb-2">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-xs text-gray-500">Unidad</label>
                  <Select
                    showSearch
                    placeholder="Seleccionar unidad"
                    value={row.unidad_id}
                    onChange={(val) => updateUnidadRow(row.key, 'unidad_id', val)}
                    options={unidadSelectOptions}
                    filterOption={(input, option) =>
                      (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                    className="w-full"
                  />
                </div>
                <div className="min-w-[100px]">
                  <label className="text-xs text-gray-500">Factor de conversión</label>
                  <InputNumber
                    min={row.es_principal ? 1 : 1.0001}
                    step={0.01}
                    value={row.es_principal ? 1 : row.factor_conversion}
                    disabled={row.es_principal}
                    title={row.es_principal ? 'La unidad principal tiene factor 1' : 'Debe ser mayor a 1'}
                    onChange={(val) => updateUnidadRow(row.key, 'factor_conversion', val || 1)}
                    className="w-full"
                  />
                </div>
                <div className="min-w-[80px]">
                  <label className="text-xs text-gray-500">Principal</label>
                  <div>
                    <Radio
                      checked={row.es_principal}
                      onChange={() => cambiarPrincipalRow(row.key)}
                    />
                  </div>
                </div>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeUnidadRow(row.key)}
                />
              </div>
            ))}
          </div>

          <Form.Item label="Imagen del producto">
            <Upload
              listType="picture-card"
              maxCount={1}
              fileList={imageFileList}
              accept=".jpg,.jpeg,.png,.gif,.webp"
              beforeUpload={() => false}
              onChange={({ fileList }) => setImageFileList(fileList)}
            >
              {imageFileList.length >= 1 ? null : (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 4 }}>Subir imagen</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
      {fabVisible && (
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => { setEditingProducto(null); form.resetFields(); setImageFileList([]); setUnidadesRows([{ key: '1', unidad_id: null, es_principal: true, factor_conversion: 1 }]); setModalVisible(true) }}
          className="!fixed bottom-6 right-6 z-50 !w-14 !h-14 !text-2xl shadow-lg"
        />
      )}
    </div>
  )
}
