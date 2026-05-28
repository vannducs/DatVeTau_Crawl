import api from "./auth";

export const tripApi = {
    search: (fromStationId: number, toStationId: number, date: string) =>
        api.get("/trips/search", {
            params: { fromStationId, toStationId, date }
        }),

    getById: (tripId: number, fromStationId: number, toStationId: number) =>
        api.get(`/trips/${tripId}`, {
            params: { fromStationId, toStationId }
        }),

    getSeats: (tripId: number, fromStationId: number, toStationId: number) =>
        api.get(`/trips/${tripId}/seats`, {
            params: { fromStationId, toStationId }
        }),
};
