from rest_framework import serializers
from .models import Customer, Bike


class BikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bike
        fields = '__all__'
        read_only_fields = ('created_at',)


class CustomerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ('id', 'first_name', 'last_name', 'phone', 'email', 'created_at')


class CustomerDetailSerializer(serializers.ModelSerializer):
    bikes = BikeSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('created_at',)
