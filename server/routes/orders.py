from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from email_utils import send_order_notification

router = APIRouter()


class OrderItem(BaseModel):
    name: str
    price: float
    quantity: int


class OrderRequest(BaseModel):
    customer_name: str
    items: List[OrderItem]


@router.post("/orders")
async def create_order(order: OrderRequest):
    try:
        # --- your existing order saving logic here ---

        # Send email notification to admin
        await send_order_notification(
            customer_name=order.customer_name,
            items=[item.dict() for item in order.items],
        )

        return {"message": "Order placed successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))