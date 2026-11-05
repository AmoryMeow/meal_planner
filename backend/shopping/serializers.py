from rest_framework import serializers


class ShoppingListItemSerializer(serializers.Serializer):
    name = serializers.CharField()
    quantity = serializers.DecimalField(max_digits=20, decimal_places=2)
    unit = serializers.CharField()
