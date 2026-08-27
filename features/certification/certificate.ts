// Generates and triggers the download of a PDF certificate for a passed
// ASO Certification exam. jsPDF is dynamically imported so its bundle cost
// is only paid on the results screen, not on every dashboard page.

export type CertificateInput = {
  name: string;
  dateLabel: string;
  /** From the certifications record, when available. Falls back to a locally-generated one (e.g. the record write failed) so the download never blocks. */
  certificateId?: string;
};

function generateCertificateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  }
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export async function downloadCertificate({ name, dateLabel, certificateId: providedId }: CertificateInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;
  const displayName = name.trim() || "AppASO Learner";
  const certificateId = providedId ?? generateCertificateId();

  // Background (matches the dashboard's dark theme, #111318)
  doc.setFillColor(17, 19, 24);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Borders
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(1.1);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.2);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Logo mark: three ascending bars (the AppASO mark) + wordmark, centered
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const appWidth = doc.getTextWidth("App");
  const asoWidth = doc.getTextWidth("ASO");
  const barGap = 0.9;
  const barW = 1.8;
  const barsWidth = barW * 3 + barGap * 2;
  const textGap = 4;
  const groupWidth = barsWidth + textGap + appWidth + asoWidth;
  const logoY = 30;
  let bx = centerX - groupWidth / 2;

  doc.setFillColor(165, 180, 252); // indigo-300
  doc.rect(bx, logoY - 4, barW, 4, "F");
  bx += barW + barGap;
  doc.setFillColor(129, 140, 248); // indigo-400
  doc.rect(bx, logoY - 6, barW, 6, "F");
  bx += barW + barGap;
  doc.setFillColor(99, 102, 241); // indigo-500
  doc.rect(bx, logoY - 8, barW, 8, "F");
  bx += barW + textGap;

  doc.setTextColor(255, 255, 255);
  doc.text("App", bx, logoY, { align: "left" });
  doc.setTextColor(129, 140, 248);
  doc.text("ASO", bx + appWidth, logoY, { align: "left" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 165);
  doc.text("A S O   C E R T I F I C A T I O N", centerX, logoY + 8, { align: "center" });

  // Name
  doc.setFont("times", "bolditalic");
  doc.setFontSize(30);
  doc.setTextColor(255, 255, 255);
  doc.text(displayName, centerX, 68, { align: "center" });

  const nameWidth = doc.getTextWidth(displayName);
  doc.setDrawColor(129, 140, 248);
  doc.setLineWidth(0.4);
  doc.line(centerX - Math.max(nameWidth / 2, 60), 76, centerX + Math.max(nameWidth / 2, 60), 76);

  // Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(190, 190, 205);
  const body = doc.splitTextToSize(
    "Is hereby awarded this certificate of achievement for the successful completion of the ASO Certification exam, covering App Store Optimization from basic to advanced.",
    pageWidth - 110
  );
  doc.text(body, centerX, 96, { align: "center" });

  // Footer row: Certificate ID (left), brand (center), Date (right)
  const footerLabelY = pageHeight - 30;
  const footerValueY = pageHeight - 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 165);
  doc.text("CERTIFICATE ID:", 26, footerLabelY, { align: "left" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(210, 210, 220);
  doc.text(certificateId, 26, footerValueY, { align: "left" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  const brandY = (footerLabelY + footerValueY) / 2 + 1;
  const centerAppWidth = doc.getTextWidth("App");
  const brandGroupWidth = centerAppWidth + doc.getTextWidth("ASO.io");
  const brandStartX = centerX - brandGroupWidth / 2;
  doc.text("App", brandStartX, brandY, { align: "left" });
  doc.setTextColor(129, 140, 248);
  doc.text("ASO.io", brandStartX + centerAppWidth, brandY, { align: "left" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 165);
  doc.text("DATE:", pageWidth - 26, footerLabelY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(210, 210, 220);
  doc.text(dateLabel, pageWidth - 26, footerValueY, { align: "right" });

  const fileSafeName = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "certificate";
  doc.save(`appaso-certification-${fileSafeName}.pdf`);
}
