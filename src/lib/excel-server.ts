import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { AsetEntry } from './data'

// ─── Config ───────────────────────────────────────────────────────────────────
export function getExcelConfig() {
  const filePath = process.env.EXCEL_FILE_PATH || ''
  const sheetName = process.env.EXCEL_SHEET_NAME || 'DATA ASET TETAP 2023'
  return { filePath, sheetName }
}

// ─── Column patterns (same logic as client parser) ───────────────────────────
const COL_PATTERNS: { field: keyof AsetEntry; patterns: string[] }[] = [
  { field: 'no',         patterns: ['NO'] },
  { field: 'daerah',     patterns: ['DAERAH'] },
  { field: 'penyusutan', patterns: ['AKUMULASI PENYUSUTAN', 'AKUMULASI'] },
  { field: 'tanah',      patterns: ['TANAH'] },
  { field: 'mesin',      patterns: ['PERALATAN DAN MESIN', 'PERALATAN & MESIN', 'PERALATAN'] },
  { field: 'gedung',     patterns: ['GEDUNG DAN BANGUNAN', 'GEDUNG & BANGUNAN', 'GEDUNG'] },
  { field: 'jalan',      patterns: ['JALAN, IRIGASI DAN JARINGAN', 'JALAN, IRIGASI & JARINGAN', 'JALAN'] },
  { field: 'lainnya',    patterns: ['ASET TETAP LAINNYA', 'ASET LAINNYA'] },
  { field: 'kdp',        patterns: ['KONSTRUKSI DALAM PENGERJAAN', 'KONSTRUKSI'] },
]

