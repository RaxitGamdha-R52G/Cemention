import os
from twilio.rest import Client
from datetime import datetime, timedelta, timezone
import random
from .database import otp_collection

# Twilio configuration - will be set from .env
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")

# For development/demo mode
DEMO_MODE = os.environ.get("OTP_DEMO_MODE", "true").lower() == "true"

class OTPService:
    def __init__(self):
        self.client = None
        if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and not DEMO_MODE:
            self.client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    
    async def send_otp(self, phone: str):
        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Store OTP in database with expiry
        expiry = datetime.now(timezone.utc) + timedelta(minutes=5)
        await otp_collection.update_one(
            {"phone": phone},
            {"$set": {
                "phone": phone,
                "otp": otp,
                "expiry": expiry.isoformat(),
                "verified": False
            }},
            upsert=True
        )
        
        # Send OTP via Twilio (if not in demo mode)
        if self.client and not DEMO_MODE:
            try:
                message = self.client.messages.create(
                    body=f"Your Cemention verification code is: {otp}. Valid for 5 minutes.",
                    from_=TWILIO_PHONE_NUMBER,
                    to=phone
                )
                return {"success": True, "message": "OTP sent successfully", "sid": message.sid}
            except Exception as e:
                return {"success": False, "message": f"Failed to send OTP: {str(e)}"}
        else:
            # Demo mode - return OTP in response
            print(f"DEBUG: DEMO_MODE = {DEMO_MODE}, OTP = {otp}")
            return {
                "success": True, 
                "message": "OTP sent successfully (Demo Mode)",
                "otp": otp  # Always include OTP in demo mode since we're in this branch
            }
    
    async def verify_otp(self, phone: str, otp: str):
        # Get OTP from database
        otp_doc = await otp_collection.find_one({"phone": phone})
        
        if not otp_doc:
            return {"success": False, "message": "No OTP found for this phone number"}
        
        # Check if already verified
        if otp_doc.get("verified"):
            return {"success": False, "message": "OTP already used"}
        
        # Check expiry
        expiry = datetime.fromisoformat(otp_doc["expiry"])
        if datetime.now(timezone.utc) > expiry:
            return {"success": False, "message": "OTP has expired"}
        
        # Verify OTP
        if otp_doc["otp"] == otp:
            # Mark as verified
            await otp_collection.update_one(
                {"phone": phone},
                {"$set": {"verified": True}}
            )
            return {"success": True, "message": "OTP verified successfully"}
        else:
            return {"success": False, "message": "Invalid OTP"}

otp_service = OTPService()
