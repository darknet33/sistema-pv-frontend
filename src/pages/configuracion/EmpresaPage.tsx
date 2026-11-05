import { useEffect, useState } from 'react'
import { App, Card, Form, Input, Button, Upload, ColorPicker, Grid } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import PageHeader from '../../components/PageHeader'
import {
  getEmpresa,
  updateEmpresa,
  uploadEmpresaLogo,
  deleteEmpresaLogo,
  uploadEmpresaImagenEncabezado,
  deleteEmpresaImagenEncabezado,
  uploadEmpresaImagenPie,
  deleteEmpresaImagenPie,
} from '../../services/empresaService'
import { useEmpresaStore, DEFAULT_PRIMARY, DEFAULT_SECONDARY } from '../../stores/empresaStore'
import { resolveUrl } from '../../utils/resolveUrl'
import { upperText } from '../../utils/format'
import type { EmpresaUpdate } from '../../types/empresa'

const { useBreakpoint } = Grid

function ImagenUpload({
  label,
  fileList,
  setFileList,
}: {
  label: string
  fileList: UploadFile[]
  setFileList: (files: UploadFile[]) => void
}) {
  return (
    <div className="flex flex-col items-center">
      <Upload
        listType="picture-card"
        maxCount={1}
        fileList={fileList}
        accept=".jpg,.jpeg,.png,.gif,.webp"
        beforeUpload={() => false}
        onChange={({ fileList }) => setFileList(fileList)}
      >
        {fileList.length >= 1 ? null : (
          <div>
            <UploadOutlined />
            <div style={{ marginTop: 4 }}>{label}</div>
          </div>
        )}
      </Upload>
    </div>
  )
}

