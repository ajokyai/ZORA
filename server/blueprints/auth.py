from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from extensions import bcrypt, db
from models.user import User
import secrets
import datetime
import os
import resend

auth_bp = Blueprint('auth', __name__)

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5175')
resend.api_key = os.environ.get('RESEND_API_KEY')


def send_reset_email(to_email, token):
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"

    resend.Emails.send({
        "from": "ZORA <onboarding@resend.dev>",
        "to": to_email,
        "subject": "ZORA — Reset Your Password",
        "html": f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 40px;">
  <div style="max-width: 480px; margin: auto; background: white; border-radius: 12px; padding: 40px;">
    <h1 style="color: #f5a623; font-size: 28px; margin-bottom: 4px;">ZORA</h1>
    <h2 style="font-size: 20px; margin-top: 0;">Reset Your Password</h2>
    <p>You requested a password reset. Click the button below — this link is valid for <strong>1 hour</strong>.</p>
    <a href="{reset_link}"
       style="display:inline-block; margin: 24px 0; padding: 14px 28px;
              background: #f5a623; color: white; text-decoration: none;
              border-radius: 8px; font-weight: bold; font-size: 16px;">
      Reset Password
    </a>
    <p style="color: #888; font-size: 13px;">
      If the button doesn't work, copy this link into your browser:<br/>
      <a href="{reset_link}" style="color: #f5a623;">{reset_link}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="color: #aaa; font-size: 12px;">
      If you didn't request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
""",
    })


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
        print(f"Email send failed: {e}")
        return jsonify({"error": "Failed to send reset email. Please try again."}), 500

    return jsonify({"message": "If that email exists, a reset link has been sent."}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token', '').strip()
    new_password = data.get('password', '').strip()

    if not token or not new_password:
        return jsonify({"error": "Token and new password are required"}), 400

    user = User.query.filter_by(reset_token=token).first()

    if not user:
        return jsonify({"error": "Invalid or expired reset link"}), 400

    if user.reset_token_expiry < datetime.datetime.utcnow():
        return jsonify({"error": "Reset link has expired. Please request a new one."}), 400

    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    user.reset_token = None
    user.reset_token_expiry = None
    db.session.commit()

    return jsonify({"message": "Password reset successful. You can now log in."}), 200