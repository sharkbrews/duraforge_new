import nodemailer from "nodemailer";

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !user || !password) return null;

  const port = Number(process.env.SMTP_PORT ?? "587");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });
}

export async function sendTransactionalEmail(message: EmailMessage): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("Transactional email skipped: SMTP is not configured.", {
      to: message.to,
      subject: message.subject,
    });
    return;
  }

  const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER;
  if (!from) throw new Error("EMAIL_FROM or SMTP_USER must be configured.");

  await transporter.sendMail({ from, ...message });
}

export async function sendOrderRequestNotifications(input: {
  orderNumber: string;
  customerEmail: string;
  companyName: string;
  requestedValue: number;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const message = `Trade order request ${input.orderNumber}

Company: ${input.companyName}
Customer: ${input.customerEmail}
Requested value: £${input.requestedValue.toFixed(2)}

No payment has been taken. Review the request and confirm availability and trade terms.`;

  await sendTransactionalEmail({
    to: input.customerEmail,
    subject: `Duraforge trade order request ${input.orderNumber}`,
    text: message,
  });

  if (adminEmail) {
    await sendTransactionalEmail({
      to: adminEmail,
      subject: `New trade order request ${input.orderNumber}`,
      text: message,
    });
  } else {
    console.warn("Admin order notification skipped: ADMIN_EMAIL is not configured.");
  }
}

export async function sendEnquiryNotification(input: {
  name: string;
  email: string;
  companyName?: string;
  message: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn("Admin enquiry notification skipped: ADMIN_EMAIL is not configured.");
    return;
  }

  await sendTransactionalEmail({
    to: adminEmail,
    subject: `New website enquiry from ${input.name}`,
    text: `New website enquiry

Name: ${input.name}
Company: ${input.companyName || "Not provided"}
Email: ${input.email}

${input.message}`,
  });
}

export async function sendOemEnquiryNotification(input: {
  customerEmail: string;
  companyName: string;
  phone: string;
  note?: string;
  items: Array<{
    brand: string;
    machineName: string;
    application: string;
    oemPartNumber: string;
    quantity: number;
  }>;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn("Admin OEM enquiry notification skipped: ADMIN_EMAIL is not configured.");
    return;
  }

  const itemLines = input.items
    .map(
      (item) =>
        `- ${item.quantity} × ${item.brand} ${item.machineName} / ${item.application} / ${item.oemPartNumber}`,
    )
    .join("\n");

  await sendTransactionalEmail({
    to: adminEmail,
    subject: `New OEM enquiry from ${input.companyName}`,
    text: `New OEM knowledge-base enquiry

Company: ${input.companyName}
Email: ${input.customerEmail}
Phone: ${input.phone}

Requested parts:
${itemLines}

Customer note:
${input.note || "No additional note provided."}`,
  });
}
