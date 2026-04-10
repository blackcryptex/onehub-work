import { isDemoMode } from "@/lib/demo-mode";

interface ReceiptData {
  payoutId: string;
  payoutAmountCents: number;
  vendorName: string;
  vendorEmail?: string;
  eventName: string;
  eventDate: Date;
  platformFeeCents: number;
  processingFeeCents: number;
  netAmountCents: number;
  releaseDate: Date;
  currency: string;
  feeProfile?: {
    platformFeePercent: number;
  };
}

export function generateReceiptHTML(data: ReceiptData): string {
  const demoMode = isDemoMode();
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data.currency || "USD",
    }).format(cents / 100);
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${data.payoutId}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1e293b;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      color: #4f46e5;
    }
    .header p {
      margin: 5px 0;
      color: #64748b;
    }
    .demo-banner {
      background: #fef3c7;
      border: 1px solid #fbbf24;
      padding: 10px;
      text-align: center;
      margin-bottom: 20px;
      border-radius: 4px;
      font-size: 12px;
      color: #92400e;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      font-size: 18px;
      margin-bottom: 15px;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #64748b;
    }
    .info-value {
      font-weight: 500;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      font-size: 16px;
    }
    .amount-row.total {
      border-top: 2px solid #e2e8f0;
      margin-top: 10px;
      padding-top: 15px;
      font-weight: 600;
      font-size: 18px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>OneHub</h1>
    <p>Payment Receipt</p>
  </div>

  ${demoMode ? '<div class="demo-banner"><strong>DEMO DATA</strong> — This is a demo receipt</div>' : ''}

  <div class="section">
    <h2>Payment Details</h2>
    <div class="info-row">
      <span class="info-label">Receipt ID:</span>
      <span class="info-value">${data.payoutId}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Event:</span>
      <span class="info-value">${data.eventName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Event Date:</span>
      <span class="info-value">${new Date(data.eventDate).toLocaleDateString()}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Release Date:</span>
      <span class="info-value">${new Date(data.releaseDate).toLocaleDateString()}</span>
    </div>
  </div>

  <div class="section">
    <h2>Vendor Information</h2>
    <div class="info-row">
      <span class="info-label">Vendor:</span>
      <span class="info-value">${data.vendorName}</span>
    </div>
    ${data.vendorEmail ? `
    <div class="info-row">
      <span class="info-label">Email:</span>
      <span class="info-value">${data.vendorEmail}</span>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <h2>Payment Breakdown</h2>
    <div class="amount-row">
      <span>Gross Payment:</span>
      <span>${formatCurrency(data.payoutAmountCents)}</span>
    </div>
    <div class="amount-row">
      <span>Platform Fee (${data.feeProfile?.platformFeePercent || 5}%):</span>
      <span>-${formatCurrency(data.platformFeeCents)}</span>
    </div>
    <div class="amount-row">
      <span>Processing Fee:</span>
      <span>-${formatCurrency(data.processingFeeCents)}</span>
    </div>
    <div class="amount-row total">
      <span>Net Amount Paid:</span>
      <span>${formatCurrency(data.netAmountCents)}</span>
    </div>
  </div>

  <div class="footer">
    <p>This is an official receipt from OneHub.</p>
    <p>For questions, contact support@onehub.com</p>
    ${demoMode ? '<p><strong>DEMO MODE</strong> — This receipt is for demonstration purposes only.</p>' : ''}
  </div>
</body>
</html>
  `.trim();
}

