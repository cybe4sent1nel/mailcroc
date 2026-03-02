import type { EmailMessage, Attachment } from '@/types/mail';

export const exportToJSON = (messages: EmailMessage[], address: string) => {
    const dataStr = JSON.stringify(messages, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inbox_export_${address}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToMarkdown = (messages: EmailMessage[], address: string) => {
    let mdContent = `# Inbox Export - ${new Date().toLocaleString()}\n\n`;
    mdContent += `Address: ${address}\n`;
    mdContent += `Total Messages: ${messages.length}\n\n`;
    mdContent += `---\n\n`;

    messages.forEach((msg, index) => {
        mdContent += `## ${index + 1}. ${msg.subject || '(No Subject)'}\n`;
        mdContent += `**From:** ${msg.from}\n`;
        mdContent += `**Date:** ${new Date(msg.receivedAt).toLocaleString()}\n`;
        mdContent += `**Folder:** ${msg.folder}\n\n`;
        mdContent += `${msg.text || '(No Content)'}\n\n`;
        if (msg.attachments && msg.attachments.length > 0) {
            mdContent += `**Attachments:** ${msg.attachments.length} file(s)\n\n`;
        }
        mdContent += `---\n\n`;
    });

    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inbox_export_${address}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportInboxToPDF = async (messages: EmailMessage[], emailAddress: string) => {
    const jsPDF = (await import('jspdf')).default;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setFontSize(22);
    pdf.setTextColor(40, 167, 69); // MailCroc Green
    pdf.text('MailCroc Inbox Export', 10, 20);

    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(`Address: ${emailAddress}`, 10, 28);
    pdf.text(`Date: ${new Date().toLocaleString()}`, 10, 33);
    pdf.text(`Total Messages: ${messages.length}`, 10, 38);
    pdf.line(10, 42, pageWidth - 10, 42);

    let yPos = 50;
    messages.forEach((msg, index) => {
        const attachmentsCount = msg.attachments?.length || 0;

        if (yPos > pageHeight - 40) {
            pdf.addPage();
            yPos = 20;
        }

        pdf.setFontSize(12);
        pdf.setTextColor(0);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${msg.subject || '(No Subject)'}`, 10, yPos);

        yPos += 5;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(80);
        pdf.text(`From: ${msg.from} | Received: ${new Date(msg.receivedAt).toLocaleString()}`, 10, yPos);

        if (attachmentsCount > 0) {
            yPos += 4;
            pdf.setTextColor(40, 167, 69);
            pdf.text(`📎 Attachments: ${attachmentsCount} file(s)`, 10, yPos);
            pdf.setTextColor(80);
        }

        yPos += 7;
        pdf.setFontSize(10);
        pdf.setTextColor(50);

        const fullText = msg.text || '(No Content)';
        const splitText = pdf.splitTextToSize(fullText, pageWidth - 20);

        for (let i = 0; i < splitText.length; i++) {
            if (yPos > pageHeight - 20) {
                pdf.addPage();
                yPos = 20;
            }
            pdf.text(splitText[i], 10, yPos);
            yPos += 5;
        }

        yPos += 10;
        pdf.setDrawColor(240);
        pdf.line(10, yPos - 5, pageWidth - 10, yPos - 5);
        yPos += 5;
    });

    pdf.save(`inbox_export_${emailAddress}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportSingleEmailToPDF = async (elementId: string, subject: string) => {
    const element = document.getElementById(elementId);
    if (!element) throw new Error("Element not found");

    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${subject.replace(/[^a-z0-9]/gi, '_').slice(0, 30) || 'email'}.pdf`);
};