export default function EmpresaPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const empresa = useEmpresaStore((state) => state.empresa)
  const loadEmpresa = useEmpresaStore((state) => state.loadEmpresa)
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa)

  const [logoFileList, setLogoFileList] = useState<UploadFile[]>([])
  const [encabezadoFileList, setEncabezadoFileList] = useState<UploadFile[]>([])
  const [pieFileList, setPieFileList] = useState<UploadFile[]>([])
  const [colorPrincipal, setColorPrincipal] = useState(DEFAULT_PRIMARY)
  const [colorSecundario, setColorSecundario] = useState(DEFAULT_SECONDARY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadEmpresa()
  }, [loadEmpresa])

  useEffect(() => {
    if (empresa) {
      form.setFieldsValue({
        nombre: empresa.nombre,
        razon_social: empresa.razon_social,
        nit: empresa.nit,
        telefono: empresa.telefono,
        correo: empresa.correo,
        direccion: empresa.direccion,
        ciudad: empresa.ciudad,
      })
      setColorPrincipal(empresa.color_principal || DEFAULT_PRIMARY)
      setColorSecundario(empresa.color_secundario || DEFAULT_SECONDARY)
      setLogoFileList(
        empresa.logo
          ? [{ uid: '-1', name: 'logo', status: 'done', url: resolveUrl(empresa.logo) }]
          : []
      )
      setEncabezadoFileList(
        empresa.imagen_encabezado
          ? [{ uid: '-2', name: 'encabezado', status: 'done', url: resolveUrl(empresa.imagen_encabezado) }]
          : []
      )
      setPieFileList(
        empresa.imagen_pie
          ? [{ uid: '-3', name: 'pie', status: 'done', url: resolveUrl(empresa.imagen_pie) }]
          : []
      )
    }
  }, [empresa, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const data: EmpresaUpdate = {
        ...values,
        color_principal: colorPrincipal,
        color_secundario: colorSecundario,
      }

      setSaving(true)
      await updateEmpresa(data)

      const pendingLogo = logoFileList.find((f) => f.originFileObj)
      if (pendingLogo?.originFileObj) {
        await uploadEmpresaLogo(pendingLogo.originFileObj as File)
      } else if (empresa?.logo && logoFileList.length === 0) {
        await deleteEmpresaLogo()
      }

      const pendingEncabezado = encabezadoFileList.find((f) => f.originFileObj)
      if (pendingEncabezado?.originFileObj) {
        await uploadEmpresaImagenEncabezado(pendingEncabezado.originFileObj as File)
      } else if (empresa?.imagen_encabezado && encabezadoFileList.length === 0) {
        await deleteEmpresaImagenEncabezado()
      }

      const pendingPie = pieFileList.find((f) => f.originFileObj)
      if (pendingPie?.originFileObj) {
        await uploadEmpresaImagenPie(pendingPie.originFileObj as File)
      } else if (empresa?.imagen_pie && pieFileList.length === 0) {
        await deleteEmpresaImagenPie()
      }

      const final = await getEmpresa()
      setEmpresa(final)
      message.success('Datos de la empresa guardados')
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Empresa" />

      <Card
        title="DATOS DE LA EMPRESA"
        className="max-w-[720px]"
        styles={{ title: { textTransform: 'uppercase', fontSize: 16 } }}
      >
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col items-center gap-4 w-full md:w-[180px]">
            <div className="flex flex-col items-center">
              <ImagenUpload label="Logo" fileList={logoFileList} setFileList={setLogoFileList} />
              <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>Logo</div>
            </div>
            <div className="flex flex-col items-center">
              <ImagenUpload
                label="Encabezado"
                fileList={encabezadoFileList}
                setFileList={setEncabezadoFileList}
              />
              <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>Encabezado de documentos</div>
            </div>
            <div className="flex flex-col items-center">
              <ImagenUpload label="Pie de página" fileList={pieFileList} setFileList={setPieFileList} />
              <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>Pie de página de documentos</div>
            </div>
          </div>

          <Form form={form} layout="vertical" className="flex-1 min-w-[280px]">
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-x-4`}>
              <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'El nombre es requerido' }]}>
                <Input
                  value={form.getFieldValue('nombre') ?? ''}
                  onChange={(e) => form.setFieldValue('nombre', upperText(e.target.value))}
                />
              </Form.Item>
              <Form.Item name="razon_social" label="Razón social">
                <Input
                  value={form.getFieldValue('razon_social') ?? ''}
                  onChange={(e) => form.setFieldValue('razon_social', upperText(e.target.value))}
                />
              </Form.Item>
              <Form.Item name="nit" label="NIT">
                <Input
                  value={form.getFieldValue('nit') ?? ''}
                  onChange={(e) => form.setFieldValue('nit', upperText(e.target.value))}
                />
              </Form.Item>
              <Form.Item name="telefono" label="Teléfono">
                <Input
                  value={form.getFieldValue('telefono') ?? ''}
                  onChange={(e) => form.setFieldValue('telefono', upperText(e.target.value))}
                />
              </Form.Item>
              <Form.Item name="correo" label="Correo">
                <Input />
              </Form.Item>
              <Form.Item name="ciudad" label="Ciudad">
                <Input
                  value={form.getFieldValue('ciudad') ?? ''}
                  onChange={(e) => form.setFieldValue('ciudad', upperText(e.target.value))}
                />
              </Form.Item>
              <Form.Item name="direccion" label="Dirección" className="md:col-span-2">
                <Input
                  value={form.getFieldValue('direccion') ?? ''}
                  onChange={(e) => form.setFieldValue('direccion', upperText(e.target.value))}
                />
              </Form.Item>

              <Form.Item label="Color principal">
                <ColorPicker
                  value={colorPrincipal}
                  onChange={(color) => setColorPrincipal(color.toHexString())}
                  showText
                  className="w-full"
                />
              </Form.Item>
              <Form.Item label="Color secundario">
                <ColorPicker
                  value={colorSecundario}
                  onChange={(color) => setColorSecundario(color.toHexString())}
                  showText
                  className="w-full"
                />
              </Form.Item>
            </div>

            <Button type="primary" htmlType="button" loading={saving} onClick={handleSave}>
              Guardar
            </Button>
          </Form>
        </div>
      </Card>
    </div>
  )
}
