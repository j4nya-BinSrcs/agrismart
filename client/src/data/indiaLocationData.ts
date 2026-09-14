export interface DistrictInfo {
  name: string;
  lat: number;
  lon: number;
}

export interface StateInfo {
  state: string;
  districts: DistrictInfo[];
}

export const INDIA_LOCATIONS: StateInfo[] = [
  {
    state: 'Gujarat',
    districts: [
      { name: 'Anand', lat: 22.5645, lon: 72.9289 },
      { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
      { name: 'Amreli', lat: 21.6032, lon: 71.2221 },
      { name: 'Banaskantha (Palanpur)', lat: 24.1724, lon: 72.4346 },
      { name: 'Bharuch', lat: 21.7051, lon: 72.9959 },
      { name: 'Bhavnagar', lat: 21.7645, lon: 72.1519 },
      { name: 'Gandhinagar', lat: 23.2156, lon: 72.6369 },
      { name: 'Jamnagar', lat: 22.4707, lon: 70.0577 },
      { name: 'Junagadh', lat: 21.5222, lon: 70.4579 },
      { name: 'Kheda (Nadiad)', lat: 22.6939, lon: 72.8604 },
      { name: 'Kutch (Bhuj)', lat: 23.242, lon: 69.6669 },
      { name: 'Mehsana', lat: 23.588, lon: 72.3693 },
      { name: 'Navsari', lat: 20.9467, lon: 72.952 },
      { name: 'Panchmahal (Godhra)', lat: 22.7749, lon: 73.6143 },
      { name: 'Rajkot', lat: 22.3039, lon: 70.8022 },
      { name: 'Sabarkantha (Himmatnagar)', lat: 23.5979, lon: 72.9698 },
      { name: 'Surat', lat: 21.1702, lon: 72.8311 },
      { name: 'Vadodara', lat: 22.3072, lon: 73.1812 },
      { name: 'Valsad', lat: 20.5992, lon: 72.9342 },
    ],
  },
  {
    state: 'Maharashtra',
    districts: [
      { name: 'Ahmednagar', lat: 19.0948, lon: 74.748 },
      { name: 'Akola', lat: 20.7002, lon: 77.0082 },
      { name: 'Amravati', lat: 20.9374, lon: 77.7796 },
      { name: 'Chhatrapati Sambhajinagar (Aurangabad)', lat: 19.8762, lon: 75.3433 },
      { name: 'Kolhapur', lat: 16.705, lon: 74.2433 },
      { name: 'Mumbai City', lat: 18.9388, lon: 72.8353 },
      { name: 'Nagpur', lat: 21.1458, lon: 79.0882 },
      { name: 'Nashik', lat: 19.9975, lon: 73.7898 },
      { name: 'Pune', lat: 18.5204, lon: 73.8567 },
      { name: 'Sangli', lat: 16.8524, lon: 74.5815 },
      { name: 'Satara', lat: 17.6805, lon: 74.0183 },
      { name: 'Solapur', lat: 17.6599, lon: 75.9064 },
    ],
  },
  {
    state: 'Punjab',
    districts: [
      { name: 'Amritsar', lat: 31.634, lon: 74.8723 },
      { name: 'Bhatinda', lat: 30.211, lon: 74.9455 },
      { name: 'Firozpur', lat: 30.9237, lon: 74.6125 },
      { name: 'Jalandhar', lat: 31.326, lon: 75.5762 },
      { name: 'Ludhiana', lat: 30.901, lon: 75.8573 },
      { name: 'Patiala', lat: 30.3398, lon: 76.3869 },
    ],
  },
  {
    state: 'Uttar Pradesh',
    districts: [
      { name: 'Agra', lat: 27.1767, lon: 78.0081 },
      { name: 'Aligarh', lat: 27.8974, lon: 78.088 },
      { name: 'Ayodhya', lat: 26.7922, lon: 82.1998 },
      { name: 'Bareilly', lat: 28.367, lon: 79.4304 },
      { name: 'Gorakhpur', lat: 26.7606, lon: 83.3732 },
      { name: 'Kanpur Nagar', lat: 26.4499, lon: 80.3319 },
      { name: 'Lucknow', lat: 26.8467, lon: 80.9462 },
      { name: 'Mathura', lat: 27.4924, lon: 77.6737 },
      { name: 'Meerut', lat: 28.9845, lon: 77.7064 },
      { name: 'Varanasi', lat: 25.3176, lon: 82.9739 },
    ],
  },
  {
    state: 'Madhya Pradesh',
    districts: [
      { name: 'Bhopal', lat: 23.2599, lon: 77.4126 },
      { name: 'Gwalior', lat: 26.2183, lon: 78.1772 },
      { name: 'Indore', lat: 22.7196, lon: 75.8577 },
      { name: 'Jabalpur', lat: 23.1815, lon: 79.9864 },
      { name: 'Ujjain', lat: 23.1765, lon: 75.7885 },
    ],
  },
  {
    state: 'Rajasthan',
    districts: [
      { name: 'Ajmer', lat: 26.4499, lon: 74.6399 },
      { name: 'Alwar', lat: 27.553, lon: 76.6346 },
      { name: 'Bikaner', lat: 28.0229, lon: 73.3119 },
      { name: 'Jaipur', lat: 26.9124, lon: 75.7873 },
      { name: 'Jodhpur', lat: 26.2389, lon: 73.0243 },
      { name: 'Kota', lat: 25.2138, lon: 75.8648 },
      { name: 'Udaipur', lat: 24.5854, lon: 73.7125 },
    ],
  },
  {
    state: 'Karnataka',
    districts: [
      { name: 'Bengaluru Urban', lat: 12.9716, lon: 77.5946 },
      { name: 'Belagavi', lat: 15.8497, lon: 74.4977 },
      { name: 'Dharwad (Hubballi)', lat: 15.3647, lon: 75.124 },
      { name: 'Mysuru', lat: 12.2958, lon: 76.6394 },
      { name: 'Shivamogga', lat: 13.9299, lon: 75.5681 },
    ],
  },
  {
    state: 'Tamil Nadu',
    districts: [
      { name: 'Coimbatore', lat: 11.0168, lon: 76.9558 },
      { name: 'Dindigul', lat: 10.3673, lon: 77.9803 },
      { name: 'Erode', lat: 11.341, lon: 77.7172 },
      { name: 'Madurai', lat: 9.9252, lon: 78.1198 },
      { name: 'Salem', lat: 11.6643, lon: 78.146 },
      { name: 'Tiruchirappalli', lat: 10.7905, lon: 78.7047 },
    ],
  },
  {
    state: 'Haryana',
    districts: [
      { name: 'Ambala', lat: 30.3782, lon: 76.7767 },
      { name: 'Gurugram', lat: 28.4595, lon: 77.0266 },
      { name: 'Hisar', lat: 29.1492, lon: 75.7217 },
      { name: 'Karnal', lat: 29.6857, lon: 76.9905 },
      { name: 'Rohtak', lat: 28.8955, lon: 76.6066 },
    ],
  },
  {
    state: 'Andhra Pradesh',
    districts: [
      { name: 'Guntur', lat: 16.3067, lon: 80.4365 },
      { name: 'Kurnool', lat: 15.8281, lon: 78.0373 },
      { name: 'Tirupati', lat: 13.6288, lon: 79.4192 },
      { name: 'Vijayawada (NTR)', lat: 16.5062, lon: 80.648 },
      { name: 'Visakhapatnam', lat: 17.6868, lon: 83.2185 },
    ],
  },
  {
    state: 'Telangana',
    districts: [
      { name: 'Hyderabad', lat: 17.385, lon: 78.4867 },
      { name: 'Karimnagar', lat: 18.4386, lon: 79.1288 },
      { name: 'Khammam', lat: 17.2473, lon: 80.1514 },
      { name: 'Nizamabad', lat: 18.6725, lon: 78.0941 },
      { name: 'Warangal', lat: 17.9689, lon: 79.5941 },
    ],
  },
  {
    state: 'West Bengal',
    districts: [
      { name: 'Bankura', lat: 23.2313, lon: 87.0784 },
      { name: 'Bardhaman', lat: 23.2324, lon: 87.8615 },
      { name: 'Hooghly', lat: 22.9034, lon: 88.3965 },
      { name: 'Malda', lat: 25.0108, lon: 88.1411 },
      { name: 'Nadia (Krishnanagar)', lat: 23.4013, lon: 88.4963 },
    ],
  },
];

export function findDistrictCoordinates(stateName?: string, districtName?: string): { lat: number; lon: number } {
  if (!stateName || !districtName) {
    return { lat: 22.5645, lon: 72.9289 }; // Anand, Gujarat default
  }

  const stateObj = INDIA_LOCATIONS.find((s) => s.state.toLowerCase() === stateName.toLowerCase());
  if (!stateObj) {
    return { lat: 22.5645, lon: 72.9289 };
  }

  const distObj = stateObj.districts.find(
    (d) => d.name.toLowerCase().includes(districtName.toLowerCase()) || districtName.toLowerCase().includes(d.name.toLowerCase())
  );

  if (distObj) {
    return { lat: distObj.lat, lon: distObj.lon };
  }

  return { lat: stateObj.districts[0].lat, lon: stateObj.districts[0].lon };
}
