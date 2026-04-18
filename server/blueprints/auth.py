from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from utils.reset_tokens import reset_tokens
from extensions import db
import secrets

auth_bp = Blueprint("auth", __name__)

PUBLIC_ROLES = ("customer",)


# ─────────────────────────────────────────────
# REGISTER
# ─────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    from models.user import User
    from models.country import Country

    data = request.get_json(silent=True) or {}
    required = ("email", "username", "password")

    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    if User.query.filter_by(email=data["email"].lower()).first():
        return jsonify({"error": "Email already registered"}), 409

    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "Username already taken"}), 409

    country = None
    if data.get("country_id"):
        country = Country.query.get(data["country_id"])
        if not country:
            return jsonify({"error": "Invalid country_id"}), 400

    user = User(
        email=data["email"].lower(),
        username=data["username"],
        role="customer",
        display_name=data.get("display_name", data["username"]),
        phone=data.get("phone"),
        country=country,
    )

    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    login_user(user)

    return jsonify({
        "message": "Registered successfully",
        "user": user.to_dict(include_private=True)
    }), 201


# ─────────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    from models.user import User

    data = request.get_json(silent=True) or {}

    email = data.get("email", "").lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    login_user(user, remember=data.get("remember", False))

    return jsonify({
        "message": "Logged in",
        "user": user.to_dict(include_private=True)
    }), 200


# ─────────────────────────────────────────────
# LOGOUT
# ─────────────────────────────────────────────
@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out"}), 200


# ─────────────────────────────────────────────
# CURRENT USER
# ─────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    return jsonify({
        "user": current_user.to_dict(include_private=True)
    }), 200


# ─────────────────────────────────────────────
# COUNTRIES
# ─────────────────────────────────────────────
@auth_bp.route("/countries", methods=["GET"])
def countries():
    from models.country import Country

    all_countries = Country.query.order_by(Country.name).all()

    return jsonify({
        "countries": [c.to_dict() for c in all_countries]
    }), 200


# ─────────────────────────────────────────────
# ADMIN: LIST USERS
# ─────────────────────────────────────────────
@auth_bp.route("/admin/users", methods=["GET"])
@login_required
def list_users():
    from models.user import User

    if current_user.role != "admin":
        return jsonify({"error": "Admins only"}), 403

    users = User.query.order_by(User.created_at.desc()).all()

    return jsonify({
        "users": [u.to_dict(include_private=True) for u in users]
    }), 200


# ─────────────────────────────────────────────
# ADMIN: CHANGE ROLE
# ─────────────────────────────────────────────
@auth_bp.route("/admin/users/<int:user_id>/role", methods=["PUT"])
@login_required
def set_user_role(user_id):
    from models.user import User, ROLES

    if current_user.role != "admin":
        return jsonify({"error": "Admins only"}), 403

    data = request.get_json(silent=True) or {}
    new_role = data.get("role", "").lower()

    if new_role not in ROLES:
        return jsonify({"error": f"Invalid role. Choose from: {', '.join(ROLES)}"}), 400

    user = User.query.get_or_404(user_id)
    user.role = new_role
    db.session.commit()

    return jsonify({
        "message": f"User role updated to {new_role}",
        "user": user.to_dict()
    }), 200


# ─────────────────────────────────────────────
# 🔐 FORGOT PASSWORD (NEW)
# ─────────────────────────────────────────────
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    from models.user import User

    data = request.get_json(silent=True) or {}
    email = data.get("email", "").lower()

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    token = secrets.token_hex(16)
    reset_tokens[token] = user.id

    return jsonify({
        "message": "Reset token generated",
        "token": token
    }), 200


# ─────────────────────────────────────────────
# 🔐 RESET PASSWORD (NEW)
# ─────────────────────────────────────────────
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    from models.user import User

    data = request.get_json(silent=True) or {}

    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        return jsonify({"error": "Token and new password required"}), 400

    if token not in reset_tokens:
        return jsonify({"error": "Invalid or expired token"}), 400

    user = User.query.get(reset_tokens[token])

    if not user:
        return jsonify({"error": "User not found"}), 404

    user.set_password(new_password)
    db.session.commit()

    del reset_tokens[token]

    return jsonify({
        "message": "Password reset successful"
    }), 200