function norm(s: unknown): string {
  return String(s ?? '').toUpperCase().trim().replace(/\s+/g, ' ')
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return Math.abs(val)
  const s = String(val).replace(/[^0-9.,-]/g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : Math.abs(n)
}

function colLetter(col: number): string {
  let s = ''
  col++
  while (col > 0) {
    col--
    s = String.fromCharCode(65 + (col % 26)) + s
    col = Math.floor(col / 26)
  }
  return s
}

function getCellValue(ws: XLSX.WorkSheet, row: number, col: number): unknown {
  const addr = colLetter(col) + row
  const cell = ws[addr]
  if (!cell) return ''
  return cell.v ?? cell.w ?? ''
}

// ─── Parser ───────────────────────────────────────────────────────────────────
export interface ParseResult {
  entries: AsetEntry[]
  headerRow: number
  colMap: Partial<Record<keyof AsetEntry, number>>
  dataStartRow: number
}

export function parseSheetFull(ws: XLSX.WorkSheet): ParseResult {
  const ref = ws['!ref']
  if (!ref) return { entries: [], headerRow: -1, colMap: {}, dataStartRow: -1 }

  const range = XLSX.utils.decode_range(ref)
  const minR = range.s.r + 1
  const maxR = range.e.r + 1
  const minC = range.s.c
  const maxC = range.e.c

  // Find header row
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
  if (headerRow === -1) return { entries: [], headerRow: -1, colMap: {}, dataStartRow: -1 }

  // Build column map
  const colMap: Partial<Record<keyof AsetEntry, number>> = {}
  const headerTexts = new Map<number, string>()
  for (let c = minC; c <= maxC; c++) {
    const v0 = norm(getCellValue(ws, headerRow - 1, c))
    const v1 = norm(getCellValue(ws, headerRow, c))
    const v2 = norm(getCellValue(ws, headerRow + 1, c))
    headerTexts.set(c, [v0, v1, v2].filter(Boolean).join(' '))
  }
  for (const { field, patterns } of COL_PATTERNS) {
    if (colMap[field] !== undefined) continue
    for (const [c, text] of headerTexts) {
      for (const pat of patterns) {
        if (text.includes(pat)) { colMap[field] = c; break }
      }
      if (colMap[field] !== undefined) break
    }
  }
  if (colMap['daerah'] === undefined) colMap['daerah'] = daerahCol
  if (colMap['no'] === undefined) colMap['no'] = minC

  // Data start row
  let dataStartRow = headerRow + 1
  for (let r = headerRow + 1; r <= headerRow + 5; r++) {
    const v = norm(getCellValue(ws, r, colMap['daerah']!))
    if (/^\d+$/.test(v) || v === '' || v === 'DAERAH') dataStartRow = r + 1
    else break
  }

  // Read entries
  const entries: AsetEntry[] = []
  let idCounter = 1
  for (let r = dataStartRow; r <= maxR; r++) {
    const daerah = String(getCellValue(ws, r, colMap['daerah']!) ?? '').trim()
    if (!daerah) continue
    const dU = daerah.toUpperCase()
    if (dU === 'DAERAH' || dU.includes('JUMLAH') || dU.includes('TOTAL') || /^\d{1,3}$/.test(daerah)) continue

    const g = (f: keyof AsetEntry) => {
      const col = colMap[f]; return col !== undefined ? getCellValue(ws, r, col) : 0
    }
    entries.push({
      id: String(idCounter),
      no: toNumber(g('no')) || idCounter,
      daerah,
      tanah: toNumber(g('tanah')),
      mesin: toNumber(g('mesin')),
      gedung: toNumber(g('gedung')),
      jalan: toNumber(g('jalan')),
      lainnya: toNumber(g('lainnya')),
      kdp: toNumber(g('kdp')),
      penyusutan: toNumber(g('penyusutan')),
    })
    idCounter++
  }

  return { entries, headerRow, colMap, dataStartRow }
}

// ─── Read from disk ───────────────────────────────────────────────────────────
export function readExcelFromDisk(filePath: string, sheetName: string): ParseResult {
  const resolvedPath = path.resolve(filePath)
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File tidak ditemukan: ${resolvedPath}`)
  }
  const buf = fs.readFileSync(resolvedPath)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const ws = wb.Sheets[sheetName]
  if (!ws) {
    const available = wb.SheetNames.join(', ')
    throw new Error(`Sheet "${sheetName}" tidak ditemukan. Sheet yang tersedia: ${available}`)
  }
  return parseSheetFull(ws)
}

// ─── Write new row to Excel ───────────────────────────────────────────────────
export function appendRowToExcel(
  filePath: string,
  sheetName: string,
  entry: Omit<AsetEntry, 'id'>
): { success: boolean; message: string; newNo: number } {
  const resolvedPath = path.resolve(filePath)
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File tidak ditemukan: ${resolvedPath}`)
  }

  const buf = fs.readFileSync(resolvedPath)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const ws = wb.Sheets[sheetName]
  if (!ws) throw new Error(`Sheet "${sheetName}" tidak ditemukan`)

  const { entries, colMap, dataStartRow } = parseSheetFull(ws)

  // Find last data row
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  const maxR = range.e.r + 1

  // Find actual last row with data in daerah column
  let lastDataRow = dataStartRow
  for (let r = dataStartRow; r <= maxR; r++) {
    const v = String(getCellValue(ws, r, colMap['daerah']!) ?? '').trim()
    if (v && !v.toUpperCase().includes('JUMLAH') && !v.toUpperCase().includes('TOTAL')) {
      lastDataRow = r
    }
  }

  const newRow = lastDataRow + 1
  const newNo = (entries[entries.length - 1]?.no || entries.length) + 1

  // Write cells
  const setCell = (col: keyof AsetEntry, value: string | number) => {
    const c = colMap[col]
    if (c === undefined) return
    const addr = colLetter(c) + newRow
    ws[addr] = {
      t: typeof value === 'number' ? 'n' : 's',
      v: value,
      z: typeof value === 'number' ? '#,##0' : undefined,
    }
  }

  setCell('no', newNo)
  setCell('daerah', entry.daerah)
  setCell('tanah', entry.tanah)
  setCell('mesin', entry.mesin)
  setCell('gedung', entry.gedung)
  setCell('jalan', entry.jalan)
  setCell('lainnya', entry.lainnya)
  setCell('kdp', entry.kdp)
  setCell('penyusutan', entry.penyusutan)

  // Also write JUMLAH column if exists (col index 9 = col J typically)
  // Calculate bruto and net
  const bruto = entry.tanah + entry.mesin + entry.gedung + entry.jalan + entry.lainnya + entry.kdp
  const jumlah = bruto - entry.penyusutan
  // Find JUMLAH column — it's usually the last numeric column after AKUMULASI PENYUSUTAN
  const penyCol = colMap['penyusutan']
  if (penyCol !== undefined) {
    const jumlahCol = penyCol + 1
    const jAddr = colLetter(jumlahCol) + newRow
    // Check if it looks like a data column (has a number in the header area)
    const headerVal = getCellValue(ws, range.s.r + 5, jumlahCol)
    if (headerVal !== '' && !isNaN(Number(headerVal))) {
      ws[jAddr] = { t: 'n', v: jumlah, z: '#,##0' }
    } else {
      // Try anyway
      ws[jAddr] = { t: 'n', v: jumlah, z: '#,##0' }
    }
  }

  // Update sheet range
  const newRange = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  if (newRow > newRange.e.r + 1) newRange.e.r = newRow - 1
  ws['!ref'] = XLSX.utils.encode_range(newRange)

  // Write back to disk
  XLSX.writeFile(wb, resolvedPath)

  return { success: true, message: `Baris baru ditambahkan (No. ${newNo}, baris ${newRow})`, newNo }
}

