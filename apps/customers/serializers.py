from rest_framework import serializers
from .models import Customer, Bike


class CustomerBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ('id', 'first_name', 'last_name', 'phone', 'email', 'created_at')


class BikeNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bike
        exclude = ('customer',)
        read_only_fields = ('created_at',)


class BikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bike
        fields = '__all__'
        read_only_fields = ('created_at',)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['customer'] = CustomerBasicSerializer(instance.customer).data
        return representation


class BikeReadSerializer(serializers.ModelSerializer):
    """Response shape for BikeSerializer, whose `to_representation` nests `customer`."""
    customer = CustomerBasicSerializer(read_only=True)

    class Meta:
        model = Bike
        fields = '__all__'
        read_only_fields = ('created_at',)


class CustomerListSerializer(serializers.ModelSerializer):
    bikes = BikeNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = ('id', 'first_name', 'last_name', 'phone', 'email', 'created_at', 'bikes')


class CustomerDetailSerializer(serializers.ModelSerializer):
    bikes = BikeNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('created_at',)
