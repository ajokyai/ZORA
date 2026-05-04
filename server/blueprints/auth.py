from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from flask_mail import Message
from extensions import bcrypt, db, mail
from models.user import User
import secrets
import datetime
import os

auth_bp = Blueprint('auth', __name__)

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5175')


def send_reset_email(to_email, token):
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    msg = Message(
        subject="Reset Your ZORA Password",
        sender=f"ZORA <{os.environ.get('MAIL_USERNAME')}>",
        recipients=[to_email]
    )
    msg.html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 40px;">
        <h1 style="color: #f5a623;">ZORA</h1>
        <h2>Reset Your Password</h2>
        <p>This link expires in 1 hour.</p>
        <a href="{reset_link}" style="display:inline-block; padding: 12px 24px;
           background: #f5a623; color: white; text-decoration: none; border-radius: 8px;">
           Reset Password
        </a>
        <p style="font-size:12px; margin-top:20px;">Or copy this link:<br/>{reset_link}</p>
    </div>
    """
    mail.send(msg)


@auth_bp.route('/me')
def me():
    if current_user.is_authenticated:
        return jsonify({"user": current_user.to_dict()})
    return jsonify({"user": None}), 200


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, data.get('password')):
        return jsonify({"error": "Invalid credentials"}), 401
    login_user(user, remember=True)
    return jsonify({"user": user.to_dict()})


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out"})


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({"error": "Email already registered"}), 400
    user = User(
        email=data['email'],
        username=data['username'],
        display_name=data.get('display_name', ''),
        phone=data.get('phone', ''),
        role=data.get('role', 'customer'),
        country_id=data.get('country_id'),
    )
    user.password_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    db.session.add(user)
    db.session.commit()
    login_user(user, remember=True)
    return jsonify({"user": user.to_dict()}), 201


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email', '').strip()
    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "If that email exists, a reset link has been sent."}), 200

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expiry = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    db.session.commit()

    try:
        send_reset_email(email, token)
    except Exception as e:
        print("EMAIL ERROR:", e)
        return jsonify({"error": "Failed to send reset email"}), 500

    return jsonify({"message": "If that email exists, a reset link has been sent."}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token', '').strip()
    new_password = data.get('password', '').strip()

    if not token or not new_password:
        return jsonify({"error": "Token and password required"}), 400

    user = User.query.filter_by(reset_token=token).first()

    if not user:
        return jsonify({"error": "Invalid or expired token"}), 400

    if user.reset_token_expiry and user.reset_token_expiry < datetime.datetime.utcnow():
        return jsonify({"error": "Token expired"}), 400

    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    user.reset_token = None
    user.reset_token_expiry = None
    db.session.commit()

    return jsonify({"message": "Password reset successful"}), 200
