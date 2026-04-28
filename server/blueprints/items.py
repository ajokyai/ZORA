import os
import cloudinary
import cloudinary.uploader
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db

items_bp = Blueprint("items", __name__)

CATEGORIES = ("clothes", "shoes", "electronics", "beauty", "other")

def get_cloudinary_options():
    return {
        "api_key": os.environ.get("CLOUDINARY_API_KEY"),
        "api_secret": os.environ.get("CLOUDINARY_API_SECRET"),
        "cloud_name": os.environ.get("CLOUDINARY_CLOUD_NAME"),
    }

@items_bp.route("/items", methods=["GET"])
def get_items():
    from models.item import Item
    from models.country import Country
    category = request.args.get("category")
    country_code = request.args.get("country", "KE")
    country = Country.query.filter_by(code=country_code).first()
    rate = country.exchange_rate_to_kes if country else 1.0
    currency = country.currency_code if country else "KES"
    query = Item.query.filter_by(is_active=True)
    if category and category != "all":
        query = query.filter_by(category=category)
    items = query.order_by(Item.created_at.desc()).all()
    return jsonify({"items": [i.to_dict(currency_code=currency, exchange_rate_to_kes=rate) for i in items]}), 200

@items_bp.route("/items/<int:item_id>", methods=["GET"])
def get_item(item_id):
    from models.item import Item
    from models.country import Country
    country_code = request.args.get("country", "KE")
    country = Country.query.filter_by(code=country_code).first()
    rate = country.exchange_rate_to_kes if country else 1.0
    currency = country.currency_code if country else "KES"
    item = Item.query.get_or_404(item_id)
    return jsonify({"item": item.to_dict(currency_code=currency, exchange_rate_to_kes=rate)}), 200

@items_bp.route("/items", methods=["POST"])
@login_required
def create_item():
    from models.item import Item, ItemImage
    if current_user.role != "admin":
        return jsonify({"error": "Only admins can create items"}), 403
    if request.content_type and "multipart" in request.content_type:
        data = request.form
    else:
        data = request.get_json(silent=True) or {}
    if not data.get("name") or not data.get("price_kes"):
        return jsonify({"error": "name and price_kes are required"}), 400
    item = Item(
        seller_id=current_user.id,
        name=data["name"],
        description=data.get("description"),
        category=data.get("category", "other"),
        price_kes=float(data["price_kes"]),
        stock=int(data.get("stock", 1)),
        sizes=data.get("sizes"),
    )
    db.session.add(item)
    db.session.flush()
    files = request.files.getlist("images")
    for idx, file in enumerate(files[:5]):
        if file and file.filename:
            try:
                result = cloudinary.uploader.upload(
                    file,
                    folder="zora/items",
                    public_id=f"item_{item.id}_{idx}",
                    overwrite=True,
                    resource_type="image",
                    **get_cloudinary_options()
                )
                db.session.add(ItemImage(item_id=item.id, url=result["secure_url"], is_primary=(idx == 0)))
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"Image upload failed: {e}")
    db.session.commit()
    return jsonify({"message": "Item created", "item": item.to_dict()}), 201

@items_bp.route("/items/<int:item_id>/images", methods=["POST"])
@login_required
def upload_images(item_id):
    from models.item import Item, ItemImage
    item = Item.query.get_or_404(item_id)
    if current_user.role != "admin":
        return jsonify({"error": "Only admins can upload images"}), 403

    # 1. Delete old images from Cloudinary
    for img in item.images:
        try:
            public_id = "zora/items/" + img.url.split("/")[-1].split(".")[0]
            cloudinary.uploader.destroy(public_id, resource_type="image", **get_cloudinary_options())
        except Exception as e:
            print(f"Cloudinary delete failed: {e}")

    # 2. Delete old images from DB
    ItemImage.query.filter_by(item_id=item_id).delete()
    db.session.flush()

    # 3. Upload new images
    files = request.files.getlist("images")
    uploaded = []
    for idx, file in enumerate(files[:5]):
        if file and file.filename:
            try:
                result = cloudinary.uploader.upload(
                    file,
                    folder="zora/items",
                    public_id=f"item_{item_id}_{idx}",
                    overwrite=True,
                    resource_type="image",
                    **get_cloudinary_options()
                )
                img = ItemImage(item_id=item_id, url=result["secure_url"], is_primary=(idx == 0))
                db.session.add(img)
                uploaded.append(result["secure_url"])
            except Exception as e:
                import traceback
                traceback.print_exc()
                db.session.rollback()
                return jsonify({"error": f"Upload failed: {str(e)}"}), 500

    db.session.commit()
    return jsonify({"message": f"{len(uploaded)} image(s) uploaded", "urls": uploaded}), 200

@items_bp.route("/items/<int:item_id>/images", methods=["DELETE"])
@login_required
def delete_images(item_id):
    from models.item import Item, ItemImage
    item = Item.query.get_or_404(item_id)
    if current_user.role != "admin":
        return jsonify({"error": "Forbidden"}), 403

    for img in item.images:
        try:
            public_id = "zora/items/" + img.url.split("/")[-1].split(".")[0]
            cloudinary.uploader.destroy(public_id, resource_type="image", **get_cloudinary_options())
        except Exception as e:
            print(f"Cloudinary delete failed: {e}")

    ItemImage.query.filter_by(item_id=item_id).delete()
    db.session.commit()
    return jsonify({"message": "Images cleared"}), 200

@items_bp.route("/items/<int:item_id>", methods=["PUT"])
@login_required
def update_item(item_id):
    from models.item import Item
    item = Item.query.get_or_404(item_id)
    if current_user.role != "admin":
        return jsonify({"error": "Only admins can update items"}), 403
    data = request.get_json(silent=True) or {}
    for field in ("name", "description", "category", "stock", "is_active", "sizes"):
        if field in data:
            setattr(item, field, data[field])
    if "price_kes" in data:
        item.price_kes = float(data["price_kes"])
    db.session.commit()
    return jsonify({"message": "Item updated", "item": item.to_dict()}), 200

@items_bp.route("/items/<int:item_id>", methods=["DELETE"])
@login_required
def delete_item(item_id):
    from models.item import Item
    item = Item.query.get_or_404(item_id)
    if current_user.role != "admin":
        return jsonify({"error": "Only admins can delete items"}), 403
    item.is_active = False
    db.session.commit()
    return jsonify({"message": "Item deactivated"}), 200

@items_bp.route("/admin/items", methods=["GET"])
@login_required
def admin_get_items():
    from models.item import Item
    if current_user.role != "admin":
        return jsonify({"error": "Forbidden"}), 403
    items = Item.query.order_by(Item.created_at.desc()).all()
    return jsonify({"items": [i.to_dict() for i in items]}), 200
