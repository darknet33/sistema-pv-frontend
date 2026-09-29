import { useEffect, useState, useMemo, useCallback } from 'react'
import { Table, Button, Modal, Form, InputNumber, DatePicker, Space, Popconfirm, Tag, Input, Switch, Grid, App, Steps } from 'antd'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { Compra, CompraCreate } from '../types/compra'
import { getCompras, createCompra, updateCompra, deleteCompra, anularCompra, fetchCompraReportBlob, fetchCompraPdfBlob } from '../services/compraService'
import usePdfPreview from '../hooks/usePdfPreview'
import { getProveedores, createProveedor, updateProveedor, deleteProveedor } from '../services/proveedorService'
import comprobanteService from '../services/comprobanteService'
import { getProductos } from '../services/productoService'
import estadoService from '../services/estadoService'
import type { Proveedor } from '../types/proveedor'
import type { Producto } from '../types/producto'
import type { Categoria } from '../types/categoria'
import categoriaService from '../services/categoriaService'
import { formatCurrency } from '../utils/format'
import ResponsiveTable from '../components/ResponsiveTable'
import PageHeader from '../components/PageHeader'
import SubCrudSelect from '../components/SubCrudSelect'
import ProductoDetalleList from '../components/ProductoDetalleList'
import WizardProductoSelector, { type SeleccionProducto } from '../components/WizardProductoSelector'

const { useBreakpoint } = Grid

interface DetalleLine {
  key: string
  producto_id: number | null
  producto_nombre: string
  producto_codigo: string
  producto_categoria: string
  cantidad: number | null
  costo: number
  utilidad_pct: number
}

