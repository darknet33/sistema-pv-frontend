import CrudPage from '../../components/CrudPage'
import estadoService from '../../services/estadoService'
import type { Estado } from '../../types/configuracion'

export default function EstadosPage() {
  return (
    <CrudPage<Estado>
      title="Estados"
      actions={estadoService}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: 'Nombre', dataIndex: 'nombre' },
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre', required: true, normalize: 'uppercase' },
      ]}
    />
  )
}
