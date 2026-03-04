import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import os

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465
SMTP_USER = "wecare.woven@gmail.com"
SMTP_PASS = "rkmmgxqufrugdqjq"

def send_test_email(to_address, subject, body, attachment_filename=None):
    msg = MIMEMultipart()
    msg['From'] = SMTP_USER
    msg['To'] = to_address
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    if attachment_filename:
        # Create a dummy attachment file
        with open(attachment_filename, "w") as f:
            f.write("This is a test attachment file for " + to_address)
        
        with open(attachment_filename, "rb") as attachment:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.read())
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f"attachment; filename= {attachment_filename}")
            msg.attach(part)

    try:
        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
            
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        print(f"Successfully sent email to {to_address}")
    except Exception as e:
        print(f"Failed to send email to {to_address}: {e}")

if __name__ == "__main__":
    send_test_email(
        "wecare.woven+testing123@googlemail.com",
        "Test email with attachment to GoogleMail",
        "Hello! This is a test email sent to the GoogleMail alias.",
        "test_googlemail_attachment.txt"
    )

    send_test_email(
        "testing123@mailcroc.qzz.io",
        "Test email with attachment to Domain Alias",
        "Hello! This is a test email sent to the custom domain alias.",
        "test_domain_attachment.txt"
    )
