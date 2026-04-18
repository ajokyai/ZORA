from extensions import db
from datetime import datetime


class Item(db.Model):
    __tablename__ = "items"

    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50), default="other")
    price_kes = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, default=1)
    shop_name = db.Column(db.String(255), nullable=True)  # e.g. "Kikuubo Market, Kampala"
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    seller = db.relationship("User", back_populates="items")
    images = db.relationship("ItemImage", back_populates="item", cascade="all, delete-orphan")
    messages = db.relationship("Message", back_populates="item", lazy="dynamic")
    orders = db.relationship("Order", back_populates="item", lazy="dynamic")

    def price_in(self, exchange_rate_to_kes=1.0):
        if exchange_rate_to_kes and exchange_rate_to_kes != 0:
            return round(self.price_kes / exchange_rate_to_kes, 0)
        return self.price_kes

    def to_dict(self, currency_code="KES", exchange_rate_to_kes=1.0):
        return {
            "id": self.id,
            "seller_id": self.seller_id,
            "seller_username": self.seller.username if self.seller else None,
            "seller_display_name": self.seller.display_name if self.seller else None,
            "shop_name": self.shop_name or (self.seller.display_name if self.seller else "ZORA Market"),
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "price_kes": self.price_kes,
            "price_display": self.price_in(exchange_rate_to_kes),
            "currency_display": currency_code,
            "stock": self.stock,
            "is_active": self.is_active,
            "images": [img.to_dict() for img in self.images],
            "created_at": self.created_at.isoformat(),
        }


class ItemImage(db.Model):
    __tablename__ = "item_images"

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    is_primary = db.Column(db.Boolean, default=False)
    item = db.relationship("Item", back_populates="images")

    def to_dict(self):
        return {
            "id": self.id,
            "item_id": self.item_id,
            "url": self.url,
            "is_primary": self.is_primary,
        }