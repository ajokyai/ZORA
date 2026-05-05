from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

orders_bp = Blueprint("orders", __name__)

MAIL_USERNAME = os.environ.get("MAIL_USERNAME")
MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", MAIL_USERNAME)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://zora.llc")


def notify_admin_new_order(order):
    """Send admin an email notification when a new order is placed."""
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        print("[WARN] MAIL_USERNAME or MAIL_PASSWORD not set — skipping admin notification email")
        return

    item_name = order.item.name if order.item else "[deleted item]"
    customer_name = order.customer.display_name or order.customer.username
    customer_email = order.customer.email
    customer_phone = order.customer.phone or "—"
    admin_url = f"{FRONTEND_URL}/dashboard"

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
          <tr><td style="padding:6px 0; color:#888;">Total (KES)</td><td><strong>KES {order.total_kes:,.0f}</strong></td></tr>
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
        message = MIMEMultipart("alternative")
        message["From"] = MAIL_USERNAME
        message["To"] = ADMIN_EMAIL
        message["Subject"] = f"New Order #{order.id} — {item_name} from {customer_name}"
        message.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.sendmail(MAIL_USERNAME, ADMIN_EMAIL, message.as_string())

        print(f"[INFO] Admin notification sent for order #{order.id}")
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

    # Notify admin
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
