import CrudPage from '../../components/CrudPage'
import comprobanteService from '../../services/comprobanteService'
import type { Comprobante } from '../../types/configuracion'

export default function ComprobantesPage() {
  return (
    <CrudPage<Comprobante>
      title="Comprobantes"
      actions={comprobanteService}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: 'Nombre', dataIndex: 'nombre' },
        { title: 'Número', dataIndex: 'numero' },
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre', required: true, normalize: 'uppercase' },
        { name: 'numero', label: 'Número', type: 'number', required: true, min: 1 },
      ]}
    />
  )
}
