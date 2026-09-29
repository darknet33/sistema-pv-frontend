import { useEffect, useState, useMemo, useCallback } from 'react'
import { Table, Button, Modal, Form, InputNumber, DatePicker, Popconfirm, Tag, Input, Switch, Grid, Card, Space, Select, App, Steps } from 'antd'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  CheckOutlined, ShoppingCartOutlined, ProfileOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { capitalizeWords } from '../utils/format'
import type { Cotizacion, CotizacionCreate } from '../types/cotizacion'
import {
  getCotizaciones, createCotizacion, updateCotizacion, deleteCotizacion, confirmarCotizacion,
  convertirCotizacionEnVenta, fetchCotizacionPdfBlob,
} from '../services/cotizacionService'
import usePdfPreview from '../hooks/usePdfPreview'
import { getClientes, createCliente, updateCliente, deleteCliente } from '../services/clienteService'
import comprobanteService from '../services/comprobanteService'
import estadoService from '../services/estadoService'
import { getProductos } from '../services/productoService'
import categoriaService from '../services/categoriaService'

import type { Cliente } from '../types/cliente'
import type { Producto } from '../types/producto'
import type { Categoria } from '../types/categoria'
import ResponsiveTable from '../components/ResponsiveTable'
import PageHeader from '../components/PageHeader'
import ProductoDetalleList from '../components/ProductoDetalleList'
import WizardProductoSelector, { type SeleccionProducto } from '../components/WizardProductoSelector'
import SubCrudSelect from '../components/SubCrudSelect'

const { useBreakpoint } = Grid

const FORMA_PAGO_OPTIONS = ['Transferencia SIGEP', 'Cheque', 'Al contado']

const IVA_RATE = 13
const IT_RATE = 3

interface UnidadDisponible {
  id: number
  nombre: string
  abreviatura: string
  factor: number
  es_principal: boolean
}

interface DetalleLine {
  key: string
  producto_id: number | null
  producto_nombre: string
  producto_codigo: string
  producto_categoria: string
  unidad_id: number | null
  unidad_nombre: string
  unidad_abreviatura: string
  es_principal: boolean
  factor_conversion: number
  cantidad: number | null
  costo: number
  costo_base: number
  utilidad_pct: number
  precio_venta: number
  stock_actual: number
  unidades_disponibles: UnidadDisponible[]
}

const estadoColor: Record<string, string> = {
  Enviado: 'blue',
  Confirmado: 'green',
  Vencido: 'red',
}

function calcularPrecioVenta(costo: number, pct: number): number {
  const c = Number(costo || 0)
  const p = Number(pct || 0)
  return Math.round((c + (c * p / 100)) * 100) / 100
}

