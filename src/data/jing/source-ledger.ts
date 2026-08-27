export type SourceSection = 'figures' | 'audio' | 'lots' | 'rules';

interface SourceBase {
  id: string;
  section: SourceSection;
  title: string;
  url: string;
  attribution: string;
  license: string;
  retrievedAt: string;
  version: string;
  checksum: string;
  localTarget: string;
}

export type SourceRecord = SourceBase & (
  | { status: 'verified'; blockedReason?: never }
  | { status: 'verification-blocked'; blockedReason: string }
);

const blocked = (
  source: Omit<SourceBase, 'attribution' | 'license' | 'checksum'> &
    Partial<Pick<SourceBase, 'attribution' | 'license' | 'checksum'>> &
    { blockedReason: string },
): SourceRecord => ({
  ...source,
  attribution: source.attribution ?? '',
  license: source.license ?? '',
  checksum: source.checksum ?? '',
  status: 'verification-blocked',
});

const commonsImageCandidate = (
  id: string,
  title: string,
  query: string,
  localTarget: string,
): SourceRecord => blocked({
  id,
  section: 'figures',
  title,
  url: `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(query)}&title=Special:MediaSearch&type=image`,
  retrievedAt: '2026-08-26',
  version: 'candidate-search-2026-08-26',
  localTarget,
  blockedReason: '尚未选定具体作品并逐项核验作者、年代、许可及原始文件校验和。',
});

const commonsAudioCandidate = (
  id: string,
  title: string,
  query: string,
  localTarget: string,
): SourceRecord => blocked({
  id,
  section: 'audio',
  title,
  url: `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(query)}&title=Special:MediaSearch&type=audio`,
  retrievedAt: '2026-08-26',
  version: 'candidate-search-2026-08-26',
  localTarget,
  blockedReason: '尚未试听并冻结具体音频，也未核验署名、许可、循环质量和文件校验和。',
});

