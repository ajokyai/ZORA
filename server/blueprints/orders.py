from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db
import os
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

orders_bp = Blueprint("orders", __name__)

MAIL_USERNAME = os.environ.get("MAIL_USERNAME")
MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://zora.llc")
EXCHANGE_RATE_API_KEY = os.environ.get("EXCHANGE_RATE_API_KEY")

# Support multiple admin emails separated by commas
ADMIN_EMAILS = [
    email.strip()
    for email in os.environ.get("ADMIN_EMAIL", MAIL_USERNAME or "").split(",")
    if email.strip()
]


def get_live_rates():
    """Fetch live KES -> UGX and KES -> SSP rates from ExchangeRate-API."""
    if not EXCHANGE_RATE_API_KEY:
        print("[WARN] EXCHANGE_RATE_API_KEY not set — using fallback rates")
        return {"UGX": 28.5, "SSP": 11.9}  # rough fallback

    try:
        url = f"https://v6.exchangerate-api.com/v6/{EXCHANGE_RATE_API_KEY}/latest/KES"
        response = requests.get(url, timeout=5)
        data = response.json()

        if data.get("result") == "success":
            rates = data["conversion_rates"]
            return {
                "UGX": rates.get("UGX", 28.5),
                "SSP": rates.get("SSP", 11.9),
            }
        else:
            print(f"[WARN] Exchange rate API error: {data.get('error-type')}")
            return {"UGX": 28.5, "SSP": 11.9}
    except Exception as e:
        print(f"[ERROR] Failed to fetch exchange rates: {e}")
        return {"UGX": 28.5, "SSP": 11.9}


