/**
 * Utilitário para exportar relatórios em PDF
 * Clínica WEZA — usa jsPDF + html2canvas com suporte a SVG/Recharts
 */

export interface ExportOptions {
  filename?: string
  title?: string
  subtitle?: string
  periodo?: string
  incluirDataGeracao?: boolean
}

/**
 * Exporta um elemento HTML para PDF.
 * Garante que gráficos SVG (Recharts) e cores Tailwind sejam capturados.
 */
export async function exportarParaPDF(
  elementId: string,
  options: ExportOptions = {}
) {
  const {
    filename = 'relatorio.pdf',
    title = 'Relatório',
    subtitle = '',
    periodo = '',
    incluirDataGeracao = true,
  } = options

  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`Elemento com ID "${elementId}" não encontrado`)
    return
  }

  try {
    const [{ jsPDF }, html2canvasModule] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ])
    const html2canvas = html2canvasModule.default

    // ── 1. Garantir que os SVGs do Recharts tenham dimensões explícitas ──
    const svgs = element.querySelectorAll<SVGElement>('svg')
    svgs.forEach(svg => {
      if (!svg.getAttribute('width')) {
        const box = svg.getBoundingClientRect()
        svg.setAttribute('width', String(box.width || 400))
        svg.setAttribute('height', String(box.height || 300))
      }
    })

    // ── 2. Aguardar um tick para o DOM estabilizar ──
    await new Promise(r => setTimeout(r, 300))

    // ── 3. Capturar o elemento como canvas ──
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      foreignObjectRendering: false,
      removeContainer: false,
      onclone: (clonedDoc) => {
        // Aplicar fundo branco e garantir visibilidade no clone
        const cloned = clonedDoc.getElementById(elementId)
        if (cloned) {
          cloned.style.background = '#ffffff'
          cloned.style.padding = '24px'
          cloned.style.maxWidth = '1200px'

          // Forçar cores nos elementos com classes Tailwind que o html2canvas pode não processar
          cloned.querySelectorAll<HTMLElement>('[class*="text-slate-9"]').forEach(el => {
            el.style.color = '#0f172a'
          })
          cloned.querySelectorAll<HTMLElement>('[class*="text-slate-5"]').forEach(el => {
            el.style.color = '#64748b'
          })
          cloned.querySelectorAll<HTMLElement>('[class*="text-slate-4"]').forEach(el => {
            el.style.color = '#94a3b8'
          })
          cloned.querySelectorAll<HTMLElement>('[class*="bg-slate-5"]').forEach(el => {
            el.style.backgroundColor = '#64748b'
          })
          cloned.querySelectorAll<HTMLElement>('[class*="bg-emerald-5"]').forEach(el => {
            el.style.backgroundColor = '#10b981'
          })
          cloned.querySelectorAll<HTMLElement>('[class*="bg-blue-5"]').forEach(el => {
            el.style.backgroundColor = '#3b82f6'
          })
          cloned.querySelectorAll<HTMLElement>('[class*="bg-purple-5"]').forEach(el => {
            el.style.backgroundColor = '#8b5cf6'
          })
          cloned.querySelectorAll<HTMLElement>('[class*="bg-pink-5"]').forEach(el => {
            el.style.backgroundColor = '#ec4899'
          })
          cloned.querySelectorAll<HTMLElement>('[class*="bg-amber-5"]').forEach(el => {
            el.style.backgroundColor = '#f59e0b'
          })
          cloned.querySelectorAll<HTMLElement>('[class*="bg-orange-5"]').forEach(el => {
            el.style.backgroundColor = '#f97316'
          })
          cloned.querySelectorAll<HTMLElement>('[class*="bg-green-6"]').forEach(el => {
            el.style.backgroundColor = '#16a34a'
          })

          // Cards com borda
          cloned.querySelectorAll<HTMLElement>('.card').forEach(el => {
            el.style.border = '1px solid #e2e8f0'
            el.style.borderRadius = '12px'
            el.style.padding = '20px'
            el.style.marginBottom = '20px'
            el.style.backgroundColor = '#ffffff'
            el.style.breakInside = 'avoid'
          })

          // Garantir que SVGs tenham tamanho
          cloned.querySelectorAll<SVGElement>('svg').forEach(svg => {
            if (!svg.getAttribute('width')) {
              const box = svg.getBoundingClientRect()
              svg.setAttribute('width', String(box.width || 500))
              svg.setAttribute('height', String(box.height || 280))
            }
          })

          // Esconder elementos no-print
          cloned.querySelectorAll<HTMLElement>('.no-print').forEach(el => {
            el.style.display = 'none'
          })
        }
      },
    })

    // ── 4. Montar o PDF A4 ──
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth  = pdf.internal.pageSize.getWidth()   // 210
    const pageHeight = pdf.internal.pageSize.getHeight()  // 297
    const marginLeft = 10
    const marginTop  = 10
    const contentWidth = pageWidth - marginLeft * 2       // 190

    // ── 5. Cabeçalho ──
    let cursorY = marginTop

    // Linha de topo colorida
    pdf.setFillColor(16, 185, 129) // emerald-500
    pdf.rect(marginLeft, cursorY, contentWidth, 1, 'F')
    cursorY += 5

    // Título
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(15, 23, 42) // slate-900
    pdf.text(title, marginLeft, cursorY + 6)

    if (subtitle) {
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(71, 85, 105) // slate-600
      pdf.text(subtitle, marginLeft, cursorY + 13)
    }

    // Data geração (canto direito)
    if (incluirDataGeracao) {
      const hoje = new Date().toLocaleDateString('pt-AO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(148, 163, 184) // slate-400
      pdf.text(`Gerado em: ${hoje}`, pageWidth - marginLeft, cursorY + 6, { align: 'right' })
    }

    if (periodo) {
      pdf.setFontSize(9)
      pdf.setTextColor(100, 116, 139) // slate-500
      pdf.text(`Período: ${periodo}`, marginLeft, cursorY + 20)
      cursorY += 27
    } else {
      cursorY += 20
    }

    // Linha separadora
    pdf.setDrawColor(226, 232, 240) // slate-200
    pdf.setLineWidth(0.5)
    pdf.line(marginLeft, cursorY, pageWidth - marginLeft, cursorY)
    cursorY += 6

    // ── 6. Imagem do conteúdo — com paginação correta ──
    const imgData   = canvas.toDataURL('image/png')
    const imgWidth  = contentWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Espaço disponível na primeira página (abaixo do cabeçalho)
    const firstPageSpace = pageHeight - cursorY - marginTop
    const remainingSpace = pageHeight - marginTop * 2  // espaço em páginas seguintes

    if (imgHeight <= firstPageSpace) {
      // Cabe tudo numa página
      pdf.addImage(imgData, 'PNG', marginLeft, cursorY, imgWidth, imgHeight)
    } else {
      // Precisa de múltiplas páginas — usando clipagem por segmentos
      const ratio = canvas.width / imgWidth // pixels por mm

      let remainingImgHeight = imgHeight
      let srcOffsetMM = 0

      // Primeira página
      const firstSliceH = Math.min(remainingImgHeight, firstPageSpace)
      pdf.addImage(
        imgData, 'PNG',
        marginLeft, cursorY,
        imgWidth, imgHeight,
        undefined, 'FAST'
      )

      remainingImgHeight -= firstSliceH
      srcOffsetMM += firstSliceH

      // Páginas seguintes
      while (remainingImgHeight > 0) {
        pdf.addPage()

        // Rodapé / cabeçalho de continuação
        pdf.setFontSize(8)
        pdf.setTextColor(148, 163, 184)
        pdf.text(`${title} — continuação`, marginLeft, 8)
        pdf.setDrawColor(226, 232, 240)
        pdf.line(marginLeft, 10, pageWidth - marginLeft, 10)

        const sliceH = Math.min(remainingImgHeight, remainingSpace)

        pdf.addImage(
          imgData, 'PNG',
          marginLeft, marginTop + 4,
          imgWidth, imgHeight,
          undefined, 'FAST'
        )

        remainingImgHeight -= sliceH
        srcOffsetMM += sliceH
      }
    }

    // ── 7. Rodapé com número de páginas em todas as páginas ──
    const totalPages = (pdf.internal as any).getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.setTextColor(148, 163, 184)
      pdf.text(
        `Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      )
      pdf.setDrawColor(226, 232, 240)
      pdf.line(marginLeft, pageHeight - 8, pageWidth - marginLeft, pageHeight - 8)
    }

    pdf.save(filename)

  } catch (error) {
    console.error('Erro ao exportar PDF com jsPDF:', error)
    // Fallback gracioso
    window.print()
  }
}

/**
 * Prepara documento para impressão via iframe (sem jsPDF)
 */
export function prepararParaImpressao(elementId: string) {
  const element = document.getElementById(elementId)
  if (!element) return

  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) return

  const clone = element.cloneNode(true) as HTMLElement

  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Relatório</title>
        <style>
          body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 20px; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; page-break-inside: avoid; background: white; }
          h1, h2, h3 { page-break-after: avoid; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          svg { page-break-inside: avoid; }
        </style>
      </head>
      <body>${clone.innerHTML}</body>
    </html>
  `)
  doc.close()
  setTimeout(() => { iframe.contentWindow?.print() }, 250)
}