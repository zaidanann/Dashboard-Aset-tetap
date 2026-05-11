import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { AsetEntry } from '@/lib/data'

// ── Column definitions (order = column order in Excel) ──────────────────────
export const COLUMNS = [
  { field: 'no',         header: 'NO',                             width: 6  },
  { field: 'daerah',     header: 'DAERAH',                         width: 40 },
  { field: 'tanah',      header: 'TANAH',                          width: 20 },
  { field: 'mesin',      header: 'PERALATAN DAN MESIN',            width: 20 },
  { field: 'gedung',     header: 'GEDUNG DAN BANGUNAN',            width: 20 },
  { field: 'jalan',      header: 'JALAN, IRIGASI DAN JARINGAN',    width: 24 },
  { field: 'lainnya',    header: 'ASET TETAP LAINNYA',             width: 20 },
  { field: 'kdp',        header: 'KONSTRUKSI DALAM PENGERJAAN',    width: 24 },
  { field: 'penyusutan', header: 'AKUMULASI PENYUSUTAN',           width: 22 },
] as const

// ── Path helpers ─────────────────────────────────────────────────────────────
export function getConfiguredPath(): string | null {
  return process.env.EXCEL_FILE_PATH?.trim() || null
}

export function getConfiguredSheet(): string {
  return process.env.EXCEL_SHEET_NAME?.trim() || 'DATA ASET TETAP 2023'
}

// Resolve a Windows-style path on any OS (just normalises separators)
export function resolvePath(filePath: string): string {
  return path.resolve(filePath.replace(/\\/g, '/'))
}

// ── Low-level column / cell helpers ─────────────────────────────────────────
function colLetter(col: number): string {
  let s = ''
  let c = col + 1
  while (c > 0) { c--; s = String.fromCharCode(65 + (c % 26)) + s; c = Math.floor(c / 26) }
  return s
}

function getCellValue(ws: XLSX.WorkSheet, row: number, col: number): unknown {
  const cell = ws[colLetter(col) + row]
  return cell ? (cell.v ?? cell.w ?? '') : ''
}

function norm(s: unknown): string {
  return String(s ?? '').toUpperCase().trim().replace(/\s+/g, ' ')
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return Math.abs(val)
  const n = parseFloat(String(val).replace(/[^0-9.,-]/g, '').replace(',', '.'))
  return isNaN(n) ? 0 : Math.abs(n)
}

