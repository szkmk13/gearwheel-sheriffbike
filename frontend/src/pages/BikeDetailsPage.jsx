import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import toast from "react-hot-toast";
import { fetchBikeDetails, updateBike } from "../api/bikes";

import Button from "../components/Button";
import SlidePanel from "../components/SlidePanel";
import Input from "../components/Input";
import Select from "../components/Select";
import StatusBadge from "../components/StatusBadge";
import { getInitials } from "../components/ClientCard";
import { BikeDetailsSkeleton } from "../components/Skeleton";

const BIKE_TYPE_LABELS = {
  road: 'Szosowy (road)',
  mtb: 'Górski (mtb)',
  city: 'Miejski (city)',
  gravel: 'Gravel (gravel)',
  electric: 'Elektryczny (electric)',
  other: 'Inny (other)'
};

const BIKE_TYPE_OPTIONS = [
  { value: 'road', label: 'Szosowy (road)' },
  { value: 'mtb', label: 'Górski (mtb)' },
  { value: 'city', label: 'Miejski (city)' },
  { value: 'gravel', label: 'Gravel (gravel)' },
  { value: 'electric', label: 'Elektryczny (electric)' },
  { value: 'other', label: 'Inny (other)' }
];

const BikeIcon = ({ className = "w-7 h-7" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16a4 4 0 108 0 4 4 0 00-8 0zm10 0a4 4 0 108 0 4 4 0 00-8 0zm-7-2l3.5-7h3.5l2.5 5m-2.5-5H18" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

export default function BikeDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const formRef = useRef(null);

  const { data: bike, isLoading, isError, error } = useQuery({
    queryKey: ['bike', id],
    queryFn: () => fetchBikeDetails(id),
  });

  useEffect(() => {
    const code = bike?.sheriff_code || (bike ? `sheriff-${bike.id}-${bike.uuid}` : '');
    if (code) {
      QRCode.toDataURL(code, { width: 180, margin: 1 })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [bike?.sheriff_code, bike?.id, bike?.uuid]);

  const updateMutation = useMutation({
    mutationFn: (updatedData) => updateBike({ id, bikeData: updatedData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bike', id] });
      if (bike?.customer?.id) {
        queryClient.invalidateQueries({ queryKey: ['client', String(bike.customer.id)] });
      }
      setIsEditOpen(false);
      toast.success("Dane roweru zostały zaktualizowane!");
    },
    onError: (err) => {
      toast.error(`Wystąpił błąd zapisu: ${err.message}`);
    }
  });

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updated = {
      brand: formData.get('brand'),
      model: formData.get('model'),
      bike_type: formData.get('bike_type'),
      color: formData.get('color') || '',
      serial_no: formData.get('serial_no') || '',
      year: formData.get('year') ? parseInt(formData.get('year'), 10) : null,
      notes: formData.get('notes') || '',
    };
    updateMutation.mutate(updated);
  };

  const handleCopyCode = () => {
    if (!bike?.sheriff_code) return;
    navigator.clipboard.writeText(bike.sheriff_code);
    setCopied(true);
    toast.success("Skopiowano kod SheriffBike do schowka!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <BikeDetailsSkeleton />;
  if (isError) return <div className="p-8 text-red-500 font-medium">Błąd pobierania danych roweru: {error.message}</div>;
  if (!bike) return <div className="p-8 text-red-500 font-medium">Nie znaleziono roweru.</div>;

  const clientFullName = bike.customer ? `${bike.customer.first_name} ${bike.customer.last_name}`.trim() : 'Brak właściciela';
  const repairOrders = bike.repair_orders || [];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Przycisk powrotu */}
      <div className="flex items-center mb-4 sm:mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center p-2 border border-transparent hover:border-gray-200 hover:bg-gray-200 rounded-full transition-colors cursor-pointer mr-2"
        >
          <svg className="w-6 h-6 text-gray-800 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-gray-700 font-medium cursor-pointer hover:text-gray-900 transition-colors text-sm sm:text-base">
            Powrót
          </span>
        </button>
      </div>

      {/* Karta nagłówkowa roweru */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <div 
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
          >
            <BikeIcon className="w-8 h-8 sm:w-9 sm:h-9" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
                {bike.brand} {bike.model}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                {BIKE_TYPE_LABELS[bike.bike_type] || bike.bike_type}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              Właściciel: <span className="font-medium text-gray-700">{clientFullName}</span>
              {bike.serial_no && ` • Nr ramy: ${bike.serial_no}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
          >
            <EditIcon /> Edytuj dane
          </button>

          {bike.customer && (
            <Button
              onClick={() => navigate(`/panel/clients/${bike.customer.id}`)}
              className="justify-center text-sm"
            >
              Profil właściciela →
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Lewa kolumna: dane techniczne i historia zleceń */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Specyfikacja roweru */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Specyfikacja techniczna</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-400 uppercase font-semibold block mb-0.5">Producent</span>
                <span className="text-sm sm:text-base font-semibold text-gray-900">{bike.brand}</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-400 uppercase font-semibold block mb-0.5">Model</span>
                <span className="text-sm sm:text-base font-semibold text-gray-900">{bike.model || '-'}</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-400 uppercase font-semibold block mb-0.5">Typ roweru</span>
                <span className="text-sm sm:text-base font-medium text-gray-800">
                  {BIKE_TYPE_LABELS[bike.bike_type] || bike.bike_type}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-400 uppercase font-semibold block mb-0.5">Kolor</span>
                <span className="text-sm sm:text-base font-medium text-gray-800">{bike.color || 'Nie określono'}</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-400 uppercase font-semibold block mb-0.5">Numer ramy / seryjny</span>
                <span className="text-sm sm:text-base font-mono font-medium text-gray-800">
                  {bike.serial_no || 'Brak wpisu'}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-400 uppercase font-semibold block mb-0.5">Rok produkcji</span>
                <span className="text-sm sm:text-base font-medium text-gray-800">{bike.year || 'Nie określono'}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
              Zarejestrowano w systemie: {new Date(bike.created_at).toLocaleDateString()}
            </div>
          </div>

          {/* Notatki */}
          {bike.notes && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Notatki do roweru</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{bike.notes}</p>
            </div>
          )}

          {/* Historia zleceń tego roweru */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">Historia zleceń serwisowych</h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {repairOrders.length} {repairOrders.length === 1 ? 'zlecenie' : 'zleceń'}
              </span>
            </div>

            {repairOrders.length > 0 ? (
              <div className="space-y-3">
                {repairOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/panel/orders/${order.id}`)}
                    className="p-3.5 sm:p-4 border border-gray-100 rounded-lg bg-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 text-sm sm:text-base">#{order.id}</span>
                        {order.bike_tag_number && (
                          <span className="px-2 py-0.5 bg-gray-200/80 rounded text-xs font-semibold text-gray-700">
                            Zawieszka #{order.bike_tag_number}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Przyjęto: {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-200/60">
                      <span className="text-sm font-bold text-[var(--color-accent)]">
                        {order.final_cost ? `${order.final_cost} zł` : (order.estimated_cost ? `~${order.estimated_cost} zł` : '-')}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg text-gray-500 text-sm p-6 text-center border border-gray-100">
                Ten rower nie ma jeszcze zarejestrowanych zleceń naprawy.
              </div>
            )}
          </div>
        </div>

        {/* Prawa kolumna: właściciel i SheriffCode */}
        <div className="space-y-4 sm:space-y-6">
          {/* Karta właściciela */}
          {bike.customer && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Właściciel roweru
              </h3>

              <div className="flex items-center gap-3.5 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shrink-0"
                  style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
                >
                  {getInitials(clientFullName)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-base truncate">{clientFullName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Klient warsztatu</p>
                </div>
              </div>

              <div className="space-y-2.5 text-sm text-gray-600 mb-5 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{bike.customer.phone || 'Brak telefonu'}</span>
                </div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">{bike.customer.email || 'Brak adresu e-mail'}</span>
                </div>
              </div>

              <button
                onClick={() => navigate(`/panel/clients/${bike.customer.id}`)}
                className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                Przejdź do profilu klienta →
              </button>
            </div>
          )}

          {/* Identyfikator Sheriff Code */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Kod identyfikacyjny roweru
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Unikalny kod wykorzystywany na naklejkach QR oraz przy szybkim skanowaniu sprzętu:
            </p>

            {qrDataUrl && (
              <div className="flex flex-col items-center justify-center p-3 mb-3 bg-gray-50 rounded-xl border border-gray-100">
                <img src={qrDataUrl} alt="QR Code roweru" className="w-32 h-32 rounded-lg bg-white p-1 shadow-2xs" />
                <span className="text-[11px] font-semibold text-gray-400 mt-1.5 uppercase tracking-wider">Kod QR sprzętu</span>
              </div>
            )}

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 font-mono text-xs text-gray-800 break-all select-all mb-3">
              {bike.sheriff_code || `sheriff-${bike.id}-${bike.uuid}`}
            </div>

            <button
              onClick={handleCopyCode}
              className="w-full py-2 px-3 text-xs font-semibold rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? "✓ Skopiowano kod" : "Kopiuj kod SheriffBike"}
            </button>
          </div>
        </div>
      </div>

      {/* Panel boczny edycji roweru */}
      <SlidePanel isOpen={isEditOpen} onClose={() => setIsEditOpen(false)}>
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 px-1">Edytuj dane roweru</h2>

          <form ref={formRef} onSubmit={handleEditSubmit} className="flex flex-col gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Parametry sprzętu</h3>

              <Input
                name="brand"
                label="Producent"
                defaultValue={bike.brand}
                required={true}
              />

              <Input
                name="model"
                label="Model"
                defaultValue={bike.model}
                required={true}
              />

              <Select
                name="bike_type"
                label="Typ roweru"
                defaultValue={bike.bike_type}
                required={true}
                options={BIKE_TYPE_OPTIONS}
              />

              <Input
                name="color"
                label="Kolor"
                defaultValue={bike.color}
                placeholder="np. Czarny mat"
              />

              <Input
                name="serial_no"
                label="Numer seryjny / ramy"
                defaultValue={bike.serial_no}
                placeholder="np. WTU12345678"
              />

              <Input
                name="year"
                label="Rok produkcji"
                type="number"
                defaultValue={bike.year || ''}
                placeholder="np. 2023"
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Notatki / uwagi</h3>
              <textarea
                name="notes"
                defaultValue={bike.notes}
                className="w-full mt-2 p-3 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] min-h-[120px] resize-y"
                placeholder="Dodatkowe uwagi dotyczące tego roweru..."
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
              >
                Anuluj
              </button>

              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Zapisywanie..." : "Zapisz zmiany"}
              </Button>
            </div>
          </form>
        </div>
      </SlidePanel>
    </div>
  );
}