// ─── Update existing row ──────────────────────────────────────────────────────
export function updateRowInExcel(
  filePath: string,
  sheetName: string,
  no: number,
  entry: Omit<AsetEntry, 'id'>
): { success: boolean; message: string } {
  const resolvedPath = path.resolve(filePath)
  const buf = fs.readFileSync(resolvedPath)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const ws = wb.Sheets[sheetName]
  if (!ws) throw new Error(`Sheet "${sheetName}" tidak ditemukan`)

  const { colMap, dataStartRow } = parseSheetFull(ws)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  const maxR = range.e.r + 1

  // Find the row with matching NO
  let targetRow = -1
  const noCol = colMap['no']
  if (noCol === undefined) throw new Error('Kolom NO tidak ditemukan')

  for (let r = dataStartRow; r <= maxR; r++) {
    const rowNo = Number(getCellValue(ws, r, noCol))
    if (rowNo === no) { targetRow = r; break }
  }

  if (targetRow === -1) throw new Error(`Data dengan NO ${no} tidak ditemukan`)

  const setCell = (col: keyof AsetEntry, value: string | number) => {
    const c = colMap[col]
    if (c === undefined) return
    const addr = colLetter(c) + targetRow
    ws[addr] = { t: typeof value === 'number' ? 'n' : 's', v: value, z: typeof value === 'number' ? '#,##0' : undefined }
  }

  setCell('daerah', entry.daerah)
  setCell('tanah', entry.tanah)
  setCell('mesin', entry.mesin)
  setCell('gedung', entry.gedung)
  setCell('jalan', entry.jalan)
  setCell('lainnya', entry.lainnya)
  setCell('kdp', entry.kdp)
  setCell('penyusutan', entry.penyusutan)

  const jumlah = entry.tanah + entry.mesin + entry.gedung + entry.jalan + entry.lainnya + entry.kdp - entry.penyusutan
  const penyCol = colMap['penyusutan']
  if (penyCol !== undefined) {
    const jAddr = colLetter(penyCol + 1) + targetRow
    ws[jAddr] = { t: 'n', v: jumlah, z: '#,##0' }
  }

  XLSX.writeFile(wb, resolvedPath)
  return { success: true, message: `Data NO ${no} berhasil diperbarui` }
}

export function getSheetNames(filePath: string): string[] {
  const resolvedPath = path.resolve(filePath)
  if (!fs.existsSync(resolvedPath)) return []
  const buf = fs.readFileSync(resolvedPath)
  const wb = XLSX.read(buf, { type: 'buffer' })
  return wb.SheetNames
}