export default function CotizacionesPage() {
  const { message } = App.useApp()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const { openPdf, previewModal } = usePdfPreview()
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCotizacion, setEditingCotizacion] = useState<Cotizacion | null>(null)
  const [form] = Form.useForm()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [comprobantes, setComprobantes] = useState<{ id: number; nombre: string; numero: number }[]>([])
  const [estados, setEstados] = useState<{ id: number; nombre: string }[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])


  const [detalles, setDetalles] = useState<DetalleLine[]>([])
  const [seleccionPaso0, setSeleccionPaso0] = useState<Record<number, SeleccionProducto>>({})
  const [incluirImagenes, setIncluirImagenes] = useState(false)
  const [conFactura, setConFactura] = useState(false)

  const [filterFecha, setFilterFecha] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [searchClienteText, setSearchClienteText] = useState('')
  const [filterEstado, setFilterEstado] = useState<string | undefined>(undefined)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })

  const [wizardCurrent, setWizardCurrent] = useState(0)
  const [saving, setSaving] = useState(false)

  const [detailVisible, setDetailVisible] = useState(false)
  const [detailCotizacion, setDetailCotizacion] = useState<Cotizacion | null>(null)

  const [convertVisible, setConvertVisible] = useState(false)
  const [convertCotizacion, setConvertCotizacion] = useState<Cotizacion | null>(null)
  const [convertForm] = Form.useForm()
  const [autoNum, setAutoNum] = useState(true)

  const clienteOptions = useMemo(
    () => clientes.filter((c) => c.activo !== false).map((c) => ({ value: c.id, label: c.nombre })),
    [clientes]
  )

  const catMap = useMemo(() => {
    const map = new Map<number, string>()
    categorias.forEach((c) => map.set(c.id, c.nombre))
    return map
  }, [categorias])

  const watchedFecha = Form.useWatch('fecha', form)
  const watchedValidez = Form.useWatch('validez_dias', form)
  const watchedDescuento = Form.useWatch('descuento', form)
  const descuentoPct = Number(watchedDescuento || 0)

  const impuestoPct = conFactura ? IVA_RATE : 0
  const itPct = conFactura ? IT_RATE : 0

  const precioFinalItem = (neto: number) =>
    conFactura
      ? Math.round((neto || 0) * 1.13 * 1.03 * 100) / 100
      : (neto || 0)

  const loadCotizaciones = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCotizaciones()
      setCotizaciones(data)
    } catch {
      message.error('Error al cargar cotizaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadClientes = useCallback(async () => {
    try {
      const data = await getClientes()
      setClientes(data)
    } catch {
      message.error('Error al cargar clientes')
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
      loadCotizaciones(),
      loadClientes(),
      loadComprobantes(),
      loadEstados(),
      loadProductos(),
      loadCategorias(),
    ])
  }, [loadCotizaciones, loadClientes, loadComprobantes, loadEstados, loadProductos, loadCategorias])

  useEffect(() => { loadAllData() }, [loadAllData])

  const refresh = useCallback(() => {
    loadCotizaciones()
    loadProductos()
  }, [loadCotizaciones, loadProductos])

  useRealtimeRefresh('cotizaciones', refresh)
  useRealtimeRefresh('ventas', refresh)

  const filteredCotizaciones = useMemo(() => {
    return cotizaciones.filter((c) => {
      if (filterFecha && filterFecha[0] && filterFecha[1]) {
        const fecha = dayjs(c.fecha)
        const inicio = filterFecha[0].startOf('day')
        const fin = filterFecha[1].endOf('day')
        if (fecha.isBefore(inicio) || fecha.isAfter(fin)) return false
      }
      if (searchClienteText) {
        const q = searchClienteText.toLowerCase()
        if (!c.cliente_razon_social?.toLowerCase().includes(q)) return false
      }
      if (filterEstado && c.estado !== filterEstado) return false
      return true
    })
  }, [cotizaciones, filterFecha, searchClienteText, filterEstado])

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination({ current: page, pageSize })
  }

  // Si el filtro deja menos registros que la página actual, se vuelve a la primera
  const currentPage = Math.min(
    pagination.current,
    Math.max(1, Math.ceil(filteredCotizaciones.length / pagination.pageSize))
  )

  const openCreateModal = async () => {
    await loadProductos()
    setEditingCotizacion(null)
    setDetalles([])
    setSeleccionPaso0({})
    setIncluirImagenes(false)
    setConFactura(false)
    setWizardCurrent(0)
    form.resetFields()
    form.setFieldsValue({
      fecha: dayjs(),
      validez_dias: 15,
      descuento: 0,
    })
    setModalVisible(true)
  }

  const openEditModal = async (cot: Cotizacion) => {
    await loadProductos()
    setEditingCotizacion(cot)
    form.setFieldsValue({
      fecha: dayjs(cot.fecha),
      cliente_id: cot.cliente_id,
      modalidad_pago: cot.modalidad_pago || '',
      forma_pago: cot.forma_pago || '',
      validez_dias: cot.validez_dias,
      terminos_condiciones: cot.terminos_condiciones || '',
      descuento: Number(cot.descuento || 0),
    })
    setDetalles(
      cot.detalles?.map((d, i) => {
        const prod = productos.find((p) => p.id === d.producto_id)
        // Catálogo ACTUAL de unidades del producto (refleja cambios hechos al producto)
        const unidadesDisponibles: UnidadDisponible[] = (prod?.unidades || []).map((pu) => ({
          id: pu.unidad_id,
          nombre: pu.unidad_nombre,
          abreviatura: pu.unidad_abreviatura,
          factor: Number(pu.factor_conversion || 1),
          es_principal: !!pu.es_principal,
        }))
        // La unidad de la línea, tomada del catálogo actual (si se eliminó, cae a la principal)
        const unidadSel = unidadesDisponibles.find((uu) => uu.id === d.unidad_id) || unidadesDisponibles.find((uu) => uu.es_principal) || unidadesDisponibles[0] || null
        const factorActual = unidadSel?.factor || 1
        const esPrincipalActual = unidadSel?.es_principal ?? true
        // costo_base reconstruido: costo guardado estaba en la unidad de la línea (factor al crear)
        const factorGuardado = Number(d.factor_conversion || 1)
        const costoBase = factorGuardado > 0 ? (Number(d.costo || 0) / factorGuardado) : Number(d.costo || 0)
        const costo = esPrincipalActual ? costoBase : costoBase * factorActual
        return {
          key: String(i + 1),
          producto_id: d.producto_id,
          producto_nombre: d.producto_nombre,
          producto_codigo: d.producto_codigo,
          producto_categoria: d.producto_categoria || '',
          unidad_id: unidadSel?.id ?? null,
          unidad_nombre: unidadSel?.nombre || d.unidad_nombre || '',
          unidad_abreviatura: unidadSel?.abreviatura || d.unidad_abreviatura || '',
          es_principal: esPrincipalActual,
          factor_conversion: factorActual,
          cantidad: d.cantidad,
          costo: costo,
          costo_base: costoBase,
          utilidad_pct: Number(d.utilidad_pct || 0),
          precio_venta: calcularPrecioVenta(costo, Number(d.utilidad_pct || 0)),
          stock_actual: Number(d.stock_actual || 0),
          unidades_disponibles: unidadesDisponibles,
        }
      }) || [{ key: '1', producto_id: null, producto_nombre: '', producto_codigo: '', producto_categoria: '', unidad_id: null, unidad_nombre: '', unidad_abreviatura: '', es_principal: true, factor_conversion: 1, cantidad: 1, costo: 0, costo_base: 0, utilidad_pct: 0, precio_venta: 0, stock_actual: 0, unidades_disponibles: [] }]
    )
    setSeleccionPaso0(
      (cot.detalles || []).reduce<Record<number, SeleccionProducto>>((acc, d) => {
        if (d.producto_id != null) acc[d.producto_id] = { cantidad: d.cantidad || 1, unidad_id: d.unidad_id ?? null }
        return acc
      }, {})
    )
    setIncluirImagenes(!!cot.incluir_imagenes)
    setConFactura(!!cot.con_factura)
    setWizardCurrent((cot.detalles?.length ?? 0) > 0 ? 1 : 0)
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

      const data: CotizacionCreate = {
        fecha: values.fecha.format('YYYY-MM-DD'),
        cliente_id: values.cliente_id,
        con_factura: conFactura,
        incluir_imagenes: incluirImagenes,
        modalidad_pago: values.modalidad_pago || '',
        forma_pago: values.forma_pago || '',
        validez_dias: values.validez_dias || 15,
        terminos_condiciones: values.terminos_condiciones || '',
        descuento: values.descuento || 0,
        detalles: validDetalles.map((d) => ({
          producto_id: d.producto_id!,
          unidad_id: d.unidad_id,
          cantidad: (d.cantidad || 0),
          costo: d.costo_base,
          utilidad_pct: d.utilidad_pct,
        })),
      }

      if (editingCotizacion) {
        await updateCotizacion(editingCotizacion.id, data)
        message.success('Cotización actualizada')
      } else {
        await createCotizacion(data)
        message.success('Cotización creada')
      }

      setModalVisible(false)
      form.resetFields()
      setDetalles([])
      loadCotizaciones()
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

  const handleConfirmar = async (id: number) => {
    try {
      await confirmarCotizacion(id)
      message.success('Cotización confirmada')
      loadCotizaciones()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al confirmar')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteCotizacion(id)
      message.success('Cotización eliminada')
      loadCotizaciones()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al eliminar')
    }
  }

  const commitSeleccionCotizacion = () => {
    setDetalles((prev) => {
      const prevByProducto = new Map(prev.filter((d) => d.producto_id != null).map((d) => [d.producto_id!, d]))
      const ids = Object.keys(seleccionPaso0).map(Number)
      return ids.map((pid) => {
        const sel = seleccionPaso0[pid]
        const existing = prevByProducto.get(pid)
        if (existing) {
          const u =
            existing.unidades_disponibles.find((uu) => uu.id === (sel.unidad_id ?? existing.unidad_id)) ||
            existing.unidades_disponibles.find((uu) => uu.es_principal) ||
            null
          const factor = u?.factor || existing.factor_conversion || 1
          const esPrincipal = u?.es_principal ?? existing.es_principal
          const nuevoCosto = esPrincipal ? existing.costo_base : existing.costo_base * factor
          return {
            ...existing,
            cantidad: Math.max(1, Number(sel.cantidad || 1)),
            unidad_id: u?.id ?? existing.unidad_id,
            unidad_nombre: u?.nombre || existing.unidad_nombre,
            unidad_abreviatura: u?.abreviatura || existing.unidad_abreviatura,
            es_principal: esPrincipal,
            factor_conversion: factor,
            costo: nuevoCosto,
            precio_venta: calcularPrecioVenta(nuevoCosto, existing.utilidad_pct),
          }
        }
        const producto = productos.find((p) => p.id === pid)
        if (!producto) return null
        const costoBase = Number(producto.precio || 0)
        const utilidad_pct = costoBase > 0 ? Math.round((Number(producto.utilidad || 0) / costoBase) * 10000) / 100 : 0
        const unidadesDisponibles: UnidadDisponible[] = (producto.unidades || []).map((pu) => ({
          id: pu.unidad_id,
          nombre: pu.unidad_nombre,
          abreviatura: pu.unidad_abreviatura,
          factor: Number(pu.factor_conversion || 1),
          es_principal: !!pu.es_principal,
        }))
        const u = unidadesDisponibles.find((ud) => ud.id === (sel.unidad_id ?? null)) || unidadesDisponibles.find((ud) => ud.es_principal) || unidadesDisponibles[0] || null
        const factor = u?.factor || 1
        const costo = u ? (u.es_principal ? costoBase : costoBase * factor) : costoBase
        return {
          key: `${pid}-${Date.now()}-${Math.random()}`,
          producto_id: pid,
          producto_nombre: producto.descripcion,
          producto_codigo: producto.codigo,
          producto_categoria: catMap.get(producto.categoria_id) || '',
          unidad_id: u?.id ?? null,
          unidad_nombre: u?.nombre || '',
          unidad_abreviatura: u?.abreviatura || '',
          es_principal: u?.es_principal ?? true,
          factor_conversion: factor,
          cantidad: Math.max(1, Number(sel.cantidad || 1)),
          costo,
          costo_base: costoBase,
          utilidad_pct,
          precio_venta: calcularPrecioVenta(costo, utilidad_pct),
          stock_actual: Number((producto as any).stock_actual || 0),
          unidades_disponibles: unidadesDisponibles,
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
  const wizardSteps = [{ title: 'Productos' }, { title: 'Precios' }, { title: 'Datos' }]

  const detalleImagen = (item: DetalleLine) => productos.find((p) => p.id === item.producto_id)?.imagen || null
  const detalleMarca = (item: DetalleLine) => productos.find((p) => p.id === item.producto_id)?.marca
  const detalleProcedencia = (item: DetalleLine) => productos.find((p) => p.id === item.producto_id)?.procedencia

  const goNext = () => {
    if (wizardCurrent === 0) {
      if (Object.keys(seleccionPaso0).length === 0) {
        message.warning('Debe agregar al menos un producto')
        return
      }
      commitSeleccionCotizacion()
    }
    setWizardCurrent((c) => Math.min(2, c + 1))
  }

  const goBack = () => setWizardCurrent((c) => Math.max(0, c - 1))

  const handleCloseModal = () => {
    setModalVisible(false)
    setWizardCurrent(0)
    setDetalles([])
    setSeleccionPaso0({})
    setIncluirImagenes(false)
    setConFactura(false)
  }

  const updateDetalle = (key: string, field: keyof DetalleLine, value: any) => {
    setDetalles((prev) => prev.map((d) => {
      if (d.key !== key) return d
      const updated = { ...d, [field]: value }
      if (field === 'costo') {
        // El costo editado es de la línea en su unidad -> costo_base = costo / factor
        const f = updated.factor_conversion || 1
        updated.costo_base = f > 0 ? (Number(value || 0) / f) : Number(value || 0)
        updated.precio_venta = calcularPrecioVenta(updated.costo, updated.utilidad_pct)
      } else if (field === 'utilidad_pct') {
        updated.precio_venta = calcularPrecioVenta(updated.costo, updated.utilidad_pct)
      }
      return updated
    }))
  }

  const fechaVencimiento = useMemo(() => {
    if (!watchedFecha) return null
    return dayjs(watchedFecha).add(Number(watchedValidez || 0), 'day')
  }, [watchedFecha, watchedValidez])

  const subtotalCalculado = useMemo(() => {
    return detalles.reduce((sum, d) => sum + (d.cantidad || 0) * precioFinalItem(d.precio_venta || 0), 0)
  }, [detalles, impuestoPct])

  const ivaInfoCalculado = useMemo(() =>
    impuestoPct > 0 ? Math.round(subtotalCalculado * 0.13 * 100) / 100 : 0,
  [subtotalCalculado, impuestoPct])

  const itInfoCalculado = useMemo(() =>
    itPct > 0 ? Math.round(subtotalCalculado * 0.03 * 100) / 100 : 0,
  [subtotalCalculado, itPct])

  const descuentoCalculado = useMemo(() => {
    return Math.round(subtotalCalculado * descuentoPct) / 100
  }, [subtotalCalculado, descuentoPct])

  const totalCalculado = useMemo(() => {
    return Math.round((subtotalCalculado - descuentoCalculado) * 100) / 100
  }, [subtotalCalculado, descuentoCalculado])

  const handlePdfPreview = async (id: number) => {
    await openPdf(() => fetchCotizacionPdfBlob(id), `Cotización #${id}`, `cotizacion_${id}.pdf`)
  }

  const openConvertModal = (cot: Cotizacion) => {
    setConvertCotizacion(cot)
    setAutoNum(true)
    const pendiente = estados.find((e) => e.nombre.toUpperCase() === 'PENDIENTE')
    convertForm.resetFields()
    convertForm.setFieldsValue({
      estado_id: pendiente?.id,
      num_comprobante: '',
    })
    setConvertVisible(true)
  }

  const handleConvertir = async () => {
    try {
      const values = await convertForm.validateFields()
      if (!convertCotizacion) return
      await convertirCotizacionEnVenta(convertCotizacion.id, {
        comprobante_id: values.comprobante_id,
        estado_id: values.estado_id,
        num_comprobante: autoNum ? undefined : (values.num_comprobante || ''),
        automatico: autoNum,
      })
      message.success('Venta creada a partir de la cotización')
      setConvertVisible(false)
      convertForm.resetFields()
      loadCotizaciones()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al convertir')
    }
  }

  const estadoOptions = useMemo(
    () => estados.map((e) => ({ value: e.id, label: e.nombre })),
    [estados]
  )

  const detColumns: ColumnsType<any> = [
    { title: 'Código', dataIndex: 'producto_codigo', key: 'producto_codigo', width: 90 },
    { title: 'Producto', key: 'producto', render: (_: any, r: any) => `${r.producto_categoria ? r.producto_categoria + ' - ' : ''}${r.producto_nombre}` },
    { title: 'Unidad', key: 'unidad', width: 100, render: (_: any, r: any) => r.unidad_nombre ? `${r.unidad_nombre} (${r.unidad_abreviatura || '-'})` : '-' },
    { title: 'Cant.', dataIndex: 'cantidad', key: 'cantidad', width: 60, render: (_: any, r: any) => {
      const cantPrincipal = r.cantidad * (Number(r.factor_conversion || 1))
      return (
        <div>
          <div>{r.cantidad}</div>
          {r.producto_id && cantPrincipal > r.stock_actual && (
            <div className="text-xs text-red-500 font-medium">Stock: {r.stock_actual}</div>
          )}
        </div>
      )
    }},
    { title: 'Util. %', dataIndex: 'utilidad_pct', key: 'utilidad_pct', width: 70, render: (val: any) => `${Number(val || 0).toFixed(2)}%` },
    { title: 'P. Venta', dataIndex: 'precio_venta', key: 'precio_venta', width: 90, render: (val: any) => `Bs. ${Number(val || 0).toFixed(2)}` },
    { title: 'Subtotal', key: 'subtotal', width: 100, render: (_: any, r: any) => `Bs. ${(r.cantidad * Number(r.precio_venta || 0)).toFixed(2)}` },
  ]

  const columns: ColumnsType<Cotizacion> = [
    { title: 'N°', dataIndex: 'numero', key: 'numero', width: 110 },
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', render: (val: string) => dayjs(val).format('DD/MM/YYYY') },
    { title: 'Cliente', dataIndex: 'cliente_razon_social', key: 'cliente_razon_social' },
    { title: 'Estado', dataIndex: 'estado', key: 'estado', render: (val: string) => <Tag color={estadoColor[val]}>{val}</Tag> },
    { title: 'Subtotal', dataIndex: 'subtotal', key: 'subtotal', render: (val: any) => `Bs. ${Number(val || 0).toFixed(2)}` },
    { title: 'IVA', dataIndex: 'iva', key: 'iva', render: (val: any) => (Number(val || 0) > 0 ? `Bs. ${Number(val).toFixed(2)}` : '-') },
    { title: 'IT', dataIndex: 'it', key: 'it', render: (val: any) => (Number(val || 0) > 0 ? `Bs. ${Number(val).toFixed(2)}` : '-') },
    { title: 'Desc.', dataIndex: 'descuento', key: 'descuento', render: (val: any) => (Number(val || 0) > 0 ? `${Number(val)}%` : '-') },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (val: any) => `Bs. ${Number(val || 0).toFixed(2)}` },
    { title: 'Vence', dataIndex: 'fecha_vencimiento', key: 'fecha_vencimiento', render: (val: string) => dayjs(val).format('DD/MM/YYYY') },
    {
      title: 'Venta', key: 'venta', width: 80,
      render: (_, r) => (r.venta_id ? <Tag color="green">N° {r.venta_id}</Tag> : '-'),
    },
    {
      title: 'Acciones', key: 'acciones', width: 320,
      render: (_, record) => {
        const editable = record.estado === 'Enviado' && !record.venta_id
        const eliminable = record.estado !== 'Confirmado' && !record.venta_id
        return (
          <div className="flex gap-1 flex-wrap">
            <Button size={isMobile ? 'middle' : 'small'} icon={<ProfileOutlined />} title="Ver detalle" onClick={() => { setDetailCotizacion(record); setDetailVisible(true) }} />
            <Button size={isMobile ? 'middle' : 'small'} icon={<EyeOutlined />} title="Vista previa" onClick={() => handlePdfPreview(record.id)} />
            {editable && (
              <>
                <Button size={isMobile ? 'middle' : 'small'} icon={<EditOutlined />} title="Editar" onClick={() => openEditModal(record)} />
                <Popconfirm title="¿Confirmar cotización?" onConfirm={() => handleConfirmar(record.id)}>
                  <Button size={isMobile ? 'middle' : 'small'} icon={<CheckOutlined />} title="Confirmar" className="!text-green-600" />
                </Popconfirm>
              </>
            )}
            {record.estado === 'Confirmado' && !record.venta_id && (
              <Popconfirm title="¿Convertir en venta?" onConfirm={() => openConvertModal(record)}>
                <Button size={isMobile ? 'middle' : 'small'} icon={<ShoppingCartOutlined />} title="Convertir en venta" className="!text-blue-600" />
              </Popconfirm>
            )}
            {eliminable && (
              <Popconfirm title="¿Eliminar cotización?" onConfirm={() => handleDelete(record.id)}>
                <Button size={isMobile ? 'middle' : 'small'} danger icon={<DeleteOutlined />} title="Eliminar" />
              </Popconfirm>
            )}
          </div>
        )
      },
    },
  ]

  const fabVisible = isMobile && !modalVisible && !detailVisible && !convertVisible

  const comprobanteCrudModalProps = {
    title: 'Comprobantes',
    onSelect: (rec: any) => convertForm.setFieldValue('comprobante_id', rec.id),
    fetchAll: comprobanteService.getAll as any,
    create: comprobanteService.create as any,
    update: comprobanteService.update as any,
    remove: comprobanteService.delete as any,
    fields: [
      { name: 'nombre', label: 'Nombre', normalize: 'capitalize' as const },
      { name: 'numero', label: 'Número', type: 'number' as const },
    ],
    onDataChange: (list: any[]) => setComprobantes(list),
  }

  const estadoCrudModalProps = {
    title: 'Estados',
    onSelect: (rec: any) => convertForm.setFieldValue('estado_id', rec.id),
    fetchAll: estadoService.getAll as any,
    create: estadoService.create as any,
    update: estadoService.update as any,
    remove: estadoService.delete as any,
    fields: [{ name: 'nombre', label: 'Nombre', normalize: 'capitalize' as const }],
    onDataChange: (list: any[]) => setEstados(list),
  }

  return (
    <div className={fabVisible ? 'pb-16' : ''}>
      <PageHeader title="Gestión de Cotizaciones">
        <Button type="primary" icon={<PlusOutlined />} size={isMobile ? 'middle' : 'middle'} onClick={openCreateModal} className={isMobile ? 'hidden' : ''}>
          Nueva Cotización
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
            placeholder="Buscar por cliente"
            allowClear
            className="max-w-[300px]"
            value={searchClienteText}
            onChange={(e) => setSearchClienteText(e.target.value)}
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
          {(['Enviado', 'Confirmado', 'Vencido'] as const).map((est) => (
            <Tag.CheckableTag
              key={est}
              checked={filterEstado === est}
              onChange={() => setFilterEstado(est)}
              className="!m-0"
              style={{ color: estadoColor[est] }}
            >
              {est}
            </Tag.CheckableTag>
          ))}
        </div>
      </div>

      <ResponsiveTable
        columns={columns}
        dataSource={filteredCotizaciones}
        loading={loading}
        rowKey="id"
        pagination={{
          current: currentPage,
          pageSize: pagination.pageSize,
          size: isMobile ? 'small' : 'default',
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `${total} cotizaciones`,
          onChange: handlePaginationChange,
        }}
        expandable={!isMobile ? { expandedRowRender: (record) => (
          <Table
            columns={detColumns}
            dataSource={record.detalles?.map((d) => ({ ...d, key: d.id }))}
            pagination={false}
            rowKey="id"
            size="small"
            scroll={{ x: 'max-content' }}
          />
        ), rowExpandable: (r) => r.detalles && r.detalles.length > 0 } : undefined}
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
        title={editingCotizacion ? `Editar Cotización ${editingCotizacion.numero}` : 'Nueva Cotización'}
        open={modalVisible}
        onCancel={handleCloseModal}
        width={860}
        className="responsive-modal"
        footer={
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
              {wizardCurrent === 0 ? (
                <Switch
                  checkedChildren="Incluir imagen"
                  unCheckedChildren="Sin imagen"
                  checked={incluirImagenes}
                  onChange={setIncluirImagenes}
                />
              ) : wizardCurrent === 1 ? (
                <>
                  {incluirImagenes
                    ? <Tag color="green" icon={<CheckCircleOutlined />}>Incluir imagen</Tag>
                    : <Tag color="red" icon={<CloseCircleOutlined />}>Sin imagen</Tag>}
                  <Switch
                    checkedChildren="Con factura"
                    unCheckedChildren="Sin factura"
                    checked={conFactura}
                    onChange={setConFactura}
                  />
                </>
              ) : (
                <>
                  {incluirImagenes
                    ? <Tag color="green" icon={<CheckCircleOutlined />}>Incluir imagen</Tag>
                    : <Tag color="red" icon={<CloseCircleOutlined />}>Sin imagen</Tag>}
                  {conFactura
                    ? <Tag color="green" icon={<CheckCircleOutlined />}>Con factura</Tag>
                    : <Tag color="red" icon={<CloseCircleOutlined />}>Sin factura</Tag>}
                  {descuentoPct > 0 && <Tag color="orange">Descuento: {descuentoPct}%</Tag>}
                </>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 md:items-end">
              {wizardCurrent > 0 && (
                <div className="text-center md:text-right leading-tight">
                  <div className="font-bold text-base">Total: Bs. {totalCalculado.toFixed(2)}</div>
                  {conFactura && (
                    <div className="text-xs text-gray-500">
                      IVA (13% inc.): Bs. {ivaInfoCalculado.toFixed(2)} · IT (3% inc.): Bs. {itInfoCalculado.toFixed(2)}
                    </div>
                  )}
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
            showUnidad
          />
        )}

        {wizardCurrent === 1 && (
          <Form form={form} layout="vertical">
            <div className="flex justify-end items-center mb-2 gap-2">
              <Space size="small" align="center">
                <span className="text-sm">Descuento %:</span>
                <InputNumber
                  min={0}
                  max={100}
                  step={0.01}
                  className="w-24"
                  value={descuentoPct}
                  onChange={(v) => form.setFieldValue('descuento', v ?? 0)}
                />
              </Space>
            </div>
            <ProductoDetalleList<DetalleLine>
              items={detallesValidos}
              getImagen={detalleImagen}
              getMarca={detalleMarca}
              getProcedencia={detalleProcedencia}
              getUnidad={(item) => item.unidad_nombre ? `${item.unidad_nombre} (${item.unidad_abreviatura || '-'})` : undefined}
              getPrecio={(item) => precioFinalItem(item.precio_venta || 0)}
              getSubtotal={(item) => (item.cantidad || 0) * precioFinalItem(item.precio_venta || 0)}
              onRemove={removeDetalleRow}
              quantityReadOnly
              quantityMin={0.01}
              quantityStep={0.01}
              renderExtra={(item) => (
                <div className="flex flex-col gap-1 items-center">
                  <InputNumber
                    size="small"
                    min={0}
                    step={0.01}
                    suffix="%"
                    className="w-[90px]"
                    placeholder="Util. %"
                    value={item.utilidad_pct}
                    onChange={(val) => updateDetalle(item.key, 'utilidad_pct', val || 0)}
                  />
                  {item.producto_id != null && (item.cantidad || 0) * (Number(item.factor_conversion) || 1) > item.stock_actual && (
                    <div className="text-red-500 text-xs leading-[14px]">
                      Stock: {item.stock_actual}{' '}
                      {item.unidades_disponibles.find((u) => u.es_principal)?.abreviatura || ''}
                    </div>
                  )}
                </div>
              )}
            />
          </Form>
        )}

        {wizardCurrent === 2 && (
          <Form form={form} layout="vertical">
          <div className="flex flex-wrap gap-3">
            <Form.Item name="fecha" label="Fecha" rules={[{ required: true }]} className="flex-1 min-w-[150px] !mb-3" getValueProps={(value) => ({ value: value ? dayjs(value) : undefined })}>
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="cliente_id" label="Cliente" rules={[{ required: true }]} className="flex-1 min-w-[200px] !mb-3">
              <SubCrudSelect
                placeholder="Seleccione un cliente"
                options={clienteOptions}
                disabled={editingCotizacion !== null}
                modalProps={{
                  title: 'Clientes',
                  fetchAll: getClientes,
                  create: createCliente,
                  update: updateCliente,
                  remove: deleteCliente,
                  fields: [
                    { name: 'nombre', label: 'Nombre', normalize: 'capitalize' },
                    { name: 'nit', label: 'NIT' },
                    { name: 'celular', label: 'Celular' },
                    { name: 'direccion', label: 'Dirección', normalize: 'capitalize' },
                  ],
                  onDataChange: (list) => setClientes(list),
                }}
              />
            </Form.Item>
            <Form.Item name="validez_dias" label="Validez (días)" rules={[{ required: true }]} className="flex-1 min-w-[120px] !mb-3" initialValue={15}>
              <InputNumber min={1} max={365} className="w-full" />
            </Form.Item>
          </div>

          {fechaVencimiento && (
              <div className="self-center text-sm text-gray-500 mb-2">
                Vencimiento: <strong>{fechaVencimiento.format('DD/MM/YYYY')}</strong>
              </div>
            )}

          <Form.Item name="modalidad_pago" label="Modalidad de pago">
            <Input
              placeholder="Ej. 50% adelanto, 50% contra entrega"
              value={form.getFieldValue('modalidad_pago') ?? ''}
              onChange={(e) => form.setFieldValue('modalidad_pago', capitalizeWords(e.target.value))}
            />
          </Form.Item>
          <Form.Item name="forma_pago" label="Forma de pago" className="flex-1 min-w-[200px]">
              <Select
                allowClear
                placeholder="Seleccione la forma de pago"
                options={FORMA_PAGO_OPTIONS.map((f) => ({ value: f, label: f }))}
              />
            </Form.Item>
          <Form.Item name="terminos_condiciones" label="Términos y condiciones">
            <Input.TextArea
              rows={3}
              placeholder="Términos y condiciones de la oferta"
              value={form.getFieldValue('terminos_condiciones') ?? ''}
              onChange={(e) => form.setFieldValue('terminos_condiciones', capitalizeWords(e.target.value))}
            />
          </Form.Item>

          <div className="mt-2 mb-3">
            <div className="text-sm font-medium mb-2">Detalle (sin editar)</div>
            <ProductoDetalleList<DetalleLine>
              items={detallesValidos}
              getImagen={detalleImagen}
              getMarca={detalleMarca}
              getProcedencia={detalleProcedencia}
              getUnidad={(item) => item.unidad_nombre ? `${item.unidad_nombre} (${item.unidad_abreviatura || '-'})` : undefined}
              getPrecio={(item) => precioFinalItem(item.precio_venta || 0)}
              getSubtotal={(item) => (item.cantidad || 0) * precioFinalItem(item.precio_venta || 0)}
              quantityMin={0.01}
              quantityStep={0.01}
              readOnly
            />
          </div>
          </Form>
        )}
      </Modal>

      <Modal
        title="Detalle de Cotización"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={820}
        className="responsive-modal"
      >
        {detailCotizacion && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-gray-100">
              <div>
                <div className="text-lg font-bold">Cotización N° {detailCotizacion.numero}</div>
                <div className="text-sm text-gray-500">
                  {dayjs(detailCotizacion.fecha).format('DD/MM/YYYY')} · Vence el {dayjs(detailCotizacion.fecha_vencimiento).format('DD/MM/YYYY')}
                </div>
              </div>
              <div className="flex gap-1.5">
                <Tag color={estadoColor[detailCotizacion.estado]} className="!m-0 !text-xs !px-2 !py-0.5">
                  {detailCotizacion.estado}
                </Tag>
                {detailCotizacion.venta_id && (
                  <Tag color="green" className="!m-0 !text-xs !px-2 !py-0.5">
                    Venta N° {detailCotizacion.venta_id}
                  </Tag>
                )}
              </div>
            </div>

            <Card size="small" title="Cliente" className="!mb-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <div className="text-gray-400 text-xs uppercase tracking-wide">Cliente</div>
                  <div className="font-medium mt-0.5">{detailCotizacion.cliente_razon_social}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs uppercase tracking-wide">NIT</div>
                  <div className="font-medium mt-0.5">{detailCotizacion.cliente_nit || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs uppercase tracking-wide">Celular</div>
                  <div className="font-medium mt-0.5">{detailCotizacion.cliente_celular || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs uppercase tracking-wide">Dirección</div>
                  <div className="font-medium mt-0.5">{detailCotizacion.cliente_direccion || '-'}</div>
                </div>
              </div>
            </Card>

            <Card size="small" title="Condiciones de la oferta" className="!mb-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <div className="text-gray-400 text-xs uppercase tracking-wide">Con factura</div>
                  <div className="font-medium mt-0.5">{detailCotizacion.con_factura ? 'Sí' : 'No'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs uppercase tracking-wide">Incluir imágenes</div>
                  <div className="font-medium mt-0.5">{detailCotizacion.incluir_imagenes ? 'Sí' : 'No'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs uppercase tracking-wide">Modalidad de pago</div>
                  <div className="font-medium mt-0.5">{detailCotizacion.modalidad_pago || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs uppercase tracking-wide">Forma de pago</div>
                  <div className="font-medium mt-0.5">{detailCotizacion.forma_pago || '-'}</div>
                </div>
              </div>
            </Card>

            <div className="mb-2 font-medium">Productos</div>
            <Table
              columns={detColumns}
              dataSource={detailCotizacion.detalles?.map((d) => ({ ...d, key: d.id }))}
              pagination={false}
              rowKey="id"
              size="small"
              scroll={{ x: 'max-content' }}
            />

            <Card size="small" className="mt-3">
              <div className="text-right font-bold">
                {Number(detailCotizacion.descuento || 0) > 0 && (
                  <div className="font-normal text-sm text-gray-500">
                    Subtotal: Bs. {Number(detailCotizacion.subtotal || 0).toFixed(2)}
                  </div>
                )}
                {Number(detailCotizacion.iva || 0) > 0 && (
                  <div className="font-normal text-sm text-orange-500">
                    IVA (13% inc.): Bs. {Number(detailCotizacion.iva).toFixed(2)}
                  </div>
                )}
                {Number(detailCotizacion.it || 0) > 0 && (
                  <div className="font-normal text-sm text-orange-500">
                    IT (3% inc.): Bs. {Number(detailCotizacion.it).toFixed(2)}
                  </div>
                )}
                {Number(detailCotizacion.descuento || 0) > 0 && (
                  <div className="font-normal text-sm text-green-600">
                    Descuento ({detailCotizacion.descuento}%): -Bs. {(Number(detailCotizacion.subtotal || 0) * Number(detailCotizacion.descuento) / 100).toFixed(2)}
                  </div>
                )}
                <div className="text-lg mt-1">Total: Bs. {Number(detailCotizacion.total || 0).toFixed(2)}</div>
              </div>
            </Card>

            {detailCotizacion.terminos_condiciones && (
              <div className="mt-3 p-3 bg-gray-50 rounded text-sm whitespace-pre-line">
                <strong>Términos y condiciones</strong>
                <div className="mt-1">{detailCotizacion.terminos_condiciones}</div>
              </div>
            )}

            <div className="mt-3 text-right">
              <Space>
                <Button icon={<EyeOutlined />} onClick={() => handlePdfPreview(detailCotizacion.id)}>Vista previa</Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={convertCotizacion ? `Convertir ${convertCotizacion.numero} en Venta` : 'Convertir en Venta'}
        open={convertVisible}
        onCancel={() => setConvertVisible(false)}
        onOk={handleConvertir}
        width={520}
        className="responsive-modal"
      >
        <p className="text-sm text-gray-500 mb-3">
          Se creará una venta con los productos, cantidades y precios de esta cotización, descontando stock.
        </p>
        <Form form={convertForm} layout="vertical">
          <Form.Item name="comprobante_id" label="Comprobante" rules={[{ required: true }]}>
            <SubCrudSelect
              placeholder="Seleccione un comprobante"
              options={comprobantes.map((c) => ({ value: c.id, label: c.nombre }))}
              modalProps={comprobanteCrudModalProps}
            />
          </Form.Item>
          <Form.Item name="estado_id" label="Estado de la venta">
            <SubCrudSelect
              placeholder="Seleccione un estado (Pendiente por defecto)"
              options={estadoOptions}
              modalProps={estadoCrudModalProps}
            />
          </Form.Item>
          <Form.Item name="num_comprobante" label="N° Comprobante">
            <Space.Compact className="w-full">
              <Input
                placeholder={autoNum ? 'Automático' : 'Ingrese número'}
                disabled={autoNum}
                className="w-full"
              />
              <Switch checkedChildren="A" unCheckedChildren="M" checked={autoNum} onChange={setAutoNum} />
            </Space.Compact>
          </Form.Item>
        </Form>
        {convertCotizacion?.con_factura && (
          <div className="text-sm text-orange-500">
            La venta incluirá IVA (13%) + IT (3%) porque la cotización es con factura.
          </div>
        )}
        {convertCotizacion && Number(convertCotizacion.descuento || 0) > 0 && (
          <div className="text-sm text-green-600">
            El descuento de {convertCotizacion.descuento}% se trasladará a la venta.
          </div>
        )}
      </Modal>
      {previewModal}
    </div>
  )
}
