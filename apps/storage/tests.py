from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.customers.models import Bike, Customer
from apps.orders.models import RepairOrder

from . import services
from .models import StorageBooking, StorageEvent


class StorageTestCase(TestCase):
    """Wspolny zestaw: klient, dwie sztuki sprzetu i zlecenie obejmujace obie."""

    def setUp(self):
        self.user = User.objects.create_user('serwisant', password='pass12345', is_staff=True)
        self.customer = Customer.objects.create(first_name='Anna', last_name='Nowak', phone='500600700')
        self.bike = Bike.objects.create(customer=self.customer, brand='Trek', model='Marlin')
        self.skis = Bike.objects.create(customer=self.customer, brand='Atomic', category='winter')
        self.order = RepairOrder.objects.create(
            customer=self.customer, bike_tag_number=42, description='Zimowanie + przeglad',
        )
        self.order.bikes.set([self.bike, self.skis])

    def make_booking(self, *, bike=None, start='2026-11-01', end='2027-03-31', **kwargs):
        return services.create_booking(
            repair_order=kwargs.pop('repair_order', self.order),
            bike=bike or self.bike,
            start_date=date.fromisoformat(start),
            end_date=date.fromisoformat(end),
            user=self.user,
            **kwargs,
        )


class StorageBookingModelTests(StorageTestCase):
    def test_booking_reads_owner_and_tag_from_order(self):
        booking = self.make_booking()
        self.assertEqual(booking.customer, self.customer)
        self.assertEqual(booking.tag, 42)

    def test_price_defaults_to_setting_and_is_snapshotted(self):
        with self.settings(STORAGE_DEFAULT_PRICE='550.00'):
            booking = self.make_booking()
        self.assertEqual(booking.price, Decimal('550.00'))

        # Podniesienie cennika nie rusza rezerwacji juz zalozonej.
        with self.settings(STORAGE_DEFAULT_PRICE='650.00'):
            booking.refresh_from_db()
            self.assertEqual(booking.price, Decimal('550.00'))

    def test_overlapping_stay_of_same_equipment_is_rejected(self):
        self.make_booking()
        with self.assertRaises(Exception):
            self.make_booking(start='2027-01-01', end='2027-04-30')

    def test_back_to_back_stays_are_allowed(self):
        self.make_booking(start='2026-11-01', end='2027-03-31')
        later = self.make_booking(start='2027-04-01', end='2027-05-31')
        self.assertEqual(StorageBooking.objects.filter(bike=self.bike).count(), 2)
        self.assertEqual(later.start_date, date(2027, 4, 1))

    def test_same_day_touch_is_a_conflict(self):
        self.make_booking(start='2026-11-01', end='2027-03-31')
        with self.assertRaises(Exception):
            self.make_booking(start='2027-03-31', end='2027-05-31')

    def test_cancelled_stay_frees_the_dates(self):
        first = self.make_booking()
        services.cancel(first, user=self.user)
        second = self.make_booking(start='2027-01-01', end='2027-04-30')
        self.assertEqual(second.status, StorageBooking.STATUS_RESERVED)

    def test_two_pieces_of_equipment_may_share_the_same_dates(self):
        self.make_booking(bike=self.bike)
        self.make_booking(bike=self.skis)
        self.assertEqual(StorageBooking.objects.count(), 2)

    def test_equipment_must_belong_to_the_order(self):
        other_bike = Bike.objects.create(customer=self.customer, brand='Giant')
        with self.assertRaises(Exception):
            self.make_booking(bike=other_bike)

    def test_is_overdue_only_for_stored_equipment(self):
        yesterday = date.today() - timedelta(days=1)
        booking = self.make_booking(
            start=(yesterday - timedelta(days=30)).isoformat(), end=yesterday.isoformat(),
        )
        self.assertFalse(booking.is_overdue)
        services.check_in(booking, user=self.user)
        self.assertTrue(booking.is_overdue)


