from rest_framework import serializers


class AuthenticatedUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    is_staff = serializers.BooleanField()