export const sourceLedger: readonly SourceRecord[] = [
  commonsImageCandidate('image-shakyamuni', '释迦牟尼佛历史图像候选', 'Shakyamuni Buddha public domain art', 'public/jing/images/shakyamuni.webp'),
  commonsImageCandidate('image-guanyin', '观世音菩萨历史图像候选', 'Guanyin public domain art', 'public/jing/images/guanyin.webp'),
  commonsImageCandidate('image-ksitigarbha', '地藏菩萨历史图像候选', 'Ksitigarbha public domain art', 'public/jing/images/ksitigarbha.webp'),
  commonsImageCandidate('image-yuanshi', '元始天尊历史图像候选', 'Yuanshi Tianzun public domain art', 'public/jing/images/yuanshi.webp'),
  commonsImageCandidate('image-lingbao', '灵宝天尊历史图像候选', 'Lingbao Tianzun public domain art', 'public/jing/images/lingbao.webp'),
  commonsImageCandidate('image-daode', '道德天尊历史图像候选', 'Daode Tianzun public domain art', 'public/jing/images/daode.webp'),

  commonsAudioCandidate('audio-woodfish', '木鱼音频候选', 'wooden fish percussion', 'public/jing/audio/woodfish.ogg'),
  commonsAudioCandidate('audio-chime', '磬声音频候选', 'Buddhist chime', 'public/jing/audio/chime.ogg'),
  commonsAudioCandidate('audio-bell', '钟声音频候选', 'temple bell', 'public/jing/audio/bell.ogg'),
  commonsAudioCandidate('audio-windchime', '风铃音频候选', 'wind chime', 'public/jing/audio/windchime.ogg'),
  commonsAudioCandidate('audio-water', '流水音频候选', 'stream water ambience', 'public/jing/audio/water.ogg'),
  commonsAudioCandidate('audio-pine-wind', '松风音频候选', 'pine wind ambience', 'public/jing/audio/pine-wind.ogg'),

  blocked({
    id: 'lots-guanyin',
    section: 'lots',
    title: '艋舺龙山寺观音一百签（校勘候选）',
    url: 'https://www.lungshan.org.tw/fortune_sticks/index.php',
    attribution: '艋舺龙山寺',
    retrievedAt: '2026-08-26',
    version: 'web-index-2026-08-26',
    localTarget: 'src/data/jing/lots/guanyin.ts',
    blockedReason: '可用于逐签校勘，但尚未确认整套文本再利用条款与对应公版古籍底本。',
  }),
  blocked({
    id: 'lots-luzu',
    section: 'lots',
    title: '清道光二十六年吕祖灵签刻本（底本候选）',
    url: 'https://www.guoxuedashi.com/shumu/2937817go.html',
    attribution: '北京大学图书馆藏本；国学大师影印目录',
    retrievedAt: '2026-08-26',
    version: '1846-scan-candidate',
    localTarget: 'src/data/jing/lots/luzu.ts',
    blockedReason: '古籍年代满足公版候选条件，但需取得可核验扫描件并确认数字文件使用条款和校验和。',
  }),
  blocked({
    id: 'lots-guandi',
    section: 'lots',
    title: '关圣帝君灵签·姑苏钮氏藏板清刊本',
    url: 'https://zh.wikisource.org/wiki/關聖帝君靈籤',
    attribution: '维基文库校录；清刊本',
    license: '原作公有领域；维基文库页面文本依 CC BY-SA 4.0',
    retrievedAt: '2026-08-26',
    version: 'wikisource-oldid-2428837',
    localTarget: 'src/data/jing/lots/guandi.ts',
    blockedReason: '来源与许可已定位，但尚未冻结 1—100 签本地转录并计算内容校验和。',
  }),

  blocked({
    id: 'rules-calendar',
    section: 'rules',
    title: '香港天文台公历与农历对照资料',
    url: 'https://www.hko.gov.hk/en/gts/time/conversion.htm',
    attribution: '香港天文台',
    retrievedAt: '2026-08-26',
    version: 'reference-2026-08-26',
    localTarget: 'src/lib/jing/calendar/engine.test.ts',
    blockedReason: '尚未冻结 1900—2100 边界样例和节气时刻校验表。',
  }),
  blocked({
    id: 'rules-bazi',
    section: 'rules',
    title: 'lunar-typescript 1.8.6 八字与节气实现',
    url: 'https://github.com/6tail/lunar-typescript',
    attribution: '6tail/lunar-typescript contributors',
    license: 'MIT',
    retrievedAt: '2026-08-26',
    version: 'npm-1.8.6',
    localTarget: 'src/lib/jing/bazi/calculate.test.ts',
    blockedReason: '依赖已固定，但边界样例仍需与独立历表交叉核验后才能冻结。',
  }),
  blocked({
    id: 'rules-yijing',
    section: 'rules',
    title: '中国哲学书电子化计划《周易》',
    url: 'https://ctext.org/book-of-changes/zh',
    attribution: 'Chinese Text Project',
    retrievedAt: '2026-08-26',
    version: 'reference-2026-08-26',
    localTarget: 'src/data/jing/hexagrams.ts',
    blockedReason: '尚未冻结六十四卦名、卦序、卦辞的许可边界与本地校验和。',
  }),
  blocked({
    id: 'rules-qimen-chai-bu',
    section: 'rules',
    title: '时家奇门拆补法参考底本检索',
    url: 'https://archive.org/search?query=%E5%A5%87%E9%96%80%E9%81%81%E7%94%B2+%E6%8B%86%E8%A3%9C',
    retrievedAt: '2026-08-26',
    version: 'candidate-search-2026-08-26',
    localTarget: 'src/lib/jing/qimen/chai-bu.test.ts',
    blockedReason: '尚未选定可引用底本并转录至少 12 个完整金标准排局。',
  }),
  blocked({
    id: 'rules-qimen-zhi-run',
    section: 'rules',
    title: '时家奇门置闰法参考底本检索',
    url: 'https://archive.org/search?query=%E5%A5%87%E9%96%80%E9%81%81%E7%94%B2+%E7%BD%AE%E9%96%8F',
    retrievedAt: '2026-08-26',
    version: 'candidate-search-2026-08-26',
    localTarget: 'src/lib/jing/qimen/zhi-run.test.ts',
    blockedReason: '尚未选定可引用底本并转录至少 12 个完整金标准排局。',
  }),
  blocked({
    id: 'rules-qimen-maoshan',
    section: 'rules',
    title: '时家奇门茅山法参考底本检索',
    url: 'https://archive.org/search?query=%E8%8C%85%E5%B1%B1%E5%A5%87%E9%96%80',
    retrievedAt: '2026-08-26',
    version: 'candidate-search-2026-08-26',
    localTarget: 'src/lib/jing/qimen/maoshan.test.ts',
    blockedReason: '尚未选定可引用底本并转录至少 12 个完整金标准排局。',
  }),
] as const;

export function getSourceGate(section: SourceSection) {
  const records = sourceLedger.filter((source) => source.section === section);
  const blockedRecords = records.filter((source) => source.status !== 'verified');
  return {
    section,
    ready: records.length > 0 && blockedRecords.length === 0,
    blockedIds: blockedRecords.map((source) => source.id),
  } as const;
}