class StorageServiceTests(StorageTestCase):
    def test_check_in_then_check_out(self):
        booking = self.make_booking()
        services.check_in(booking, user=self.user, notes='Rower czysty')
        self.assertEqual(booking.status, StorageBooking.STATUS_STORED)
        self.assertIsNotNone(booking.checked_in_at)

        services.check_out(booking, user=self.user, notes='Wydano wlascicielce')
        self.assertEqual(booking.status, StorageBooking.STATUS_PICKED_UP)
        self.assertIsNotNone(booking.checked_out_at)

        self.assertEqual(
            list(booking.events.order_by('id').values_list('event_type', flat=True)),
            [StorageEvent.EVENT_RESERVE, StorageEvent.EVENT_CHECK_IN, StorageEvent.EVENT_CHECK_OUT],
        )

    def test_check_in_twice_is_rejected(self):
        booking = self.make_booking()
        services.check_in(booking, user=self.user)
        with self.assertRaises(DRFValidationError):
            services.check_in(booking, user=self.user)

    def test_check_out_requires_stored_status(self):
        booking = self.make_booking()
        with self.assertRaises(DRFValidationError):
            services.check_out(booking, user=self.user)

    def test_extend_onto_another_stay_is_rejected(self):
        first = self.make_booking(start='2026-11-01', end='2027-01-31')
        self.make_booking(start='2027-03-01', end='2027-04-30')
        with self.assertRaises(Exception):
            services.extend(first, end_date=date(2027, 3, 15), user=self.user)

    def test_extend_logs_the_previous_date(self):
        booking = self.make_booking(start='2026-11-01', end='2027-01-31')
        services.extend(booking, end_date=date(2027, 3, 31), user=self.user)
        booking.refresh_from_db()
        self.assertEqual(booking.end_date, date(2027, 3, 31))
        note = booking.events.filter(event_type=StorageEvent.EVENT_EXTEND).first().note
        self.assertIn('2027-01-31', note)

    def test_cancelling_a_picked_up_stay_is_rejected(self):
        booking = self.make_booking()
        services.check_in(booking, user=self.user)
        services.check_out(booking, user=self.user)
        with self.assertRaises(DRFValidationError):
            services.cancel(booking, user=self.user)

    def test_payments_accumulate_and_stamp_paid_at(self):
        booking = self.make_booking(price=Decimal('550.00'))
        services.register_payment(booking, amount=Decimal('200.00'), user=self.user)
        booking.refresh_from_db()
        self.assertEqual(booking.balance_due, Decimal('350.00'))
        self.assertFalse(booking.is_paid)
        self.assertIsNone(booking.paid_at)

        services.register_payment(booking, amount=Decimal('350.00'), user=self.user)
        booking.refresh_from_db()
        self.assertTrue(booking.is_paid)
        self.assertIsNotNone(booking.paid_at)

    def test_overpayment_is_rejected(self):
        booking = self.make_booking(price=Decimal('550.00'))
        with self.assertRaises(DRFValidationError):
            services.register_payment(booking, amount=Decimal('600.00'), user=self.user)

    def test_occupancy_counts_peak_and_ignores_cancelled(self):
        self.make_booking(bike=self.bike, start='2026-11-01', end='2027-03-31')
        self.make_booking(bike=self.skis, start='2026-12-01', end='2027-01-31')
        cancelled = Bike.objects.create(customer=self.customer, brand='Cube')
        self.order.bikes.add(cancelled)
        services.cancel(self.make_booking(bike=cancelled, start='2026-12-01', end='2027-01-31'),
                        user=self.user)

        data = services.occupancy(date(2026, 10, 1), date(2027, 4, 30))
        self.assertEqual(data['bookings_count'], 2)
        self.assertEqual(data['peak_occupancy'], 2)
        self.assertEqual(data['peak_date'], date(2026, 12, 1))

    def test_occupancy_filters_by_category(self):
        self.make_booking(bike=self.bike, start='2026-11-01', end='2027-03-31')
        self.make_booking(bike=self.skis, start='2026-11-01', end='2027-03-31')
        winter = services.occupancy(date(2026, 11, 1), date(2027, 3, 31), category='winter')
        self.assertEqual(winter['peak_occupancy'], 1)


