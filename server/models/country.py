from extensions import db


class Country(db.Model):
    __tablename__ = "countries"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    code = db.Column(db.String(10), nullable=False, unique=True)
    currency_code = db.Column(db.String(10), nullable=False)
    exchange_rate_to_kes = db.Column(db.Float, nullable=False, default=1.0)
    users = db.relationship("User", back_populates="country")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "currency_code": self.currency_code,
            "exchange_rate_to_kes": self.exchange_rate_to_kes,
        }