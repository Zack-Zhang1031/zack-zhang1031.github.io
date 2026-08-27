/**
 * Built-in city longitudes for optional true-solar-time correction.
 * No geolocation is ever requested; users may also enter a manual
 * longitude. Values are approximate city-center east longitudes.
 */

export interface City {
  name: string;
  longitude: number;
}

export const CITIES: readonly City[] = [
  { name: '北京', longitude: 116.41 },
  { name: '上海', longitude: 121.47 },
  { name: '天津', longitude: 117.20 },
  { name: '重庆', longitude: 106.55 },
  { name: '广州', longitude: 113.26 },
  { name: '深圳', longitude: 114.06 },
  { name: '成都', longitude: 104.07 },
  { name: '西安', longitude: 108.94 },
  { name: '杭州', longitude: 120.16 },
  { name: '南京', longitude: 118.80 },
  { name: '武汉', longitude: 114.31 },
  { name: '哈尔滨', longitude: 126.63 },
  { name: '沈阳', longitude: 123.43 },
  { name: '昆明', longitude: 102.71 },
  { name: '拉萨', longitude: 91.12 },
  { name: '乌鲁木齐', longitude: 87.62 },
  { name: '喀什', longitude: 75.99 },
  { name: '香港', longitude: 114.17 },
  { name: '台北', longitude: 121.56 },
] as const;