class StorageApiTests(StorageTestCase):
    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)

    def test_requires_authentication(self):
        self.client.logout()
        self.assertEqual(self.client.get('/api/storage/bookings/').status_code, 401)

    def test_create_booking(self):
        response = self.client.post('/api/storage/bookings/', {
            'repair_order': self.order.pk,
            'bike': self.bike.pk,
            'start_date': '2026-11-01',
            'end_date': '2027-03-31',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertEqual(body['tag'], 42)
        self.assertEqual(body['customer']['last_name'], 'Nowak')
        self.assertEqual(body['status'], StorageBooking.STATUS_RESERVED)
        self.assertEqual(
            StorageEvent.objects.filter(booking_id=body['id']).count(), 1,
        )

    def test_create_with_equipment_outside_the_order_is_400(self):
        stranger = Bike.objects.create(customer=self.customer, brand='Kross')
        response = self.client.post('/api/storage/bookings/', {
            'repair_order': self.order.pk,
            'bike': stranger.pk,
            'start_date': '2026-11-01',
            'end_date': '2027-03-31',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('bike', response.json())

    def test_create_overlapping_is_400(self):
        self.make_booking(start='2026-11-01', end='2027-03-31')
        response = self.client.post('/api/storage/bookings/', {
            'repair_order': self.order.pk,
            'bike': self.bike.pk,
            'start_date': '2027-01-01',
            'end_date': '2027-04-30',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_check_in_and_check_out_actions(self):
        booking = self.make_booking()
        url = f'/api/storage/bookings/{booking.pk}/'

        response = self.client.post(url + 'check-in/', {'notes': 'Przyjeto'},
                                    content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['status'], StorageBooking.STATUS_STORED)

        response = self.client.post(url + 'check-out/', {}, content_type='application/json')
        self.assertEqual(response.json()['status'], StorageBooking.STATUS_PICKED_UP)

    def test_payment_action(self):
        booking = self.make_booking(price=Decimal('550.00'))
        response = self.client.post(f'/api/storage/bookings/{booking.pk}/payment/',
                                    {'amount': '550.00'}, content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()['is_paid'])

    def test_filters(self):
        stored = self.make_booking(bike=self.bike, start='2026-11-01', end='2027-03-31')
        services.check_in(stored, user=self.user)
        self.make_booking(bike=self.skis, start='2027-06-01', end='2027-08-31')

        active = self.client.get('/api/storage/bookings/?active_on=2026-12-15').json()
        self.assertEqual(active['count'], 1)
        self.assertEqual(active['results'][0]['id'], stored.pk)

        winter = self.client.get('/api/storage/bookings/?category=winter').json()
        self.assertEqual(winter['count'], 1)

        unpaid = self.client.get('/api/storage/bookings/?unpaid=true').json()
        self.assertEqual(unpaid['count'], 2)

    def test_occupancy_endpoint(self):
        self.make_booking(start='2026-11-01', end='2027-03-31')
        response = self.client.get('/api/storage/occupancy/?start=2026-10-01&end=2027-04-30')
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual(body['peak_occupancy'], 1)
        self.assertEqual(body['timeline'][0], {'date': '2026-10-01', 'count': 0})

    def test_occupancy_rejects_bad_date(self):
        self.assertEqual(self.client.get('/api/storage/occupancy/?start=wczoraj').status_code, 400)

    def test_dashboard_endpoint(self):
        booking = self.make_booking(price=Decimal('550.00'))
        services.check_in(booking, user=self.user)
        body = self.client.get('/api/storage/dashboard/').json()
        self.assertEqual(body['stored_now'], 1)
        self.assertEqual(body['unpaid_count'], 1)
        self.assertEqual(Decimal(body['outstanding_amount']), Decimal('550.00'))
