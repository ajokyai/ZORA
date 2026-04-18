from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db

messages_bp = Blueprint("messages", __name__)


@messages_bp.route("/messages/inbox", methods=["GET"])
@login_required
def inbox():
    from models.message import Message
    from sqlalchemy import func

    subquery = db.session.query(
        Message.thread_id,
        func.max(Message.created_at).label("latest")
    ).filter(
        (Message.sender_id == current_user.id) |
        (Message.recipient_id == current_user.id)
    ).group_by(Message.thread_id).subquery()

    threads = db.session.query(Message).join(
        subquery,
        (Message.thread_id == subquery.c.thread_id) &
        (Message.created_at == subquery.c.latest)
    ).order_by(Message.created_at.desc()).all()

    return jsonify({
        "threads": [m.to_dict() for m in threads]
    }), 200


@messages_bp.route("/messages", methods=["POST"])
@login_required
def send_message():
    from models.message import Message
    from models.item import Item

    data = request.get_json(silent=True) or {}

    if not data.get("item_id") or not data.get("body"):
        return jsonify({"error": "item_id and body are required"}), 400

    item = Item.query.get_or_404(data["item_id"])

    recipient_id = item.seller_id

    thread_id = Message.make_thread_id(item.id, current_user.id)

    message = Message(
        thread_id=thread_id,
        item_id=item.id,
        sender_id=current_user.id,
        recipient_id=recipient_id,
        body=data["body"],
        image_url=data.get("image_url"),
    )

    db.session.add(message)
    db.session.commit()

    return jsonify({"message": message.to_dict()}), 201