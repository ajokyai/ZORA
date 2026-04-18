from app import create_app
from extensions import db
from models.country import Country
from models.user import User
from models.item import Item


def seed():
    app = create_app()

    with app.app_context():

        # =====================
        # COUNTRIES
        # =====================
        countries_data = [
            {"name": "Kenya", "code": "KE", "currency_code": "KES", "exchange_rate_to_kes": 1.0},
            {"name": "Uganda", "code": "UG", "currency_code": "UGX", "exchange_rate_to_kes": 28.0},
            {"name": "South Sudan", "code": "SS", "currency_code": "SSP", "exchange_rate_to_kes": 0.084},
        ]

        country_objs = {}

        for cd in countries_data:
            country = Country.query.filter_by(code=cd["code"]).first()

            if not country:
                country = Country(**cd)
                db.session.add(country)
                db.session.flush()
                print(f" + Country: {cd['name']}")
            else:
                print(f" . Country exists: {cd['name']}")

            country_objs[cd["code"]] = country

        # =====================
        # USERS (ONLY NON-ADMINS HERE)
        # =====================
        users_data = [
            {
                "email": "customer@zora.com",
                "username": "alice_juba",
                "password": "password123",
                "role": "customer",
                "display_name": "Alice (Juba)",
                "country_code": "SS"
            },
            {
                "email": "seller@zora.com",
                "username": "bob_kampala",
                "password": "password123",
                "role": "seller",
                "display_name": "Bob's Shop",
                "country_code": "UG"
            },
        ]

        user_objs = {}

        # create customers + seller
        for ud in users_data:
            user = User.query.filter_by(email=ud["email"]).first()

            if user:
                print(f" . User exists: {ud['email']}")
                user_objs[ud["role"]] = user
                continue

            country = country_objs.get(ud["country_code"])

            user = User(
                email=ud["email"],
                username=ud["username"],
                role=ud["role"],
                display_name=ud["display_name"],
                country=country,
            )

            user.set_password(ud["password"])

            db.session.add(user)
            db.session.flush()

            user_objs[ud["role"]] = user
            print(f" + User ({ud['role']}): {ud['email']}")

        # =====================
        # ADMINS (3 FIXED ADMINS)
        # =====================
        admins_data = [
            {
                "email": "akolgoch79@gmail.com",
                "username": "GOCH",
                "password": "password123",
                "role": "admin",
                "display_name": "GOCH",
                "country_code": "KE"
            },
            {
                "email": "starvaga211@gmail.com",
                "username": "Garang",
                "password": "password123",
                "role": "admin",
                "display_name": "Garang",
                "country_code": "SS"
            },
            {
                "email": "admin3@zora.com",
                "username": "ATEM",
                "password": "password123",
                "role": "admin",
                "display_name": "ATEM",
                "country_code": "SS"
            }
        ]

        admin_list = []

        for ad in admins_data:
            admin = User.query.filter_by(email=ad["email"]).first()

            if admin:
                print(f" . Admin exists: {ad['email']}")
                admin_list.append(admin)
                continue

            country = country_objs.get(ad["country_code"])

            admin = User(
                email=ad["email"],
                username=ad["username"],
                role=ad["role"],
                display_name=ad["display_name"],
                country=country,
            )

            admin.set_password(ad["password"])

            db.session.add(admin)
            db.session.flush()

            admin_list.append(admin)

            print(f" + Admin created: {ad['email']}")

        user_objs["admins"] = admin_list

        # =====================
        # ITEMS
        # =====================
        seller = user_objs.get("seller")

        if seller and Item.query.filter_by(seller_id=seller.id).count() == 0:

            items_data = [
                {"name": "Men's Cotton Shirt", "description": "Quality cotton shirt", "category": "clothes", "price_kes": 2500, "stock": 20},
                {"name": "Women's Dress", "description": "African print dress", "category": "clothes", "price_kes": 3500, "stock": 15},
                {"name": "Sneakers", "description": "Comfortable sneakers", "category": "shoes", "price_kes": 4200, "stock": 10},
            ]

            for item_data in items_data:
                item = Item(seller_id=seller.id, **item_data)
                db.session.add(item)
                print(f" + Item: {item_data['name']}")

        # =====================
        # COMMIT
        # =====================
        db.session.commit()

        # =====================
        # SHOW ADMINS (IMPORTANT)
        # =====================
        print("\n👑 ADMINS REGISTERED IN SYSTEM:")
        for admin in user_objs["admins"]:
            print(f"- {admin.username} | {admin.email} | {admin.role}")

        print("\nSeed complete!")


if __name__ == "__main__":
    seed()