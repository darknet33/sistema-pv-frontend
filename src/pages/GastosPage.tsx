import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Button,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Popconfirm,
  App,
  Tag,
  Input,
  Select,
  Grid,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SearchOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  FileDoneOutlined,
  CloseOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { Gasto, GastoCreate, GastoUpdate, CategoriaGasto } from '../types/gasto'
import type { Estado } from '../types/configuracion'
import {
  getGastos,
  createGasto,
  updateGasto,
  anularGasto,
  deleteGasto,
  fetchGastoReportBlob,
  getCategoriasGastos,
  createCategoriaGasto,
  updateCategoriaGasto,
  deleteCategoriaGasto,
} from '../services/gastoService'
import estadoService from '../services/estadoService'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import usePdfPreview from '../hooks/usePdfPreview'
import { formatCurrency, upperText } from '../utils/format'
import ResponsiveTable from '../components/ResponsiveTable'
import PageHeader from '../components/PageHeader'
import SubCrudSelect from '../components/SubCrudSelect'

const { useBreakpoint } = Grid

export default function GastosPage() {
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const { message } = App.useApp()
  const { openPdf, previewModal } = usePdfPreview()

  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [estados, setEstados] = useState<Estado[]>([])

  const [filterFecha, setFilterFecha] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [searchText, setSearchText] = useState('')
  const [filterCategoria, setFilterCategoria] = useState<number | undefined>(undefined)
  const [filterEstado, setFilterEstado] = useState<number | undefined>(undefined)

  const estadoColors = useMemo(
    () => ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb'],
    []
  )

  const getTagColor = (nombre?: string) => {
    if (!nombre) return 'default'
    const n = nombre.toUpperCase()
    if (n.includes('PAGADO') || n.includes('COMPLETADO')) return 'green'
    if (n.includes('PENDIENTE') || n.includes('PROCESO')) return 'gold'
    if (n.includes('ANULADO')) return 'red'
    return 'blue'
  }

  const categoriaOptions = useMemo(
    () => categorias.map((c) => ({ value: c.id, label: c.nombre })),
    [categorias]
  )

  const estadoOptions = useMemo(
    () => estados.map((e) => ({ value: e.id, label: e.nombre })),
    [estados]
  )

  const loadGastos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getGastos()
      setGastos(data)
    } catch {
      message.error('Error al cargar gastos')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCategorias = useCallback(async () => {
    try {
      const data = await getCategoriasGastos()
      setCategorias(data)
    } catch {
      message.error('Error al cargar categorías de gastos')
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

  const loadAllData = useCallback(async () => {
    await Promise.all([loadGastos(), loadCategorias(), loadEstados()])
  }, [loadGastos, loadCategorias, loadEstados])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  const refreshGastos = useCallback(() => {
    loadGastos()
  }, [loadGastos])

  useRealtimeRefresh('gastos', refreshGastos)
  useRealtimeRefresh('dashboard', refreshGastos)

  const filteredGastos = useMemo(() => {
    return gastos.filter((g) => {
      if (filterFecha && filterFecha[0] && filterFecha[1]) {
        const fecha = dayjs(g.fecha)
        const inicio = filterFecha[0].startOf('day')
        const fin = filterFecha[1].endOf('day')
        if (fecha.isBefore(inicio) || fecha.isAfter(fin)) return false
      }
      if (searchText) {
        const q = searchText.toLowerCase()
        const matchDesc = g.descripcion?.toLowerCase().includes(q)
        const matchCat = g.categoria_nombre?.toLowerCase().includes(q)
        const matchUser = g.usuario_username?.toLowerCase().includes(q)
        if (!matchDesc && !matchCat && !matchUser) return false
      }
      if (filterCategoria && g.categoria_gasto_id !== filterCategoria) return false
      if (filterEstado && g.estado_id !== filterEstado) return false
      return true
    })
  }, [gastos, filterFecha, searchText, filterCategoria, filterEstado])

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalMonto = 0
    let totalAnuladosMonto = 0
    let cantidadActivos = 0
    let cantidadAnulados = 0

    filteredGastos.forEach((g) => {
      const isAnulado = g.estado_nombre?.toUpperCase() === 'ANULADO' || !g.activo
      const m = Number(g.monto || 0)
      if (isAnulado) {
        totalAnuladosMonto += m
        cantidadAnulados++
      } else {
        totalMonto += m
        cantidadActivos++
      }
    })

    return {
      totalMonto,
      totalAnuladosMonto,
      cantidadActivos,
      cantidadAnulados,
      totalRegistros: filteredGastos.length,
    }
  }, [filteredGastos])

  const openCreateModal = () => {
    setEditingGasto(null)
    form.resetFields()
    form.setFieldsValue({
      fecha: dayjs(),
      categoria_gasto_id: categorias[0]?.id,
      estado_id: estados.find((e) => e.nombre.toUpperCase() === 'PAGADO')?.id || estados[0]?.id,
    })
    setModalVisible(true)
  }

  const openEditModal = (gasto: Gasto) => {
    setEditingGasto(gasto)
    form.setFieldsValue({
      fecha: dayjs(gasto.fecha),
      categoria_gasto_id: gasto.categoria_gasto_id,
      monto: Number(gasto.monto),
      estado_id: gasto.estado_id,
      descripcion: gasto.descripcion || '',
    })
    setModalVisible(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const gastoPayload = {
        fecha: values.fecha.format('YYYY-MM-DDTHH:mm:ss'),
        categoria_gasto_id: values.categoria_gasto_id,
        monto: Number(values.monto),
        estado_id: values.estado_id,
        descripcion: values.descripcion?.trim() || undefined,
      }

      if (editingGasto) {
        await updateGasto(editingGasto.id, gastoPayload as GastoUpdate)
        message.success('Gasto actualizado exitosamente')
      } else {
        await createGasto(gastoPayload as GastoCreate)
        message.success('Gasto registrado exitosamente')
      }

      setModalVisible(false)
      form.resetFields()
      loadGastos()
    } catch (error: any) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      message.error(error.response?.data?.detail || 'Error al guardar el gasto')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAnular = async (id: number) => {
    try {
      await anularGasto(id)
      message.success('Gasto anulado exitosamente')
      loadGastos()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al anular el gasto')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteGasto(id)
      message.success('Gasto eliminado permanentemente')
      loadGastos()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al eliminar el gasto')
    }
  }

  const handleDownloadReport = async () => {
    try {
      const inicio = filterFecha?.[0]?.format('YYYY-MM-DDTHH:mm:ss') || dayjs().startOf('month').format('YYYY-MM-DDTHH:mm:ss')
      const fin = filterFecha?.[1]?.format('YYYY-MM-DDTHH:mm:ss') || dayjs().endOf('month').format('YYYY-MM-DDTHH:mm:ss')
      await openPdf(
        () => fetchGastoReportBlob(inicio, fin, filterCategoria, filterEstado),
        'Reporte de Gastos',
        `reporte_gastos_${dayjs().format('YYYYMMDD')}.pdf`
      )
    } catch {
      message.error('Error al generar el reporte de gastos en PDF')
    }
  }

  const handleResetFilters = () => {
    setFilterFecha(null)
    setSearchText('')
    setFilterCategoria(undefined)
    setFilterEstado(undefined)
  }

  const columns: ColumnsType<Gasto> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 65,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 140,
      render: (val: string) => dayjs(val).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Categoría',
      dataIndex: 'categoria_nombre',
      key: 'categoria_nombre',
      width: 160,
      render: (val: string) => <Tag color="blue">{val || 'General'}</Tag>,
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      render: (val?: string) => (
        val ? <span>{val}</span> : <span className="text-gray-400 italic">Sin descripción</span>
      ),
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      width: 130,
      render: (val: number | string) => (
        <span className="font-semibold text-gray-800">{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado_nombre',
      key: 'estado_nombre',
      width: 120,
      render: (val: string) => <Tag color={getTagColor(val)}>{val || 'N/A'}</Tag>,
    },
    {
      title: 'Usuario',
      dataIndex: 'usuario_username',
      key: 'usuario_username',
      width: 120,
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 130,
      render: (_, record) => {
        const isAnulado = record.estado_nombre?.toUpperCase() === 'ANULADO' || !record.activo
        return (
          <div className="flex gap-1">
            <Button
              icon={<EditOutlined />}
              size={isMobile ? 'middle' : 'small'}
              onClick={() => openEditModal(record)}
              title="Editar gasto"
            />
            {!isAnulado ? (
              <Popconfirm
                title="¿Anular gasto?"
                description="El estado del gasto pasará a Anulado."
                onConfirm={() => handleAnular(record.id)}
                okText="Sí, anular"
                cancelText="Cancelar"
              >
                <Button
                  icon={<CloseCircleOutlined />}
                  size={isMobile ? 'middle' : 'small'}
                  className="!text-amber-500"
                  title="Anular gasto"
                />
              </Popconfirm>
            ) : (
              <Popconfirm
                title="¿Eliminar gasto?"
                description="Esta acción eliminará el registro permanentemente."
                onConfirm={() => handleDelete(record.id)}
                okText="Sí, eliminar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
              >
                <Button
                  icon={<DeleteOutlined />}
                  size={isMobile ? 'middle' : 'small'}
                  danger
                  title="Eliminar gasto"
                />
              </Popconfirm>
            )}
          </div>
        )
      },
    },
  ]

  const fabVisible = isMobile && !modalVisible

  return (
    <div className={fabVisible ? 'pb-16' : ''}>
      <PageHeader title="Gestión de Gastos">
        <Button
          icon={<DownloadOutlined />}
          size={isMobile ? 'small' : 'middle'}
          onClick={handleDownloadReport}
        >
          Reporte PDF
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size={isMobile ? 'middle' : 'middle'}
          onClick={openCreateModal}
          className={isMobile ? 'hidden' : ''}
        >
          Nuevo Gasto
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Total Gastos (Activos)"
              value={metrics.totalMonto}
              precision={2}
              prefix={<DollarOutlined className="text-blue-500 mr-1" />}
              suffix="Bs."
              valueStyle={{ color: '#1677ff', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Gastos Registrados"
              value={metrics.cantidadActivos}
              suffix={`/ ${metrics.totalRegistros}`}
              prefix={<FileDoneOutlined className="text-emerald-500 mr-1" />}
              valueStyle={{ color: '#10b981', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Gastos Anulados"
              value={metrics.totalAnuladosMonto}
              precision={2}
              prefix={<CloseOutlined className="text-rose-500 mr-1" />}
              suffix="Bs."
              valueStyle={{ color: '#ef4444', fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters Bar */}
      <div className="mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 mb-3 items-center">
          <DatePicker.RangePicker
            value={filterFecha as any}
            onChange={(dates) => setFilterFecha(dates as any)}
            placeholder={['Fecha inicio', 'Fecha fin']}
            className="min-w-[240px]"
          />
          <Input.Search
            placeholder="Buscar descripción o usuario..."
            allowClear
            className="max-w-[280px]"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            enterButton={<SearchOutlined />}
          />
          <Select
            placeholder="Filtrar por categoría"
            allowClear
            className="min-w-[180px]"
            value={filterCategoria}
            onChange={(val) => setFilterCategoria(val)}
            options={categoriaOptions}
          />
          {(filterFecha || searchText || filterCategoria !== undefined || filterEstado !== undefined) && (
            <Button icon={<ReloadOutlined />} onClick={handleResetFilters} size="middle">
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Estado Filter Tags */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-gray-500 mr-1">Estado:</span>
          <Tag.CheckableTag
            checked={filterEstado === undefined}
            onChange={() => setFilterEstado(undefined)}
            className="!m-0 cursor-pointer"
          >
            Todos
          </Tag.CheckableTag>
          {estados.map((est, idx) => (
            <Tag.CheckableTag
              key={est.id}
              checked={filterEstado === est.id}
              onChange={() => setFilterEstado(est.id)}
              className="!m-0 cursor-pointer"
              style={{
                backgroundColor: filterEstado === est.id ? estadoColors[idx % estadoColors.length] : undefined,
                color: filterEstado === est.id ? '#fff' : undefined,
              }}
            >
              {est.nombre}
            </Tag.CheckableTag>
          ))}
        </div>
      </div>

      {/* Table */}
      <ResponsiveTable
        columns={columns}
        dataSource={filteredGastos}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          size: isMobile ? 'small' : 'default',
        }}
      />

      {/* Mobile Floating Action Button */}
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

      {/* Create / Edit Modal */}
      <Modal
        title={editingGasto ? 'Editar Gasto' : 'Nuevo Gasto'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        onOk={handleSave}
        confirmLoading={submitting}
        okText={editingGasto ? 'Actualizar' : 'Guardar'}
        cancelText="Cancelar"
        width={560}
        className="responsive-modal"
      >
        <Form form={form} layout="vertical" className="mt-3">
          <Form.Item
            name="fecha"
            label="Fecha"
            rules={[{ required: true, message: 'La fecha es obligatoria' }]}
            getValueProps={(value) => ({ value: value ? dayjs(value) : undefined })}
          >
            <DatePicker showTime className="w-full" format="DD/MM/YYYY HH:mm" />
          </Form.Item>

          <Form.Item
            name="categoria_gasto_id"
            label="Categoría de Gasto"
            rules={[{ required: true, message: 'Seleccione una categoría de gasto' }]}
          >
            <SubCrudSelect
              placeholder="Seleccione o cree una categoría"
              options={categoriaOptions}
              modalProps={{
                title: 'Categorías de Gasto',
                fetchAll: getCategoriasGastos,
                create: createCategoriaGasto,
                update: updateCategoriaGasto,
                remove: deleteCategoriaGasto,
                fields: [{ name: 'nombre', label: 'Nombre de la Categoría', required: true, normalize: 'uppercase' }],
                onDataChange: (list) => setCategorias(list),
              }}
            />
          </Form.Item>

          <div className="flex flex-wrap gap-3">
            <Form.Item
              name="monto"
              label="Monto"
              rules={[
                { required: true, message: 'El monto es obligatorio' },
                {
                  validator: async (_, value) => {
                    if (value !== undefined && value !== null && value <= 0) {
                      throw new Error('El monto debe ser mayor a 0')
                    }
                  },
                },
              ]}
              className="flex-1 min-w-[140px] !mb-3"
            >
              <InputNumber
                min={0.01}
                step={0.01}
                prefix="Bs."
                placeholder="0.00"
                className="w-full"
              />
            </Form.Item>

            <Form.Item
              name="estado_id"
              label="Estado"
              rules={[{ required: true, message: 'Seleccione un estado' }]}
              className="flex-1 min-w-[140px] !mb-3"
            >
              <SubCrudSelect
                placeholder="Seleccione un estado"
                options={estadoOptions}
                modalProps={{
                  title: 'Estados',
                  fetchAll: estadoService.getAll,
                  create: estadoService.create,
                  update: estadoService.update,
                  remove: estadoService.delete,
                  fields: [{ name: 'nombre', label: 'Nombre', required: true, normalize: 'uppercase' }],
                  onDataChange: (list) => setEstados(list),
                }}
              />
            </Form.Item>
          </div>

          <Form.Item name="descripcion" label="Descripción / Detalle">
            <Input.TextArea
              rows={3}
              placeholder="Detalle o motivo del gasto (opcional)"
              maxLength={255}
              showCount
              value={form.getFieldValue('descripcion') ?? ''}
              onChange={(e) => form.setFieldValue('descripcion', upperText(e.target.value))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* PDF Preview Modal */}
      {previewModal}
    </div>
  )
}

