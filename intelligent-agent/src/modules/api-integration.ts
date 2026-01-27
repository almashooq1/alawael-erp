// وحدة تكامل مع API خارجي
import axios from 'axios';

export class APIIntegration {
  async fetchData(endpoint: string): Promise<any> {
    try {
      const response = await axios.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('API fetch error:', error);
      return null;
    }
  }
}
