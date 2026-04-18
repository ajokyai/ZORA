from extensions import db, bcrypt
from flask_login import UserMixin
from datetime import datetime

ROLES = ("customer", "seller", "admin")


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    username = db.Column(db.String(100), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="customer")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    display_name = db.Column(db.String(150))
    bio = db.Column(db.Text)
    phone = db.Column(db.String(30))
    avatar_url = db.Column(db.String(500))
    country_id = db.Column(db.Integer, db.ForeignKey("countries.id"), nullable=True)
    country = db.relationship("Country", back_populates="users")
    items = db.relationship("Item", back_populates="seller", lazy="dynamic")
    sent_messages = db.relationship("Message", foreign_keys="Message.sender_id", back_populates="sender", lazy="dynamic")
    orders = db.relationship("Order", foreign_keys="Order.customer_id", back_populates="customer", lazy="dynamic")

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self, include_private=False):
        data = {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "display_name": self.display_name,
            "bio": self.bio,
            "phone": self.phone,
            "avatar_url": self.avatar_url,
            "country": self.country.to_dict() if self.country else None,
            "created_at": self.created_at.isoformat(),
        }
        if include_private:
            data["email"] = self.email
        return data
    
    