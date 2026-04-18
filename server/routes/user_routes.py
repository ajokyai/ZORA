from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.user import User

user_bp = Blueprint("user_bp", __name__)


@user_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user = User.query.get(get_jwt_identity())
    data = request.json

    old_password = data.get("old_password")
    new_password = data.get("new_password")

    if not old_password or not new_password:
        return jsonify({"error": "Both fields are required"}), 400

    if not user.check_password(old_password):
        return jsonify({"error": "Old password is incorrect"}), 400

    user.set_password(new_password)
    db.session.commit()

    return jsonify({
        "message": "Password updated successfully",
        "user": user.to_dict()
    })