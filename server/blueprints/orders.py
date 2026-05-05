from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db
import os
import requests

orders_bp = Blueprint("orders", __name__)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://zora.llc")
EXCHANGE_RATE_API_KEY = os.environ.get("EXCHANGE_RATE_API_KEY")

# Support multiple WhatsApp numbers separated by commas
# e.g. CALLMEBOT_PHONES = +211912345678,+256712345678,+254712345678
CALLMEBOT_PHONES = [
    phone.strip()
    for phone in os.environ.get("CALLMEBOT_PHONES", "").split(",")
    if phone.strip()
]

# Support multiple API keys separated by commas (one per phone number)
CALLMEBOT_APIKEYS = [
    key.strip()
    for key in os.environ.get("CALLMEBOT_APIKEYS", "").split(",")
    if key.strip()
]


def get_live_rates():
    """Fetch live KES -> UGX and KES -> SSP rates from ExchangeRate-API."""
    if not EXCHANGE_RATE_API_KEY:
        return {"UGX": 28.5, "SSP": 11.9}
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
    except Exception as e:
        print(f"[ERROR] Failed to fetch exchange rates: {e}")
    return {"UGX": 28.5, "SSP": 11.9}


def send_whatsapp_notifications(message):
    """Send WhatsApp message to all admin numbers via CallMeBot."""
    if not CALLMEBOT_PHONES or not CALLMEBOT_APIKEYS:
        print("[WARN] CALLMEBOT_PHONES or CALLMEBOT_APIKEYS not set — skipping WhatsApp notification")
        return

    for i, phone in enumerate(CALLMEBOT_PHONES):
        # Use matching API key, or fall back to first key if only one provided
        apikey = CALLMEBOT_APIKEYS[i] if i < len(CALLMEBOT_APIKEYS) else CALLMEBOT_APIKEYS[0]
        try:
            url = "https://api.callmebot.com/whatsapp.php"
            params = {
                "phone": phone,
                "text": message,
                "apikey": apikey,
            }
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                print(f"[INFO] WhatsApp notification sent to {phone}")
            else:
                print(f"[WARN] WhatsApp notification failed for {phone}: {response.text}")
        except Exception as e:
            print(f"[ERROR] WhatsApp notification failed for {phone}: {e}")


def notify_admin_new_order(order):
    """Notify all admins via WhatsApp when a new order is placed."""
    item_name = order.item.name if order.item else "[deleted item]"
    customer_name = order.customer.display_name or order.customer.username
    customer_phone = order.customer.phone or "—"

    # Total in KES
    total_kes = order.price_kes_snapshot * order.quantity

    # Fetch live rates
    rates = get_live_rates()
    total_ugx = round(total_kes * rates["UGX"], 0)
    total_ssp = round(total_kes * rates["SSP"], 0)

    message = (
        f"🛒 *New ZORA Order #{order.id}*\n\n"
        f"👤 Customer: {customer_name}\n"
        f"📞 Phone: {customer_phone}\n"
        f"📦 Item: {item_name}\n"
        f"🔢 Quantity: {order.quantity}\n"
        f"💰 Total: KES {total_kes:,.0f} | UGX {total_ugx:,.0f} | SSP {total_ssp:,.0f}\n"
        f"📍 Address: {order.shipping_address or '—'}\n"
        f"📝 Notes: {order.notes or '—'}\n\n"
        f"👉 {FRONTEND_URL}/dashboard"
    )

    send_whatsapp_notifications(message)


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

    # Notify all admins via WhatsApp
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
