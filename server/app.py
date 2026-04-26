import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify
from flask_cors import CORS
from extensions import db, migrate, login_manager, bcrypt,mail
from dotenv import load_dotenv
load_dotenv()

def create_app(config=None):
    app = Flask(__name__)

    # 1. SECRET_KEY from environment
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "fallback-dev-secret")

    # 2. DATABASE_URL from environment (Render provides this for PostgreSQL)
    database_url = os.environ.get("DATABASE_URL", "sqlite:///zora.db")
    # Render gives postgres:// but SQLAlchemy needs postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "None"
    # 3. Secure cookies in production
    app.config["SESSION_COOKIE_SECURE"] = os.environ.get("FLASK_ENV") == True

    if config:
        app.config.update(config)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    bcrypt.init_app(app)

     # Mail config
    app.config["MAIL_SERVER"] = "smtp.gmail.com"
    app.config["MAIL_PORT"] = 587
    app.config["MAIL_USE_TLS"] = True
    app.config["MAIL_USERNAME"] = os.environ.get("MAIL_USERNAME")
    app.config["MAIL_PASSWORD"] = os.environ.get("MAIL_PASSWORD")

    from extensions import mail
    mail.init_app(app)


    # 4. CORS — allow your Render frontend URL
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        os.environ.get("FRONTEND_URL", ""),  # e.g. https://zora-client.onrender.com
    ]
    CORS(
        app,
        supports_credentials=True,
        origins=[o for o in allowed_origins if o]  # filter empty strings
    )

    with app.app_context():
        from models.country import Country
        from models.user import User
        from models.item import Item, ItemImage
        from models.message import Message
        from models.order import Order, OrderStatusHistory

    @app.route("/")
    def home():
        return jsonify({"message": "ZORA backend is running"})

    @login_manager.user_loader
    def load_user(user_id):
        from models.user import User
        return User.query.get(int(user_id))

    login_manager.login_view = None

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "Authentication required"}), 401

    from blueprints.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    from blueprints.items import items_bp
    app.register_blueprint(items_bp, url_prefix="/api")

    from blueprints.orders import orders_bp
    app.register_blueprint(orders_bp, url_prefix="/api")

    from blueprints.messages import messages_bp
    app.register_blueprint(messages_bp, url_prefix="/api")

    from routes.user_routes import user_bp
    app.register_blueprint(user_bp, url_prefix="/api")

    return app


# 5. Render-compatible entry point
if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_ENV") != "production")