// ── Reader ───────────────────────────────────────────────────────────────────
export function readEntriesFromSheet(ws: XLSX.WorkSheet): AsetEntry[] {
  const ref = ws['!ref']
  if (!ref) return []

  const range = XLSX.utils.decode_range(ref)
  const minR = range.s.r + 1
  const maxR = range.e.r + 1
  const minC = range.s.c
  const maxC = range.e.c

  // Find header row (contains "DAERAH")
  let headerRow = -1
  let daerahCol = -1
  for (let r = minR; r <= Math.min(minR + 20, maxR); r++) {
    for (let c = minC; c <= maxC; c++) {
      if (norm(getCellValue(ws, r, c)) === 'DAERAH') {
        headerRow = r; daerahCol = c; break
      }
    }
    if (headerRow !== -1) break
  }
  if (headerRow === -1) return []

  // Map column indices
  const COL_PATTERNS: { field: keyof AsetEntry; patterns: string[] }[] = [
    { field: 'no',         patterns: ['NO'] },
    { field: 'daerah',     patterns: ['DAERAH'] },
    { field: 'penyusutan', patterns: ['AKUMULASI PENYUSUTAN', 'AKUMULASI'] },
    { field: 'tanah',      patterns: ['TANAH'] },
    { field: 'mesin',      patterns: ['PERALATAN DAN MESIN', 'PERALATAN'] },
    { field: 'gedung',     patterns: ['GEDUNG DAN BANGUNAN', 'GEDUNG'] },
    { field: 'jalan',      patterns: ['JALAN, IRIGASI DAN JARINGAN', 'JALAN'] },
    { field: 'lainnya',    patterns: ['ASET TETAP LAINNYA', 'ASET LAINNYA'] },
    { field: 'kdp',        patterns: ['KONSTRUKSI DALAM PENGERJAAN', 'KONSTRUKSI'] },
  ]

  const colMap: Partial<Record<keyof AsetEntry, number>> = {}
  const headerTexts: Map<number, string> = new Map()
  for (let c = minC; c <= maxC; c++) {
    const parts = [
      norm(getCellValue(ws, headerRow - 1, c)),
      norm(getCellValue(ws, headerRow, c)),
      norm(getCellValue(ws, headerRow + 1, c)),
    ]
    headerTexts.set(c, parts.filter(Boolean).join(' '))
  }
  for (const { field, patterns } of COL_PATTERNS) {
    if (colMap[field] !== undefined) continue
    for (const [c, text] of headerTexts) {
      if (patterns.some(p => text.includes(p))) { colMap[field] = c; break }
    }
  }
  if (colMap['daerah'] === undefined) colMap['daerah'] = daerahCol
  if (colMap['no'] === undefined) colMap['no'] = minC

  // Find data start row (skip sub-headers like "1 2 3 4...")
  let dataStartRow = headerRow + 1
  for (let r = headerRow + 1; r <= headerRow + 5; r++) {
    const v = norm(getCellValue(ws, r, colMap['daerah']!))
    if (/^\d+$/.test(v) || v === '' || v === 'DAERAH') dataStartRow = r + 1
    else break
  }

  const entries: AsetEntry[] = []
  let idCounter = 1
  for (let r = dataStartRow; r <= maxR; r++) {
    const daerah = String(getCellValue(ws, r, colMap['daerah']!) ?? '').trim()
    if (!daerah) continue
    const du = daerah.toUpperCase()
    if (du === 'DAERAH' || du.includes('JUMLAH') || du.includes('TOTAL') || /^\d{1,3}$/.test(daerah)) continue

    const g = (f: keyof AsetEntry) => {
      const col = colMap[f]; return col !== undefined ? getCellValue(ws, r, col) : 0
    }
    entries.push({
      id: String(idCounter), no: toNumber(g('no')) || idCounter, daerah,
      tanah: toNumber(g('tanah')), mesin: toNumber(g('mesin')),
      gedung: toNumber(g('gedung')), jalan: toNumber(g('jalan')),
      lainnya: toNumber(g('lainnya')), kdp: toNumber(g('kdp')),
      penyusutan: toNumber(g('penyusutan')),
    })
    idCounter++
  }
  return entries
}

// ── Writer ───────────────────────────────────────────────────────────────────
/**
 * Appends a new row to the given sheet in the workbook.
 * If the sheet already has data rows detected by readEntriesFromSheet,
 * the new row is appended after the last data row.
 * Otherwise a simple header+row is written.
 */
