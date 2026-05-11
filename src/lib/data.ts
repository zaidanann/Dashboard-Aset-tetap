export interface AsetEntry {
  id: string
  no: number
  daerah: string
  tanah: number
  mesin: number
  gedung: number
  jalan: number
  lainnya: number
  kdp: number
  penyusutan: number
}

export interface AsetEntryWithTotal extends AsetEntry {
  bruto: number
  jumlah: number
}

export function calcBruto(e: AsetEntry): number {
  return e.tanah + e.mesin + e.gedung + e.jalan + e.lainnya + e.kdp
}

export function calcJumlah(e: AsetEntry): number {
  return calcBruto(e) - e.penyusutan
}

export function withTotals(e: AsetEntry): AsetEntryWithTotal {
  return { ...e, bruto: calcBruto(e), jumlah: calcJumlah(e) }
}

export function formatRupiah(n: number, short = false): string {
  if (!n && n !== 0) return '-'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (short) {
    if (abs >= 1e12) return sign + (abs / 1e12).toFixed(2) + ' T'
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + ' M'
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1) + ' jt'
  }
  return sign + abs.toLocaleString('id-ID')
}

export function formatShort(n: number): string {
  return formatRupiah(n, true)
}

// Sample data matching your Excel screenshot
export const SAMPLE_DATA: AsetEntry[] = [
  { id: '1', no: 1, daerah: 'Pemerintah Provinsi Aceh', tanah: 6991264624559, mesin: 5364666848658, gedung: 8572830860479, jalan: 16458413857347, lainnya: 1064575207314, kdp: 1519189947244, penyusutan: 15743203754420 },
  { id: '2', no: 2, daerah: 'Kab. Aceh Barat', tanah: 1003890829117, mesin: 588651072435, gedung: 998519159616, jalan: 3934125732364, lainnya: 69645631672, kdp: 53593031612, penyusutan: 3178980282847 },
  { id: '3', no: 3, daerah: 'Kab. Aceh Barat Daya', tanah: 259269478220, mesin: 409747127885, gedung: 836509817377, jalan: 1682538770374, lainnya: 41306652340, kdp: 24903606287, penyusutan: 1347624584728 },
  { id: '4', no: 4, daerah: 'Kab. Aceh Besar', tanah: 602872597333, mesin: 578003947567, gedung: 1281967056522, jalan: 1174804785166, lainnya: 60805006252, kdp: 21145452604, penyusutan: 2021389983283 },
  { id: '5', no: 5, daerah: 'Kab. Aceh Jaya', tanah: 288458870319, mesin: 432320403335, gedung: 951871828359, jalan: 1430943825163, lainnya: 36066017540, kdp: 190566627913, penyusutan: 799521275334 },
  { id: '6', no: 6, daerah: 'Kab. Aceh Selatan', tanah: 946413595662, mesin: 671423783415, gedung: 1260962844466, jalan: 1941806085861, lainnya: 54948537655, kdp: 90865617118, penyusutan: 1719242867055 },
  { id: '7', no: 7, daerah: 'Kab. Aceh Singkil', tanah: 131453091146, mesin: 494718791088, gedung: 808667429020, jalan: 1142004231967, lainnya: 9787739657, kdp: 27511851340, penyusutan: 1266549695673 },
  { id: '8', no: 8, daerah: 'Kab. Aceh Tamiang', tanah: 309603542597, mesin: 485938470364, gedung: 644014531013, jalan: 1922557201120, lainnya: 75774383268, kdp: 68185959496, penyusutan: 948664880471 },
  { id: '9', no: 9, daerah: 'Kab. Aceh Tengah', tanah: 315326327680, mesin: 664011394552, gedung: 942039145117, jalan: 2514485732492, lainnya: 51478770424, kdp: 26400120843, penyusutan: 2365308105050 },
  { id: '10', no: 10, daerah: 'Kab. Aceh Tenggara', tanah: 297306378883, mesin: 430956578758, gedung: 997133214143, jalan: 2357287044011, lainnya: 28475633205, kdp: 34467682244, penyusutan: 1019720794489 },
  { id: '11', no: 11, daerah: 'Kab. Aceh Timur', tanah: 840851866163, mesin: 655871037566, gedung: 1389177644850, jalan: 2299594382496, lainnya: 52758052742, kdp: 149431643022, penyusutan: 2083700373837 },
  { id: '12', no: 12, daerah: 'Kab. Aceh Utara', tanah: 1660266327182, mesin: 930792042437, gedung: 1866589902549, jalan: 3014358083741, lainnya: 49683379047, kdp: 27206991330, penyusutan: 2532782572926 },
  { id: '13', no: 13, daerah: 'Kab. Bener Meriah', tanah: 410922162334, mesin: 473073496624, gedung: 816269361363, jalan: 1787287105859, lainnya: 40947233549, kdp: 7040267914, penyusutan: 1411992889716 },
  { id: '14', no: 14, daerah: 'Kab. Bireuen', tanah: 546030628319, mesin: 598083884394, gedung: 1020377230298, jalan: 2001736352759, lainnya: 45808391683, kdp: 59256745184, penyusutan: 1662541436556 },
  { id: '15', no: 15, daerah: 'Kab. Gayo Lues', tanah: 306593334378, mesin: 395856086471, gedung: 907014097255, jalan: 1774492787161, lainnya: 12161749619, kdp: 4431361394, penyusutan: 1104971083911 },
  { id: '16', no: 16, daerah: 'Kab. Nagan Raya', tanah: 267785295725, mesin: 471001396379, gedung: 1071673261667, jalan: 1511534709730, lainnya: 50952759239, kdp: 170271027628, penyusutan: 1383159629181 },
  { id: '17', no: 17, daerah: 'Kab. Pidie', tanah: 868159051120, mesin: 774321903159, gedung: 1564871398699, jalan: 1832543935108, lainnya: 73723020076, kdp: 188911617404, penyusutan: 1738613519659 },
  { id: '18', no: 18, daerah: 'Kab. Pidie Jaya', tanah: 149411137996, mesin: 409491621297, gedung: 821061637391, jalan: 1598814727830, lainnya: 42446459643, kdp: 3654371782, penyusutan: 1364136671640 },
  { id: '19', no: 19, daerah: 'Kab. Simeulue', tanah: 101894412024, mesin: 437205805017, gedung: 726663482583, jalan: 1001342537586, lainnya: 15441913102, kdp: 129236534968, penyusutan: 1053612346115 },
  { id: '20', no: 20, daerah: 'Kota Banda Aceh', tanah: 3216899009216, mesin: 648946361628, gedung: 1369676061764, jalan: 1708185203831, lainnya: 19611151505, kdp: 42032348766, penyusutan: 2306387168876 },
  { id: '21', no: 21, daerah: 'Kota Langsa', tanah: 466908138511, mesin: 562193024147, gedung: 760198340114, jalan: 1173168762480, lainnya: 44672451076, kdp: 8023998355, penyusutan: 1311525860937 },
  { id: '22', no: 22, daerah: 'Kota Lhokseumawe', tanah: 773365479039, mesin: 335705052210, gedung: 732100853803, jalan: 1230910841509, lainnya: 16468602833, kdp: 11876358050, penyusutan: 1088983491094 },
  { id: '23', no: 23, daerah: 'Kota Sabang', tanah: 307010213134, mesin: 407100290968, gedung: 689447906728, jalan: 1534894336487, lainnya: 17371643754, kdp: 183034406519, penyusutan: 1399399205149 },
  { id: '24', no: 24, daerah: 'Kota Subulussalam', tanah: 102141119070, mesin: 313185513226, gedung: 631006775883, jalan: 1198505783831, lainnya: 37740390337, kdp: 29145260903, penyusutan: 866654635778 },
  { id: '25', no: 25, daerah: 'Prov. Sumatera Utara', tanah: 5623599018273, mesin: 3817958565687, gedung: 6138417667302, jalan: 11490417274295, lainnya: 1010987785761, kdp: 1997204034258, penyusutan: 12944711018643 },
  { id: '26', no: 26, daerah: 'Kab. Asahan', tanah: 856618954651, mesin: 603721592241, gedung: 1202618309173, jalan: 2290878304234, lainnya: 165133586395, kdp: 35402547283, penyusutan: 1431524773963 },
  { id: '27', no: 27, daerah: 'Kab. Batu Bara', tanah: 221872667254, mesin: 538621319450, gedung: 643941559423, jalan: 1577823616017, lainnya: 40473043596, kdp: 13073070999, penyusutan: 1356469433268 },
  { id: '28', no: 28, daerah: 'Kab. Dairi', tanah: 393166988572, mesin: 502302935061, gedung: 798362408301, jalan: 1837671650168, lainnya: 112527483141, kdp: 4588300394, penyusutan: 1858430027646 },
  { id: '29', no: 29, daerah: 'Kab. Deli Serdang', tanah: 3008621761495, mesin: 992242417724, gedung: 1905886031462, jalan: 6324781312761, lainnya: 107530429651, kdp: 17790311101, penyusutan: 3394097258500 },
  { id: '30', no: 30, daerah: 'Kab. Humbang Hasundutan', tanah: 299051528847, mesin: 470495340293, gedung: 555771172375, jalan: 1551382976803, lainnya: 87055802748, kdp: 70055802748, penyusutan: 999354304348 },
  { id: '31', no: 31, daerah: 'Kab. Karo', tanah: 652406470032, mesin: 545502752955, gedung: 812353713806, jalan: 2107373137584, lainnya: 103205411843, kdp: 15160329550, penyusutan: 1907571437985 },
]
