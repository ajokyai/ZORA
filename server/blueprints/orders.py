from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db

orders_bp = Blueprint("orders", __name__)


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

    # customer access
    if order.customer_id == current_user.id:
        return jsonify({"order": order.to_dict()}), 200

    # seller access only for own items
    if current_user.role == "seller" and item.seller_id == current_user.id:
        return jsonify({"order": order.to_dict()}), 200

    # admin access
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

    # seller can only update own item orders
    if current_user.role == "seller" and item.seller_id != current_user.id:
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