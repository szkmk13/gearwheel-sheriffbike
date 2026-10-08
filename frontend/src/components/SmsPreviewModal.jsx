import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Modal from "./Modal";
import Button from "./Button";
import { sendOrderSms } from "../api/orders";
import { smsInfo } from "../utils/sms";

// Podglad SMS-a "gotowe do odbioru" przed wyslaniem. Tresc z backendu jest tylko propozycja -
// mozna ja edytowac, a nic nie wychodzi, dopoki ktos nie kliknie "Wyslij SMS".
// `preview` = { to, message } z odpowiedzi zmiany statusu; null zamyka modal.
export default function SmsPreviewModal({ orderId, preview, onClose }) {
    return (
        <Modal isOpen={!!preview} onClose={onClose} title="Podgląd SMS do klienta" maxWidth="max-w-lg">
            {/* key: kazdy nowy podglad zaczyna od swiezej, niezmienionej tresci. */}
            {preview && <SmsPreviewForm key={preview.message} orderId={orderId} preview={preview} onClose={onClose} />}
        </Modal>
    );
}

function SmsPreviewForm({ orderId, preview, onClose }) {
    const queryClient = useQueryClient();
    const [message, setMessage] = useState(preview.message);
    const info = smsInfo(message);
    const isBlank = !message.trim();

    const sendMutation = useMutation({
        mutationFn: () => sendOrderSms(orderId, message),
        onSuccess: (result) => {
            // Wynik SMS-a dopisuje sie do notatki w historii statusow.
            queryClient.invalidateQueries({ queryKey: ['order', String(orderId)] });
            toast.success(result.mocked ? "Wysłano SMS (symulacja)" : "Wysłano SMS do klienta");
            onClose();
        },
    });

    return (
        <form
            className="space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                if (!isBlank) sendMutation.mutate();
            }}
        >
            <p className="px-3 py-2 rounded-md bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                Symulacja - bramka SMS nie jest jeszcze podłączona, wiadomość nie trafi do klienta.
            </p>

            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Do</p>
                <p className="text-base font-medium text-gray-900">{preview.to || "brak numeru telefonu"}</p>
            </div>

            <div>
                <label htmlFor="sms-message" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Treść
                </label>
                <textarea
                    id="sms-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    maxLength={670}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)]"
                />
                <div className="mt-1 flex justify-between gap-3 text-xs text-gray-500">
                    <span>{info.unicode ? "Polskie znaki - do 70 znaków na SMS" : "Bez polskich znaków - do 160 znaków na SMS"}</span>
                    <span className={info.parts > 1 ? "font-semibold text-orange-700" : ""}>
                        {info.length} / {info.limit} · {info.parts} {info.parts === 1 ? "SMS" : "SMS-y"}
                    </span>
                </div>
            </div>

            {sendMutation.isError && (
                <p className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                    Nie wysłano SMS-a: {sendMutation.error.message}
                </p>
            )}

            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                >
                    Nie wysyłaj
                </button>
                <Button type="submit" disabled={isBlank || sendMutation.isPending}>
                    {sendMutation.isPending ? "Wysyłanie..." : "Wyślij SMS"}
                </Button>
            </div>
        </form>
    );
}
