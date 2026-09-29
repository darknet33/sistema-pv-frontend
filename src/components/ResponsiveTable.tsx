import { useState, useMemo, useEffect } from 'react'
import { Table, Card, Grid, Empty, Spin, Pagination } from 'antd'
import type { ColumnsType, TableProps } from 'antd/es/table'

const { useBreakpoint } = Grid

const DEFAULT_PAGE_SIZE = 10

interface ResponsiveTableProps<T> extends Omit<TableProps<T>, 'columns'> {
  columns: ColumnsType<T>
}

export default function ResponsiveTable<T extends object>({
  columns,
  dataSource,
  rowKey = 'id',
  loading,
  ...tableProps
}: ResponsiveTableProps<T>) {
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const pagConfig = tableProps.pagination === undefined
    ? {}
    : tableProps.pagination === false
    ? false
    : tableProps.pagination

  const config = (pagConfig && typeof pagConfig === 'object' ? pagConfig : {}) as {
    current?: number
    pageSize?: number
    pageSizeOptions?: string[]
    showSizeChanger?: boolean
    onChange?: (page: number, pageSize: number) => void
  }

  const pageSize = config.pageSize || DEFAULT_PAGE_SIZE
  const total = (pagConfig && typeof pagConfig === 'object' ? (pagConfig as any).total : undefined) || (dataSource ? dataSource.length : 0)

  // Si la tabla es controlada (viene `current`/`onChange`) se respeta ese estado,
  // en caso contrario queda el estado interno (comportamiento previo).
  const [page, setPage] = useState(config.current || 1)
  const [size, setSize] = useState(pageSize)

  useEffect(() => {
    if (config.current) setPage(config.current)
  }, [config.current])

  useEffect(() => {
    setSize(pageSize)
  }, [pageSize])

  const pageSizeOptions = config.pageSizeOptions || ['5', '10', '20', '50']
  const showSizeChanger = config.showSizeChanger !== false

  const handleChange = (p: number, ps: number) => {
    if (config.onChange) {
      config.onChange(p, ps)
      return
    }
    setPage(p)
    setSize(ps)
  }

  const paginated = useMemo(() => {
    if (!pagConfig || !dataSource) return dataSource
    const start = (page - 1) * size
    return (dataSource as any[]).slice(start, start + size)
  }, [dataSource, page, size, pagConfig])

  if (!isMobile) {
    return (
      <Table<T>
        columns={columns}
        dataSource={dataSource}
        rowKey={rowKey}
        loading={loading}
        size="middle"
        scroll={{ x: 'max-content' }}
        {...tableProps}
      />
    )
  }

  const visibleCols = columns.filter((col: any) => col.key !== 'acciones')
  const actionCol: any = columns.find((col: any) => col.key === 'acciones')

  if (loading && (!dataSource || dataSource.length === 0)) {
    return <Spin className="flex justify-center py-20" />
  }

  if (!dataSource || dataSource.length === 0) {
    return <Empty description="Sin datos" className="py-10" />
  }

  return (
    <div className="flex flex-col gap-3">
      {(paginated as any[]).map((record: any, idx: number) => {
        const id = typeof rowKey === 'function' ? rowKey(record) : record[rowKey]
        return (
          <Card
            key={id ?? idx}
            size="small"
            className="shadow-sm rounded-lg"
            styles={{
              body: { padding: '12px' },
            }}
          >
            <div className="flex flex-col gap-1.5">
              {visibleCols.map((col: any) => {
                const val = col.render
                  ? col.render(record[col.dataIndex as string], record, idx)
                  : record[col.dataIndex as string]
                if (val === null || val === undefined || val === '') return null
                const label = col.title as string
                return (
                  <div key={col.key ?? col.dataIndex as string} className="flex justify-between items-start gap-2 text-sm">
                    <span className="text-gray-500 shrink-0 min-w-[80px]">{label}</span>
                    <span className="text-right">{val}</span>
                  </div>
                )
              })}
            </div>
            {actionCol && (actionCol as any).render && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end gap-2">
                {(actionCol as any).render(null, record, idx)}
              </div>
            )}
          </Card>
        )
      })}

      {pagConfig !== false && dataSource.length > size && (
        <Pagination
          current={page}
          pageSize={size}
          total={total}
          onChange={handleChange}
          size="small"
          className="text-center mt-2"
          showSizeChanger={showSizeChanger}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  )
}
