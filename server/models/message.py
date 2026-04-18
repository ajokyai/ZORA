from extensions import db
from datetime import datetime


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    thread_id = db.Column(db.String(64), nullable=False, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    body = db.Column(db.Text)
    image_url = db.Column(db.String(500))
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    item = db.relationship("Item", back_populates="messages")
    sender = db.relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient = db.relationship("User", foreign_keys=[recipient_id])

    @staticmethod
    def make_thread_id(item_id, customer_id):
        return f"item{item_id}_customer{customer_id}"

    def to_dict(self):
        return {
            "id": self.id,
            "thread_id": self.thread_id,
            "item_id": self.item_id,
            "sender_id": self.sender_id,
            "sender_username": self.sender.username if self.sender else None,
            "sender_display_name": self.sender.display_name if self.sender else None,
            "recipient_id": self.recipient_id,
            "body": self.body,
            "image_url": self.image_url,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
        }