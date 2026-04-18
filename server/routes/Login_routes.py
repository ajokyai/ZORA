from flask import request, jsonify
from models.user import User
from flask_jwt_extended import create_access_token


def login():
    data = request.json

    email = data.get("email")
    password = data.get("password")

    print("LOGIN ATTEMPT:", email)  # DEBUG

    user = User.query.filter_by(email=email).first()

    if not user:
        print("USER NOT FOUND")
        return jsonify({"error": "User not found"}), 404

    if not user.check_password(password):
        print("WRONG PASSWORD")
        return jsonify({"error": "Invalid password"}), 401

    token = create_access_token(identity=user.id)

    return jsonify({
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "username": user.username
        }
    })