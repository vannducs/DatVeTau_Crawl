export interface LocationDTO {
  id: number;
  name: string;
  locationType: string;
  provinceName: string | null;
  provinceId: string | null;
  address: string | null;
  iataCode: string | null;
}
