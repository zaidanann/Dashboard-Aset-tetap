import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { AsetEntry } from '../data'

// ─── helpers ────────────────────────────────────────────────

function getConfig() {
  const filePath = process.env.EXCEL_FILE_PATH || ''
  const sheetName = process.env.EXCEL_SHEET_NAME || 'DATA ASET TETAP 2023'
  return { filePath, sheetName }
}

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

// Column detection patterns
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

// ─── detect column layout from a sheet ──────────────────────

interface SheetLayout {
  headerRow: number
  dataStartRow: number
  colMap: Partial<Record<keyof AsetEntry, number>>
  maxCol: number
}

function detectLayout(ws: XLSX.WorkSheet, range: XLSX.Range): SheetLayout | null {
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
        headerRow = r
        daerahCol = c
        break
      }
    }
    if (headerRow !== -1) break
  }
  if (headerRow === -1) return null

  // Map columns
  const headerTexts = new Map<number, string>()
  for (let c = minC; c <= maxC; c++) {
    const v0 = norm(getCellValue(ws, headerRow - 1, c))
    const v1 = norm(getCellValue(ws, headerRow, c))
    const v2 = norm(getCellValue(ws, headerRow + 1, c))
    headerTexts.set(c, [v0, v1, v2].filter(Boolean).join(' '))
  }

  const colMap: Partial<Record<keyof AsetEntry, number>> = {}
  for (const { field, patterns } of COL_PATTERNS) {
    for (const [c, text] of headerTexts) {
      if (patterns.some(p => text.includes(p))) {
        colMap[field] = c
        break
      }
    }
  }
  if (colMap['daerah'] === undefined) colMap['daerah'] = daerahCol
  if (colMap['no'] === undefined) colMap['no'] = minC

  // Find data start row
  let dataStartRow = headerRow + 1
  for (let r = headerRow + 1; r <= headerRow + 5; r++) {
    const v = norm(getCellValue(ws, r, colMap['daerah']!))
    if (/^\d+$/.test(v) || v === '' || v === 'DAERAH') {
      dataStartRow = r + 1
    } else break
  }

  return { headerRow, dataStartRow, colMap, maxCol: maxC }
}

// ─── READ ────────────────────────────────────────────────────

export interface ReadResult {
  entries: AsetEntry[]
  filePath: string
  sheetName: string
  error?: string
}