export default function ComprasPage() {
  const { message } = App.useApp()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const { openPdf, previewModal } = usePdfPreview()
  const [compras, setCompras] = useState<Compra[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null)
  const [form] = Form.useForm()

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [comprobantes, setComprobantes] = useState<{ id: number; nombre: string; numero: number }[]>([])
  const [estados, setEstados] = useState<{ id: number; nombre: string }[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])

  const [detalles, setDetalles] = useState<DetalleLine[]>([])
  const [seleccionPaso0, setSeleccionPaso0] = useState<Record<number, SeleccionProducto>>({})
  const [numComprobanteAuto, setNumComprobanteAuto] = useState('')
  const [autoNum, setAutoNum] = useState(false)

  const [filterFecha, setFilterFecha] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [searchProveedorText, setSearchProveedorText] = useState('')
  const [filterEstado, setFilterEstado] = useState<number | undefined>(undefined)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })

  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb']

  const [wizardCurrent, setWizardCurrent] = useState(0)
  const [saving, setSaving] = useState(false)

  const proveedorOptions = useMemo(() =>
    proveedores.filter((p) => p.activo !== false).map((p) => ({ value: p.id, label: p.nombre })),
    [proveedores]
  )

  const comprobanteOptions = useMemo(() =>
    comprobantes.map((c) => ({ value: c.id, label: c.nombre })),
    [comprobantes]
  )

  const estadoOptions = useMemo(() =>
    estados.map((e) => ({ value: e.id, label: e.nombre })),
    [estados]
  )

  const catMap = useMemo(() => {
    const map = new Map<number, string>()
    categorias.forEach((c) => map.set(c.id, c.nombre))
    return map
  }, [categorias])

  const loadCompras = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCompras()
      setCompras(data)
    } catch {
      message.error('Error al cargar compras')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProveedores = useCallback(async () => {
    try {
      const data = await getProveedores()
      setProveedores(data)
    } catch {
      message.error('Error al cargar proveedores')
    }
  }, [])

  const loadComprobantes = useCallback(async () => {
    try {
      const data = await comprobanteService.getAll()
      setComprobantes(data)
    } catch {
      message.error('Error al cargar comprobantes')
    }
  }, [])

  const loadEstados = useCallback(async () => {
    try {
      const data = await estadoService.getAll()
      setEstados(data)
    } catch {
      message.error('Error al cargar estados')
    }
  }, [])

  const loadProductos = useCallback(async () => {
    try {
      const data = await getProductos()
      setProductos(Array.isArray(data) ? data : [])
    } catch {
      message.error('Error al cargar productos')
      setProductos([])
    }
  }, [])

  const loadCategorias = useCallback(async () => {
    try {
      const data = await categoriaService.getAll()
      setCategorias(Array.isArray(data) ? data : [])
    } catch {
      message.error('Error al cargar categorías')
      setCategorias([])
    }
  }, [])

  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadCompras(),
      loadProveedores(),
      loadComprobantes(),
      loadEstados(),
      loadProductos(),
      loadCategorias(),
    ])
  }, [loadCompras, loadProveedores, loadComprobantes, loadEstados, loadProductos, loadCategorias])

  useEffect(() => { loadAllData() }, [loadAllData])

  const refreshCompras = useCallback(() => {
    loadCompras()
    loadProductos()
  }, [loadCompras, loadProductos])

  useRealtimeRefresh('compras', refreshCompras)
  useRealtimeRefresh('dashboard', refreshCompras)

  const filteredCompras = useMemo(() => {
    return compras.filter((c) => {
      if (filterFecha && filterFecha[0] && filterFecha[1]) {
        const fecha = dayjs(c.fecha)
        const inicio = filterFecha[0].startOf('day')
        const fin = filterFecha[1].endOf('day')
        if (fecha.isBefore(inicio) || fecha.isAfter(fin)) return false
      }
      if (searchProveedorText) {
        const q = searchProveedorText.toLowerCase()
        if (!c.proveedor_nombre?.toLowerCase().includes(q)) return false
      }
      if (filterEstado && c.estado_id !== filterEstado) return false
      return true
    })
  }, [compras, filterFecha, searchProveedorText, filterEstado])

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination({ current: page, pageSize })
  }

  // Si el filtro deja menos registros que la página actual, se vuelve a la primera
  const currentPage = Math.min(
    pagination.current,
    Math.max(1, Math.ceil(filteredCompras.length / pagination.pageSize))
  )

  const openCreateModal = async () => {
    await loadProductos()
    setEditingCompra(null)
    setDetalles([])
    setSeleccionPaso0({})
    setNumComprobanteAuto('')
    setAutoNum(false)
    setWizardCurrent(0)
    form.resetFields()
    form.setFieldsValue({
      fecha: dayjs(),
    })
    setModalVisible(true)
  }

  const openEditModal = async (compra: Compra) => {
    await loadProductos()
    setEditingCompra(compra)
    setAutoNum(false)
    form.setFieldsValue({
      fecha: dayjs(compra.fecha),
      proveedor_id: compra.proveedor_id,
      comprobante_id: compra.comprobante_id,
      num_comprobante: compra.num_comprobante,
      estado_id: compra.estado_id,
    })
    setNumComprobanteAuto(compra.num_comprobante)
    setSeleccionPaso0(
      (compra.detalles || []).reduce<Record<number, SeleccionProducto>>((acc, d) => {
        if (d.producto_id != null) acc[d.producto_id] = { cantidad: d.cantidad || 1 }
        return acc
      }, {})
    )
    setDetalles(
      compra.detalles?.map((d, i) => {
        const p = productos.find((p2) => p2.id === d.producto_id)
        const costo = p ? Number(p.precio || 0) : Number(d.costo)
        const utilidad_pct = costo > 0 ? Math.round((Number(p?.utilidad || 0) / costo) * 10000) / 100 : 0
        return {
          key: String(i + 1),
          producto_id: d.producto_id,
          producto_nombre: d.producto_nombre,
          producto_codigo: d.producto_codigo,
          producto_categoria: d.producto_categoria || '',
          cantidad: d.cantidad,
          costo,
          utilidad_pct,
        }
      }) || [{ key: '1', producto_id: null, producto_nombre: '', producto_codigo: '', producto_categoria: '', cantidad: 1, costo: 0, utilidad_pct: 0 }]
    )
    setWizardCurrent((compra.detalles?.length ?? 0) > 0 ? 1 : 0)
    setModalVisible(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const values = await form.validateFields()
      const validDetalles = detalles.filter((d) => d.producto_id != null)
      if (validDetalles.length === 0) {
        message.error('Debe agregar al menos un producto')
        return
      }

      const compraData: CompraCreate = {
        fecha: values.fecha.format('YYYY-MM-DD'),
        proveedor_id: values.proveedor_id,
        comprobante_id: values.comprobante_id,
        estado_id: values.estado_id,
        num_comprobante: autoNum ? undefined : (values.num_comprobante || ''),
        automatico: autoNum,
        detalles: validDetalles.map((d) => ({
          producto_id: d.producto_id!,
          cantidad: (d.cantidad || 0),
          costo: d.costo,
        })),
      }

      if (editingCompra) {
        compraData.num_comprobante = values.num_comprobante
        await updateCompra(editingCompra.id, compraData)
        message.success('Compra actualizada')
      } else {
        await createCompra(compraData)
        message.success('Compra registrada')
      }

      setModalVisible(false)
      form.resetFields()
      setDetalles([])
      setNumComprobanteAuto('')
      loadCompras()
    } catch (error: any) {
      if (error.errorFields) {
        const nombres = error.errorFields.map((f: any) => {
          const map: Record<string, string> = {
            fecha: 'Fecha', cliente_id: 'Cliente', proveedor_id: 'Proveedor',
            comprobante_id: 'Comprobante', estado_id: 'Estado', validez_dias: 'Validez (días)',
          }
          return map[f.name] || f.name
        })
        message.error(`Complete los campos obligatorios: ${nombres.join(', ')}`)
      } else {
        message.error(error.response?.data?.detail || 'Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleAnular = async (id: number) => {
    try {
      await anularCompra(id)
      message.success('Compra anulada')
      loadCompras()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al anular')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteCompra(id)
      message.success('Compra eliminada')
      loadCompras()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al eliminar')
    }
  }

  const commitSeleccionCompra = () => {
    setDetalles((prev) => {
      const prevByProducto = new Map(prev.filter((d) => d.producto_id != null).map((d) => [d.producto_id!, d]))
      const ids = Object.keys(seleccionPaso0).map(Number)
      return ids.map((pid) => {
        const sel = seleccionPaso0[pid]
        const existing = prevByProducto.get(pid)
        if (existing) {
          return { ...existing, cantidad: sel.cantidad }
        }
        const producto = productos.find((p) => p.id === pid)
        if (!producto) return null
        const costo = Number(producto.precio || 0)
        const utilidad_pct = costo > 0 ? Math.round((Number(producto.utilidad || 0) / costo) * 10000) / 100 : 0
        return {
          key: `${pid}-${Date.now()}-${Math.random()}`,
          producto_id: pid,
          producto_nombre: producto.descripcion,
          producto_codigo: producto.codigo,
          producto_categoria: catMap.get(producto.categoria_id) || '',
          cantidad: sel.cantidad,
          costo,
          utilidad_pct,
        }
      }).filter((d): d is NonNullable<typeof d> => d != null)
    })
  }

  const removeDetalleRow = (key: string) => {
    const line = detalles.find((d) => d.key === key)
    setDetalles((prev) => prev.filter((d) => d.key !== key))
    if (line && line.producto_id != null) {
      setSeleccionPaso0((prev) => {
        const next = { ...prev }
        delete next[line.producto_id!]
        return next
      })
    }
  }

  const detallesValidos = useMemo(() => detalles.filter((d) => d.producto_id != null), [detalles])
  const wizardSteps = [{ title: 'Productos' }, { title: 'Costos' }, { title: 'Datos' }]

  const detalleImagen = (item: DetalleLine) => productos.find((p) => p.id === item.producto_id)?.imagen || null
  const detalleMarca = (item: DetalleLine) => productos.find((p) => p.id === item.producto_id)?.marca
  const detalleProcedencia = (item: DetalleLine) => productos.find((p) => p.id === item.producto_id)?.procedencia

  const goNext = () => {
    if (wizardCurrent === 0) {
      if (Object.keys(seleccionPaso0).length === 0) {
        message.warning('Debe agregar al menos un producto')
        return
      }
      commitSeleccionCompra()
    }
    setWizardCurrent((c) => Math.min(2, c + 1))
  }

  const goBack = () => setWizardCurrent((c) => Math.max(0, c - 1))

  const handleCloseModal = () => {
    setModalVisible(false)
    setWizardCurrent(0)
    setDetalles([])
    setSeleccionPaso0({})
    setNumComprobanteAuto('')
  }

  const updateDetalle = (key: string, field: keyof DetalleLine, value: any) => {
    setDetalles((prev) => prev.map((d) => (d.key === key ? { ...d, [field]: value } : d)))
  }

  const updateNumComprobanteAuto = (comprobanteId: number | null) => {
    if (!comprobanteId || editingCompra || !autoNum) return
    const comp = comprobantes.find((c) => c.id === comprobanteId)
    if (comp) {
      setNumComprobanteAuto(String(comp.numero).padStart(8, '0'))
    } else {
      setNumComprobanteAuto('')
    }
  }

  const totalCalculado = useMemo(() => {
    return detalles.reduce((sum, d) => sum + (d.cantidad || 0) * (d.costo || 0), 0)
  }, [detalles])

  const handleDownloadReport = async () => {
    try {
      const inicio = filterFecha?.[0]?.format('YYYY-MM-DDTHH:mm:ss') || dayjs().startOf('month').format('YYYY-MM-DDTHH:mm:ss')
      const fin = filterFecha?.[1]?.format('YYYY-MM-DDTHH:mm:ss') || dayjs().format('YYYY-MM-DDTHH:mm:ss')
      await openPdf(
        () => fetchCompraReportBlob(inicio, fin, searchProveedorText || undefined, filterEstado),
        'Reporte de Compras',
        `reporte_compras_${dayjs().format('YYYYMMDD')}.pdf`
      )
    } catch {
      message.error('Error al descargar reporte')
    }
  }

  const handlePrintPdf = async (id: number) => {
    await openPdf(() => fetchCompraPdfBlob(id), `Comprobante de Compra #${id}`, `compra_${id}.pdf`)
  }

  const columns: ColumnsType<Compra> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', render: (val: string) => dayjs(val).format('DD/MM/YYYY HH:mm') },
    { title: 'Proveedor', dataIndex: 'proveedor_nombre', key: 'proveedor_nombre' },
    { title: 'Comprobante', key: 'comprobante', render: (_, r) => `${r.comprobante_nombre} ${r.num_comprobante || ''}` },
    { title: 'Estado', dataIndex: 'estado_nombre', key: 'estado_nombre', render: (val: string) => <Tag>{val}</Tag> },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (val: any) => formatCurrency(val) },
    { title: 'Usuario', dataIndex: 'usuario_username', key: 'usuario_username' },
    {
      title: 'Acciones', key: 'acciones', width: 200, render: (_, record) => (
        <div className="flex gap-1">
          <Button icon={<EditOutlined />} size={isMobile ? 'middle' : 'small'} onClick={() => openEditModal(record)} />
          <Button icon={<EyeOutlined />} size={isMobile ? 'middle' : 'small'} onClick={() => handlePrintPdf(record.id)} title="Vista previa del PDF">
            Vista previa
          </Button>
          {record.estado_nombre !== 'Anulado' ? (
            <Popconfirm title="¿Anular compra?" onConfirm={() => handleAnular(record.id)}>
              <Button icon={<CloseCircleOutlined />} size={isMobile ? 'middle' : 'small'} className="!text-amber-500" />
            </Popconfirm>
          ) : (
            <Popconfirm title="¿Eliminar compra?" onConfirm={() => handleDelete(record.id)}>
              <Button icon={<DeleteOutlined />} size={isMobile ? 'middle' : 'small'} danger />
            </Popconfirm>
          )}
        </div>
      ),
    },
  ]

  const detColumns: ColumnsType<any> = [
    { title: 'Código', dataIndex: 'producto_codigo', key: 'producto_codigo', width: 100 },
    { title: 'Producto', key: 'producto', render: (_: any, r: any) => `${r.producto_categoria ? r.producto_categoria + ' - ' : ''}${r.producto_nombre}` },
    { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad', width: 80 },
    { title: 'Costo', dataIndex: 'costo', key: 'costo', width: 100, render: (val: any) => `Bs. ${Number(val || 0).toFixed(2)}` },
    { title: 'Subtotal', key: 'subtotal', width: 100, render: (_: any, r: any) => `Bs. ${(r.cantidad * Number(r.costo || 0)).toFixed(2)}` },
  ]

  const expandedRowRender = (record: Compra) => {
    return (
      <Table
        columns={detColumns}
        dataSource={record.detalles?.map((d) => ({ ...d, key: d.id }))}
        pagination={false}
        rowKey="id"
        size="small"
        scroll={{ x: 'max-content' }}
      />
    )
  }

  const fabVisible = isMobile && !modalVisible

  return (
    <div className={fabVisible ? 'pb-16' : ''}>
      <PageHeader title="Gestión de Compras">
        <Button icon={<DownloadOutlined />} size={isMobile ? 'small' : 'middle'} onClick={handleDownloadReport}>
          Reporte PDF
        </Button>
        <Button type="primary" icon={<PlusOutlined />} size={isMobile ? 'middle' : 'middle'} onClick={openCreateModal} className={isMobile ? 'hidden' : ''}>
          Nueva Compra
        </Button>
      </PageHeader>

      <div className="mb-4">
        <div className="flex flex-wrap gap-3 mb-3">
          <DatePicker.RangePicker
            value={filterFecha as any}
            onChange={(dates) => setFilterFecha(dates as any)}
            placeholder={['Fecha inicio', 'Fecha fin']}
          />
          <Input.Search
            placeholder="Buscar por proveedor"
            allowClear
            className="max-w-[300px]"
            value={searchProveedorText}
            onChange={(e) => setSearchProveedorText(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Tag.CheckableTag
            checked={filterEstado === undefined}
            onChange={() => setFilterEstado(undefined)}
            className="!m-0"
          >
            Todos
          </Tag.CheckableTag>
          {estados.map((est, idx) => (
            <Tag.CheckableTag
              key={est.id}
              checked={filterEstado === est.id}
              onChange={() => setFilterEstado(est.id)}
              className="!m-0"
              style={{ backgroundColor: filterEstado === est.id ? colors[idx % colors.length] : undefined }}
            >
              {est.nombre}
            </Tag.CheckableTag>
          ))}
        </div>
      </div>

      <ResponsiveTable
        columns={columns}
        dataSource={filteredCompras}
        loading={loading}
        rowKey="id"
        pagination={{
          current: currentPage,
          pageSize: pagination.pageSize,
          size: isMobile ? 'small' : 'default',
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `${total} compras`,
          onChange: handlePaginationChange,
        }}
        expandable={!isMobile ? { expandedRowRender, rowExpandable: (r) => r.detalles && r.detalles.length > 0 } : undefined}
      />

      {fabVisible && (
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
          className="!fixed bottom-6 right-6 z-50 !w-14 !h-14 !text-2xl shadow-lg"
        />
      )}

      <Modal
        title={editingCompra ? 'Editar Compra' : 'Nueva Compra'}
        open={modalVisible}
        onCancel={handleCloseModal}
        width={820}
        className="responsive-modal"
        footer={
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
              <div />
            </div>
            <div className="flex flex-col items-center gap-2 md:items-end">
              {wizardCurrent > 0 && (
                <div className="text-center md:text-right font-bold text-base leading-tight">
                  Total: Bs. {totalCalculado.toFixed(2)}
                </div>
              )}
              <div className="flex gap-2 justify-center">
                {wizardCurrent > 0 && <Button onClick={goBack}>Anterior</Button>}
                {wizardCurrent < 2 ? (
                  <Button type="primary" onClick={goNext} disabled={wizardCurrent === 0 && Object.keys(seleccionPaso0).length === 0}>
                    Siguiente
                  </Button>
                ) : (
                  <Button type="primary" loading={saving} onClick={handleSave}>
                    Finalizar
                  </Button>
                )}
              </div>
            </div>
          </div>
        }
      >
        <Steps size="small" direction="horizontal" responsive={false} current={wizardCurrent} items={wizardSteps} className="mb-4 steps-wizard" />

        {wizardCurrent === 0 && (
          <WizardProductoSelector
            productos={productos}
            categorias={categorias}
            seleccion={seleccionPaso0}
            onSeleccionChange={setSeleccionPaso0}
            showCostInfo
            showCostOnly
          />
        )}

        {wizardCurrent === 1 && (
          <>
            <ProductoDetalleList<DetalleLine>
              items={detallesValidos}
              getImagen={detalleImagen}
              getMarca={detalleMarca}
              getProcedencia={detalleProcedencia}
              getPrecio={(item) => item.costo}
              getSubtotal={(item) => (item.cantidad || 0) * item.costo}
              onRemove={removeDetalleRow}
              quantityReadOnly
              renderExtra={(item) => {
                const prod = productos.find((p) => p.id === item.producto_id)
                return (
                  <div className="flex flex-col gap-1 items-end">
                    <InputNumber
                      size="small"
                      min={0}
                      step={0.01}
                      prefix="Bs."
                      placeholder="Costo"
                      className="w-[110px]"
                      value={item.costo}
                      onChange={(val) => updateDetalle(item.key, 'costo', val || 0)}
                    />
                    {prod && (
                      <span className="text-xs text-gray-500">
                        P. actual: Bs. {Number(prod.precio || 0).toFixed(2)}
                      </span>
                    )}
                  </div>
                )
              }}
            />
          </>
        )}

        {wizardCurrent === 2 && (
          <Form form={form} layout="vertical">
            <Form.Item name="fecha" label="Fecha" rules={[{ required: true }]} getValueProps={(value) => ({ value: value ? dayjs(value) : undefined })}>
              <DatePicker className="w-full" />
            </Form.Item>

          <div className="flex flex-wrap gap-3">
            <Form.Item name="proveedor_id" label="Proveedor" rules={[{ required: true }]} className="flex-1 min-w-[180px] !mb-3">
              <SubCrudSelect
                placeholder="Seleccione un proveedor"
                options={proveedorOptions}
                disabled={editingCompra !== null}
                modalProps={{
                  title: 'Proveedores',
                  fetchAll: getProveedores,
                  create: createProveedor,
                  update: updateProveedor,
                  remove: deleteProveedor,
                  fields: [
                    { name: 'nombre', label: 'Nombre', normalize: 'uppercase' },
                    { name: 'nit', label: 'NIT' },
                    { name: 'materiales', label: 'Materiales', normalize: 'capitalize' },
                    { name: 'contacto', label: 'Contacto', normalize: 'capitalize' },
                    { name: 'celular_contacto', label: 'Celular' },
                    { name: 'email_contacto', label: 'Email' },
                  ],
                  onDataChange: (list) => setProveedores(list),
                }}
              />
            </Form.Item>
            <Form.Item name="comprobante_id" label="Comprobante" rules={[{ required: true }]} className="flex-1 min-w-[130px] !mb-3">
              <SubCrudSelect
                placeholder="Seleccione un comprobante"
                options={comprobanteOptions}
                disabled={editingCompra !== null}
                onChange={(val) => updateNumComprobanteAuto(val as number | null)}
                modalProps={{
                  title: 'Comprobantes',
                  fetchAll: comprobanteService.getAll,
                  create: comprobanteService.create,
                  update: comprobanteService.update,
                  remove: comprobanteService.delete,
                  fields: [
                    { name: 'nombre', label: 'Nombre', normalize: 'capitalize' },
                    { name: 'numero', label: 'Número', type: 'number' },
                  ],
                  onDataChange: (list) => setComprobantes(list),
                }}
              />
            </Form.Item>
            <Form.Item name="num_comprobante" label="N° Comprobante" className="flex-1 min-w-[160px] !mb-3">
              <Space.Compact className="w-full">
                <Input
                  placeholder={autoNum ? 'Automático' : 'Ingrese número'}
                  value={editingCompra ? undefined : (autoNum ? (numComprobanteAuto || undefined) : undefined)}
                  disabled={editingCompra !== null || autoNum}
                  className="w-full"
                />
                {!editingCompra && (
                  <Switch checkedChildren="A" unCheckedChildren="M" checked={autoNum} onChange={(v) => { setAutoNum(v); if (v) setNumComprobanteAuto('') }} />
                )}
              </Space.Compact>
            </Form.Item>
          </div>

          <Form.Item name="estado_id" label="Estado" rules={[{ required: true }]}>
            <SubCrudSelect
              placeholder="Seleccione un estado"
              options={estadoOptions}
              modalProps={{
                title: 'Estados',
                fetchAll: estadoService.getAll,
                create: estadoService.create,
                update: estadoService.update,
                remove: estadoService.delete,
                fields: [{ name: 'nombre', label: 'Nombre', normalize: 'capitalize' }],
                onDataChange: (list) => setEstados(list),
              }}
            />
          </Form.Item>

          <div className="mt-2 mb-3">
            <div className="text-sm font-medium mb-2">Detalle (sin editar)</div>
            <ProductoDetalleList<DetalleLine>
              items={detallesValidos}
              getImagen={detalleImagen}
              getMarca={detalleMarca}
              getProcedencia={detalleProcedencia}
              getPrecio={(item) => item.costo}
              getSubtotal={(item) => (item.cantidad || 0) * item.costo}
              readOnly
            />
          </div>

          {!editingCompra && numComprobanteAuto && (
            <div className="mb-2">
              <Tag color="blue">N° Comprobante: {numComprobanteAuto}</Tag>
            </div>
          )}
        </Form>
        )}
      </Modal>
      {previewModal}
    </div>
  )
}
