from django.urls import path
from .views import ChatHistoryView, ChatSendView, RegisterView, LoginView, GrammarCheckView, LogoutView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("chat/send/", ChatSendView.as_view(), name="chat-send"),
    path("chat/history/", ChatHistoryView.as_view(), name="chat-history"),
    path("chat/grammar-check/", GrammarCheckView.as_view(), name="grammar-check"),
]