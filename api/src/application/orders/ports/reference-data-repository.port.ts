export interface RestaurantReference {
  restaurantId: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  avgPrepMinutes: number;
  rating: string;
}

export interface CourierReference {
  courierId: string;
  fullName: string;
  phone: string;
  documentId: string;
  vehicle: string;
  city: string;
  rating: string;
}

export interface ReferenceDataRepositoryPort {
  upsertRestaurants(restaurants: RestaurantReference[]): Promise<void>;
  upsertCouriers(couriers: CourierReference[]): Promise<void>;
}
