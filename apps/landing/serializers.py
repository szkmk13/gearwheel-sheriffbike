from rest_framework import serializers


class ContactFormSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    phone = serializers.CharField(max_length=40)
    equip = serializers.CharField(max_length=40, required=False, allow_blank=True)
    service = serializers.CharField(max_length=200, required=False, allow_blank=True)
    date = serializers.CharField(max_length=20, required=False, allow_blank=True)
    msg = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    turnstile_token = serializers.CharField()
