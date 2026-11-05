import { App, Popconfirm, Button } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import CrudPage from '../../components/CrudPage'
import categoriaService from '../../services/categoriaService'
import type { Categoria } from '../../types/categoria'

export default function CategoriasPage() {
  const { message } = App.useApp()
  const handleDeleteAll = async () => {
    try {
      const result = await categoriaService.deleteAll()
      if (result.omitidas.length > 0) {
        message.warning(
          `${result.eliminadas} eliminadas, ${result.omitidas.length} omitidas (tienen productos): ${result.omitidas.join(', ')}`,
        )
      } else {
        message.success(`${result.eliminadas} categorías eliminadas`)
      }
    } catch {
      message.error('Error al eliminar categorías')
    }
  }

  return (
    <CrudPage<Categoria>
      title="Categorías"
      actions={categoriaService}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: 'Nombre', dataIndex: 'nombre' },
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre', required: true, normalize: 'uppercase' },
      ]}
      modalTitle="Categoría"
      extraHeader={
        <Popconfirm
          title="¿Eliminar todas las categorías sin productos?"
          onConfirm={handleDeleteAll}
          okText="Sí"
          cancelText="Cancelar"
        >
          <Button danger icon={<WarningOutlined />}>
            Eliminar todas
          </Button>
        </Popconfirm>
      }
    />
  )
}
