from django.db import models
from django.contrib.auth.models import User

class ChatSession(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

class ChatMessage(models.Model):
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    response = models.TextField()
    corrected_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
