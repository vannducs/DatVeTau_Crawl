import FormTrain from "./FormTrain"
import type { LocationDTO } from "../../types/location"

interface SearchBoxProps {
  initialOrigin?: LocationDTO | null
  initialDestination?: LocationDTO | null
  initialDate?: string
}

export default function SearchBox({
  initialOrigin,
  initialDestination,
  initialDate,
}: SearchBoxProps) {
  return (
    <div className="search-box">
      <FormTrain
        initialDeparture={initialOrigin}
        initialDestination={initialDestination}
        initialDate={initialDate}
      />
    </div>
  )
}
