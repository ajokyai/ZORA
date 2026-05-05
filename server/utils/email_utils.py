import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

GMAIL_USER = os.getenv("MAIL_USERNAME")        # your Gmail address
GMAIL_PASSWORD = os.getenv("MAIL_PASSWORD") # your Gmail App Password
ADMIN_EMAIL = os.getenv("MAIL_USERNAME")       # where notifications go


async def send_order_notification(customer_name: str, items: list[dict]):
    subject = f"🛒 New Order from {customer_name}"

    # Build items list for email body
    items_html = "".join(
        f"<li>{item['name']} — UGX {item['price']:,} x {item['quantity']}</li>"
        for item in items
    )

    body = f"""
    <html>
    <body>
        <h2>New Order Received</h2>
        <p><strong>Customer:</strong> {customer_name}</p>
        <h3>Items Ordered:</h3>
        <ul>
            {items_html}
        </ul>
        <p>Log in to your <a href="https://zora.llc/dashboard">dashboard</a> to view the full order.</p>
    </body>
    </html>
    """

    message = MIMEMultipart("alternative")
    message["From"] = GMAIL_USER
    message["To"] = ADMIN_EMAIL
    message["Subject"] = subject
    message.attach(MIMEText(body, "html"))

    await aiosmtplib.send(
        message,
        hostname="smtp.gmail.com",
        port=465,
        username=GMAIL_USER,
        password=GMAIL_PASSWORD,
        use_tls=True,
    )