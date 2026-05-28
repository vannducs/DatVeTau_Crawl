import api from "./auth";
import type { TrainStation } from "../types/station";

export const stationApi = {
    getAll: () => api.get<TrainStation[]>("/stations"),
    getById: (id: number) => api.get<TrainStation>(`/stations/${id}`),
};
