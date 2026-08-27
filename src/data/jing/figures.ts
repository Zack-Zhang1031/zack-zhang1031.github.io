/**
 * Sacred figure data for the Buddhist and Taoist reverence rooms.
 *
 * Every image record carries visible attribution and license metadata
 * verified in the source ledger. Buddhist and Taoist entries are separate
 * arrays and must never be merged by callers.
 */

export type Tradition = 'buddhist' | 'taoist';

export interface SacredFigure {
  id: string;
  tradition: Tradition;
  name: string;
  title: string;
  intro: string;
  image: {
    src: string;
    alt: string;
    attribution: string;
    license: string;
    sourceUrl: string;
  };
}

export const BUDDHIST_FIGURES: readonly SacredFigure[] = [
  {
    id: 'shakyamuni',
    tradition: 'buddhist',
    name: '释迦牟尼佛',
    title: '佛陀 · 世尊',
    intro:
      '释迦牟尼，本名乔达摩·悉达多，古印度迦毗罗卫国王子，舍弃王位出家求道，' +
      '于菩提树下觉悟，此后四十五年游历说法，教导众生认识苦的起因与止息之道。' +
      '佛教即由其教导发展而来。',
    image: {
      src: '/jing/images/shakyamuni.webp',
      alt: '十七世纪中叶释迦牟尼绘画，大都会艺术博物馆藏',
      attribution: '佚名，十七世纪中叶；大都会艺术博物馆藏',
      license: '公有领域',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:Buddha_Shakyamuni_as_Lord_of_the_Munis.jpg',
    },
  },
  {
    id: 'guanyin',
    tradition: 'buddhist',
    name: '观世音菩萨',
    title: '大慈大悲 · 闻声救苦',
    intro:
      '观世音，意为"观听世间音声"。菩萨以慈悲著称，众生遇苦称念其名，即寻声救苦。' +
      '在中国民间信仰中影响深远，常以手持净瓶杨柳的形象出现。',
    image: {
      src: '/jing/images/guanyin.webp',
      alt: '明代观世音绘画，洛杉矶郡艺术博物馆藏',
      attribution: '佚名，明代；LACMA 藏品 M.2000.13',
      license: '公有领域',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:Avalokiteshvara_(Guanyin),_the_Bodhisattva_of_Compassion_LACMA_M.2000.13_(1_of_7).jpg',
    },
  },
  {
    id: 'ksitigarbha',
    tradition: 'buddhist',
    name: '地藏菩萨',
    title: '大愿 · 安忍不动',
    intro:
      '地藏，取"安忍不动如大地，静虑深密如秘藏"之意。菩萨发下宏大誓愿，' +
      '常手持锡杖、示现沙门形象，被尊为大愿的象征。',
    image: {
      src: '/jing/images/ksitigarbha.webp',
      alt: '高丽王朝地藏菩萨绘画，大都会艺术博物馆藏',
      attribution: '佚名高丽画师，十四世纪上半；大都会艺术博物馆藏',
      license: '公有领域',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:Ksitigarbha_(Metropolitan_Museum_of_Art).jpg',
    },
  },
];

export const TAOIST_FIGURES: readonly SacredFigure[] = [
  {
    id: 'yuanshi',
    tradition: 'taoist',
    name: '元始天尊',
    title: '玉清 · 万道之宗',
    intro:
      '元始天尊居三清之首，象征宇宙本源之先。道教尊神体系中，' +
      '元始天尊代表天地未分之前的原始状态，为万道之宗。',
    image: {
      src: '/jing/images/yuanshi.webp',
      alt: '明代元始天尊鎏金铜造像，禄丰恐龙博物馆藏',
      attribution: '明代造像；禄丰恐龙博物馆藏；瑞丽江的河水 摄',
      license: 'CC BY-SA 4.0',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:%E7%A6%84%E4%B8%B0%E6%81%90%E9%BE%99%E5%8D%9A%E7%89%A9%E9%A6%86-%E6%98%8E-1967%E5%B9%B4%E7%90%85%E4%BA%95%E4%BF%9D%E6%8A%A4%E6%80%A7%E5%BE%81%E9%9B%86-%E5%85%83%E5%A7%8B%E5%A4%A9%E5%B0%8A%E9%80%A0%E5%83%8F.jpg',
    },
  },
  {
    id: 'lingbao',
    tradition: 'taoist',
    name: '灵宝天尊',
    title: '上清 · 经箓之祖',
    intro:
      '灵宝天尊居三清第二位，又称太上道君。象征混沌初判、阴阳始分，' +
      '在道教中与经教传承相联，被尊为经箓之祖。',
    image: {
      src: '/jing/images/lingbao.webp',
      alt: '明代灵宝天尊鎏金铜造像，禄丰恐龙博物馆藏',
      attribution: '明代造像；禄丰恐龙博物馆藏；瑞丽江的河水 摄',
      license: 'CC BY-SA 4.0',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:%E7%A6%84%E4%B8%B0%E6%81%90%E9%BE%99%E5%8D%9A%E7%89%A9%E9%A6%86-%E6%98%8E-1967%E5%B9%B4%E7%90%85%E4%BA%95%E4%BF%9D%E6%8A%A4%E6%80%A7%E5%BE%81%E9%9B%86-%E7%81%B5%E5%AE%9D%E5%A4%A9%E5%B0%8A%E9%80%A0%E5%83%8F.jpg',
    },
  },
  {
    id: 'daode',
    tradition: 'taoist',
    name: '道德天尊',
    title: '太清 · 太上老君',
    intro:
      '道德天尊即太上老君，居三清第三位，与著述《道德经》的老子相联。' +
      '象征道的教化流行于世，历劫度人，为道教尊神中最为民间熟知的一位。',
    image: {
      src: '/jing/images/daode.webp',
      alt: '明代道德天尊鎏金铜造像，禄丰恐龙博物馆藏',
      attribution: '明代造像；禄丰恐龙博物馆藏；瑞丽江的河水 摄',
      license: 'CC BY-SA 4.0',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:%E7%A6%84%E4%B8%B0%E6%81%90%E9%BE%99%E5%8D%9A%E7%89%A9%E9%A6%86-%E6%98%8E-1967%E5%B9%B4%E7%90%85%E4%BA%95%E4%BF%9D%E6%8A%A4%E6%80%A7%E5%BE%81%E9%9B%86-%E9%81%93%E5%BE%B7%E5%A4%A9%E5%B0%8A%E9%80%A0%E5%83%8F.jpg',
    },
  },
];

/** Ambience groups by tradition; the two groups must stay disjoint. */
export const AMBIENCE_BY_TRADITION = {
  buddhist: ['chime', 'bell'],
  taoist: ['windchime', 'pine-wind'],
} as const;

/** Neutral ambience allowed outside tradition rooms (hall / woodfish). */
export const NEUTRAL_AMBIENCE = ['water'] as const;

export const AMBIENCE_SRC: Record<string, string> = {
  chime: '/jing/audio/chime.ogg',
  bell: '/jing/audio/bell.ogg',
  windchime: '/jing/audio/windchime.ogg',
  'pine-wind': '/jing/audio/pine-wind.ogg',
  water: '/jing/audio/water.ogg',
};

export const WOODFISH_SOUND_SRC = '/jing/audio/woodfish.ogg';
