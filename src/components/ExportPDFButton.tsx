import { Download } from 'lucide-react'
import { exportarParaPDF } from '@/lib/export-pdf'

interface ExportButtonProps {
  elementId: string
  filename?: string
  title?: string
  periodo?: string
  className?: string
  variant?: 'primary' | 'secondary' | 'outline'
}

export default function ExportPDFButton({
  elementId,
  filename = 'relatorio.pdf',
  title = 'Relatório',
  periodo = '',
  className = '',
  variant = 'primary',
}: ExportButtonProps) {
  const handleExport = async () => {
    await exportarParaPDF(elementId, {
      filename,
      title,
      periodo,
      incluirDataGeracao: true,
    })
  }

  const variantClasses = {
    primary: 'btn-primary gap-2',
    secondary: 'btn-secondary gap-2',
    outline: 'btn-outline gap-2',
  }

  return (
    <button
      onClick={handleExport}
      className={`${variantClasses[variant]} ${className}`}
      title="Exportar relatório em PDF"
    >
      <Download size={15} />
      Exportar PDF
    </button>
  )
}
