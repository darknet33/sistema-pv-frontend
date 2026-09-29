import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Spin, App } from 'antd'
import {
  ShoppingCartOutlined,
  ShopOutlined,
  WarningOutlined,
  UserOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import type { ColumnsType } from 'antd/es/table'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'
import './InicioPage.css'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'

type Periodo = 'semana' | 'mes' | 'todo'

interface DashboardSerie {
  fecha: string
  ventas: number
  ventas_cantidad: number
  compras: number
  compras_cantidad: number
  utilidad: number
  gastos: number
  neta: number
}

interface DashboardData {
  periodo: Periodo
  periodo_label: string
  periodo_corto: string
  agrupacion: 'dia' | 'mes'
  desde: string | null
  hasta: string
  resumen: {
    ventas_cantidad: number
    ventas_total: number
    compras_cantidad: number
    compras_total: number
  }
  series: DashboardSerie[]
  top_vendedores: { username: string; cantidad: number; total: number }[]
  stock_bajo: { id: number; codigo: string; descripcion: string; marca: string; stock_actual: number; stock_minimo: number }[]
}

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'todo', label: 'Todo' },
]

const formatCurrency = (v: number) => `Bs. ${Number(v || 0).toFixed(2)}`

export default function InicioPage() {
  const { message } = App.useApp()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const usuario = useAuthStore((s) => s.usuario)

  // Refs para leer el último estado sin crear dependencias en useCallback/useEffect
  const dataRef = useRef<DashboardData | null>(null)
  const secuencia = useRef(0)

  const request = useCallback(
    (p: Periodo) => api.get('/reportes/dashboard', { params: { periodo: p } }),
    [],
  )

  const loadDashboard = useCallback(() => {
    const primeraCarga = dataRef.current === null
    const seq = ++secuencia.current
    if (primeraCarga) setLoading(true)
    else setRefrescando(true)
    request(periodo)
      .then((res) => {
        if (seq !== secuencia.current) return
        dataRef.current = res.data
        setData(res.data)
        setLoading(false)
        setRefrescando(false)
      })
      .catch(() => {
        if (seq !== secuencia.current) return
        setLoading(false)
        setRefrescando(false)
        if (primeraCarga) message.error('Error al cargar dashboard')
      })
  }, [periodo, message, request])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // useRealtimeRefresh guarda el callback en un ref, así que siempre usa el periodo vigente
  useRealtimeRefresh('dashboard', () => {
    const seq = ++secuencia.current
    request(periodo)
      .then((res) => {
        if (seq !== secuencia.current) return
        dataRef.current = res.data
        setData(res.data)
        setRefrescando(false)
      })
      .catch(() => {})
  })

  const series = useMemo(() => data?.series || [], [data])

  const rangoTexto = useMemo(() => {
    if (!data?.desde) return ''
    return `${dayjs(data.desde).format('DD/MM/YYYY')} — ${dayjs(data.hasta).format('DD/MM/YYYY')}`
  }, [data])

  const porMes = data?.agrupacion === 'mes'
  const formatoEje = porMes ? 'MM/YYYY' : 'DD/MM'
  const sufijo = data?.periodo_corto || '30d'
  const etiquetaPeriodo = data?.periodo_label || 'Últimos 30 días'

  const stockColumns: ColumnsType<DashboardData['stock_bajo'][0]> = [
    { title: 'Código', dataIndex: 'codigo', width: 80 },
    {
      title: 'Producto',
      key: 'producto',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.descripcion}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{r.marca}</div>
        </div>
      ),
    },
    {
      title: 'Stock Actual',
      dataIndex: 'stock_actual',
      width: 110,
      render: (v: number) => (
        <Tag color="red" className="stock-alert-tag">
          <WarningOutlined /> {v}
        </Tag>
      ),
    },
    { title: 'Stock Mínimo', dataIndex: 'stock_minimo', width: 100 },
  ]

  const vendedorColumns: ColumnsType<DashboardData['top_vendedores'][0]> = [
    {
      title: 'Usuario',
      dataIndex: 'username',
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    { title: 'Ventas', dataIndex: 'cantidad', width: 80 },
    {
      title: 'Total',
      dataIndex: 'total',
      width: 130,
      render: (v: number) => formatCurrency(v),
    },
  ]

  const formatFecha = (f: string) => dayjs(f).format(formatoEje)
  const formatTooltip = (f: unknown) => {
    const d = dayjs(String(f ?? ''))
    return porMes ? d.format('MMMM YYYY') : d.format('DD/MM/YYYY')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100%', margin: -24, padding: 24 }}>
      <div className="dashboard-welcome">
        <div>
          <h2>👋 Bienvenido, {usuario?.nombres || 'Usuario'}</h2>
          <span>{dayjs().format('dddd, D [de] MMMM [del] YYYY')}</span>
        </div>
        <div className="dashboard-filters">
          <div className="flex flex-wrap gap-2">
            {PERIODOS.map((p) => (
              <Tag.CheckableTag
                key={p.value}
                checked={periodo === p.value}
                onChange={() => setPeriodo(p.value)}
                className="!m-0 dashboard-period-chip"
              >
                {p.label}
              </Tag.CheckableTag>
            ))}
          </div>
          <div className="dashboard-filters-meta">
            {refrescando ? <Spin size="small" /> : null}
            <span>{rangoTexto}</span>
          </div>
        </div>
      </div>

      <div className={refrescando ? 'dashboard-body is-loading' : 'dashboard-body'}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {[
            {
              key: 'ventas',
              class: 'card-ventas',
              icon: <ShopOutlined />,
              title: `Ventas (${sufijo})`,
              value: data?.resumen.ventas_total || 0,
              suffix: 'Bs.',
              subtext: `${data?.resumen.ventas_cantidad || 0} transacciones`,
              precision: 2,
            },
            {
              key: 'compras',
              class: 'card-compras',
              icon: <ShoppingCartOutlined />,
              title: `Compras (${sufijo})`,
              value: data?.resumen.compras_total || 0,
              suffix: 'Bs.',
              subtext: `${data?.resumen.compras_cantidad || 0} transacciones`,
              precision: 2,
            },
            {
              key: 'stock',
              class: 'card-stock',
              icon: <WarningOutlined />,
              title: 'Stock bajo',
              value: data?.stock_bajo.length || 0,
              suffix: '',
              subtext: 'productos por debajo del mínimo',
            },
            {
              key: 'vendedor',
              class: 'card-vendedor',
              icon: <UserOutlined />,
              title: `Mejor vendedor (${sufijo})`,
              value: data?.top_vendedores[0]?.username || '-',
              suffix: '',
              subtext: data?.top_vendedores[0]
                ? formatCurrency(data.top_vendedores[0].total)
                : '',
            },
          ].map((card) => (
            <Col xs={24} sm={12} md={6} key={card.key}>
              <Card className={`dashboard-card ${card.class}`} variant="borderless">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Statistic
                    title={card.title}
                    value={card.key === 'vendedor' ? undefined : card.value}
                    valueStyle={{ fontSize: card.key === 'vendedor' ? 20 : 28, fontWeight: 600 }}
                    precision={card.precision}
                    suffix={card.suffix}
                  />
                  <div className="icon-circle">{card.icon}</div>
                </div>
                {card.key === 'vendedor' && (
                  <div style={{ fontSize: 22, fontWeight: 600 }}>{card.value}</div>
                )}
                <div className="card-subtext">
                  {card.key !== 'vendedor' && (
                    <ArrowUpOutlined style={{ marginRight: 4 }} />
                  )}
                  {card.subtext}
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Card
          title={<span style={{ fontSize: 16, fontWeight: 600 }}>Ventas vs Compras ({etiquetaPeriodo.toLowerCase()})</span>}
          className="dashboard-chart-card"
          style={{ marginBottom: 16 }}
          variant="borderless"
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="fecha" tickFormatter={formatFecha} fontSize={12} minTickGap={16} />
              <YAxis fontSize={12} tickFormatter={(v) => `Bs.${v}`} />
              <Tooltip labelFormatter={formatTooltip} />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value: string) => (
                  <span style={{ color: '#333', fontWeight: 500 }}>{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="ventas"
                name="Ventas"
                stroke="#1890ff"
                strokeWidth={3}
                dot={series.length <= 40 ? { fill: '#1890ff', strokeWidth: 2, r: 4 } : false}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="compras"
                name="Compras"
                stroke="#52c41a"
                strokeWidth={3}
                dot={series.length <= 40 ? { fill: '#52c41a', strokeWidth: 2, r: 4 } : false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title={<span style={{ fontSize: 16, fontWeight: 600 }}>Utilidad vs Gastos ({etiquetaPeriodo.toLowerCase()})</span>}
          className="dashboard-chart-card"
          style={{ marginBottom: 16 }}
          variant="borderless"
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="fecha" tickFormatter={formatFecha} fontSize={12} minTickGap={16} />
              <YAxis fontSize={12} tickFormatter={(v) => `Bs.${v}`} />
              <Tooltip
                labelFormatter={formatTooltip}
                formatter={(value) => [formatCurrency(Number(value)), '']}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value: string) => (
                  <span style={{ color: '#333', fontWeight: 500 }}>{value}</span>
                )}
              />
              <ReferenceLine y={0} stroke="#999" strokeDasharray="3 3" />
              <Bar dataKey="utilidad" name="Utilidad" fill="#52c41a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill="#ff4d4f" radius={[4, 4, 0, 0]} />
              <Bar dataKey="neta" name="Utilidad Neta" fill="#1890ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Card
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Productos con stock bajo</span>}
              className="dashboard-table-card"
              variant="borderless"
            >
              <Table
                columns={stockColumns}
                dataSource={data?.stock_bajo || []}
                rowKey="id"
                size="middle"
                scroll={{ x: 'max-content' }}
                pagination={{ pageSize: 5, size: 'small' }}
                rowClassName={() => 'dashboard-row'}
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Top vendedores ({etiquetaPeriodo.toLowerCase()})</span>}
              className="dashboard-table-card"
              variant="borderless"
            >
              <Table
                columns={vendedorColumns}
                dataSource={data?.top_vendedores || []}
                rowKey="username"
                size="middle"
                scroll={{ x: 'max-content' }}
                pagination={false}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}
