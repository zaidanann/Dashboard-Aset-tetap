import * as XLSX from 'xlsx'
import { AsetEntry } from './data'

// Keywords to match each column — order matters, first match wins
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

/**
 * Robust parser: scans raw cells, auto-detects header row (the row that
 * contains "DAERAH"), then maps columns by keyword matching.
 * Handles merged cells, extra header rows, and any row offset.
 */
function parseSheet(ws: XLSX.WorkSheet): AsetEntry[] {
  const ref = ws['!ref']
  if (!ref) return []

  const range = XLSX.utils.decode_range(ref)
  const minR = range.s.r + 1  // 1-based
  const maxR = range.e.r + 1
  const minC = range.s.c
  const maxC = range.e.c

  // --- Step 1: find the header row (contains "DAERAH" or "NO") ---
  let headerRow = -1
  let daerahCol = -1

  for (let r = minR; r <= Math.min(minR + 20, maxR); r++) {
    for (let c = minC; c <= maxC; c++) {
      const v = norm(getCellValue(ws, r, c))
      if (v === 'DAERAH') {
        headerRow = r
        daerahCol = c
        break
      }
    }
    if (headerRow !== -1) break
  }

  if (headerRow === -1 || daerahCol === -1) return []

  // --- Step 2: build column index mapping ---
  // Collect all header values across the header row (and possibly one row above for merged)
  const colMap: Partial<Record<keyof AsetEntry, number>> = {}

  // Read text from header row and row above (merged cells propagate value to top-left only)
  const headerTexts: Map<number, string> = new Map()
  for (let c = minC; c <= maxC; c++) {
    const v1 = norm(getCellValue(ws, headerRow, c))
    const v2 = norm(getCellValue(ws, headerRow + 1, c))
    // Also check one row above in case header is split
    const v0 = norm(getCellValue(ws, headerRow - 1, c))
    const combined = [v0, v1, v2].filter(Boolean).join(' ')
    headerTexts.set(c, combined || v1 || v2)
  }

  for (const { field, patterns } of COL_PATTERNS) {
    if (colMap[field] !== undefined) continue
    for (const [c, text] of headerTexts) {
      for (const pat of patterns) {
        if (text.includes(pat)) {
          colMap[field] = c
          break
        }
      }
      if (colMap[field] !== undefined) break
    }
  }

  // Fallback: if daerah col not found via pattern, use the one we found by scanning
  if (colMap['daerah'] === undefined) colMap['daerah'] = daerahCol

  // --- Step 3: find "NO" column if not yet mapped (could be col A) ---
  if (colMap['no'] === undefined) {
    for (let c = minC; c <= minC + 3; c++) {
      const v = norm(getCellValue(ws, headerRow, c))
      if (v === 'NO' || v === 'NO.' || v.startsWith('NO')) {
        colMap['no'] = c
        break
      }
    }
    if (colMap['no'] === undefined) colMap['no'] = minC
  }

  // Determine data start row (skip any sub-header rows like "1 2 3 4...")
  let dataStartRow = headerRow + 1
  // Skip rows where daerah col has numeric/header-like content
  for (let r = headerRow + 1; r <= headerRow + 5; r++) {
    const v = norm(getCellValue(ws, r, colMap['daerah']!))
    // If it looks like a sub-header (all digits, or column numbers), skip
    if (/^\d+$/.test(v) || v === '' || v === 'DAERAH') {
      dataStartRow = r + 1
    } else {
      break
    }
  }

  // --- Step 4: read data rows ---
  const entries: AsetEntry[] = []
  let idCounter = 1

  for (let r = dataStartRow; r <= maxR; r++) {
    const daerah = String(getCellValue(ws, r, colMap['daerah']!) ?? '').trim()
    if (!daerah) continue
    const dUpper = daerah.toUpperCase()
    if (dUpper === 'DAERAH') continue
    if (dUpper.includes('JUMLAH') || dUpper.includes('TOTAL') || dUpper.includes('DATA ASET')) continue
    // Skip rows where "DAERAH" column contains numeric values (likely wrong row)
    if (/^\d{1,3}$/.test(daerah)) continue

    const get = (field: keyof AsetEntry) => {
      const col = colMap[field]
      if (col === undefined) return 0
      return getCellValue(ws, r, col)
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

  return entries
}

export function getAvailableSheets(buffer: ArrayBuffer): string[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  return wb.SheetNames
}

export function parseExcelFile(buffer: ArrayBuffer): AsetEntry[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  let sheetName = wb.SheetNames[0]
  for (const name of wb.SheetNames) {
    const u = name.toUpperCase()
    if (u.includes('ASET TETAP 2023') || u.includes('DATA ASET TETAP 2023')) {
      sheetName = name; break
    }
  }
  return parseSheet(wb.Sheets[sheetName])
}

export function parseExcelSheet(buffer: ArrayBuffer, sheetName: string): AsetEntry[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  return parseSheet(ws)
}
