/**
 * Golden fixtures frozen from the MIT-licensed reference engine
 * bigfishmarquis-qimen @ 6112b3937d7fcaa2ab0a34aec2a52f74e2effe6c on
 * 2026-08-28. Discrete inputs come from our own lunar-typescript
 * normalization (calendar golden tests); school outputs are the
 * recorded reference results.
 */

export interface JuFixture {
  dun: 'yang' | 'yin';
  juNumber: number;
  yuan: string;
  chaoShenDays?: number;
  isZhiRun?: boolean;
  chart?: {
    zhiFuStar: string; zhiShiDoor: string;
    zhiFuPalace: number; zhiShiPalace: number;
    kongWang: string[];
    palaces: { palace: number; earth: string; heaven: string; star: string; door: string; god: string }[];
  };
}

export interface QimenFixture {
  stamp: string;
  input: {
    solarTerm: string; dayGanZhi: string; hourGanZhi: string; hour: number;
    dayGzIndex: number; daysSinceJieQi: number; nextSolarTerm: string; elapsedHours: number;
  };
  schools: Record<string, JuFixture>;
}

export const QIMEN_FIXTURES: readonly QimenFixture[] = [
  {
    "stamp": "1986-05-29 00:00",
    "input": {
      "solarTerm": "小满",
      "dayGanZhi": "癸酉",
      "hourGanZhi": "壬子",
      "hour": 0,
      "dayGzIndex": 9,
      "daysSinceJieQi": 8,
      "nextSolarTerm": "芒种",
      "elapsedHours": 175.55
    },
    "schools": {
      "chai-bu": {
        "dun": "yang",
        "juNumber": 2,
        "yuan": "中",
        "chart": {
          "zhiFuStar": "天心",
          "zhiShiDoor": "开门",
          "zhiFuPalace": 6,
          "zhiShiPalace": 2,
          "kongWang": [
            "寅",
            "卯"
          ],
          "palaces": [
            {
              "palace": 1,
              "earth": "乙",
              "heaven": "乙",
              "star": "天蓬",
              "door": "伤门",
              "god": "腾蛇"
            },
            {
              "palace": 2,
              "earth": "戊",
              "heaven": "戊",
              "star": "天芮",
              "door": "开门",
              "god": "九地"
            },
            {
              "palace": 3,
              "earth": "己",
              "heaven": "己",
              "star": "天冲",
              "door": "景门",
              "god": "六合"
            },
            {
              "palace": 4,
              "earth": "庚",
              "heaven": "庚",
              "star": "天辅",
              "door": "死门",
              "god": "白虎"
            },
            {
              "palace": 5,
              "earth": "辛",
              "heaven": "",
              "star": "天禽",
              "door": "",
              "god": ""
            },
            {
              "palace": 6,
              "earth": "壬",
              "heaven": "壬",
              "star": "天心",
              "door": "生门",
              "god": "值符"
            },
            {
              "palace": 7,
              "earth": "癸",
              "heaven": "癸",
              "star": "天柱",
              "door": "休门",
              "god": "九天"
            },
            {
              "palace": 8,
              "earth": "丁",
              "heaven": "丁",
              "star": "天任",
              "door": "杜门",
              "god": "太阴"
            },
            {
              "palace": 9,
              "earth": "丙",
              "heaven": "丙",
              "star": "天英",
              "door": "惊门",
              "god": "玄武"
            }
          ]
        }
      },
      "zhi-run": {
        "dun": "yang",
        "juNumber": 2,
        "yuan": "中",
        "chaoShenDays": 1,
        "isZhiRun": false,
        "chart": {
          "zhiFuStar": "天心",
          "zhiShiDoor": "开门",
          "zhiFuPalace": 6,
          "zhiShiPalace": 2,
          "kongWang": [
            "寅",
            "卯"
          ],
          "palaces": [
            {
              "palace": 1,
              "earth": "乙",
              "heaven": "乙",
              "star": "天蓬",
              "door": "伤门",
              "god": "腾蛇"
            },
            {
              "palace": 2,
              "earth": "戊",
              "heaven": "戊",
              "star": "天芮",
              "door": "开门",
              "god": "九地"
            },
            {
              "palace": 3,
              "earth": "己",
              "heaven": "己",
              "star": "天冲",
              "door": "景门",
              "god": "六合"
            },
            {
              "palace": 4,
              "earth": "庚",
              "heaven": "庚",
              "star": "天辅",
              "door": "死门",
              "god": "白虎"
            },
            {
              "palace": 5,
              "earth": "辛",
              "heaven": "",
              "star": "天禽",
              "door": "",
              "god": ""
            },
            {
              "palace": 6,
              "earth": "壬",
              "heaven": "壬",
              "star": "天心",
              "door": "生门",
              "god": "值符"
            },
            {
              "palace": 7,
              "earth": "癸",
              "heaven": "癸",
              "star": "天柱",
              "door": "休门",
              "god": "九天"
            },
            {
              "palace": 8,
              "earth": "丁",
              "heaven": "丁",
              "star": "天任",
              "door": "杜门",
              "god": "太阴"
            },
            {
              "palace": 9,
              "earth": "丙",
              "heaven": "丙",
              "star": "天英",
              "door": "惊门",
              "god": "玄武"
            }
          ]
        }
      },
      "mao-shan": {
        "dun": "yang",
        "juNumber": 2,
        "yuan": "中",
        "chart": {
          "zhiFuStar": "天心",
          "zhiShiDoor": "开门",
          "zhiFuPalace": 6,
          "zhiShiPalace": 2,
          "kongWang": [
            "寅",
            "卯"
          ],
          "palaces": [
            {
              "palace": 1,
              "earth": "乙",
              "heaven": "乙",
              "star": "天蓬",
              "door": "伤门",
              "god": "腾蛇"
            },
            {
              "palace": 2,
              "earth": "戊",
              "heaven": "戊",
              "star": "天芮",
              "door": "开门",
              "god": "九地"
            },
            {
              "palace": 3,
              "earth": "己",
              "heaven": "己",
              "star": "天冲",
              "door": "景门",
              "god": "六合"
            },
            {
              "palace": 4,
              "earth": "庚",
              "heaven": "庚",
              "star": "天辅",
              "door": "死门",
              "god": "白虎"
            },
            {
              "palace": 5,
              "earth": "辛",
              "heaven": "",
              "star": "天禽",
              "door": "",
              "god": ""
            },
            {
              "palace": 6,
              "earth": "壬",
              "heaven": "壬",
              "star": "天心",
              "door": "生门",
              "god": "值符"
            },
            {
              "palace": 7,
              "earth": "癸",
              "heaven": "癸",
              "star": "天柱",
              "door": "休门",
              "god": "九天"
            },
            {
              "palace": 8,
              "earth": "丁",
              "heaven": "丁",
              "star": "天任",
              "door": "杜门",
              "god": "太阴"
            },
            {
              "palace": 9,
              "earth": "丙",
              "heaven": "丙",
              "star": "天英",
              "door": "惊门",
              "god": "玄武"
            }
          ]
        }
      }
    }
  },
  {
    "stamp": "1986-05-29 23:30",
    "input": {
      "solarTerm": "小满",
      "dayGanZhi": "癸酉",
      "hourGanZhi": "甲子",
      "hour": 23,
      "dayGzIndex": 9,
      "daysSinceJieQi": 8,
      "nextSolarTerm": "芒种",
      "elapsedHours": 199.05
    },
    "schools": {
      "chai-bu": {
        "dun": "yang",
        "juNumber": 8,
        "yuan": "下"
      },
      "zhi-run": {
        "dun": "yang",
        "juNumber": 2,
        "yuan": "中",
        "chaoShenDays": 1,
        "isZhiRun": false
      },
      "mao-shan": {
        "dun": "yang",
        "juNumber": 2,
        "yuan": "中"
      }
    }
  },
  {
    "stamp": "2024-02-04 12:00",
    "input": {
      "solarTerm": "大寒",
      "dayGanZhi": "戊戌",
      "hourGanZhi": "戊午",
      "hour": 12,
      "dayGzIndex": 34,
      "daysSinceJieQi": 15,
      "nextSolarTerm": "立春",
      "elapsedHours": 349.883
    },
    "schools": {
      "chai-bu": {
        "dun": "yang",
        "juNumber": 3,
        "yuan": "上"
      },
      "zhi-run": {
        "dun": "yang",
        "juNumber": 8,
        "yuan": "上",
        "chaoShenDays": 4,
        "isZhiRun": false
      },
      "mao-shan": {
        "dun": "yang",
        "juNumber": 6,
        "yuan": "下"
      }
    }
  },
  {
    "stamp": "2024-02-04 18:00",
    "input": {
      "solarTerm": "立春",
      "dayGanZhi": "戊戌",
      "hourGanZhi": "辛酉",
      "hour": 18,
      "dayGzIndex": 34,
      "daysSinceJieQi": 0,
      "nextSolarTerm": "雨水",
      "elapsedHours": 1.55
    },
    "schools": {
      "chai-bu": {
        "dun": "yang",
        "juNumber": 8,
        "yuan": "上",
        "chart": {
          "zhiFuStar": "天辅",
          "zhiShiDoor": "杜门",
          "zhiFuPalace": 2,
          "zhiShiPalace": 2,
          "kongWang": [
            "子",
            "丑"
          ],
          "palaces": [
            {
              "palace": 1,
              "earth": "庚",
              "heaven": "乙",
              "star": "天柱",
              "door": "惊门",
              "god": "六合"
            },
            {
              "palace": 2,
              "earth": "辛",
              "heaven": "癸",
              "star": "天辅",
              "door": "杜门",
              "god": "值符"
            },
            {
              "palace": 3,
              "earth": "壬",
              "heaven": "庚",
              "star": "天蓬",
              "door": "休门",
              "god": "玄武"
            },
            {
              "palace": 4,
              "earth": "癸",
              "heaven": "戊",
              "star": "天任",
              "door": "生门",
              "god": "九地"
            },
            {
              "palace": 5,
              "earth": "丁",
              "heaven": "",
              "star": "天禽",
              "door": "",
              "god": ""
            },
            {
              "palace": 6,
              "earth": "丙",
              "heaven": "辛",
              "star": "天芮",
              "door": "死门",
              "god": "太阴"
            },
            {
              "palace": 7,
              "earth": "乙",
              "heaven": "己",
              "star": "天英",
              "door": "景门",
              "god": "腾蛇"
            },
            {
              "palace": 8,
              "earth": "戊",
              "heaven": "丙",
              "star": "天心",
              "door": "开门",
              "god": "白虎"
            },
            {
              "palace": 9,
              "earth": "己",
              "heaven": "壬",
              "star": "天冲",
              "door": "伤门",
              "god": "九天"
            }
          ]
        }
      },
      "zhi-run": {
        "dun": "yang",
        "juNumber": 8,
        "yuan": "上",
        "chaoShenDays": 4,
        "isZhiRun": false,
        "chart": {
          "zhiFuStar": "天辅",
          "zhiShiDoor": "杜门",
          "zhiFuPalace": 2,
          "zhiShiPalace": 2,
          "kongWang": [
            "子",
            "丑"
          ],
          "palaces": [
            {
              "palace": 1,
              "earth": "庚",
              "heaven": "乙",
              "star": "天柱",
              "door": "惊门",
              "god": "六合"
            },
            {
              "palace": 2,
              "earth": "辛",
              "heaven": "癸",
              "star": "天辅",
              "door": "杜门",
              "god": "值符"
            },
            {
              "palace": 3,
              "earth": "壬",
              "heaven": "庚",
              "star": "天蓬",
              "door": "休门",
              "god": "玄武"
            },
            {
              "palace": 4,
              "earth": "癸",
              "heaven": "戊",
              "star": "天任",
              "door": "生门",
              "god": "九地"
            },
            {
              "palace": 5,
              "earth": "丁",
              "heaven": "",
              "star": "天禽",
              "door": "",
              "god": ""
            },
            {
              "palace": 6,
              "earth": "丙",
              "heaven": "辛",
              "star": "天芮",
              "door": "死门",
              "god": "太阴"
            },
            {
              "palace": 7,
              "earth": "乙",
              "heaven": "己",
              "star": "天英",
              "door": "景门",
              "god": "腾蛇"
            },
            {
              "palace": 8,
              "earth": "戊",
              "heaven": "丙",
              "star": "天心",
              "door": "开门",
              "god": "白虎"
            },
            {
              "palace": 9,
              "earth": "己",
              "heaven": "壬",
              "star": "天冲",
              "door": "伤门",
              "god": "九天"
            }
          ]
        }
      },
      "mao-shan": {
        "dun": "yang",
        "juNumber": 8,
        "yuan": "上",
        "chart": {
          "zhiFuStar": "天辅",
          "zhiShiDoor": "杜门",
          "zhiFuPalace": 2,
          "zhiShiPalace": 2,
          "kongWang": [
            "子",
            "丑"
          ],
          "palaces": [
            {
              "palace": 1,
              "earth": "庚",
              "heaven": "乙",
              "star": "天柱",
              "door": "惊门",
              "god": "六合"
            },
            {
              "palace": 2,
              "earth": "辛",
              "heaven": "癸",
              "star": "天辅",
              "door": "杜门",
              "god": "值符"
            },
            {
              "palace": 3,
              "earth": "壬",
              "heaven": "庚",
              "star": "天蓬",
              "door": "休门",
              "god": "玄武"
            },
            {
              "palace": 4,
              "earth": "癸",
              "heaven": "戊",
              "star": "天任",
              "door": "生门",
              "god": "九地"
            },
            {
              "palace": 5,
              "earth": "丁",
              "heaven": "",
              "star": "天禽",
              "door": "",
              "god": ""
            },
            {
              "palace": 6,
              "earth": "丙",
              "heaven": "辛",
              "star": "天芮",
              "door": "死门",
              "god": "太阴"
            },
            {
              "palace": 7,
              "earth": "乙",
              "heaven": "己",
              "star": "天英",
              "door": "景门",
              "god": "腾蛇"
            },
            {
              "palace": 8,
              "earth": "戊",
              "heaven": "丙",
              "star": "天心",
              "door": "开门",
              "god": "白虎"
            },
            {
              "palace": 9,
              "earth": "己",
              "heaven": "壬",
              "star": "天冲",
              "door": "伤门",
              "god": "九天"
            }
          ]
        }
      }
    }
  },
  {
    "stamp": "2024-03-05 10:00",
    "input": {
      "solarTerm": "雨水",
      "dayGanZhi": "戊辰",
      "hourGanZhi": "丁巳",
      "hour": 10,
      "dayGzIndex": 4,
      "daysSinceJieQi": 15,
      "nextSolarTerm": "惊蛰",
      "elapsedHours": 357.783
    },
    "schools": {
      "chai-bu": {
        "dun": "yang",
        "juNumber": 9,
        "yuan": "上"
      },
      "zhi-run": {
        "dun": "yang",
        "juNumber": 1,
        "yuan": "上",
        "chaoShenDays": 4,
        "isZhiRun": false
      },
      "mao-shan": {
        "dun": "yang",
        "juNumber": 3,
        "yuan": "下"
      }
    }
  },
  {
    "stamp": "2024-03-05 11:00",
    "input": {
      "solarTerm": "惊蛰",
      "dayGanZhi": "戊辰",
      "hourGanZhi": "戊午",
      "hour": 11,
      "dayGzIndex": 4,
      "daysSinceJieQi": 0,
      "nextSolarTerm": "春分",
      "elapsedHours": 0.633
    },
    "schools": {
      "chai-bu": {
        "dun": "yang",
        "juNumber": 1,
        "yuan": "上"
      },
      "zhi-run": {
        "dun": "yang",
        "juNumber": 1,
        "yuan": "上",
        "chaoShenDays": 4,
        "isZhiRun": false
      },
      "mao-shan": {
        "dun": "yang",
        "juNumber": 1,
        "yuan": "上"
      }
    }
  },
  {
    "stamp": "2024-06-15 14:30",
    "input": {
      "solarTerm": "芒种",
      "dayGanZhi": "庚戌",
      "hourGanZhi": "癸未",
      "hour": 14,
      "dayGzIndex": 46,
      "daysSinceJieQi": 10,
      "nextSolarTerm": "夏至",
      "elapsedHours": 242.35
    },
    "schools": {
      "chai-bu": {
        "dun": "yang",
        "juNumber": 6,
        "yuan": "上"
      },
      "zhi-run": {
        "dun": "yin",
        "juNumber": 9,
        "yuan": "上",
        "chaoShenDays": 6,
        "isZhiRun": false
      },
      "mao-shan": {
        "dun": "yang",
        "juNumber": 9,
        "yuan": "下"
      }
    }
  },
  {
    "stamp": "2024-06-20 10:00",
    "input": {
      "solarTerm": "芒种",
      "dayGanZhi": "乙卯",
      "hourGanZhi": "辛巳",
      "hour": 10,
      "dayGzIndex": 51,
      "daysSinceJieQi": 15,
      "nextSolarTerm": "夏至",
      "elapsedHours": 357.85
    },
    "schools": {
      "chai-bu": {
        "dun": "yang",
        "juNumber": 3,
        "yuan": "中"
      },
      "zhi-run": {
        "dun": "yin",
        "juNumber": 3,
        "yuan": "中",
        "chaoShenDays": 6,
        "isZhiRun": false
      },
      "mao-shan": {
        "dun": "yang",
        "juNumber": 9,
        "yuan": "下"
      }
    }
  },
  {
    "stamp": "2024-06-21 10:00",
    "input": {
      "solarTerm": "夏至",
      "dayGanZhi": "丙辰",
      "hourGanZhi": "癸巳",
      "hour": 10,
      "dayGzIndex": 52,
      "daysSinceJieQi": 0,
      "nextSolarTerm": "小暑",
      "elapsedHours": 5.15
    },
    "schools": {
      "chai-bu": {
        "dun": "yin",
        "juNumber": 3,
        "yuan": "中",
        "chart": {
          "zhiFuStar": "天蓬",
          "zhiShiDoor": "休门",
          "zhiFuPalace": 7,
          "zhiShiPalace": 1,
          "kongWang": [
            "午",
            "未"
          ],
          "palaces": [
            {
              "palace": 1,
              "earth": "庚",
              "heaven": "戊",
              "star": "天冲",
              "door": "休门",
              "god": "九地"
            },
            {
              "palace": 2,
              "earth": "己",
              "heaven": "丁",
              "star": "天心",
              "door": "死门",
              "god": "腾蛇"
            },
            {
              "palace": 3,
              "earth": "戊",
              "heaven": "辛",
              "star": "天英",
              "door": "伤门",
              "god": "白虎"
            },
            {
              "palace": 4,
              "earth": "乙",
              "heaven": "己",
              "star": "天芮",
              "door": "杜门",
              "god": "六合"
            },
            {
              "palace": 5,
              "earth": "丙",
              "heaven": "",
              "star": "天禽",
              "door": "",
              "god": ""
            },
            {
              "palace": 6,
              "earth": "丁",
              "heaven": "壬",
              "star": "天任",
              "door": "开门",
              "god": "九天"
            },
            {
              "palace": 7,
              "earth": "癸",
              "heaven": "庚",
              "star": "天蓬",
              "door": "惊门",
              "god": "值符"
            },
            {
              "palace": 8,
              "earth": "壬",
              "heaven": "乙",
              "star": "天辅",
              "door": "生门",
              "god": "玄武"
            },
            {
              "palace": 9,
              "earth": "辛",
              "heaven": "癸",
              "star": "天柱",
              "door": "景门",
              "god": "太阴"
            }
          ]
        }
      },
      "zhi-run": {
        "dun": "yin",
        "juNumber": 3,
        "yuan": "中",
        "chaoShenDays": 7,
        "isZhiRun": false,
        "chart": {
          "zhiFuStar": "天蓬",
          "zhiShiDoor": "休门",
          "zhiFuPalace": 7,
          "zhiShiPalace": 1,
          "kongWang": [
            "午",
            "未"
          ],
          "palaces": [
            {
              "palace": 1,
              "earth": "庚",
              "heaven": "戊",
              "star": "天冲",
              "door": "休门",
              "god": "九地"
            },
            {
              "palace": 2,
              "earth": "己",
              "heaven": "丁",
              "star": "天心",
              "door": "死门",
              "god": "腾蛇"
            },
            {
              "palace": 3,
              "earth": "戊",
              "heaven": "辛",
              "star": "天英",
              "door": "伤门",
              "god": "白虎"
            },
            {
              "palace": 4,
              "earth": "乙",
              "heaven": "己",
              "star": "天芮",
              "door": "杜门",
              "god": "六合"
            },
            {
              "palace": 5,
              "earth": "丙",
              "heaven": "",
              "star": "天禽",
              "door": "",
              "god": ""
            },
            {
              "palace": 6,
              "earth": "丁",
              "heaven": "壬",
              "star": "天任",
              "door": "开门",
              "god": "九天"
            },
            {
              "palace": 7,
              "earth": "癸",
              "heaven": "庚",
              "star": "天蓬",
              "door": "惊门",
              "god": "值符"
            },
            {
              "palace": 8,
              "earth": "壬",
              "heaven": "乙",
              "star": "天辅",
              "door": "生门",
              "god": "玄武"
            },
            {
              "palace": 9,
              "earth": "辛",
              "heaven": "癸",
              "star": "天柱",
              "door": "景门",
              "god": "太阴"
            }
          ]
        }
      },
      "mao-shan": {
        "dun": "yin",
        "juNumber": 9,
        "yuan": "上",
        "chart": {
          "zhiFuStar": "天柱",
          "zhiShiDoor": "惊门",
          "zhiFuPalace": 4,
          "zhiShiPalace": 7,
          "kongWang": [
            "午",
            "未"
          ],
          "palaces": [
            {
              "palace": 1,
              "earth": "乙",
              "heaven": "癸",
              "star": "天辅",
              "door": "休门",
              "god": "六合"
            },
            {
              "palace": 2,
              "earth": "丙",
              "heaven": "乙",
              "star": "天蓬",
              "door": "死门",
              "god": "九地"
            },
            {
              "palace": 3,
              "earth": "丁",
              "heaven": "丙",
              "star": "天芮",
              "door": "伤门",
              "god": "腾蛇"
            },
            {
              "palace": 4,
              "earth": "癸",
              "heaven": "庚",
              "star": "天柱",
              "door": "杜门",
              "god": "值符"
            },
            {
              "palace": 5,
              "earth": "壬",
              "heaven": "",
              "star": "天禽",
              "door": "",
              "god": ""
            },
            {
              "palace": 6,
              "earth": "辛",
              "heaven": "丁",
              "star": "天冲",
              "door": "开门",
              "god": "白虎"
            },
            {
              "palace": 7,
              "earth": "庚",
              "heaven": "己",
              "star": "天任",
              "door": "惊门",
              "god": "玄武"
            },
            {
              "palace": 8,
              "earth": "己",
              "heaven": "戊",
              "star": "天英",
              "door": "生门",
              "god": "太阴"
            },
            {
              "palace": 9,
              "earth": "戊",
              "heaven": "辛",
              "star": "天心",
              "door": "景门",
              "god": "九天"
            }
          ]
        }
      }
    }
  },
  {
    "stamp": "2024-08-07 09:00",
    "input": {
      "solarTerm": "立秋",
      "dayGanZhi": "癸卯",
      "hourGanZhi": "丁巳",
      "hour": 9,
      "dayGzIndex": 39,
      "daysSinceJieQi": 0,
      "nextSolarTerm": "处暑",
      "elapsedHours": 0.85
    },
    "schools": {
      "chai-bu": {
        "dun": "yin",
        "juNumber": 5,
        "yuan": "中"
      },
      "zhi-run": {
        "dun": "yin",
        "juNumber": 5,
        "yuan": "中",
        "chaoShenDays": 9,
        "isZhiRun": false
      },
      "mao-shan": {
        "dun": "yin",
        "juNumber": 2,
        "yuan": "上"
      }
    }
  },
  {
    "stamp": "2024-12-21 12:00",
    "input": {
      "solarTerm": "大雪",
      "dayGanZhi": "己未",
      "hourGanZhi": "庚午",
      "hour": 12,
      "dayGzIndex": 55,
      "daysSinceJieQi": 15,
      "nextSolarTerm": "冬至",
      "elapsedHours": 348.717
    },
    "schools": {
      "chai-bu": {
        "dun": "yin",
        "juNumber": 1,
        "yuan": "下"
      },
      "zhi-run": {
        "dun": "yin",
        "juNumber": 1,
        "yuan": "下",
        "chaoShenDays": 10,
        "isZhiRun": true
      },
      "mao-shan": {
        "dun": "yin",
        "juNumber": 1,
        "yuan": "下"
      }
    }
  },
  {
    "stamp": "2024-12-21 20:00",
    "input": {
      "solarTerm": "冬至",
      "dayGanZhi": "己未",
      "hourGanZhi": "甲戌",
      "hour": 20,
      "dayGzIndex": 55,
      "daysSinceJieQi": 0,
      "nextSolarTerm": "小寒",
      "elapsedHours": 2.667
    },
    "schools": {
      "chai-bu": {
        "dun": "yang",
        "juNumber": 4,
        "yuan": "下",
        "chart": {
          "zhiFuStar": "天禽",
          "zhiShiDoor": "死门",
          "zhiFuPalace": 2,
          "zhiShiPalace": 2,
          "kongWang": [
            "申",
            "酉"
          ],
          "palaces": [
            {
              "palace": 1,
              "earth": "丁",
              "heaven": "丁",
              "star": "天蓬",
              "door": "休门",
              "god": "六合"
            },
            {
              "palace": 2,
              "earth": "丙",
              "heaven": "丙",
              "star": "天芮",
              "door": "死门",
              "god": "值符"
            },
            {
              "palace": 3,
              "earth": "乙",
              "heaven": "乙",
              "star": "天冲",
              "door": "伤门",
              "god": "玄武"
            },
            {
              "palace": 4,
              "earth": "戊",
              "heaven": "戊",
              "star": "天辅",
              "door": "杜门",
              "god": "九地"
            },
            {
              "palace": 5,
              "earth": "己",
              "heaven": "",
              "star": "天禽",
              "door": "",
              "god": ""
            },
            {
              "palace": 6,
              "earth": "庚",
              "heaven": "庚",
              "star": "天心",
              "door": "开门",
              "god": "太阴"
            },
            {
              "palace": 7,
              "earth": "辛",
              "heaven": "辛",
              "star": "天柱",
              "door": "惊门",
              "god": "腾蛇"
            },
            {
              "palace": 8,
              "earth": "壬",
              "heaven": "壬",
              "star": "天任",
              "door": "生门",
              "god": "白虎"
            },
            {
              "palace": 9,
              "earth": "癸",
              "heaven": "癸",
              "star": "天英",
              "door": "景门",
              "god": "九天"
            }
          ]
        }
      },
      "zhi-run": {
        "dun": "yin",
        "juNumber": 1,
        "yuan": "下",
        "chaoShenDays": 10,
        "isZhiRun": true,
        "chart": {
          "zhiFuStar": "天英",
          "zhiShiDoor": "景门",
          "zhiFuPalace": 9,
          "zhiShiPalace": 9,
          "kongWang": [
            "申",
            "酉"
          ],
          "palaces": [
            {
              "palace": 1,
              "earth": "戊",
              "heaven": "戊",
              "star": "天蓬",
              "door": "休门",
              "god": "白虎"
            },
            {
              "palace": 2,
              "earth": "乙",
              "heaven": "乙",
              "star": "天芮",
              "door": "死门",
              "god": "九天"
            },
            {
              "palace": 3,
              "earth": "丙",
              "heaven": "丙",
              "star": "天冲",
              "door": "伤门",
              "god": "太阴"
            },
            {
              "palace": 4,
              "earth": "丁",
              "heaven": "丁",
              "star": "天辅",
              "door": "杜门",
              "god": "腾蛇"
            },
            {
              "palace": 5,
              "earth": "癸",
              "heaven": "",
              "star": "天禽",
              "door": "",
              "god": ""
            },
            {
              "palace": 6,
              "earth": "壬",
              "heaven": "壬",
              "star": "天心",
              "door": "开门",
              "god": "玄武"
            },
            {
              "palace": 7,
              "earth": "辛",
              "heaven": "辛",
              "star": "天柱",
              "door": "惊门",
              "god": "九地"
            },
            {
              "palace": 8,
              "earth": "庚",
              "heaven": "庚",
              "star": "天任",
              "door": "生门",
              "god": "六合"
            },
            {
              "palace": 9,
              "earth": "己",
              "heaven": "己",
              "star": "天英",
              "door": "景门",
              "god": "值符"
            }
          ]
        }
      },
      "mao-shan": {
        "dun": "yang",
        "juNumber": 1,
        "yuan": "上",
        "chart": {
          "zhiFuStar": "天芮",
          "zhiShiDoor": "死门",
          "zhiFuPalace": 2,
          "zhiShiPalace": 2,
          "kongWang": [
            "申",
            "酉"
          ],
          "palaces": [
            {
              "palace": 1,
              "earth": "戊",
              "heaven": "戊",
              "star": "天蓬",
              "door": "休门",
              "god": "六合"
            },
            {
              "palace": 2,
              "earth": "己",
              "heaven": "己",
              "star": "天芮",
              "door": "死门",
              "god": "值符"
            },
            {
              "palace": 3,
              "earth": "庚",
              "heaven": "庚",
              "star": "天冲",
              "door": "伤门",
              "god": "玄武"
            },
            {
              "palace": 4,
              "earth": "辛",
              "heaven": "辛",
              "star": "天辅",
              "door": "杜门",
              "god": "九地"
            },
            {
              "palace": 5,
              "earth": "壬",
              "heaven": "",
              "star": "天禽",
              "door": "",
              "god": ""
            },
            {
              "palace": 6,
              "earth": "癸",
              "heaven": "癸",
              "star": "天心",
              "door": "开门",
              "god": "太阴"
            },
            {
              "palace": 7,
              "earth": "丁",
              "heaven": "丁",
              "star": "天柱",
              "door": "惊门",
              "god": "腾蛇"
            },
            {
              "palace": 8,
              "earth": "丙",
              "heaven": "丙",
              "star": "天任",
              "door": "生门",
              "god": "白虎"
            },
            {
              "palace": 9,
              "earth": "乙",
              "heaven": "乙",
              "star": "天英",
              "door": "景门",
              "god": "九天"
            }
          ]
        }
      }
    }
  },
  {
    "stamp": "2025-01-05 12:00",
    "input": {
      "solarTerm": "小寒",
      "dayGanZhi": "甲戌",
      "hourGanZhi": "庚午",
      "hour": 12,
      "dayGzIndex": 10,
      "daysSinceJieQi": 0,
      "nextSolarTerm": "大寒",
      "elapsedHours": 1.467
    },
    "schools": {
      "chai-bu": {
        "dun": "yang",
        "juNumber": 5,
        "yuan": "下"
      },
      "zhi-run": {
        "dun": "yang",
        "juNumber": 5,
        "yuan": "下",
        "chaoShenDays": 10,
        "isZhiRun": false
      },
      "mao-shan": {
        "dun": "yang",
        "juNumber": 2,
        "yuan": "上"
      }
    }
  },
  {
    "stamp": "1995-12-20 12:00",
    "input": {
      "solarTerm": "大雪",
      "dayGanZhi": "乙酉",
      "hourGanZhi": "壬午",
      "hour": 12,
      "dayGzIndex": 21,
      "daysSinceJieQi": 13,
      "nextSolarTerm": "冬至",
      "elapsedHours": 301.633
    },
    "schools": {
      "chai-bu": {
        "dun": "yin",
        "juNumber": 7,
        "yuan": "中"
      },
      "zhi-run": {
        "dun": "yang",
        "juNumber": 7,
        "yuan": "中",
        "chaoShenDays": 8,
        "isZhiRun": false
      },
      "mao-shan": {
        "dun": "yin",
        "juNumber": 1,
        "yuan": "下"
      }
    }
  },
  {
    "stamp": "1996-06-15 12:00",
    "input": {
      "solarTerm": "芒种",
      "dayGanZhi": "癸未",
      "hourGanZhi": "戊午",
      "hour": 12,
      "dayGzIndex": 19,
      "daysSinceJieQi": 10,
      "nextSolarTerm": "夏至",
      "elapsedHours": 234.333
    },
    "schools": {
      "chai-bu": {
        "dun": "yang",
        "juNumber": 6,
        "yuan": "上"
      },
      "zhi-run": {
        "dun": "yin",
        "juNumber": 9,
        "yuan": "上",
        "chaoShenDays": 9,
        "isZhiRun": false
      },
      "mao-shan": {
        "dun": "yang",
        "juNumber": 3,
        "yuan": "中"
      }
    }
  }
];
