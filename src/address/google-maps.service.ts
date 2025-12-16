import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonLoggerService } from '../logger/logger.service';

export interface GoogleMapsAddress {
  formattedAddress: string;
  streetAddress?: string;
  extendedAddress?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  placeId: string;
  formattedAddress: string;
  streetAddress?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

@Injectable()
export class GoogleMapsService {
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: WinstonLoggerService,
  ) {
    this.apiKey = this.configService.get<string>('googleMaps.apiKey');
    if (!this.apiKey) {
      this.logger.error('Google Maps API key not configured', {}, 'GoogleMapsService');
    }
  }

  async geocodeAddress(address: string): Promise<GoogleMapsAddress> {
    this.validateApiKey();
    
    const url = this.buildGeocodeUrl(address);
    
    try {
      const response = await fetch(url);
      const data = await this.parseResponse(response);
      
      return this.extractAddressComponents(data);
    } catch (error) {
      this.logger.error('Geocoding failed', { error: error.message }, 'GoogleMapsService');
      throw new BadRequestException('Failed to fetch address from Google Maps');
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<GoogleMapsAddress> {
    this.validateApiKey();
    
    const url = this.buildReverseGeocodeUrl(latitude, longitude);
    
    try {
      const response = await fetch(url);
      const data = await this.parseResponse(response);
      
      return this.extractAddressComponents(data);
    } catch (error) {
      this.logger.error('Reverse geocoding failed', { error: error.message }, 'GoogleMapsService');
      throw new BadRequestException('Failed to fetch address from coordinates');
    }
  }

  private validateApiKey(): void {
    if (!this.apiKey) {
      throw new BadRequestException('Google Maps API key not configured');
    }
  }

  private buildGeocodeUrl(address: string): string {
    const encodedAddress = encodeURIComponent(address);
    return `${this.baseUrl}?address=${encodedAddress}&key=${this.apiKey}`;
  }

  private buildReverseGeocodeUrl(latitude: number, longitude: number): string {
    return `${this.baseUrl}?latlng=${latitude},${longitude}&key=${this.apiKey}`;
  }

  private async parseResponse(response: Response): Promise<any> {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${data.status}`);
    }
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No results found');
    }
    
    return data;
  }

  private extractAddressComponents(data: any): GoogleMapsAddress {
    const result = data.results[0];
    const components = result.address_components;
    
    return {
      formattedAddress: result.formatted_address,
      streetAddress: this.findComponent(components, ['street_number', 'route']),
      extendedAddress: this.findComponent(components, ['sublocality', 'sublocality_level_1']),
      locality: this.findComponent(components, ['locality', 'administrative_area_level_2']),
      region: this.findComponent(components, ['administrative_area_level_1']),
      postalCode: this.findComponent(components, ['postal_code']),
      country: this.findComponent(components, ['country']),
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
    };
  }

  private findComponent(components: any[], types: string[]): string | undefined {
    for (const type of types) {
      const component = components.find(c => c.types.includes(type));
      if (component) {
        return component.long_name;
      }
    }
    return undefined;
  }

  async searchPlaces(input: string, sessionToken?: string): Promise<PlacePrediction[]> {
    this.validateApiKey();
    
    const url = this.buildPlacesAutocompleteUrl(input, sessionToken);
    
    try {
      const response = await fetch(url);
      const data = await this.parsePlacesResponse(response);
      
      return this.extractPredictions(data);
    } catch (error) {
      this.logger.error('Places search failed', { error: error.message }, 'GoogleMapsService');
      throw new BadRequestException('Failed to search places');
    }
  }

  async getPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails> {
    this.validateApiKey();
    
    const url = this.buildPlaceDetailsUrl(placeId, sessionToken);
    
    try {
      const response = await fetch(url);
      const data = await this.parsePlacesResponse(response);
      
      return this.extractPlaceDetails(data);
    } catch (error) {
      this.logger.error('Place details fetch failed', { error: error.message }, 'GoogleMapsService');
      throw new BadRequestException('Failed to fetch place details');
    }
  }

  private buildPlacesAutocompleteUrl(input: string, sessionToken?: string): string {
    const encodedInput = encodeURIComponent(input);
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedInput}&key=${this.apiKey}`;
    
    if (sessionToken) {
      url += `&sessiontoken=${sessionToken}`;
    }
    
    url += '&components=country:in';
    
    return url;
  }

  private buildPlaceDetailsUrl(placeId: string, sessionToken?: string): string {
    let url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${this.apiKey}`;
    
    if (sessionToken) {
      url += `&sessiontoken=${sessionToken}`;
    }
    
    url += '&fields=place_id,formatted_address,address_components,geometry';
    
    return url;
  }

  private async parsePlacesResponse(response: Response): Promise<any> {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status}`);
    }
    
    return data;
  }

  private extractPredictions(data: any): PlacePrediction[] {
    if (!data.predictions || data.predictions.length === 0) {
      return [];
    }
    
    return data.predictions.map((prediction: any) => ({
      placeId: prediction.place_id,
      description: prediction.description,
      mainText: prediction.structured_formatting?.main_text || prediction.description,
      secondaryText: prediction.structured_formatting?.secondary_text || '',
    }));
  }

  private extractPlaceDetails(data: any): PlaceDetails {
    if (!data.result) {
      throw new Error('No place details found');
    }
    
    const result = data.result;
    const components = result.address_components || [];
    
    return {
      placeId: result.place_id,
      formattedAddress: result.formatted_address,
      streetAddress: this.findComponent(components, ['street_number', 'route']),
      locality: this.findComponent(components, ['locality', 'administrative_area_level_2']),
      region: this.findComponent(components, ['administrative_area_level_1']),
      postalCode: this.findComponent(components, ['postal_code']),
      country: this.findComponent(components, ['country']),
      latitude: result.geometry?.location?.lat || 0,
      longitude: result.geometry?.location?.lng || 0,
    };
  }
}
