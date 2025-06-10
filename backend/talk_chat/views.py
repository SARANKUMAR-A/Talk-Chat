from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import ChatSession, ChatMessage
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.http import JsonResponse
import os
from dotenv import load_dotenv
load_dotenv()
import ollama
from datetime import datetime
import razorpay
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import json
import secrets


razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)
print("Razorpay client initialized", razorpay_client)

def get_or_create_session(user):
    session, _ = ChatSession.objects.get_or_create(user=user)
    return session


class RegisterView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        if not username or not password:
            return Response({"error": "Username and password required."}, status=400)

        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists."}, status=400)

        user = User.objects.create_user(username=username, password=password)
        return Response({"message": "User registered successfully."}, status=201)


class LoginView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(username=username, password=password)
        if user is not None:
            refresh = RefreshToken.for_user(user)
            return Response({
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "username": user.username,
            })
        return Response({"error": "Invalid credentials."}, status=401)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Logout successful."}, status=status.HTTP_205_RESET_CONTENT)
        except TokenError:
            return Response({"error": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)


class ChatHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        session = get_or_create_session(user)
        messages = session.messages.order_by("created_at")
        # Return list of dict with user message and AI response
        return Response([
            {
                "message_id": m.id,
                "user_message": m.message,
                "ai_response": m.response,
                "corrected_message": m.corrected_message,
                "created_at": m.created_at
            } for m in messages
        ])


class ChatSendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        text = request.data.get("text", "").strip()
        start_time = datetime.now()
        print(f"ChatSendView called at {start_time} by user {user.username}")
        if not text:
            return Response({"reply": ""})

        session = get_or_create_session(user)

        # Fetch the last 3 user/AI messages for context
        history = list(session.messages.order_by("-created_at")[:3])[::-1]

        messages = []
        for m in history:
            messages.append({"role": "user", "content": m.message})
            messages.append({"role": "assistant", "content": m.response})

        # Append the current user input
        messages.append({"role": "user", "content": text})

        # Define a system prompt to structure answer + follow-up
        system_prompt = (
            """You are a helpful assistant. 
            Provide a clear, corrected answer to the user's question in no more than five sentences. 
            Avoid using asterisks (*) anywhere. 
            Then, suggest a related follow-up question to continue the conversation. 
            Format your response exactly as follows:
            Answer: <your answer>
            Follow-up Question: <related question>"""
        )

        messages.insert(0, {"role": "system", "content": system_prompt})

        # Call Ollama
        response = ollama.chat(
            model="mistral",
            messages=messages,
            options={"num_predict": 120}
        )

        full_reply = response['message']['content'].strip()

        # Extract answer and follow-up
        answer = ""
        follow_up = ""
        if "Follow-up Question:" in full_reply:
            parts = full_reply.split("Follow-up Question:")
            answer = parts[0].replace("Answer:", "").strip()
            follow_up = parts[1].strip()
        else:
            answer = full_reply

        # Save user message and AI reply in DB
        chat_message = ChatMessage.objects.create(
            session=session,
            user=user,
            message=text,
            response=answer,
        )
        print(f"Chat message saved: {chat_message.id}")
        print(f"AI Reply: {answer}")
        print(f"Follow-up: {follow_up}")
        end_time = datetime.now()
        print(f"ChatSendView completed at {end_time}, duration: {end_time - start_time}")

        return Response({
            "reply": answer + "\n\n" + follow_up,
            # "follow_up": follow_up,
            "message_id": chat_message.id
        })


class GrammarCheckView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message_id = request.data.get("message_id")
        if not message_id:
            return JsonResponse({'error': 'Message ID is required'}, status=400)

        chat_message = ChatMessage.objects.get(id=message_id, user=request.user)
        message = chat_message.message

        prompt = f"Correct this sentence for grammar. Give up to one corrected versions, but no explanation. Return in double quotes.:\n\n'{message}'\n\n"
        response = ollama.chat(
            model='llama3',
            messages=[{"role": "user", "content": prompt}]
        )
        corrected = response['message']['content'].strip()
        print(f"Original: {message}\nCorrected: {corrected}")

        return Response({"original": message, "corrected": corrected})


class PaymentView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            data = json.loads(request.body)
            amount = data.get("amount", 19900)  # Default to ₹199.00 in paise
            payment_method = data.get("payment_method")

            if not amount:
                return JsonResponse({"error": "Amount is required"}, status=400)

            receipt_id = f"rcpt_{secrets.token_hex(4)}"  # Generate a unique receipt id

            order_data = {
                "amount": amount,
                "currency": "INR",
                "receipt": receipt_id,
                "payment_capture": 1,
                "notes": {
                    "payment_method_requested": payment_method or "any"
                },
            }

            order = razorpay_client.order.create(data=order_data)

            response = {
                "razorpay_key": settings.RAZORPAY_KEY_ID,
                "order_id": order["id"],
                "amount": order["amount"],
                "currency": order["currency"],
            }
            return JsonResponse(response)
        except Exception as e:
            print(f"Error creating subscription: {e}")
            return JsonResponse({"error": str(e)}, status=500)
