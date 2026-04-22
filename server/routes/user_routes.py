from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db
from models.user import User

user_bp = Blueprint("user_bp", __name__)


@user_bp.route('/admin/users')
@login_required
def admin_users():
    if current_user.role != 'admin':
        return jsonify({"error": "Forbidden"}), 403
    users = User.query.order_by(User.id).all()
    return jsonify({"users": [u.to_dict() for u in users]})


@user_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.json
    old_password = data.get("old_password")
    new_password = data.get("new_password")

    if not old_password or not new_password:
        return jsonify({"error": "Both fields are required"}), 400

    if not current_user.check_password(old_password):
        return jsonify({"error": "Old password is incorrect"}), 400

    current_user.set_password(new_password)
    db.session.commit()

    return jsonify({
        "message": "Password updated successfully",
        "user": current_user.to_dict()
    })