export function appendEntryToSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  entry: Omit<AsetEntry, 'id'>
): XLSX.WorkBook {
  let ws = wb.Sheets[sheetName]

  if (!ws) {
    // Create a fresh sheet with header
    const aoa: (string | number)[][] = [
      COLUMNS.map(c => c.header),
      COLUMNS.map(c => {
        const v = entry[c.field as keyof typeof entry]
        return typeof v === 'number' ? v : String(v)
      }),
    ]
    ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    return wb
  }

  const ref = ws['!ref']
  if (!ref) {
    // Empty sheet — write header then data
    const aoa: (string | number)[][] = [
      COLUMNS.map(c => c.header),
      COLUMNS.map(c => {
        const v = entry[c.field as keyof typeof entry]
        return typeof v === 'number' ? v : String(v)
      }),
    ]
    ws = XLSX.utils.aoa_to_sheet(aoa)
    wb.Sheets[sheetName] = ws
    return wb
  }

  // Find last used row
  const range = XLSX.utils.decode_range(ref)
  const lastRow = range.e.r + 1  // 1-based

  // Find the column mapping from the existing sheet
  const entries = readEntriesFromSheet(ws)
  // We'll just append to row lastRow + 1
  const newRow = lastRow + 1

  // Find column positions for our fields
  // Re-scan header row to get col positions
  const minR = range.s.r + 1
  const minC = range.s.c
  const maxC = range.e.c

  // Detect header row
  let headerRow = -1
  for (let r = minR; r <= Math.min(minR + 20, lastRow); r++) {
    for (let c = minC; c <= maxC; c++) {
      if (norm(getCellValue(ws, r, c)) === 'DAERAH') { headerRow = r; break }
    }
    if (headerRow !== -1) break
  }

  if (headerRow === -1) {
    // Fallback: just append using our column order starting at col A
    const rowData = COLUMNS.map(c => {
      const v = entry[c.field as keyof typeof entry]
      return typeof v === 'number' ? v : String(v)
    })
    XLSX.utils.sheet_add_aoa(ws, [rowData], { origin: { r: newRow - 1, c: 0 } })
    ws['!ref'] = XLSX.utils.encode_range({ s: range.s, e: { r: newRow - 1, c: Math.max(range.e.c, rowData.length - 1) } })
    return wb
  }

  // Find column mapping
  const colMap: Partial<Record<string, number>> = {}
  const headerTexts: Map<number, string> = new Map()
  for (let c = minC; c <= maxC; c++) {
    const parts = [
      norm(getCellValue(ws, headerRow - 1, c)),
      norm(getCellValue(ws, headerRow, c)),
      norm(getCellValue(ws, headerRow + 1, c)),
    ]
    headerTexts.set(c, parts.filter(Boolean).join(' '))
  }

  const fieldPatterns: Record<string, string[]> = {
    no:         ['NO'],
    daerah:     ['DAERAH'],
    tanah:      ['TANAH'],
    mesin:      ['PERALATAN DAN MESIN', 'PERALATAN'],
    gedung:     ['GEDUNG DAN BANGUNAN', 'GEDUNG'],
    jalan:      ['JALAN, IRIGASI DAN JARINGAN', 'JALAN'],
    lainnya:    ['ASET TETAP LAINNYA', 'ASET LAINNYA'],
    kdp:        ['KONSTRUKSI DALAM PENGERJAAN', 'KONSTRUKSI'],
    penyusutan: ['AKUMULASI PENYUSUTAN', 'AKUMULASI'],
  }

  for (const [field, patterns] of Object.entries(fieldPatterns)) {
    for (const [c, text] of headerTexts) {
      if (patterns.some(p => text.includes(p))) { colMap[field] = c; break }
    }
  }

  // Also auto-detect "JUMLAH" column to write computed total
  let jumlahCol: number | undefined
  for (const [c, text] of headerTexts) {
    if (text.includes('JUMLAH') && !text.includes('DAERAH')) { jumlahCol = c; break }
  }

  // Compute next NO
  const nextNo = entries.length > 0 ? Math.max(...entries.map(e => e.no)) + 1 : 1
  const jumlah = entry.tanah + entry.mesin + entry.gedung + entry.jalan + entry.lainnya + entry.kdp - entry.penyusutan

  // Write cells
  const writeCell = (col: number, value: string | number) => {
    const addr = colLetter(col) + newRow
    ws[addr] = typeof value === 'number'
      ? { t: 'n', v: value, z: '#,##0' }
      : { t: 's', v: value }
  }

  if (colMap['no'] !== undefined)         writeCell(colMap['no'], nextNo)
  if (colMap['daerah'] !== undefined)     writeCell(colMap['daerah'], entry.daerah)
  if (colMap['tanah'] !== undefined)      writeCell(colMap['tanah'], entry.tanah)
  if (colMap['mesin'] !== undefined)      writeCell(colMap['mesin'], entry.mesin)
  if (colMap['gedung'] !== undefined)     writeCell(colMap['gedung'], entry.gedung)
  if (colMap['jalan'] !== undefined)      writeCell(colMap['jalan'], entry.jalan)
  if (colMap['lainnya'] !== undefined)    writeCell(colMap['lainnya'], entry.lainnya)
  if (colMap['kdp'] !== undefined)        writeCell(colMap['kdp'], entry.kdp)
  if (colMap['penyusutan'] !== undefined) writeCell(colMap['penyusutan'], entry.penyusutan)
  if (jumlahCol !== undefined)            writeCell(jumlahCol, jumlah)

  // Expand the sheet ref
  const newRange = {
    s: range.s,
    e: { r: newRow - 1, c: Math.max(range.e.c, jumlahCol ?? range.e.c) }
  }
  ws['!ref'] = XLSX.utils.encode_range(newRange)

  return wb
}

// ── File I/O ─────────────────────────────────────────────────────────────────
export function loadWorkbook(filePath: string): XLSX.WorkBook {
  const buf = fs.readFileSync(filePath)
  return XLSX.read(buf, { type: 'buffer', cellStyles: true })
}

export function saveWorkbook(wb: XLSX.WorkBook, filePath: string): void {
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
  // Write to temp file first, then rename (atomic write to avoid corruption)
  const tmpPath = filePath + '.tmp'
  fs.writeFileSync(tmpPath, buf)
  fs.renameSync(tmpPath, filePath)
}
