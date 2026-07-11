import { jsPDF } from "jspdf";

export const PUNCH_LABELS = {
  ENTRY: "Entrada",
  LUNCH_OUT: "Saída almoço",
  LUNCH_RETURN: "Volta almoço",
  EXIT: "Saída",
};

export function formatDateBR(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function todayISO() {
  const n = new Date();
  const pad = (v) => String(v).padStart(2, "0");
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

export function monthStartISO() {
  const n = new Date();
  const pad = (v) => String(v).padStart(2, "0");
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-01`;
}

export function greeting(name) {
  const h = new Date().getHours();
  const part = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return `${part}, ${name?.split(" ")[0] || ""}!`;
}

async function loadImageDataUrl(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateReceiptPdf({ companyName, employee, record }) {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  doc.setFontSize(14);
  doc.text(companyName || "A1 Ponto", 10, 15);
  doc.setFontSize(10);
  doc.text("Comprovante de Registro de Ponto", 10, 22);
  doc.line(10, 25, 138, 25);
  doc.text(`Funcionário: ${employee.name}`, 10, 32);
  doc.text(`CPF/Matrícula: ${employee.cpf || employee.registrationNumber || "—"}`, 10, 38);
  doc.text(`Tipo: ${PUNCH_LABELS[record.type] || record.type}`, 10, 44);
  doc.text(`Data: ${formatDateBR(record.serverDate)}`, 10, 50);
  doc.text(`Hora: ${record.serverTime?.slice(0, 8)}`, 10, 56);
  doc.text(`Protocolo: ${record.protocol}`, 10, 62);
  doc.text("Registro realizado com horário do servidor.", 10, 72);
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, 10, 78);

  if (record.photoUrl) {
    const img = await loadImageDataUrl(record.photoUrl);
    if (img) doc.addImage(img, "JPEG", 90, 30, 40, 40);
  }

  doc.save(`comprovante-${record.protocol}.pdf`);
}

export async function generateTimesheetPdf(data) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { employee, days, summary, company, schedule } = data;
  doc.setFontSize(14);
  doc.text(company?.company_name || "A1 Ponto", 14, 15);
  doc.setFontSize(11);
  doc.text(`Espelho de Ponto — ${employee.name}`, 14, 22);
  doc.text(`Jornada: ${schedule?.name || "—"}`, 14, 28);

  let y = 36;
  doc.setFontSize(8);
  doc.text("Data", 14, y);
  doc.text("Entrada", 35, y);
  doc.text("S.Almoço", 55, y);
  doc.text("V.Almoço", 75, y);
  doc.text("Saída", 95, y);
  doc.text("Trab.", 115, y);
  doc.text("Extra", 135, y);
  doc.text("Neg.", 155, y);
  doc.text("Obs.", 175, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 5;

  for (const day of days) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(formatDateBR(day.date), 14, y);
    doc.text(day.entry, 35, y);
    doc.text(day.lunchOut, 55, y);
    doc.text(day.lunchReturn, 75, y);
    doc.text(day.exit, 95, y);
    doc.text(day.workedLabel, 115, y);
    doc.text(day.overtimeLabel, 135, y);
    doc.text(day.negativeLabel, 155, y);
    doc.text(day.observation || "", 175, y);
    y += 5;
  }

  y += 8;
  doc.setFontSize(10);
  doc.text(`Total previsto: ${summary.totalExpectedLabel}`, 14, y);
  y += 6;
  doc.text(`Total trabalhado: ${summary.totalWorkedLabel}`, 14, y);
  y += 6;
  doc.text(`Saldo banco de horas: ${summary.balanceLabel}`, 14, y);
  y += 6;
  doc.text(`Atrasos: ${summary.lateDays} | Faltas: ${summary.absentDays} | Incompletos: ${summary.incompleteDays}`, 14, y);
  y += 16;
  doc.line(14, y, 90, y);
  doc.line(110, y, 186, y);
  y += 5;
  doc.text("Assinatura do funcionário", 14, y);
  doc.text("Assinatura da empresa", 110, y);

  doc.save(`espelho-${employee.name.replace(/\s+/g, "-")}.pdf`);
}

export function generateReportPdf(report) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(`Relatório — ${report.type}`, 14, 15);
  doc.setFontSize(10);
  doc.text(`Período: ${formatDateBR(report.startDate)} a ${formatDateBR(report.endDate)}`, 14, 22);
  let y = 32;
  for (const row of report.rows) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    if (row.employee && row.worked !== undefined) {
      doc.text(`${row.employee}: trab. ${row.worked} | saldo ${row.balance}`, 14, y);
      y += 6;
    } else if (row.employee && row.days) {
      doc.text(row.employee, 14, y);
      y += 5;
      for (const d of row.days.slice(0, 5)) {
        doc.text(`  ${formatDateBR(d.date)} — ${d.observation || d.overtimeLabel || ""}`, 18, y);
        y += 5;
      }
      y += 3;
    }
  }
  doc.save(`relatorio-${report.type}.pdf`);
}
