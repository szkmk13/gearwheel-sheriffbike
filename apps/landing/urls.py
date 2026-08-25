from django.urls import path

from .views import ContactFormView, GoogleReviewsView

urlpatterns = [
    path('contact_form/', ContactFormView.as_view(), name='contact-form'),
    path('reviews/', GoogleReviewsView.as_view(), name='google-reviews'),
]
