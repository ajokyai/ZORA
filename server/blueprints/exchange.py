import os
import requests
from flask import Blueprint, jsonify
from extensions import db

exchange_bp = Blueprint("exchange", __name__)

EXCHANGE_RATE_API_KEY = os.environ.get("EXCHANGE_RATE_API_KEY")


@exchange_bp.route("/update-rates", methods=["POST"])
def update_exchange_rates():
    """
    Fetches live KES-based exchange rates and updates the countries table.
    Call this daily via a cron job (e.g. cron-job.org hitting POST /api/update-rates).
    """
    from models.country import Country

    if not EXCHANGE_RATE_API_KEY:
        return jsonify({"error": "EXCHANGE_RATE_API_KEY not set"}), 500

    try:
        url = f"https://v6.exchangerate-api.com/v6/{EXCHANGE_RATE_API_KEY}/latest/KES"
        response = requests.get(url, timeout=5)
        data = response.json()

        if data.get("result") != "success":
            return jsonify({"error": data.get("error-type", "API error")}), 502

        rates = data["conversion_rates"]
        updated = []

        countries = Country.query.all()
        for country in countries:
            new_rate = rates.get(country.currency_code)
            if new_rate:
                country.exchange_rate_to_kes = new_rate
                updated.append(f"{country.currency_code}: {new_rate}")

        db.session.commit()
        return jsonify({"message": "Rates updated", "updated": updated}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500