export function readExcelData(): ReadResult {
  const { filePath, sheetName } = getConfig()

  if (!filePath) {
    return {
      entries: [],
      filePath,
      sheetName,
      error: 'EXCEL_FILE_PATH belum dikonfigurasi di .env.local',
    }
  }

  const resolved = path.resolve(filePath)

  if (!fs.existsSync(resolved)) {
    return {
      entries: [],
      filePath: resolved,
      sheetName,
      error: `File tidak ditemukan: ${resolved}`,
    }
  }

  try {
    const wb = XLSX.readFile(resolved)
    const ws = wb.Sheets[sheetName]

    if (!ws) {
      const available = wb.SheetNames.join(', ')
      return {
        entries: [],
        filePath: resolved,
        sheetName,
        error: `Sheet "${sheetName}" tidak ditemukan. Sheet yang tersedia: ${available}`,
      }
    }

    const ref = ws['!ref']
    if (!ref) return { entries: [], filePath: resolved, sheetName, error: 'Sheet kosong' }

    const range = XLSX.utils.decode_range(ref)
    const layout = detectLayout(ws, range)
    if (!layout) {
      return { entries: [], filePath: resolved, sheetName, error: 'Tidak bisa mendeteksi header kolom DAERAH di sheet ini' }
    }

    const { dataStartRow, colMap } = layout
    const maxR = range.e.r + 1
    const entries: AsetEntry[] = []
    let idCounter = 1

    for (let r = dataStartRow; r <= maxR; r++) {
      const daerah = String(getCellValue(ws, r, colMap['daerah']!) ?? '').trim()
      if (!daerah) continue
      const dUpper = daerah.toUpperCase()
      if (['DAERAH', 'JUMLAH', 'TOTAL', 'DATA ASET'].some(x => dUpper.includes(x))) continue
      if (/^\d{1,3}$/.test(daerah)) continue

      const get = (field: keyof AsetEntry) => {
        const col = colMap[field]
        return col !== undefined ? getCellValue(ws, r, col) : 0
      }

      entries.push({
        id: String(idCounter),
        no: toNumber(get('no')) || idCounter,
        daerah,
        tanah: toNumber(get('tanah')),
        mesin: toNumber(get('mesin')),
        gedung: toNumber(get('gedung')),
        jalan: toNumber(get('jalan')),
        lainnya: toNumber(get('lainnya')),
        kdp: toNumber(get('kdp')),
        penyusutan: toNumber(get('penyusutan')),
      })
      idCounter++
    }

    return { entries, filePath: resolved, sheetName }
  } catch (e) {
    return {
      entries: [],
      filePath: resolved,
      sheetName,
      error: `Error membaca file: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

// ─── WRITE (append a new row) ────────────────────────────────

export interface WriteInput {
  daerah: string
  tanah: number
  mesin: number
  gedung: number
  jalan: number
  lainnya: number
  kdp: number
  penyusutan: number
}

export interface WriteResult {
  success: boolean
  error?: string
  rowNumber?: number
}

export function appendExcelRow(input: WriteInput): WriteResult {
  const { filePath, sheetName } = getConfig()
  if (!filePath) return { success: false, error: 'EXCEL_FILE_PATH belum dikonfigurasi' }

  const resolved = path.resolve(filePath)
  if (!fs.existsSync(resolved)) {
    return { success: false, error: `File tidak ditemukan: ${resolved}` }
  }

  try {
    // Make a backup before writing
    const backupPath = resolved.replace(/\.xlsx?$/, '_backup_' + Date.now() + '.xlsx')
    fs.copyFileSync(resolved, backupPath)

    const wb = XLSX.readFile(resolved)
    const ws = wb.Sheets[sheetName]
    if (!ws) return { success: false, error: `Sheet "${sheetName}" tidak ditemukan` }

    const ref = ws['!ref']
    if (!ref) return { success: false, error: 'Sheet kosong' }

    const range = XLSX.utils.decode_range(ref)
    const layout = detectLayout(ws, range)
    if (!layout) return { success: false, error: 'Tidak bisa mendeteksi layout kolom' }

    const { dataStartRow, colMap } = layout
    const maxR = range.e.r + 1

    // Find the last data row
    let lastDataRow = dataStartRow
    for (let r = dataStartRow; r <= maxR; r++) {
      const v = String(getCellValue(ws, r, colMap['daerah']!) ?? '').trim()
      if (v && !/^\d{1,3}$/.test(v) &&
          !['JUMLAH', 'TOTAL', 'DATA ASET', 'DAERAH'].some(x => v.toUpperCase().includes(x))) {
        lastDataRow = r
      }
    }

    const newRow = lastDataRow + 1

    // Calculate next NO
    const lastNo = toNumber(getCellValue(ws, lastDataRow, colMap['no']!))
    const nextNo = lastNo > 0 ? lastNo + 1 : lastDataRow - dataStartRow + 2

    // Calculate jumlah
    const bruto = input.tanah + input.mesin + input.gedung + input.jalan + input.lainnya + input.kdp
    const jumlah = bruto - input.penyusutan

    // Write cells
    function setCell(col: number | undefined, value: number | string) {
      if (col === undefined) return
      const addr = colLetter(col) + newRow
      ws[addr] = typeof value === 'number'
        ? { v: value, t: 'n', z: '#,##0.00' }
        : { v: value, t: 's' }
    }

    setCell(colMap['no'], nextNo)
    setCell(colMap['daerah'], input.daerah)
    setCell(colMap['tanah'], input.tanah)
    setCell(colMap['mesin'], input.mesin)
    setCell(colMap['gedung'], input.gedung)
    setCell(colMap['jalan'], input.jalan)
    setCell(colMap['lainnya'], input.lainnya)
    setCell(colMap['kdp'], input.kdp)
    setCell(colMap['penyusutan'], input.penyusutan)

    // Also write JUMLAH column if it exists
    // Find jumlah col: typically after penyusutan
    const jumlahCol = layout.maxCol
    if (colMap['penyusutan'] !== undefined && jumlahCol > colMap['penyusutan']!) {
      const jAddr = colLetter(jumlahCol) + newRow
      ws[jAddr] = { v: jumlah, t: 'n', z: '#,##0.00' }
    }

    // Expand sheet range
    const newRange = {
      s: range.s,
      e: { r: newRow - 1, c: Math.max(range.e.c, layout.maxCol) }
    }
    ws['!ref'] = XLSX.utils.encode_range(newRange)

    // Save
    XLSX.writeFile(wb, resolved)

    // Clean up backup (only keep if write succeeded)
    try { fs.unlinkSync(backupPath) } catch {}

    return { success: true, rowNumber: newRow }
  } catch (e) {
    return {
      success: false,
      error: `Gagal menulis ke Excel: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

// ─── UPDATE existing row ─────────────────────────────────────

export interface UpdateInput extends WriteInput {
  rowNo: number // the NO column value to identify the row
}

export function updateExcelRow(input: UpdateInput): WriteResult {
  const { filePath, sheetName } = getConfig()
  if (!filePath) return { success: false, error: 'EXCEL_FILE_PATH belum dikonfigurasi' }

  const resolved = path.resolve(filePath)
  if (!fs.existsSync(resolved)) return { success: false, error: `File tidak ditemukan: ${resolved}` }

  try {
    const backupPath = resolved.replace(/\.xlsx?$/, '_backup_' + Date.now() + '.xlsx')
    fs.copyFileSync(resolved, backupPath)

    const wb = XLSX.readFile(resolved)
    const ws = wb.Sheets[sheetName]
    if (!ws) return { success: false, error: `Sheet "${sheetName}" tidak ditemukan` }

    const ref = ws['!ref']
    if (!ref) return { success: false, error: 'Sheet kosong' }

    const range = XLSX.utils.decode_range(ref)
    const layout = detectLayout(ws, range)
    if (!layout) return { success: false, error: 'Tidak bisa mendeteksi layout' }

    const { dataStartRow, colMap } = layout
    const maxR = range.e.r + 1

    // Find the target row by NO value
    let targetRow = -1
    for (let r = dataStartRow; r <= maxR; r++) {
      const noVal = toNumber(getCellValue(ws, r, colMap['no']!))
      if (noVal === input.rowNo) { targetRow = r; break }
    }

    if (targetRow === -1) return { success: false, error: `Baris dengan NO=${input.rowNo} tidak ditemukan` }

    function setCell(col: number | undefined, value: number | string) {
      if (col === undefined) return
      const addr = colLetter(col) + targetRow
      ws[addr] = typeof value === 'number'
        ? { v: value, t: 'n', z: '#,##0.00' }
        : { v: value, t: 's' }
    }

    setCell(colMap['daerah'], input.daerah)
    setCell(colMap['tanah'], input.tanah)
    setCell(colMap['mesin'], input.mesin)
    setCell(colMap['gedung'], input.gedung)
    setCell(colMap['jalan'], input.jalan)
    setCell(colMap['lainnya'], input.lainnya)
    setCell(colMap['kdp'], input.kdp)
    setCell(colMap['penyusutan'], input.penyusutan)

    XLSX.writeFile(wb, resolved)
    try { fs.unlinkSync(backupPath) } catch {}

    return { success: true, rowNumber: targetRow }
  } catch (e) {
    return { success: false, error: `Gagal update: ${e instanceof Error ? e.message : String(e)}` }
  }
}
