import api from "./auth";
import type { LocationDTO } from "../types/location";
import type { ProvinceDTO } from "../types/province";

export const locationApi = {
  getTrainStations: () => api.get<LocationDTO[]>("/locations/train-stations"),
  getAirports: () => api.get<LocationDTO[]>("/locations/airports"),
  getBusStations: () => api.get<LocationDTO[]>("/locations/bus-stations"),
  getProvinces: () => api.get<ProvinceDTO[]>("/locations/provinces"),
};
