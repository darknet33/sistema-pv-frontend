import { App, Popconfirm, Button } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import CrudPage from '../../components/CrudPage'
import categoriaUnidadService from '../../services/categoriaUnidadService'
import type { CategoriaUnidad } from '../../types/categoriaUnidad'

export default function CategoriasUnidadPage() {
  const { message } = App.useApp()
  const handleDeleteAll = async () => {
    try {
      const result = await categoriaUnidadService.deleteAll()
      if (result.omitidas.length > 0) {
        message.warning(
          `${result.eliminadas} eliminadas, ${result.omitidas.length} omitidas (tienen unidades): ${result.omitidas.join(', ')}`,
        )
      } else {
        message.success(`${result.eliminadas} categorías de unidad eliminadas`)
      }
    } catch {
      message.error('Error al eliminar categorías de unidad')
    }
  }

  return (
    <CrudPage<CategoriaUnidad>
      title="Categorías de Unidad"
      actions={categoriaUnidadService}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: 'Nombre', dataIndex: 'nombre' },
        { title: 'Descripción', dataIndex: 'descripcion', render: (v: string) => v || '-' },
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre', required: true, normalize: 'uppercase' },
        { name: 'descripcion', label: 'Descripción', normalize: 'uppercase' },
      ]}
      modalTitle="Categoría de Unidad"
      extraHeader={
        <Popconfirm
          title="¿Eliminar todas las categorías sin unidades?"
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
