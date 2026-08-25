from django.urls import path

from .views import GoogleReviewsView

urlpatterns = [
    path('reviews/', GoogleReviewsView.as_view(), name='google-reviews'),
]
