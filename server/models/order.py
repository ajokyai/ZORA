from extensions import db
from datetime import datetime

ORDER_STATUSES = ("pending", "confirmed", "shipped", "delivered", "cancelled")


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # ondelete="SET NULL" + nullable=True means if an item is hard-deleted,
    # the order row survives and item_id becomes NULL instead of crashing.
    item_id = db.Column(
        db.Integer,
        db.ForeignKey("items.id", ondelete="SET NULL"),
        nullable=True,
    )

    quantity = db.Column(db.Integer, nullable=False, default=1)
    price_kes_snapshot = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(30), nullable=False, default="pending")
    shipping_address = db.Column(db.Text)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    customer = db.relationship(
        "User", foreign_keys=[customer_id], back_populates="orders"
    )

    # lazy="select"      — load item only when accessed, not automatically
    # passive_deletes=True — let the DB handle the SET NULL on delete,
    #                        don't let SQLAlchemy try to load the row first
    item = db.relationship(
        "Item",
        back_populates="orders",
        lazy="select",
        passive_deletes=True,
    )

    status_history = db.relationship(
        "OrderStatusHistory",
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderStatusHistory.changed_at",
    )

    def to_dict(self):
        # Safely resolve item fields — item may be None if it was hard-deleted
        item = self.item
        item_name = item.name if item else "[deleted item]"
        item_image = (
            item.images[0].url if item and item.images else None
        )

        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "customer_username": self.customer.username if self.customer else None,
            "item_id": self.item_id,
            "item_name": item_name,
            "item_image": item_image,
            "quantity": self.quantity,
            "price_kes_snapshot": self.price_kes_snapshot,
            "total_kes": round(self.price_kes_snapshot * self.quantity, 2),
            "status": self.status,
            "shipping_address": self.shipping_address,
            "notes": self.notes,
            "status_history": [h.to_dict() for h in self.status_history],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class OrderStatusHistory(db.Model):
    __tablename__ = "order_status_history"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    status = db.Column(db.String(30), nullable=False)
    note = db.Column(db.Text)
    changed_by_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )
    changed_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship("Order", back_populates="status_history")
    changed_by = db.relationship("User", foreign_keys=[changed_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "status": self.status,
            "note": self.note,
            "changed_by": self.changed_by.username if self.changed_by else "system",
            "changed_at": self.changed_at.isoformat(),
        }