def notify_admin_new_order(order):
    """Send all admins an email notification when a new order is placed."""
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        print("[WARN] MAIL_USERNAME or MAIL_PASSWORD not set — skipping admin notification email")
        return

    if not ADMIN_EMAILS:
        print("[WARN] ADMIN_EMAIL not set — skipping admin notification email")
        return

    item_name = order.item.name if order.item else "[deleted item]"
    customer_name = order.customer.display_name or order.customer.username
    customer_email = order.customer.email
    customer_phone = order.customer.phone or "—"
    admin_url = f"{FRONTEND_URL}/dashboard"

    # Total in KES
    total_kes = order.price_kes_snapshot * order.quantity

    # Fetch live rates and convert
    rates = get_live_rates()
    total_ugx = round(total_kes * rates["UGX"], 0)
    total_ssp = round(total_kes * rates["SSP"], 0)

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 40px;">
      <div style="max-width: 520px; margin: auto; background: white; border-radius: 12px; padding: 40px;">
        <h1 style="color: #f5a623; margin-bottom: 4px;">ZORA</h1>
        <h2 style="margin-top: 0;">🛒 New Order #{order.id}</h2>

        <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:20px;">
          <tr><td style="padding:6px 0; color:#888; width:140px;">Customer</td><td><strong>{customer_name}</strong></td></tr>
          <tr><td style="padding:6px 0; color:#888;">Email</td><td>{customer_email}</td></tr>
          <tr><td style="padding:6px 0; color:#888;">Phone</td><td>{customer_phone}</td></tr>
          <tr><td style="padding:6px 0; color:#888;">Item</td><td><strong>{item_name}</strong></td></tr>
          <tr><td style="padding:6px 0; color:#888;">Quantity</td><td>{order.quantity}</td></tr>
          <tr style="background:#fff8e7;">
            <td style="padding:6px 0; color:#888;">Total (KES)</td>
            <td><strong>KES {total_kes:,.0f}</strong></td>
          </tr>
          <tr style="background:#fff8e7;">
            <td style="padding:6px 0; color:#888;">Total (UGX)</td>
            <td><strong>UGX {total_ugx:,.0f}</strong></td>
          </tr>
          <tr style="background:#fff8e7;">
            <td style="padding:6px 0; color:#888;">Total (SSP)</td>
            <td><strong>SSP {total_ssp:,.0f}</strong></td>
          </tr>
          <tr><td style="padding:6px 0; color:#888;">Shipping address</td><td>{order.shipping_address or '—'}</td></tr>
          <tr><td style="padding:6px 0; color:#888;">Notes</td><td>{order.notes or '—'}</td></tr>
          <tr><td style="padding:6px 0; color:#888;">Placed at</td><td>{order.created_at.strftime('%d %b %Y %H:%M UTC')}</td></tr>
        </table>

        <a href="{admin_url}"
           style="display:inline-block; padding: 12px 28px; background: #f5a623;
                  color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
          View in Dashboard
        </a>

        <p style="font-size:12px; color:#bbb; margin-top:24px;">
          You received this because you are an admin at zora.llc
        </p>
      </div>
    </body>
    </html>
    """

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            for admin_email in ADMIN_EMAILS:
                message = MIMEMultipart("alternative")
                message["From"] = MAIL_USERNAME
                message["To"] = admin_email
                message["Subject"] = f"New Order #{order.id} — {item_name} from {customer_name}"
                message.attach(MIMEText(html, "html"))
                server.sendmail(MAIL_USERNAME, admin_email, message.as_string())
                print(f"[INFO] Notification sent to {admin_email} for order #{order.id}")
    except Exception as e:
        print(f"[ERROR] Admin notification email failed: {e}")


@orders_bp.route("/orders", methods=["POST"])
@login_required
def create_order():
    from models.order import Order, OrderStatusHistory
    from models.item import Item

    data = request.get_json(silent=True) or {}

    if not data.get("item_id"):
        return jsonify({"error": "item_id is required"}), 400

    item = Item.query.get_or_404(data["item_id"])

    if not item.is_active:
        return jsonify({"error": "Item is not available"}), 400

    quantity = int(data.get("quantity", 1))

    order = Order(
        customer_id=current_user.id,
        item_id=item.id,
        quantity=quantity,
        price_kes_snapshot=item.price_kes,
        status="pending",
        shipping_address=data.get("shipping_address"),
        notes=data.get("notes"),
    )

    db.session.add(order)
    db.session.flush()

    history = OrderStatusHistory(
        order_id=order.id,
        status="pending",
        note="Order placed",
        changed_by_id=current_user.id,
    )
    db.session.add(history)
    db.session.commit()

    # Notify all admins
    notify_admin_new_order(order)

    return jsonify({
        "message": "Order placed",
        "order": order.to_dict()
    }), 201


@orders_bp.route("/orders", methods=["GET"])
@login_required
def get_orders():
    from models.order import Order
    from models.item import Item

    if current_user.role == "admin":
        orders = Order.query.order_by(Order.created_at.desc()).all()
    elif current_user.role == "seller":
        orders = (
            Order.query.join(Item)
            .filter(Item.seller_id == current_user.id)
            .order_by(Order.created_at.desc())
            .all()
        )
    else:
        orders = (
            Order.query.filter_by(customer_id=current_user.id)
            .order_by(Order.created_at.desc())
            .all()
        )

    return jsonify({"orders": [o.to_dict() for o in orders]}), 200


@orders_bp.route("/orders/<int:order_id>", methods=["GET"])
@login_required
def get_order(order_id):
    from models.order import Order
    from models.item import Item

    order = Order.query.get_or_404(order_id)
    item = Item.query.get(order.item_id)

    if order.customer_id == current_user.id:
        return jsonify({"order": order.to_dict()}), 200
    if current_user.role == "seller" and item and item.seller_id == current_user.id:
        return jsonify({"order": order.to_dict()}), 200
    if current_user.role == "admin":
        return jsonify({"order": order.to_dict()}), 200

    return jsonify({"error": "Not authorized"}), 403


@orders_bp.route("/orders/<int:order_id>/status", methods=["PUT"])
@login_required
def update_status(order_id):
    from models.order import Order, OrderStatusHistory, ORDER_STATUSES
    from models.item import Item

    order = Order.query.get_or_404(order_id)
    item = Item.query.get(order.item_id)

    if current_user.role == "seller" and item and item.seller_id != current_user.id:
        return jsonify({"error": "Not authorized"}), 403
    if current_user.role not in ("seller", "admin"):
        return jsonify({"error": "Not authorized"}), 403

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")

    if new_status not in ORDER_STATUSES:
        return jsonify({
            "error": f"Invalid status. Choose from: {', '.join(ORDER_STATUSES)}"
        }), 400

    order.status = new_status
    history = OrderStatusHistory(
        order_id=order.id,
        status=new_status,
        note=data.get("note"),
        changed_by_id=current_user.id,
    )
    db.session.add(history)
    db.session.commit()

    return jsonify({
        "message": "Status updated",
        "order": order.to_dict()
    }), 200
