import CrudPage from '../../components/CrudPage'
import moduloService from '../../services/moduloService'
import type { Modulo } from '../../types/configuracion'

export default function ModulosPage() {
  return (
    <CrudPage<Modulo>
      title="Módulos"
      actions={moduloService}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: 'Nombre', dataIndex: 'nombre' },
        {
          title: 'Activo',
          dataIndex: 'activo',
          render: (activo: boolean) => (activo ? 'Sí' : 'No'),
        },
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre', required: true, normalize: 'uppercase' },
        { name: 'activo', label: 'Activo', type: 'switch' },
      ]}
    />
  )
}
